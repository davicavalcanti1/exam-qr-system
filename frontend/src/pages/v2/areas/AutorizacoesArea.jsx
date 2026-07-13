import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function AutorizacoesArea() {
  const { user } = useAuth()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('exames')
      .select('id, nome, valor, indicacao, status, created_at, pacientes(nome, cpf)')
      .eq('status', 'aguardando_autorizacao')
      .order('created_at', { ascending: true })
    setItens(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function decidir(id, aprovar) {
    setBusy(id)
    const patch = aprovar
      ? { status: 'autorizado', autorizado_por: user?.id }
      : { status: 'cancelado' }
    await supabase.from('exames').update(patch).eq('id', id)
    setBusy(null); await load()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
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
                </div>
                <div className="flex gap-2 flex-none">
                  <button disabled={busy === ex.id} onClick={() => decidir(ex.id, true)} className="px-3 py-1.5 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition disabled:opacity-50">Autorizar</button>
                  <button disabled={busy === ex.id} onClick={() => decidir(ex.id, false)} className="px-3 py-1.5 text-[11px] font-bold bg-error-container/40 text-on-error-container rounded-md hover:bg-error-container/70 transition disabled:opacity-50">Recusar</button>
                </div>
              </div>
            ))}
          </div>}
    </section>
  )
}
