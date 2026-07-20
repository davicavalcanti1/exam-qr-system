-- ExameQR — Medição de uso por empresa (base de COGS/precificação e escala)
--
-- Uma função agregadora que o DONO consulta para ver o consumo de cada empresa.
-- SECURITY DEFINER (bypassa RLS p/ contar tudo), mas o WHERE is_owner() garante
-- que só o owner recebe linhas — qualquer outro papel recebe vazio.

create or replace function public.get_empresa_uso()
returns table (
  empresa_id        uuid,
  nome              text,
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
