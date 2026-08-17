# ExameQR — Design da v2

> Documento vivo. v0.1 — 27/jul/2026. Deriva de [VISION.md](./VISION.md) e [SCOPE.md](./SCOPE.md).
> Escrito **enquanto a v1 é validada em piloto** — a v2 se estrutura em paralelo, sem tocar na v1 estável.
> Itens marcados com ❓ ainda precisam de decisão.

---

## 1. Em uma frase

A v1 fechou o **controle** do ciclo (teto → autorização → scan → débito → lote → recibo).
A v2 fecha o **dinheiro de verdade**: a cobrança do lote vira **pagamento real** (PIX/boleto)
que baixa sozinho e libera o teto, o **preço do exame passa a ser o preço autoritativo do
NetRis** (não mais digitado à mão), e o "instituto com desconto" deixa de ser uma dúvida em
aberto — cai naturalmente no modelo de plano-convênio.

## 2. Por que agora (contexto)

A v1 **não é MVP frágil** — é produto operacional em validação:

- Multi-tenant real (dono → empresas → parceiros → funcionários) sobre Supabase + RLS.
- Núcleo financeiro **de controle** fechado: débito no scan, teto rotativo travado no banco
  (trigger `check_teto_autorizacao`), cobrança por lote (`cobrancas`) + recibo PDF.
- NetRis ponta a ponta (buscar/criar paciente, agendar por encaixe, confirmar, cancelar).
- LGPD (consentimento versionado, DPA, auditoria) e white-label por empresa/parceiro.

O que a v1 **ainda não entrega** e a v2 precisa provar:

1. **Pagamento real** — hoje o lote é fechado e **marcado pago na mão**. Não há cobrança,
   nem link/PIX pro parceiro, nem baixa automática.
2. **Preço confiável** — `procedimentos.valor` e `exames.valor` são digitados à mão; sujeito
   a erro e desatualização.
3. **Modelo do QR/usos** — os "3 usos" (transporte/lanche/exame) e o "instituto com desconto"
   seguem como ❓ na VISION.

## 3. A descoberta que orienta a v2 — Swagger da Animatti/NetRis

Investigação do Swagger em `https://ris.imagoradiologia.com.br/api-gateway/v2/api-docs`
(público, Swagger 2.0, v3.108.0-lts) — 27/jul/2026.

**Conclusão central: o domínio financeiro da API é essencialmente READ-ONLY.**

| Controller | Endpoints | Escrita? |
|---|---|---|
| `financeiro-controller` | `/lancamentos`, `/pagamentos`, `/pagamentoProcedimentos`, `/contas`, `/planoContas`, `/centroCustos`, `/formaPagamentos`, `/bancos` | ❌ tudo GET |
| `consulta-preco-controller` | `GET /consultarPreco` | leitura |
| `nota-fiscal-controller` | listar, por-id, **associar/desassociar** NF↔lançamento | ⚠️ só associação |
| `empresa-faturamento-controller` | `GET /empresas-faturamento/{id}` | ❌ GET |

Os **únicos** endpoints de escrita em todo o financeiro/faturamento/NF são
`POST /notasfiscais/{id}/associar` e `DELETE .../desassociar`. Não existe criar pagamento,
criar lançamento, emitir fatura/boleto ou emitir nota fiscal.

### Decisões que essa descoberta trava

- **D1 — O NetRis não cobra por nós.** A cobrança real (PIX/boleto/link) é 100% nossa.
  O NetRis é sistema-de-registro que a gente **lê e reconcilia**, não um gateway de pagamento.
- **D2 — `GET /consultarPreco` é a fonte de preço.** Params obrigatórios:
  `dataString`, `idPlanoConvenio`, `idProcedimento`. Dá o preço autoritativo do procedimento
  por plano-convênio por data. Alimenta o débito do teto com o valor **real**.
- **D3 — "Instituto com desconto" = plano-convênio.** Um parceiro com desconto **é** um
  `idPlanoConvenio` com tabela de preço descontada. Se o débito sai do `consultarPreco` com o
  plano-convênio daquele parceiro, o desconto já vem embutido — sem inventar um conceito novo
  de "desconto" no modelo de teto/dívida.
- **D4 — Emissão de NFS-e não é a Animatti.** Se a v2 emitir nota, será por um provedor
  dedicado de NFS-e (PlugNotas/Focus/eNotas), em fase separada.

> ⚠️ As respostas das listas financeiras e do `consultarPreco` vêm como `ResponseEntity`
> genérico no Swagger — os campos reais só aparecem **chamando com o token** (como já provamos
> em pacientes/horários). Nailar o shape do `consultarPreco` é pré-requisito da Frente B.

---

## 4. Frente A — Financeiro real (pagamento que baixa sozinho)

**Objetivo:** o lote de cobrança deixa de ser "marcado pago na mão" e passa a ser um
**recebível de verdade** que se baixa por webhook e libera o teto automaticamente.

**Gateway:** Asaas (padrão BR para B2B: PIX + boleto + link, webhook de pagamento). ❓ confirmar Asaas.

**Fluxo proposto:**

1. Gestor **fecha o lote** (`cobrancas`, já existe) → soma dos `exames.valor` do período.
2. Sistema cria a cobrança no gateway → guarda `gateway_id`, `link_pagamento`, `pix_copia_cola`.
3. Parceiro recebe o link (WhatsApp — `parceiros.whatsapp` já existe) e paga por PIX/boleto.
4. **Webhook** do gateway → marca `cobrancas.status = 'paga'` + `pago_at` + `meio_pagamento`.
5. Baixa **libera o teto** automaticamente (a trava já considera "pago" ao recomputar o
   comprometido: `coalesce(c.status,'') <> 'paga'`) — sem intervenção manual.

**Reconciliação (opcional, leitura do NetRis):** um job lê `/lancamentos` +
`/pagamentoProcedimentos` do NetRis do período e confere contra nossos `exames`/`cobrancas` —
aponta divergências (ex.: exame realizado no NetRis sem débito no ExameQR, ou valor divergente).

**Deltas de schema (v2):**

```
cobrancas: + gateway            text     -- 'asaas'
           + gateway_id         text     -- id da cobrança no gateway
           + link_pagamento     text
           + pix_copia_cola     text
           + pago_at            timestamptz
           + meio_pagamento     text      -- 'pix' | 'boleto'
           + gateway_payload    jsonb      -- último webhook cru (auditoria)
```

**Backend:** endpoint `POST /cobrancas/:id/gerar-pagamento` (cria no gateway) e
`POST /webhooks/asaas` (recebe baixa, valida assinatura, idempotente por `gateway_id`).
Config do gateway por empresa em `integracao_configs` (mesmo padrão do NetRis — service role).

---

## 5. Frente B — Preço via `consultarPreco` + modelo de usos

### 5.1 Preço autoritativo

Hoje `exames.valor` é digitado no cadastro. Na v2, **no momento da autorização** (quando o
valor passa a comprometer o teto), o sistema resolve o preço assim:

```
consultarPreco(
  dataString      = data da autorização,
  idPlanoConvenio = parceiros.netris_id_plano_convenio,   -- mapeia o "desconto"
  idProcedimento  = procedimentos.netris_procedimento_id
) -> preço real  ->  snapshot em exames.valor  (imutável a partir daí)
```

- **Snapshot, não referência:** grava o preço no `exames.valor` no ato da autorização. Se a
  tabela do NetRis mudar depois, o exame já autorizado **não muda** (débito e teto ficam
  estáveis; auditoria correta).
- **Fallback:** se a empresa não usa NetRis, o `consultarPreco` falha, ou não há preço →
  cai no `procedimentos.valor` (catálogo manual, que continua existindo). Preço nunca fica em
  branco.
- Guardar a **origem** do preço para auditoria.

**Deltas de schema (v2):**

```
exames: + valor_origem   text        -- 'netris' | 'catalogo' | 'manual'
        + preco_consulta  jsonb       -- resposta crua do consultarPreco (auditoria)
```

### 5.2 "Instituto com desconto" — resolvido por plano-convênio (D3)

Não precisa de campo de desconto. O parceiro-instituto aponta para um `idPlanoConvenio` cuja
tabela de preço já é descontada; `consultarPreco` devolve o valor descontado; o teto debita o
valor descontado. Único requisito: o mapeamento `parceiros.netris_id_plano_convenio` correto.

### 5.3 Repensar os "3 usos" do QR

Decisão proposta para simplificar (fecha a ❓ da VISION §5.7):

- **Só `exame` dispara débito** do teto (já é assim).
- **Transporte e lanche** viram **benefícios não-financeiros** (flags no QR, apenas registram
  entrega/uso — não tocam no teto).
- Custo de transporte/lanche fica **fora da v2** (fase futura, se a clínica quiser cobrar).
- ❓ Reavaliar se o QR precisa mesmo de `max_uses`/multi-uso, ou se vira **1 QR = 1 exame**
  (mais simples de auditar). A decidir com o feedback do piloto.

---

## 6. Frente C — Gerar Nota Fiscal (NFS-e)

A Animatti **não emite** NF (§3) — só lista/consulta/associa. Emitir exige um **provedor de
NFS-e** (nota de serviço é municipal). No nosso modelo, quem emite é a **clínica (prestador),
contra o parceiro (tomador)**, no fechamento/pagamento do lote.

### 6.1 Contexto fiscal (jul/2026)

- **NFS-e Nacional virou obrigatória a partir de 01/jan/2026** (LC 214/2025, reforma
  tributária). Campos de IBS/CBS já existem mas **não são obrigatórios** na transição de 2026
  (sem multa por ausência). A v2 já nasce no padrão nacional.

### 6.2 Provedor: Focus NFe (recomendado) — swappable

Escolha por **cobertura de Campina Grande–PB já homologada** (menor risco):

- Prefeitura de Campina Grande–PB usa o provedor municipal **WebISS** (padrão ABRASF, exige
  **certificado digital A1**). Código do município IBGE: **2504009**.
- A **Focus NFe já tem Campina Grande–PB integrada e homologada**, com ambiente de
  **homologação** (`homolog.focusnfe.com.br`) e **produção** (`api.focusnfe.com.br`) — abstrai
  o WebISS e o certificado.
- Alternativas equivalentes (mesma ideia de API REST): PlugNotas/TecnoSpeed, eNotas, Nuvem
  Fiscal. O design abaixo isola o provedor atrás de um adaptador, então trocar é barato.

> ⚠️ **Restrição de Campina Grande–PB:** o **cancelamento NÃO é feito por API/webservice** —
> só pelo portal do WebISS ou pedido à prefeitura. Logo, na v2 o cancelamento de NFS-e é
> **manual (fora do sistema)**; o sistema só registra o estado "cancelada" quando informado.

### 6.3 API da Focus NFe (formato real)

- Emitir: `POST https://api.focusnfe.com.br/v2/nfse?ref={ref}` (prod) /
  `https://homolog.focusnfe.com.br/v2/nfse?ref={ref}` (homolog). **`ref`** é a nossa chave de
  idempotência (ex.: `cobranca:{cobranca_id}`).
- Auth: **HTTP Basic** com o token da conta (só no backend).
- Emissão é **assíncrona**: o POST responde `processando`; o resultado final
  (`autorizado`/`erro`) chega por **webhook** ou consulta `GET /v2/nfse/{ref}` (devolve status,
  URL do **PDF/DANFSE** e do **XML**).
- Corpo (mapeado pras nossas tabelas):

```json
{
  "prestador": {                          // ← empresa (clínica), config fiscal
    "cnpj": "...",
    "inscricao_municipal": "...",
    "codigo_municipio": 2504009
  },
  "tomador": {                            // ← parceiro
    "cnpj": "..." ,                        //   ou "cpf"
    "razao_social": "...",
    "email": "...",
    "endereco": { "logradouro","numero","bairro","municipio","uf","cep" }
  },
  "servico": {                            // ← lote + config fiscal da empresa
    "valor_servicos": 0.00,                //   = total do lote (Σ exames.valor)
    "aliquota": 0.0,                       //   alíquota ISS da clínica
    "iss_retido": false,
    "item_lista_servico": "...",           //   código de serviço LC 116/2003
    "codigo_tributario_municipio": "...",
    "discriminacao": "...",                //   texto (ex.: exames do período / parceiro)
    "cnae": "..."
  }
}
```

### 6.4 Fluxo no ExameQR

1. Gestor **fecha o lote** (Frente A) e, no recibo, aparece **"Emitir NFS-e"**.
   ❓ emitir automático **na baixa do pagamento** ou por **botão manual**? (padrão: manual na v2.0).
2. Backend monta o JSON (prestador = config fiscal da empresa; tomador = parceiro;
   serviço = total do lote) e chama a Focus com `ref = cobranca:{id}` (idempotente).
3. Guarda `status = processando`. Webhook da Focus → atualiza para `autorizado` + salva
   `numero`, `url_pdf`, `url_xml` (ou `erro` + mensagem).
4. Recibo passa a exibir o **PDF da NFS-e**; o tomador recebe por e-mail (a Focus envia).

### 6.5 Deltas de schema (v2)

```
notas_fiscais (nova):
  id            uuid pk
  empresa_id    uuid  -> empresas
  cobranca_id   uuid  -> cobrancas          -- 1 NFS-e por lote (ref idempotente)
  provedor      text                         -- 'focusnfe'
  ref           text unique                  -- 'cobranca:{id}'
  status        text                         -- processando | autorizada | erro | cancelada
  numero        text
  url_pdf       text
  url_xml       text
  valor         numeric(12,2)
  erro_msg      text
  payload       jsonb                        -- último retorno cru (auditoria)
  created_at / updated_at

empresas (config fiscal do prestador):
  + nfse_provedor            text            -- 'focusnfe'
  + nfse_inscricao_municipal text
  + nfse_item_lista_servico  text            -- código de serviço LC 116/2003
  + nfse_codigo_tributario   text
  + nfse_cnae                text
  + nfse_aliquota_iss        numeric(5,2)
  + nfse_ambiente            text            -- 'homologacao' | 'producao'
  -- token da Focus vai em integracao_configs (service role), NÃO aqui.
```

> Endereço do tomador: capturar do parceiro. Se o cadastro por CNPJ (BrasilAPI) já traz
> endereço, reaproveitar; senão, adicionar os campos em `parceiros`. ❓ confirmar.

### 6.6 Segurança / conformidade

- Token da Focus e certificado vivem **fora do frontend** (a Focus guarda o certificado A1;
  o token fica em `integracao_configs`, service role — mesmo padrão do NetRis e do gateway).
- Emissão é registrada na **auditoria** (`audit_log`), como contrato/scan/cobrança.
- Idempotência pelo `ref` evita nota duplicada se o gestor clicar duas vezes.

---

## 7. Estado atual do schema (baseline v1)

| Tabela | Papel financeiro |
|---|---|
| `parceiros` | `teto` (limite rotativo), `netris_id_plano_convenio`, `whatsapp` |
| `procedimentos` | catálogo; `valor` (preço manual), `netris_procedimento_id` |
| `exames` | `valor` (snapshot), `procedimento_id`, `parceiro_id`, `cobranca_id`, `status` |
| `cobrancas` | lote de cobrança; `status` (inclui `paga`) |
| `empresas` | `periodo_cobranca_dias` (default 30) |

Trava de teto: trigger `check_teto_autorizacao` em `exames` — bloqueia autorizar quando
`Σ exames.valor (autorizado|realizado, cobrança não-paga) ≥ teto`. O fluxo de lote público
(`autorizacao_lotes`) ignora o teto de propósito (`exameqr.skip_teto = on`).

**Toda mudança de schema da v2 entra como migration em `supabase/migrations/`** — nada de SQL
avulso. Migrations propostas: `cobrancas` (gateway), `exames` (origem do preço).

---

## 8. Perguntas em aberto

- ❓ Gateway de pagamento: Asaas confirmado? (PIX + boleto + webhook).
- ❓ `consultarPreco`: shape real da resposta (precisa de 1 chamada com token da IMAGO).
- ❓ Modelo de usos: manter `max_uses` ou ir pra 1 QR = 1 exame?
- ❓ Reconciliação NetRis: entra na v2.0 ou fica pra v2.x?
- ❓ **NFS-e — dados fiscais do prestador** (vêm do contador da clínica): `inscricao_municipal`,
  `item_lista_servico` (código de serviço LC 116/2003), `codigo_tributario_municipio`, `cnae`,
  `aliquota_iss`, `iss_retido`. Sem isso a emissão não fecha.
- ❓ NFS-e — emitir **automático na baixa** do pagamento ou por **botão manual**? (padrão: manual v2.0).
- ❓ NFS-e — endereço do tomador já vem do cadastro por CNPJ (BrasilAPI) ou precisa capturar em `parceiros`?

## 9. Fora de escopo da v2

- Emissão de NF pela Animatti (não existe na API — emissão é via provedor de NFS-e, §6).
- **Cancelamento de NFS-e pelo sistema** — Campina Grande–PB não permite por API (só portal).
- Custo de transporte/lanche.
- Onboarding self-service de novas clínicas / billing do próprio SaaS (produtização) —
  frente futura, tratada em `docs/negocio/`.

## 10. Ordem de execução proposta

1. **Validar `consultarPreco`** com o token da IMAGO (fecha a ❓ do shape) — pré-requisito da B.
2. **Frente B.1** — preço via `consultarPreco` no ato da autorização (snapshot + fallback).
3. **Frente A** — cobrança real (Asaas) + webhook de baixa + liberação automática do teto.
4. **Frente C** — emissão de NFS-e (Focus NFe) no fechamento do lote — depende dos dados
   fiscais (§8) e testa primeiro em **homologação** (WebISS homolog).
5. **Frente B.3** — simplificar o modelo de usos (guiado pelo feedback do piloto).
6. **Reconciliação** (leitura NetRis) — v2.x, conforme decisão das ❓.

> A v1 permanece intocada em produção durante toda a v2. Merge da v2 só quando cada frente
> estiver validada ponta a ponta contra o NetRis/gateway reais.
