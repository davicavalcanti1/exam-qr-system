// Resolve o Asaas de uma empresa a partir de `integracao_configs`.
//
// A config vive sob a chave 'asaas' do mapa `config` — em eixo próprio, como o
// ZapSign: ligar a cobrança automática não troca o método de agendamento da
// clínica (netris/feegow), e trocar o método de agendamento não pode apagar o
// token do Asaas.

import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { createAsaasClient } from './client.js'

// Cache POR EMPRESA. Lê com service_role, que ignora RLS: sem o recorte
// explícito por empresa, a cobrança da clínica B usaria a conta Asaas da A.
const cache = new Map()
const CACHE_MS = 30_000

export function invalidarAsaas(empresaId) {
  if (empresaId) cache.delete(empresaId)
  else cache.clear()
}

// Lê a config crua (token, ambiente, ativo, segredo do webhook) de uma empresa.
export async function configAsaas(empresaId) {
  if (!supabaseAdmin || !empresaId) return { ativo: false, token: '', ambiente: 'producao', webhookSegredo: null }

  const hit = cache.get(empresaId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.cfg

  let cfg = { ativo: false, token: '', ambiente: 'producao', webhookSegredo: null }
  try {
    const { data, error } = await supabaseAdmin
      .from('integracao_configs')
      .select('config, webhook_segredo')
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (error) console.warn('[asaas] erro lendo a config da empresa:', error.message)
    const sub = subConfig(data?.config, 'asaas')
    cfg = {
      ativo: Boolean(sub?.ativo) && Boolean(sub?.token),
      token: sub?.token || '',
      ambiente: sub?.ambiente === 'sandbox' ? 'sandbox' : 'producao',
      webhookSegredo: data?.webhook_segredo || null,
    }
  } catch (e) {
    console.warn('[asaas] não foi possível ler a config:', e?.message)
  }

  cache.set(empresaId, { at: Date.now(), cfg })
  return cfg
}

export async function asaasAtivo(empresaId) {
  const c = await configAsaas(empresaId)
  return c.ativo
}

// Devolve { client, cfg } pronto para uso, ou { erro } explicando o que falta.
export async function asaasParaEmpresa(empresaId) {
  if (!supabaseAdmin) return { erro: 'Supabase não configurado no servidor.' }
  if (!empresaId) return { erro: 'empresa inválida' }

  const cfg = await configAsaas(empresaId)
  if (!cfg.token) return { erro: 'Token do Asaas não configurado para esta empresa.' }
  if (!cfg.ativo) return { erro: 'A cobrança automática pelo Asaas está desligada para esta empresa.' }

  try {
    return { client: createAsaasClient({ token: cfg.token, ambiente: cfg.ambiente }), cfg }
  } catch (e) {
    return { erro: e.message }
  }
}

/**
 * Resolve a empresa A PARTIR do segredo do webhook — mesma lógica do ZapSign
 * (empresaDoWebhook em zapsign/empresa.js): o segredo é a chave de busca, nunca
 * "a" config comparada contra o valor recebido, senão o segredo de uma clínica
 * autenticaria o webhook de todas. Mantida como cópia local (não importada do
 * módulo zapsign) porque o shape de retorno é por provedor — lá devolve um
 * client ZapSign, aqui um client Asaas; acoplar os dois por um detalhe de shape
 * criaria uma dependência sem necessidade real entre dois módulos independentes.
 */
export async function empresaDoWebhook(segredo) {
  if (!supabaseAdmin) return null
  const s = String(segredo || '')
  if (s.length < 16) return null

  const { data, error } = await supabaseAdmin
    .from('integracao_configs')
    .select('empresa_id')
    .eq('webhook_segredo', s)
    .maybeSingle()
  if (error) {
    console.warn('[asaas] erro resolvendo o segredo do webhook:', error.message)
    return null
  }
  if (!data?.empresa_id) return null

  const resolvido = await asaasParaEmpresa(data.empresa_id)
  if (resolvido.erro) return null
  return { empresaId: data.empresa_id, client: resolvido.client }
}

// URL pública que o painel do Asaas precisa conhecer (mesma env do ZapSign/lote
// de autorização: APP_URL).
export function urlWebhook(segredo, req) {
  if (!segredo) return null
  const base = (process.env.APP_URL || '').replace(/\/$/, '')
    || (req ? `${req.protocol}://${req.get('host')}` : '')
  return base ? `${base}/api/asaas/webhook/${segredo}` : null
}

// Resolve (ou cria) o cliente Asaas do parceiro, cacheado em
// parceiros.asaas_customer_id. cpfCnpj é obrigatório na API do Asaas — hoje é
// opcional no cadastro do parceiro, então o erro precisa dizer exatamente o que
// falta em vez de deixar o Asaas devolver um 400 cru.
export async function clienteAsaasDoParceiro(parceiroId, client) {
  const { data: parc } = await supabaseAdmin
    .from('parceiros').select('id, nome, documento, email, asaas_customer_id').eq('id', parceiroId).maybeSingle()
  if (!parc) return { erro: 'Parceiro não encontrado' }
  if (parc.asaas_customer_id) return { customerId: parc.asaas_customer_id }

  if (!parc.documento) {
    return { erro: `Parceiro "${parc.nome}" não tem CPF/CNPJ cadastrado — obrigatório para gerar cobrança no Asaas.` }
  }

  const cliente = await client.criarCliente({ nome: parc.nome, documento: parc.documento, email: parc.email || undefined })
  if (!cliente?.id) return { erro: 'Asaas não devolveu o id do cliente criado.' }

  await supabaseAdmin.from('parceiros').update({ asaas_customer_id: cliente.id }).eq('id', parceiroId)
  return { customerId: cliente.id }
}
