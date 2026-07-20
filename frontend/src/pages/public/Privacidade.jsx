import DocsLayout, { H2, P, UL } from './DocsLayout'

export default function Privacidade() {
  return (
    <DocsLayout
      title="Política de Privacidade"
      subtitle="Como o ExameQR trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)."
      updated="16/07/2026"
    >
      <H2>1. Quem trata os dados</H2>
      <P>O ExameQR é uma plataforma de controle de exames realizados por parceria. Nesse modelo:</P>
      <UL>
        <li><b>Controlador</b>: a clínica/empresa contratante, que decide quais dados de pacientes são inseridos e para quê.</li>
        <li><b>Operador</b>: o ExameQR, que trata os dados <b>em nome da empresa contratante</b>, conforme esta política e o <a href="/tratamento-de-dados" className="text-primary font-bold hover:underline">Termo de Tratamento de Dados (DPA)</a> aceito por cada empresa.</li>
      </UL>

      <H2>2. Quais dados coletamos</H2>
      <UL>
        <li><b>Pacientes</b>: nome, CPF, data de nascimento, sexo, telefone e os exames solicitados/realizados.</li>
        <li><b>Usuários do sistema</b> (donos, empresas, coordenadores, funcionários): nome, usuário de acesso e e-mail.</li>
        <li><b>Empresas e parceiros</b>: razão social, CNPJ, endereço e contato.</li>
        <li><b>Uso</b>: registros de auditoria das ações (quem autorizou, agendou, confirmou, faturou) para segurança e rastreabilidade.</li>
      </UL>

      <H2>3. Para que usamos</H2>
      <UL>
        <li>Cadastrar e agendar exames (inclusive junto ao sistema da clínica, quando integrado).</li>
        <li>Controlar o teto de crédito do parceiro e gerar cobranças por período.</li>
        <li>Emitir comprovantes, recibos e contratos.</li>
        <li>Garantir segurança, auditoria e cumprimento de obrigações legais.</li>
      </UL>

      <H2>4. Base legal</H2>
      <P>O tratamento se apoia, conforme o caso, em: <b>consentimento</b> do titular (coletado no cadastro do paciente), <b>execução de contrato</b>, <b>tutela da saúde</b> e <b>cumprimento de obrigação legal/regulatória</b>. Dados de saúde são dados sensíveis e recebem proteção reforçada.</P>

      <H2>5. Com quem compartilhamos</H2>
      <UL>
        <li><b>Sistema da clínica (NetRis/Netpacs)</b>, quando a empresa ativa a integração, para agendar o exame — apenas os dados necessários para a marcação.</li>
        <li><b>Provedor de infraestrutura (Supabase)</b> — banco de dados e armazenamento na <b>região Brasil (São Paulo)</b>, sem transferência internacional dos dados.</li>
        <li><b>Provedor de e-mail (Resend)</b> — envio de e-mails transacionais (convites, redefinição de senha).</li>
        <li>Não vendemos nem cedemos dados a terceiros para fins de marketing.</li>
      </UL>

      <H2>6. Onde e como guardamos</H2>
      <P>Os dados ficam em banco de dados gerenciado (PostgreSQL/Supabase), isolados <b>por empresa</b> através de regras de acesso no próprio banco (RLS), com tráfego criptografado (HTTPS) e credenciais sensíveis mantidas apenas no servidor. Detalhes em <a href="/seguranca" className="text-primary font-bold hover:underline">Segurança &amp; dados</a>.</P>

      <H2>7. Por quanto tempo</H2>
      <P>Mantemos os dados enquanto durar a relação com a empresa contratante e pelo prazo necessário ao cumprimento de obrigações legais. Como referência: registros <b>financeiros/fiscais</b> são mantidos por <b>5 anos</b>; dados pessoais de pacientes tornam-se <b>elegíveis a anonimização</b> ao encerramento da finalidade ou do vínculo, preservando-se o histórico financeiro de forma anonimizada.</P>

      <H2>8. Direitos do titular</H2>
      <P>Nos termos da LGPD, o titular pode solicitar: confirmação e acesso aos dados, correção, anonimização/eliminação, portabilidade, informação sobre compartilhamentos e <b>revogação do consentimento</b>. Como o ExameQR atua como operador, os pedidos são atendidos em conjunto com a clínica/empresa responsável.</P>

      <H2>9. Cookies e sessão</H2>
      <P>Usamos apenas o armazenamento necessário para manter você autenticado (token de sessão). Não usamos cookies de rastreamento/publicidade.</P>

      <H2>10. Encarregado (DPO) e contato</H2>
      <P>Para exercer direitos ou tirar dúvidas sobre privacidade, fale com a empresa/clínica responsável pelos seus dados ou com o encarregado do ExameQR pelo canal informado no contrato.</P>

      <H2>11. Atualizações</H2>
      <P>Esta política pode ser atualizada. A data de revisão é indicada no topo. Mudanças relevantes serão comunicadas às empresas contratantes.</P>
    </DocsLayout>
  )
}
