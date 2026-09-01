-- Contrato padrão da PLATAFORMA — mantido pelo dono, adotável pelas empresas.
--
-- POR QUE: até aqui cada empresa escrevia (ou herdava por cópia) o seu texto em
-- `contrato_modelos`. Consequência: uma correção de cláusula precisava ser feita
-- N vezes, e uma clínica que editou o texto errado ficava com contrato fraco sem
-- ninguém saber. Centralizando, uma revisão de advogado vale para todas as
-- adotantes de uma vez.
--
-- DESENHO — REFERÊNCIA, NÃO CÓPIA:
--   * `contrato_padrao` guarda VERSÕES do texto da plataforma; uma é a vigente.
--   * `contrato_modelos.usa_padrao` = a empresa gera a partir da vigente.
--   * contrato JÁ ASSINADO não muda: `contratos.conteudo` continua sendo o
--     snapshot preenchido no momento da geração, e o trigger
--     `trg_contratos_protege` proíbe reescrevê-lo. Publicar versão nova afeta só
--     os contratos gerados depois.
--
-- NÃO É DESTRUTIVA e não tem janela: sem nada publicado, a geração cai no texto
-- que já vem no bundle (`frontend/src/legal/contratoParceria.js`), que é o
-- comportamento de hoje.

-- ── 1. Versões do contrato da plataforma ─────────────────────────────────────

create table if not exists contrato_padrao (
  versao       text primary key,              -- 'AAAA-MM-DD', como o DPA
  titulo       text not null,
  conteudo     text not null,
  -- Defaults dos parâmetros ({{multa}}, {{juros}}…). A empresa sobrescreve o
  -- que quiser em `contrato_modelos.parametros`; o que ela não definir vem daqui.
  parametros   jsonb not null default '{}'::jsonb,
  vigente      boolean not null default false,
  notas        text,                          -- o que mudou nesta versão
  publicado_em timestamptz,
  criado_por   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

-- No máximo UMA vigente. Índice único sobre expressão constante, restrito às
-- linhas vigentes: é o jeito de dizer "só uma linha pode ter vigente = true"
-- sem trigger.
create unique index if not exists idx_contrato_padrao_vigente
  on contrato_padrao ((true)) where vigente;

alter table contrato_padrao enable row level security;

-- Leitura para qualquer usuário autenticado: a empresa precisa ler para gerar e
-- para pré-visualizar antes de adotar. Não há segredo aqui — é o texto que o
-- parceiro vai assinar.
drop policy if exists contrato_padrao_read on contrato_padrao;
create policy contrato_padrao_read on contrato_padrao for select
  using (auth.uid() is not null);

-- Escrita só do dono. É documento de plataforma: clínica nenhuma edita o texto
-- que as outras usam.
drop policy if exists contrato_padrao_write on contrato_padrao;
create policy contrato_padrao_write on contrato_padrao for all
  using (is_owner()) with check (is_owner());

-- ── 2. A empresa adota (ou não) o contrato da plataforma ─────────────────────

alter table contrato_modelos add column if not exists usa_padrao boolean not null default true;
alter table contrato_modelos add column if not exists parametros jsonb not null default '{}'::jsonb;

-- Quem JÁ escreveu o próprio texto continua com ele. A coluna nasce `true` para
-- que empresa nova caia no padrão, mas ligar isso retroativamente trocaria, em
-- silêncio, o contrato de quem customizou — inclusive de quem customizou por
-- exigência jurídica própria.
update contrato_modelos set usa_padrao = false
  where coalesce(conteudo, '') <> '' and usa_padrao;

-- ── 3. Forma de repasse por parceiro ─────────────────────────────────────────
-- A cláusula 8.1 do modelo ("o parceiro repassa o custo ao paciente?") varia por
-- PARCEIRO, e o modelo é por empresa. Sem esta coluna, "nosso contrato" chegaria
-- na assinatura com o campo em branco — e é justamente a cláusula que separa
-- compra de serviço de vantagem por encaminhamento (art. 59 do CEM).
alter table parceiros add column if not exists forma_repasse text
  check (forma_repasse in ('sem_repasse', 'repasse_integral', 'repasse_margem'));

-- PostgREST guarda o schema em cache; sem isto as colunas novas só aparecem no
-- próximo restart e o frontend recebe "column does not exist".
notify pgrst, 'reload schema';
