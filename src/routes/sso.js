import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

/**
 * Consumo do ticket de SSO emitido pelo Controle Operacional.
 *
 * Este endpoint EMITE SESSÃO. É a peça mais sensível deste servidor: se ele for
 * permissivo, ele não tem uma brecha — ele É a brecha.
 *
 * A migration 20260826120000 preparou o banco; aqui está a porta.
 *
 * ── O que é verificado, em ordem ────────────────────────────────────────────
 *   1. assinatura RS256 com a chave PÚBLICA do CO (só ele consegue assinar)
 *   2. `iss` e `aud` exatos — ticket para outro destino não serve aqui
 *   3. validade (o ticket vive 60s)
 *   4. `jti` inédito — o insert em sso_tickets_usados é o anti-replay: dois
 *      consumos simultâneos, um insere e o outro leva 23505
 *   5. tenant do CO mapeado em sso_tenants — sem linha, sem acesso
 *   6. papel traduzido por sso_role_map — sem tradução, sem acesso
 *
 * Só então a sombra é encontrada ou criada, e a sessão emitida.
 *
 * ── Por que a sombra não tem senha ──────────────────────────────────────────
 * E-mail sintético, sem caixa de entrada: não há recuperação de senha. Sem
 * senha: não há login nativo. A única porta é este ticket — e é isso que faz
 * revogar no CO valer aqui na hora seguinte, sem job de sincronia e sem os dois
 * bancos divergirem.
 */

const router = Router()

// PEM tem quebras de linha, e campo de variável de ambiente de painel costuma
// não aceitar — então a chave quase sempre chega com "\n" literal, em uma linha
// só. Sem normalizar, a verificação falha com erro de formato, e todo ticket
// legítimo é recusado como se fosse forjado.
const CHAVE_PUBLICA = (process.env.SSO_CO_PUBLIC_KEY || '').replace(/\\n/g, '\n')
const EMISSOR_ESPERADO = 'controleoperacional'
const AUDIENCIA = process.env.SSO_AUDIENCIA || 'parceiros'

/** Todas as recusas dizem a mesma coisa: distinguir contaria o que existe. */
const RECUSA = { error: 'Sem acesso' }

router.post('/entrar', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado' })
  if (!CHAVE_PUBLICA) {
    // Falha fechada. Nunca "aceita porque não dá para conferir".
    return res.status(503).json({ error: 'SSO não configurado' })
  }

  const ticket = String(req.body?.ticket || '')
  if (!ticket) return res.status(400).json({ error: 'Ticket ausente' })

  let claims
  try {
    claims = jwt.verify(ticket, CHAVE_PUBLICA, {
      algorithms: ['RS256'],          // fixo: sem isto, `alg: none` seria aceito
      issuer: EMISSOR_ESPERADO,
      audience: AUDIENCIA,
    })
  } catch {
    return res.status(401).json(RECUSA)
  }

  const { sub: coUserId, jti, email, nome, co_tenant_id: coTenant, co_roles: coRoles } = claims
  if (!coUserId || !jti || !coTenant) return res.status(401).json(RECUSA)

  // Anti-replay. Antes de qualquer efeito: se o ticket já foi usado, nada mais
  // acontece. A PRIMARY KEY é o mecanismo — não há janela entre checar e gravar.
  const { error: erroReplay } = await supabaseAdmin
    .from('sso_tickets_usados')
    .insert({ jti })
  if (erroReplay) return res.status(401).json(RECUSA)

  // Empresa: só a que estiver mapeada. Derivar do ticket deixaria o emissor
  // escolher em qual clínica provisionar.
  const { data: mapaTenant } = await supabaseAdmin
    .from('sso_tenants')
    .select('empresa_id')
    .eq('co_tenant_id', coTenant)
    .maybeSingle()
  if (!mapaTenant?.empresa_id) return res.status(403).json(RECUSA)

  // Papel: o primeiro dos papéis do CO que tiver tradução. Sem tradução, sem
  // acesso — e `owner` está fora do CHECK da tabela, então é impossível chegar
  // a dono da plataforma por aqui.
  let papel = null
  for (const co of Array.isArray(coRoles) ? coRoles : []) {
    const { data } = await supabaseAdmin
      .from('sso_role_map').select('exameqr_role').eq('co_role', co).maybeSingle()
    if (data?.exameqr_role) { papel = data.exameqr_role; break }
  }
  if (!papel) return res.status(403).json(RECUSA)

  // A sombra. E-mail sintético e determinístico: o mesmo usuário do CO sempre
  // cai na mesma conta daqui.
  const emailSombra = `co.${coUserId}@sso.exameqr.app`

  const { data: perfil } = await supabaseAdmin
    .from('profiles').select('id').eq('co_user_id', coUserId).maybeSingle()

  if (!perfil) {
    const { error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email: emailSombra,
      email_confirm: true,
      user_metadata: {
        origem: 'controleoperacional',
        co_user_id: coUserId,
        role: papel,
        empresa_id: mapaTenant.empresa_id,
        full_name: nome || email || 'Equipe Imago',
        // O trigger usa `email_contato` no lugar do e-mail da conta (que aqui e
        // sintetico). Guardar o e-mail REAL e o que permite perceber depois que
        // a mesma pessoa tem conta nativa e sombra — ver a lista de duplicados
        // na tela de Acesso externo.
        email_contato: email || null,
      },
    })
    // handle_new_user() escreve a profiles a partir deste metadata — ver a
    // migration. Se ele recusar (procedência incoerente), a criação falha aqui
    // com mensagem legível em vez de deixar linha pela metade.
    if (erroCriar) return res.status(403).json(RECUSA)
  } else {
    // Já existe: papel e empresa podem ter mudado no CO desde a última entrada.
    await supabaseAdmin
      .from('profiles')
      .update({ role: papel, empresa_id: mapaTenant.empresa_id })
      .eq('co_user_id', coUserId)
  }

  // Sessão. Mesmo mecanismo do link mágico, sem e-mail no meio: o cliente troca
  // este token de uso único por sessão.
  const { data: link, error: erroLink } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: emailSombra,
  })
  if (erroLink || !link?.properties?.hashed_token) return res.status(403).json(RECUSA)

  res.json({ token_hash: link.properties.hashed_token })
})

export default router
