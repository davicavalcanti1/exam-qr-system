-- ExameQR v2 — Emissão de NFS-e (nota de serviço) no Financeiro da clínica.
--
-- A clínica (prestador) emite a NFS-e contra o parceiro (tomador) no fechamento
-- do lote de cobrança. A emissão é via PROVEDOR de NFS-e (Focus NFe — Campina
-- Grande/PB já homologada; provedor municipal WebISS, padrão ABRASF). A Animatti
-- NÃO emite (só consulta/associa), por isso a nota vive fora do NetRis.
--
-- ADITIVO E DORMENTE: nada aqui muda o comportamento da v1. A emissão só "acende"
-- quando a empresa liga `nfse_ativo` e preenche os dados fiscais + o token da Focus
-- (que vai em integracao_configs, service role — NÃO nesta tabela).
--
-- Cancelamento em Campina Grande/PB não é feito por API (só portal WebISS): o
-- status 'cancelada' aqui é apenas registro; o cancelamento em si é manual.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Config fiscal do PRESTADOR (não-secreta) — mora em empresas.
--    Os valores reais vêm do contador da clínica; ficam em branco até lá.
-- ─────────────────────────────────────────────────────────────────────────────
alter table empresas add column if not exists nfse_ativo               boolean not null default false;
alter table empresas add column if not exists nfse_provedor            text    not null default 'focusnfe';
alter table empresas add column if not exists nfse_ambiente            text    not null default 'homologacao'
  check (nfse_ambiente in ('homologacao', 'producao'));
alter table empresas add column if not exists nfse_inscricao_municipal text;
alter table empresas add column if not exists nfse_codigo_municipio    text;   -- IBGE (Campina Grande/PB = 2504009)
alter table empresas add column if not exists nfse_item_lista_servico  text;   -- código LC 116/2003
alter table empresas add column if not exists nfse_codigo_tributario   text;
alter table empresas add column if not exists nfse_cnae                text;
alter table empresas add column if not exists nfse_aliquota_iss        numeric(5,2);
alter table empresas add column if not exists nfse_iss_retido          boolean not null default false;

-- Auto-serviço do admin da empresa: edita só a config fiscal da PRÓPRIA empresa.
-- (Espelha update_empresa_config; o token da Focus NÃO passa por aqui.)
create or replace function public.update_empresa_fiscal(
  p_ativo               boolean,
  p_ambiente            text,
  p_inscricao_municipal text,
  p_codigo_municipio    text,
  p_item_lista_servico  text,
  p_codigo_tributario   text,
  p_cnae                text,
  p_aliquota_iss        numeric,
  p_iss_retido          boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.empresas
     set nfse_ativo               = coalesce(p_ativo, nfse_ativo),
         nfse_ambiente            = coalesce(nullif(trim(p_ambiente), ''), nfse_ambiente),
         nfse_inscricao_municipal = nullif(trim(p_inscricao_municipal), ''),
         nfse_codigo_municipio    = nullif(trim(p_codigo_municipio), ''),
         nfse_item_lista_servico  = nullif(trim(p_item_lista_servico), ''),
         nfse_codigo_tributario   = nullif(trim(p_codigo_tributario), ''),
         nfse_cnae                = nullif(trim(p_cnae), ''),
         nfse_aliquota_iss        = p_aliquota_iss,
         nfse_iss_retido          = coalesce(p_iss_retido, nfse_iss_retido)
   where id = public.auth_empresa_id() and public.is_empresa_level();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Notas fiscais emitidas — 1 por lote de cobrança (idempotente pela ref).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists notas_fiscais (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  cobranca_id  uuid references cobrancas(id) on delete set null,
  provedor     text not null default 'focusnfe',
  ref          text not null unique,                 -- ex.: 'cobranca:{id}' (idempotência)
  status       text not null default 'processando'
    check (status in ('processando', 'autorizada', 'erro', 'cancelada')),
  numero       text,
  url_pdf      text,                                 -- DANFSE (PDF)
  url_xml      text,
  valor        numeric(12,2),
  erro_msg     text,
  payload      jsonb,                                -- último retorno cru do provedor (auditoria)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_nf_empresa  on notas_fiscais(empresa_id);
create index if not exists idx_nf_cobranca on notas_fiscais(cobranca_id);

-- RLS: leitura pela própria empresa (e dono). Escrita é só service role
-- (o backend emite/atualiza com o token da Focus; webhook grava o resultado) —
-- sem policy de INSERT/UPDATE, igual ao padrão da hierarquia.
alter table notas_fiscais enable row level security;
drop policy if exists nf_empresa_read on notas_fiscais;
create policy nf_empresa_read on notas_fiscais for select
  using (public.is_owner() or (empresa_id = public.auth_empresa_id() and public.is_empresa_level()));

-- Mantém updated_at coerente em alterações do backend.
create or replace function public.touch_notas_fiscais()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_nf on notas_fiscais;
create trigger trg_touch_nf
  before update on notas_fiscais
  for each row execute function public.touch_notas_fiscais();
