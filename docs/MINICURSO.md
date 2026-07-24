# Minicurso ExameQR — roteiros de vídeo

Treinamento em **vídeos curtos (2–4 min)**, focados em **mostrar o sistema funcionando** (não é aula teórica). Duas trilhas: **Empresa** (clínica) e **Parceiro**. Um vídeo de introdução serve às duas.

## Princípios de gravação

- **Curto e direto:** 1 vídeo = 1 tarefa. Se passar de ~4 min, quebre em dois.
- **Mostre, não explique demais:** narração curta acompanhando o clique. A tela é a estrela.
- **Dados fictícios (LGPD):** nunca grave com paciente/CPF reais. Crie um paciente de teste ("Paciente Teste", CPF fictício). Nada de dado sensível real no vídeo.
- **Comece pelo "porquê":** 1 frase de contexto no início ("Aqui você vai marcar um exame para o parceiro autorizar").
- **Termine com o resultado:** mostre o efeito ("pronto, o parceiro já recebeu o link no WhatsApp").
- **Padroniza a tela:** navegador limpo, zoom ~110–125%, tema claro, uma conta de teste por papel.
- **Ferramentas:** qualquer gravador de tela serve (OBS grátis, ou Loom/ScreenPal pra já sair com legenda). Grave em 1080p.
- **Legendas:** se possível, legende — muita gente assiste sem som.

---

## Vídeo 0 — Introdução (comum às duas trilhas) · ⏱️ ~2 min

**Objetivo:** entender em 2 minutos o que o sistema faz e os papéis.

**Roteiro (tela → fala):**
1. Tela de login. *"Este é o ExameQR, o sistema que controla os exames feitos por parceria."*
2. Diagrama simples (slide ou fala): *"A clínica marca o exame → o parceiro autoriza → o paciente recebe um QR Code → na recepção o QR é lido → no fim do mês a clínica fecha a cobrança do parceiro."*
3. *"Cada pessoa vê só o que precisa: a equipe da clínica marca e cobra; o parceiro autoriza e acompanha."*

**Fecho:** *"Nos próximos vídeos, cada passo na prática."*

---

# Trilha EMPRESA (equipe da clínica)

## E1 — Primeiros passos · ⏱️ ~2 min
**Objetivo:** entrar e se localizar no sistema.
**Roteiro:**
1. Login com usuário e senha.
2. Tour da **Visão geral**: KPIs (parceiros, pacientes, autorizados, realizados) e "próximos agendamentos".
3. Menu lateral: mostrar as seções (Agendamentos, Confirmações, Comprovantes, Agenda, Cobranças…).
4. Canto do perfil: **trocar tema (claro/escuro)**, alterar senha, sair.
**Fecho:** *"Agora vamos cadastrar um parceiro."*

## E2 — Cadastrar um parceiro e criar usuários · ⏱️ ~3 min
**Objetivo:** colocar um parceiro no ar com teto e time.
**Roteiro:**
1. Menu **Parceiros → Novo parceiro**.
2. Preencher: nome, tipo (CNPJ/CPF) e documento, **teto** (limite de crédito), **WhatsApp** (onde chega o link de confirmação), e-mail/endereço.
3. Salvar → o parceiro aparece na lista.
4. Expandir o parceiro → **Criar coordenador** (e explicar: coordenador autoriza; funcionário só cadastra).
5. Opcional: **Convidar** por e-mail.
**Fecho:** *"Parceiro pronto. Agora a clínica pode marcar exames pra ele."*

## E3 — Marcar um paciente (agendamento no NetRis) · ⏱️ ~3–4 min
**Objetivo:** o operador marca paciente + exame + horário.
**Roteiro:**
1. Menu **Agendamentos → Novo paciente**.
2. Escolher o **parceiro**.
3. Dados do paciente (nome, CPF) — se o NetRis estiver ativo, usar **"Buscar NetRis"** para puxar quem já existe.
4. Adicionar **exame** (tipo + indicação). *Dica: ao trocar o tipo, a agenda recarrega.*
5. **Ver horários no NetRis** → escolher um horário disponível (mostrar que os reservados ficam acinzentados).
6. Marcar o consentimento LGPD → **Registrar paciente**.
**Fecho:** *"O exame fica aguardando a autorização do parceiro."*

## E4 — Enviar para o parceiro autorizar · ⏱️ ~2 min
**Objetivo:** gerar o link de confirmação em lote.
**Roteiro:**
1. Menu **Confirmações**.
2. Escolher o parceiro → aparecem os exames aguardando.
3. **Selecionar todos** (ou alguns) → **Gerar link**.
4. Mostrar o link gerado + o aviso *"WhatsApp: enviado ao parceiro"* (ou copiar e enviar manual).
**Fecho:** *"O parceiro abre o link no celular e autoriza tudo de uma vez."*

## E5 — Comprovantes (PDF + WhatsApp) · ⏱️ ~2 min
**Objetivo:** entregar o QR ao paciente/parceiro.
**Roteiro:**
1. Menu **Comprovantes** → escolher o parceiro (exames já autorizados).
2. Selecionar pacientes → **Baixar PDF** (mostrar o "ingresso" com o QR).
3. **Enviar ao parceiro** (1 PDF com todos) ou **Enviar a pacientes** (cada um o seu, no WhatsApp).
4. Mostrar também o comprovante individual (abrir um exame → Comprovante → Imprimir / Baixar / WhatsApp).
**Fecho:** *"O paciente chega na recepção com o QR."*

## E6 — Recepção: ler o QR · ⏱️ ~1–2 min
**Objetivo:** validar o exame no balcão.
**Roteiro:**
1. Abrir a tela de **leitura/scan**.
2. Apresentar o QR do paciente (do celular ou impresso) → mostra os **dados do paciente e do exame** (sem preço).
3. Confirmar → o status muda (e no NetRis vai para "Atendimento Recepção").
**Fecho:** *"Exame confirmado. No fim do mês, a cobrança."*

## E7 — Financeiro: fechar cobrança e recibo · ⏱️ ~3 min
**Objetivo:** faturar o parceiro.
**Roteiro:**
1. Menu **Cobranças → Fechar lote**.
2. Escolher parceiro + período → **Calcular** (soma os exames realizados não faturados).
3. **Fechar lote** → aparece na lista.
4. **Recibo** (abrir/imprimir) e **Marcar paga** quando o parceiro pagar.
**Fecho:** *"Ciclo completo: marcou, autorizou, realizou, cobrou."*

## E8 (opcional) — Marca e configurações · ⏱️ ~2 min
**Roteiro:** Detalhe da empresa → editar informações; **Marca (white-label)**: nome de exibição + logo; abas de Consumo/Configurações.

---

# Trilha PARCEIRO

## P1 — Primeiros passos · ⏱️ ~2 min
**Objetivo:** o parceiro se localizar.
**Roteiro:**
1. Login.
2. **Visão geral**: o que está aguardando, financeiro, teto.
3. **Minha marca**: colocar logo e nome de exibição (opcional).
**Fecho:** *"Seu papel principal é autorizar os exames."*

## P2 — Cadastrar paciente · ⏱️ ~2 min
**Objetivo:** registrar um paciente (funcionário ou coordenador).
**Roteiro:**
1. Menu **Pacientes → Novo paciente**.
2. Preencher dados + exame → registrar.
**Fecho:** *"Fica aguardando a autorização do coordenador."*

## P3 — Autorizar exames (fila + teto) · ⏱️ ~3 min
**Objetivo:** o coordenador libera os exames.
**Roteiro:**
1. Menu **Autorizações**.
2. Mostrar a barra de **teto** (comprometido × disponível).
3. Em cada exame: **Autorizar** ou **Recusar**. Explicar que ao autorizar com horário pendente, ele **agenda no NetRis** automaticamente.
4. Mostrar o bloqueio quando o teto é atingido.
**Fecho:** *"Autorizado, a clínica já gera o QR do paciente."*

## P4 — Autorizar pelo link do WhatsApp · ⏱️ ~2 min
**Objetivo:** o fluxo em lote pelo celular.
**Roteiro:**
1. No celular, abrir o **link recebido no WhatsApp**.
2. Ver a lista de pacientes/exames.
3. **Entrar** com usuário e senha → **Confirmar e autorizar** tudo de uma vez.
**Fecho:** *"Prático: autoriza vários pacientes num toque."*

## P5 — Acompanhar (agenda, cobranças, contrato) · ⏱️ ~2 min
**Roteiro:** Agenda (próximos exames); Cobranças (visualizar seus lotes e recibos); Contrato (status/assinatura).

## P6 — Gerenciar funcionários (coordenador) · ⏱️ ~2 min
**Roteiro:** Menu **Funcionários** → criar/convidar funcionário, ativar/desativar, redefinir senha. Explicar: funcionário cadastra, só o coordenador autoriza.

---

## Ordem sugerida de publicação

1. **Vídeo 0 (intro)** — manda pra todo mundo.
2. **Trilha Empresa E1→E7** — pra equipe da clínica.
3. **Trilha Parceiro P1→P4** — pro parceiro (P3 e P4 são os essenciais; P5/P6 são "extras").

> Dica: numere os vídeos no título ("ExameQR • Empresa 03 — Marcar um paciente") e junte cada trilha numa playlist.
