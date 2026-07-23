import { Router } from 'express'
import { getCaller, supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from './empresa.js'
import { resolverContextoExame } from './agendamento.js'
import { SITUACAO, normalizePaciente, normalizeHorarios } from './client.js'
import { logAudit } from '../../lib/audit.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isoToBR = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}` }

// Marca os slots já ocupados por algum exame da empresa (inclui encaixe) para o
// frontend desabilitar/acinzentar. Chave: data + hora + médico + sala.
async function marcarReservados(slots, empresaId) {
  if (!Array.isArray(slots) || !slots.length || !empresaId) return slots
  const { data } = await supabaseAdmin
    .from('exames').select('netris_slot').eq('empresa_id', empresaId).not('netris_slot', 'is', null).neq('status', 'cancelado')
  const key = (d, h, m, s) => `${d}|${h}|${m}|${s}`
  const ocupados = new Set((data || []).map(e => {
    const s = e.netris_slot || {}
    return key(s.dataString, s.horarioString, s.idMedico, s.idSala)
  }))
  for (const s of slots) s.reservado = ocupados.has(key(s.dataString, s.horaInicial, s.idMedico, s.idSala))
  return slots
}

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

// Etapa 2.1b — Cria paciente no NetRis (quando não existe pelo CPF).
router.post('/pacientes', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  const { nome, cpf, sexo, dataNascimento, telefone, peso, email, nomeMae } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' })
  try {
    const r = await ctx.client.criarPaciente({ nome, cpf, sexo, dataNascimento, telefone, peso, email, nomeMae })
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou o cadastro', upstream: r.body })
    // rebusca pelo CPF para obter o registro normalizado com idPaciente
    let normalizado = normalizePaciente(r.body)
    if (cpf && (!normalizado || !normalizado.netrisId)) {
      const rb = await ctx.client.searchPacienteByCpf(cpf)
      if (rb) normalizado = normalizePaciente(rb)
    }
    res.status(201).json({ ok: true, paciente: normalizado, raw: r.body })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao criar paciente no NetRis', detail: err.message })
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
    const slots = await marcarReservados(normalizeHorarios(JSON.parse(r.body || '[]')), ctx.exame.empresa_id)
    res.json({ exame: ctx.exame.nome, paciente: ctx.exame.pacientes?.nome, total: slots.length, slots })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar horários no NetRis', detail: err.message })
  }
})

// Preview de horários no cadastro (antes do exame existir): resolve procedimento
// (catálogo) + plano/convênio (parceiro) e lista os slots para um idPaciente.
router.get('/horarios-catalogo', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { procedimentoId, parceiroId, idPaciente, pesoPaciente, dataInicial, dataFinal } = req.query
  if (!procedimentoId || !parceiroId || !idPaciente) return res.status(400).json({ error: 'procedimentoId, parceiroId e idPaciente são obrigatórios' })
  if (!DATE_RE.test(dataInicial || '')) return res.status(400).json({ error: 'dataInicial em YYYY-MM-DD' })
  const empresaId = c.profile.role === 'owner' ? req.query.empresaId : c.profile.empresa_id
  const client = await netrisParaEmpresa(empresaId)
  if (!client) return res.status(400).json({ error: 'NetRis não está ativo para esta empresa.' })

  const { data: proc } = await supabaseAdmin.from('procedimentos').select('netris_procedimento_id').eq('id', procedimentoId).maybeSingle()
  const { data: parc } = await supabaseAdmin.from('parceiros').select('netris_id_plano_convenio, netris_id_convenio, netris_id_unidade').eq('id', parceiroId).maybeSingle()
  const faltando = []
  if (!proc?.netris_procedimento_id) faltando.push('exame sem procedimento NetRis')
  if (!parc?.netris_id_plano_convenio) faltando.push('parceiro sem plano-convênio')
  if (!parc?.netris_id_convenio) faltando.push('parceiro sem convênio')
  if (faltando.length) return res.status(400).json({ error: 'Mapeamento incompleto: ' + faltando.join('; ') })

  try {
    const params = {
      buscaInteligente: 'true', dataBusca: isoToBR(dataInicial), dataFinalBusca: isoToBR(dataFinal || dataInicial),
      idConvenio: parc.netris_id_convenio, idPlanoConvenio: parc.netris_id_plano_convenio,
      idFilial: 1, idPaciente, listIdProcedimento: proc.netris_procedimento_id, pesoPaciente: pesoPaciente || 70, limit: 30,
      ...(parc.netris_id_unidade ? { idUnidade: parc.netris_id_unidade } : {}),
    }
    const r = await client.horariosAgrupados(params)
    if (!r.ok) {
      const hint = `NetRis recusou os horários (HTTP ${r.status}). Provável causa: o procedimento ${proc.netris_procedimento_id} não pertence ao plano-convênio ${parc.netris_id_plano_convenio}/${parc.netris_id_convenio} do parceiro, ou não tem agenda online. Verifique o mapeamento.`
      return res.status(r.status >= 500 ? 502 : r.status).json({ error: hint, upstream: String(r.body).slice(0, 300) })
    }
    res.json({ slots: await marcarReservados(normalizeHorarios(JSON.parse(r.body || '[]')), empresaId) })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar horários: ' + err.message })
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
    // reagendamento: cancela o encaixe anterior antes de criar o novo (evita duplicar)
    if (ctx.exame.netris_atendimento_id) {
      try { await ctx.client.alterarSituacao(ctx.exame.netris_atendimento_id, SITUACAO.CANCELADO) } catch { /* best-effort */ }
    }
    const r = await ctx.client.criarEncaixe({
      dataString: slot.dataString, horarioString: slot.horarioString,
      idConvenio: ctx.idConvenio, idPlanoConvenio: ctx.idPlanoConvenio,
      idProcedimento: ctx.idProcedimento, idPaciente: ctx.idPaciente,
      idMedico: Number(slot.idMedico), idSala: Number(slot.idSala),
    })
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou o agendamento', upstream: r.body })
    let parsed = null; try { parsed = JSON.parse(r.body) } catch { parsed = r.body }
    const agId = parsed?.message?.match?.(/ID:\s*(\d+)/)?.[1] || parsed?.id || null
    // fecha o ciclo: grava no exame o vínculo e o horário (netris_slot = vaga ocupada)
    await supabaseAdmin.from('exames').update({
      netris_atendimento_id: agId, netris_agendamento_id: agId,
      scheduled_at: `${slot.dataString}T${slot.horarioString}:00-03:00`, // horário de Brasília (BRT) — sem isto o Postgres grava como UTC e some 3h
      netris_slot: { dataString: slot.dataString, horarioString: slot.horarioString, idMedico: Number(slot.idMedico), idSala: Number(slot.idSala) },
    }).eq('id', exameId)
    logAudit({ empresaId: ctx.exame.empresa_id, atorId: c.profile.id, atorNome: c.profile.nome || c.profile.role, acao: 'netris.agendado', entidade: 'exame', entidadeId: exameId, detalhe: { protocolo: agId, slot } })
    res.json({ ok: true, agendamentoId: agId, upstream: parsed })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao agendar no NetRis', detail: err.message })
  }
})

// Cancela o agendamento do exame no NetRis (situação CANCELADO) e limpa o vínculo.
router.post('/cancelar-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId } = req.body || {}
  if (!exameId) return res.status(400).json({ error: 'exameId é obrigatório' })
  const { data: ex } = await supabaseAdmin
    .from('exames').select('empresa_id, netris_atendimento_id').eq('id', exameId).maybeSingle()
  if (!ex) return res.status(404).json({ error: 'Exame não encontrado' })
  if (!ex.netris_atendimento_id) return res.status(400).json({ error: 'Este exame não tem agendamento no NetRis' })
  const client = await netrisParaEmpresa(ex.empresa_id)
  if (!client) return res.status(400).json({ error: 'NetRis não está ativo para esta empresa' })
  try {
    const r = await client.alterarSituacao(ex.netris_atendimento_id, SITUACAO.CANCELADO)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'NetRis recusou o cancelamento', upstream: r.body })
    await supabaseAdmin.from('exames').update({ netris_atendimento_id: null, netris_agendamento_id: null, scheduled_at: null, netris_slot: null }).eq('id', exameId)
    logAudit({ empresaId: ex.empresa_id, atorId: c.profile.id, atorNome: c.profile.nome || c.profile.role, acao: 'netris.cancelado', entidade: 'exame', entidadeId: exameId })
    res.json({ ok: true })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao cancelar no NetRis', detail: err.message })
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
