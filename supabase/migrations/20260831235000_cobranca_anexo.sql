-- ExameQR — Anexo na cobrança (boleto/fatura/comprovante)
--
-- A clínica pode anexar um arquivo ao fechar o lote de cobrança; o parceiro
-- vê e baixa o anexo na lista "Suas cobranças". Uma cobrança carrega no
-- máximo um anexo (colunas na própria linha, sem tabela satélite).
--
-- Bucket PRIVADO 'cobrancas', com leitura via URL assinada de curta duração
-- criada pelo próprio navegador (a storage-api aplica a policy de SELECT ao
-- assinar). Convenção de caminho, amarrada nas policies:
--   <empresa_id>/<parceiro_id>/<cobranca_id>/<arquivo>
-- Nota: o parceiro compartilha o empresa_id da clínica (mesmo desenho do
-- bucket 'logos'), então a pasta [1] confere para os dois lados; o que
-- separa o parceiro é a pasta [2].

alter table public.cobrancas add column if not exists anexo_path text;
alter table public.cobrancas add column if not exists anexo_nome text;

insert into storage.buckets (id, name, public)
values ('cobrancas', 'cobrancas', false)
on conflict (id) do nothing;

-- Escrita: só a equipe da clínica (empresa-level), na pasta da própria empresa.
drop policy if exists "cobrancas_anexo_insert" on storage.objects;
create policy "cobrancas_anexo_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cobrancas' and (
      is_owner()
      or (is_empresa_level() and (storage.foldername(name))[1] = auth_empresa_id()::text)
    )
  );

-- Leitura: a equipe da clínica lê tudo da empresa; o parceiro só a pasta dele.
drop policy if exists "cobrancas_anexo_select" on storage.objects;
create policy "cobrancas_anexo_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'cobrancas' and (
      is_owner()
      or (
        (storage.foldername(name))[1] = auth_empresa_id()::text
        and (is_empresa_level() or (storage.foldername(name))[2] = auth_parceiro_id()::text)
      )
    )
  );

-- Remoção: só a equipe da clínica (troca de anexo) — parceiro nunca apaga.
drop policy if exists "cobrancas_anexo_delete" on storage.objects;
create policy "cobrancas_anexo_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'cobrancas' and (
      is_owner()
      or (is_empresa_level() and (storage.foldername(name))[1] = auth_empresa_id()::text)
    )
  );

-- PostgREST cacheia o schema; sem isto as colunas novas de `cobrancas` só
-- aparecem no próximo restart e o frontend recebe "column does not exist".
notify pgrst, 'reload schema';
