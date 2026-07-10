import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function parseDate(s) {
  // aceita "YYYY-MM-DDTHH:MM" ou "YYYY-MM-DD HH:MM"
  return new Date(String(s).replace(' ', 'T'))
}
const dayKey = (d) => d.toISOString().slice(0, 10)
const dayLabel = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
const timeLabel = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function AgendaPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAgenda()
      .then(setItems)
      .catch(err => { if (err.message?.includes('autorizado') || err.message?.includes('Token')) { localStorage.removeItem('token'); navigate('/login') } })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // agrupa por dia
  const groups = {}
  for (const it of items) {
    const d = parseDate(it.scheduled_at)
    const k = dayKey(d)
    ;(groups[k] ||= { date: d, exams: [] }).exams.push({ ...it, _d: d })
  }
  const orderedDays = Object.keys(groups).sort()
  const todayKey = dayKey(new Date())

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda de Exames</h1>
          <p className="text-sm text-on-surface-variant mt-1">Exames agendados dos seus pacientes, por data.</p>
        </div>
        <button onClick={() => navigate('/patients/new')} className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary-container transition">
          <span className="material-symbols-outlined text-sm">add</span>
          Novo agendamento
        </button>
      </div>

      {orderedDays.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-card text-center py-20">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '40px' }}>event_busy</span>
          <p className="text-on-surface-variant mt-3">Nenhum exame agendado ainda.</p>
          <button onClick={() => navigate('/patients/new')} className="text-primary text-sm font-semibold hover:underline mt-2">Agendar um exame →</button>
        </div>
      ) : (
        <div className="space-y-8">
          {orderedDays.map(k => {
            const g = groups[k]
            const isToday = k === todayKey
            return (
              <section key={k}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant capitalize">{dayLabel(g.date)}</h2>
                  {isToday && <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">Hoje</span>}
                  <span className="text-xs text-on-surface-variant/60">{g.exams.length} exame(s)</span>
                </div>
                <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden divide-y divide-outline-variant/10">
                  {g.exams.sort((a, b) => a._d - b._d).map(ex => {
                    const done = ex.qr_status === 'exhausted'
                    return (
                      <div key={ex.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => navigate(`/patients/${ex.patient_id}`)}>
                        <div className="w-16 text-center flex-none">
                          <p className="text-lg font-extrabold tabular-nums text-primary leading-none">{timeLabel(ex._d)}</p>
                        </div>
                        <div className="w-px h-10 bg-outline-variant/20" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface truncate">{ex.patient_name}</p>
                          <p className="text-sm text-on-surface-variant truncate">{ex.exam_name}{ex.exam_type && ex.exam_type !== ex.exam_name ? ` · ${ex.exam_type}` : ''}</p>
                        </div>
                        <div className="text-right flex-none">
                          <p className="font-bold tabular-nums text-on-surface">{fmt(ex.value)}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase mt-1 ${done ? 'text-on-tertiary-fixed-variant' : 'text-on-surface-variant'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-tertiary-fixed-dim' : 'bg-outline'}`} />
                            {done ? 'Realizado' : 'Agendado'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
