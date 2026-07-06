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
  const auth = req.headers.authorization
  console.log('requireClinic - Auth header:', auth ? '✓ Present' : '✗ Missing')

  const user = extractUser(req)
  if (!user) {
    console.log('requireClinic - Token extraction failed')
    return res.status(403).json({ error: 'Token inválido ou não fornecido' })
  }
  if (user.role !== 'clinic') {
    console.log('requireClinic - Role mismatch:', user.role)
    return res.status(403).json({ error: 'Acesso restrito à clínica' })
  }
  console.log('requireClinic - ✓ Valid clinic')
  req.user = user
  next()
}

export function requirePartner(req, res, next) {
  const auth = req.headers.authorization
  console.log('requirePartner - Auth header:', auth ? '✓ Present' : '✗ Missing')

  const user = extractUser(req)
  if (!user) {
    console.log('requirePartner - Token extraction failed')
    return res.status(403).json({ error: 'Token inválido ou não fornecido' })
  }
  if (user.role !== 'partner') {
    console.log('requirePartner - Role mismatch:', user.role)
    return res.status(403).json({ error: 'Acesso restrito a parceiros' })
  }
  console.log('requirePartner - ✓ Valid partner:', user.partnerId)
  req.user = user
  next()
}
