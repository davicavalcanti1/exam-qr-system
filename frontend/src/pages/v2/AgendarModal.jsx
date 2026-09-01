import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const maisDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const diaLabel = (br) => {
  const [d, m, y] = String(br).split('/')
  return new Date(`${y}-${m}-${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

const PROVIDER_LABEL = { netris: 'NetRis', feegow: 'Feegow' }

export default function AgendarModal({ exame, onClose, onDone }) {
  const [ini, setIni] = useState(hojeISO())
  const [fim, setFim] = useState(maisDias(30))
  const [loading, setLoading] = useState(false)
  const [grupos, setGrupos] = useState(null)
  const [erro, setErro] = useState('')
  const [agendando, setAgendando] = useState(null)
  const [ok, setOk] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [cancelado, setCancelado] = useState(false)
  // provider: undefined = ainda detectando, null = nenhuma integração ativa,
  // 'netris'|'feegow' = a integração ativa da empresa deste exame.
  const [provider, setProvider] = useState(undefined)
  const jaAgendado = Boolean(exame?.netris_atendimento_id || exame?.feegow_agendamento_id) && !cancelado
  const providerLabel = PROVIDER_LABEL[provider] || 'agenda'

  useEffect(() => {
    let vivo = true
    async function detectar() {
      try {
        const n = await adminApi.netrisStatus()
        if (n.ativo) { if (vivo) setProvider('netris'); return }
      } catch { /* segue tentando o próximo */ }
      try {
        const f = await adminApi.feegowStatus()
        if (vivo) setProvider(f.ativo ? 'feegow' : null)
      } catch { if (vivo) setProvider(null) }
    }
    detectar()
    return () => { vivo = false }
  }, [])

  async function buscar() {
    setErro(''); setGrupos(null); setOk(null); setLoading(true)
    try {
      const r = await adminApi.horariosExame(provider, exame.id, ini, fim)
      const map = {}
      for (const s of r.slots || []) (map[s.data] ||= []).push(s)
      setGrupos(Object.entries(map).map(([data, slots]) => ({ data, slots })))
    } catch (e) { setErro(e.message) } finally { setLoading(false) }
  }

  async function cancelar() {
    setCancelando(true); setErro('')
    try {
      await adminApi.cancelarExameAgenda(provider, exame.id)
      setCancelado(true); onDone?.()
    } catch (e) { setErro(e.message) } finally { setCancelando(false) }
  }

  async function agendar(slot) {
    setAgendando(slot.data + slot.horaInicial); setErro('')
    try {
      const slotPayload = provider === 'feegow'
        ? { dataString: slot.dataString, horarioString: slot.horaInicial, idMedico: slot.idMedico }
        : { dataString: slot.dataString, horarioString: slot.horaInicial, idMedico: slot.idMedico, idSala: slot.idSala }
      const r = await adminApi.agendarExameAgenda(provider, exame.id, slotPayload)
      setOk({ ...slot, agendamentoId: r.agendamentoId })
    } catch (e) { setErro(e.message) } finally { setAgendando(null) }
  }

  const input = 'px-3 py-2 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl shadow-card w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-popin" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Agendar no {providerLabel}</h3>
            <p className="text-sm text-on-surface-variant">{exame?.nome}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        {ok ? (
          <div className="p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
            <h2 className="text-xl font-bold">Agendado no {providerLabel}!</h2>
            <p className="text-sm text-on-surface-variant">{diaLabel(ok.data)} às {ok.horaInicial}{ok.nomeMedico ? ` · ${ok.nomeMedico}` : ''}</p>
            <p className="text-[11px] text-on-surface-variant">Protocolo {providerLabel}: {ok.agendamentoId || '—'}</p>
            <button onClick={() => { onDone?.(); onClose() }} className="mt-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition">Concluir</button>
          </div>
        ) : cancelado ? (
          <div className="p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-6xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span>
            <h2 className="text-xl font-bold">Agendamento cancelado</h2>
            <p className="text-sm text-on-surface-variant">O horário foi liberado no {providerLabel}.</p>
            <button onClick={() => { onClose() }} className="mt-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition">Concluir</button>
          </div>
        ) : (
          <>
            {jaAgendado && (
              <div className="m-5 mb-0 p-4 rounded-lg bg-primary/10 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="font-bold text-primary flex items-center gap-1.5"><span className="material-symbols-outlined text-base">event_available</span>Agendado no {providerLabel}</span>
                  {exame?.scheduled_at && <span className="text-on-surface-variant">{new Date(exame.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
                <button onClick={cancelar} disabled={cancelando} className="px-3 py-1.5 text-[11px] font-bold bg-error-container/50 text-on-error-container rounded-md hover:bg-error-container/70 transition disabled:opacity-50 flex-none">{cancelando ? 'Cancelando…' : 'Cancelar agendamento'}</button>
              </div>
            )}
            {provider === null ? (
              <p className="text-sm text-on-surface-variant text-center py-8 px-5">Nenhuma integração de agenda ativa para esta empresa.</p>
            ) : (
              <>
                <div className="p-5 flex items-end gap-2 border-b border-outline-variant/10">
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">De</label><input type="date" className={input} value={ini} onChange={e => setIni(e.target.value)} /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Até</label><input type="date" className={input} value={fim} onChange={e => setFim(e.target.value)} /></div>
                  <button onClick={buscar} disabled={loading || !provider} className="px-4 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50">{loading ? 'Buscando…' : 'Buscar horários'}</button>
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
                          const quem = [s.nomeMedico || `Médico #${s.idMedico}`, s.sala].filter(Boolean).join(' · ')
                          if (s.reservado) return (
                            <span key={i} title={`Reservado · ${quem}`}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-surface-container text-on-surface-variant/50 ring-1 ring-outline-variant/20 line-through cursor-not-allowed">
                              {s.horaInicial}
                            </span>
                          )
                          return (
                            <button key={i} onClick={() => agendar(s)} disabled={!!agendando}
                              title={quem}
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
          </>
        )}
      </div>
    </div>
  )
}
