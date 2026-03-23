import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function getInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'
}

function avatarColor(i) {
  const colors = [
    'bg-indigo-50 text-indigo-600',
    'bg-yellow-50 text-yellow-600',
    'bg-red-50 text-error',
    'bg-slate-100 text-slate-400',
    'bg-green-50 text-green-600',
    'bg-purple-50 text-purple-600',
  ]
  return colors[i % colors.length]
}

export default function ClinicDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function load() {
    try {
      setStats(await api.getClinicStats())
    } catch (err) {
      if (err.message?.includes('autorizado')) { localStorage.removeItem('token'); navigate('/login') }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleToggleBlock(id, e) {
    e.stopPropagation()
    await api.toggleBlockPartner(id)
    load()
  }

  async function handleDelete(id, name, e) {
    e.stopPropagation()
    if (!confirm(`Remover parceiro "${name}"? Todos os dados serão apagados.`)) return
    await api.deletePartner(id)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!stats) return null

  const { partners } = stats
  const totalBudgetPct = stats.totalBudgetAllocated > 0
    ? Math.round((stats.totalCommitted / stats.totalBudgetAllocated) * 100)
    : 0

  return (
    <>
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full px-8 py-4 bg-white sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tighter text-indigo-700">Painel de Parceiros</h2>
          <div className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter">CLÍNICA</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <span className="text-indigo-700 font-semibold border-b-2 border-indigo-600 pb-1">Dashboard</span>
            <Link to="/clinic/partners/new" className="hover:text-indigo-500 transition-colors">Parceiros</Link>
          </div>
          <div className="flex items-center gap-3 border-l border-outline-variant/20 pl-6">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-xs">A</div>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Total Parceiros</span>
              <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.totalPartners}</span>
              <span className="text-xs font-medium text-tertiary-container flex items-center">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_upward</span>
                10%
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Novos parceiros este mês</p>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Gasto vs Orçamento</span>
              <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-primary">{totalBudgetPct}%</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(totalBudgetPct, 100)}%` }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-2">{fmt(stats.totalCommitted)} / {fmt(stats.totalBudgetAllocated)}</p>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Em Alerta</span>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-yellow-600">
                {String(stats.atRisk).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Saldo abaixo de 20%</p>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Bloqueados</span>
              <div className="w-10 h-10 bg-error-container rounded-lg flex items-center justify-center text-error">
                <span className="material-symbols-outlined">block</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-error">
                {String(stats.blocked).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Pendente de regularização</p>
          </div>
        </section>

        {/* Partners Table */}
        <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="text-lg font-semibold tracking-tight">Gestão de Parceiros</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" style={{ fontSize: '16px' }}>search</span>
                <input
                  className="pl-10 pr-4 py-2 bg-surface text-sm rounded-lg ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-secondary-fixed transition-all w-64 outline-none border-none"
                  placeholder="Buscar parceiro..."
                  type="text"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>filter_list</span>
                Filtros
              </button>
            </div>
          </div>

          {partners.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-on-surface-variant mb-2">Nenhum parceiro cadastrado</p>
              <Link to="/clinic/partners/new" className="text-primary text-sm hover:underline">Cadastrar primeiro parceiro →</Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Nome/Email</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Limite de Orçamento</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Uso (%)</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant tracking-widest uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {partners.map((p, i) => {
                      const pct = p.budget.percentUsed
                      const isClinicBlocked = p.budget.blockedByClinic
                      const isBudgetBlocked = p.budget.budgetBlocked
                      const barColor = isClinicBlocked || isBudgetBlocked ? 'bg-error' : pct >= 70 ? 'bg-yellow-400' : 'bg-tertiary-fixed-dim'
                      const textColor = isClinicBlocked || isBudgetBlocked ? 'text-error' : pct >= 70 ? 'text-yellow-600' : ''

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 transition-colors group ${isClinicBlocked ? 'opacity-50' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/clinic/partners/${p.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatarColor(i)}`}>
                                {getInitials(p.name)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{p.name}</p>
                                <p className="text-[11px] text-on-surface-variant">{p.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium tabular-nums">{fmt(p.budget.limit)}</td>
                          <td className="px-6 py-4">
                            <div className="w-full max-w-[120px]">
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{pct.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className={`${barColor} h-full rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {isClinicBlocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Bloq. Clínica
                              </span>
                            ) : isBudgetBlocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container/40 text-on-error-container">
                                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                Saldo Esgotado
                              </span>
                            ) : pct >= 70 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                Em Alerta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-tertiary-fixed-dim/10 text-on-tertiary-fixed-variant">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            {isClinicBlocked ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleToggleBlock(p.id, e)}
                                  className="px-3 py-1 text-[11px] font-bold bg-primary text-white rounded-md hover:bg-primary-container transition-all"
                                >
                                  Desbloquear
                                </button>
                                <button
                                  onClick={(e) => handleDelete(p.id, p.name, e)}
                                  className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-md transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>delete</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleToggleBlock(p.id, e)}
                                  className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-md transition-all"
                                  title="Bloquear"
                                >
                                  <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>block</span>
                                </button>
                                <button
                                  onClick={(e) => handleDelete(p.id, p.name, e)}
                                  className="p-1.5 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-md transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-on-surface-variant">Mostrando {partners.length} parceiros</p>
                <div className="flex items-center gap-2">
                  <button disabled className="p-2 rounded-lg border border-outline-variant/20 hover:bg-white transition-all disabled:opacity-30">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold">1</button>
                  <button className="p-2 rounded-lg border border-outline-variant/20 hover:bg-white transition-all">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
