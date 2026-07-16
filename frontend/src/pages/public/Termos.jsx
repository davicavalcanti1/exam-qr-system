import DocsLayout, { H2, P, UL } from './DocsLayout'

export default function Termos() {
  return (
    <DocsLayout title="Termos de Uso" subtitle="Condições para uso da plataforma ExameQR." updated="16/07/2026">
      <H2>1. Objeto</H2>
      <P>O ExameQR é uma plataforma para controle e agendamento de exames realizados por parceria, incluindo controle de teto de crédito, cobrança por lote, contratos e integração com o sistema da clínica.</P>

      <H2>2. Cadastro e acesso</H2>
      <UL>
        <li>O acesso é feito por credenciais individuais; cada usuário é responsável por mantê-las em sigilo.</li>
        <li>A empresa contratante é responsável por criar e gerenciar os usuários da sua equipe e parceiros.</li>
        <li>É obrigatória a troca de senha no primeiro acesso.</li>
      </UL>

      <H2>3. Responsabilidades da empresa contratante</H2>
      <UL>
        <li>Inserir dados verdadeiros e obter o consentimento dos pacientes (LGPD).</li>
        <li>Usar a plataforma conforme a legislação de saúde e proteção de dados.</li>
        <li>Definir corretamente tetos, preços e mapeamentos de integração.</li>
      </UL>

      <H2>4. Uso aceitável</H2>
      <P>É vedado usar a plataforma para fins ilícitos, tentar acessar dados de outras empresas, burlar limites de acesso ou comprometer a segurança do sistema.</P>

      <H2>5. Integrações de terceiros</H2>
      <P>Funcionalidades de agendamento dependem do sistema da clínica (NetRis/Netpacs) e da infraestrutura (Supabase). Indisponibilidades desses serviços podem afetar temporariamente recursos relacionados.</P>

      <H2>6. Privacidade</H2>
      <P>O tratamento de dados pessoais segue a <a href="/privacidade" className="text-primary font-bold hover:underline">Política de Privacidade</a>, parte integrante destes termos.</P>

      <H2>7. Limitação de responsabilidade</H2>
      <P>A plataforma é fornecida "no estado em que se encontra". Não nos responsabilizamos por decisões clínicas, dados inseridos incorretamente pela empresa ou indisponibilidades de serviços de terceiros.</P>

      <H2>8. Alterações</H2>
      <P>Estes termos podem ser atualizados; a data de revisão consta no topo. O uso continuado após alterações implica concordância.</P>
    </DocsLayout>
  )
}
