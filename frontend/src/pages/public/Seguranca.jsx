import DocsLayout, { H2, P, UL } from './DocsLayout'

export default function Seguranca() {
  return (
    <DocsLayout
      title="Segurança & armazenamento de dados"
      subtitle="Como o ExameQR guarda e protege os dados — especialmente os dados sensíveis de saúde."
      updated="16/07/2026"
    >
      <H2>Onde os dados ficam</H2>
      <P>Os dados são armazenados em banco de dados <b>PostgreSQL gerenciado (Supabase)</b>, na <b>região Brasil (São Paulo)</b> — sem transferência internacional —, com backups automáticos do provedor e acesso controlado. O sistema é multiempresa: cada empresa enxerga apenas os seus próprios dados.</P>

      <H2>Isolamento por empresa (RLS)</H2>
      <P>O isolamento é feito no próprio banco, com <b>Row Level Security</b>: cada consulta é filtrada pela empresa/perfil do usuário autenticado. Um usuário de uma empresa não consegue ler dados de outra — a regra vive no banco, não só na aplicação.</P>

      <H2>Credenciais e integrações</H2>
      <UL>
        <li>Chaves sensíveis (ex.: token do sistema da clínica) ficam <b>apenas no servidor</b> — nunca chegam ao navegador.</li>
        <li>A integração com o sistema da clínica (NetRis) roda no backend; o navegador nunca fala direto com ele.</li>
        <li>Cada empresa tem sua própria configuração de integração, guardada com acesso restrito.</li>
      </UL>

      <H2>Transmissão</H2>
      <P>Todo o tráfego é criptografado via <b>HTTPS/TLS</b>. Chamadas a serviços externos também são feitas por conexões seguras.</P>

      <H2>Autenticação e acesso</H2>
      <UL>
        <li>Login por usuário/senha (Supabase Auth), com <b>troca de senha obrigatória no primeiro acesso</b>.</li>
        <li>Perfis com permissões distintas (dono, empresa, coordenador, funcionário).</li>
        <li>Usuários podem ser <b>desativados</b>, bloqueando o acesso imediatamente.</li>
      </UL>

      <H2>Consentimento e dados de saúde</H2>
      <P>O cadastro de paciente exige o <b>consentimento explícito</b> para uso dos dados (registrado com data/hora). Dados de saúde são tratados como sensíveis, com acesso restrito ao necessário.</P>

      <H2>Auditoria</H2>
      <P>Ações sensíveis — autorização de exame, geração/leitura de QR, agendamento, cancelamento, assinatura de contrato e cobranças — ficam registradas em uma <b>trilha de auditoria</b> (quem fez, o quê e quando).</P>

      <H2>Débito controlado por QR</H2>
      <P>O valor de um exame só é debitado do teto do parceiro quando o exame é <b>confirmado pela leitura do QR</b> — evitando cobrança indevida de exames não realizados.</P>

      <H2>Boas práticas recomendadas às empresas</H2>
      <UL>
        <li>Repasse credenciais de forma segura e oriente a troca de senha no 1º acesso.</li>
        <li>Desative usuários que saíram da equipe.</li>
        <li>Colete o consentimento do paciente antes do cadastro.</li>
      </UL>
    </DocsLayout>
  )
}
