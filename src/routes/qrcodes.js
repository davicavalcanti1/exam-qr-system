import { Router } from 'express'
import QRCode from 'qrcode'
import { getDB } from '../database/db.js'
import { requirePartner } from '../middleware/auth.js'
import { generateQRToken } from '../utils/qrToken.js'
import { getPartnerBudget } from './budget.js'

const router = Router()
router.use(requirePartner)

router.get('/budget', (req, res) => {
  const budget = getPartnerBudget(req.user.partnerId)
  if (!budget) return res.status(404).json({ error: 'Parceiro não encontrado' })
  res.json(budget)
})

router.post('/generate/:patientId', (req, res) => {
  const db = getDB()
  const partnerId = req.user.partnerId
  const patientId = parseInt(req.params.patientId)

  const patient = db.prepare(
    'SELECT * FROM patients WHERE id = ? AND partner_id = ?'
  ).get(patientId, partnerId)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const existingQR = db.prepare('SELECT id FROM qr_codes WHERE patient_id = ?').get(patientId)
  if (existingQR) return res.status(400).json({ error: 'QR Code já gerado para este paciente' })

  const budget = getPartnerBudget(partnerId)

  if (budget.blockedByClinic) {
    return res.status(403).json({
      error: 'Emissão bloqueada pela clínica. Entre em contato para regularização.',
      blockedByClinic: true
    })
  }

  if (budget.budgetBlocked) {
    return res.status(400).json({
      error: 'Saldo esgotado. Realize o pagamento para prosseguir.',
      blocked: true
    })
  }

  const examTotal = db.prepare(
    'SELECT COALESCE(SUM(value), 0) as total FROM exams WHERE patient_id = ?'
  ).get(patientId).total

  const insertResult = db.prepare(
    `INSERT INTO qr_codes (patient_id, token, status) VALUES (?, 'pending', 'active')`
  ).run(patientId)
  const qrId = insertResult.lastInsertRowid

  const token = generateQRToken(qrId, patientId)
  db.prepare('UPDATE qr_codes SET token = ? WHERE id = ?').run(token, qrId)

  const newCommitted = budget.committed + examTotal
  const willBlock = newCommitted >= budget.limit

  QRCode.toDataURL(token, { width: 350, margin: 2, errorCorrectionLevel: 'H' }, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar imagem do QR Code' })
    res.json({ qrId, dataUrl, token, willBlock })
  })
})

router.get('/image/:patientId', (req, res) => {
  const db = getDB()
  const patient = db.prepare(
    'SELECT id FROM patients WHERE id = ? AND partner_id = ?'
  ).get(req.params.patientId, req.user.partnerId)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const qr = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(patient.id)
  if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' })

  QRCode.toDataURL(qr.token, { width: 350, margin: 2, errorCorrectionLevel: 'H' }, (err, dataUrl) => {
    if (err) return res.status(500).json({ error: 'Erro ao gerar imagem' })
    res.json({ dataUrl, status: qr.status, uses_count: qr.uses_count, max_uses: qr.max_uses })
  })
})

// Revoke QR Code
router.delete('/revoke/:patientId', (req, res) => {
  const db = getDB()
  const patient = db.prepare(
    'SELECT id FROM patients WHERE id = ? AND partner_id = ?'
  ).get(req.params.patientId, req.user.partnerId)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const qr = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(patient.id)
  if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' })
  if (qr.status === 'revoked') return res.status(400).json({ error: 'QR Code já revogado' })

  db.prepare('UPDATE qr_codes SET status = ? WHERE id = ?').run('revoked', qr.id)
  res.json({ message: 'QR Code revogado com sucesso' })
})

export default router
