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
      const { data: exames } = await supabase.from('exames').select('status, valor, cobranca_id')
      const { count: pacientes } = await supabase.from('pacientes').select('id', { count: 'exact', head: true })
      const { data: cobs } = await supabase.from('cobrancas').select('id, valor_total, status')
      const pagasSet = new Set((cobs || []).filter(c => c.status === 'paga').map(c => c.id))

      const by = { aguardando_autorizacao: 0, autorizado: 0, realizado: 0 }
      let realizado = 0 // realizado EM ABERTO (não faturado ou em lote ainda não pago)
      for (const e of exames || []) {
        if (by[e.status] !== undefined) by[e.status]++
        if (e.status === 'realizado' && (!e.cobranca_id || !pagasSet.has(e.cobranca_id))) realizado += Number(e.valor || 0)
      }
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
        <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Exames por status</span>
        <div className="mt-4 space-y-3">
          {[
            { label: 'Aguardando autorização', v: d.by.aguardando_autorizacao, cor: 'bg-yellow-400' },
            { label: 'Autorizados', v: d.by.autorizado, cor: 'bg-primary' },
            { label: 'Realizados', v: d.by.realizado, cor: 'bg-tertiary-fixed-dim' },
          ].map((s) => {
            const max = Math.max(1, d.by.aguardando_autorizacao, d.by.autorizado, d.by.realizado)
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-40 flex-none text-sm text-on-surface-variant truncate">{s.label}</span>
                <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.cor}`} style={{ width: `${(s.v / max) * 100}%` }} />
                </div>
                <span className="w-8 flex-none text-right text-sm font-bold tabular-nums">{s.v}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Em aberto (dívida)</span>
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
