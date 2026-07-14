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

Endpoints que só **leem** do NetRis — seguros pra validar sem risco. Quebrada em
três etapas independentes, da mais simples pra mais complexa. Fazemos e validamos
uma de cada vez.

### Etapa 2.1 — Paciente por CPF (mais simples)

Recurso pontual, poucos parâmetros — ideal pra confirmar que auth + baseUrl + o
parsing básico estão certos ponta a ponta.

- [x] `GET /api/netris/pacientes/cpf/:cpf`.
- [ ] Validar o JSON real e mapear os campos que vamos usar (nome, nascimento, id do NetRis).
- [ ] Normalizar o retorno num shape estável do ExameQR (não vazar o cru do NetRis).

**Precisa de você:** um JSON real de busca por CPF (pode anonimizar os dados).

### Etapa 2.2 — Atendimentos / agenda do período (lista paginada)

Sobe um degrau: lista, paginação e `unwrapList` (o NetRis embrulha em `aaData`/`content`/…).

- [x] `GET /api/netris/atendimentos?dataInicial&dataFinal` (paginado, formato de data BR).
- [ ] Confirmar a chave de embrulho real e o campo de data/hora e situação de cada item.
- [ ] Confirmar `filialId`/`idUnidade` corretos e o limite de páginas.

**Precisa de você:** um JSON real de um período curto (1–2 dias) com alguns atendimentos.

### Etapa 2.3 — Horários disponíveis (a mais complexa)

Depende de convênio + procedimento; é o pré-requisito de leitura pro agendamento (Fase 4).

- [x] `GET /api/netris/horarios` (injeta `idPlanoConvenio`/`idFilial` da config).
- [ ] Descobrir os parâmetros obrigatórios reais (`listIdProcedimento`, convênio, período).
- [ ] Mapear procedimento (catálogo ExameQR) → `idProcedimento` do NetRis
      (`procedimentos.netris_procedimento_id`, já existe) — compartilhado com a Fase 4.

**Precisa de você:** uma chamada de `horarios-agrupados` que retorne 200 na IMAGO,
com os parâmetros reais.
**Pendência conhecida:** sem `listIdProcedimento` (+ convênio) o NetRis dá 500.

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

## Fase 4 — Agendamento (escrita real) ✅ PROVADO NA API (14/07/2026)

Criar o agendamento (encaixe) no NetRis a partir de um exame do ExameQR.
**Testado com sucesso**: mamografia marcada de verdade (idAtendimento 688681,
retorno `{"status":"OK","message":"Agendamento realizado com sucesso. ID: 959253"}`).

Fluxo que funcionou (2 chamadas):

1. `GET /netris/api/horarios-agrupados` com **todos os obrigatórios**:
   `buscaInteligente=true&dataBusca=DD/MM/AAAA&dataFinalBusca=DD/MM/AAAA&idConvenio=94&idFilial=1&idPaciente=<id>&idPlanoConvenio=224&listIdProcedimento=147&pesoPaciente=<n>`
   → devolve dias → `unidades[].medicos[].horarios[]` com `horaInicial, idSala, idEscala, procedimento`.

2. `POST /netris/api/horarios/encaixe` com body **array de EncaixeModel**:
   ```json
   [{
     "dataString": "2026-07-15",      // ISO (YYYY-MM-DD)
     "horarioString": "09:30",         // HH:MM do slot
     "encaixe": true,
     "envioMensagemOrientacao": false, // não dispara msg pro paciente
     "idConvenio": 94, "idPlanoConvenio": 224, "idProcedimento": 147,
     "idMedico": 11, "idSala": 16, "idPaciente": 36343
   }]
   ```

- [x] Shape exato do body do encaixe (acima) e dos horários confirmados.
- [ ] Mapa **procedimento (catálogo ExameQR) → `idProcedimento`** (`procedimentos.netris_procedimento_id`).
- [ ] Mapa **parceiro → `idPlanoConvenio` + `idConvenio`** (`parceiros.netris_*`).
- [ ] Atualizar `criarEncaixe` no backend para montar este EncaixeModel por slot.
- [ ] Gravar o `netris_atendimento_id` retornado em `exames` (fecha o ciclo com a Fase 3).

> Obs.: `horaInicial` nos atendimentos vem em ms-de-dia UTC (09:30 BRT = 45000000).

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
