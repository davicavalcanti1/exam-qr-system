# ExameQR — Visão do Produto

> Documento vivo. Rascunho v0.1 — iniciado em 08/jul/2026.
> Itens marcados com ❓ ainda precisam de decisão.

---

## 1. Em uma frase

Sistema para **controlar financeiramente os exames realizados por meio de parcerias**, garantindo que cada exame liberado a um paciente de parceiro seja confirmado (via QR Code) e debitado do **teto de crédito** daquele parceiro — trazendo rastreabilidade e controle a uma cobrança que hoje é frágil.

## 2. O problema (a dor)

Na IMAGO existem **parcerias**: um terceiro (ex: um vereador, um instituto) autoriza o envio de pacientes para fazerem exames na clínica. O **paciente não paga nada** — quem deve pagar é o **parceiro**.

Hoje esse controle é frágil:
- Parceiros "exageram" e enviam mais pacientes do que conseguem pagar.
- Não há um teto claro que trave o gasto.
- Não há rastreabilidade confiável de **quais exames foram de fato realizados** por quais pacientes.
- A cobrança acaba imprecisa e difícil de sustentar.

## 3. A solução

- Cada parceiro tem um **teto** (limite de crédito).
- Cada paciente do parceiro recebe **um QR Code único**.
- Quando o paciente chega na clínica, a recepção **escaneia o QR** — isso **confirma que o exame foi realizado**.
- **Só nesse momento** o valor do exame é **debitado do teto** do parceiro.
- Quando o parceiro **estoura o teto**, ele é **bloqueado** e fica **pendente de pagamento**.
- Quando **paga**, o teto **volta a liberar** (crédito rotativo — não depende de tempo/mês).

## 4. Atores (papéis)

| Ator | O que faz | Status da definição |
|------|-----------|---------------------|
| **Gestor da Clínica** | Cadastra parceiros, define tetos, acompanha dívidas, registra pagamentos, autoriza acesso | definido |
| **Parceiro** (conta/organização) | Tem um teto de crédito; agrupa um coordenador e seus funcionários | definido |
| **Coordenador** (login principal do parceiro) | Gerencia os funcionários e **autoriza + gera o QR** de cada exame | definido |
| **Funcionário** (criado pelo coordenador) | **Registra** pacientes/exames, mas **não gera nem autoriza QR** | definido |
| **Operador do Scanner** | Escaneia o QR na chegada do paciente para confirmar o exame | ❓ quem opera (recepção?) a confirmar |
| **Paciente** | Recebe o QR, faz o exame, não paga nada | definido |

**Fluxo de registro → autorização:** o funcionário cadastra o paciente e seus exames
(ficam "aguardando autorização"); o **coordenador revisa e gera o QR**, o que autoriza o exame.
O valor só é debitado do teto quando o QR é escaneado (exame confirmado).

## 5. Regras de negócio

1. **Teto** = limite de crédito acumulado do parceiro. Default atual: R$ 2.000.
2. O teto **só reseta com pagamento** (crédito rotativo), independente de tempo.
3. O valor do exame entra na conta do parceiro **apenas quando o QR é escaneado e o exame é confirmado como realizado** — não no cadastro.
4. Ao estourar o teto → parceiro **bloqueado** + status **pendente de pagamento**.
5. QR expira em **72h** (já implementado).
6. **Transporte e lanche**: hoje **sem custo** para o parceiro (benefícios apenas). Futuramente poderão ter custo.
7. Cada QR hoje tem **3 usos** (transporte, lanche, exame) e cada scan de um tipo "queima" um uso. ❓ *A melhorar — modelo de usos precisa ser repensado.*

## 6. Escopo / Fases

- **Fase atual (MVP):** uso **apenas pela IMAGO**. Primeiro caso real: um **instituto que tem desconto nos exames** ❓ (validar como o modelo de desconto se encaixa no modelo de teto/dívida).
- **Futuro:** produto **multi-empresa** (várias clínicas, cada uma com seus parceiros); transporte/lanche com custo; módulo de cobrança.

## 7. Perguntas em aberto (a resolver)

- ❓ **Modelo do "instituto com desconto"**: o parceiro paga o valor cheio do exame (modelo teto/dívida) ou paga um valor com desconto? O desconto muda o valor debitado do teto?
- ❓ **Papéis**: quem cadastra paciente e gera QR (parceiro vs. clínica)? Quem opera o scanner?
- ❓ **Autorizador**: como funciona a etapa de autorização — aprova a parceria uma vez, ou aprova cada lote de pacientes/exames?
- ❓ **Usos do QR**: repensar o modelo de 3 usos / transporte / lanche.
- ❓ **Cobrança**: como será o fechamento e a emissão de cobrança (fatura/extrato)? — *deixado para depois.*

## 8. O que já existe no código (baseline)

- Backend Express + SQLite. Tabelas: `partners` (com `budget_limit`, `status`), `patients`, `exams`, `qr_codes` (com `max_uses`, `allow_transport/snack/exam`), `qr_usage_log`, `payments`.
- Frontend React + Vite + Tailwind. Áreas: Clínica (Visão Geral pronta), Parceiro, Scanner (+ histórico).
- QR: expiração 72h + bloqueio de parceiro já validados.
- **Pendente:** telas da Clínica (Cotas, Autorizações, Financeiro, Suporte); `budget.js` existe mas não está montado.
