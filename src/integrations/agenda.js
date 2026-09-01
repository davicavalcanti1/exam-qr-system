import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from './netris/empresa.js'
import { feegowParaEmpresa } from './feegow/empresa.js'
import { agendarExameNoNetris } from './netris/agendamento.js'
import { agendarExameNoFeegow } from './feegow/agendamento.js'

// Resolvedor de agenda AGNÓSTICO de provedor. Cada resolvedor devolve null se
// o provider configurado da empresa não for o dele — então basta trocar
// integracao_configs.provider ('netris' ↔ 'feegow') para o sistema usar o outro,
// sem mudar o código chamador (ambos os clientes têm a mesma interface).
//
// Devolve { provider, client } (não só o client cru): quem chama precisa saber
// COM QUAL provider está falando para decidir o que faz sentido chamar nele —
// sem isso, código agnóstico acaba usando constantes/rotas de um provider
// específico por engano (foi o que aconteceu antes em qr.js).
export async function agendaParaEmpresa(empresaId) {
  const netris = await netrisParaEmpresa(empresaId)
  if (netris) return { provider: 'netris', client: netris }
  const feegow = await feegowParaEmpresa(empresaId)
  if (feegow) return { provider: 'feegow', client: feegow }
  return null
}

// Dispatcher agnóstico de "Fase 4" (agendar um exame específico num slot) — para
// fluxos que não são de um provider em particular, como a confirmação em lote
// pelo link do parceiro (src/routes/autorizacao.js). Rotas que já são de um
// namespace de provider (netris/routes.js, feegow/routes.js) continuam chamando
// a função específica direto, sem passar por aqui.
export async function agendarExameNaAgenda(exameId, slot) {
  const { data: ex } = await supabaseAdmin.from('exames').select('empresa_id').eq('id', exameId).maybeSingle()
  if (!ex) return { ok: false, error: 'Exame não encontrado', status: 404 }
  const resolved = await agendaParaEmpresa(ex.empresa_id)
  if (!resolved) return { ok: false, error: 'Nenhuma integração de agenda ativa para esta empresa.', status: 400 }
  return resolved.provider === 'netris'
    ? agendarExameNoNetris(exameId, slot)
    : agendarExameNoFeegow(exameId, slot)
}
