import { supabase } from './supabase'

// Registra uma ação na auditoria (best-effort). Chame com os dados do auth.
export async function logAudit({ empresaId, atorId, atorNome, acao, entidade, entidadeId, detalhe }) {
  try {
    await supabase.from('audit_log').insert({
      empresa_id: empresaId || null,
      ator_id: atorId || null,
      ator_nome: atorNome || null,
      acao,
      entidade: entidade || null,
      entidade_id: entidadeId || null,
      detalhe: detalhe || null,
    })
  } catch { /* nunca interrompe o fluxo */ }
}
