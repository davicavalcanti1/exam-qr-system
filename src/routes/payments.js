import { Router } from 'express'
import { getDB } from '../database/db.js'
import { requireAuth } from '../middleware/auth.js'
import { getBudgetStatus } from './qrcodes.js'

const router = Router()

// Gera código Pix falso no formato EMV (copia e cola)
function generateFakePixCode(amount) {
  const amountStr = amount.toFixed(2)
  const merchantName = 'EXAMEQR SAUDE LTDA'
  const merchantCity = 'SAO PAULO'
  const txId = Math.random().toString(36).substring(2, 15).toUpperCase()

  // Formato simplificado que parece um código Pix real
  const pixKey = `exameqr@pagamento.com.br`
  const payload = [
    '000201',
    '010212',
    `26${String(14 + pixKey.length + 10).padStart(2, '0')}0014BR.GOV.BCB.PIX01${String(pixKey.length).padStart(2, '0')}${pixKey}`,
    '52040000',
    '5303986',
    `54${String(amountStr.length).padStart(2, '0')}${amountStr}`,
    '5802BR',
    `59${String(merchantName.length).padStart(2, '0')}${merchantName}`,
    `60${String(merchantCity.length).padStart(2, '0')}${merchantCity}`,
    `62${String(txId.length + 4).padStart(2, '0')}05${String(txId.length).padStart(2, '0')}${txId}`,
    '6304',
  ].join('')

  // CRC16 simples (fake mas parecido)
  const fakeCrc = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')
  return payload + fakeCrc
}

// Inicia pagamento — retorna método e dados (Pix ou Cartão)
router.post('/initiate', requireAuth, (req, res) => {
  const { method } = req.body
  if (!['pix', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Método inválido. Use "pix" ou "card".' })
  }

  const db = getDB()
  const budget = getBudgetStatus(db)

  if (!budget.blocked) {
    return res.status(400).json({ error: 'Não há saldo devedor no momento.' })
  }

  const amount = budget.amountDue

  if (method === 'pix') {
    return res.json({
      method: 'pix',
      amount,
      pixCode: generateFakePixCode(amount),
      pixKey: 'exameqr@pagamento.com.br',
      beneficiary: 'ExameQR Saúde Ltda',
      instructions: 'Copie o código, abra seu banco e cole em Pix → Copia e Cola'
    })
  }

  // Cartão
  return res.json({
    method: 'card',
    amount,
    instructions: 'Insira ou aproxime o cartão na maquineta'
  })
})

// Confirma pagamento (registra no banco)
router.post('/confirm', requireAuth, (req, res) => {
  const { method } = req.body
  if (!['pix', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Método inválido.' })
  }

  const db = getDB()
  const budget = getBudgetStatus(db)

  if (!budget.blocked) {
    return res.status(400).json({ error: 'Não há saldo devedor para quitar.' })
  }

  db.prepare('INSERT INTO payments (amount, method) VALUES (?, ?)').run(budget.amountDue, method)

  const newBudget = getBudgetStatus(db)
  res.json({ success: true, message: 'Pagamento registrado com sucesso.', budget: newBudget })
})

export default router
