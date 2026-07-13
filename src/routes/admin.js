import { Router } from 'express'
import { supabaseAdmin, getCaller } from '../lib/supabaseAdmin.js'

const router = Router()
const EMAIL_DOMAIN = 'exameqr.app'
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ExameQR@123'
const CREATABLE_ROLES = ['empresa_admin', 'parceiro_coordenador', 'parceiro_funcionario']

// Cria um usuário da hierarquia (auth + profile) via service role.
// Regras de quem cria quem + escopo por empresa/parceiro.
router.post('/users', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })

  const { nome, username, role, empresaId, parceiroId, senha } = req.body || {}
  if (!nome || !username || !role) return res.status(400).json({ error: 'nome, username e role são obrigatórios' })
  if (!CREATABLE_ROLES.includes(role)) return res.status(400).json({ error: 'role inválido (owner é criado só via dashboard)' })

  const p = c.profile
  let empresa_id = empresaId || null
  let parceiro_id = parceiroId || null

  if (role === 'empresa_admin') {
    if (p.role !== 'owner') return res.status(403).json({ error: 'Apenas o owner cria administrador de empresa' })
    if (!empresa_id) return res.status(400).json({ error: 'empresaId é obrigatório' })
    parceiro_id = null
  } else if (role === 'parceiro_coordenador') {
    if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })
    if (p.role === 'empresa_admin') empresa_id = p.empresa_id
    if (!empresa_id || !parceiro_id) return res.status(400).json({ error: 'empresaId e parceiroId são obrigatórios' })
  } else { // parceiro_funcionario
    if (p.role === 'parceiro_coordenador') { empresa_id = p.empresa_id; parceiro_id = p.parceiro_id }
    else if (p.role === 'empresa_admin') { empresa_id = p.empresa_id }
    else if (p.role !== 'owner') return res.status(403).json({ error: 'Sem permissão' })
    if (!empresa_id || !parceiro_id) return res.status(400).json({ error: 'empresaId e parceiroId são obrigatórios' })
  }

  const uname = String(username).trim().toLowerCase().replace(/\s+/g, '.')
  const email = `${uname}@${EMAIL_DOMAIN}`

  const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha || DEFAULT_PASSWORD,
    email_confirm: true,
    // o trigger handle_new_user cria o profile a partir destes metadados
    user_metadata: { nome: String(nome).trim(), username: uname, role, empresa_id, parceiro_id, must_change_password: true },
  })
  if (cErr) return res.status(400).json({ error: cErr.message })

  // upsert reconcilia com a linha que o trigger já criou (garante os valores exatos)
  const { error: pErr } = await supabaseAdmin.from('profiles').upsert({
    id: created.user.id, nome: String(nome).trim(), username: uname, email,
    role, empresa_id, parceiro_id, must_change_password: true,
  }, { onConflict: 'id' })
  if (pErr) {
    // rollback do auth user se o profile falhar
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
    return res.status(400).json({ error: pErr.message })
  }

  res.status(201).json({ id: created.user.id, username: uname, email, senha_inicial: senha || DEFAULT_PASSWORD })
})

// Cria um parceiro (organização) dentro de uma empresa.
router.post('/parceiros', async (req, res) => {
  const c = await getCaller(req)
  if (c.error) return res.status(c.status).json({ error: c.error })
  const p = c.profile
  if (!['owner', 'empresa_admin'].includes(p.role)) return res.status(403).json({ error: 'Sem permissão' })

  const { nome, cnpj, teto, empresaId } = req.body || {}
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' })
  const empresa_id = p.role === 'owner' ? empresaId : p.empresa_id
  if (!empresa_id) return res.status(400).json({ error: 'empresaId é obrigatório' })

  const { data, error } = await supabaseAdmin.from('parceiros')
    .insert({ empresa_id, nome: String(nome).trim(), cnpj: cnpj || null, teto: teto || 2000 })
    .select('id').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ id: data.id })
})

export default router
