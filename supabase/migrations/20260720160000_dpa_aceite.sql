-- ExameQR — LGPD: aceite eletrônico do DPA (Termo de Tratamento de Dados)
--
-- Relação Operador (ExameQR) ↔ Controladora (empresa contratante). O admin da
-- empresa aceita o DPA no primeiro acesso; guardamos o snapshot do texto, a versão,
-- quem aceitou e quando (mesmo padrão de assinatura eletrônica dos contratos).

create table if not exists dpa_aceites (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  versao            text not null,
  conteudo_snapshot text not null,
  assinante_nome    text not null,
  aceito_por        uuid references profiles(id),
  aceito_at         timestamptz not null default now()
);
create index if not exists idx_dpa_aceites_empresa on dpa_aceites(empresa_id);

alter table dpa_aceites enable row level security;

-- owner vê tudo; empresa-level vê/insere o aceite da própria empresa
drop policy if exists dpa_aceites_read on dpa_aceites;
create policy dpa_aceites_read on dpa_aceites for select
  using (is_owner() or empresa_id = auth_empresa_id());

drop policy if exists dpa_aceites_insert on dpa_aceites;
create policy dpa_aceites_insert on dpa_aceites for insert
  with check (empresa_id = auth_empresa_id() and is_empresa_level());
