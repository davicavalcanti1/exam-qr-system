import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Card, Badge, EmptyState, Loading } from '../../../components/ui'

const STATUS = {
  aguardando_autorizacao: { label: 'Aguardando', tone: 'warn' },
  autorizado: { label: 'Autorizado', tone: 'primary' },
  realizado: { label: 'Realizado', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
  rascunho: { label: 'Rascunho', tone: 'neutral' },
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

  if (loading) return <Loading />

  if (grupos.length === 0)
    return <Card className="p-10"><EmptyState icon="event_busy" title="Nada agendado" hint="Nenhum exame agendado a partir de hoje." /></Card>

  return (
    <div className="space-y-6">
      {grupos.map(g => (
        <Card key={g.dia} className="overflow-hidden">
          <div className="px-6 py-3 bg-primary/5 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold capitalize text-primary">{diaLabel(g.dia)}</h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {g.itens.map(e => {
              const st = STATUS[e.status] || STATUS.rascunho
              return (
                <div key={e.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/[.02] transition">
                  <span className="text-sm font-bold tabular-nums text-primary w-14 flex-none">{hora(e.scheduled_at)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.pacientes?.nome || '—'}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{e.nome} · {e.parceiros?.nome || '—'}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
