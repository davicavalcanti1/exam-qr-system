-- Item 4 (LGPD) + Item 5 (Auditoria)

-- LGPD: consentimento do paciente para uso de dados de saúde.
alter table pacientes add column if not exists consentimento_lgpd boolean not null default false;
alter table pacientes add column if not exists consentimento_at   timestamptz;

-- Auditoria: trilha de ações sensíveis (clínicas e financeiras).
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid references empresas(id) on delete cascade,
  ator_id     uuid references profiles(id),
  ator_nome   text,
  acao        text not null,      -- ex.: 'exame.autorizado', 'qr.validado', 'contrato.assinado'
  entidade    text,               -- ex.: 'exame', 'cobranca', 'contrato'
  entidade_id uuid,
  detalhe     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_empresa on audit_log(empresa_id, created_at desc);

alter table audit_log enable row level security;

-- leitura: só nível-empresa (owner vê tudo; admin vê a sua empresa)
drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select
  using (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));

-- inserção: qualquer membro registra ação da própria empresa (service role bypassa)
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert
  with check (is_owner() or empresa_id = auth_empresa_id());
