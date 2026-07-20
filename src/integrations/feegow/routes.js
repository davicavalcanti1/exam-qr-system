import { Router } from 'express'
import { getCaller } from '../../lib/supabaseAdmin.js'
import { feegowParaEmpresa } from './empresa.js'
import { normalizePaciente, normalizeHorarios } from './client.js'

// Rotas do Feegow — espelham as operacionais do NetRis (mesmos caminhos relativos),
// só que sob /api/feegow. Trocar de provedor = mudar a config da empresa e apontar
// o frontend para o namespace do provedor ativo (ou usar um dispatcher).
const router = Router()

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

// Proxy genérico autenticado — qualquer endpoint sob api/.
router.all('/proxy/*', async (req, res) => {
  const ctx = await comFeegow(req, res); if (!ctx) return
  try {
    const path = req.params[0] || ''
    const query = req.originalUrl.split('?')[1] || ''
    const r = await ctx.client.request({ method: req.method, path, query, body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? req.body : undefined })
    res.status(r.status).type(r.contentType).send(r.body)
  } catch (err) { res.status(502).json({ error: 'Erro no proxy Feegow', detail: err.message }) }
})

export default router
