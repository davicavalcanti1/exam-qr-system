import { Router } from 'express'
import { getCaller } from '../../../lib/supabaseAdmin.js'

const router = Router()

// Consulta dados de empresa por CNPJ na BrasilAPI (dados públicos da Receita).
// Autenticado (evita proxy aberto). Retorna um shape normalizado p/ autopreencher.
router.get('/:cnpj', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const cnpj = String(req.params.cnpj).replace(/\D/g, '')
  if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' })
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    let r
    try {
      r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
    } finally { clearTimeout(t) }
    if (r.status === 404) return res.status(404).json({ error: 'CNPJ não encontrado' })
    if (!r.ok) return res.status(502).json({ error: `BrasilAPI respondeu HTTP ${r.status}` })
    const d = await r.json()
    const logr = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ')
    const linha = [logr, d.numero, d.complemento].filter(Boolean).join(', ')
    const endereco = [linha, d.bairro, [d.municipio, d.uf].filter(Boolean).join('/'), d.cep].filter(Boolean).join(' · ')
    res.json({
      cnpj: d.cnpj,
      razaoSocial: d.razao_social || '',
      nomeFantasia: d.nome_fantasia || '',
      endereco,
      telefone: d.ddd_telefone_1 || '',
      email: d.email || '',
      situacao: d.descricao_situacao_cadastral || '',
    })
  } catch (err) {
    const causa = err.name === 'AbortError' ? 'tempo esgotado (a BrasilAPI demorou)' : (err.cause?.code || err.message)
    res.status(502).json({ error: `Não foi possível consultar a BrasilAPI: ${causa}` })
  }
})

export default router
