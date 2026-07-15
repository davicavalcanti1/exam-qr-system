# Roteiro de teste — piloto com parceiros

Passo a passo pra validar o ExameQR de ponta a ponta com 1 parceiro real.
Marque cada item; anote onde travar.

## 0. Pré-requisitos (uma vez)
- [ ] Deploy com a versão mais recente + `Ctrl+Shift+R` (limpa cache).
- [ ] `supabase db push` aplicado (todas as migrations).
- [ ] Envs: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (build) e `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` real (backend).
- [ ] NetRis: aba Desenvolvedor → método NetRis, `baseUrl=https://ris.imagoradiologia.com.br/api-gateway`, token, **Integração ativa** + Salvar + Testar conexão ✓.

## 1. Owner monta a empresa
- [ ] Login como owner → cria a **empresa** e o **administrador** dela.

## 2. Empresa configura (login como empresa_admin)
- [ ] **Exames & preços / Desenvolvedor**: cria os exames do catálogo e mapeia cada um a um procedimento NetRis (ex.: Mamografia → 1397).
- [ ] **Desenvolvedor → Parceiros**: mapeia o parceiro ao plano-convênio (ex.: 102 PARTICULAR ONLINE).
- [ ] **Parceiros**: cria o **parceiro** + o **coordenador** dele (anota usuário + senha temporária).
- [ ] **Contratos**: ajusta o modelo e **gera o contrato** do parceiro.

## 3. Coordenador entra pela 1ª vez
- [ ] Login com usuário + senha temporária → **sistema força a troca de senha**.
- [ ] Aba **Contrato** → lê e **assina** (aceite eletrônico).
- [ ] Aba **Funcionários** → cria 1 funcionário (opcional).

## 4. Fluxo do exame
- [ ] **Pacientes** → novo paciente: digita CPF → **Buscar NetRis** (puxa/prepara), marca **consentimento LGPD**, escolhe o exame e um **horário** → Registrar.
- [ ] **Autorizações** (coordenador) → confere o horário pendente → **Autorizar** → aparece "agendado no NetRis (protocolo …)".
- [ ] Conferir no NetRis que entrou como **A CONFIRMAR**.
- [ ] (Opcional) Editar valor/indicação ou **cancelar** o exame pelo lápis.

## 5. Recepção confirma
- [ ] Abrir **/scan** no celular → ler o QR do paciente → vira **realizado** (reflete EXAME_REALIZADO no NetRis).

## 6. Financeiro
- [ ] **Cobranças** → escolhe o parceiro + período → **Calcular** → **Fechar lote** → abre o **Recibo** (imprimir/PDF) → **Marcar paga**.
- [ ] **Auditoria**: confere que autorização, scan, agendamento, contrato e cobrança apareceram na trilha.

## O que observar
- Alguma tela confusa? Algum termo estranho? Algum passo que o parceiro não entendeu sozinho?
- Erros (vermelho/toast) — anotar a mensagem exata.
- Mobile: o parceiro consegue usar no celular?

> Pagamento real (Asaas) fica FORA do piloto — a cobrança é fechada e marcada paga manualmente.
