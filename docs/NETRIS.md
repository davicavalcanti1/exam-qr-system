# Integração NetRis — plano por fases

A integração com o NetRis fica **100% no backend**. O frontend nunca fala com o
NetRis nem enxerga token: tudo passa por `/api/netris`, autenticado via Supabase,
e o cliente é montado sob demanda a partir da config que **cada empresa** salva na
aba _Desenvolvedor_ (Módulo 5).

Fazemos a integração em fases isoladas. Cada fase só é considerada "pronta"
quando validada contra o NetRis real da IMAGO. Não avançamos de fase sem a
anterior redonda.

## Peças (onde mexer)

| Arquivo | Papel |
|---|---|
| `src/lib/netris.js` | `createNetrisClient(config)` — factory do cliente (sem estado global) |
| `src/lib/netrisEmpresa.js` | `netrisParaEmpresa(empresaId)` — monta o cliente da config salva; `null` se inativo/mal configurado |
| `src/routes/netris.js` | endpoints HTTP (auth Supabase, escopo por empresa) |
| `src/routes/qr.js` | espelha `EXAME_REALIZADO` no scan (Fase 3) |
| `integracao_configs` (Supabase) | credenciais por empresa (RLS sem policy → só service role) |

Config esperada por empresa: `baseUrl`, `token`, `idPlanoConvenio`, `idUnidade`
(e opcional `idConvenio`).

---

## Fase 1 — Conexão & configuração ✅ FEITO

- [x] Config por empresa em `integracao_configs` (credenciais fora do frontend).
- [x] `createNetrisClient` (factory, sem env global).
- [x] `netrisParaEmpresa` só devolve cliente se `provider=netris` + `ativo` + `baseUrl`/`token`.
- [x] `GET /api/netris/status` → `{ ativo: bool }`.
- [x] Botão _Testar conexão_ (Módulo 5) faz ping no `baseUrl`.

**Validação:** salvar a config da IMAGO e ver `status.ativo=true` + teste de conexão OK.

---

## Fase 2 — Leitura (read-only, sem efeitos colaterais) 🔜 PRÓXIMA

Endpoints que só **leem** do NetRis — seguros pra validar sem risco.

- [x] `GET /api/netris/pacientes/cpf/:cpf` — busca paciente.
- [x] `GET /api/netris/atendimentos?dataInicial&dataFinal` — agenda de um período.
- [x] `GET /api/netris/horarios?...` — horários disponíveis (injeta `idPlanoConvenio`/`idFilial` da config).
- [ ] **Validar o shape real de cada resposta** contra o NetRis da IMAGO e ajustar `unwrapList`/campos.

**Precisa de você:** um retorno real (JSON) de cada endpoint pra confirmar os campos.
**Pendência conhecida:** `/horarios` exige `listIdProcedimento` (+ convênio) — sem isso o NetRis dá 500. Precisamos do mapeamento procedimento→ID do NetRis (ver Fase 4).

---

## Fase 3 — Espelhar situação (escrita pontual, baixo risco) ⚙️ PARCIAL

Refletir no NetRis mudanças que já acontecem no ExameQR.

- [x] No `/qr/validar` (scan), se o exame tem `netris_atendimento_id` e a empresa usa
      NetRis ativo → `alterarSituacao(EXAME_REALIZADO)` (best-effort, não quebra o scan).
- [ ] Mapear as demais situações usadas (`CHEGOU=10`, `EM_SALA=45`, `CANCELADO=5`)
      aos eventos do ExameQR (ex.: recusar exame → CANCELADO).
- [ ] Registrar em log/coluna o resultado do espelhamento (auditoria).

**Precisa de você:** confirmar os `idSituacao` que a IMAGO usa hoje.

---

## Fase 4 — Agendamento (escrita real) ⛔ BLOQUEADA

Criar o agendamento (encaixe) no NetRis a partir de um exame do ExameQR.

- [x] `POST /api/netris/agendar` chama `criarEncaixe` (completa `idPlanoConvenio`/`idUnidade`).
- [ ] **Shape exato do body do encaixe** (campos obrigatórios, formatos de data/hora).
- [ ] Mapa **procedimento (catálogo ExameQR) → `idProcedimento` (NetRis)**
      (guardar em `procedimentos.netris_procedimento_id`, que já existe).
- [ ] Gravar o `netris_atendimento_id` retornado em `exames` (fecha o ciclo com a Fase 3).

**Precisa de você:** um exemplo de requisição de `horarios-agrupados` **e** de
`horarios/encaixe` que retorne 200 na IMAGO (com os parâmetros reais).

---

## Fase 5 — Sincronização & reconciliação 📋 FUTURO

Manter ExameQR e NetRis coerentes ao longo do tempo.

- [ ] Puxar situação do NetRis de volta pros exames (job/polling por período).
- [ ] Reconciliar divergências (ex.: realizado no NetRis mas não no ExameQR).
- [ ] Tratar erros/reentrância (idempotência do espelhamento).

---

## Regras que não mudam

1. Frontend **nunca** recebe token nem fala com o NetRis direto.
2. Toda credencial vive em `integracao_configs` (service role only).
3. Nada de env global de NetRis — sempre a config **da empresa**.
4. Escrita no NetRis é sempre **best-effort** no caminho crítico (um scan não pode
   falhar porque o NetRis caiu); erros são reportados, não propagados.
