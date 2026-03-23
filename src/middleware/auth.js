import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-MUDE-EM-PRODUCAO'

function extractUser(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET)
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const user = extractUser(req)
  if (!user) return res.status(401).json({ error: 'Não autorizado' })
  req.user = user
  next()
}

export function requireClinic(req, res, next) {
  const user = extractUser(req)
  if (!user || user.role !== 'clinic') {
    return res.status(403).json({ error: 'Acesso restrito à clínica' })
  }
  req.user = user
  next()
}

export function requirePartner(req, res, next) {
  const user = extractUser(req)
  if (!user || user.role !== 'partner') {
    return res.status(403).json({ error: 'Acesso restrito a parceiros' })
  }
  req.user = user
  next()
}
