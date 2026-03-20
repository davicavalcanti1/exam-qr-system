import { Router } from 'express'
import { getDB } from '../database/db.js'
import { verifyQRToken } from '../utils/qrToken.js'

const router = Router()

const USE_TYPES = ['transport', 'snack', 'exam']
const USE_LABELS = {
  transport: 'Transporte',
  snack: 'Lanche',
  exam: 'Exame'
}

// Public route — no auth required (used by staff at checkpoints)
router.post('/validate', (req, res) => {
  const { token, useType } = req.body

  if (!token || !useType) {
    return res.status(400).json({ valid: false, error: 'Token e tipo de uso são obrigatórios' })
  }
  if (!USE_TYPES.includes(useType)) {
    return res.status(400).json({ valid: false, error: 'Tipo de uso inválido' })
  }

  // Step 1: verify HMAC signature
  const payload = verifyQRToken(token)
  if (!payload) {
    return res.json({
      valid: false,
      error: 'QR Code inválido — não pertence a este sistema ou foi adulterado'
    })
  }

  const db = getDB()

  // Step 2: find in database (double-check token matches)
  const qr = db.prepare(
    'SELECT * FROM qr_codes WHERE id = ? AND token = ?'
  ).get(payload.qid, token)

  if (!qr) {
    return res.json({ valid: false, error: 'QR Code não encontrado no banco de dados' })
  }

  if (qr.status === 'exhausted') {
    return res.json({ valid: false, error: 'QR Code esgotado — todas as 3 utilizações já foram consumidas' })
  }
  if (qr.status === 'revoked') {
    return res.json({ valid: false, error: 'QR Code revogado' })
  }

  // Step 3: check if this use type was already consumed
  const usageLog = db.prepare(
    'SELECT use_type, used_at FROM qr_usage_log WHERE qr_code_id = ? ORDER BY used_at'
  ).all(qr.id)

  const alreadyUsed = usageLog.find(u => u.use_type === useType)
  if (alreadyUsed) {
    return res.json({
      valid: false,
      error: `Este QR Code já foi utilizado para "${USE_LABELS[useType]}"`,
      usageLog
    })
  }

  // Step 4: record the usage
  db.prepare('INSERT INTO qr_usage_log (qr_code_id, use_type) VALUES (?, ?)').run(qr.id, useType)

  const newCount = qr.uses_count + 1
  const newStatus = newCount >= qr.max_uses ? 'exhausted' : 'active'
  db.prepare('UPDATE qr_codes SET uses_count = ?, status = ? WHERE id = ?').run(newCount, newStatus, qr.id)

  const patient = db.prepare('SELECT name, cpf FROM patients WHERE id = ?').get(qr.patient_id)
  const exams = db.prepare(
    'SELECT exam_name, exam_type, value FROM exams WHERE patient_id = ?'
  ).all(qr.patient_id)
  const updatedLog = db.prepare(
    'SELECT use_type, used_at FROM qr_usage_log WHERE qr_code_id = ? ORDER BY used_at'
  ).all(qr.id)

  res.json({
    valid: true,
    useType,
    useLabel: USE_LABELS[useType],
    patient,
    exams,
    usesCount: newCount,
    maxUses: qr.max_uses,
    isExhausted: newStatus === 'exhausted',
    remainingUses: qr.max_uses - newCount,
    usageLog: updatedLog
  })
})

export default router
