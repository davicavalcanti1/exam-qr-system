import { Router } from 'express'
import { getCaller, supabaseAdmin } from '../lib/supabaseAdmin.js'
import { subConfig } from '../lib/integracaoProviders.js'
import { nfseParaEmpresa, montarPayloadNfse } from '../integrations/nfse/empresa.js'
import { normalizeNfse } from '../integrations/nfse/client.js'
import { logAudit } from '../lib/audit.js'

const router = Router()

// Resolve o caller + a empresa-alvo (owner escolhe via query/body; empresa_admin usa a sua).
async function comEmpresa(req, res, { escrita = false } = {}) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  const p = c.profile
  if (escrita && !['owner', 'empresa_admin'].includes(p.role)) {
    res.status(403).json({ error: 'Sem permissão' }); return null
  }
  const empresaId = p.role === 'owner' ? (req.query.empresaId || req.body?.empresaId || null) : p.empresa_id
  if (!empresaId) { res.status(400).json({ error: 'empresaId ausente' }); return null }
  return { caller: c, profile: p, empresaId }
}

// ── Config do token (só o token vive aqui; os campos fiscais ficam em empresas
//    via RPC update_empresa_fiscal, chamada direto do frontend sob RLS). ────────

// Diz se o token do provedor já está salvo (nunca devolve o token em si).
router.get('/config', async (req, res) => {
  const ctx = await comEmpresa(req, res); if (!ctx) return
  const { data } = await supabaseAdmin
    .from('integracao_configs').select('config').eq('empresa_id', ctx.empresaId).maybeSingle()
  const token = subConfig(data?.config, 'focusnfe')?.token
  res.json({ tokenConfigurado: Boolean(token) })
})

// Salva/atualiza SÓ o token da Focy, preservando as sub-configs de outros provedores.
router.put('/config-token', async (req, res) => {
  const ctx = await comEmpresa(req, res, { escrita: true }); if (!ctx) return
  const token = String(req.body?.token || '').trim()
  if (!token) return res.status(400).json({ error: 'token é obrigatório' })

  const { data: atual } = await supabaseAdmin
    .from('integracao_configs').select('config, provider').eq('empresa_id', ctx.empresaId).maybeSingle()
  const mapa = (atual?.config && typeof atual.config === 'object' && !Array.isArray(atual.config)) ? { ...atual.config } : {}
  mapa.focusnfe = { ...(mapa.focusnfe || {}), token }

  const { error } = await supabaseAdmin.from('integracao_configs').upsert({
    empresa_id: ctx.empresaId,
    provider: atual?.provider || 'manual',   // NÃO troca o provedor de agendamento ativo
    config: mapa,
    updated_at: new Date().toISOString(),
    updated_by: ctx.profile.id,
  }, { onConflict: 'empresa_id' })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true, tokenConfigurado: true })
})

// ── Emissão ───────────────────────────────────────────────────────────────────

// Emite a NFS-e de um lote de cobrança (idempotente pela ref cobranca:{id}).
router.post('/emitir/:cobrancaId', async (req, res) => {
  const ctx = await comEmpresa(req, res, { escrita: true }); if (!ctx) return
  const cobrancaId = req.params.cobrancaId

  const { data: cobranca } = await supabaseAdmin
    .from('cobrancas')
    .select('id, empresa_id, valor_total, qtd_exames, periodo_inicio, periodo_fim, status, parceiros(id, nome, documento, tipo_documento, email)')
    .eq('id', cobrancaId).maybeSingle()
  if (!cobranca) return res.status(404).json({ error: 'Lote não encontrado' })
  if (cobranca.empresa_id !== ctx.empresaId) return res.status(403).json({ error: 'Lote de outra empresa' })
  if (cobranca.status === 'cancelada') return res.status(400).json({ error: 'Lote cancelado não emite nota' })
  if (!cobranca.parceiros) return res.status(400).json({ error: 'Lote sem parceiro (tomador)' })

  // Já autorizada? não reemite.
  const { data: existente } = await supabaseAdmin
    .from('notas_fiscais').select('*').eq('ref', `cobranca:${cobrancaId}`).maybeSingle()
  if (existente && existente.status === 'autorizada') return res.json({ nota: existente, jaEmitida: true })

  const resolvido = await nfseParaEmpresa(ctx.empresaId)
  if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })

  const ref = `cobranca:${cobrancaId}`
  const payload = montarPayloadNfse({ empresa: resolvido.empresa, parceiro: cobranca.parceiros, cobranca })

  let norm, raw
  try {
    const r = await resolvido.client.emitir(ref, payload)
    raw = r.body
    norm = normalizeNfse(r.body)
    if (!r.ok && norm.status === 'processando') {
      const msg = typeof r.body === 'object' ? (r.body?.mensagem || JSON.stringify(r.body)) : String(r.body)
      norm = { status: 'erro', erro_msg: String(msg).slice(0, 500), numero: null, url_pdf: null, url_xml: null }
    }
  } catch (e) {
    return res.status(502).json({ error: 'Falha ao falar com o provedor de NFS-e', detail: e.message })
  }

  const { data: nota, error: upErr } = await supabaseAdmin.from('notas_fiscais').upsert({
    empresa_id: ctx.empresaId, cobranca_id: cobrancaId, provedor: 'focusnfe', ref,
    status: norm.status, numero: norm.numero, url_pdf: norm.url_pdf, url_xml: norm.url_xml,
    valor: cobranca.valor_total, erro_msg: norm.erro_msg, payload: raw,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'ref' }).select('*').single()
  if (upErr) return res.status(400).json({ error: upErr.message })

  logAudit({ empresaId: ctx.empresaId, atorId: ctx.profile.id, atorNome: ctx.profile.nome || ctx.profile.role, acao: 'nfse.emitida', entidade: 'cobranca', entidadeId: cobrancaId, detalhe: { ref, status: norm.status } })
  res.json({ nota })
})

// Estado da NFS-e de um lote. Se ainda "processando", reconsulta o provedor e
// atualiza (é assim que vemos o resultado em dev, onde o webhook não alcança localhost).
router.get('/:cobrancaId', async (req, res) => {
  const ctx = await comEmpresa(req, res); if (!ctx) return
  const ref = `cobranca:${req.params.cobrancaId}`
  const { data: nota } = await supabaseAdmin.from('notas_fiscais').select('*').eq('ref', ref).maybeSingle()
  if (!nota) return res.json({ nota: null })
  if (nota.empresa_id !== ctx.empresaId) return res.status(403).json({ error: 'Nota de outra empresa' })
  if (nota.status !== 'processando') return res.json({ nota })

  const resolvido = await nfseParaEmpresa(ctx.empresaId)
  if (resolvido.erro) return res.json({ nota })  // sem provedor: devolve o que temos
  try {
    const r = await resolvido.client.consultar(ref)
    const norm = normalizeNfse(r.body)
    if (norm.status !== 'processando') {
      const { data: atual } = await supabaseAdmin.from('notas_fiscais').update({
        status: norm.status, numero: norm.numero, url_pdf: norm.url_pdf, url_xml: norm.url_xml,
        erro_msg: norm.erro_msg, payload: r.body, updated_at: new Date().toISOString(),
      }).eq('ref', ref).select('*').single()
      return res.json({ nota: atual })
    }
  } catch { /* mantém processando */ }
  res.json({ nota })
})

// ── Webhook (público) — o provedor avisa quando a nota autoriza/erra. ──────────
// Não usa auth do Supabase: casa pela ref e reconsulta o provedor pra os detalhes.
router.post('/webhook', async (req, res) => {
  const ref = req.body?.ref || req.query?.ref
  if (!ref) return res.status(200).json({ ok: true, ignored: 'sem ref' })
  const { data: nota } = await supabaseAdmin.from('notas_fiscais').select('*').eq('ref', ref).maybeSingle()
  if (!nota) return res.status(200).json({ ok: true, ignored: 'ref desconhecida' })

  const resolvido = await nfseParaEmpresa(nota.empresa_id)
  if (!resolvido.erro) {
    try {
      const r = await resolvido.client.consultar(ref)
      const norm = normalizeNfse(r.body)
      await supabaseAdmin.from('notas_fiscais').update({
        status: norm.status, numero: norm.numero, url_pdf: norm.url_pdf, url_xml: norm.url_xml,
        erro_msg: norm.erro_msg, payload: r.body, updated_at: new Date().toISOString(),
      }).eq('ref', ref)
    } catch { /* provedor indisponível: reprocessa num próximo webhook/consulta */ }
  }
  res.status(200).json({ ok: true })
})

export default router
