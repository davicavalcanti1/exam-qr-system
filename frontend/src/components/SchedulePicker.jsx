import { useMemo, useState, useEffect } from 'react'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

// hash determinístico pra "ocupar" alguns horários de forma estável por data
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

// Gera os horários disponíveis de um dia (mock — trocar por /api/netris/horarios).
function slotsFor(dateStr) {
  const base = []
  for (let h = 8; h <= 11; h++) { base.push(`${pad(h)}:00`); base.push(`${pad(h)}:30`) }
  for (let h = 13; h <= 17; h++) { base.push(`${pad(h)}:00`); base.push(`${pad(h)}:30`) }
  const seed = hash(dateStr)
  return base.map((time, i) => ({ time, taken: ((seed >> (i % 20)) & 1) === 1 && i % 3 === 0 }))
}

export default function SchedulePicker({ open, examLabel, value, onClose, onConfirm }) {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [date, setDate] = useState(value?.date || '')
  const [time, setTime] = useState(value?.time || '')

  useEffect(() => {
    if (open) { setDate(value?.date || ''); setTime(value?.time || '') }
  }, [open])

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1)
    const startDow = first.getDay()
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [view])

  const slots = useMemo(() => (date ? slotsFor(date) : []), [date])
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate())

  if (!open) return null

  function move(delta) {
    setView(v => {
      const nm = v.m + delta
      return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Agendar exame</h3>
            {examLabel && <p className="text-xs text-on-surface-variant">{examLabel}</p>}
          </div>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* calendário */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => move(-1)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="font-bold text-on-surface capitalize">{monthLabel}</span>
            <button onClick={() => move(1)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => <div key={i} className="text-center text-[10px] font-bold text-on-surface-variant/60 py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />
              const ds = ymd(view.y, view.m, d)
              const isPast = ds < todayStr
              const isToday = ds === todayStr
              const selected = ds === date
              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={() => { setDate(ds); setTime('') }}
                  className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                    selected ? 'bg-primary text-white shadow'
                      : isPast ? 'text-on-surface-variant/25 cursor-not-allowed'
                      : isToday ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {/* horários (expande ao escolher a data) */}
        <div className="px-6 py-5">
          {!date ? (
            <p className="text-center text-sm text-on-surface-variant py-6">Selecione uma data para ver os horários disponíveis.</p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                Horários — {new Date(date + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {slots.map(s => (
                  <button
                    key={s.time}
                    disabled={s.taken}
                    onClick={() => setTime(s.time)}
                    className={`py-2 rounded-lg text-sm font-bold tabular-nums transition-all ${
                      s.taken ? 'bg-surface-container text-on-surface-variant/30 line-through cursor-not-allowed'
                        : time === s.time ? 'bg-primary text-white shadow'
                        : 'bg-surface-container-low text-on-surface hover:bg-primary/10 hover:text-primary ring-1 ring-outline-variant/20'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* rodapé */}
        <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between gap-3">
          <span className="text-sm text-on-surface-variant">
            {date && time ? <>Selecionado: <b className="text-on-surface tabular-nums">{new Date(date + 'T00:00').toLocaleDateString('pt-BR')} · {time}</b></> : 'Escolha data e horário'}
          </span>
          <button
            disabled={!date || !time}
            onClick={() => onConfirm(date, time)}
            className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-container transition disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
