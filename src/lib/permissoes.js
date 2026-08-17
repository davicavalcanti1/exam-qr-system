// Quem pode o quê sobre um exame.
//
// Existe porque o backend fala com o banco usando `service_role`, que ignora RLS
// por completo: nas rotas de service role a checagem de tenant não acontece
// sozinha — tem que ser escrita. Concentrar a regra aqui evita que uma rota nova
// nasça sem ela, que foi exatamente como as rotas de agendamento ficaram abertas.
//
// `exame` precisa trazer `empresa_id` e `parceiro_id`.

// Ler/imprimir o comprovante do exame. O funcionário do parceiro não entra:
// ele cadastra paciente, não emite comprovante.
export function podeVerExame(p, ex) {
  if (!p || !ex) return false
  if (p.role === 'owner') return true
  if (['empresa_admin', 'empresa_operador'].includes(p.role)) return p.empresa_id === ex.empresa_id
  if (p.role === 'parceiro_coordenador') return p.parceiro_id === ex.parceiro_id
  return false
}

// Operar a agenda do exame (consultar horários, agendar, cancelar no RIS).
// Mais amplo que `podeVerExame` de propósito: a tela de Pacientes, onde o
// agendamento acontece, é usada também pelo funcionário do parceiro.
//
// O que isto fecha é o cruzamento entre tenants — antes bastava um UUID de exame
// alheio para ler dados do paciente e mexer na agenda de outra clínica.
export function podeOperarExame(p, ex) {
  if (!p || !ex) return false
  if (p.role === 'owner') return true
  if (['empresa_admin', 'empresa_operador'].includes(p.role)) {
    return p.empresa_id === ex.empresa_id
  }
  if (['parceiro_coordenador', 'parceiro_funcionario'].includes(p.role)) {
    return p.empresa_id === ex.empresa_id && p.parceiro_id === ex.parceiro_id
  }
  return false
}

// Administra a integração da empresa (console do RIS, proxy, credenciais).
export function ehGestor(p) {
  return Boolean(p) && ['owner', 'empresa_admin'].includes(p.role)
}
