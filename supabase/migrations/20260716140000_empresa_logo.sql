-- Logomarca por empresa (URL). Ex.: '/imago-logo.png' (arquivo do app) ou URL externa.
alter table empresas add column if not exists logo_url text;
