import { supabaseAdmin } from './supabaseAdmin.js'
import { netrisParaEmpresa } from './netrisEmpresa.js'

// Resolve tudo que o NetRis precisa para agendar um exame do ExameQR:
// cliente da empresa, mapeamento do parceiro (plano/convênio), procedimento e
// o idPaciente (buscado no NetRis pelo CPF). Retorna {error,status} se faltar algo.
export async function resolverContextoExame(exameId) {
  const { data: ex } = await supabaseAdmin
    .from('exames')
    .select(`id, empresa_id, parceiro_id, nome, scheduled_at,
             pacientes(nome, cpf),
             procedimentos(netris_procedimento_id),
             parceiros(nome, netris_id_plano_convenio, netris_id_convenio, netris_id_unidade)`)
    .eq('id', exameId).maybeSingle()
  if (!ex) return { error: 'Exame não encontrado', status: 404 }

  const client = await netrisParaEmpresa(ex.empresa_id)
  if (!client) return { error: 'NetRis não está ativo para esta empresa (configure em Desenvolvedor).', status: 400 }

  const idProcedimento = ex.procedimentos?.netris_procedimento_id
  const idPlanoConvenio = ex.parceiros?.netris_id_plano_convenio
  const idConvenio = ex.parceiros?.netris_id_convenio
  const idUnidade = ex.parceiros?.netris_id_unidade
  const cpf = ex.pacientes?.cpf

  const faltando = []
  if (!idProcedimento) faltando.push('exame do catálogo sem netris_procedimento_id')
  if (!idPlanoConvenio) faltando.push('parceiro sem netris_id_plano_convenio')
  if (!idConvenio) faltando.push('parceiro sem netris_id_convenio')
  if (!cpf) faltando.push('paciente sem CPF')
  if (faltando.length) return { error: 'Mapeamento NetRis incompleto: ' + faltando.join('; '), status: 400 }

  const pac = await client.searchPacienteByCpf(cpf)
  if (!pac) return { error: 'Paciente não encontrado no NetRis pelo CPF ' + cpf, status: 404 }
  const idPaciente = pac.id_paciente ?? pac.idPaciente
  const peso = pac.peso_paciente ?? pac.peso ?? 70

  return {
    exame: ex, client,
    idProcedimento: Number(idProcedimento),
    idPlanoConvenio: Number(idPlanoConvenio),
    idConvenio: Number(idConvenio),
    idUnidade: idUnidade ? Number(idUnidade) : undefined,
    idPaciente, peso,
  }
}
