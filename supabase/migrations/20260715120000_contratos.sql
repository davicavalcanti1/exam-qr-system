-- Módulo Contratos — parceria empresa ↔ parceiro, com assinatura eletrônica no
-- próprio sistema (aceite: nome + usuário + data/hora). ZapSign entra depois como
-- provedor plugável, sem quebrar este fluxo.

-- Modelo de contrato da empresa (um por empresa). Suporta placeholders:
--   {{parceiro_nome}} {{parceiro_cnpj}} {{teto}} {{empresa_nome}} {{empresa_cnpj}} {{data}}
create table if not exists contrato_modelos (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  titulo     text not null default 'Contrato de Parceria',
  conteudo   text not null default '',
  updated_at timestamptz not null default now()
);
alter table contrato_modelos enable row level security;
drop policy if exists contrato_modelos_read on contrato_modelos;
create policy contrato_modelos_read on contrato_modelos for select
  using (is_owner() or empresa_id = auth_empresa_id());
drop policy if exists contrato_modelos_write on contrato_modelos;
create policy contrato_modelos_write on contrato_modelos for all
  using (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()))
  with check (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));

create table if not exists contratos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  parceiro_id    uuid not null references parceiros(id) on delete cascade,
  titulo         text not null default 'Contrato de Parceria',
  conteudo       text not null,               -- snapshot do modelo preenchido
  status         text not null default 'pendente' check (status in ('pendente','assinado','cancelado')),
  assinante_nome text,                          -- nome digitado no aceite
  assinado_por   uuid references profiles(id),  -- quem assinou (coordenador)
  assinado_at    timestamptz,
  provedor       text not null default 'interno', -- 'interno' | 'zapsign' (futuro)
  criado_por     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists idx_contratos_empresa on contratos(empresa_id);
create index if not exists idx_contratos_parceiro on contratos(parceiro_id);

alter table contratos enable row level security;

-- empresa-level administra os contratos da empresa
drop policy if exists contratos_empresa_all on contratos;
create policy contratos_empresa_all on contratos for all
  using (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()))
  with check (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));

-- parceiro lê os seus contratos
drop policy if exists contratos_parceiro_read on contratos;
create policy contratos_parceiro_read on contratos for select
  using (parceiro_id = auth_parceiro_id());

-- coordenador do parceiro pode assinar (atualizar) o seu contrato
drop policy if exists contratos_parceiro_sign on contratos;
create policy contratos_parceiro_sign on contratos for update
  using (parceiro_id = auth_parceiro_id() and auth_role() = 'parceiro_coordenador')
  with check (parceiro_id = auth_parceiro_id());
