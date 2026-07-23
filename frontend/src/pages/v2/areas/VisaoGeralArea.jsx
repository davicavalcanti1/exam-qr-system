import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Loading } from '../../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const horaBR = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const TONES = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-secondary-container text-on-secondary-container',
  warn: 'bg-yellow-50 text-yellow-700',
  green: 'bg-tertiary-fixed-dim/25 text-on-tertiary-fixed-variant',
}

function Stat({ icon, label, valor, tone = 'primary', onClick }) {
  return (
    <Card as={onClick ? 'button' : 'div'} onClick={onClick} className={`p-4 sm:p-5 text-left w-full ${onClick ? 'hover:ring-2 hover:ring-primary/30 transition' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-none ${TONES[tone]}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </span>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums leading-none truncate">{valor}</div>
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mt-1 truncate">{label}</div>
        </div>
      </div>
    </Card>
  )
}

const ATALHOS = {
  parceiro_coordenador: [
    { k: 'pacientes', icon: 'person_add', label: 'Cadastrar paciente' },
    { k: 'autorizacoes', icon: 'fact_check', label: 'Autorizar exames' },
    { k: 'agenda', icon: 'calendar_month', label: 'Ver agenda' },
  ],
  empresa_admin: [
    { k: 'agendamentos', icon: 'person_add', label: 'Novo agendamento' },
    { k: 'cobrancas', icon: 'receipt_long', label: 'Fechar cobrança' },
    { k: 'parceiros', icon: 'handshake', label: 'Parceiros' },
  ],
}

export default function VisaoGeralArea({ irPara }) {
  const { role, parceiroId, profile } = useAuth()
  const [d, setD] = useState(null)

  useEffect(() => {
    (async () => {
      const hojeISO = new Date().toISOString().slice(0, 10)
      const { data: exames } = await supabase.from('exames').select('status, valor, cobranca_id')
      const { count: pacientes } = await supabase.from('pacientes').select('id', { count: 'exact', head: true })
      const { data: cobs } = await supabase.from('cobrancas').select('id, valor_total, status')
      const { data: prox } = await supabase.from('exames')
        .select('id, nome, scheduled_at, status, pacientes(nome)')
        .not('scheduled_at', 'is', null).neq('status', 'cancelado')
        .gte('scheduled_at', `${hojeISO}T00:00:00`).order('scheduled_at').limit(5)

      const pagasSet = new Set((cobs || []).filter(c => c.status === 'paga').map(c => c.id))
      const by = { aguardando_autorizacao: 0, autorizado: 0, realizado: 0 }
      let emAberto = 0
      for (const e of exames || []) {
        if (by[e.status] !== undefined) by[e.status]++
        if (e.status === 'realizado' && (!e.cobranca_id || !pagasSet.has(e.cobranca_id))) emAberto += Number(e.valor || 0)
      }
      let aReceber = 0, recebido = 0
      for (const cb of cobs || []) {
        if (cb.status === 'aberta') aReceber += Number(cb.valor_total || 0)
        if (cb.status === 'paga') recebido += Number(cb.valor_total || 0)
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
      setD({ pacientes: pacientes || 0, by, emAberto, aReceber, recebido, teto, parceiros, prox: prox || [] })
    })()
  }, [role, parceiroId])

  if (!d) return <Loading />

  const pct = d.teto ? Math.min(Math.round((d.emAberto / d.teto) * 100), 999) : null
  const barra = pct == null ? 0 : Math.min(pct, 100)
  const barCor = pct >= 100 ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-primary'
  const atalhos = ATALHOS[role] || []
  const nome = (profile?.nome || '').split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Boas-vindas + atalhos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Olá{nome ? `, ${nome}` : ''} 👋</h2>
          <p className="text-sm text-on-surface-variant">Aqui está o resumo de hoje.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 -mb-1 sm:flex-wrap">
          {atalhos.map(a => (
            <button key={a.k} onClick={() => irPara?.(a.k)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition flex-none whitespace-nowrap">
              <span className="material-symbols-outlined text-base">{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pendência acionável */}
      {d.by.aguardando_autorizacao > 0 && (role === 'parceiro_coordenador' || role === 'empresa_admin') && (
        <button onClick={() => irPara?.('autorizacoes')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-yellow-50 ring-1 ring-yellow-200 hover:ring-yellow-300 transition text-left">
          <span className="w-10 h-10 rounded-xl bg-yellow-400/20 text-yellow-700 flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span></span>
          <div className="flex-1"><p className="font-bold text-yellow-800">{d.by.aguardando_autorizacao} exame(s) aguardando autorização</p><p className="text-xs text-yellow-700/80">Toque para revisar e autorizar.</p></div>
          <span className="material-symbols-outlined text-yellow-700">chevron_right</span>
        </button>
      )}

      {/* Cards de métrica */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {d.parceiros != null && <Stat icon="handshake" label="Parceiros" valor={d.parceiros} tone="primary" onClick={role === 'empresa_admin' ? () => irPara?.('parceiros') : undefined} />}
        <Stat icon="groups" label="Pacientes" valor={d.pacientes} tone="primary" />
        <Stat icon="fact_check" label="Autorizados" valor={d.by.autorizado} tone="gold" />
        <Stat icon="task_alt" label="Realizados" valor={d.by.realizado} tone="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Próximos agendamentos */}
        <Card className="overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="font-semibold">Próximos agendamentos</h3>
            <button onClick={() => irPara?.('agenda')} className="text-xs font-bold text-primary hover:underline">ver agenda</button>
          </div>
          {d.prox.length === 0
            ? <p className="text-sm text-on-surface-variant px-4 sm:px-6 py-8 text-center">Nada agendado a partir de hoje.</p>
            : <div className="divide-y divide-outline-variant/10">
                {d.prox.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 sm:px-6 py-3">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>event</span></span>
                    <div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{e.pacientes?.nome || '—'}</p><p className="text-[11px] text-on-surface-variant truncate">{e.nome}</p></div>
                    <span className="text-[11px] font-bold tabular-nums text-on-surface-variant flex-none">{horaBR(e.scheduled_at)}</span>
                  </div>
                ))}
              </div>}
        </Card>

        {/* Financeiro / teto */}
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold mb-4">Financeiro</h3>
          {/* celular: linhas label→valor (legível); sm+: 3 colunas */}
          <div className="divide-y divide-outline-variant/10 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:gap-3 mb-5">
            <div className="flex items-baseline justify-between py-2 sm:block sm:py-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Em aberto</p>
              <p className="text-lg font-extrabold tabular-nums text-yellow-600 sm:mt-0.5">{fmt(d.emAberto)}</p>
            </div>
            <div className="flex items-baseline justify-between py-2 sm:block sm:py-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">A receber</p>
              <p className="text-lg font-extrabold tabular-nums text-on-surface sm:mt-0.5">{fmt(d.aReceber)}</p>
            </div>
            <div className="flex items-baseline justify-between py-2 sm:block sm:py-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Recebido</p>
              <p className="text-lg font-extrabold tabular-nums text-primary sm:mt-0.5">{fmt(d.recebido)}</p>
            </div>
          </div>
          {d.teto != null && (
            <div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                <span>Teto do parceiro</span><span className="tabular-nums">{fmt(d.emAberto)} / {fmt(d.teto)}</span>
              </div>
              <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barCor}`} style={{ width: `${barra}%` }} />
              </div>
              {pct >= 100 && <p className="text-xs font-bold text-error mt-1.5">Teto atingido.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
