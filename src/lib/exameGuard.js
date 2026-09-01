import { supabaseAdmin } from './supabaseAdmin.js'
import { podeOperarExame } from './permissoes.js'

// Carrega o exame e confere se quem chamou pode mexer nele.
//
// Usado pelas rotas de agenda (NetRis e Feegow), que usam `service_role` e
// portanto ignoram RLS: sem esta checagem o banco não protege nada e basta
// conhecer o UUID de um exame para agir sobre ele. Devolve { exame } ou
// { status, error } — 404 em vez de 403 quando o exame é de outro tenant, para
// não confirmar a existência do UUID.
export async function exameDoCaller(exameId, profile) {
  if (!exameId) return { status: 400, error: 'exameId é obrigatório' }
  const { data: ex } = await supabaseAdmin
    .from('exames').select('id, empresa_id, parceiro_id, status, netris_atendimento_id, feegow_agendamento_id')
    .eq('id', exameId).maybeSingle()
  if (!ex) return { status: 404, error: 'Exame não encontrado' }
  if (!podeOperarExame(profile, ex)) return { status: 404, error: 'Exame não encontrado' }
  return { exame: ex }
}
