import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  isConfigured,
  fetchAtendimentos,
  searchPacienteByCpf,
  alterarSituacao,
  netrisRequest,
  SITUACAO,
  NETRIS_FILIAL,
} from '../lib/netris.js'

const router = Router()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: isConfigured() })
})

// Atendimentos (agendados) de um período — a "agenda real" do NetRis.
router.get('/atendimentos', requireAuth, async (req, res) => {
  const { dataInicial, dataFinal, filialId } = req.query
  if (!DATE_RE.test(dataInicial || '') || !DATE_RE.test(dataFinal || '')) {
    return res.status(400).json({ error: 'dataInicial e dataFinal devem estar em YYYY-MM-DD' })
  }
  try {
    const data = await fetchAtendimentos({ dataInicial, dataFinal, filialId: filialId || NETRIS_FILIAL })
    res.json({ data })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao consultar atendimentos no NetRis', detail: err.message })
  }
})

// Busca paciente por CPF no NetRis.
router.get('/pacientes/cpf/:cpf', requireAuth, async (req, res) => {
  try {
    const paciente = await searchPacienteByCpf(req.params.cpf)
    res.json({ paciente })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao buscar paciente no NetRis', detail: err.message })
  }
})

// Marca um atendimento como EXAME_REALIZADO (ou outra situação) no NetRis.
router.post('/confirmar-exame', requireAuth, async (req, res) => {
  const { atendimentoId, situacao } = req.body || {}
  if (!atendimentoId) return res.status(400).json({ error: 'atendimentoId é obrigatório' })
  try {
    const result = await alterarSituacao(atendimentoId, situacao || SITUACAO.EXAME_REALIZADO)
    if (!result.ok) return res.status(result.status >= 500 ? 502 : result.status).json({ error: 'NetRis recusou', upstream: result.body })
    res.json({ ok: true, body: result.body })
  } catch (err) {
    res.status(502).json({ error: 'Erro ao alterar situação no NetRis', detail: err.message })
  }
})

// Proxy genérico autenticado — porta de entrada pra QUALQUER endpoint do NetRis
// sob netris/api/ (inclusive o de horários/vagas disponíveis quando definirmos
// o path). Ex.: GET /api/netris/proxy/netris/api/<endpoint>?<query>
router.all('/proxy/*', requireAuth, async (req, res) => {
  try {
    const path = req.params[0] || ''
    const query = req.originalUrl.split('?')[1] || ''
    const result = await netrisRequest({
      method: req.method,
      path,
      query,
      body: ['POST', 'PATCH', 'PUT'].includes(req.method) ? req.body : undefined,
    })
    res.status(result.status).type(result.contentType).send(result.body)
  } catch (err) {
    res.status(502).json({ error: 'Erro no proxy NetRis', detail: err.message })
  }
})

export default router
