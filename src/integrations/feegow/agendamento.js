import { supabaseAdmin } from '../../lib/supabaseAdmin.js'
import { feegowParaEmpresa } from './empresa.js'

// Resolve tudo que o Feegow precisa para agendar um exame do ExameQR: cliente
// da empresa, mapeamento do parceiro (convênio, se houver), procedimento e o
// idPaciente (buscado no Feegow pelo CPF). Retorna {error,status} se faltar algo.
export async function resolverContextoExame(exameId) {
  const { data: ex } = await supabaseAdmin
    .from('exames')
    .select(`id, empresa_id, parceiro_id, nome, valor, scheduled_at, feegow_agendamento_id,
             pacientes(nome, cpf),
             procedimentos(feegow_procedimento_id, feegow_especialidade_id),
             parceiros(nome, feegow_convenio_id, feegow_convenio_plano_id)`)
    .eq('id', exameId).maybeSingle()
  if (!ex) return { error: 'Exame não encontrado', status: 404 }

  const client = await feegowParaEmpresa(ex.empresa_id)
  if (!client) return { error: 'Feegow não está ativo para esta empresa (configure em Desenvolvedor).', status: 400 }

  const idProcedimento = ex.procedimentos?.feegow_procedimento_id
  const idEspecialidade = ex.procedimentos?.feegow_especialidade_id
  const idConvenio = ex.parceiros?.feegow_convenio_id
  const idConvenioPlano = ex.parceiros?.feegow_convenio_plano_id
  const cpf = ex.pacientes?.cpf
  const localId = client.config?.localId

  const faltando = []
  if (!idProcedimento) faltando.push('exame do catálogo sem feegow_procedimento_id')
  if (!idEspecialidade) faltando.push('exame do catálogo sem feegow_especialidade_id')
  if (!cpf) faltando.push('paciente sem CPF')
  if (!localId) faltando.push('empresa sem local_id do Feegow configurado (Desenvolvedor)')
  if (faltando.length) return { error: 'Mapeamento Feegow incompleto: ' + faltando.join('; '), status: 400 }

  const pac = await client.searchPacienteByCpf(cpf)
  if (!pac) return { error: 'Paciente não encontrado no Feegow pelo CPF ' + cpf, status: 404 }
  const idPaciente = pac.paciente_id ?? pac.id_paciente ?? pac.id

  // convênio é opcional por parceiro: sem os dois ids mapeados, o agendamento
  // vira particular (plano=0) — não bloqueia o fluxo.
  const usaConvenio = Boolean(idConvenio && idConvenioPlano)

  return {
    exame: ex, client,
    idProcedimento: Number(idProcedimento),
    idEspecialidade: Number(idEspecialidade),
    idConvenio: usaConvenio ? Number(idConvenio) : null,
    idConvenioPlano: usaConvenio ? Number(idConvenioPlano) : null,
    idPaciente, localId: Number(localId),
  }
}

const isoParaBR = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}-${m}-${y}` }
const horaCompleta = (h) => (String(h).length === 5 ? `${h}:00` : String(h))

// Agenda de fato um exame no Feegow (POST appoints/new-appoint) e grava
// vínculo/horário no exame. Reutilizado pela rota /agendar-exame E pela
// confirmação de lote (link do parceiro), igual ao equivalente NetRis.
export async function agendarExameNoFeegow(exameId, slot) {
  if (!slot?.dataString || !slot?.horarioString || !slot?.idMedico) {
    return { ok: false, error: 'slot incompleto (dataString/horarioString/idMedico)', status: 400 }
  }
  const ctx = await resolverContextoExame(exameId)
  if (ctx.error) return { ok: false, error: ctx.error, status: ctx.status }
  try {
    // reagendamento: cancela o agendamento anterior antes de criar o novo (evita duplicar)
    if (ctx.exame.feegow_agendamento_id) {
      try { await ctx.client.cancelarAgendamento(ctx.exame.feegow_agendamento_id) } catch { /* best-effort */ }
    }
    const usaConvenio = Boolean(ctx.idConvenio && ctx.idConvenioPlano)
    const body = {
      local_id: ctx.localId,
      paciente_id: Number(ctx.idPaciente),
      profissional_id: Number(slot.idMedico),
      especialidade_id: ctx.idEspecialidade,
      procedimento_id: ctx.idProcedimento,
      data: isoParaBR(slot.dataString),
      horario: horaCompleta(slot.horarioString),
      valor: usaConvenio ? 0 : Number(ctx.exame.valor || 0),
      plano: usaConvenio ? 1 : 0,
      ...(usaConvenio ? { convenio_id: ctx.idConvenio, convenio_plano_id: ctx.idConvenioPlano } : {}),
    }
    const r = await ctx.client.criarEncaixe(body)
    if (!r.ok) return { ok: false, error: 'Feegow recusou o agendamento', upstream: r.body, status: r.status >= 500 ? 502 : r.status }
    let parsed = null; try { parsed = JSON.parse(r.body) } catch { parsed = r.body }
    const agId = parsed?.content?.agendamento_id ?? null
    await supabaseAdmin.from('exames').update({
      feegow_agendamento_id: agId,
      scheduled_at: `${slot.dataString}T${horaCompleta(slot.horarioString)}-03:00`, // BRT
      feegow_slot: { dataString: slot.dataString, horarioString: slot.horarioString, idMedico: Number(slot.idMedico) },
    }).eq('id', exameId)
    return { ok: true, agId, empresaId: ctx.exame.empresa_id, parsed }
  } catch (e) {
    return { ok: false, error: e.message, status: 502 }
  }
}

// Cancela o agendamento do exame no Feegow e limpa o vínculo.
export async function cancelarExameNoFeegow(exameId) {
  const { data: ex } = await supabaseAdmin
    .from('exames').select('id, empresa_id, feegow_agendamento_id').eq('id', exameId).maybeSingle()
  if (!ex) return { ok: false, error: 'Exame não encontrado', status: 404 }
  if (!ex.feegow_agendamento_id) return { ok: false, error: 'Este exame não tem agendamento no Feegow', status: 400 }
  const client = await feegowParaEmpresa(ex.empresa_id)
  if (!client) return { ok: false, error: 'Feegow não está ativo para esta empresa', status: 400 }
  try {
    const r = await client.cancelarAgendamento(ex.feegow_agendamento_id)
    if (!r.ok) return { ok: false, error: 'Feegow recusou o cancelamento', upstream: r.body, status: r.status >= 500 ? 502 : r.status }
    await supabaseAdmin.from('exames').update({ feegow_agendamento_id: null, scheduled_at: null, feegow_slot: null }).eq('id', exameId)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message, status: 502 }
  }
}
