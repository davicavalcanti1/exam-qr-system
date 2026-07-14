import { Router } from 'express'
import { getCaller, supabaseAdmin } from '../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from '../lib/netrisEmpresa.js'
import { resolverContextoExame } from '../lib/netrisAgendamento.js'
import { SITUACAO, normalizePaciente, normalizeHorarios } from '../lib/netris.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isoToBR = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}` }

// Resolve o caller (Supabase) e o cliente NetRis da empresa dele.
async function comNetris(req, res) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  const empresaId = c.profile.role === 'owner' ? (req.query.empresaId || req.body?.empresaId) : c.profile.empresa_id
  if (!empresaId) { res.status(400).json({ error: 'empresaId ausente' }); return null }
  const client = await netrisParaEmpresa(empresaId)
  if (!client) { res.status(400).json({ error: 'NetRis não está ativo para esta empresa. Configure em Desenvolvedor.' }); return null }
  return { caller: c, empresaId, client }
}

// Status da integração para a empresa do caller.
router.get('/status', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const empresaId = c.profile.role === 'owner' ? (req.query.empresaId || null) : c.profile.empresa_id
  const client = empresaId ? await netrisParaEmpresa(empresaId) : null
  res.json({ ativo: Boolean(client) })
})

// Atendimentos (agenda real) de um período.
router.get('/atendimentos', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  const { dataInicial, dataFinal, filialId } = req.query
  if (!DATE_RE.test(dataInicial || '') || !DATE_RE.test(dataFinal || '')) {
    return res.status(400).json({ error: 'dataInicial e dataFinal devem estar em YYYY-MM-DD' })
  }
  try {
    const data = await ctx.client.fetchAtendimentos({ dataInicial, dataFinal, filialId })
    res.json({ data })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar atendimentos no NetRis', detail: err.message })
  }
})

// Etapa 2.1 — Busca paciente por CPF.
// ?raw=1 devolve o payload cru do NetRis (só para validação/depuração do shape).
router.get('/pacientes/cpf/:cpf', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  const cpfDigits = String(req.params.cpf).replace(/\D/g, '')
  if (cpfDigits.length !== 11) return res.status(400).json({ error: 'CPF deve ter 11 dígitos' })
  try {
    const raw = await ctx.client.searchPacienteByCpf(cpfDigits)
    if (req.query.raw === '1') return res.json({ encontrado: Boolean(raw), raw })
    res.json({ encontrado: Boolean(raw), paciente: raw ? normalizePaciente(raw) : null })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao buscar paciente no NetRis', detail: err.message })
  }
})

// Horários disponíveis (agrupados). A config completa idPlanoConvenio/idFilial.
router.get('/horarios', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    const query = req.originalUrl.split('?')[1] || ''
    const r = await ctx.client.horariosAgrupados(query)
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar horários no NetRis', detail: err.message })
  }
})

// Cria o agendamento (encaixe) no NetRis.
router.post('/agendar', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    const r = await ctx.client.criarEncaixe(req.body || {})
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) {
    res.status(502).json({ error: 'Erro ao criar agendamento no NetRis', detail: err.message })
  }
})

// Marca um atendimento como EXAME_REALIZADO (ou outra situação).
router.post('/confirmar-exame', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  const { atendimentoId, situacao } = req.body || {}
  if (!atendimentoId) return res.status(400).json({ error: 'atendimentoId é obrigatório' })
  try {
    const r = await ctx.client.alterarSituacao(atendimentoId, situacao || SITUACAO.EXAME_REALIZADO)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou', upstream: r.body })
    res.json({ ok: true, body: r.body })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao alterar situação no NetRis', detail: err.message })
  }
})

// ── Fase 4 — Agendamento online a partir de um exame do ExameQR ──────────────

// Horários disponíveis para um exame (resolve parceiro/procedimento/paciente).
router.get('/horarios-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId, dataInicial, dataFinal } = req.query
  if (!exameId) return res.status(400).json({ error: 'exameId é obrigatório' })
  if (!DATE_RE.test(dataInicial || '')) return res.status(400).json({ error: 'dataInicial em YYYY-MM-DD' })
  const ctx = await resolverContextoExame(exameId)
  if (ctx.error) return res.status(ctx.status).json({ error: ctx.error })
  try {
    const params = {
      buscaInteligente: 'true',
      dataBusca: isoToBR(dataInicial),
      dataFinalBusca: isoToBR(dataFinal || dataInicial),
      idConvenio: ctx.idConvenio, idPlanoConvenio: ctx.idPlanoConvenio,
      idFilial: 1, idPaciente: ctx.idPaciente,
      listIdProcedimento: ctx.idProcedimento, pesoPaciente: ctx.peso, limit: 30,
      ...(ctx.idUnidade ? { idUnidade: ctx.idUnidade } : {}),
    }
    const r = await ctx.client.horariosAgrupados(params)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou os horários', upstream: r.body })
    const slots = normalizeHorarios(JSON.parse(r.body || '[]'))
    res.json({ exame: ctx.exame.nome, paciente: ctx.exame.pacientes?.nome, total: slots.length, slots })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar horários no NetRis', detail: err.message })
  }
})

// Agenda de fato um exame num slot escolhido e grava o retorno no exame.
router.post('/agendar-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId, slot } = req.body || {}
  if (!exameId || !slot?.dataString || !slot?.horarioString || !slot?.idMedico || !slot?.idSala) {
    return res.status(400).json({ error: 'exameId e slot {dataString, horarioString, idMedico, idSala} são obrigatórios' })
  }
  const ctx = await resolverContextoExame(exameId)
  if (ctx.error) return res.status(ctx.status).json({ error: ctx.error })
  try {
    const r = await ctx.client.criarEncaixe({
      dataString: slot.dataString, horarioString: slot.horarioString,
      idConvenio: ctx.idConvenio, idPlanoConvenio: ctx.idPlanoConvenio,
      idProcedimento: ctx.idProcedimento, idPaciente: ctx.idPaciente,
      idMedico: Number(slot.idMedico), idSala: Number(slot.idSala),
    })
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou o agendamento', upstream: r.body })
    let parsed = null; try { parsed = JSON.parse(r.body) } catch { parsed = r.body }
    const agId = parsed?.message?.match?.(/ID:\s*(\d+)/)?.[1] || parsed?.id || null
    // fecha o ciclo: grava no exame o vínculo e o horário
    await supabaseAdmin.from('exames').update({
      netris_atendimento_id: agId, netris_agendamento_id: agId,
      scheduled_at: `${slot.dataString}T${slot.horarioString}:00`,
    }).eq('id', exameId)
    res.json({ ok: true, agendamentoId: agId, upstream: parsed })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao agendar no NetRis', detail: err.message })
  }
})

// Listagens para o mapeamento (UI de Desenvolvedor): planos-convênio e procedimentos.
router.get('/planos', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    const raw = await ctx.client.get(`/netris/api/plano-convenios?limit=100${req.query.page ? `&page=${encodeURIComponent(req.query.page)}` : ''}`)
    const list = (Array.isArray(raw) ? raw : []).map(p => ({ idPlanoConvenio: p.id_plano_convenio, idConvenio: p.id_convenio, nome: p.nome }))
    res.json({ total: list.length, planos: list })
  } catch (err) { res.status(502).json({ error: 'Erro ao listar planos', detail: err.message }) }
})

router.get('/procedimentos', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    // por plano (recomendado) ou lista geral paginada
    const path = req.query.idPlanoConvenio
      ? `/netris/api/procedimentos/planoConvenio/${encodeURIComponent(req.query.idPlanoConvenio)}`
      : `/netris/api/procedimentos?limit=100${req.query.page ? `&page=${encodeURIComponent(req.query.page)}` : ''}`
    const raw = await ctx.client.get(path)
    const list = (Array.isArray(raw) ? raw : []).map(p => ({
      idProcedimento: p.idProcedimento ?? p.id_procedimento,
      idModalidade: p.idModalidade ?? p.id_modalidade,
      nome: p.nome,
    }))
    res.json({ total: list.length, procedimentos: list })
  } catch (err) { res.status(502).json({ error: 'Erro ao listar procedimentos', detail: err.message }) }
})

// Proxy genérico autenticado — qualquer endpoint sob netris/api/.
router.all('/proxy/*', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    const path = req.params[0] || ''
    const query = req.originalUrl.split('?')[1] || ''
    const r = await ctx.client.request({
      method: req.method, path, query,
      body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? req.body : undefined,
    })
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) {
    res.status(502).json({ error: 'Erro no proxy NetRis', detail: err.message })
  }
})

export default router
