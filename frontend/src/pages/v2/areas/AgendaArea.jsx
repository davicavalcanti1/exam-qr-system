import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const STATUS = {
  aguardando_autorizacao: { label: 'Aguardando', cls: 'bg-yellow-50 text-yellow-700' },
  autorizado: { label: 'Autorizado', cls: 'bg-primary/10 text-primary' },
  realizado: { label: 'Realizado', cls: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
  rascunho: { label: 'Rascunho', cls: 'bg-surface-container text-on-surface-variant' },
}
const diaLabel = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function AgendaArea() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const hojeISO = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('exames')
      .select('id, nome, status, scheduled_at, pacientes(nome), parceiros(nome)')
      .not('scheduled_at', 'is', null)
      .neq('status', 'cancelado')
      .gte('scheduled_at', `${hojeISO}T00:00:00`)
      .order('scheduled_at')
    const map = {}
    for (const e of data || []) {
      const dia = e.scheduled_at.slice(0, 10)
      ;(map[dia] ||= []).push(e)
    }
    setGrupos(Object.entries(map).map(([dia, itens]) => ({ dia, itens })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (grupos.length === 0)
    return <div className="bg-surface-container-lowest p-10 rounded-xl shadow-card text-center text-on-surface-variant text-sm">Nenhum exame agendado a partir de hoje.</div>

  return (
    <div className="space-y-6">
      {grupos.map(g => (
        <section key={g.dia} className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-3 bg-primary/5 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold capitalize text-primary">{diaLabel(g.dia)}</h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {g.itens.map(e => {
              const st = STATUS[e.status] || STATUS.rascunho
              return (
                <div key={e.id} className="flex items-center gap-4 px-6 py-3">
                  <span className="text-sm font-bold tabular-nums text-on-surface w-14 flex-none">{hora(e.scheduled_at)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.pacientes?.nome || '—'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{e.nome} · {e.parceiros?.nome || '—'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-none ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
