-- ExameQR — Fase 2: parametrização por empresa
--
-- Configurações operacionais que deixam de ser fixas no código: teto padrão de
-- novos parceiros, período padrão de cobrança e moeda. O dono edita direto
-- (já tem update em empresas); o admin da empresa edita a própria via RPC.

alter table empresas add column if not exists teto_padrao numeric(12,2) not null default 2000;
alter table empresas add column if not exists periodo_cobranca_dias int not null default 30;
alter table empresas add column if not exists moeda text not null default 'BRL';

-- Auto-serviço do admin da empresa: atualiza só as colunas de config da PRÓPRIA empresa.
create or replace function public.update_empresa_config(p_teto numeric, p_periodo int, p_moeda text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.empresas
     set teto_padrao = greatest(coalesce(p_teto, teto_padrao), 0),
         periodo_cobranca_dias = greatest(coalesce(p_periodo, periodo_cobranca_dias), 1),
         moeda = coalesce(nullif(trim(p_moeda), ''), moeda)
   where id = public.auth_empresa_id() and public.is_empresa_level();
$$;
