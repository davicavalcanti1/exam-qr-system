import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ClinicFinanceiro() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const navigate = useNavigate()

  async function load() {
    try {
      setStats(await api.getClinicStats())
    } catch (err) {
      if (err.message?.includes('autorizado')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function registerPayment(p) {
    const sugestao = p.budget.committed > 0 ? p.budget.committed.toFixed(2) : ''
    const input = prompt(`Registrar pagamento de "${p.name}"\nDívida atual: ${fmt(p.budget.committed)}\n\nValor recebido (R$):`, sugestao)
    if (input === null) return
    const amount = parseFloat(String(input).replace(',', '.'))
    if (!amount || amount <= 0) return alert('Valor inválido.')
    setPayingId(p.id)
    try {
      await api.registerPartnerPayment(p.id, { amount })
      await load()
    } catch (e) { alert(e.message) } finally { setPayingId(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!stats) return null

  const { partners } = stats
  const devedores = partners.filter(p => p.budget.committed > 0)
  const totalReceber = devedores.reduce((s, p) => s + p.budget.committed, 0)
  const bloqueados = partners.filter(p => p.budget.budgetBlocked).length

  return (
    <>
      <header className="flex justify-between items-center w-full px-8 py-4 bg-white sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tighter text-indigo-700">Financeiro</h2>
          <div className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter">CLÍNICA</div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Total a receber</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3 text-yellow-600">{fmt(totalReceber)}</div>
            <p className="text-xs text-on-surface-variant mt-2">Exames confirmados ainda não pagos</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Parceiros devedores</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3">{String(devedores.length).padStart(2, '0')}</div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Com teto estourado</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3 text-error">{String(bloqueados).padStart(2, '0')}</div>
            <p className="text-xs text-on-surface-variant mt-2">Bloqueados até pagar</p>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-lg font-semibold tracking-tight">Contas a receber</h3>
            <p className="text-xs text-on-surface-variant mt-1">Registre um pagamento para abater a dívida. Se o teto estava estourado, o parceiro é liberado ao quitar.</p>
          </div>
          {devedores.length === 0 ? (
            <p className="text-center py-16 text-on-surface-variant text-sm">Nenhum parceiro com dívida no momento. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Parceiro</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Dívida</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Teto</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {devedores.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/clinic/partners/${p.id}`)} className="text-sm font-semibold hover:text-primary transition-colors">{p.name}</button>
                        <p className="text-[11px] text-on-surface-variant">{p.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold tabular-nums text-yellow-700">{fmt(p.budget.committed)}</td>
                      <td className="px-6 py-4 text-sm tabular-nums text-on-surface-variant">{fmt(p.budget.limit)}</td>
                      <td className="px-6 py-4">
                        {p.budget.budgetBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container/40 text-on-error-container">
                            <span className="w-1.5 h-1.5 rounded-full bg-error" /> Teto estourado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Em aberto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={payingId === p.id}
                          onClick={() => registerPayment(p)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition disabled:opacity-50"
                        >
                          {payingId === p.id ? 'Registrando…' : 'Registrar pagamento'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
