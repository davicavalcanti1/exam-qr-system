import { Router } from 'express'
import { supabaseAdmin, getCaller } from '../lib/supabaseAdmin.js'
import { PROVIDERS, providersPublicos, mascarar, mesclar } from '../lib/integracaoProviders.js'

const router = Router()

// Só empresa-level configura a integração da sua empresa.
function empresaAlvo(p) {
  if (p.role === 'empresa_admin') return p.empresa_id
  return null // owner escolhe empresa via query (?empresaId=)
}

// Lista os provedores disponíveis (rótulos/campos) — público para o painel.
router.get('/providers', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  res.json({ providers: providersPublicos() })
})

// Config atual da empresa (com credenciais mascaradas).
router.get('/', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const empresa_id = p.role === 'owner' ? (req.query.empresaId || null) : empresaAlvo(p)
  if (!empresa_id) return res.status(400).json({ error: 'empresaId ausente' })

  const { data } = await supabaseAdmin
    .from('integracao_configs').select('provider, config, ativo, updated_at').eq('empresa_id', empresa_id).maybeSingle()

  const provider = data?.provider || 'manual'
  res.json({
    empresaId: empresa_id,
    provider,
    ativo: data?.ativo || false,
    config: mascarar(provider, data?.config || {}),
    updatedAt: data?.updated_at || null,
  })
})

// Salva provider + config + ativo.
router.put('/', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { provider, config = {}, ativo = false, empresaId } = req.body || {}
  const empresa_id = p.role === 'owner' ? empresaId : p.empresa_id
  if (!empresa_id) return res.status(400).json({ error: 'empresaId ausente' })
  if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Provedor inválido' })

  // mescla credenciais mascaradas com o que já estava salvo
  const { data: atual } = await supabaseAdmin
    .from('integracao_configs').select('config, provider').eq('empresa_id', empresa_id).maybeSingle()
  const salvo = (atual?.provider === provider) ? (atual?.config || {}) : {}
  const merged = mesclar(provider, salvo, config)

  const { error: upErr } = await supabaseAdmin.from('integracao_configs').upsert({
    empresa_id, provider, config: merged, ativo: provider === 'manual' ? false : !!ativo,
    updated_at: new Date().toISOString(), updated_by: p.id,
  }, { onConflict: 'empresa_id' })
  if (upErr) return res.status(400).json({ error: upErr.message })

  await supabaseAdmin.from('empresas').update({ agendamento_provider: provider }).eq('id', empresa_id)

  res.json({ ok: true, provider, ativo: provider === 'manual' ? false : !!ativo, config: mascarar(provider, merged) })
})

// Testa a conexão do provedor com o config salvo.
router.post('/testar', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  const empresa_id = p.role === 'owner' ? (req.body?.empresaId || null) : p.empresa_id
  if (!empresa_id) return res.status(400).json({ error: 'empresaId ausente' })

  const { data } = await supabaseAdmin
    .from('integracao_configs').select('provider, config').eq('empresa_id', empresa_id).maybeSingle()
  if (!data) return res.json({ ok: false, mensagem: 'Nenhuma configuração salva.' })

  if (data.provider === 'manual') return res.json({ ok: true, mensagem: 'Método manual — nenhuma conexão externa necessária.' })

  if (data.provider === 'netris') {
    const base = (data.config?.baseUrl || '').trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://')
    const token = data.config?.token
    if (!base) return res.json({ ok: false, mensagem: 'URL base não configurada.' })
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(base, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      })
      clearTimeout(t)
      return res.json({ ok: r.status < 500, mensagem: `Servidor NetRis respondeu (HTTP ${r.status}).` })
    } catch (e) {
      return res.json({ ok: false, mensagem: `Falha ao alcançar o NetRis: ${e.message}` })
    }
  }

  if (data.provider === 'feegow') {
    const base = (data.config?.baseUrl || 'https://api.feegow.com/v1').trim().replace(/\/$/, '').replace(/^http:\/\//i, 'https://')
    const token = data.config?.token
    if (!token) return res.json({ ok: false, mensagem: 'Token (x-access-token) não configurado.' })
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(`${base}/api/appoints/status`, { method: 'GET', headers: { 'x-access-token': token }, signal: ctrl.signal })
      clearTimeout(t)
      return res.json({ ok: r.status < 500, mensagem: `Feegow respondeu (HTTP ${r.status}).` })
    } catch (e) {
      return res.json({ ok: false, mensagem: `Falha ao alcançar o Feegow: ${e.message}` })
    }
  }

  res.json({ ok: false, mensagem: 'Provedor sem teste implementado.' })
})

export default router
