-- Dados de empresa/parceiro enriquecidos via CNPJ (BrasilAPI).
-- `nome` continua sendo a razão social. Adicionamos os complementares.

alter table empresas  add column if not exists nome_fantasia text;
alter table empresas  add column if not exists endereco      text;
alter table empresas  add column if not exists telefone      text;
alter table empresas  add column if not exists email         text;

alter table parceiros add column if not exists nome_fantasia text;
alter table parceiros add column if not exists endereco      text;
alter table parceiros add column if not exists telefone      text;
alter table parceiros add column if not exists email         text;
