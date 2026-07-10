-- ExameQR v2 — Fundação multi-tenant (Supabase)
-- Hierarquia: owner (global) → empresa_principal → parceiro → funcionário
-- Isolamento por empresa_id via RLS. A escrita da hierarquia (empresas/parceiros/
-- profiles) roda via SERVICE ROLE no backend (bypassa RLS); os dados operacionais
-- (pacientes/exames/qr) são acessados pelo frontend sob RLS.

create extension if not exists pgcrypto;

-- ── Tabelas base ─────────────────────────────────────────────────────────────
create table if not exists empresas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cnpj       text,
  status     text not null default 'ativa' check (status in ('ativa','inativa')),
  created_at timestamptz not null default now()
);

create table if not exists parceiros (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  nome            text not null,
  cnpj            text,
  teto            numeric(12,2) not null default 2000,
  status          text not null default 'ativo' check (status in ('ativo','bloqueado','suspenso')),
  contrato_status text not null default 'pendente' check (contrato_status in ('pendente','assinado')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_parceiros_empresa on parceiros(empresa_id);

-- profiles: 1:1 com auth.users (Supabase Auth). empresa_id null = owner.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references empresas(id) on delete cascade,
  parceiro_id uuid references parceiros(id) on delete set null,
  nome        text not null default '',
  email       text,
  role        text not null check (role in ('owner','empresa_admin','parceiro_coordenador','parceiro_funcionario')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_profiles_empresa on profiles(empresa_id);
create index if not exists idx_profiles_parceiro on profiles(parceiro_id);

create table if not exists pacientes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  parceiro_id uuid not null references parceiros(id) on delete cascade,
  nome        text not null,
  cpf         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pacientes_empresa on pacientes(empresa_id);
create index if not exists idx_pacientes_parceiro on pacientes(parceiro_id);

create table if not exists exames (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  parceiro_id           uuid not null references parceiros(id) on delete cascade,
  paciente_id           uuid not null references pacientes(id) on delete cascade,
  nome                  text not null,
  indicacao             text,
  valor                 numeric(12,2) not null default 0,
  scheduled_at          timestamptz,
  -- máquina de estados: rascunho → aguardando_autorizacao → autorizado → realizado/cancelado
  status                text not null default 'rascunho'
                          check (status in ('rascunho','aguardando_autorizacao','autorizado','realizado','cancelado')),
  criado_por            uuid references profiles(id),
  autorizado_por        uuid references profiles(id),
  netris_atendimento_id text,
  netris_procedimento_id text,
  created_at            timestamptz not null default now()
);
create index if not exists idx_exames_empresa on exames(empresa_id);
create index if not exists idx_exames_parceiro on exames(parceiro_id);
create index if not exists idx_exames_status on exames(status);

create table if not exists qr_codes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  parceiro_id uuid not null references parceiros(id) on delete cascade,
  exame_id    uuid not null references exames(id) on delete cascade,
  token       text not null unique,
  status      text not null default 'ativo' check (status in ('ativo','usado','revogado')),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ── Helpers (SECURITY DEFINER → rodam como owner, bypassam RLS = sem recursão) ─
create or replace function public.auth_empresa_id() returns uuid
  language sql stable security definer set search_path = public
  as $$ select empresa_id from profiles where id = auth.uid() $$;

create or replace function public.auth_parceiro_id() returns uuid
  language sql stable security definer set search_path = public
  as $$ select parceiro_id from profiles where id = auth.uid() $$;

create or replace function public.auth_role() returns text
  language sql stable security definer set search_path = public
  as $$ select role from profiles where id = auth.uid() $$;

create or replace function public.is_owner() returns boolean
  language sql stable security definer set search_path = public
  as $$ select coalesce((select role from profiles where id = auth.uid()) = 'owner', false) $$;

create or replace function public.is_empresa_level() returns boolean
  language sql stable security definer set search_path = public
  as $$ select coalesce((select role from profiles where id = auth.uid()) in ('owner','empresa_admin'), false) $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table empresas  enable row level security;
alter table parceiros enable row level security;
alter table profiles  enable row level security;
alter table pacientes enable row level security;
alter table exames    enable row level security;
alter table qr_codes  enable row level security;

-- empresas: owner faz tudo; membro lê a própria
drop policy if exists empresas_owner_all on empresas;
create policy empresas_owner_all on empresas for all
  using (is_owner()) with check (is_owner());
drop policy if exists empresas_member_read on empresas;
create policy empresas_member_read on empresas for select
  using (id = auth_empresa_id());

-- parceiros: leitura pelos membros da empresa (escrita via service role no backend)
drop policy if exists parceiros_read on parceiros;
create policy parceiros_read on parceiros for select
  using (is_owner() or empresa_id = auth_empresa_id());

-- profiles: self + membros da mesma empresa (escrita via service role no backend)
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select
  using (is_owner() or id = auth.uid() or empresa_id = auth_empresa_id());

-- Regra de acesso operacional: empresa-level vê tudo da empresa; parceiro vê só o seu.
-- pacientes
drop policy if exists pacientes_rw on pacientes;
create policy pacientes_rw on pacientes for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())));

-- exames
drop policy if exists exames_rw on exames;
create policy exames_rw on exames for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())));

-- qr_codes (validação pública do scan será via service role no backend)
drop policy if exists qr_codes_rw on qr_codes;
create policy qr_codes_rw on qr_codes for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())));
