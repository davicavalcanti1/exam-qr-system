import { Router } from 'express'
import QRCode from 'qrcode'
import { getDB } from '../database/db.js'
import { requirePartner } from '../middleware/auth.js'
import { generateQRToken } from '../utils/qrToken.js'
import { getPartnerBudget } from './budget.js'
import { generateReceipt } from '../utils/receiptGenerator.js'

const router = Router()
router.use(requirePartner)

// Specific routes FIRST (before :parameterized routes)
router.get('/budget', (req, res) => {
  const budget = getPartnerBudget(req.user.partnerId)
  if (!budget) return res.status(404).json({ error: 'Parceiro não encontrado' })
  res.json(budget)
})

// Parameterized routes AFTER specific ones
router.post('/generate/:patientId', async (req, res) => {
  try {
    const db = getDB()
    const partnerId = req.user.partnerId
    const patientId = parseInt(req.params.patientId)
    const { allowTransport, allowSnack, allowExam } = req.body

    // Check partner status
    const partner = db.prepare('SELECT status FROM partners WHERE id = ?').get(partnerId)
    if (!partner) return res.status(403).json({ error: 'Parceiro não encontrado' })
    if (partner.status === 'blocked') {
      return res.status(403).json({ error: 'Seu acesso foi bloqueado. Entre em contato com o suporte.' })
    }

    const patient = db.prepare(
      'SELECT * FROM patients WHERE id = ? AND partner_id = ?'
    ).get(patientId, partnerId)
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

    // Allow regeneration: revoke old QR if it exists
    const existingQR = db.prepare('SELECT id FROM qr_codes WHERE patient_id = ?').get(patientId)
    if (existingQR) {
      db.prepare('UPDATE qr_codes SET status = ? WHERE id = ?').run('revoked', existingQR.id)
    }

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

    let qrId, token
    if (existingQR) {
      // Update existing QR code
      qrId = existingQR.id
      token = generateQRToken(qrId, patientId)
      db.prepare(
        'UPDATE qr_codes SET token = ?, status = ?, uses_count = 0, allow_transport = ?, allow_snack = ?, allow_exam = ? WHERE id = ?'
      ).run(token, 'active', allowTransport ? 1 : 0, allowSnack ? 1 : 0, allowExam ? 1 : 0, qrId)
    } else {
      // Create new QR code
      const insertResult = db.prepare(
        `INSERT INTO qr_codes (patient_id, token, status, allow_transport, allow_snack, allow_exam) VALUES (?, ?, 'active', ?, ?, ?)`
      ).run(patientId, 'temp-token-placeholder', allowTransport ? 1 : 0, allowSnack ? 1 : 0, allowExam ? 1 : 0)
      qrId = insertResult.lastInsertRowid
      token = generateQRToken(qrId, patientId)
      db.prepare('UPDATE qr_codes SET token = ? WHERE id = ?').run(token, qrId)
    }

    const newCommitted = budget.committed + examTotal
    const willBlock = newCommitted >= budget.limit

    const dataUrl = await QRCode.toDataURL(token, { width: 350, margin: 2, errorCorrectionLevel: 'H' })
    res.json({
      qrId,
      dataUrl,
      token,
      willBlock,
      permissions: {
        transport: allowTransport ? 1 : 0,
        snack: allowSnack ? 1 : 0,
        exam: allowExam ? 1 : 0
      }
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    res.status(500).json({ error: 'Erro ao gerar imagem do QR Code' })
  }
})

router.get('/image/:patientId', async (req, res) => {
  try {
    const db = getDB()
    const patient = db.prepare(
      'SELECT id FROM patients WHERE id = ? AND partner_id = ?'
    ).get(req.params.patientId, req.user.partnerId)
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

    const qr = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(patient.id)
    if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' })

    const dataUrl = await QRCode.toDataURL(qr.token, { width: 350, margin: 2, errorCorrectionLevel: 'H' })
    res.json({ dataUrl, status: qr.status, uses_count: qr.uses_count, max_uses: qr.max_uses })
  } catch (error) {
    console.error('Erro ao gerar imagem:', error)
    res.status(500).json({ error: 'Erro ao gerar imagem' })
  }
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

// Generate Receipt PDF
router.get('/receipt/:patientId', async (req, res) => {
  try {
    const db = getDB()
    const partnerId = req.user.partnerId
    const patientId = parseInt(req.params.patientId)

    // Fetch patient
    const patient = db.prepare(
      'SELECT * FROM patients WHERE id = ? AND partner_id = ?'
    ).get(patientId, partnerId)
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

    // Fetch QR code
    const qr = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(patientId)
    if (!qr) return res.status(404).json({ error: 'QR Code não encontrado' })
    if (qr.status !== 'active') return res.status(400).json({ error: 'QR Code não está ativo' })

    // Fetch exams
    const exams = db.prepare('SELECT * FROM exams WHERE patient_id = ?').all(patientId)
    if (exams.length === 0) return res.status(400).json({ error: 'Nenhum exame autorizado' })

    // Generate PDF
    const pdfBuffer = await generateReceipt(patient, exams, qr.token)

    // Send as download
    res.contentType('application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="recibo_${patient.id}_${new Date().getTime()}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Erro ao gerar recibo:', error)
    res.status(500).json({ error: 'Erro ao gerar recibo em PDF' })
  }
})

export default router
