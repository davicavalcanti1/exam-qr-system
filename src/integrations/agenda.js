import { netrisParaEmpresa } from './netris/empresa.js'
import { feegowParaEmpresa } from './feegow/empresa.js'

// Resolvedor de agenda AGNÓSTICO de provedor. Cada resolvedor devolve null se
// o provider configurado da empresa não for o dele — então basta trocar
// integracao_configs.provider ('netris' ↔ 'feegow') para o sistema usar o outro,
// sem mudar o código chamador (ambos os clientes têm a mesma interface).
export async function agendaParaEmpresa(empresaId) {
  return (await netrisParaEmpresa(empresaId)) || (await feegowParaEmpresa(empresaId))
}
