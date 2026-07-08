import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDB } from '../database/db.js'
import { requirePartner, requireCoordenador } from '../middleware/auth.js'

const router = Router()

// Resolve as credenciais do usuário logado (coordenador = tabela partners,
// funcionário = tabela partner_users).
function currentCreds(db, user) {
  if (user.userId) {
    const row = db.prepare('SELECT * FROM partner_users WHERE id = ?').get(user.userId)
    return row ? { table: 'partner_users', row } : null
  }
  const row = db.prepare('SELECT * FROM partners WHERE id = ?').get(user.partnerId)
  return row ? { table: 'partners', row } : null
}

// Verifica se um e-mail já está em uso (em partners OU partner_users), ignorando o próprio.
function emailTaken(db, email, exclude) {
  const p = db.prepare('SELECT id FROM partners WHERE email = ?').get(email)
  if (p && !(exclude?.table === 'partners' && exclude.id === p.id)) return true
  const u = db.prepare('SELECT id FROM partner_users WHERE email = ?').get(email)
  if (u && !(exclude?.table === 'partner_users' && exclude.id === u.id)) return true
  return false
}

// ── Perfil do usuário logado ────────────────────────────────────
router.get('/me', requirePartner, (req, res) => {
  const db = getDB()
  const creds = currentCreds(db, req.user)
  if (!creds) return res.status(404).json({ error: 'Usuário não encontrado' })

  const org = db.prepare('SELECT budget_limit, status FROM partners WHERE id = ?').get(req.user.partnerId)
  res.json({
    name: creds.row.name,
    email: creds.row.email,
    role: req.user.partnerRole || 'coordenador',
    partnerName: req.user.partnerName,
    budget_limit: org?.budget_limit,
    status: org?.status,
    created_at: creds.row.created_at,
  })
})

router.put('/me', requirePartner, (req, res) => {
  const db = getDB()
  const creds = currentCreds(db, req.user)
  if (!creds) return res.status(404).json({ error: 'Usuário não encontrado' })

  const name = (req.body.name ?? creds.row.name).trim()
  const email = (req.body.email ?? creds.row.email).trim().toLowerCase()
  if (!name) return res.status(400).json({ error: 'O nome não pode ficar vazio' })
  if (!email) return res.status(400).json({ error: 'O e-mail não pode ficar vazio' })
  if (emailTaken(db, email, { table: creds.table, id: creds.row.id })) {
    return res.status(400).json({ error: 'Este e-mail já está em uso' })
  }

  db.prepare(`UPDATE ${creds.table} SET name = ?, email = ? WHERE id = ?`).run(name, email, creds.row.id)
  res.json({ message: 'Perfil atualizado', name, email })
})

router.put('/password', requirePartner, async (req, res) => {
  const db = getDB()
  const creds = currentCreds(db, req.user)
  if (!creds) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Informe a senha atual e a nova senha' })
  if (String(newPassword).length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' })

  const ok = await bcrypt.compare(currentPassword, creds.row.password_hash)
  if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' })

  const hash = await bcrypt.hash(newPassword, 10)
  db.prepare(`UPDATE ${creds.table} SET password_hash = ? WHERE id = ?`).run(hash, creds.row.id)
  res.json({ message: 'Senha alterada com sucesso' })
})

// ── Funcionários (somente o coordenador) ────────────────────────
router.get('/staff', requireCoordenador, (req, res) => {
  const db = getDB()
  const staff = db.prepare(
    'SELECT id, name, email, role, created_at FROM partner_users WHERE partner_id = ? ORDER BY created_at DESC'
  ).all(req.user.partnerId)
  res.json(staff)
})

router.post('/staff', requireCoordenador, async (req, res) => {
  const db = getDB()
  const name = (req.body.name || '').trim()
  const email = (req.body.email || '').trim().toLowerCase()
  const password = req.body.password || ''

  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' })
  if (emailTaken(db, email)) return res.status(400).json({ error: 'Este e-mail já está em uso' })

  const hash = await bcrypt.hash(password, 10)
  const result = db.prepare(
    "INSERT INTO partner_users (partner_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'funcionario')"
  ).run(req.user.partnerId, name, email, hash)
  res.status(201).json({ id: result.lastInsertRowid, message: 'Funcionário criado' })
})

router.delete('/staff/:id', requireCoordenador, (req, res) => {
  const db = getDB()
  const staff = db.prepare('SELECT id FROM partner_users WHERE id = ? AND partner_id = ?').get(req.params.id, req.user.partnerId)
  if (!staff) return res.status(404).json({ error: 'Funcionário não encontrado' })
  db.prepare('DELETE FROM partner_users WHERE id = ?').run(req.params.id)
  res.json({ message: 'Funcionário removido' })
})

export default router
