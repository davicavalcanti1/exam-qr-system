import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDB } from '../database/db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-MUDE-EM-PRODUCAO'
const CLINIC_EMAIL = process.env.CLINIC_EMAIL || 'clinica@exameqr.com'
const CLINIC_PASSWORD = process.env.CLINIC_PASSWORD || 'clinica123'

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  // Check clinic admin first
  if (email === CLINIC_EMAIL) {
    if (password !== CLINIC_PASSWORD) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    const token = jwt.sign({ role: 'clinic', name: 'Clínica' }, JWT_SECRET, { expiresIn: '12h' })
    return res.json({ token, role: 'clinic' })
  }

  // Check partner
  const db = getDB()
  const partner = db.prepare('SELECT * FROM partners WHERE email = ?').get(email)
  if (!partner) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const valid = await bcrypt.compare(password, partner.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const token = jwt.sign(
    { role: 'partner', partnerId: partner.id, partnerName: partner.name },
    JWT_SECRET,
    { expiresIn: '12h' }
  )
  res.json({ token, role: 'partner', partnerId: partner.id, partnerName: partner.name })
})

router.get('/verify', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ valid: false })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    res.json({ valid: true, role: payload.role, partnerId: payload.partnerId, partnerName: payload.partnerName })
  } catch {
    res.status(401).json({ valid: false })
  }
})

export default router
