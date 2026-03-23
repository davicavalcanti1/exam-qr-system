import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDB } from '../database/db.js'
import { requireClinic } from '../middleware/auth.js'
import { getPartnerBudget } from './budget.js'

const router = Router()
router.use(requireClinic)

// ── Overview stats ──────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDB()
  const partners = db.prepare('SELECT * FROM partners ORDER BY created_at DESC').all()

  const stats = partners.map(p => ({ ...p, budget: getPartnerBudget(p.id) }))

  const totalBudgetAllocated = stats.reduce((s, p) => s + p.budget.limit, 0)
  const totalCommitted = stats.reduce((s, p) => s + p.budget.committed, 0)
  const atRisk = stats.filter(p => p.budget.percentUsed >= 80 && !p.budget.blocked).length
  const blocked = stats.filter(p => p.budget.blocked).length

  res.json({
    totalPartners: partners.length,
    activePartners: partners.filter(p => p.status === 'active').length,
    totalBudgetAllocated,
    totalCommitted,
    atRisk,
    blocked,
    partners: stats
  })
})

// ── List partners ───────────────────────────────────────────────
router.get('/partners', (req, res) => {
  const db = getDB()
  const partners = db.prepare('SELECT * FROM partners ORDER BY name').all()
  const result = partners.map(p => ({
    ...p,
    password_hash: undefined,
    budget: getPartnerBudget(p.id)
  }))
  res.json(result)
})

// ── Create partner ──────────────────────────────────────────────
router.post('/partners', async (req, res) => {
  const { name, email, password, budget_limit } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
  }

  const db = getDB()
  const existing = db.prepare('SELECT id FROM partners WHERE email = ?').get(email)
  if (existing) return res.status(400).json({ error: 'Email já cadastrado' })

  const hash = await bcrypt.hash(password, 10)
  const result = db.prepare(
    'INSERT INTO partners (name, email, password_hash, budget_limit) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), email.trim().toLowerCase(), hash, parseFloat(budget_limit) || 2000)

  res.status(201).json({ id: result.lastInsertRowid, message: 'Parceiro criado com sucesso' })
})

// ── Get partner detail ──────────────────────────────────────────
router.get('/partners/:id', (req, res) => {
  const db = getDB()
  const partner = db.prepare('SELECT id, name, email, budget_limit, status, created_at FROM partners WHERE id = ?').get(req.params.id)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  const patients = db.prepare(`
    SELECT p.id, p.name, p.cpf, p.created_at,
      COALESCE(SUM(e.value), 0) as total_value,
      qr.id as qr_id, qr.status as qr_status, qr.uses_count as qr_uses, qr.max_uses as qr_max_uses
    FROM patients p
    LEFT JOIN exams e ON e.patient_id = p.id
    LEFT JOIN qr_codes qr ON qr.patient_id = p.id
    WHERE p.partner_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(req.params.id)

  const paymentHistory = db.prepare(
    'SELECT * FROM payments WHERE partner_id = ? ORDER BY paid_at DESC'
  ).all(req.params.id)

  res.json({ ...partner, budget: getPartnerBudget(partner.id), patients, paymentHistory })
})

// ── Update partner ──────────────────────────────────────────────
router.put('/partners/:id', async (req, res) => {
  const db = getDB()
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  const { name, email, budget_limit, password } = req.body
  let hash = partner.password_hash

  if (password) {
    hash = await bcrypt.hash(password, 10)
  }

  db.prepare(
    'UPDATE partners SET name = ?, email = ?, budget_limit = ?, password_hash = ? WHERE id = ?'
  ).run(
    name?.trim() || partner.name,
    email?.trim().toLowerCase() || partner.email,
    parseFloat(budget_limit) || partner.budget_limit,
    hash,
    req.params.id
  )

  res.json({ message: 'Parceiro atualizado' })
})

// ── Block / Unblock partner ─────────────────────────────────────
router.patch('/partners/:id/toggle-block', (req, res) => {
  const db = getDB()
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  const newStatus = partner.status === 'blocked' ? 'active' : 'blocked'
  db.prepare('UPDATE partners SET status = ? WHERE id = ?').run(newStatus, req.params.id)

  res.json({
    message: newStatus === 'blocked' ? 'Parceiro bloqueado' : 'Parceiro desbloqueado',
    status: newStatus
  })
})

// ── Delete partner ──────────────────────────────────────────────
router.delete('/partners/:id', (req, res) => {
  const db = getDB()
  const partner = db.prepare('SELECT id FROM partners WHERE id = ?').get(req.params.id)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id)
  res.json({ message: 'Parceiro removido' })
})

export default router
