import DocsLayout, { H2, P, UL, Nota } from '../DocsLayout'

export default function ComoFunciona() {
  return (
    <DocsLayout title="Como funciona" subtitle="O ciclo completo, do crédito do parceiro ao recibo da cobrança.">
      <P>O ExameQR organiza a relação entre a <b>clínica</b> (empresa principal) e seus <b>parceiros</b> (quem encaminha pacientes). Cada parceiro tem um <b>teto de crédito</b>, e o sistema garante que só se cobra o que foi de fato realizado.</P>

      <H2>1. Teto de crédito do parceiro</H2>
      <P>A clínica define um <b>teto</b> para cada parceiro — o valor máximo em exames que ele pode ter em aberto. À medida que exames são autorizados e realizados, esse valor é <b>comprometido</b>. Ao atingir o teto, novas autorizações são bloqueadas (com uma folga: se ainda houver crédito, mesmo que pouco, um exame a mais é aceito).</P>

      <H2>2. Cadastro do paciente e do exame</H2>
      <P>O parceiro (coordenador ou funcionário) cadastra o paciente — com <b>consentimento LGPD</b> registrado — e os exames solicitados, cada um com seu valor conforme o catálogo da clínica.</P>

      <H2>3. Autorização</H2>
      <P>O coordenador do parceiro autoriza o exame. É aqui que entra a <b>trava de teto</b>: se o parceiro já atingiu o limite, a autorização é barrada — no frontend e também no banco de dados, para não haver como contornar.</P>

      <H2>4. Agendamento (opcional)</H2>
      <P>Quando a clínica ativa a integração, o exame autorizado pode ser <b>agendado diretamente no NetRis</b> (o sistema de agenda da clínica), escolhendo um horário real.</P>

      <H2>5. QR Code e confirmação (o débito)</H2>
      <P>Cada exame gera um <b>QR Code único</b>. No dia, ao realizar o exame, a clínica lê o QR. Só nesse momento o exame vira <b>realizado</b> e o valor é <b>debitado do teto</b> do parceiro.</P>
      <Nota>Este é o coração do sistema: <b>o teto só é consumido no scan</b>. Exames autorizados mas não realizados não geram cobrança.</Nota>

      <H2>6. Cobrança por lote e recibo</H2>
      <P>Ao fim do período, a clínica <b>fecha um lote</b>: o sistema soma os exames realizados e ainda não faturados, gera a cobrança e o <b>recibo</b> (com a marca da clínica). Quando o lote é marcado como <b>pago</b>, o valor correspondente é <b>liberado do teto</b> do parceiro, que volta a ter crédito.</P>

      <H2>Rastreabilidade</H2>
      <P>Todas as ações sensíveis — autorização, geração/leitura de QR, agendamento, cancelamento, assinatura de contrato e cobranças — ficam registradas em uma <b>trilha de auditoria</b> (quem fez, o quê e quando).</P>
    </DocsLayout>
  )
}
