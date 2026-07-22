# Roteiro de teste — Confirmação de exames em lote (link + WhatsApp)

Fluxo: **funcionário da IMAGO agenda → gera 1 link → parceiro confirma pelo WhatsApp com login.**
Neste fluxo o **teto é ignorado** (decisão de produto); a autorização normal continua com a trava.

## Pré-requisitos (uma vez)
- [ ] Migration `20260721120000_autorizacao_lotes.sql` aplicada (`supabase db push`) + **redeploy**.
- [ ] Env do backend: `UAZAPI_URL` e `UAZAPI_TOKEN` setados (senão o envio automático não roda — dá pra testar copiando o link).
- [ ] Existe **1 parceiro** com:
  - [ ] um **coordenador** (parceiro_coordenador) com **login e senha** que funcionam;
  - [ ] **WhatsApp** cadastrado (Parceiros → expandir o parceiro → campo WhatsApp → Salvar). Use um número seu pra receber o teste.
- [ ] O catálogo da empresa tem ao menos 1 exame com preço.

## Parte 1 — Funcionário da IMAGO agenda (empresa_admin)
1. Entre como **admin da empresa**.
2. **Agendamentos** → cadastre 2–3 pacientes com exames para **esse parceiro** (salva como *aguardando autorização*).
   - ✅ Esperado: some do formulário e passa a existir como pendente.

## Parte 2 — Gerar o link (aba Confirmações)
3. Vá em **Confirmações** (menu lateral).
4. Selecione o **parceiro** → aparece a lista dos exames aguardando.
5. Marque **Selecionar todos** (ou alguns) → **Gerar link (N)**.
   - ✅ Esperado: card "Link de confirmação gerado" com o link + botão **Copiar**.
   - ✅ WhatsApp: "✅ enviado ao parceiro" (se uazapi + número ok) **ou** "⚠️ não enviado (motivo)" → nesse caso **Copiar** e mandar manual.
   - ✅ Esses exames somem da lista (já entraram num lote).

## Parte 3 — Parceiro confirma (link público)
6. Abra o link em **aba anônima** (ou no celular que recebeu o WhatsApp): `/autorizar/<token>`.
   - ✅ Esperado: marca da clínica no topo + lista (paciente · exame · valor) + total.
7. Faça **login com o usuário/senha do coordenador** daquele parceiro → **Confirmar e autorizar (N)**.
   - ✅ Esperado: tela verde "Exames autorizados!".

## Parte 4 — Conferir o resultado (de volta no sistema)
8. Como coordenador (ou admin), veja que os exames agora estão **autorizado**.
9. Confira que a **trava de teto foi ignorada**: se a soma passava do teto do parceiro, mesmo assim autorizou (esperado neste fluxo).
10. **Auditoria** (empresa): deve ter o registro `autorizacao.lote_gerado`.

## Casos de borda (testar rápido)
- **Login errado** (usuário que NÃO é o coordenador desse parceiro) → deve **barrar**: "Este login não é o coordenador responsável por este parceiro."
- **Link já confirmado** → ao reabrir, mostra o estado "autorizado" e não deixa confirmar de novo.
- **Token inválido** (mudar 1 caractere na URL) → "Link inválido ou expirado".

## Se algo falhar
- **WhatsApp não enviou:** confira `UAZAPI_URL`/`UAZAPI_TOKEN` no backend e o número do parceiro (formato aceito: `83 99999-9999` → vira `5583999999999`). Enquanto isso, use **Copiar** e mande manual.
- **"Sem permissão para confirmar":** o login usado não é o coordenador do parceiro do lote.
- **Nada aparece em Confirmações:** os exames precisam estar **aguardando autorização** e **sem lote** (os que já entraram num lote saem da lista).
- **Erro ao gerar link:** confira se a migration foi aplicada e o redeploy foi feito.
