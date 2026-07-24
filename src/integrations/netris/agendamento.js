import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { netrisParaEmpresa } from './empresa.js'
import { SITUACAO } from './client.js'

// Resolve tudo que o NetRis precisa para agendar um exame do ExameQR:
// cliente da empresa, mapeamento do parceiro (plano/convênio), procedimento e
// o idPaciente (buscado no NetRis pelo CPF). Retorna {error,status} se faltar algo.
export async function resolverContextoExame(exameId) {
  const { data: ex } = await supabaseAdmin
    .from('exames')
    .select(`id, empresa_id, parceiro_id, nome, scheduled_at, netris_atendimento_id,
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

// Agenda de fato um exame no NetRis (criar encaixe) e grava vínculo/horário no exame.
// Reutilizado pela rota /agendar-exame E pela confirmação de lote (link do parceiro).
// Retorna { ok, agId, empresaId, parsed } ou { ok:false, error, upstream, status }.
export async function agendarExameNoNetris(exameId, slot) {
  if (!slot?.dataString || !slot?.horarioString || !slot?.idMedico || !slot?.idSala) {
    return { ok: false, error: 'slot incompleto (dataString/horarioString/idMedico/idSala)', status: 400 }
  }
  const ctx = await resolverContextoExame(exameId)
  if (ctx.error) return { ok: false, error: ctx.error, status: ctx.status }
  try {
    // reagendamento: cancela o encaixe anterior antes de criar o novo (evita duplicar)
    if (ctx.exame.netris_atendimento_id) {
      try { await ctx.client.alterarSituacao(ctx.exame.netris_atendimento_id, SITUACAO.CANCELADO) } catch { /* best-effort */ }
    }
    const r = await ctx.client.criarEncaixe({
      dataString: slot.dataString, horarioString: slot.horarioString,
      idConvenio: ctx.idConvenio, idPlanoConvenio: ctx.idPlanoConvenio,
      idProcedimento: ctx.idProcedimento, idPaciente: ctx.idPaciente,
      idMedico: Number(slot.idMedico), idSala: Number(slot.idSala),
    })
    if (!r.ok) return { ok: false, error: 'NetRis recusou o agendamento', upstream: r.body, status: r.status >= 500 ? 502 : r.status }
    let parsed = null; try { parsed = JSON.parse(r.body) } catch { parsed = r.body }
    const agId = parsed?.message?.match?.(/ID:\s*(\d+)/)?.[1] || parsed?.id || null
    await supabaseAdmin.from('exames').update({
      netris_atendimento_id: agId, netris_agendamento_id: agId,
      scheduled_at: `${slot.dataString}T${slot.horarioString}:00-03:00`, // BRT
      netris_slot: { dataString: slot.dataString, horarioString: slot.horarioString, idMedico: Number(slot.idMedico), idSala: Number(slot.idSala) },
    }).eq('id', exameId)
    return { ok: true, agId, empresaId: ctx.exame.empresa_id, parsed }
  } catch (e) {
    return { ok: false, error: e.message, status: 502 }
  }
}
