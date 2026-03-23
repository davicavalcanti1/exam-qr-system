import { Router } from 'express'
import { getDB } from '../database/db.js'
import { requirePartner } from '../middleware/auth.js'
import { getPartnerBudget } from './budget.js'

const router = Router()
router.use(requirePartner)

function generateFakePixCode(amount) {
  const amountStr = amount.toFixed(2)
  const pixKey = 'exameqr@pagamento.com.br'
  const merchantName = 'EXAMEQR SAUDE LTDA'
  const merchantCity = 'SAO PAULO'
  const txId = Math.random().toString(36).substring(2, 15).toUpperCase()
  const fakeCrc = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')

  return [
    '000201', '010212',
    `26${String(14 + pixKey.length + 10).padStart(2, '0')}0014BR.GOV.BCB.PIX01${String(pixKey.length).padStart(2, '0')}${pixKey}`,
    '52040000', '5303986',
    `54${String(amountStr.length).padStart(2, '0')}${amountStr}`,
    '5802BR',
    `59${String(merchantName.length).padStart(2, '0')}${merchantName}`,
    `60${String(merchantCity.length).padStart(2, '0')}${merchantCity}`,
    `62${String(txId.length + 4).padStart(2, '0')}05${String(txId.length).padStart(2, '0')}${txId}`,
    '6304' + fakeCrc
  ].join('')
}

router.get('/history', (req, res) => {
  const db = getDB()
  const history = db.prepare(
    'SELECT * FROM payments WHERE partner_id = ? ORDER BY paid_at DESC'
  ).all(req.user.partnerId)
  res.json(history)
})

router.post('/initiate', (req, res) => {
  const { method } = req.body
  if (!['pix', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Método inválido' })
  }

  const budget = getPartnerBudget(req.user.partnerId)
  if (!budget || !budget.budgetBlocked) {
    return res.status(400).json({ error: 'Não há saldo devedor no momento' })
  }

  const amount = budget.amountDue

  if (method === 'pix') {
    return res.json({
      method: 'pix',
      amount,
      pixCode: generateFakePixCode(amount),
      pixKey: 'exameqr@pagamento.com.br',
      beneficiary: 'ExameQR Saúde Ltda',
      instructions: 'Abra seu banco → Pix → Copia e Cola'
    })
  }

  return res.json({ method: 'card', amount })
})

router.post('/confirm', (req, res) => {
  const { method } = req.body
  if (!['pix', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Método inválido' })
  }

  const partnerId = req.user.partnerId
  const budget = getPartnerBudget(partnerId)
  if (!budget?.budgetBlocked) {
    return res.status(400).json({ error: 'Não há saldo devedor para quitar' })
  }

  getDB().prepare(
    'INSERT INTO payments (partner_id, amount, method) VALUES (?, ?, ?)'
  ).run(partnerId, budget.amountDue, method)

  res.json({ success: true, message: 'Pagamento registrado', budget: getPartnerBudget(partnerId) })
})

export default router
