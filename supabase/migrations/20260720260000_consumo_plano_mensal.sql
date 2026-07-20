-- ExameQR — Consumo: rótulo de plano por empresa + volume mensal de exames
--
-- 'plano' é só um rótulo comercial (não limita nada) definido pelo dono.
-- get_empresa_exames_mensal alimenta o gráfico de volume no detalhe da empresa.

alter table empresas add column if not exists plano text;

-- Recria o agregador incluindo o plano.
create or replace function public.get_empresa_uso()
returns table (
  empresa_id        uuid,
  nome              text,
  plano             text,
  parceiros         bigint,
  parceiros_ativos  bigint,
  usuarios          bigint,
  usuarios_ativos   bigint,
  pacientes         bigint,
  exames            bigint,
  exames_30d        bigint,
  exames_realizados bigint,
  cobrancas         bigint,
  faturado          numeric,
  qr_codes          bigint,
  contratos         bigint,
  storage_bytes     bigint,
  ultimo_exame_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.nome,
    e.plano,
    (select count(*) from parceiros p  where p.empresa_id = e.id),
    (select count(*) from parceiros p  where p.empresa_id = e.id and p.status = 'ativo'),
    (select count(*) from profiles pr  where pr.empresa_id = e.id),
    (select count(*) from profiles pr  where pr.empresa_id = e.id and pr.ativo),
    (select count(*) from pacientes pa where pa.empresa_id = e.id),
    (select count(*) from exames ex    where ex.empresa_id = e.id),
    (select count(*) from exames ex    where ex.empresa_id = e.id and ex.created_at >= now() - interval '30 days'),
    (select count(*) from exames ex    where ex.empresa_id = e.id and ex.status = 'realizado'),
    (select count(*) from cobrancas c  where c.empresa_id = e.id),
    coalesce((select sum(c.valor_total) from cobrancas c where c.empresa_id = e.id and c.status = 'paga'), 0),
    (select count(*) from qr_codes q   where q.empresa_id = e.id),
    (select count(*) from contratos ct where ct.empresa_id = e.id),
    coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o
              where o.bucket_id = 'logos' and o.name like e.id::text || '/%'), 0),
    (select max(ex.created_at) from exames ex where ex.empresa_id = e.id)
  from empresas e
  where public.is_owner()
  order by e.nome;
$$;

-- Volume mensal de exames (últimos 12 meses) de uma empresa — só o dono.
create or replace function public.get_empresa_exames_mensal(p_empresa_id uuid)
returns table (mes date, qtd bigint, faturado numeric)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('month', ex.created_at)::date as mes,
    count(*) as qtd,
    coalesce(sum(ex.valor) filter (where ex.status = 'realizado'), 0) as faturado
  from exames ex
  where ex.empresa_id = p_empresa_id
    and public.is_owner()
    and ex.created_at >= date_trunc('month', now()) - interval '11 months'
  group by 1
  order by 1;
$$;
