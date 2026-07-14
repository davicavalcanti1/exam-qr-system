import { supabaseAdmin } from './supabaseAdmin.js'
import { createNetrisClient } from './netris.js'

// Carrega a config de integração de uma empresa e devolve um cliente NetRis
// pronto — ou null se a empresa não usa NetRis / não está ativa / mal configurada.
export async function netrisParaEmpresa(empresaId) {
  if (!supabaseAdmin || !empresaId) return null
  const { data } = await supabaseAdmin
    .from('integracao_configs')
    .select('provider, config, ativo')
    .eq('empresa_id', empresaId)
    .maybeSingle()
  if (!data || data.provider !== 'netris' || !data.ativo) return null
  const c = data.config || {}
  if (!c.baseUrl || !c.token) return null
  try {
    return createNetrisClient({
      baseUrl: c.baseUrl,
      token: c.token,
      idPlanoConvenio: c.idPlanoConvenio || '',
      idUnidade: c.idUnidade || '',
      idConvenio: c.idConvenio || '',
    })
  } catch {
    return null
  }
}
