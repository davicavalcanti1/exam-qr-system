import { Router } from 'express'
import QRCode from 'qrcode'
import { getDB } from '../database/db.js'
import { requireAuth } from '../middleware/auth.js'
import { generateQRToken } from '../utils/qrToken.js'

const router = Router()
const BUDGET_LIMIT = parseFloat(process.env.BUDGET_LIMIT || '2000')

// committed = total de exames com QR gerado
// paid = total de pagamentos realizados
// current_committed = committed - paid
// available = BUDGET_LIMIT - current_committed
// blocked = current_committed >= BUDGET_LIMIT (available <= 0)
export function getBudgetStatus(db) {
  const committed = db.prepare(`
    SELECT COALESCE(SUM(e.value), 0) as total
    FROM qr_codes qr
    JOIN exams e ON e.patient_id = qr.patient_id
    WHERE qr.status IN ('active', 'exhausted')
  `).get().total

  const paid = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments'
  ).get().total

  const currentCommitted = committed - paid
  const available = BUDGET_LIMIT - currentCommitted
  const blocked = currentCommitted >= BUDGET_LIMIT

  return {
    limit: BUDGET_LIMIT,
    committed: currentCommitted,
    paid,
    available,
    blocked,
    amountDue: blocked ? currentCommitted : 0
  }
}

router.get('/budget', requireAuth, (req, res) => {
  res.json(getBudgetStatus(getDB()))
})

router.post('/generate/:patientId', requireAuth, (req, res) => {
  const db = getDB()
  const patientId = parseInt(req.params.patientId)

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const existingQR = db.prepare('SELECT id FROM qr_codes WHERE patient_id = ?').get(patientId)
  if (existingQR) return res.status(400).json({ error: 'QR Code já gerado para este paciente' })

  const budget = getBudgetStatus(db)

  // Se já está bloqueado (saldo esgotado), não permite novo QR
  if (budget.blocked) {
    return res.status(400).json({
      error: 'Emissão bloqueada. Realize o pagamento do saldo devedor para prosseguir.',
      blocked: true
    })
  }

  const examTotal = db.prepare(
    'SELECT COALESCE(SUM(value), 0) as total FROM exams WHERE patient_id = ?'
  ).get(patientId).total

  // Permite overflow: se available > 0, aprova mesmo que o exame ultrapasse o limite
  // Se available <= 0, já estaria bloqueado acima
  // Gera QR e o saldo pode ir negativo — na próxima tentativa estará bloqueado

  const insertResult = db.prepare(
    `INSERT INTO qr_codes (patient_id, token, status) VALUES (?, 'pending', 'active')`
  ).run(patientId)
  const qrId = insertResult.lastInsertRowid

  const token = generateQRToken(qrId, patientId)
  db.prepare('UPDATE qr_codes SET token = ? WHERE id = ?').run(token, qrId)

  // Calcula novo estado do saldo após esta aprovação
  const newCommitted = budget.committed + examTotal
  const willBlock = newCommitted >= BUDGET_LIMIT

  QRCode.toDataURL(token, { width: 350, margin: 2, errorCorrectionLevel: 'H' }, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar imagem do QR Code' })
    res.json({ qrId, dataUrl, token, willBlock, overflowAmount: Math.max(0, newCommitted - BUDGET_LIMIT) })
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
