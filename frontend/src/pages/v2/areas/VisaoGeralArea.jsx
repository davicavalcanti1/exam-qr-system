import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Loading } from '../../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const TONES = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-secondary-container text-on-secondary-container',
  warn: 'bg-yellow-50 text-yellow-700',
  green: 'bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant',
}

function Stat({ icon, label, valor, tone = 'primary' }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${TONES[tone]}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold tracking-tight tabular-nums leading-none">{valor}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{label}</div>
        </div>
      </div>
    </Card>
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
      const { data: cobs } = await supabase.from('cobrancas').select('valor_total, status')
      let aReceber = 0
      for (const cb of cobs || []) if (cb.status === 'aberta') aReceber += Number(cb.valor_total || 0)

      let teto = null, parceiros = null
      if (role === 'parceiro_coordenador' && parceiroId) {
        const { data: p } = await supabase.from('parceiros').select('teto').eq('id', parceiroId).maybeSingle()
        teto = p?.teto ?? null
      }
      if (role === 'empresa_admin' || role === 'owner') {
        const { count } = await supabase.from('parceiros').select('id', { count: 'exact', head: true })
        parceiros = count
      }
      setD({ pacientes: pacientes || 0, by, realizado, teto, parceiros, aReceber })
    })()
  }, [role, parceiroId])

  if (!d) return <Loading />

  const pct = d.teto ? Math.min(Math.round((d.realizado / d.teto) * 100), 999) : null
  const barra = pct == null ? 0 : Math.min(pct, 100)
  const barCor = pct >= 100 ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-primary'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {d.parceiros != null && <Stat icon="handshake" label="Parceiros" valor={d.parceiros} tone="primary" />}
        <Stat icon="groups" label="Pacientes" valor={d.pacientes} tone="primary" />
        <Stat icon="hourglass_top" label="Aguardando" valor={d.by.aguardando_autorizacao} tone="warn" />
        <Stat icon="fact_check" label="Autorizados" valor={d.by.autorizado} tone="gold" />
        <Stat icon="task_alt" label="Realizados" valor={d.by.realizado} tone="green" />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Valor realizado (dívida)</span>
            <div className="text-4xl font-extrabold tracking-tight tabular-nums mt-1 text-on-surface">{fmt(d.realizado)}</div>
          </div>
          {d.teto != null
            ? <div className="text-right"><span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Teto do parceiro</span><div className="text-xl font-bold tabular-nums text-on-surface-variant">{fmt(d.teto)}</div></div>
            : <div className="text-right"><span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">A receber (lotes abertos)</span><div className="text-xl font-bold tabular-nums text-primary">{fmt(d.aReceber)}</div></div>}
        </div>
        {pct != null && (
          <div className="mt-5">
            <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barCor}`} style={{ width: `${barra}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-1.5 tabular-nums">{pct}% do teto usado</p>
          </div>
        )}
      </Card>
    </div>
  )
}
