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

export default function PatientForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [examCount, setExamCount] = useState(1)
  const [exams, setExams] = useState([{ type: 0, indication: '' }, { type: 0, indication: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState(null)

  useEffect(() => {
    api.getPartnerDashboard().then(d => setQuota(d.partner)).catch(() => {})
  }, [])

  function setExamField(i, field, value) {
    setExams(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const activeExams = exams.slice(0, examCount)
  const total = activeExams.reduce((s, e) => s + (EXAM_OPTIONS[e.type]?.price || 0), 0)

  const quotaUsed = quota ? Math.min(Math.round(((quota.committed || 0) / (quota.budgetLimit || 1)) * 100), 100) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const examPayload = activeExams.map(e => ({
        exam_name: EXAM_OPTIONS[e.type].label,
        exam_type: e.indication || EXAM_OPTIONS[e.type].label,
        value: EXAM_OPTIONS[e.type].price,
      }))
      await api.createPatient({ name, cpf, exams: examPayload })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erro ao registrar paciente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <main className="pt-8 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold tracking-wide text-xs uppercase">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Formulário de Cadastro
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">Novo Registro de Paciente</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Insira as informações clínicas e selecione os exames autorizados para gerar o QR Code de atendimento.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-error-container text-on-error-container font-medium flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Patient Identity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-lowest p-8 rounded-xl" style={{ boxShadow: '0 20px 40px -10px rgba(18,28,42,0.06)' }}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Completo</label>
              <input
                className="w-full px-4 py-3 rounded-lg border-none bg-surface-container focus:ring-2 focus:ring-secondary-fixed text-on-surface placeholder:text-outline/50 transition-all outline-none"
                placeholder="Ex: João da Silva Santos"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">CPF</label>
              <input
                className="w-full px-4 py-3 rounded-lg border-none bg-surface-container focus:ring-2 focus:ring-secondary-fixed text-on-surface tabular-nums transition-all outline-none"
                placeholder="000.000.000-00"
                type="text"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Exam Quantity Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-on-surface">Configuração do Pedido</h3>
              <div className="inline-flex p-1 bg-surface-container-high rounded-full">
                <button
                  type="button"
                  onClick={() => setExamCount(1)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${examCount === 1 ? 'bg-white text-primary shadow-sm' : 'font-medium text-on-surface-variant hover:text-primary'}`}
                >
                  1 Exame
                </button>
                <button
                  type="button"
                  onClick={() => setExamCount(2)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${examCount === 2 ? 'bg-white text-primary shadow-sm' : 'font-medium text-on-surface-variant hover:text-primary'}`}
                >
                  2 Exames
                </button>
              </div>
            </div>

            {/* Exam Selection Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {activeExams.map((exam, i) => (
                  <div key={i} className="bg-surface-container-lowest border border-outline-variant/15 p-6 rounded-xl space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg glass-header flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">biotech</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase text-outline">
                          {i === 0 ? 'Exame Primário' : 'Exame Secundário'}
                        </span>
                        <span className="font-semibold text-on-surface">Seleção do Procedimento</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tipo de Exame</label>
                        <select
                          className="w-full px-4 py-3 rounded-lg border-none bg-surface-container focus:ring-2 focus:ring-secondary-fixed text-on-surface appearance-none cursor-pointer outline-none"
                          value={exam.type}
                          onChange={e => setExamField(i, 'type', Number(e.target.value))}
                        >
                          {EXAM_OPTIONS.map((opt, idx) => (
                            <option key={idx} value={idx}>{opt.label} ({fmt(opt.price)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Indicação/Tipo</label>
                        <input
                          className="w-full px-4 py-3 rounded-lg border-none bg-surface-container focus:ring-2 focus:ring-secondary-fixed text-on-surface transition-all outline-none"
                          placeholder="Ex: Lombar, Crânio"
                          type="text"
                          value={exam.indication}
                          onChange={e => setExamField(i, 'indication', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                      <span className="text-sm font-medium text-on-surface-variant">Valor do Procedimento:</span>
                      <span className="text-lg font-bold text-primary tabular-nums">{fmt(EXAM_OPTIONS[exam.type]?.price || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary / Context Info */}
              <div className="bg-surface-container p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <h4 className="font-bold text-on-surface">Status da Clínica</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Cota Mensal:</span>
                    <span className="font-bold tabular-nums">{quotaUsed}% / 100%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${quotaUsed > 95 ? 'bg-error' : quotaUsed > 70 ? 'bg-yellow-400' : 'bg-tertiary-fixed-dim'}`}
                      style={{ width: `${quotaUsed}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant leading-tight italic">
                    * A liberação automática está habilitada para este nível de orçamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Bottom Submission Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-none px-8 py-6 z-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Investimento Total</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-on-surface tabular-nums">{fmt(total)}</span>
              <span className="text-xs font-medium text-on-surface-variant">BRL</span>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 md:flex-none px-8 py-3 rounded-lg font-bold text-on-surface hover:bg-surface-container-high transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 md:flex-none glass-header text-white px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {loading ? 'Gerando...' : 'Gerar QR Code'}
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Sidebar (xl only) */}
      <aside className="hidden xl:flex h-screen w-64 fixed left-0 top-0 bg-slate-50 flex-col p-4 gap-2 z-40 border-r border-outline-variant/10">
        <div className="p-4 mb-6">
          <span className="text-lg font-black text-indigo-700 block">ExameQR</span>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Painel Administrativo</span>
        </div>
        <nav className="flex-1 space-y-1">
          <span className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 transition-all rounded-lg cursor-pointer">
            <span className="material-symbols-outlined text-indigo-600">dashboard</span>
            <span className="font-medium text-sm">Visão Geral</span>
          </span>
          <span className="flex items-center gap-3 p-3 bg-white text-indigo-600 rounded-lg shadow-sm font-bold">
            <span className="material-symbols-outlined">person_add</span>
            <span className="text-sm">Novo Registro</span>
          </span>
          <span className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 transition-all rounded-lg cursor-pointer">
            <span className="material-symbols-outlined">verified_user</span>
            <span className="text-sm">Autorizações</span>
          </span>
          <span className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 transition-all rounded-lg cursor-pointer">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-sm">Financeiro</span>
          </span>
        </nav>
        <div className="mt-auto p-4 border-t border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">medical_services</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">Parceiro</p>
              <p className="text-[10px] text-on-surface-variant">Modo Parceiro</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
