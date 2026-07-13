import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Card({ label, valor, cor = 'text-on-surface' }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
      <div className={`text-3xl font-extrabold tracking-tight tabular-nums mt-2 ${cor}`}>{valor}</div>
    </div>
  )
}

export default function VisaoGeralArea() {
  const { role, parceiroId } = useAuth()
  const [d, setD] = useState(null)

  useEffect(() => {
    (async () => {
      const { data: exames } = await supabase.from('exames').select('status, valor')
      const { count: pacientes } = await supabase.from('pacientes').select('id', { count: 'exact', head: true })
      const by = { aguardando_autorizacao: 0, autorizado: 0, realizado: 0 }
      let realizado = 0
      for (const e of exames || []) {
        if (by[e.status] !== undefined) by[e.status]++
        if (e.status === 'realizado') realizado += Number(e.valor || 0)
      }
      let teto = null, parceiros = null
      if (role === 'parceiro_coordenador' && parceiroId) {
        const { data: p } = await supabase.from('parceiros').select('teto').eq('id', parceiroId).maybeSingle()
        teto = p?.teto ?? null
      }
      if (role === 'empresa_admin' || role === 'owner') {
        const { count } = await supabase.from('parceiros').select('id', { count: 'exact', head: true })
        parceiros = count
      }
      setD({ pacientes: pacientes || 0, by, realizado, teto, parceiros })
    })()
  }, [role, parceiroId])

  if (!d) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const pct = d.teto ? Math.min(Math.round((d.realizado / d.teto) * 100), 999) : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {d.parceiros != null && <Card label="Parceiros" valor={d.parceiros} />}
        <Card label="Pacientes" valor={d.pacientes} />
        <Card label="Aguardando" valor={d.by.aguardando_autorizacao} cor="text-yellow-600" />
        <Card label="Autorizados" valor={d.by.autorizado} cor="text-primary" />
        <Card label="Realizados" valor={d.by.realizado} cor="text-on-tertiary-fixed-variant" />
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Valor realizado (dívida)</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-1 text-yellow-600">{fmt(d.realizado)}</div>
          </div>
          {d.teto != null && <div className="text-right text-sm text-on-surface-variant">Teto do parceiro<br /><b className="text-on-surface tabular-nums">{fmt(d.teto)}</b></div>}
        </div>
        {pct != null && (
          <div className="mt-4">
            <div className="h-2 bg-surface-container rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-1 tabular-nums">{pct}% do teto usado</p>
          </div>
        )}
      </div>
    </div>
  )
}
