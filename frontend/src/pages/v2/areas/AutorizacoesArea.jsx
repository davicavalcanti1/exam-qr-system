import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import { logAudit } from '../../../lib/audit'
import { Card, Button, Badge, Loading } from '../../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AutorizacoesArea() {
  const { user, profile, parceiroId } = useAuth()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [teto, setTeto] = useState(null)
  const [comprometido, setComprometido] = useState(0)
  const [aviso, setAviso] = useState('')

  async function load() {
    const { data } = await supabase
      .from('exames')
      .select('id, nome, valor, indicacao, status, created_at, netris_slot, pacientes(nome, cpf)')
      .eq('status', 'aguardando_autorizacao')
      .order('created_at', { ascending: true })
    setItens(data || []); setLoading(false)

    if (parceiroId) {
      const { data: p } = await supabase.from('parceiros').select('teto').eq('id', parceiroId).maybeSingle()
      setTeto(p?.teto ?? null)
      // comprometido = exames autorizados + realizados que ainda não foram pagos
      // (é o que "ocupa" o teto; autorizado conta porque vira dívida ao ser realizado)
      const { data: comp } = await supabase.from('exames').select('valor, cobranca_id').in('status', ['autorizado', 'realizado'])
      const { data: pagas } = await supabase.from('cobrancas').select('id').eq('status', 'paga')
      const pagasSet = new Set((pagas || []).map(c => c.id))
      let soma = 0
      for (const e of comp || []) if (!e.cobranca_id || !pagasSet.has(e.cobranca_id)) soma += Number(e.valor || 0)
      setComprometido(soma)
    }
  }
  useEffect(() => { load() }, [parceiroId])

  async function decidir(ex, aprovar) {
    // trava do teto: só bloqueia quando JÁ atingiu/passou o teto (se está abaixo,
    // deixa encaixar mais um, mesmo que ultrapasse). Recusar sempre é permitido.
    if (aprovar && teto != null && comprometido >= teto) {
      setAviso(`⛔ Teto do parceiro atingido (${fmt(comprometido)} de ${fmt(teto)}). Não é possível autorizar novos exames até quitar as cobranças em aberto.`)
      return
    }
    setBusy(ex.id); setAviso('')
    const patch = aprovar
      ? { status: 'autorizado', autorizado_por: user?.id }
      : { status: 'cancelado' }
    await supabase.from('exames').update(patch).eq('id', ex.id)
    logAudit({ empresaId: profile?.empresa_id, atorId: user?.id, atorNome: profile?.nome, acao: aprovar ? 'exame.autorizado' : 'exame.recusado', entidade: 'exame', entidadeId: ex.id, detalhe: { paciente: ex.pacientes?.nome, exame: ex.nome, valor: ex.valor } })
    // ao autorizar, se houver horário pendente, envia o agendamento ao NetRis
    if (aprovar && ex.netris_slot) {
      try {
        const r = await adminApi.netrisAgendarExame(ex.id, ex.netris_slot)
        setAviso(`✓ ${ex.pacientes?.nome || 'Paciente'} autorizado e agendado no NetRis (protocolo ${r.agendamentoId || '—'}).`)
      } catch (e) {
        setAviso(`⚠ Autorizado, mas o agendamento no NetRis falhou: ${e.message}. Use o botão de agenda no exame para tentar de novo.`)
      }
    }
    setBusy(null); await load()
  }

  if (loading) return <Loading />

  const disponivel = teto != null ? teto - comprometido : null
  const pct = teto ? Math.min(Math.round((comprometido / teto) * 100), 100) : 0
  const tetoAtingido = teto != null && comprometido >= teto

  return (
    <div className="space-y-6">
    {teto != null && (
      <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-card">
        <div className="flex items-end justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Teto do parceiro</span>
          <span className="text-sm text-on-surface-variant">Disponível <b className={`tabular-nums ${disponivel < 0 ? 'text-error' : 'text-primary'}`}>{fmt(disponivel)}</b></span>
        </div>
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-on-surface-variant mt-1 tabular-nums">Comprometido {fmt(comprometido)} de {fmt(teto)} ({pct}%)</p>
        {tetoAtingido && <p className="text-xs font-bold text-error mt-2 flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: '15px' }}>block</span>Teto atingido — autorizações bloqueadas até quitar as cobranças.</p>}
      </div>
    )}
    {aviso && <div className="text-sm px-4 py-3 rounded-xl bg-surface-container-lowest shadow-card">{aviso}</div>}
    <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-outline-variant/10">
        <h3 className="text-lg font-semibold">Aguardando sua autorização ({itens.length})</h3>
        <p className="text-sm text-on-surface-variant mt-1">Exames registrados pelos funcionários. Autorize para liberar a geração do QR.</p>
      </div>
      {itens.length === 0
        ? <p className="text-center py-16 text-on-surface-variant text-sm">Nada pendente. Tudo em dia. 🎉</p>
        : <div className="divide-y divide-outline-variant/10">
            {itens.map(ex => (
              <div key={ex.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{ex.pacientes?.nome || '—'}</p>
                  <p className="text-sm text-on-surface-variant truncate">{ex.nome}{ex.indicacao ? ` · ${ex.indicacao}` : ''} · <span className="tabular-nums">{fmt(ex.valor)}</span></p>
                  {ex.netris_slot && <p className="text-[11px] text-primary font-bold flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>NetRis: {String(ex.netris_slot.data || '').slice(0, 5)} {ex.netris_slot.horarioString} (agenda ao autorizar)</p>}
                </div>
                <div className="flex gap-2 flex-none">
                  <Button size="sm" loading={busy === ex.id} disabled={tetoAtingido} onClick={() => decidir(ex, true)} icon="check" title={tetoAtingido ? 'Teto atingido' : ''}>Autorizar</Button>
                  <Button size="sm" variant="danger" disabled={busy === ex.id} onClick={() => decidir(ex, false)}>Recusar</Button>
                </div>
              </div>
            ))}
          </div>}
    </section>
    </div>
  )
}
