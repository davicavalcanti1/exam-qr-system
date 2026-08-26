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

export default router
