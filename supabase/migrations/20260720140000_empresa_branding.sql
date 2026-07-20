-- ExameQR — White-label Fase 1: identidade visual por empresa
--
-- Cada empresa passa a ter um "nome de exibição" (a marca que aparece pro tenant,
-- caso queira algo diferente da razão social) além da logo. Dentro do workspace e
-- nos documentos passa a valer a marca DA EMPRESA (rebrand total).

alter table empresas add column if not exists nome_exibicao text;

-- ── Storage: bucket público para as logos das empresas ───────────────────────
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- leitura pública (a logo aparece no login/documentos sem auth)
drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

-- escrita restrita a usuários autenticados (só admins chegam na UI de upload)
drop policy if exists "logos_auth_insert" on storage.objects;
create policy "logos_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos');

drop policy if exists "logos_auth_update" on storage.objects;
create policy "logos_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'logos');

drop policy if exists "logos_auth_delete" on storage.objects;
create policy "logos_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'logos');
