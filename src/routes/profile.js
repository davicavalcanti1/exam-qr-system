import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDB } from '../database/db.js'
import { requirePartner } from '../middleware/auth.js'

const router = Router()
router.use(requirePartner)

// Perfil do próprio parceiro logado
router.get('/me', (req, res) => {
  const db = getDB()
  const partner = db.prepare(
    'SELECT id, name, email, budget_limit, status, created_at FROM partners WHERE id = ?'
  ).get(req.user.partnerId)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })
  res.json(partner)
})

// Atualiza nome e/ou e-mail do próprio parceiro
router.put('/me', (req, res) => {
  const db = getDB()
  const partnerId = req.user.partnerId
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  const name = (req.body.name ?? partner.name).trim()
  const email = (req.body.email ?? partner.email).trim().toLowerCase()

  if (!name) return res.status(400).json({ error: 'O nome não pode ficar vazio' })
  if (!email) return res.status(400).json({ error: 'O e-mail não pode ficar vazio' })

  const clash = db.prepare('SELECT id FROM partners WHERE email = ? AND id != ?').get(email, partnerId)
  if (clash) return res.status(400).json({ error: 'Este e-mail já está em uso por outro parceiro' })

  db.prepare('UPDATE partners SET name = ?, email = ? WHERE id = ?').run(name, email, partnerId)
  res.json({ message: 'Perfil atualizado', name, email })
})

// Troca de senha (exige a senha atual)
router.put('/password', async (req, res) => {
  const db = getDB()
  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.user.partnerId)
  if (!partner) return res.status(404).json({ error: 'Parceiro não encontrado' })

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha' })
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' })
  }

  const ok = await bcrypt.compare(currentPassword, partner.password_hash)
  if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' })

  const hash = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE partners SET password_hash = ? WHERE id = ?').run(hash, partner.id)
  res.json({ message: 'Senha alterada com sucesso' })
})

export default router
