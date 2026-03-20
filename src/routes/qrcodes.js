import { Router } from 'express'
import QRCode from 'qrcode'
import { getDB } from '../database/db.js'
import { requireAuth } from '../middleware/auth.js'
import { generateQRToken } from '../utils/qrToken.js'

const router = Router()
const BUDGET_LIMIT = parseFloat(process.env.BUDGET_LIMIT || '2000')

function getCommittedBudget(db) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(e.value), 0) as committed
    FROM qr_codes qr
    JOIN exams e ON e.patient_id = qr.patient_id
    WHERE qr.status IN ('active', 'exhausted')
  `).get()
  return result.committed
}

router.get('/budget', requireAuth, (req, res) => {
  const db = getDB()
  const committed = getCommittedBudget(db)
  res.json({
    limit: BUDGET_LIMIT,
    committed,
    available: BUDGET_LIMIT - committed
  })
})

router.post('/generate/:patientId', requireAuth, (req, res) => {
  const db = getDB()
  const patientId = parseInt(req.params.patientId)

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const existingQR = db.prepare('SELECT id FROM qr_codes WHERE patient_id = ?').get(patientId)
  if (existingQR) return res.status(400).json({ error: 'QR Code já gerado para este paciente' })

  const examTotal = db.prepare(
    'SELECT COALESCE(SUM(value), 0) as total FROM exams WHERE patient_id = ?'
  ).get(patientId)
  const total = examTotal.total

  const committed = getCommittedBudget(db)
  const available = BUDGET_LIMIT - committed

  if (total > available) {
    return res.status(400).json({
      error: `Saldo insuficiente. Disponível: R$ ${available.toFixed(2)}, necessário: R$ ${total.toFixed(2)}`
    })
  }

  // Insert placeholder to get ID
  const insertResult = db.prepare(
    `INSERT INTO qr_codes (patient_id, token, status) VALUES (?, 'pending', 'active')`
  ).run(patientId)
  const qrId = insertResult.lastInsertRowid

  // Generate signed token with the actual DB id
  const token = generateQRToken(qrId, patientId)
  db.prepare('UPDATE qr_codes SET token = ? WHERE id = ?').run(token, qrId)

  QRCode.toDataURL(token, { width: 350, margin: 2, errorCorrectionLevel: 'H' }, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar imagem do QR Code' })
    res.json({ qrId, dataUrl, token })
  })
})

router.get('/image/:patientId', requireAuth, (req, res) => {
  const db = getDB()
  const qr = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(req.params.patientId)
  if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' })

  QRCode.toDataURL(qr.token, { width: 350, margin: 2, errorCorrectionLevel: 'H' }, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar imagem' })
    res.json({ dataUrl, status: qr.status, uses_count: qr.uses_count, max_uses: qr.max_uses })
  })
})

export default router
