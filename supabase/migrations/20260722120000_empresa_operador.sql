-- ExameQR — novo papel "operador da clínica" (empresa_operador)
--
-- Acesso reduzido: cria/gerencia pacientes e exames (agenda) e gera links de
-- confirmação — mas NÃO acessa cobranças, contratos, catálogo (escrita), config
-- nem gestão de parceiros. Fica entre o empresa_admin e o parceiro.

-- 1) Permite o novo papel (role continua podendo ser null = sem acesso)
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role is null or role in ('owner','empresa_admin','empresa_operador','parceiro_coordenador','parceiro_funcionario'));

-- convites também pode conceder o papel
alter table convites drop constraint if exists convites_role_check;
alter table convites add constraint convites_role_check
  check (role in ('empresa_admin','empresa_operador','parceiro_coordenador','parceiro_funcionario'));

-- 2) Helper: nível operacional da empresa (owner/admin/operador).
-- Usado só nas tabelas operacionais (pacientes/exames/qr); cobranças/config seguem is_empresa_level.
create or replace function public.is_empresa_operacional()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role from profiles where id = auth.uid()) in ('owner','empresa_admin','empresa_operador'), false) $$;

-- 3) Recria as policies operacionais para incluir o operador
drop policy if exists pacientes_rw on pacientes;
create policy pacientes_rw on pacientes for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())));

drop policy if exists exames_rw on exames;
create policy exames_rw on exames for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())));

drop policy if exists qr_codes_rw on qr_codes;
create policy qr_codes_rw on qr_codes for all
  using (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())))
  with check (is_owner() or (empresa_id = auth_empresa_id() and (is_empresa_operacional() or parceiro_id = auth_parceiro_id())));
