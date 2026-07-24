-- Endurecimento de RLS (auditoria de políticas, 24/jul/2026)
--   (1) profiles_read: não vazar perfis entre parceiros da mesma clínica.
--   (2) bucket 'logos': escrita/edição/remoção só na pasta do próprio tenant
--       (antes qualquer usuário autenticado podia sobrescrever/apagar o logo de qualquer um).
-- Observação: usa DROP POLICY IF EXISTS + CREATE POLICY (PG não aceita IF NOT EXISTS em policy).

-- ── (1) profiles ──────────────────────────────────────────────────────────────
-- Regra: dono vê tudo; todos veem a si; equipe da clínica (sem parceiro_id) vê a
-- empresa; usuário de parceiro vê SÓ o próprio parceiro (não a clínica nem outros parceiros).
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select
  using (
    is_owner()
    or id = auth.uid()
    or (auth_parceiro_id() is null and empresa_id = auth_empresa_id())
    or (auth_parceiro_id() is not null and parceiro_id = auth_parceiro_id())
  );

-- ── (2) storage.objects — bucket 'logos' ─────────────────────────────────────
-- Leitura pública mantida (logos aparecem na UI/PDF). Escrita amarrada à pasta:
--   empresa  => '<empresa_id>/...'         (só equipe da clínica, sem parceiro_id)
--   parceiro => 'parceiro/<parceiro_id>/...'(só o próprio parceiro)
--   dono     => qualquer pasta do bucket
-- Nota: o parceiro compartilha o empresa_id da clínica, por isso o ramo da empresa
--       exige auth_parceiro_id() IS NULL — senão o parceiro sobrescreveria o logo da clínica.

drop policy if exists "logos_auth_insert" on storage.objects;
create policy "logos_auth_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos' and (
      is_owner()
      or (auth_parceiro_id() is null and (storage.foldername(name))[1] = auth_empresa_id()::text)
      or (auth_parceiro_id() is not null and (storage.foldername(name))[1] = 'parceiro' and (storage.foldername(name))[2] = auth_parceiro_id()::text)
    )
  );

drop policy if exists "logos_auth_update" on storage.objects;
create policy "logos_auth_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'logos' and (
      is_owner()
      or (auth_parceiro_id() is null and (storage.foldername(name))[1] = auth_empresa_id()::text)
      or (auth_parceiro_id() is not null and (storage.foldername(name))[1] = 'parceiro' and (storage.foldername(name))[2] = auth_parceiro_id()::text)
    )
  );

drop policy if exists "logos_auth_delete" on storage.objects;
create policy "logos_auth_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos' and (
      is_owner()
      or (auth_parceiro_id() is null and (storage.foldername(name))[1] = auth_empresa_id()::text)
      or (auth_parceiro_id() is not null and (storage.foldername(name))[1] = 'parceiro' and (storage.foldername(name))[2] = auth_parceiro_id()::text)
    )
  );
