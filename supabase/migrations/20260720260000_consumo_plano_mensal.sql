-- ExameQR — Consumo: rótulo de plano por empresa + volume mensal de exames
--
-- 'plano' é só um rótulo comercial (não limita nada) definido pelo dono.
-- get_empresa_exames_mensal alimenta o gráfico de volume no detalhe da empresa.

alter table empresas add column if not exists plano text;

-- Recria o agregador incluindo o plano.
--
-- O `drop` antes do `create` nao e redundante: esta versao acrescenta a coluna
-- `plano` ao `returns table`, e isso MUDA O TIPO DE RETORNO da funcao. Postgres
-- recusa `create or replace` nesse caso:
--
--   ERROR: cannot change return type of existing function
--   HINT:  Use DROP FUNCTION public.get_empresa_uso() first.
--
-- Sem o drop, `supabase db push` aborta aqui — e aborta so em ambiente NOVO,
-- onde a versao de 20260720180000 acabou de ser criada. Em quem ja aplicou tudo,
-- esta migration esta registrada e nunca roda de novo, entao o erro fica
-- invisivel: o sintoma e "nao consigo criar ambiente nenhum", que no white-label
-- significa "nao consigo fazer onboarding de empresa nova".
--
-- `cascade` fica FORA de proposito: se algo depender desta funcao, e melhor o
-- push falhar dizendo o que depende do que apagar a dependencia em silencio.
drop function if exists public.get_empresa_uso();

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
