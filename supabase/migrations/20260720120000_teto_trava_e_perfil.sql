-- ExameQR — Trava de teto no banco (autorização) + edição do próprio perfil
--
-- 1) TRAVA DE TETO (server-side): impede autorizar um exame quando o parceiro já
--    atingiu o teto. Regra combinada: bloqueia só se o comprometido ANTES deste
--    exame já for >= teto (ex.: em 1999/2000 ainda deixa encaixar mais um; em
--    2000/2000 barra). "Comprometido" = exames autorizado/realizado que ainda não
--    foram pagos num lote (cobranca paga zera). Espelha a regra do frontend, mas
--    aqui não dá pra burlar pela API.

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
        v_comprometido, v_teto
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_teto on exames;
create trigger trg_check_teto
  before insert or update on exames
  for each row execute function public.check_teto_autorizacao();

-- 2) EDITAR PRÓPRIO NOME: profiles não tem policy de UPDATE (escrita da hierarquia
--    é via service role). Este RPC permite o usuário logado ajustar só o próprio nome.
create or replace function public.update_own_name(p_nome text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set nome = trim(p_nome)
   where id = auth.uid()
     and length(trim(p_nome)) > 0;
$$;
