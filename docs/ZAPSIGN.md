# ZapSign — assinatura eletrônica

> Integração viva desde 17/ago/2026. Substitui a Frente C (NFS-e) na aba de
> integrações — a NFS-e está arquivada na branch `feat-nfse`, ver
> [V2-DESIGN.md](./V2-DESIGN.md) §6.

## Por que

Até aqui "assinar" era digitar o nome e marcar um checkbox. `contratos.assinante_nome`
+ `assinado_at` eram gravados **pelo próprio navegador**, sob RLS. Isso é aceite,
não assinatura: não há autenticação de quem assinou nem trilha probatória — e a
policy `contratos_parceiro_sign` deixava o coordenador reescrever o texto que ele
mesmo tinha assinado.

Com o ZapSign, o signatário recebe um link por e-mail, confirma um código
(`auth_mode: tokenEmail`) e assina. O arquivo que volta é o assinado, com o log de
auditoria do provedor, e fica guardado com o SHA-256 do conteúdo.

**Com o ZapSign desligado, nada muda:** o aceite interno continua valendo. A
clínica não deixa de fechar parceria porque uma integração caiu.

## O que ele assina

| Documento | Tabela | Quem assina | E-mail usado |
|---|---|---|---|
| Contrato de parceria | `contratos` | coordenador do parceiro | `profiles.email` do coordenador → senão `parceiros.email` |
| DPA (LGPD) | `dpa_aceites` | admin da empresa (Controladora) | `profiles.email` do admin → senão `empresas.email` |

⚠️ **E-mail sintético não serve.** Usuários criados por username nascem com
`<username>@exameqr.app` (`src/routes/admin.js:5`), que não é caixa de ninguém.
`emailReal()` rejeita esse domínio, e o envio falha com uma mensagem pedindo o
cadastro do e-mail — em vez de mandar o link para o vazio.

## Como ligar

1. Crie a conta no ZapSign e pegue o **token da API**.
2. No sistema: **Configurações → Assinatura eletrônica (ZapSign)**
   (o dono faz o mesmo em **Empresas → \<empresa\> → Integração**).
3. Escolha o ambiente — comece em **sandbox**.
4. Cole o token, clique em **Testar token** (só 2xx passa) e em **Salvar**.
5. Ligue a chave **"Ligar a assinatura pelo ZapSign"**.
6. Gere um contrato de teste e assine ponta a ponta antes de mudar para produção.

O **webhook** é enviado junto de cada documento (`url_webhook`), então normalmente
não há nada a configurar no painel do ZapSign. A URL aparece na tela para contas
que exigem webhook fixo.

## Fluxos

**Contrato** — a empresa gera o contrato como sempre (`ContratosArea`), e o botão
**Enviar para assinar** chama `POST /api/zapsign/contratos/:id/enviar`. O servidor
monta o PDF a partir de `contratos.conteudo` (pdfkit), cria o documento no ZapSign
e grava `provedor='zapsign'`, `externo_token`, `sign_url`, `signatario_email`,
`enviado_at`. O coordenador vê "Ler e assinar" em **Contrato** e é levado ao
ZapSign. Assinado, o webhook fecha a linha e guarda o PDF.

**DPA** — na tela de aceite obrigatório do primeiro acesso, o admin clica em
**Assinar pelo ZapSign**. A linha em `dpa_aceites` **nasce pendente** (antes ela só
existia depois do aceite) e só vira `assinado` no retorno. O botão *Já assinei*
reconsulta o provedor, para quem não quer esperar o webhook.

> O gate do painel (`Painel.jsx`) passou a exigir `status = 'assinado'`. Sem isso,
> **mandar** o Termo para assinar já liberaria o sistema.

## Endpoints

| Método | Rota | Quem |
|---|---|---|
| GET | `/api/zapsign/config` | owner, empresa_admin |
| PUT | `/api/zapsign/config` | owner, empresa_admin |
| POST | `/api/zapsign/testar` | owner, empresa_admin |
| POST | `/api/zapsign/contratos/:id/enviar` | owner, empresa_admin |
| POST | `/api/zapsign/dpa/enviar` | owner, empresa_admin |
| GET | `/api/zapsign/status/:tipo/:id` | owner, empresa_admin |
| GET | `/api/zapsign/arquivo/:tipo/:id` | owner, empresa-level, ou o próprio parceiro |
| POST | `/api/zapsign/webhook/:segredo` | **público** (o ZapSign) |

`:tipo` é `contrato` ou `dpa`.

## Segurança

- **Token** em `integracao_configs.config.zapsign.token` — RLS ligada e **sem
  policy**, então só o `service_role` lê. O navegador nunca o recebe: o `GET`
  responde apenas `tokenConfigurado: true|false`.
- **Segredo do webhook** em `integracao_configs.webhook_segredo` (uuid gerado pela
  migration, índice único). O webhook é autenticado **buscando a empresa pelo
  segredo** — nunca comparando contra "a" config, que faria o segredo de uma
  clínica autenticar o webhook de todas.
- `GET /config` e `/status` são **gestor-only**: um coordenador de parceiro também
  tem `empresa_id`, e sem esse recorte leria o segredo da clínica e o `sign_url`
  do contrato de outro parceiro.
- O logger de `src/app.js` **mascara** caminhos que carregam segredo (webhook do
  ZapSign, link do lote de autorização) — o stdout vai para o log do EasyPanel.
- **Bucket `assinaturas` é privado e sem policy.** A permissão é conferida na rota,
  que devolve uma URL assinada de 5 minutos.
- **`trg_contratos_protege`** impede reescrever `conteudo`, forjar `status='assinado'`
  pela anon key e desfazer assinatura. Sem ele o ZapSign seria teatro: bastava um
  `update` do coordenador para pular o provedor. Cancelar continua permitido — é o
  único destino que não afirma nada sobre a assinatura.
- **Idempotência**: reenviar um contrato que já está pendente devolve o link
  existente em vez de criar um segundo documento (dois links válidos circulando e
  cobrança dobrada no provedor).

## Schema

Migration `supabase/migrations/20260817120000_zapsign.sql`:

- `integracao_configs` + `webhook_segredo` (único).
- `contratos` + `externo_token`, `sign_url`, `arquivo_path`, `hash_sha256`,
  `signatario_email`, `enviado_at`, `recusado_motivo`; `status` ganha `recusado`
  e `expirado`.
- `dpa_aceites` + as mesmas colunas, mais `status` e `provedor`; `assinante_nome`
  e `aceito_at` deixam de ser obrigatórios (a linha passa a nascer pendente).
- Bucket `assinaturas` (privado).
- Trigger `trg_contratos_protege`.

## Pendências

- [ ] Conta no ZapSign e token (não existe nenhum configurado ainda).
- [ ] Rodar um contrato ponta a ponta em **sandbox** antes de produção.
- [ ] Conferir o nome do evento de recusa (`doc_refused`) e o campo do motivo
      contra um webhook real — o de assinatura (`doc_signed`) é o documentado.
- [ ] Preencher `parceiros.email` dos parceiros existentes; hoje muitos estão sem.
- [ ] Decidir se o DPA já assinado deve ser reapresentado quando `DPA_VERSAO` mudar
      (hoje o gate é por versão, então uma versão nova pede assinatura nova).
