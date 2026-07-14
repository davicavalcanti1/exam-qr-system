import { Router } from 'express'
import { getCaller } from '../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from '../lib/netrisEmpresa.js'
import { SITUACAO } from '../lib/netris.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

// Busca paciente por CPF.
router.get('/pacientes/cpf/:cpf', async (req, res) => {
  const ctx = await comNetris(req, res); if (!ctx) return
  try {
    res.json({ paciente: await ctx.client.searchPacienteByCpf(req.params.cpf) })
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
