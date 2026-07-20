import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { subConfig } from '../../lib/integracaoProviders.js'
import { createFeegowClient } from './client.js'

// Carrega a config de integração de uma empresa e devolve um cliente Feegow
// pronto — ou null se a empresa não usa Feegow / não está ativa / mal configurada.
// Mesmo contrato de netrisParaEmpresa (só muda o provider).
export async function feegowParaEmpresa(empresaId) {
  if (!supabaseAdmin || !empresaId) return null
  const { data } = await supabaseAdmin
    .from('integracao_configs')
    .select('provider, config, ativo')
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (!data || data.provider !== 'feegow' || !data.ativo) return null
  const c = subConfig(data.config, 'feegow')
  if (!c.token) return null
  try {
    return createFeegowClient({ baseUrl: c.baseUrl || 'https://api.feegow.com/v1', token: c.token })
  } catch {
    return null
  }
}
