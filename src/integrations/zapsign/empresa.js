// Resolve o ZapSign de uma empresa a partir de `integracao_configs`.
//
// A config vive sob a chave 'zapsign' do mapa `config` — do lado dos provedores
// de agenda (netris/feegow), mas em eixo próprio: ligar o ZapSign não troca o
// método de agendamento da clínica, e trocar o método de agendamento não pode
// apagar o token do ZapSign (foi exatamente assim que o token da NFS-e sumia).

import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { createZapsignClient } from './client.js'

// Domínio sintético usado ao criar usuário por username (src/routes/admin.js).
// Não é caixa de e-mail de ninguém: mandar o link de assinatura para lá é
// mandar para o vazio, e o signatário nunca recebe o código de autenticação.
const DOMINIO_SINTETICO = 'exameqr.app'

export function emailReal(email) {
  const v = String(email || '').trim().toLowerCase()
  if (!v || !v.includes('@')) return null
  if (v.endsWith(`@${DOMINIO_SINTETICO}`)) return null
  return v
}

// Cache POR EMPRESA. Aqui se lê com service_role, que ignora RLS: sem o recorte
// explícito por empresa, o contrato da clínica B iria para a conta ZapSign da A.
const cache = new Map()
const CACHE_MS = 30_000

export function invalidarZapsign(empresaId) {
  if (empresaId) cache.delete(empresaId)
  else cache.clear()
}

// Lê a config crua (token, ambiente, ativo, segredo do webhook) de uma empresa.
export async function configZapsign(empresaId) {
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
    if (error) console.warn('[zapsign] erro lendo a config da empresa:', error.message)
    const sub = subConfig(data?.config, 'zapsign')
    cfg = {
      ativo: Boolean(sub?.ativo) && Boolean(sub?.token),
      token: sub?.token || '',
      ambiente: sub?.ambiente === 'sandbox' ? 'sandbox' : 'producao',
      webhookSegredo: data?.webhook_segredo || null,
    }
  } catch (e) {
    console.warn('[zapsign] não foi possível ler a config:', e?.message)
  }

  cache.set(empresaId, { at: Date.now(), cfg })
  return cfg
}

export async function zapsignAtivo(empresaId) {
  const c = await configZapsign(empresaId)
  return c.ativo
}

// Devolve { client, cfg } pronto para uso, ou { erro } explicando o que falta.
export async function zapsignParaEmpresa(empresaId) {
  if (!supabaseAdmin) return { erro: 'Supabase não configurado no servidor.' }
  if (!empresaId) return { erro: 'empresa inválida' }

  const cfg = await configZapsign(empresaId)
  if (!cfg.token) return { erro: 'Token do ZapSign não configurado para esta empresa.' }
  if (!cfg.ativo) return { erro: 'A assinatura pelo ZapSign está desligada para esta empresa.' }

  try {
    return { client: createZapsignClient({ token: cfg.token, ambiente: cfg.ambiente }), cfg }
  } catch (e) {
    return { erro: e.message }
  }
}

/**
 * Resolve a empresa A PARTIR do segredo do webhook.
 *
 * O caminho contrário — carregar "a" config e comparar o segredo — usaria a linha
 * de uma empresa qualquer para autenticar o webhook de todas. Aqui o segredo é a
 * chave de busca: ou casa com exatamente uma empresa, ou não casa com nenhuma.
 * A comparação é feita pelo banco, sobre um índice único, e o segredo é gerado
 * pela migration (nunca digitado por gente).
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
    console.warn('[zapsign] erro resolvendo o segredo do webhook:', error.message)
    return null
  }
  if (!data?.empresa_id) return null

  const resolvido = await zapsignParaEmpresa(data.empresa_id)
  if (resolvido.erro) return null
  return { empresaId: data.empresa_id, client: resolvido.client }
}

// URL pública que o painel do ZapSign precisa conhecer. APP_URL é a mesma env já
// usada pelo link do lote de autorização (src/routes/autorizacao.js).
export function urlWebhook(segredo, req) {
  if (!segredo) return null
  const base = (process.env.APP_URL || '').replace(/\/$/, '')
    || (req ? `${req.protocol}://${req.get('host')}` : '')
  return base ? `${base}/api/zapsign/webhook/${segredo}` : null
}
