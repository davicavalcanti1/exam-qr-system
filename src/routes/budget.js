import { getDB } from '../database/db.js'

const DEFAULT_LIMIT = parseFloat(process.env.BUDGET_LIMIT || '2000')

export function getPartnerBudget(partnerId) {
  const db = getDB()

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId)
  if (!partner) return null

  // Débito só entra quando o exame é CONFIRMADO — ou seja, quando o uso `exam`
  // do QR é escaneado (registro em qr_usage_log). Gerar o QR não compromete o teto.
  const realized = db.prepare(`
    SELECT COALESCE(SUM(e.value), 0) as total
    FROM patients p
    JOIN qr_codes qr ON qr.patient_id = p.id
    JOIN qr_usage_log ul ON ul.qr_code_id = qr.id AND ul.use_type = 'exam'
    JOIN exams e ON e.patient_id = p.id
    WHERE p.partner_id = ?
  `).get(partnerId).total

  // Valor de exames com QR emitido mas ainda NÃO confirmado (não conta no teto,
  // serve para a clínica enxergar o que está "a caminho").
  const pending = db.prepare(`
    SELECT COALESCE(SUM(e.value), 0) as total
    FROM patients p
    JOIN qr_codes qr ON qr.patient_id = p.id
    JOIN exams e ON e.patient_id = p.id
    WHERE p.partner_id = ?
      AND qr.status IN ('active', 'exhausted')
      AND NOT EXISTS (
        SELECT 1 FROM qr_usage_log ul
        WHERE ul.qr_code_id = qr.id AND ul.use_type = 'exam'
      )
  `).get(partnerId).total

  const paid = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE partner_id = ?'
  ).get(partnerId).total

  const currentCommitted = realized - paid
  const limit = partner.budget_limit
  const available = limit - currentCommitted
  const blockedByClinic = partner.status === 'blocked'
  const budgetBlocked = currentCommitted >= limit

  return {
    limit,
    committed: currentCommitted, // dívida atual (exames confirmados − pagamentos)
    pending,                     // exames emitidos aguardando confirmação
    paid,
    available,
    blocked: blockedByClinic || budgetBlocked,
    blockedByClinic,
    budgetBlocked,
    amountDue: budgetBlocked ? currentCommitted : 0,
    percentUsed: Math.min((currentCommitted / limit) * 100, 999)
  }
}
