-- ExameQR — parceiro pode ser CNPJ (PJ) ou CPF (PF).
-- Documento genérico + tipo. (A coluna antiga `cnpj` fica como legado; novos usam estes.)
alter table parceiros add column if not exists tipo_documento text check (tipo_documento in ('cnpj', 'cpf'));
alter table parceiros add column if not exists documento text;
