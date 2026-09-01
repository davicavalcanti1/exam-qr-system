-- Financeiro real (Frente A) — cobrança automática via Asaas.
--
-- Substitui o gancho nunca usado (cobrancas.asaas_id/asaas_url, comentado como
-- "futuro" desde a migration original) pelo schema desenhado em V2-DESIGN.md §4.
-- Nenhum código lia/escrevia asaas_id/asaas_url — seguro trocar.

alter table cobrancas drop column if exists asaas_id;
alter table cobrancas drop column if exists asaas_url;

alter table cobrancas add column if not exists gateway         text;   -- 'asaas' | null (fluxo manual, como hoje)
alter table cobrancas add column if not exists gateway_id      text;   -- id do payment no Asaas (pay_...)
alter table cobrancas add column if not exists link_pagamento  text;   -- invoiceUrl
alter table cobrancas add column if not exists pix_copia_cola  text;   -- payload do pixQrCode
alter table cobrancas add column if not exists meio_pagamento  text;   -- 'PIX' | 'BOLETO' | 'CREDIT_CARD' (do evento)
alter table cobrancas add column if not exists gateway_payload jsonb;  -- último webhook cru (auditoria, mesmo padrão do ZapSign)

create unique index if not exists idx_cobrancas_gateway_id
  on cobrancas(gateway_id) where gateway_id is not null;

-- Cache do cliente Asaas por parceiro — evita recriar a cada cobrança.
alter table parceiros add column if not exists asaas_customer_id text;

-- Mesma proteção que trg_contratos_protege já faz para o ZapSign (migration
-- 20260817120000_zapsign.sql): sem isto, o gestor clica "Marcar paga" pela tela
-- e pula o gateway inteiro — a integração vira teatro. Cancelar continua
-- permitido (não afirma nada sobre o pagamento). Cobranças sem gateway (empresa
-- não ligou o Asaas) continuam 100% manuais, sem qualquer restrição nova.
create or replace function cobrancas_protege_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if old.gateway = 'asaas'
     and new.status is distinct from old.status
     and new.status <> 'cancelada' then
    raise exception 'Esta cobrança é paga pelo Asaas — o status é atualizado pelo provedor.';
  end if;

  if old.status = 'paga' and new.status is distinct from 'paga' then
    raise exception 'Cobrança paga não muda de status.';
  end if;

  return new;
end
$$;

drop trigger if exists trg_cobrancas_protege on cobrancas;
create trigger trg_cobrancas_protege
  before update on cobrancas
  for each row execute function cobrancas_protege_update();

-- PostgREST guarda o schema em cache; sem isto as colunas novas só aparecem no
-- próximo restart e o frontend recebe "column does not exist".
notify pgrst, 'reload schema';
