# ExameQR — Arquitetura v2 (produto real)

> Documento vivo. v0.1 — 10/jul/2026. Marca a transição de MVP → produto.
> Itens com ❓ são decisões pendentes.

## 1. Hierarquia (multi-tenant)

```
Dono do projeto (Owner / superadmin global)
        └── cria Empresas Principais
Empresa Principal  (= TENANT isolado)
        ├── cria Parceiros
        └── pode criar agendamentos PARA um parceiro (com autorização — ver §5)
Parceiro (dentro de uma empresa principal)
        ├── tem um Responsável/Coordenador (autoriza)
        └── cria Funcionários e define os roles deles
Funcionário do parceiro (role configurável pelo parceiro)
```

**Isolamento:** cada **Empresa Principal é um tenant** — ninguém enxerga dados de outra
empresa. Toda tabela carrega `empresa_id`; toda query é filtrada por ele. O Owner é global
(vê/gerencia todas as empresas).

## 2. Papéis (roles)

| Role | Escopo | Faz |
|------|--------|-----|
| `owner` | global | cria/gerencia empresas principais; vê tudo |
| `empresa_admin` | 1 empresa | cria parceiros, cria agendamentos p/ parceiros, gestão financeira/contratos |
| `parceiro_coordenador` | 1 parceiro | **autoriza** exames/agendamentos; cria funcionários e define roles; gera QR |
| `parceiro_funcionario` | 1 parceiro | registra pacientes/exames conforme permissões dadas pelo coordenador |

Permissões dos funcionários = **matriz configurável** pelo coordenador (fase posterior;
começar com um conjunto fixo + flag de "pode autorizar").

## 3. Autenticação (Supabase Auth)

- **Supabase Auth** cuida de login/senha/sessão (JWT do Supabase).
- Tabela `profiles` (1:1 com `auth.users`): `empresa_id (null p/ owner), parceiro_id, nome, role, ativo`.
- Criação de usuários é **por convite/admin** (sem signup público): owner cria empresa_admin;
  empresa cria coordenador do parceiro; coordenador cria funcionários — tudo via
  `auth.admin.createUser` + insert em `profiles` (service role, no backend).
- Isolamento por `empresa_id` via **RLS** (funções SECURITY DEFINER, sem subquery recursiva).

## 4. Modelo de dados (novo, resumido) — tudo com `empresa_id`

- `empresas` (tenant): nome, cnpj, config, status
- `users` (§3)
- `parceiros`: empresa_id, nome, teto, status, contrato_id
- `pacientes`: empresa_id, parceiro_id, nome, cpf
- `exames`: empresa_id, parceiro_id, paciente_id, procedimento, valor, scheduled_at,
  **status** (rascunho → aguardando_autorizacao → autorizado → realizado/cancelado),
  criado_por (user), autorizado_por, netris_atendimento_id
- `qr_codes`, `qr_usage_log` (§9)
- `pagamentos`, `faturas` (§7, §11)
- `contratos` (§6): parceiro_id, zapsign_doc_id, status, url, assinado_em
- `netris_map`: procedimento ExameQR ↔ `id_procedimento` NetRis (+ convênio/plano) (§8)
- `recibos` (§10)

## 5. Agendamento com autorização (cross-org)

Regra-chave: **a empresa principal pode criar um agendamento PARA um parceiro, mas um
responsável do parceiro precisa autorizar.**

Fluxo (máquina de estados do exame):
```
[empresa cria p/ parceiro]  → aguardando_autorizacao
[coordenador do parceiro]   → autorizado  (ou recusado)
[autorizado]                → gera QR / marca no NetRis
[scan do QR na clínica]     → realizado  (debita o teto)
```
(Quando o próprio parceiro cria, o coordenador já autoriza no ato.)
Reaproveita o padrão coordenador↔funcionário que já existe, estendido pra empresa↔parceiro.

## 6. Contratos (ZapSign)

- Ao habilitar um parceiro, gerar contrato e enviar pra assinatura via **API ZapSign**.
- Guardar `zapsign_doc_id`, status (pendente/assinado), URL do documento; webhook do ZapSign
  atualiza o status.
- ❓ Bloquear operação do parceiro até o contrato estar assinado?
- Precisa: token da API ZapSign + template do contrato.

## 7. Pagamentos

- Gateway ❓ (candidatos BR: **Asaas**, Pagar.me, Mercado Pago, Stripe). PIX + cartão + boleto.
- Cobrança da dívida do parceiro; **webhook** dá baixa automática e libera o teto.
- Split/repasse por empresa principal? ❓

## 8. NetRis (marcação real)

- Modalidades/procedimentos dedicados: **"MAMOGRAFIA PARCEIRO"** etc. (você vai criar no NetRis).
- Mapear exame ExameQR → `id_procedimento` NetRis + `idConvenio`/`idPlanoConvenio`.
- Fluxo: `GET /horarios-agrupados` (vagas) → escolhe → `POST /horarios/encaixe` (cria) →
  no scan, `PATCH .../alterar-situacao` = EXAME_REALIZADO.
- Pendente técnico: `idPlanoConvenio` / exemplo de request da página de agendamento online.
- Base já portada em `src/lib/netris.js` + `/api/netris/*`.

## 9. QR Code

- ❓ **1 QR por exame** (mais granular, casa com agenda/NetRis) **ou 1 por paciente**?
- Conteúdo: token assinado (HMAC), validade (72h hoje). Revisar o modelo de "usos"
  (transporte/lanche/exame) — provável simplificar p/ "confirmação do exame".
- Scan confirma realização → debita o teto + (opcional) marca no NetRis.

## 10. Recibos

- PDF (já usamos `pdfkit`). Template por empresa; numeração sequencial; armazenar/baixar.
- ❓ Recibo por exame, por agendamento ou por pagamento?

## 11. Cobrança (por lote) — DEFINIDO

- Teto de crédito por parceiro; débito **na confirmação** do exame.
- **Fechamento por LOTE**: a empresa/parceiro **fecha um lote** delimitando um período
  (data inicial → data final). O sistema **soma os exames confirmados dos pacientes**
  daquele período e gera o **valor do lote** (= a fatura/cobrança).
- O lote vira uma cobrança no **Asaas** (PIX/boleto/cartão); o **webhook** dá baixa e
  libera o teto. Tabela `lotes` (período, total, status) + `pagamentos` (Asaas).

## Roadmap por fases

- **F1 — Fundação multi-tenant** ⭐ começar aqui: banco + `users`/auth próprio + hierarquia
  (owner→empresa→parceiro→funcionário) + isolamento por `empresa_id`.
- **F2 — Agendamento + autorização** cross-org (máquina de estados do exame).
- **F3 — NetRis real** (vagas + encaixe + confirmação; modalidades PARCEIRO).
- **F4 — Contratos ZapSign** (assinatura + webhook).
- **F5 — Pagamentos + cobrança + recibos** (gateway + webhook + faturas + PDF).
- **F6 — Permissões customizáveis + refinos**.

## Decisões confirmadas (10/jul/2026)
- **Banco + Auth:** Supabase (Postgres + Supabase Auth). Tudo no Supabase por enquanto.
- **Pagamento:** Asaas.
- **Cobrança:** por **lote** (fecha período → gera valor dos pacientes confirmados).
- **QR:** 1 por exame (assumido; confirmar no F3).
- Fundação (F1) = schema multi-tenant + RLS em `supabase/migrations/`.
