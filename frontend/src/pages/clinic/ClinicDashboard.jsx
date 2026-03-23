import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function StatCard({ icon, label, value, sub, variant = 'default' }) {
  const variants = {
    default: 'bg-surface-container-low border-surface-container-high text-on-surface',
    warning: 'bg-[#fff8e1] border-yellow-200 text-yellow-900',
    danger:  'bg-error-container border-error/20 text-on-error-container',
    success: 'bg-[#e8f5e9] border-green-200 text-green-900',
  }
  const iconColors = {
    default: 'text-primary bg-primary/10',
    warning: 'text-yellow-700 bg-yellow-100',
    danger:  'text-error bg-error/10',
    success: 'text-tertiary bg-tertiary/10',
  }
  return (
    <div className={`rounded-2xl border p-5 ${variants[variant]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[variant]}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-bold mb-0.5">{value}</p>
      <p className="text-sm font-medium opacity-80">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function barColor(pct, blocked) {
  if (blocked || pct >= 100) return 'bg-error'
  if (pct >= 70) return 'bg-yellow-400'
  return 'bg-tertiary-fixed-dim'
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Visão Geral</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Gerencie seus parceiros e acompanhe o uso</p>
        </div>
        <Link
          to="/clinic/partners/new"
          className="glass-gradient text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Novo Parceiro
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="groups"
          label="Total de Parceiros"
          value={stats.totalPartners}
          sub={`${stats.activePartners ?? stats.totalPartners} ativos`}
          variant="default"
        />
        <StatCard
          icon="account_balance_wallet"
          label="Gasto Total"
          value={fmt(stats.totalCommitted)}
          sub={`de ${fmt(stats.totalBudgetAllocated)} alocado`}
          variant="default"
        />
        <StatCard
          icon="warning"
          label="Em Alerta"
          value={stats.atRisk}
          sub="acima de 80% do limite"
          variant={stats.atRisk > 0 ? 'warning' : 'default'}
        />
        <StatCard
          icon="block"
          label="Bloqueados"
          value={stats.blocked}
          sub="requerem atenção"
          variant={stats.blocked > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Partners list */}
      {partners.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl border border-surface-container-high text-center py-20">
          <span className="material-symbols-outlined text-outline mb-3" style={{ fontSize: '48px' }}>group_off</span>
          <p className="text-on-surface-variant text-base mb-1">Nenhum parceiro cadastrado</p>
          <Link to="/clinic/partners/new" className="text-primary hover:underline text-sm font-medium">
            Cadastrar primeiro parceiro →
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-container-high flex items-center justify-between">
            <h2 className="font-semibold text-on-surface">Parceiros</h2>
            <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">{partners.length} cadastrados</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Parceiro</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Limite</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide w-48">Uso do Saldo</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const pct = p.budget.percentUsed
                const isBlocked = p.budget.blocked
                return (
                  <tr
                    key={p.id}
                    className="border-t border-surface-container-high hover:bg-surface-container-low cursor-pointer transition"
                    onClick={() => navigate(`/clinic/partners/${p.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-on-surface">{p.name}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{p.email}</div>
                    </td>
                    <td className="px-6 py-4 text-on-surface font-medium">{fmt(p.budget.limit)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${barColor(pct, isBlocked)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-on-surface-variant w-9 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        {fmt(p.budget.committed)} de {fmt(p.budget.limit)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.budget.blockedByClinic ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-error-container text-on-error-container font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                          Bloqueado
                        </span>
                      ) : p.budget.budgetBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#fff3e0] text-orange-800 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          Saldo Esgotado
                        </span>
                      ) : pct >= 80 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#fff8e1] text-yellow-800 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          Em Alerta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#e8f5e9] text-green-800 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleBlock(p.id, e)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                            p.budget.blockedByClinic
                              ? 'border-tertiary/30 text-tertiary hover:bg-tertiary/5'
                              : 'border-error/30 text-error hover:bg-error/5'
                          }`}
                        >
                          {p.budget.blockedByClinic ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, p.name, e)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
