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
    onChange({ exam_name: option?.name || '', exam_type: '', value: option?.value || '' })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Exame {index + 1}</h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tipo de Exame</label>
        <select
          value={exam.exam_name}
          onChange={handleSelect}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-xs text-gray-500 mb-1">Indicação / Tipo</label>
          <input
            type="text"
            value={exam.exam_type}
            onChange={(e) => onChange({ ...exam, exam_type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Preventivo, Diagnóstico..."
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor</label>
          <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 font-medium">
            {exam.value ? fmt(exam.value) : '—'}
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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Novo Paciente</h1>
      </div>

      {budget && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border ${budget.blocked ? 'bg-red-50 border-red-300 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {budget.blocked
            ? `⚠️ Emissão bloqueada — saldo devedor: ${fmt(budget.amountDue)}`
            : `Saldo disponível: ${fmt(budget.available)} de ${fmt(budget.limit)}`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do paciente"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
        </div>

        {/* Número de exames */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Exames</label>
          <div className="flex gap-3">
            {[1, 2].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNumExams(n)}
                className={`px-5 py-2 rounded-lg text-sm font-medium border transition ${numExams === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {n} exame{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Campos de exame */}
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
        <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-gray-50 border border-gray-200">
          <span className="text-sm text-gray-600">Total dos exames:</span>
          <span className="font-bold text-lg text-gray-800">{fmt(total)}</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || overBudget}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar Paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}
