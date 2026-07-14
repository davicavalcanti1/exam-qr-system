-- ExameQR — Módulo 5: Integrações de agendamento plugáveis por empresa
-- Cada empresa escolhe o método de marcação de exame (manual, netris, ...).
-- A seleção fica em empresas.agendamento_provider (lível pelo frontend);
-- as CREDENCIAIS ficam em integracao_configs, acessível SÓ via service role
-- no backend (RLS ligado, sem policies = frontend nunca lê o token).

alter table empresas
  add column if not exists agendamento_provider text not null default 'manual';

create table if not exists integracao_configs (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  provider   text not null default 'manual',
  config     jsonb not null default '{}'::jsonb,
  ativo      boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- RLS ligado e SEM policies: apenas o service role (backend) acessa.
alter table integracao_configs enable row level security;
