import DocsLayout, { H2, H3, P, UL, Nota } from '../DocsLayout'

export default function Contas() {
  return (
    <DocsLayout title="Contas & autenticação" subtitle="Como as pessoas acessam o sistema e como as contas são criadas." updated="20/07/2026">
      <H2>Autenticação</H2>
      <P>A autenticação usa o <b>Supabase Auth</b>. Há dois caminhos de entrada:</P>
      <UL>
        <li><b>Usuário e senha</b> — contas criadas por um administrador, com <b>troca de senha obrigatória no primeiro acesso</b>.</li>
        <li><b>Google</b> — login social (OAuth), vinculado a um convite por e-mail.</li>
      </UL>

      <H2>Convite por e-mail</H2>
      <P>Para o acesso ser concedido, um administrador <b>convida um e-mail</b> e define o papel e o vínculo (empresa/parceiro). Quando a pessoa entra — por Google com esse mesmo e-mail —, o sistema <b>vincula o convite</b> e concede o papel automaticamente.</P>
      <P>Quem entra com um e-mail <b>não convidado</b> cai em uma tela de <b>"conta sem acesso"</b>: está autenticado, mas não enxerga nenhum dado até ser convidado.</P>

      <H2>Papéis</H2>
      <P>Cada conta tem um papel (dono, empresa, coordenador ou funcionário) que define o menu e as permissões. Veja <a href="/docs/papeis" className="text-primary font-bold hover:underline">Papéis e acessos</a>.</P>

      <H2>Aceite do DPA</H2>
      <P>No primeiro acesso do administrador de uma empresa, é exigido o <b>aceite eletrônico do Termo de Tratamento de Dados (DPA)</b>, registrado com nome, usuário, versão do texto e data/hora.</P>

      <H2>Perfil e sessão</H2>
      <UL>
        <li>Cada usuário pode alterar o próprio <b>nome</b> e a <b>senha</b>, e escolher o <b>tema</b> (claro/escuro/sistema);</li>
        <li>Usuários podem ser <b>desativados</b>, bloqueando o acesso imediatamente;</li>
        <li>A sessão trafega por HTTPS; não usamos cookies de rastreamento.</li>
      </UL>
      <Nota>Os e-mails transacionais (redefinição de senha, convites) são entregues por um provedor de envio dedicado, a partir do domínio da plataforma.</Nota>
    </DocsLayout>
  )
}
