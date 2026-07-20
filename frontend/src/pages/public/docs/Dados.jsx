import DocsLayout, { H2, H3, P, UL, Nota } from '../DocsLayout'

export default function Dados() {
  return (
    <DocsLayout title="Dados & isolamento" subtitle="Modelo de dados, isolamento por empresa e mecanismos de integridade." updated="20/07/2026">
      <H2>Isolamento por empresa (RLS)</H2>
      <P>Todas as tabelas operacionais carregam a coluna <code>empresa_id</code> e têm <b>Row Level Security</b> ativa. As políticas usam funções auxiliares <code>SECURITY DEFINER</code> (como <code>auth_empresa_id()</code>, <code>auth_parceiro_id()</code>, <code>auth_role()</code>, <code>is_owner()</code>) que leem o perfil do usuário autenticado sem risco de recursão. Resultado: cada usuário só acessa o que pertence à sua empresa (e, no caso do parceiro, ao seu parceiro).</P>

      <H2>Principais entidades</H2>
      <UL>
        <li><b>empresas</b> — as clínicas (tenants); marca e status.</li>
        <li><b>parceiros</b> — quem encaminha; teto de crédito e status de contrato.</li>
        <li><b>profiles</b> — usuários (1:1 com o Auth), papel, empresa/parceiro.</li>
        <li><b>pacientes</b> — dados pessoais e consentimento LGPD.</li>
        <li><b>exames</b> — valor, status (rascunho → autorizado → realizado/cancelado) e vínculos.</li>
        <li><b>qr_codes</b> — token único por exame, usado na confirmação.</li>
        <li><b>cobrancas</b> — lotes por período; exames faturados apontam para o lote.</li>
        <li><b>contratos</b> / <b>dpa_aceites</b> — assinaturas eletrônicas (parceiro e DPA).</li>
        <li><b>lgpd_auditoria</b> — trilha de ações sensíveis.</li>
      </UL>

      <H2>Integridade e regras no banco</H2>
      <UL>
        <li><b>Trava de teto</b>: um gatilho impede autorizar exame quando o parceiro atingiu o teto — a regra vale mesmo por acesso direto à API.</li>
        <li><b>Débito no scan</b>: o valor só compromete o teto quando o exame vira <i>realizado</i>; um lote pago libera o teto.</li>
        <li><b>Faturamento único</b>: cada exame só entra em um lote de cobrança.</li>
      </UL>

      <H2>LGPD por dentro</H2>
      <UL>
        <li><b>Consentimento</b> do paciente registrado com data/hora;</li>
        <li><b>Exportação</b> dos dados do titular (portabilidade) e <b>anonimização</b> (preservando o histórico financeiro);</li>
        <li><b>Auditoria</b> das ações; <b>DPA</b> aceito eletronicamente por cada empresa.</li>
      </UL>
      <Nota>Dados em região <b>Brasil (São Paulo)</b>, sem transferência internacional. Tráfego por HTTPS/TLS. Detalhes em <a href="/seguranca" className="text-primary font-bold hover:underline">Segurança &amp; dados</a>.</Nota>
    </DocsLayout>
  )
}
