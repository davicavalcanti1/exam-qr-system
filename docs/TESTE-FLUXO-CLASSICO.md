# Roteiro de teste — Fluxo clássico (ponta a ponta)

Valida o núcleo do ExameQR: **cadastro → autorização (teto) → agendamento NetRis → QR → scan (débito) → cobrança por lote → recibo → pago (libera teto)**.

Marque cada ✅. Se algo falhar, veja **Se algo falhar** no fim.

## Pré-requisitos (setup, uma vez)
- [ ] Migrations aplicadas + redeploy; envs corretos (Supabase service_role real).
- [ ] Empresa **IMAGO** criada (dono) + **logo** (opcional).
- [ ] **Catálogo** com ao menos 2 exames + preços (Empresa → Exames & preços). Se for testar NetRis, com **mapeamento de procedimento**.
- [ ] **1 parceiro** com **teto** definido (ex.: R$ 2.000) — Empresa → Parceiros.
- [ ] Usuários: **admin da empresa** + **coordenador do parceiro** (com login). No 1º acesso do admin, **aceitar o DPA**.

## 1. Cadastro do paciente + exame  (coordenador ou funcionário)
1. Entre como **coordenador do parceiro** → **Pacientes** → novo.
2. Preencha nome, CPF, etc. e **marque o consentimento (LGPD)**. Adicione 1–2 exames do catálogo.
   - ✅ Sem o consentimento, **não deixa** salvar.
   - ✅ Salvou → paciente aparece na lista; exames ficam **aguardando autorização**.
   - ✅ (Se NetRis ativo) dá pra escolher **horário** no cadastro (fica pendente até autorizar).

## 2. Autorização + trava de teto  (coordenador)
3. Vá em **Autorizações** → autorize um exame.
   - ✅ Status vira **autorizado**.
   - ✅ (Se NetRis ativo) o agendamento é enviado ao NetRis na autorização.
4. **Testar a trava:** tente autorizar exames até passar do teto do parceiro.
   - ✅ Ao **atingir/estourar** o teto, o botão bloqueia e mostra aviso (a trava vale no frontend **e** no banco).
   - ✅ Regra da folga: se ainda houver qualquer crédito (ex.: 1999/2000), deixa encaixar **mais um**.

## 3. QR Code
5. No exame autorizado, **gerar QR**.
   - ✅ Aparece o QR (imagem) — é único por exame.

## 4. Scan = débito  (recepção)
6. Abra **/scan** (celular/recepção) → aponte pro QR.
   - ✅ Cabeçalho neutro "Leitor de QR"; confirmação mostra a **marca da clínica** + paciente/exame/valor.
   - ✅ Exame vira **realizado**; o valor é **debitado do teto** (o comprometido do parceiro aumenta / disponível diminui).
   - ✅ Reler o mesmo QR → "QR já utilizado".

## 5. Cobrança por lote + recibo  (admin da empresa)
7. **Cobranças** → selecione o parceiro + período → **calcular**.
   - ✅ Lista só os exames **realizados** e ainda não faturados no período.
8. **Fechar lote** → gera a cobrança.
9. **Ver recibo**.
   - ✅ Cabeçalho com a **marca da clínica** (não "ExameQR"); lista + total; **Imprimir/PDF** funciona.

## 6. Pagamento libera o teto
10. Marque a cobrança como **paga**.
    - ✅ O valor daquele lote **volta** ao teto do parceiro (disponível aumenta) — dá pra autorizar de novo.

## 7. Conferir os painéis
- [ ] **Visão geral** (coordenador): financeiro (em aberto / a receber / recebido) + barra de teto batem.
- [ ] **Auditoria** (empresa): registros de autorização, QR gerado/lido, cobrança.
- [ ] **Consumo** (dono): exames do mês, faturado, gráfico mensal.

## Casos de borda (rápidos)
- **Cancelar exame** (Pacientes → editar → cancelar): se estava agendado no NetRis, libera o horário.
- **Reagendar** (escolher outro horário): cancela o encaixe anterior antes de criar o novo (não duplica).
- **LGPD:** exportar dados do paciente (JSON) e **anonimizar** (some o PII, mantém o histórico financeiro).

## Se algo falhar
- **QR não valida / "nenhuma linha atualizada":** a `SUPABASE_SERVICE_ROLE_KEY` do backend precisa ser a **service_role real** (não a anon).
- **NetRis 403 / horários não vêm:** confira `baseUrl` (https), token e o **mapeamento** procedimento↔plano-convênio do parceiro.
- **Teto não libera após pagar:** confirme que a cobrança está **paga** (o cálculo desconsidera exames de lote pago).
- **Autorização barrada sem querer:** é a trava de teto — aumente o teto do parceiro ou feche/receba um lote.
