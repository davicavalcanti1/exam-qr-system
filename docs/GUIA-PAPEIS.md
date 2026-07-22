# Guia rápido por papel — ExameQR

Um guia curto por tipo de usuário. Linguagem direta pra treinamento.
Regras que valem pra todos: **no 1º acesso troque a senha** · **o paciente nunca vê preço** · em dúvida, fale com o suporte.

---

## 👑 Coordenação da clínica (Administrador)
**Quem é:** você administra a clínica dentro do ExameQR.

**O que você faz:**
- **Parceiros:** cadastrar parceiro, definir o **teto** (limite de crédito) e o **WhatsApp** dele.
- **Exames & preços:** manter o catálogo (exame + valor).
- **Cobranças:** fechar o **lote** do período → gerar **recibo** → **marcar pago** (libera o teto do parceiro).
- **Contratos, Configurações e Consumo.**

**Passo a passo principal — fechar cobrança:**
1. Menu **Cobranças** → escolha o **parceiro** e o **período** → **Calcular**.
2. Confira os exames realizados → **Fechar lote**.
3. **Ver recibo** (imprime/PDF) → quando o parceiro pagar, **Marcar paga**.

**Dica:** o **teto padrão** e o **período de cobrança** ficam em **Configurações** e já vêm preenchidos ao criar parceiro/fechar lote.

---

## 🗓️ Operador da clínica (marca os exames)
**Quem é:** você marca os exames que o parceiro vai autorizar.

**O que você faz (só isso):** **Agendamentos** e **Confirmações**.

**Passo a passo:**
1. **Agendamentos** → escolha o **parceiro** → preencha o paciente (com o **consentimento LGPD** marcado) → adicione os **exames** → salvar. Repita para cada paciente.
2. Quando terminar, vá em **Confirmações** → escolha o parceiro → **Selecionar todos** → **Gerar link**.
3. O parceiro recebe **1 mensagem no WhatsApp** com o link. (Se não enviar, use **Copiar** e mande você.)

**Você não vê:** cobranças, configurações nem gestão de parceiros — e tudo bem, não é seu trabalho.

**Dica:** gere **um único link** com vários pacientes de uma vez — assim o parceiro recebe uma mensagem só.

---

## ✅ Parceiro (Coordenador)
**Quem é:** o responsável pelo parceiro. **Você autoriza os exames** — é isso que compromete o seu teto.

**O que você faz:**
- **Autorizar** exames (2 jeitos): pelo **link do WhatsApp** ou dentro do app em **Autorizações**.
- Ver **quanto já usou** (barra de teto na Visão geral), suas **cobranças** (leitura), **contrato** e sua **marca**.

**Passo a passo — autorizar pelo link:**
1. Abra o **link** que chegou no WhatsApp.
2. Confira a lista de pacientes/exames → **entre com seu usuário e senha** → **Confirmar e autorizar**.

**Passo a passo — autorizar no app:**
1. Menu **Autorizações** → **Autorizar** cada exame (o sistema respeita o teto).

**Dica:** pelo **link**, autoriza tudo (a clínica já organizou); **no app**, trava quando atinge o teto.

---

## 👤 Funcionário do parceiro
**Quem é:** você cadastra e consulta pacientes do parceiro.

**O que você faz:** **Pacientes** → novo paciente (nome, CPF, **consentimento LGPD** e os exames).

**Você não faz aqui:** autorizar (isso é o coordenador) nem ver cobranças.

**Dica:** sempre marque o **consentimento** — sem ele o sistema não deixa salvar.

---

## 🖥️ Recepção (leitura do QR)
**Quem é:** quem confirma o exame na hora que o paciente chega.

**O que faz:** abrir a página **/scan** no computador/celular → apontar para o **QR do paciente**.
- Ao ler, o exame é **confirmado** (e o valor é debitado do parceiro) e o paciente entra como **"em atendimento na recepção"** no NetRis.
- A tela mostra **paciente e exame** — **nunca o preço**.

**Dica:** cada QR vale **uma vez**; se já foi lido, aparece "QR já utilizado".
