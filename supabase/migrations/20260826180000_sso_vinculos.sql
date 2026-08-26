-- =============================================================================
-- Vínculo com conta existente
-- =============================================================================
-- O SSO cria uma SOMBRA para quem chega do Controle Operacional: conta nova,
-- sem senha, com papel traduzido por sso_role_map. Isso é o certo para a
-- equipe — e é errado para quem JÁ tem conta aqui.
--
-- O caso que expôs isso: o dono da plataforma. Ele é `owner` aqui e `developer`
-- lá. Entrando pelo SSO virava `empresa_admin` numa segunda conta, e perdia
-- acesso às próprias áreas de plataforma — inclusive à tela que gerencia este
-- SSO. Duas contas para a mesma pessoa, e a de dentro do sistema sem poder
-- administrar nada.
--
-- ── Por que não resolver pelo mapa de papéis ────────────────────────────────
-- Porque `owner` está fora do CHECK de sso_role_map de propósito: cargo vindo
-- de fora não pode CONCEDER dono da plataforma. Isso continua verdade.
--
-- Aqui a concessão é de outra natureza: não é um cargo que vira owner, é o
-- owner declarando "esta identidade externa pode entrar NA MINHA CONTA". Uma
-- linha por pessoa, criada por quem já é dono, e revogável do mesmo jeito.
--
-- ── O preço, explícito ──────────────────────────────────────────────────────
-- A conta vinculada é nativa: tem senha e recuperação de senha. Então, para
-- ELA, revogar no Controle Operacional deixa de bastar — a porta antiga
-- continua aberta. É aceitável justamente para o dono da plataforma, que não
-- deveria poder ser trancado do lado de fora por um sistema externo; não é
-- aceitável como regra geral, e por isso isto é vínculo pessoa a pessoa, e não
-- uma opção do mapa de papéis.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sso_vinculos (
  -- E-mail da pessoa no sistema de origem. Chave porque é o que quem cadastra
  -- conhece — ninguém sabe de cabeça o uuid de alguém no outro sistema.
  origem_email  text PRIMARY KEY CHECK (origem_email = lower(origem_email)),

  -- Fixado no primeiro uso, a partir do ticket verificado. Trava: se o e-mail
  -- for reaproveitado por outra pessoa lá, o `sub` não bate e o vínculo para de
  -- valer — em vez de entregar a conta ao novo dono daquele e-mail.
  origem_sub    uuid,

  -- Conta DESTE sistema em que a pessoa entra. O papel é o que ela já tem;
  -- nada aqui concede papel.
  destino_email text NOT NULL CHECK (destino_email = lower(destino_email)),

  ativo         boolean NOT NULL DEFAULT true,
  observacao    text,
  ultimo_acesso timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS ligada e nenhuma policy: só o service_role, que vive no servidor. O
-- revoke é cinto de segurança sobre os grants padrão do schema public.
ALTER TABLE public.sso_vinculos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sso_vinculos FROM anon, authenticated;
