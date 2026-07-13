-- Catálogo de exames/preços por empresa principal.
create table if not exists procedimentos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id) on delete cascade,
  nome                  text not null,
  valor                 numeric(12,2) not null default 0,
  ativo                 boolean not null default true,
  netris_procedimento_id text,           -- mapeamento futuro com o NetRis
  created_at            timestamptz not null default now()
);
create index if not exists idx_procedimentos_empresa on procedimentos(empresa_id);

-- vínculo opcional do exame com o item do catálogo (útil pro NetRis depois)
alter table exames add column if not exists procedimento_id uuid references procedimentos(id);

alter table procedimentos enable row level security;

-- leitura: qualquer membro da empresa (coordenador/funcionário precisam ler pra montar o pedido)
drop policy if exists procedimentos_read on procedimentos;
create policy procedimentos_read on procedimentos for select
  using (is_owner() or empresa_id = auth_empresa_id());

-- escrita: só nível-empresa (owner / empresa_admin)
drop policy if exists procedimentos_write on procedimentos;
create policy procedimentos_write on procedimentos for all
  using (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()))
  with check (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));
