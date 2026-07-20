import DocsLayout, { H2, H3, P, UL, Nota } from '../DocsLayout'

export default function Arquitetura() {
  return (
    <DocsLayout title="Arquitetura & stack" subtitle="Como o ExameQR é construído por dentro." updated="20/07/2026">
      <H2>Visão em camadas</H2>
      <UL>
        <li><b>Frontend</b>: aplicação React (Vite) com Tailwind CSS. Fala com o Supabase (autenticação e dados sob RLS) e com o backend (integrações e operações administrativas).</li>
        <li><b>Backend</b>: API em Node/Express. Usa a chave de serviço do Supabase para operações privilegiadas (criar usuários, integrações) e concentra a comunicação com sistemas externos (NetRis).</li>
        <li><b>Banco &amp; plataforma de dados</b>: Supabase (PostgreSQL gerenciado + Auth + Storage), na região <b>Brasil (São Paulo)</b>.</li>
      </UL>

      <H2>Stack</H2>
      <UL>
        <li><b>PostgreSQL</b> (via Supabase) — dados relacionais, com Row Level Security.</li>
        <li><b>Supabase Auth</b> — sessão, senha e login social (Google).</li>
        <li><b>Supabase Storage</b> — arquivos (ex.: logomarcas das empresas), bucket público de leitura.</li>
        <li><b>React + Vite + Tailwind</b> — interface single-page, tema claro/escuro.</li>
        <li><b>Express (Node 22)</b> — backend das integrações e da administração.</li>
      </UL>

      <H2>Por que essa divisão</H2>
      <P>O frontend acessa os dados <b>diretamente</b> no Postgres sob RLS — rápido e seguro, sem intermediário para o CRUD do dia a dia. O backend existe só onde é necessário <b>privilégio</b> (criar contas) ou <b>segredo</b> (token do NetRis), mantendo credenciais fora do navegador.</P>

      <H2>Deploy & operação</H2>
      <UL>
        <li><b>Deploy</b>: contêiner (Docker) em plataforma gerenciada (EasyPanel), atrás de HTTPS.</li>
        <li><b>Migrations</b>: o schema é versionado em arquivos SQL (<code>supabase/migrations</code>) e aplicado de forma controlada.</li>
        <li><b>Configuração</b>: URLs e chaves ficam em variáveis de ambiente; segredos só no servidor.</li>
      </UL>

      <Nota>Integrações externas são organizadas em pastas dedicadas por provedor (ex.: NetRis no backend, BrasilAPI no frontend), mantendo o código isolado e fácil de evoluir.</Nota>
    </DocsLayout>
  )
}
