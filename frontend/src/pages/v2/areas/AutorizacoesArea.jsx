import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import { logAudit } from '../../../lib/audit'

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
      // comprometido = exames realizados que ainda não estão num lote PAGO
      const { data: real } = await supabase.from('exames').select('valor, cobranca_id').eq('status', 'realizado')
      const { data: pagas } = await supabase.from('cobrancas').select('id').eq('status', 'paga')
      const pagasSet = new Set((pagas || []).map(c => c.id))
      let soma = 0
      for (const e of real || []) if (!e.cobranca_id || !pagasSet.has(e.cobranca_id)) soma += Number(e.valor || 0)
      setComprometido(soma)
    }
  }
  useEffect(() => { load() }, [parceiroId])

  async function decidir(ex, aprovar) {
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

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const disponivel = teto != null ? teto - comprometido : null
  const pct = teto ? Math.min(Math.round((comprometido / teto) * 100), 100) : 0

  return (
    <div className="space-y-6">
    {teto != null && (
      <div className="bg-surface-container-lowest p-5 rounded-xl shadow-card">
        <div className="flex items-end justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Teto do parceiro</span>
          <span className="text-sm text-on-surface-variant">Disponível <b className={`tabular-nums ${disponivel < 0 ? 'text-error' : 'text-primary'}`}>{fmt(disponivel)}</b></span>
        </div>
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-on-surface-variant mt-1 tabular-nums">Comprometido {fmt(comprometido)} de {fmt(teto)} ({pct}%)</p>
      </div>
    )}
    {aviso && <div className="text-sm px-4 py-3 rounded-xl bg-surface-container-lowest shadow-card">{aviso}</div>}
    <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
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
                  <button disabled={busy === ex.id} onClick={() => decidir(ex, true)} className="px-3 py-1.5 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition disabled:opacity-50">{busy === ex.id ? '…' : 'Autorizar'}</button>
                  <button disabled={busy === ex.id} onClick={() => decidir(ex, false)} className="px-3 py-1.5 text-[11px] font-bold bg-error-container/40 text-on-error-container rounded-md hover:bg-error-container/70 transition disabled:opacity-50">Recusar</button>
                </div>
              </div>
            ))}
          </div>}
    </section>
    </div>
  )
}
