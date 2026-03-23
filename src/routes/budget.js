import { getDB } from '../database/db.js'

const DEFAULT_LIMIT = parseFloat(process.env.BUDGET_LIMIT || '2000')

export function getPartnerBudget(partnerId) {
  const db = getDB()

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId)
  if (!partner) return null

  const committed = db.prepare(`
    SELECT COALESCE(SUM(e.value), 0) as total
    FROM qr_codes qr
    JOIN patients p ON p.id = qr.patient_id
    JOIN exams e ON e.patient_id = p.id
    WHERE p.partner_id = ? AND qr.status IN ('active', 'exhausted')
  `).get(partnerId).total

  const paid = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE partner_id = ?'
  ).get(partnerId).total

  const currentCommitted = committed - paid
  const limit = partner.budget_limit
  const available = limit - currentCommitted
  const blockedByClinic = partner.status === 'blocked'
  const budgetBlocked = currentCommitted >= limit

  return {
    limit,
    committed: currentCommitted,
    paid,
    available,
    blocked: blockedByClinic || budgetBlocked,
    blockedByClinic,
    budgetBlocked,
    amountDue: budgetBlocked ? currentCommitted : 0,
    percentUsed: Math.min((currentCommitted / limit) * 100, 999)
  }
}
