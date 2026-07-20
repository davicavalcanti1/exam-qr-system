import DocsLayout, { H2, P, UL } from '../DocsLayout'

export default function WhiteLabel() {
  return (
    <DocsLayout title="Multiempresa & white-label" subtitle="Uma plataforma, várias clínicas — cada uma isolada e com a própria identidade.">
      <H2>Multiempresa (multi-tenant)</H2>
      <P>O ExameQR atende várias empresas na mesma instância. Todos os dados carregam a empresa a que pertencem, e o <b>isolamento é garantido no banco de dados</b> (Row Level Security): cada consulta é filtrada pela empresa do usuário autenticado. Uma empresa <b>jamais</b> enxerga dados de outra — a regra vive no banco, não apenas na aplicação.</P>

      <H2>White-label (marca por empresa)</H2>
      <P>Dentro do workspace de cada clínica, é a <b>marca dela</b> que aparece — não a da plataforma. Cada empresa pode definir:</P>
      <UL>
        <li><b>Logomarca</b> (upload de imagem) — aparece na barra lateral e nos documentos;</li>
        <li><b>Nome de exibição</b> — o nome mostrado ao usuário.</li>
      </UL>
      <P>Essa identidade aparece na navegação, no <b>recibo</b> e no <b>contrato</b>. A tela de login é neutra; a marca da empresa entra depois que o usuário acessa.</P>

      <H2>O que varia e o que é padrão</H2>
      <P>Na versão piloto, variam <b>logo e nome</b> por empresa; a paleta visual (verde/ouro) é padrão para todas. Cada empresa também tem sua própria <b>configuração de integração</b> (NetRis), seu <b>catálogo de exames</b> e seu <b>modelo de contrato</b> — nada é fixo de uma clínica específica.</P>
    </DocsLayout>
  )
}
