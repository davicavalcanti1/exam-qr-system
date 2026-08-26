-- ExameQR — SSO com o Controle Operacional
--
-- A equipe interna da Imago passa a entrar no ExameQR pela casca do Controle
-- Operacional (o módulo é exibido lá dentro, num iframe de mesma origem), sem
-- digitar senha aqui. Os dois sistemas continuam em projetos Supabase
-- SEPARADOS: o CO é a autoridade de identidade da equipe da Imago, e o ExameQR
-- continua sendo a autoridade dos parceiros e das outras clínicas — que logam
-- direto, inclusive pelo link de autorização que chega no WhatsApp.
--
-- Fundir os dois bancos resolveria o login de graça e foi descartado: colocaria
-- usuários e dados financeiros de outras clínicas dentro do banco operacional
-- interno da Imago, contra o DPA que as próprias empresas assinam aqui.
--
-- ── Como funciona ───────────────────────────────────────────────────────────
-- O usuário do CO ganha um "sombra" aqui: linha em auth.users com e-mail
-- SINTÉTICO (co.<uuid>@sso.exameqr.app) e SEM senha. Sem caixa de entrada não
-- há recuperação de senha; sem senha não há login nativo. A única porta é o
-- ticket assinado que o CO emite. É isso que faz a revogação no CO valer aqui
-- automaticamente, sem job de sincronia e sem os dois bancos divergirem.
--
-- Quem escreve a profiles NÃO é o backend: é o trigger on_auth_user_created →
-- handle_new_user(), que lê o raw_user_meta_data. Por isso esta migration
-- precisa ensinar esse trigger sobre a procedência — é a parte principal dela.
-- =============================================================================


-- ── 1) Procedência e vínculo ────────────────────────────────────────────────
alter table profiles
  add column if not exists origem     text not null default 'exameqr',
  add column if not exists co_user_id uuid;

alter table profiles drop constraint if exists profiles_origem_check;
alter table profiles add constraint profiles_origem_check
  check (origem in ('exameqr','controleoperacional'));

-- Procedência e vínculo não podem discordar: sombra sem co_user_id fica órfã
-- (nunca mais é reencontrada no 2º login, e o SSO cria uma duplicata), e nativo
-- com co_user_id seria uma porta de SSO que ninguém abriu.
alter table profiles drop constraint if exists profiles_origem_vinculo_check;
alter table profiles add constraint profiles_origem_vinculo_check
  check (
       (origem = 'controleoperacional' and co_user_id is not null)
    or (origem = 'exameqr'             and co_user_id is null)
  );

-- Garante uma sombra por pessoa. É por este índice que o 2º login reencontra o
-- usuário em vez de tentar criar outro.
create unique index if not exists uq_profiles_co_user_id
  on profiles(co_user_id) where co_user_id is not null;


-- ── 2) Mapa tenant (CO) → empresa (ExameQR) ─────────────────────────────────
-- Sem a linha correspondente o SSO falha fechado, de propósito: derivar a
-- empresa de qualquer coisa que venha no ticket deixaria o emissor escolher em
-- qual clínica provisionar. Preferimos "sem acesso" a "provisionado na clínica
-- errada".
create table if not exists sso_tenants (
  co_tenant_id uuid primary key,
  empresa_id   uuid not null references empresas(id) on delete cascade,
  criado_em    timestamptz not null default now()
);

-- RLS ligada e nenhuma policy = ninguém além da service_role (que bypassa)
-- alcança estas tabelas. O revoke é cinto de segurança sobre os grants padrão
-- que o Supabase dá a anon/authenticated no schema public.
alter table sso_tenants enable row level security;
revoke all on table sso_tenants from anon, authenticated;


-- ── 3) Mapa de papéis CO → ExameQR ──────────────────────────────────────────
-- Em tabela, e não no código, para mudar cargo sem deploy e deixar rastro.
--
-- 'owner' está FORA do CHECK de propósito: owner é a plataforma (o dono do
-- ExameQR), nunca a clínica. Deixando de fora, virou impossível mapear alguém
-- do CO para dono — nem por engano no seed, nem por UPDATE errado depois.
create table if not exists sso_role_map (
  co_role      text primary key,
  exameqr_role text
    check (exameqr_role is null or exameqr_role in
      ('empresa_admin','empresa_operador','parceiro_coordenador','parceiro_funcionario'))
);

alter table sso_role_map enable row level security;
revoke all on table sso_role_map from anon, authenticated;

-- empresa_operador = o "Operador da clínica" do GUIA-PAPEIS: agenda pacientes e
-- exames e gera links de confirmação, sem ver cobranças, contratos nem config.
-- É exatamente o escopo da recepção.
insert into sso_role_map (co_role, exameqr_role) values
  ('developer',  'empresa_admin'),
  ('admin',      'empresa_admin'),
  ('supervisor', 'empresa_operador'),
  ('recepcao',   'empresa_operador')
on conflict (co_role) do nothing;


-- ── 4) Anti-replay do ticket ────────────────────────────────────────────────
-- A PRIMARY KEY é o mecanismo: dois consumos simultâneos do mesmo jti, um
-- insere e o outro leva 23505. Sem lock, sem race, sem Redis (que este projeto
-- não tem).
create table if not exists sso_tickets_usados (
  jti      text primary key,
  usado_em timestamptz not null default now()
);

alter table sso_tickets_usados enable row level security;
revoke all on table sso_tickets_usados from anon, authenticated;

-- Para a limpeza periódica (o ticket vive 60s; a linha não precisa viver mais
-- que um dia).
create index if not exists idx_sso_tickets_usados_em
  on sso_tickets_usados(usado_em);


-- ── 5) O trigger aprende a procedência ──────────────────────────────────────
-- Três armadilhas da versão anterior, todas silenciosas:
--
--   1. `coalesce(meta->>'role', ... else 'parceiro_funcionario')` — SSO sem
--      role explícito criava o funcionário da Imago como parceiro_funcionario
--      com parceiro_id nulo. Na policy profiles_read (rls_hardening) o ramo
--      "(auth_parceiro_id() is null and empresa_id = auth_empresa_id())" casa,
--      e a pessoa passava a LER os perfis de toda a clínica. Agora, sem role no
--      metadata, o papel fica null — que desde a empresa_operador significa
--      "sem acesso".
--
--   2. `case when v_count = 0 then 'owner'` — num banco vazio (staging, réplica
--      nova) o primeiro SSO viraria dono da PLATAFORMA. O bootstrap agora só
--      vale para usuário nativo.
--
--   3. must_change_password vinha true para todo não-owner. A sombra não tem
--      senha: ela cairia num modal obrigatório de troca que não tem como
--      satisfazer. Trava total, sem mensagem de erro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count    int;
  v_origem   text;
  v_co_user  uuid;
  v_role     text;
  v_empresa  uuid;
  v_parceiro uuid;
  v_nome     text;
  v_email    text;
  v_username text;
  v_must     boolean;
begin
  select count(*) into v_count from public.profiles;

  v_origem  := coalesce(nullif(new.raw_user_meta_data->>'origem',''), 'exameqr');
  v_co_user := nullif(new.raw_user_meta_data->>'co_user_id','')::uuid;

  -- Aborta o createUser com mensagem legível, em vez de estourar o CHECK lá
  -- embaixo com erro de constraint no meio da chamada da API.
  if (v_origem = 'controleoperacional') <> (v_co_user is not null) then
    raise exception 'SSO: origem=% incoerente com co_user_id (um exige o outro)', v_origem;
  end if;

  -- Armadilha 1: papel nunca mais é herdado por omissão.
  v_role := nullif(new.raw_user_meta_data->>'role','');

  -- Armadilha 2: bootstrap de owner só para usuário nativo.
  if v_role is null and v_count = 0 and v_origem = 'exameqr' then
    v_role := 'owner';
  end if;

  v_empresa  := nullif(new.raw_user_meta_data->>'empresa_id','')::uuid;
  v_parceiro := nullif(new.raw_user_meta_data->>'parceiro_id','')::uuid;
  v_nome     := coalesce(nullif(new.raw_user_meta_data->>'nome',''),
                         split_part(new.email,'@',1));
  v_username := nullif(new.raw_user_meta_data->>'username','');

  -- O e-mail sintético do SSO não serve para contato nem para mostrar na tela;
  -- o de verdade vem no metadata.
  v_email    := coalesce(nullif(new.raw_user_meta_data->>'email_contato',''),
                         new.email);

  -- Armadilha 3. O `is distinct from` (era `<>`) importa agora que role pode
  -- ser null: com `<>` o resultado era NULL e o coalesce não salvava, batendo
  -- no not null de must_change_password.
  v_must := case
    when v_origem = 'controleoperacional' then false
    else coalesce((new.raw_user_meta_data->>'must_change_password')::boolean,
                  v_role is distinct from 'owner')
  end;

  insert into public.profiles
    (id, nome, email, username, role, empresa_id, parceiro_id,
     must_change_password, origem, co_user_id)
  values
    (new.id, v_nome, v_email, v_username, v_role, v_empresa, v_parceiro,
     v_must, v_origem, v_co_user)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Recriado para ser idempotente; o trigger já aponta para a função acima, mas
-- assim a migration se sustenta sozinha se ele tiver sido perdido.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 6) Falta o seed do tenant ───────────────────────────────────────────────
-- Esta migration NÃO semeia sso_tenants: os dois ids só existem em runtime.
-- Até rodar o insert abaixo, o SSO responde "empresa não mapeada" — que é o
-- comportamento desejado.
--
--   insert into sso_tenants (co_tenant_id, empresa_id)
--   values ('<tenant_id da Imago no CO>', '<empresa_id da Imago aqui>');
