import DocsLayout, { H2, P, UL, Nota } from '../DocsLayout'

export default function Netris() {
  return (
    <DocsLayout title="Integração NetRis" subtitle="Como o ExameQR conversa com o sistema de agenda da clínica (NetRis/Netpacs).">
      <P>Quando a clínica ativa a integração, o ExameQR passa a agendar exames diretamente no <b>NetRis</b> — o mesmo sistema que a recepção já usa. A integração é <b>opcional</b> e <b>configurada por empresa</b>.</P>

      <H2>O que a integração faz</H2>
      <UL>
        <li><b>Buscar/criar paciente</b> no NetRis a partir do cadastro do ExameQR;</li>
        <li>Consultar <b>horários disponíveis</b> na agenda;</li>
        <li><b>Agendar</b> o exame no horário escolhido — o envio ocorre na autorização;</li>
        <li><b>Cancelar</b> o agendamento quando o exame é cancelado.</li>
      </UL>

      <H2>Mapeamento de procedimentos</H2>
      <P>Cada exame do catálogo da clínica é associado ao <b>procedimento correspondente no NetRis</b>. Assim, ao agendar, o sistema sabe exatamente qual exame marcar.</P>

      <H2>Segurança da integração</H2>
      <UL>
        <li>As <b>credenciais</b> (URL e token do NetRis) ficam <b>apenas no servidor</b> — nunca chegam ao navegador;</li>
        <li>Toda a comunicação com o NetRis roda no <b>backend</b>; o navegador nunca fala direto com ele;</li>
        <li>Cada empresa tem sua própria configuração, com acesso restrito.</li>
      </UL>
      <Nota>Sem a integração ativada, o ExameQR funciona normalmente — apenas o agendamento automático fica indisponível; o controle de teto, QR e cobrança seguem iguais.</Nota>
    </DocsLayout>
  )
}
