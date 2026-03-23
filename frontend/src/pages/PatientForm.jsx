import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const EXAM_OPTIONS = [
  { name: 'Ressonância Magnética', value: 500 },
  { name: 'Tomografia', value: 350 },
  { name: 'Mamografia', value: 120 },
  { name: 'Raio-X', value: 80 },
  { name: 'Densitometria Óssea', value: 100 },
  { name: 'Ultrassom', value: 150 },
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ExamField({ index, exam, onChange }) {
  function handleSelect(e) {
    const option = EXAM_OPTIONS.find(o => o.name === e.target.value)
    onChange({ exam_name: option?.name || '', exam_type: exam.exam_type, value: option?.value || '' })
  }

  return (
    <div className="bg-surface-container-low border border-surface-container-high rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 glass-gradient rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">{index + 1}</span>
        </div>
        <h3 className="font-semibold text-on-surface text-sm">Exame {index + 1}</h3>
      </div>

      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo de Exame</label>
        <select
          value={exam.exam_name}
          onChange={handleSelect}
          className="w-full border border-outline-variant bg-surface rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          required
        >
          <option value="">Selecione um exame</option>
          {EXAM_OPTIONS.map(o => (
            <option key={o.name} value={o.name}>
              {o.name} — {fmt(o.value)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Indicação / Tipo</label>
          <input
            type="text"
            value={exam.exam_type}
            onChange={(e) => onChange({ ...exam, exam_type: e.target.value })}
            className="w-full border border-outline-variant bg-surface rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Ex: Preventivo, Diagnóstico..."
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Valor</label>
          <div className="w-full border border-surface-container-high bg-surface-container rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface">
            {exam.value ? fmt(exam.value) : <span className="text-on-surface-variant">—</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PatientForm() {
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [numExams, setNumExams] = useState(1)
  const [exams, setExams] = useState([
    { exam_name: '', exam_type: '', value: '' },
    { exam_name: '', exam_type: '', value: '' },
  ])
  const [budget, setBudget] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.getBudget().then(setBudget).catch(() => {})
  }, [])

  function formatCpf(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }

  const activeExams = exams.slice(0, numExams)
  const total = activeExams.reduce((s, e) => s + (parseFloat(e.value) || 0), 0)
  const overBudget = budget && budget.blocked

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (overBudget) {
      setError('Emissão bloqueada. Realize o pagamento para prosseguir.')
      return
    }
    setLoading(true)
    try {
      const { id } = await api.createPatient({ name, cpf, exams: activeExams })
      navigate(`/patients/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Novo Paciente</h1>
          <p className="text-on-surface-variant text-sm">Preencha os dados e selecione os exames</p>
        </div>
      </div>

      {/* Budget status */}
      {budget && (
        <div className={`rounded-2xl px-4 py-3.5 mb-5 flex items-center gap-3 border ${
          budget.blocked
            ? 'bg-error-container/40 border-error/20'
            : 'bg-surface-container-low border-surface-container-high'
        }`}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: budget.blocked ? '#ba1a1a' : '#3525cd' }}>
            {budget.blocked ? 'block' : 'account_balance_wallet'}
          </span>
          <p className={`text-sm font-medium ${budget.blocked ? 'text-error' : 'text-primary'}`}>
            {budget.blocked
              ? `Emissão bloqueada — saldo devedor: ${fmt(budget.amountDue)}`
              : `Saldo disponível: ${fmt(budget.available)} de ${fmt(budget.limit)}`}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-6 space-y-5">
        {/* Name & CPF */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-outline-variant bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Nome do paciente"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className="w-full border border-outline-variant bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono"
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
        </div>

        {/* Number of exams */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Quantidade de Exames</label>
          <div className="flex gap-2">
            {[1, 2].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNumExams(n)}
                className={`px-5 py-2 rounded-xl text-sm font-medium border transition ${
                  numExams === n
                    ? 'glass-gradient text-white border-transparent shadow-sm'
                    : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {n} exame{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Exam fields */}
        <div className="space-y-3">
          {Array.from({ length: numExams }).map((_, i) => (
            <ExamField
              key={i}
              index={i}
              exam={exams[i]}
              onChange={(updated) => {
                const next = [...exams]
                next[i] = updated
                setExams(next)
              }}
            />
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between rounded-2xl px-5 py-4 soft-bg-gradient border border-primary/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>calculate</span>
            <span className="text-sm font-medium text-on-surface">Total dos exames</span>
          </div>
          <span className="font-bold text-xl text-primary">{fmt(total)}</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
            <p className="text-on-error-container text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 border border-outline-variant text-on-surface-variant py-3 rounded-xl text-sm hover:bg-surface-container transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || overBudget}
            className="flex-1 glass-gradient text-white font-semibold py-3 rounded-xl text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cadastrando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                Cadastrar Paciente
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
