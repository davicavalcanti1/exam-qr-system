-- Cria o profile automaticamente quando nasce um usuário no Supabase Auth.
-- Regras:
--   • lê nome/username/role/empresa_id/parceiro_id de raw_user_meta_data (setados
--     pelo backend /api/admin/users);
--   • se ainda NÃO existe nenhum profile, o 1º usuário vira 'owner' (bootstrap);
--   • must_change_password = metadata, senão true (owner = false).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count   int;
  v_role    text;
  v_empresa uuid;
  v_parceiro uuid;
  v_nome    text;
  v_username text;
  v_must    boolean;
begin
  select count(*) into v_count from public.profiles;

  v_role := coalesce(new.raw_user_meta_data->>'role',
                     case when v_count = 0 then 'owner' else 'parceiro_funcionario' end);
  v_empresa  := nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid;
  v_parceiro := nullif(new.raw_user_meta_data->>'parceiro_id', '')::uuid;
  v_nome     := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));
  v_username := nullif(new.raw_user_meta_data->>'username', '');
  v_must     := coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, v_role <> 'owner');

  insert into public.profiles (id, nome, email, username, role, empresa_id, parceiro_id, must_change_password)
  values (new.id, v_nome, new.email, v_username, v_role, v_empresa, v_parceiro, v_must)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: usuário do Auth mais antigo que ainda não tem profile vira o owner.
insert into public.profiles (id, nome, email, role, must_change_password)
select u.id, split_part(u.email, '@', 1), u.email, 'owner', false
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at asc
limit 1;
