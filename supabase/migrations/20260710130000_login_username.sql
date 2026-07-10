-- Login por usuário (nome.sobrenome) + troca de senha no 1º acesso.
-- O Supabase Auth é por e-mail; usamos um e-mail sintético "<username>@exameqr.app".
-- username é único GLOBALMENTE (resolve colisão entre empresas no cadastro).

alter table profiles add column if not exists username text;
create unique index if not exists uq_profiles_username on profiles(username);

alter table profiles add column if not exists must_change_password boolean not null default true;

-- slug da empresa (uso futuro: subdomínio/exibição)
alter table empresas add column if not exists slug text;
create unique index if not exists uq_empresas_slug on empresas(slug);

-- RPC seguro: o usuário marca a própria senha como trocada (sem poder editar role).
create or replace function public.mark_password_changed() returns void
  language sql security definer set search_path = public
  as $$ update profiles set must_change_password = false where id = auth.uid() $$;
grant execute on function public.mark_password_changed() to authenticated;
