import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function pctColor(pct, blocked) {
  if (blocked) return 'text-red-600 bg-red-50 border-red-200'
  if (pct >= 90) return 'text-red-600 bg-red-50 border-red-200'
  if (pct >= 70) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-green-700 bg-green-50 border-green-200'
}

function barColor(pct, blocked) {
  if (blocked || pct >= 100) return 'bg-red-500'
  if (pct >= 70) return 'bg-yellow-400'
  return 'bg-green-500'
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
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

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>
  if (!stats) return null

  const { partners } = stats

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Visão Geral da Clínica</h1>
        <Link
          to="/clinic/partners/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Novo Parceiro
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de Parceiros" value={stats.totalPartners} sub={`${stats.activePartners} ativos`} color="blue" />
        <StatCard
          label="Gasto Total"
          value={fmt(stats.totalCommitted)}
          sub={`de ${fmt(stats.totalBudgetAllocated)} alocado`}
          color="blue"
        />
        <StatCard label="Em Alerta (>80%)" value={stats.atRisk} sub="próximos do limite" color="yellow" />
        <StatCard label="Bloqueados" value={stats.blocked} sub="requerem atenção" color={stats.blocked > 0 ? 'red' : 'green'} />
      </div>

      {/* Partners table */}
      {partners.length === 0 ? (
        <div className="bg-white rounded-xl shadow text-center py-16">
          <p className="text-gray-400 text-lg mb-2">Nenhum parceiro cadastrado</p>
          <Link to="/clinic/partners/new" className="text-indigo-600 hover:underline text-sm">
            Cadastrar primeiro parceiro
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Parceiro</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Limite</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium w-48">Uso do Saldo</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const pct = p.budget.percentUsed
                const isBlocked = p.budget.blocked
                return (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => navigate(`/clinic/partners/${p.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{fmt(p.budget.limit)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${barColor(pct, isBlocked)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${pctColor(pct, isBlocked)}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {fmt(p.budget.committed)} de {fmt(p.budget.limit)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {p.budget.blockedByClinic ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-medium">Bloq. Clínica</span>
                      ) : p.budget.budgetBlocked ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 font-medium">Saldo Esgotado</span>
                      ) : pct >= 80 ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 font-medium">Em Alerta</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">Ativo</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleBlock(p.id, e)}
                          className={`text-xs px-3 py-1 rounded-lg border transition ${
                            p.budget.blockedByClinic
                              ? 'border-green-300 text-green-700 hover:bg-green-50'
                              : 'border-red-300 text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {p.budget.blockedByClinic ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(p.id, p.name, e)}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
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
