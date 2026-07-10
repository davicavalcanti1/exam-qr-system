import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const EXAM_OPTIONS = [
  { label: 'Ressonância Magnética', price: 500 },
  { label: 'Tomografia', price: 350 },
  { label: 'Mamografia', price: 120 },
  { label: 'Raio-X', price: 80 },
  { label: 'Densitometria', price: 100 },
  { label: 'Ultrassom', price: 150 },
]

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const newExam = () => ({ type: 0, indication: '', date: '', time: '' })

export default function PatientForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [exams, setExams] = useState([newExam()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState(null)

  useEffect(() => {
    api.getPartnerDashboard().then(d => setQuota(d.partner)).catch(() => {})
  }, [])

  function setExamField(i, field, value) {
    setExams(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }
  function addExam() { setExams(prev => [...prev, newExam()]) }
  function removeExam(i) { setExams(prev => prev.filter((_, idx) => idx !== i)) }

  const total = exams.reduce((s, e) => s + (EXAM_OPTIONS[e.type]?.price || 0), 0)
  const quotaUsed = quota ? Math.min(Math.round(((quota.committed || 0) / (quota.limit || 1)) * 100), 100) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const examPayload = exams.map(ex => ({
        exam_name: EXAM_OPTIONS[ex.type].label,
        exam_type: ex.indication || EXAM_OPTIONS[ex.type].label,
        value: EXAM_OPTIONS[ex.type].price,
        scheduled_at: ex.date ? `${ex.date}T${ex.time || '00:00'}` : null,
      }))
      await api.createPatient({ name, cpf, exams: examPayload })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erro ao registrar paciente')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-3 rounded-lg border-none bg-surface-container focus:ring-2 focus:ring-primary text-on-surface transition-all outline-none'
  const labelCls = 'text-xs font-bold uppercase tracking-widest text-on-surface-variant'

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <main className="pt-8 pb-40 px-4 md:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold tracking-wide text-xs uppercase">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Formulário de Cadastro
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">Novo Registro de Paciente</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Informe os dados do paciente, selecione os exames e agende data e horário. O coordenador gera o QR depois.
          </p>
          {quota && (
            <div className="flex items-center gap-3 pt-2 max-w-sm">
              <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${quotaUsed >= 95 ? 'bg-error' : quotaUsed >= 70 ? 'bg-yellow-400' : 'bg-primary'}`} style={{ width: `${quotaUsed}%` }} />
              </div>
              <span className="text-xs font-bold text-on-surface-variant tabular-nums">{quotaUsed}% do teto</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container font-medium flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Patient Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-lowest p-8 rounded-xl shadow-card">
            <div className="space-y-2">
              <label className={labelCls}>Nome Completo</label>
              <input className={inputCls} placeholder="Ex: João da Silva Santos" type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>CPF</label>
              <input className={`${inputCls} tabular-nums`} placeholder="000.000.000-00" type="text" value={cpf} onChange={e => setCpf(e.target.value)} required />
            </div>
          </div>

          {/* Exams (dynamic) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Exames e agendamento</h3>
                <p className="text-sm text-on-surface-variant">Adicione quantos exames precisar e marque a data/horário de cada um.</p>
              </div>
              <button type="button" onClick={addExam} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-container transition">
                <span className="material-symbols-outlined text-sm">add</span>
                Adicionar exame
              </button>
            </div>

            {exams.map((exam, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/15 p-6 rounded-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg glass-header flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">biotech</span>
                    </div>
                    <span className="font-semibold text-on-surface">Exame {i + 1}</span>
                  </div>
                  {exams.length > 1 && (
                    <button type="button" onClick={() => removeExam(i)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition" title="Remover exame">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Tipo de Exame</label>
                    <select className={`${inputCls} appearance-none cursor-pointer`} value={exam.type} onChange={e => setExamField(i, 'type', Number(e.target.value))}>
                      {EXAM_OPTIONS.map((opt, idx) => (
                        <option key={idx} value={idx}>{opt.label} ({fmt(opt.price)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Indicação</label>
                    <input className={inputCls} placeholder="Ex: Lombar, Crânio" type="text" value={exam.indication} onChange={e => setExamField(i, 'indication', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Data do exame</label>
                    <input className={inputCls} type="date" value={exam.date} onChange={e => setExamField(i, 'date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Horário</label>
                    <input className={inputCls} type="time" value={exam.time} onChange={e => setExamField(i, 'time', e.target.value)} />
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                  <span className="text-sm font-medium text-on-surface-variant">Valor do procedimento</span>
                  <span className="text-lg font-bold text-primary tabular-nums">{fmt(EXAM_OPTIONS[exam.type]?.price || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </form>
      </main>

      {/* Bottom Submission Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-outline-variant/10 px-8 py-5 z-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Total dos Exames</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-on-surface tabular-nums">{fmt(total)}</span>
              <span className="text-xs font-medium text-on-surface-variant">· {exams.length} exame(s)</span>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 md:flex-none px-8 py-3 rounded-lg font-bold text-on-surface hover:bg-surface-container-high transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading} onClick={handleSubmit} className="flex-1 md:flex-none bg-primary text-white px-10 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.99] transition-all disabled:opacity-60">
              {loading ? 'Registrando...' : 'Registrar Paciente'}
              <span className="material-symbols-outlined text-sm">person_add</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
