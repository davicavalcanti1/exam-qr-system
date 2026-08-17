-- ExameQR — Integração ZapSign: assinatura eletrônica com autenticação do signatário
--
-- Hoje "assinar" é digitar o nome e marcar um checkbox: `contratos.assinante_nome`
-- + `assinado_at`, gravados pelo próprio navegador sob RLS. Isso é aceite, não
-- assinatura — não há autenticação de quem assinou nem trilha probatória, e a
-- policy `contratos_parceiro_sign` ainda deixa o coordenador reescrever o texto
-- que ele mesmo assinou.
--
-- Com o ZapSign ligado, o signatário recebe um link por e-mail, confirma um
-- código (auth_mode tokenEmail) e assina; o PDF que volta é o assinado, com o log
-- de auditoria do provedor. Com ele desligado, o aceite interno continua valendo
-- — a clínica não fica sem fechar parceria porque uma integração caiu.
--
-- A configuração reaproveita `integracao_configs`, a mesma tabela do NetRis: RLS
-- ligada e nenhuma policy, então o token só existe para o service_role e o
-- navegador nunca o vê.

-- ── 1. Segredo do webhook, por empresa ───────────────────────────────────────
-- O ZapSign avisa a conclusão por webhook e a documentação dele não descreve
-- assinatura do payload. Sem um segredo, qualquer um que descubra a URL marca
-- contrato como assinado. O segredo vai no caminho da URL, é gerado aqui e nunca
-- é digitado por gente. É também a chave que identifica a empresa: buscar por ele
-- é o que impede o segredo de uma clínica de autenticar o webhook de outra.

alter table integracao_configs
  add column if not exists webhook_segredo text;

update integracao_configs
   set webhook_segredo = replace(gen_random_uuid()::text, '-', '')
 where webhook_segredo is null;

alter table integracao_configs
  alter column webhook_segredo set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists idx_integracao_configs_webhook_segredo
  on integracao_configs(webhook_segredo);

-- ── 2. contratos: acompanhar a assinatura em curso ───────────────────────────
-- `provedor` já existia com default 'interno' (migration 20260715120000, que já
-- previa o ZapSign). Aqui entram as colunas que faltavam para conduzir o fluxo.

alter table contratos
  add column if not exists externo_token    text,          -- id do documento no ZapSign
  add column if not exists sign_url         text,          -- link que o signatário abre
  add column if not exists arquivo_path     text,          -- PDF assinado no bucket 'assinaturas'
  add column if not exists hash_sha256      text,          -- integridade do arquivo que guardamos
  add column if not exists signatario_email text,          -- para onde o link foi
  add column if not exists enviado_at       timestamptz,
  add column if not exists recusado_motivo  text;

create index if not exists idx_contratos_externo
  on contratos(externo_token) where externo_token is not null;

-- O ciclo ganha os estados que só existem quando quem assina é um provedor.
alter table contratos drop constraint if exists contratos_status_check;
alter table contratos add constraint contratos_status_check
  check (status in ('pendente', 'assinado', 'cancelado', 'recusado', 'expirado'));

-- ── 3. dpa_aceites: a linha passa a poder nascer pendente ────────────────────
-- Até aqui a linha só existia DEPOIS do aceite (o insert era o aceite). Com o
-- ZapSign ela nasce quando o documento é enviado e só vira 'assinado' no webhook.

alter table dpa_aceites
  add column if not exists status           text not null default 'assinado',
  add column if not exists provedor         text not null default 'interno',
  add column if not exists externo_token    text,
  add column if not exists sign_url         text,
  add column if not exists arquivo_path     text,
  add column if not exists hash_sha256      text,
  add column if not exists signatario_email text,
  add column if not exists enviado_at       timestamptz,
  add column if not exists recusado_motivo  text;

-- Linhas antigas são aceites consumados: o default 'assinado' já as classifica.
-- As duas colunas abaixo eram obrigatórias porque só se registrava aceite pronto.
alter table dpa_aceites alter column assinante_nome drop not null;
alter table dpa_aceites alter column aceito_at      drop not null;

alter table dpa_aceites drop constraint if exists dpa_aceites_status_check;
alter table dpa_aceites add constraint dpa_aceites_status_check
  check (status in ('pendente', 'assinado', 'recusado', 'expirado'));

create index if not exists idx_dpa_aceites_externo
  on dpa_aceites(externo_token) where externo_token is not null;

-- O painel libera a empresa quando existe aceite da versão corrente. Com linhas
-- pendentes passando a existir, o índice que serve essa consulta precisa do
-- status junto — senão "enviei para assinar" já contaria como "aceitou".
create index if not exists idx_dpa_aceites_empresa_versao_status
  on dpa_aceites(empresa_id, versao, status);

-- ── 4. A assinatura deixa de ser reescrevível ────────────────────────────────
-- Sem isto o ZapSign é teatro: `contratos_parceiro_sign` é um UPDATE amplo, então
-- o coordenador poderia simplesmente gravar status='assinado' pela anon key e
-- pular o provedor inteiro — ou alterar o `conteudo`, que É a prova do que foi
-- assinado. O trigger fecha as duas portas sem tirar do coordenador o aceite
-- interno legítimo (quando o ZapSign está desligado).

create or replace function contratos_protege_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Quem escreve com service_role é o servidor: o webhook do ZapSign precisa
  -- gravar status, arquivo e hash.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- O texto é o snapshot que foi assinado. Não muda depois de criado.
  if new.conteudo is distinct from old.conteudo then
    raise exception 'O conteúdo do contrato não pode ser alterado após a criação.';
  end if;

  -- Contrato conduzido pelo ZapSign: quem declara assinado/recusado/expirado é o
  -- provedor, não a tela. Desistir dele continua sendo decisão da empresa, então
  -- 'cancelado' passa — é o único destino que não afirma nada sobre a assinatura.
  if old.provedor = 'zapsign'
     and new.status is distinct from old.status
     and new.status <> 'cancelado' then
    raise exception 'Este contrato é assinado pelo ZapSign — a assinatura é registrada pelo provedor.';
  end if;

  -- Assinatura não se desfaz.
  if old.status = 'assinado' and new.status is distinct from 'assinado' then
    raise exception 'Contrato assinado não muda de status.';
  end if;

  return new;
end
$$;

drop trigger if exists trg_contratos_protege on contratos;
create trigger trg_contratos_protege
  before update on contratos
  for each row execute function contratos_protege_update();

-- ── 5. Bucket dos documentos assinados ───────────────────────────────────────
-- Privado e SEM policies, de propósito: mesmo desenho de `integracao_configs`.
-- Ninguém lê direto do navegador — o backend confere a permissão e devolve uma
-- URL assinada de curta duração (GET /api/zapsign/arquivo/:tipo/:id).

insert into storage.buckets (id, name, public)
values ('assinaturas', 'assinaturas', false)
on conflict (id) do nothing;

-- PostgREST guarda o schema em cache; sem isto as colunas novas só aparecem no
-- próximo restart e o frontend recebe "column does not exist".
notify pgrst, 'reload schema';
