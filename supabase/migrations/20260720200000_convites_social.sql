-- ExameQR — Fase 3: convite por e-mail + login social (Google)
--
-- Fluxo: um admin convida por e-mail (define papel/empresa/parceiro). A pessoa
-- entra com Google usando esse mesmo e-mail; o gatilho vincula o convite e concede
-- o papel. Quem NÃO tem convite entra sem papel ('sem acesso'). O caminho antigo
-- (usuário/senha criado pelo backend, com metadata) continua funcionando igual.

-- role passa a ser opcional: null = conta sem acesso (aguardando convite/liberação)
alter table profiles alter column role drop not null;

create table if not exists convites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  nome         text,
  role         text not null check (role in ('empresa_admin','parceiro_coordenador','parceiro_funcionario')),
  empresa_id   uuid references empresas(id) on delete cascade,
  parceiro_id  uuid references parceiros(id) on delete set null,
  convidado_por uuid references profiles(id),
  usado_at     timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_convites_email on convites (lower(email));

alter table convites enable row level security;

-- Quem enxerga/gerencia convites: owner (tudo), empresa-level (da sua empresa),
-- coordenador do parceiro (os do seu parceiro).
drop policy if exists convites_read on convites;
create policy convites_read on convites for select
  using (is_owner()
      or (empresa_id = auth_empresa_id() and is_empresa_level())
      or (parceiro_id = auth_parceiro_id() and auth_role() = 'parceiro_coordenador'));

drop policy if exists convites_insert on convites;
create policy convites_insert on convites for insert
  with check (is_owner()
      or (empresa_id = auth_empresa_id() and is_empresa_level())
      or (parceiro_id = auth_parceiro_id() and auth_role() = 'parceiro_coordenador'));

drop policy if exists convites_delete on convites;
create policy convites_delete on convites for delete
  using (is_owner()
      or (empresa_id = auth_empresa_id() and is_empresa_level())
      or (parceiro_id = auth_parceiro_id() and auth_role() = 'parceiro_coordenador'));

-- Gatilho: cria o profile ao nascer o usuário no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count    int;
  v_role     text;
  v_empresa  uuid;
  v_parceiro uuid;
  v_nome     text;
  v_username text;
  v_must     boolean;
  v_conv     public.convites%rowtype;
begin
  select count(*) into v_count from public.profiles;
  v_role := new.raw_user_meta_data->>'role';

  if v_role is not null then
    -- Caminho antigo: usuário criado pelo backend com metadata completo.
    v_empresa  := nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid;
    v_parceiro := nullif(new.raw_user_meta_data->>'parceiro_id', '')::uuid;
    v_nome     := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));
    v_username := nullif(new.raw_user_meta_data->>'username', '');
    v_must     := coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, true);

  elsif v_count = 0 then
    -- Bootstrap: primeiro usuário do sistema vira owner.
    v_role := 'owner'; v_must := false;
    v_nome := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));

  else
    -- Login social/self-signup: tenta vincular a um convite pelo e-mail.
    select * into v_conv from public.convites
      where lower(email) = lower(new.email) and usado_at is null
      order by created_at desc limit 1;

    if found then
      v_role := v_conv.role; v_empresa := v_conv.empresa_id; v_parceiro := v_conv.parceiro_id;
      v_nome := coalesce(v_conv.nome, new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
      v_must := false;
      update public.convites set usado_at = now() where id = v_conv.id;
    else
      -- Sem convite: conta sem acesso (role null). Não enxerga nada.
      v_role := null;
      v_nome := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
      v_must := false;
    end if;
  end if;

  insert into public.profiles (id, nome, email, username, role, empresa_id, parceiro_id, must_change_password)
  values (new.id, v_nome, new.email, v_username, v_role, v_empresa, v_parceiro, coalesce(v_must, false))
  on conflict (id) do nothing;

  return new;
end $$;
