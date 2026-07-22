-- ExameQR — permitir excluir usuários sem quebrar histórico.
-- As colunas que apontam "quem fez" (criado_por, autorizado_por, etc.) referenciam
-- profiles(id) com NO ACTION → bloqueiam a exclusão de quem já criou registros.
-- Trocamos para ON DELETE SET NULL: o registro fica, só perde o vínculo com o autor.
-- Robusto: pula tabela/coluna que ainda não existir.

do $$
declare
  r record;
begin
  for r in
    select 'exames' t, 'criado_por' c union all
    select 'exames', 'autorizado_por' union all
    select 'cobrancas', 'criada_por' union all
    select 'contratos', 'assinado_por' union all
    select 'contratos', 'criado_por' union all
    select 'audit_log', 'ator_id' union all
    select 'integracao_configs', 'updated_by' union all
    select 'autorizacao_lotes', 'criado_por' union all
    select 'autorizacao_lotes', 'confirmado_por' union all
    select 'convites', 'convidado_por' union all
    select 'dpa_aceites', 'aceito_por'
  loop
    if to_regclass('public.' || r.t) is null then continue; end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.t and column_name = r.c
    ) then continue; end if;

    execute format('alter table public.%I drop constraint if exists %I', r.t, r.t || '_' || r.c || '_fkey');
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',
                   r.t, r.t || '_' || r.c || '_fkey', r.c);
  end loop;
end $$;
