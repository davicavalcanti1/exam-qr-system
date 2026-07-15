import { supabaseAdmin } from './supabaseAdmin.js'

// Registra uma ação na trilha de auditoria. Best-effort: nunca quebra o fluxo.
export async function logAudit({ empresaId, atorId, atorNome, acao, entidade, entidadeId, detalhe }) {
  if (!supabaseAdmin) return
  try {
    await supabaseAdmin.from('audit_log').insert({
      empresa_id: empresaId || null,
      ator_id: atorId || null,
      ator_nome: atorNome || null,
      acao,
      entidade: entidade || null,
      entidade_id: entidadeId || null,
      detalhe: detalhe || null,
    })
  } catch { /* auditoria nunca interrompe a operação */ }
}
