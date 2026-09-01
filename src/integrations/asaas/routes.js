// Cobrança automática via Asaas (Frente A — "Financeiro real").
//
//   GET  /api/asaas/config                          — estado da integração (nunca o token)
//   PUT  /api/asaas/config                          — grava token / ambiente / liga-desliga
//   POST /api/asaas/testar                          — testa o token sem criar nada
//   POST /api/asaas/cobrancas/:id/gerar-pagamento    — cria (ou reaproveita) o payment no Asaas
//   GET  /api/asaas/cobrancas/:id/status             — reconsulta o provedor (fallback do webhook)
//   POST /api/asaas/webhook/:segredo                 — retorno do Asaas (público, segredo na URL)
//
// Mesmo desenho do ZapSign (src/integrations/zapsign/routes.js): token só no
// servidor, segredo do webhook no path, trigger no banco impede o front forjar
// o resultado do provedor (cobrancas_protege_update).

import { Router } from 'express'
import { getCaller, supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { logAudit } from '../../lib/audit.js'
import { testarToken } from './client.js'
import {
  asaasParaEmpresa, configAsaas, invalidarAsaas,
  empresaDoWebhook, urlWebhook, clienteAsaasDoParceiro,
} from './empresa.js'

const router = Router()

// Resolve o caller + a empresa-alvo (owner escolhe via query/body; os demais
// usam a sua). Mesmo contrato de `comEmpresa` do ZapSign/NetRis/Feegow.
async function comEmpresa(req, res, { gestor = false } = {}) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  const p = c.profile
  if (gestor && !['owner', 'empresa_admin'].includes(p.role)) {
    res.status(403).json({ error: 'Sem permissão' }); return null
  }
  const empresaId = p.role === 'owner' ? (req.query.empresaId || req.body?.empresaId || null) : p.empresa_id
  if (!empresaId) { res.status(400).json({ error: 'empresaId ausente' }); return null }
  return { profile: p, empresaId }
}

// ── Configuração ─────────────────────────────────────────────────────────────

router.get('/config', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const { data } = await supabaseAdmin
    .from('integracao_configs')
    .select('config, webhook_segredo, updated_at')
    .eq('empresa_id', ctx.empresaId)
    .maybeSingle()

  const sub = subConfig(data?.config, 'asaas')
  res.json({
    empresaId: ctx.empresaId,
    ativo: Boolean(sub?.ativo) && Boolean(sub?.token),
    ambiente: sub?.ambiente === 'sandbox' ? 'sandbox' : 'producao',
    tokenConfigurado: Boolean(sub?.token),
    webhookUrl: urlWebhook(data?.webhook_segredo, req),
    atualizadoEm: data?.updated_at || null,
  })
})

router.put('/config', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  const ativo = Boolean(req.body?.ativo)
  const ambiente = req.body?.ambiente === 'sandbox' ? 'sandbox' : 'producao'
  const token = String(req.body?.token || '').trim()

  const { data: atual } = await supabaseAdmin
    .from('integracao_configs')
    .select('config, provider, webhook_segredo')
    .eq('empresa_id', ctx.empresaId)
    .maybeSingle()

  const salvo = subConfig(atual?.config, 'asaas')
  if (ativo && !token && !salvo?.token) {
    return res.status(400).json({ error: 'Para ligar a cobrança automática, informe o token do Asaas.' })
  }

  // Preserva TODAS as chaves já existentes no mapa — ligar o Asaas não pode
  // derrubar as credenciais do NetRis/Feegow/ZapSign.
  const mapa = (atual?.config && typeof atual.config === 'object' && !Array.isArray(atual.config))
    ? { ...atual.config } : {}
  mapa.asaas = { ...(mapa.asaas || {}), ativo, ambiente, token: token || salvo?.token || '' }

  const { error } = await supabaseAdmin.from('integracao_configs').upsert({
    empresa_id: ctx.empresaId,
    provider: atual?.provider || 'manual',   // NÃO troca o provedor de agendamento
    config: mapa,
    updated_at: new Date().toISOString(),
    updated_by: ctx.profile.id,
  }, { onConflict: 'empresa_id' })
  if (error) return res.status(400).json({ error: error.message })

  invalidarAsaas(ctx.empresaId)

  const { data: depois } = await supabaseAdmin
    .from('integracao_configs').select('webhook_segredo').eq('empresa_id', ctx.empresaId).maybeSingle()

  logAudit({
    empresaId: ctx.empresaId, atorId: ctx.profile.id, atorNome: ctx.profile.nome || ctx.profile.role,
    acao: 'asaas.config_salva', entidade: 'integracao',
    detalhe: { ativo, ambiente, tokenTrocado: Boolean(token) },
  })

  res.json({
    ok: true, ativo, ambiente,
    tokenConfigurado: Boolean(token || salvo?.token),
    webhookUrl: urlWebhook(depois?.webhook_segredo, req),
  })
})

router.post('/testar', async (req, res) => {
  const ctx = await comEmpresa(req, res, { gestor: true }); if (!ctx) return

  let token = String(req.body?.token || '').trim()
  const ambiente = req.body?.ambiente === 'sandbox' ? 'sandbox' : 'producao'
  if (!token) {
    const { data } = await supabaseAdmin
      .from('integracao_configs').select('config').eq('empresa_id', ctx.empresaId).maybeSingle()
    token = subConfig(data?.config, 'asaas')?.token || ''
  }
  if (!token) return res.status(400).json({ error: 'Informe o token do Asaas.' })

  res.json(await testarToken(token, ambiente))
})

// ── Geração da cobrança ──────────────────────────────────────────────────────

const fmtPeriodo = (c) => `${c.periodo_inicio} a ${c.periodo_fim}`
const vencimentoPadrao = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) }

// Carrega a cobrança e confere se o caller administra a empresa dona dela.
async function cobrancaDoGestor(cobrancaId, profile) {
  if (!cobrancaId) return { status: 400, error: 'id da cobrança é obrigatório' }
  const { data: c } = await supabaseAdmin
    .from('cobrancas').select('id, empresa_id, parceiro_id, valor_total, status, gateway, gateway_id, periodo_inicio, periodo_fim, parceiros(nome)')
    .eq('id', cobrancaId).maybeSingle()
  if (!c) return { status: 404, error: 'Cobrança não encontrada' }
  const pode = profile.role === 'owner' || (profile.role === 'empresa_admin' && profile.empresa_id === c.empresa_id)
  if (!pode) return { status: 404, error: 'Cobrança não encontrada' }
  return { cobranca: c }
}

router.post('/cobrancas/:id/gerar-pagamento', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const dono = await cobrancaDoGestor(req.params.id, c.profile)
  if (dono.error) return res.status(dono.status).json({ error: dono.error })
  const cob = dono.cobranca

  if (cob.status !== 'aberta') return res.status(400).json({ error: 'Só cobranças abertas podem gerar pagamento.' })
  // Idempotência: reenviar não duplica no gateway (mesmo cuidado do ZapSign).
  if (cob.gateway_id) return res.status(400).json({ error: 'Esta cobrança já tem um pagamento gerado no Asaas.' })

  const resolvido = await asaasParaEmpresa(cob.empresa_id)
  if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })

  const cliente = await clienteAsaasDoParceiro(cob.parceiro_id, resolvido.client)
  if (cliente.erro) return res.status(400).json({ error: cliente.erro })

  try {
    const payment = await resolvido.client.criarCobranca({
      customerId: cliente.customerId,
      valor: cob.valor_total,
      vencimento: vencimentoPadrao(),
      descricao: `Cobrança ExameQR — ${cob.parceiros?.nome || 'parceiro'} — ${fmtPeriodo(cob)}`,
      referencia: cob.id,
    })
    if (!payment?.id) return res.status(502).json({ error: 'Asaas não devolveu o id da cobrança criada.' })

    let pix = null
    try { pix = await resolvido.client.obterPixQrCode(payment.id) } catch (e) { console.warn('[asaas] pixQrCode falhou:', e.message) }

    const { error: upErr } = await supabaseAdmin.from('cobrancas').update({
      gateway: 'asaas',
      gateway_id: payment.id,
      link_pagamento: payment.invoiceUrl || null,
      pix_copia_cola: pix?.payload || null,
      gateway_payload: payment,
    }).eq('id', cob.id)
    if (upErr) return res.status(400).json({ error: upErr.message })

    logAudit({
      empresaId: cob.empresa_id, atorId: c.profile.id, atorNome: c.profile.nome || c.profile.role,
      acao: 'cobranca.pagamento_gerado', entidade: 'cobranca', entidadeId: cob.id,
      detalhe: { gatewayId: payment.id, valor: cob.valor_total },
    })

    res.json({ ok: true, gatewayId: payment.id, linkPagamento: payment.invoiceUrl || null, pixCopiaCola: pix?.payload || null })
  } catch (e) {
    res.status(502).json({ error: `Falha ao gerar a cobrança no Asaas: ${e.message}` })
  }
})

// Reconsulta o provedor — fallback de quem não quer esperar o webhook (mesmo
// papel do GET /api/zapsign/status/:tipo/:id).
router.get('/cobrancas/:id/status', async (req, res) => {
  const c = await getCaller(req); if (c.error) return res.status(c.status).json({ error: c.error })
  const dono = await cobrancaDoGestor(req.params.id, c.profile)
  if (dono.error) return res.status(dono.status).json({ error: dono.error })
  const cob = dono.cobranca
  if (!cob.gateway_id) return res.status(400).json({ error: 'Esta cobrança ainda não tem pagamento gerado no Asaas.' })

  const resolvido = await asaasParaEmpresa(cob.empresa_id)
  if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })

  try {
    const payment = await resolvido.client.consultarCobranca(cob.gateway_id)
    if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment?.status) && cob.status === 'aberta') {
      await concluirPagamento({ cobrancaId: cob.id, empresaId: cob.empresa_id, payment })
    }
    res.json({ statusAsaas: payment?.status || null })
  } catch (e) {
    res.status(502).json({ error: `Falha ao consultar o Asaas: ${e.message}` })
  }
})

// ── Conclusão do pagamento (compartilhada pelo webhook e pelo fallback) ──────

async function concluirPagamento({ cobrancaId, empresaId, payment }) {
  const { data } = await supabaseAdmin.from('cobrancas')
    .update({
      status: 'paga',
      paga_at: new Date().toISOString(),
      meio_pagamento: payment?.billingType || null,
      gateway_payload: payment,
    })
    .eq('id', cobrancaId).eq('status', 'aberta') // idempotente: só baixa quem ainda está aberta
    .select('id').maybeSingle()
  if (!data) return // já estava paga (webhook duplicado ou corrida com o fallback) — nada a fazer

  logAudit({
    empresaId, atorId: null, atorNome: 'Asaas (gateway de pagamento)',
    acao: 'cobranca.paga', entidade: 'cobranca', entidadeId: cobrancaId,
    detalhe: { gatewayId: payment?.id, meioPagamento: payment?.billingType || null },
  })
}

// ── Webhook (público) ────────────────────────────────────────────────────────
// Público por necessidade: quem chama é o Asaas. Não há assinatura de payload
// documentada — a autenticidade vem do segredo no caminho, mesmo raciocínio do
// webhook do ZapSign: sem ele, qualquer um baixaria cobrança de qualquer um.

router.post('/webhook/:segredo', async (req, res) => {
  const dono = await empresaDoWebhook(req.params.segredo)
  // 404 sem detalhe: um segredo errado não deve distinguir "não existe" de
  // "existe mas está desligado".
  if (!dono) return res.status(404).json({ error: 'Not found' })

  // Responde rápido: o Asaas reenvia se demorarmos.
  res.json({ ok: true })

  const evento = String(req.body?.event || '')
  const payment = req.body?.payment
  if (!payment?.id) return

  try {
    // Acha a cobrança por gateway_id E empresa_id — nunca só pelo id global,
    // senão um payment_id de outra clínica confirmaria cobrança nesta.
    const { data: cob } = await supabaseAdmin
      .from('cobrancas').select('id, status').eq('gateway_id', payment.id).eq('empresa_id', dono.empresaId).maybeSingle()
    if (!cob) {
      console.warn('[asaas] webhook sem cobrança correspondente na empresa:', payment.id)
      return
    }
    if (cob.status !== 'aberta') return // já paga/cancelada — idempotente

    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(evento)) {
      await concluirPagamento({ cobrancaId: cob.id, empresaId: dono.empresaId, payment })
      console.log('[asaas] cobrança paga:', cob.id)
    }
  } catch (e) {
    console.error('[asaas] webhook:', e?.message)
  }
})

export default router
