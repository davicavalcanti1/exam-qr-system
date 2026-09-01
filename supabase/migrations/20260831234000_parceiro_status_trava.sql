-- ExameQR — Bloquear/Suspender parceiro passa a ter efeito
--
-- O campo parceiros.status ('ativo'|'bloqueado'|'suspenso') existia desde a
-- migration inicial e a UI editava, mas NADA no sistema o consultava: um
-- parceiro "bloqueado" continuava entrando, cadastrando pacientes e
-- autorizando exames. Era um controle puramente decorativo.
--
-- Duas defesas, no mesmo desenho da trava de teto (20260720120000):
--   1. Frontend: o Painel não abre para usuário de parceiro não-ativo
--      (ParceiroBloqueado em Painel.jsx) — resolve a experiência.
--   2. Este trigger — resolve a garantia: mesmo por fora da UI, parceiro
--      não-ativo não cria exame novo nem autoriza exame existente.
--
-- O que NÃO é barrado, de propósito: a transição para 'realizado' (o scan).
-- Exame já autorizado gerou QR que o paciente carrega; bloquear o parceiro
-- não pode negar o exame de quem já está com a autorização na mão.

create or replace function public.check_parceiro_ativo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if tg_op = 'INSERT'
     or (new.status = 'autorizado' and old.status is distinct from 'autorizado') then

    select status into v_status from parceiros where id = new.parceiro_id;

    if coalesce(v_status, 'ativo') <> 'ativo' then
      raise exception 'Parceiro % — novas autorizações estão travadas. Contate a clínica.',
        case when v_status = 'suspenso' then 'suspenso' else 'bloqueado' end
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_parceiro_ativo on exames;
create trigger trg_check_parceiro_ativo
  before insert or update on exames
  for each row execute function public.check_parceiro_ativo();
