-- ExameQR — Autorização em lote por link público (fluxo IMAGO agenda → parceiro confirma)
--
-- Funcionário da empresa agenda vários exames; agrupa num LOTE com token público;
-- o parceiro abre o link, faz login e confirma tudo de uma vez. Neste fluxo o teto
-- é IGNORADO (decisão do produto) — a trava continua valendo na autorização normal.

alter table parceiros add column if not exists whatsapp text;

create table if not exists autorizacao_lotes (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  parceiro_id   uuid not null references parceiros(id) on delete cascade,
  token         text not null unique,
  status        text not null default 'pendente' check (status in ('pendente','confirmado','cancelado')),
  criado_por    uuid references profiles(id),
  confirmado_por uuid references profiles(id),
  confirmado_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_lotes_empresa on autorizacao_lotes(empresa_id);
create index if not exists idx_lotes_parceiro on autorizacao_lotes(parceiro_id);

alter table exames add column if not exists autorizacao_lote_id uuid references autorizacao_lotes(id) on delete set null;
create index if not exists idx_exames_lote on exames(autorizacao_lote_id);

alter table autorizacao_lotes enable row level security;
drop policy if exists lotes_empresa on autorizacao_lotes;
create policy lotes_empresa on autorizacao_lotes for all
  using (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()))
  with check (is_owner() or (empresa_id = auth_empresa_id() and is_empresa_level()));
drop policy if exists lotes_parceiro_read on autorizacao_lotes;
create policy lotes_parceiro_read on autorizacao_lotes for select
  using (parceiro_id = auth_parceiro_id());

-- Trigger do teto passa a respeitar um "escape" por transação (usado só no confirmar-lote).
create or replace function public.check_teto_autorizacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teto         numeric(12,2);
  v_comprometido numeric(12,2);
begin
  -- fluxo do link público pede pra ignorar o teto
  if current_setting('exameqr.skip_teto', true) = 'on' then
    return new;
  end if;

  if new.status = 'autorizado'
     and (tg_op = 'INSERT' or old.status is distinct from 'autorizado') then
    select teto into v_teto from parceiros where id = new.parceiro_id;
    select coalesce(sum(e.valor), 0) into v_comprometido
      from exames e
      left join cobrancas c on c.id = e.cobranca_id
      where e.parceiro_id = new.parceiro_id
        and e.id <> new.id
        and e.status in ('autorizado', 'realizado')
        and coalesce(c.status, '') <> 'paga';
    if v_comprometido >= coalesce(v_teto, 0) then
      raise exception 'Teto do parceiro atingido (R$ % de R$ %). Feche e receba o lote para liberar mais autorizações.',
        v_comprometido, v_teto using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

-- Confirmação do lote pelo parceiro (logado). Valida que o caller é o coordenador
-- daquele parceiro, ignora o teto e autoriza todos os exames pendentes do lote.
create or replace function public.confirmar_lote_autorizacao(p_token text)
returns table (autorizados int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote autorizacao_lotes%rowtype;
  v_n int;
begin
  select * into v_lote from autorizacao_lotes where token = p_token;
  if not found then raise exception 'Lote não encontrado' using errcode = 'no_data_found'; end if;
  if v_lote.status = 'confirmado' then raise exception 'Este lote já foi confirmado'; end if;

  -- só o coordenador do parceiro do lote pode confirmar
  if not (auth_role() = 'parceiro_coordenador' and auth_parceiro_id() = v_lote.parceiro_id) then
    raise exception 'Sem permissão para confirmar este lote' using errcode = 'insufficient_privilege';
  end if;

  perform set_config('exameqr.skip_teto', 'on', true); -- ignora o teto só nesta transação

  update exames set status = 'autorizado', autorizado_por = auth.uid()
   where autorizacao_lote_id = v_lote.id and status = 'aguardando_autorizacao';
  get diagnostics v_n = row_count;

  update autorizacao_lotes set status = 'confirmado', confirmado_por = auth.uid(), confirmado_at = now()
   where id = v_lote.id;

  return query select v_n;
end $$;
