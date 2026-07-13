-- ExameQR — Módulo 3: Cobrança por lote + recibo
-- Regra: só exames REALIZADOS (débito no scan) entram no lote, e cada exame
-- só pode ser faturado uma vez (exames.cobranca_id).

create table if not exists cobrancas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  parceiro_id    uuid not null references parceiros(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim    date not null,
  valor_total    numeric(12,2) not null default 0,
  qtd_exames     integer not null default 0,
  status         text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  -- gancho para o Asaas (futuro): id da cobrança no gateway, link, etc.
  asaas_id       text,
  asaas_url      text,
  criada_por     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  paga_at        timestamptz
);
create index if not exists idx_cobrancas_empresa on cobrancas(empresa_id);
create index if not exists idx_cobrancas_parceiro on cobrancas(parceiro_id);

-- momento em que o exame foi realizado (usado no recorte do período do lote)
alter table exames add column if not exists realizado_at timestamptz;
-- exame já faturado num lote (null = ainda aberto para cobrança)
alter table exames add column if not exists cobranca_id uuid references cobrancas(id) on delete set null;
create index if not exists idx_exames_cobranca on exames(cobranca_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table cobrancas enable row level security;

-- empresa-level administra os lotes da sua empresa; parceiro lê os seus.
drop policy if exists cobrancas_rw on cobrancas;
create policy cobrancas_rw on cobrancas for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_level() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));
