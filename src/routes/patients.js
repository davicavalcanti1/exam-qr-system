import { Router } from 'express'
import { getDB } from '../database/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const db = getDB()
  const patients = db.prepare(`
    SELECT
      p.id, p.name, p.cpf, p.created_at,
      COALESCE(SUM(e.value), 0) as total_value,
      COUNT(e.id) as exam_count,
      qr.id as qr_id,
      qr.status as qr_status,
      qr.uses_count as qr_uses,
      qr.max_uses as qr_max_uses
    FROM patients p
    LEFT JOIN exams e ON e.patient_id = p.id
    LEFT JOIN qr_codes qr ON qr.patient_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all()
  res.json(patients)
})

router.get('/:id', requireAuth, (req, res) => {
  const db = getDB()
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })

  const exams = db.prepare('SELECT * FROM exams WHERE patient_id = ?').all(req.params.id)
  const qrCode = db.prepare('SELECT * FROM qr_codes WHERE patient_id = ?').get(req.params.id)
  let usageLog = []
  if (qrCode) {
    usageLog = db.prepare(
      'SELECT use_type, used_at FROM qr_usage_log WHERE qr_code_id = ? ORDER BY used_at'
    ).all(qrCode.id)
  }

  res.json({ ...patient, exams, qrCode, usageLog })
})

router.post('/', requireAuth, (req, res) => {
  const db = getDB()
  const { name, cpf, exams } = req.body

  if (!name || !cpf) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios' })
  }
  const cleanCpf = cpf.replace(/\D/g, '')
  if (cleanCpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido' })
  }
  if (!Array.isArray(exams) || exams.length !== 2) {
    return res.status(400).json({ error: 'Exatamente 2 exames são necessários' })
  }
  for (const exam of exams) {
    if (!exam.exam_name || !exam.exam_type || exam.value == null || exam.value <= 0) {
      return res.status(400).json({ error: 'Todos os campos de exame são obrigatórios e o valor deve ser positivo' })
    }
  }

  const existing = db.prepare('SELECT id FROM patients WHERE cpf = ?').get(cleanCpf)
  if (existing) {
    return res.status(400).json({ error: 'CPF já cadastrado no sistema' })
  }

  const insertPatient = db.transaction(() => {
    const result = db.prepare('INSERT INTO patients (name, cpf) VALUES (?, ?)').run(name.trim(), cleanCpf)
    const pid = result.lastInsertRowid
    for (const exam of exams) {
      db.prepare(
        'INSERT INTO exams (patient_id, exam_name, exam_type, value) VALUES (?, ?, ?, ?)'
      ).run(pid, exam.exam_name.trim(), exam.exam_type.trim(), parseFloat(exam.value))
    }
    return pid
  })

  const id = insertPatient()
  res.status(201).json({ id, message: 'Paciente cadastrado com sucesso' })
})

router.delete('/:id', requireAuth, (req, res) => {
  const db = getDB()
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(req.params.id)
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' })
  db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id)
  res.json({ message: 'Paciente removido com sucesso' })
})

export default router
