import { useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const maisDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const diaLabel = (br) => {
  const [d, m, y] = String(br).split('/')
  return new Date(`${y}-${m}-${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function AgendarModal({ exame, onClose, onDone }) {
  const [ini, setIni] = useState(hojeISO())
  const [fim, setFim] = useState(maisDias(30))
  const [loading, setLoading] = useState(false)
  const [grupos, setGrupos] = useState(null)
  const [erro, setErro] = useState('')
  const [agendando, setAgendando] = useState(null)
  const [ok, setOk] = useState(null)

  async function buscar() {
    setErro(''); setGrupos(null); setOk(null); setLoading(true)
    try {
      const r = await adminApi.netrisHorariosExame(exame.id, ini, fim)
      const map = {}
      for (const s of r.slots || []) (map[s.data] ||= []).push(s)
      setGrupos(Object.entries(map).map(([data, slots]) => ({ data, slots })))
    } catch (e) { setErro(e.message) } finally { setLoading(false) }
  }

  async function agendar(slot) {
    setAgendando(slot.data + slot.horaInicial); setErro('')
    try {
      const r = await adminApi.netrisAgendarExame(exame.id, {
        dataString: slot.dataString, horarioString: slot.horaInicial,
        idMedico: slot.idMedico, idSala: slot.idSala,
      })
      setOk({ ...slot, agendamentoId: r.agendamentoId })
    } catch (e) { setErro(e.message) } finally { setAgendando(null) }
  }

  const input = 'px-3 py-2 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-xl shadow-card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Agendar no NetRis</h3>
            <p className="text-sm text-on-surface-variant">{exame?.nome}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        {ok ? (
          <div className="p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
            <h2 className="text-xl font-bold">Agendado no NetRis!</h2>
            <p className="text-sm text-on-surface-variant">{diaLabel(ok.data)} às {ok.horaInicial} · {ok.nomeMedico}</p>
            <p className="text-[11px] text-on-surface-variant">Protocolo NetRis: {ok.agendamentoId || '—'}</p>
            <button onClick={() => { onDone?.(); onClose() }} className="mt-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition">Concluir</button>
          </div>
        ) : (
          <>
            <div className="p-5 flex items-end gap-2 border-b border-outline-variant/10">
              <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">De</label><input type="date" className={input} value={ini} onChange={e => setIni(e.target.value)} /></div>
              <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Até</label><input type="date" className={input} value={fim} onChange={e => setFim(e.target.value)} /></div>
              <button onClick={buscar} disabled={loading} className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{loading ? 'Buscando…' : 'Buscar horários'}</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {erro && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container mb-3">{erro}</div>}
              {!grupos && !erro && <p className="text-sm text-on-surface-variant text-center py-8">Escolha o período e busque os horários disponíveis.</p>}
              {grupos && grupos.length === 0 && <p className="text-sm text-on-surface-variant text-center py-8">Nenhum horário disponível no período.</p>}
              {grupos && grupos.map(g => (
                <div key={g.data} className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 capitalize">{diaLabel(g.data)}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.slots.map((s, i) => {
                      const busy = agendando === s.data + s.horaInicial
                      return (
                        <button key={i} onClick={() => agendar(s)} disabled={!!agendando}
                          title={`${s.nomeMedico} · ${s.sala}`}
                          className="px-3 py-1.5 rounded-lg text-sm font-bold bg-surface ring-1 ring-outline-variant/30 hover:ring-2 hover:ring-primary hover:text-primary transition disabled:opacity-40">
                          {busy ? '…' : s.horaInicial}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
