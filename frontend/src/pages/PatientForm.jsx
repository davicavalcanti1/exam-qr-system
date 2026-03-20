import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const EXAM_OPTIONS = [
  { name: 'Hemograma Completo', value: 35 },
  { name: 'Glicose', value: 15 },
  { name: 'Colesterol Total', value: 20 },
  { name: 'Triglicerídeos', value: 20 },
  { name: 'TSH', value: 45 },
  { name: 'T4 Livre', value: 45 },
  { name: 'Ureia e Creatinina', value: 30 },
  { name: 'Ácido Úrico', value: 20 },
  { name: 'TGO / TGP', value: 40 },
  { name: 'Raio-X Tórax', value: 80 },
  { name: 'Raio-X Coluna', value: 90 },
  { name: 'Ultrassom Abdominal', value: 150 },
  { name: 'Ultrassom Pélvico', value: 150 },
  { name: 'Eletrocardiograma', value: 60 },
  { name: 'Ecocardiograma', value: 200 },
  { name: 'Tomografia Crânio', value: 350 },
  { name: 'Tomografia Abdômen', value: 380 },
  { name: 'Ressonância Magnética', value: 500 },
  { name: 'Endoscopia Digestiva', value: 250 },
  { name: 'Colonoscopia', value: 300 },
  { name: 'Mamografia', value: 120 },
  { name: 'Densitometria Óssea', value: 100 },
  { name: 'Exame de Urina EAS', value: 20 },
  { name: 'Exame de Fezes', value: 25 },
  { name: 'Outro', value: 0 },
]

const EXAM_TYPES = [
  'Preventivo', 'Diagnóstico', 'Terapêutico', 'Controle', 'Urgência', 'Rotina'
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ExamField({ index, exam, onChange }) {
  function handleNameChange(e) {
    const selected = EXAM_OPTIONS.find(o => o.name === e.target.value)
    onChange({ ...exam, exam_name: e.target.value, value: selected ? selected.value : exam.value })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Exame {index + 1}</h3>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nome do Exame</label>
        <select
          value={exam.exam_name}
          onChange={handleNameChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Selecione um exame</option>
          {EXAM_OPTIONS.map(o => (
            <option key={o.name} value={o.name}>{o.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <input
            list={`exam-types-${index}`}
            value={exam.exam_type}
            onChange={(e) => onChange({ ...exam, exam_type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Preventivo"
            required
          />
          <datalist id={`exam-types-${index}`}>
            {EXAM_TYPES.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor (R$)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={exam.value}
            onChange={(e) => onChange({ ...exam, value: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>
    </div>
  )
}

export default function PatientForm() {
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [exams, setExams] = useState([
    { exam_name: '', exam_type: '', value: '' },
    { exam_name: '', exam_type: '', value: '' }
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

  const total = exams.reduce((s, e) => s + (parseFloat(e.value) || 0), 0)
  const overBudget = budget && total > budget.available

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (overBudget) {
      setError(`Valor total dos exames (${fmt(total)}) ultrapassa o saldo disponível (${fmt(budget.available)})`)
      return
    }
    setLoading(true)
    try {
      const { id } = await api.createPatient({ name, cpf, exams })
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
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Novo Paciente</h1>
      </div>

      {budget && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-800">
          Saldo disponível: <strong>{fmt(budget.available)}</strong> de {fmt(budget.limit)}
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

        <div className="space-y-3">
          {exams.map((exam, i) => (
            <ExamField
              key={i}
              index={i}
              exam={exam}
              onChange={(updated) => {
                const next = [...exams]
                next[i] = updated
                setExams(next)
              }}
            />
          ))}
        </div>

        <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${overBudget ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
          <span className="text-sm text-gray-600">Total dos exames:</span>
          <span className={`font-bold text-lg ${overBudget ? 'text-red-600' : 'text-gray-800'}`}>
            {fmt(total)}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
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
