import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ClinicCotas() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function load() {
    try {
      setStats(await api.getClinicStats())
    } catch (err) {
      if (err.message?.includes('autorizado')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function startEdit(p) { setEditingId(p.id); setDraft(String(p.budget.limit)) }
  function cancel() { setEditingId(null); setDraft('') }

  async function saveLimit(id) {
    const value = parseFloat(draft)
    if (!value || value <= 0) return alert('Informe um teto válido (maior que zero).')
    setSaving(true)
    try {
      await api.updatePartner(id, { budget_limit: value })
      cancel()
      await load()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!stats) return null

  const { partners } = stats
  const disponivel = stats.totalBudgetAllocated - stats.totalCommitted

  return (
    <>
      <header className="flex justify-between items-center w-full px-8 py-4 bg-white sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tighter text-indigo-700">Gestão de Cotas</h2>
          <div className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter">CLÍNICA</div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Teto total alocado</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3 text-yellow-600">{fmt(stats.totalBudgetAllocated)}</div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Em uso (dívida)</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3 text-primary">{fmt(stats.totalCommitted)}</div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Disponível</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3">{fmt(disponivel)}</div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-lg font-semibold tracking-tight">Teto por parceiro</h3>
            <p className="text-xs text-on-surface-variant mt-1">Ajuste o limite de crédito de cada parceiro. A dívida só cresce quando o exame é confirmado no scan.</p>
          </div>
          {partners.length === 0 ? (
            <p className="text-center py-16 text-on-surface-variant text-sm">Nenhum parceiro cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Parceiro</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Teto</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Em uso</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Uso (%)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {partners.map(p => {
                    const pct = p.budget.percentUsed
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-[11px] text-on-surface-variant">{p.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          {editingId === p.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min="1" step="50" value={draft} autoFocus
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveLimit(p.id)}
                                className="w-28 px-2 py-1 text-sm rounded-lg ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-medium tabular-nums">{fmt(p.budget.limit)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm tabular-nums text-on-surface-variant">{fmt(p.budget.committed)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold tabular-nums ${pct >= 100 ? 'text-error' : pct >= 70 ? 'text-yellow-600' : 'text-on-surface-variant'}`}>{pct.toFixed(0)}%</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingId === p.id ? (
                            <div className="flex justify-end gap-2">
                              <button disabled={saving} onClick={() => saveLimit(p.id)} className="px-3 py-1 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition disabled:opacity-50">Salvar</button>
                              <button onClick={cancel} className="px-3 py-1 text-[11px] font-bold bg-surface-container text-on-surface-variant rounded-md hover:bg-surface-container-high transition">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => startEdit(p)} className="px-3 py-1 text-[11px] font-bold bg-surface-container text-primary rounded-md hover:bg-surface-container-high transition">Ajustar teto</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
