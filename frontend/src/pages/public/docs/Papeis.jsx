import DocsLayout, { H2, P, UL } from '../DocsLayout'

export default function Papeis() {
  return (
    <DocsLayout title="Papéis e acessos" subtitle="Quem faz o quê no sistema — e o que cada perfil enxerga.">
      <P>O acesso é hierárquico e isolado por empresa. Cada usuário tem um <b>papel</b> que define seu menu e suas permissões. A separação é garantida no banco de dados (não só na tela).</P>

      <H2>Dono (owner)</H2>
      <P>Administra a <b>plataforma</b>. Cadastra e gerencia as empresas principais, define a marca de cada uma (logo/nome), configura integrações e acompanha o <b>consumo</b> de cada empresa. Não participa da operação do dia a dia das clínicas.</P>

      <H2>Empresa (empresa_admin)</H2>
      <P>Administra a <b>clínica</b>. Gerencia parceiros e seus tetos, o catálogo de exames e preços, os agendamentos, a agenda, as <b>cobranças</b> (fechar lote, marcar pago), os contratos e a auditoria da empresa.</P>

      <H2>Coordenador do parceiro (parceiro_coordenador)</H2>
      <P>Representa o <b>parceiro</b>. Cadastra pacientes e exames, <b>autoriza</b> exames (respeitando o teto), acompanha a agenda, vê as cobranças do parceiro (somente leitura), assina o contrato e gerencia os funcionários do próprio parceiro.</P>

      <H2>Funcionário do parceiro (parceiro_funcionario)</H2>
      <P>Perfil operacional do parceiro. Cadastra e consulta <b>pacientes</b> e exames, sem acesso a autorização, cobranças ou configurações.</P>

      <H2>Conta sem acesso</H2>
      <P>Quem entra (por exemplo, via Google) com um e-mail que <b>não foi convidado</b> por nenhuma empresa fica em estado "sem acesso" — autenticado, mas sem enxergar nenhum dado, até ser convidado por um administrador.</P>
    </DocsLayout>
  )
}
