import { Router } from 'express'
import { supabaseAdmin, getCaller } from '../lib/supabaseAdmin.js'

/**
 * Gestão do SSO — quem, de fora, entra aqui e como.
 *
 * Duas tabelas, e a diferença entre elas importa:
 *
 *   sso_tenants   — de qual sistema externo, para qual empresa daqui.
 *                   Sem linha, aquele sistema não entra. É o interruptor.
 *   sso_role_map  — cargo de lá vira qual papel aqui.
 *                   Sem tradução, a pessoa não entra, mesmo com tenant mapeado.
 *
 * ── Por que fica AQUI, e não no painel do sistema de origem ─────────────────
 * Porque é este produto que decide quem entra nele. Se a tela morasse no
 * Controle Operacional, ele precisaria da service_role deste banco — e o
 * sistema interno da Imago passaria a ter poder sobre a autorização de um
 * produto vendido a outras clínicas. A separação dos dois bancos existe
 * justamente para isso não acontecer.
 *
 * Restrito a `owner`: não é decisão de administrador de clínica, é decisão de
 * quem opera a plataforma. `empresa_admin` gerencia a própria empresa; conceder
 * acesso a um sistema externo inteiro é outra coisa.
 */

const router = Router()

async function somenteOwner(req, res) {
  const c = await getCaller(req)
  if (c.error) { res.status(c.status).json({ error: c.error }); return null }
  if (c.profile?.role !== 'owner') { res.status(403).json({ error: 'Somente owner' }); return null }
  return c
}

// ── Tenants ────────────────────────────────────────────────────────────────

router.get('/tenants', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const { data, error } = await supabaseAdmin
    .from('sso_tenants')
    .select('co_tenant_id, empresa_id, criado_em, empresas(nome)')
    .order('criado_em')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ tenants: data ?? [] })
})

router.post('/tenants', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const co_tenant_id = String(req.body?.co_tenant_id || '').trim()
  const empresa_id = String(req.body?.empresa_id || '').trim()
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(co_tenant_id) || !uuid.test(empresa_id)) {
    return res.status(400).json({ error: 'Identificadores inválidos' })
  }
  const { error } = await supabaseAdmin
    .from('sso_tenants')
    .upsert({ co_tenant_id, empresa_id }, { onConflict: 'co_tenant_id' })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

router.delete('/tenants/:coTenantId', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  // Corta o acesso na hora: sem a linha, o próximo ticket daquele sistema é
  // recusado. Sessões já emitidas seguem até expirar — quem precisa cortar
  // agora, corta no sistema de origem, que é onde a pessoa existe.
  const { error } = await supabaseAdmin
    .from('sso_tenants').delete().eq('co_tenant_id', req.params.coTenantId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Mapa de papéis ─────────────────────────────────────────────────────────

router.get('/papeis', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const { data, error } = await supabaseAdmin
    .from('sso_role_map').select('co_role, exameqr_role').order('co_role')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ papeis: data ?? [] })
})

router.post('/papeis', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const co_role = String(req.body?.co_role || '').trim()
  const bruto = String(req.body?.exameqr_role || '').trim()
  if (!co_role) return res.status(400).json({ error: 'Cargo de origem vazio' })

  // Vazio = "sem tradução" = sem acesso. É como se desliga um cargo sem apagar
  // a linha, preservando o registro de que ele já foi considerado.
  const exameqr_role = bruto || null

  // `owner` não é validado aqui: o CHECK da tabela já o recusa, de propósito.
  // Deixar a validação no banco significa que nem um UPDATE manual erra isso.
  const { error } = await supabaseAdmin
    .from('sso_role_map').upsert({ co_role, exameqr_role }, { onConflict: 'co_role' })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Vinculos com conta existente ───────────────────────────────────────────
// Quem tem vinculo entra NA conta que ja tem, com o papel dela, em vez de
// ganhar uma sombra. E como o dono da plataforma continua dono ao entrar pelo
// sistema — sem que cargo nenhum de fora conceda isso.

router.get('/vinculos', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const { data, error } = await supabaseAdmin
    .from('sso_vinculos')
    .select('origem_email, destino_email, ativo, ultimo_acesso, observacao')
    .order('origem_email')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ vinculos: data ?? [] })
})

router.post('/vinculos', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const origem_email = String(req.body?.origem_email || '').trim().toLowerCase()
  const destino_email = String(req.body?.destino_email || '').trim().toLowerCase()
  const observacao = String(req.body?.observacao || '').trim() || null
  const eEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  if (!eEmail.test(origem_email) || !eEmail.test(destino_email)) {
    return res.status(400).json({ error: 'E-mail inválido' })
  }

  // A conta de destino precisa existir: vincular para um e-mail sem conta
  // criaria um vinculo que so falha na hora de usar, e o erro apareceria longe
  // daqui.
  //
  // Sem `maybeSingle()`, de proposito: ele ERRA quando encontra mais de uma
  // linha, e mais de uma e o caso NORMAL aqui — a pessoa costuma ter a conta
  // nativa e a sombra criada pelo SSO, as duas com o mesmo e-mail. Com
  // maybeSingle o retorno vinha nulo e a tela dizia "nao existe conta com esse
  // e-mail" justamente para quem tem duas. Foi o que aconteceu na primeira
  // tentativa real.
  const { data: candidatos, error: erroBusca } = await supabaseAdmin
    .from('profiles').select('id, role, co_user_id').eq('email', destino_email)
  if (erroBusca) return res.status(500).json({ error: erroBusca.message })

  // Vincular para a conta NATIVA: a sombra e o que estamos deixando de usar.
  const nativas = (candidatos ?? []).filter(c => !c.co_user_id)
  if (nativas.length === 0) {
    return res.status(400).json({
      error: (candidatos ?? []).length
        ? 'Esse e-mail só tem conta criada pelo acesso externo. Vincule para uma conta nativa.'
        : 'Não existe conta com esse e-mail aqui',
    })
  }
  if (nativas.length > 1) {
    return res.status(400).json({ error: 'Há mais de uma conta nativa com esse e-mail — resolva a duplicidade antes de vincular' })
  }
  const destino = nativas[0]

  const { error } = await supabaseAdmin
    .from('sso_vinculos')
    .upsert({ origem_email, destino_email, observacao, ativo: true }, { onConflict: 'origem_email' })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true, papel_destino: destino.role })
})

router.delete('/vinculos/:origemEmail', async (req, res) => {
  if (!await somenteOwner(req, res)) return
  const { error } = await supabaseAdmin
    .from('sso_vinculos').delete().eq('origem_email', String(req.params.origemEmail).toLowerCase())
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// ── Pessoas com conta nativa E sombra ──────────────────────────────────────
// Quem ja tinha conta aqui antes do SSO acaba com duas: a nativa, com senha, e
// a sombra criada na primeira entrada pelo sistema de origem. Sao pessoas
// diferentes para o banco — id diferente, historico separado — e a duplicidade
// so apareceria por acaso, numa listagem, meses depois.
//
// Esta lista existe para que ela apareca de proposito.
router.get('/duplicados', async (req, res) => {
  if (!await somenteOwner(req, res)) return

  const { data: sombras, error: e1 } = await supabaseAdmin
    .from('profiles')
    .select('id, nome, email, role, co_user_id')
    .not('co_user_id', 'is', null)
  if (e1) return res.status(500).json({ error: e1.message })

  const emails = (sombras ?? []).map(s => s.email).filter(Boolean)
  if (emails.length === 0) return res.json({ duplicados: [] })

  const { data: nativos, error: e2 } = await supabaseAdmin
    .from('profiles')
    .select('id, nome, email, role')
    .is('co_user_id', null)
    .in('email', emails)
  if (e2) return res.status(500).json({ error: e2.message })

  const porEmail = new Map((nativos ?? []).map(n => [n.email, n]))
  const duplicados = (sombras ?? [])
    .filter(s => porEmail.has(s.email))
    .map(s => ({ email: s.email, sombra: s, nativo: porEmail.get(s.email) }))

  res.json({ duplicados })
})

export default router
