import { Router } from 'express'
import { getCaller, supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { feegowParaEmpresa } from './empresa.js'
import { normalizePaciente, normalizeHorarios } from './client.js'
import { resolverContextoExame, agendarExameNoFeegow, cancelarExameNoFeegow } from './agendamento.js'
import { ehGestor } from '../../lib/permissoes.js'
import { exameDoCaller } from '../../lib/exameGuard.js'
import { logAudit } from '../../lib/audit.js'

// Rotas do Feegow — espelham as operacionais do NetRis (mesmos caminhos relativos),
// só que sob /api/feegow. Trocar de provedor = mudar a config da empresa e apontar
// o frontend para o namespace do provedor ativo (ou usar um dispatcher).
const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isoToBRHifen = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}-${m}-${y}` }

// Marca os slots já ocupados por algum exame da empresa (chave: data+hora+médico
// — Feegow não tem conceito de sala) para o frontend desabilitar/acinzentar.
async function marcarReservados(slots, empresaId) {
  if (!Array.isArray(slots) || !slots.length || !empresaId) return slots
  const { data } = await supabaseAdmin
    .from('exames').select('feegow_slot').eq('empresa_id', empresaId).not('feegow_slot', 'is', null).neq('status', 'cancelado')
  const key = (d, h, m) => `${d}|${h}|${m}`
  const ocupados = new Set((data || []).map(e => {
    const s = e.feegow_slot || {}
    return key(s.dataString, s.horarioString, s.idMedico)
  }))
  for (const s of slots) s.reservado = ocupados.has(key(s.dataString, s.horaInicial, s.idMedico))
  return slots
}

async function comFeegow(req, res) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  const empresaId = c.profile.role === 'owner' ? (req.query.empresaId || req.body?.empresaId) : c.profile.empresa_id
  if (!empresaId) { res.status(400).json({ error: 'empresaId ausente' }); return null }
  const client = await feegowParaEmpresa(empresaId)
  if (!client) { res.status(400).json({ error: 'Feegow não está ativo para esta empresa. Configure em Desenvolvedor.' }); return null }
  return { caller: c, empresaId, client }
}

// Status/conectividade (GET api/appoints/status).
router.get('/status', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const empresaId = c.profile.role === 'owner' ? (req.query.empresaId || null) : c.profile.empresa_id
  const client = empresaId ? await feegowParaEmpresa(empresaId) : null
  res.json({ ativo: Boolean(client) })
})

router.get('/pacientes/cpf/:cpf', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  const cpf = String(req.params.cpf).replace(/\D/g, '')
  if (cpf.length !== 11) return res.status(400).json({ error: 'CPF deve ter 11 dígitos' })
  try {
    const raw = await ctx.client.searchPacienteByCpf(cpf)
    if (req.query.raw === '1') return res.json({ encontrado: Boolean(raw), raw })
    res.json({ encontrado: Boolean(raw), paciente: raw ? normalizePaciente(raw) : null })
  } catch (err) { res.status(502).json({ error: 'Erro ao buscar paciente no Feegow', detail: err.message }) }
})

router.post('/pacientes', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  const { nome, cpf, sexo, dataNascimento, telefone, email } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' })
  try {
    const r = await ctx.client.criarPaciente({ nome, cpf, sexo, dataNascimento, telefone, email })
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'Feegow recusou o cadastro', upstream: r.body })
    let normalizado = normalizePaciente(r.body)
    if (cpf && (!normalizado || !normalizado.netrisId)) {
      const rb = await ctx.client.searchPacienteByCpf(cpf); if (rb) normalizado = normalizePaciente(rb)
    }
    res.status(201).json({ ok: true, paciente: normalizado, raw: r.body })
  } catch (err) { res.status(502).json({ error: 'Erro ao criar paciente no Feegow', detail: err.message }) }
})

router.get('/horarios', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  try {
    const query = req.originalUrl.split('?')[1] || ''
    const r = await ctx.client.horariosAgrupados(query)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'Feegow recusou os horários', upstream: String(r.body).slice(0, 300) })
    res.json({ slots: normalizeHorarios(JSON.parse(r.body || '[]')) })
  } catch (err) { res.status(502).json({ error: 'Erro ao consultar horários no Feegow', detail: err.message }) }
})

router.post('/agendar', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  try {
    const r = await ctx.client.criarEncaixe(req.body || {})
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) { res.status(502).json({ error: 'Erro ao agendar no Feegow', detail: err.message }) }
})

router.post('/cancelar', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  const { agendamentoId, motivoId } = req.body || {}
  if (!agendamentoId) return res.status(400).json({ error: 'agendamentoId é obrigatório' })
  try {
    const r = await ctx.client.cancelarAgendamento(agendamentoId, motivoId)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'Feegow recusou o cancelamento', upstream: r.body })
    res.json({ ok: true, body: r.body })
  } catch (err) { res.status(502).json({ error: 'Erro ao cancelar no Feegow', detail: err.message }) }
})

// ── Fase 4 — Agendamento online a partir de um exame do ExameQR ──────────────
// Mesma estrutura das rotas equivalentes do NetRis (netris/routes.js).

// Horários disponíveis para um exame (resolve procedimento/especialidade/convênio/paciente).
router.get('/horarios-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId, dataInicial, dataFinal } = req.query
  if (!DATE_RE.test(dataInicial || '')) return res.status(400).json({ error: 'dataInicial em YYYY-MM-DD' })
  const dono = await exameDoCaller(exameId, c.profile)
  if (dono.error) return res.status(dono.status).json({ error: dono.error })
  const ctx = await resolverContextoExame(exameId)
  if (ctx.error) return res.status(ctx.status).json({ error: ctx.error })
  try {
    const params = {
      tipo: 'P', procedimento_id: ctx.idProcedimento,
      data_start: isoToBRHifen(dataInicial), data_end: isoToBRHifen(dataFinal || dataInicial),
      unidade_id: ctx.localId,
      ...(ctx.idConvenio ? { convenio_id: ctx.idConvenio } : {}),
    }
    const r = await ctx.client.horariosAgrupados(params)
    if (!r.ok) return res.status(r.status >= 500 ? 502 : r.status).json({ error: 'Feegow recusou os horários', upstream: String(r.body).slice(0, 300) })
    const slots = await marcarReservados(normalizeHorarios(JSON.parse(r.body || '{}')), ctx.exame.empresa_id)
    res.json({ exame: ctx.exame.nome, paciente: ctx.exame.pacientes?.nome, total: slots.length, slots })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar horários no Feegow', detail: err.message })
  }
})

// Agenda de fato um exame num slot escolhido e grava o retorno no exame.
router.post('/agendar-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId, slot } = req.body || {}
  if (!exameId || !slot?.dataString || !slot?.horarioString || !slot?.idMedico) {
    return res.status(400).json({ error: 'exameId e slot {dataString, horarioString, idMedico} são obrigatórios' })
  }
  const dono = await exameDoCaller(exameId, c.profile)
  if (dono.error) return res.status(dono.status).json({ error: dono.error })
  const result = await agendarExameNoFeegow(exameId, slot)
  if (!result.ok) return res.status(result.status || 502).json({ error: result.error, upstream: result.upstream })
  logAudit({ empresaId: result.empresaId, atorId: c.profile.id, atorNome: c.profile.nome || c.profile.role, acao: 'feegow.agendado', entidade: 'exame', entidadeId: exameId, detalhe: { protocolo: result.agId, slot } })
  res.json({ ok: true, agendamentoId: result.agId, upstream: result.parsed })
})

// Cancela o agendamento do exame no Feegow e limpa o vínculo.
router.post('/cancelar-exame', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const { exameId } = req.body || {}
  const dono = await exameDoCaller(exameId, c.profile)
  if (dono.error) return res.status(dono.status).json({ error: dono.error })
  const result = await cancelarExameNoFeegow(exameId)
  if (!result.ok) return res.status(result.status || 502).json({ error: result.error, upstream: result.upstream })
  logAudit({ empresaId: dono.exame.empresa_id, atorId: c.profile.id, atorNome: c.profile.nome || c.profile.role, acao: 'feegow.cancelado', entidade: 'exame', entidadeId: exameId })
  res.json({ ok: true })
})

// Proxy genérico — qualquer endpoint sob api/, com o token da clínica.
// Console de desenvolvedor: restrito a quem administra a empresa (mesma regra do
// proxy do NetRis).
router.all('/proxy/*', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  if (!ehGestor(c.profile)) return res.status(403).json({ error: 'Sem permissão' })
  const ctx = await comFeegow(req, res); if (!ctx) return
  try {
    const path = req.params[0] || ''
    const query = req.originalUrl.split('?')[1] || ''
    const r = await ctx.client.request({ method: req.method, path, query, body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? req.body : undefined })
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) { res.status(502).json({ error: 'Erro no proxy Feegow', detail: err.message }) }
})

export default router
