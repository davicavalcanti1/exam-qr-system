# Design técnico — Afiliação de parceiros (N:N) · pós-piloto

**Status:** desenho aprovado (23/jul/2026). **Construir depois de validar o piloto.** Não mexer no fluxo atual até lá.

## Visão
Hoje: a **empresa cria o parceiro** (vínculo 1:1, `parceiros.empresa_id`). Alvo: o **parceiro é uma entidade própria** que se cadastra sozinho, **escolhe empresa(s)** e **solicita afiliação**; a empresa **aprova mediante assinatura de documento**. Um parceiro pode se afiliar a **várias empresas** (N:N).

## Modelo de dados proposto
- **`parceiros`** deixa de ser filho de uma empresa. Campos próprios: nome, tipo_documento/documento, contato, whatsapp, logo/branding. Remover a dependência dura de `empresa_id` (manter como legado durante a migração).
- **`afiliacoes`** (o coração do N:N) — 1 linha por par (parceiro, empresa):
  - `id, parceiro_id, empresa_id`
  - `teto numeric` ← **o teto passa a viver AQUI** (parceiro pode ter teto diferente por empresa)
  - `status` ∈ `solicitada | ativa | recusada | encerrada`
  - `contrato_id` (o documento assinado que ativou), `solicitado_at`, `aprovado_por`, `aprovado_at`
  - unique(`parceiro_id`, `empresa_id`)
- **`contratos`** reaproveitado como o documento de afiliação (assinatura eletrônica já existe).
- **Dados operacionais** (`pacientes`, `exames`, `qr_codes`, `cobrancas`) continuam com `empresa_id` + `parceiro_id` → o par referencia uma `afiliacao`. Pouca ou nenhuma mudança de coluna.

## Fluxo
1. **Parceiro se cadastra** (self-signup; owner pode moderar) → cria a org `parceiros` + 1º usuário `parceiro_coordenador`.
2. **Solicita afiliação**: escolhe a empresa (por nome/slug) → cria `afiliacoes` com `status='solicitada'`.
3. **Empresa revisa**: admin vê as solicitações pendentes → define o **teto** → **aprova assinando o contrato** (gera `contratos`, assinatura eletrônica).
4. Ao assinar → `afiliacoes.status='ativa'` (+ teto + contrato_id). A partir daí o parceiro opera naquela empresa.
5. Encerrar: `status='encerrada'` (mantém histórico).

## Autenticação / tenancy
- Usuário do parceiro pertence ao **parceiro** (não a uma empresa fixa).
- No login, se o parceiro tem **>1 afiliação ativa**, entra o **seletor de empresa** (já decidido: "login único + escolher empresa"). O contexto ativo define qual empresa ele está operando.
- `profiles`: coordenador/funcionário ligam a `parceiro_id`; o `empresa_id` vira **contexto** (a afiliação escolhida), não um campo fixo.

## RLS (impacto)
- Políticas de `pacientes/exames/qr/cobrancas` passam a validar o par (empresa, parceiro) **contra uma afiliação ativa**, em vez de `parceiro.empresa_id`.
- Helper novo: `afiliacao_ativa(empresa_id, parceiro_id)` (SECURITY DEFINER).
- **Trava de teto**: usa `afiliacoes.teto` do par (não mais `parceiros.teto`).

## Migração (sem perder dados)
1. Cria `afiliacoes`. Para cada `parceiro` atual: insere 1 `afiliacao` (parceiro_id, empresa_id = atual, teto = `parceiros.teto`, status `ativa`).
2. Reaponta a trava de teto e as RLS para `afiliacoes`.
3. Mantém `parceiros.empresa_id`/`teto` como legado por 1–2 releases; remove depois.
- `exames`/`pacientes` já têm empresa_id+parceiro_id → nada a migrar nos dados.

## Fases de implementação
- **Fase A — refactor interno (sem mudança de UX):** cria `afiliacoes`, migra 1:1→afiliação, move teto e trava/RLS pra afiliação. Empresa continua "adicionando" parceiro, só que via afiliação nos bastidores.
- **Fase B — solicitação + aprovação por assinatura:** empresa vê pendentes, define teto, aprova assinando o contrato (reusa `contratos`).
- **Fase C — cadastro independente + multi-empresa:** parceiro self-signup, busca/escolhe empresa, solicita; usuário do parceiro com seletor de empresa (multi-afiliação).

## Riscos / decisões em aberto
- **Descoberta da empresa** pelo parceiro: por slug/código de convite da empresa? (evita spam de solicitações a empresas erradas). Recomendado: empresa gera um **código/link de convite**; ou busca por nome com aprovação obrigatória.
- **Moderação do owner** no self-signup de parceiros (anti-spam).
- **Branding do parceiro** (`parceiros.logo_url/nome_exibicao`, já existe) segue por parceiro — ok no N:N.
- **Cobrança**: continua por (empresa, parceiro) — o lote já é por parceiro dentro da empresa; compatível.

## Pré-requisitos
Depende do login por e-mail + seletor de empresa (Fase 3 de contas). Casa com a arquitetura futura já registrada.
