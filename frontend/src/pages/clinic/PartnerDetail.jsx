import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR')

function BudgetCard({ budget, onEditLimit }) {
  const pct = Math.min(budget.percentUsed, 100)
  const color = budget.blocked ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'

  return (
    <div className={`rounded-xl border-2 p-5 ${budget.blocked ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-700">Saldo do Parceiro</h3>
          {budget.blockedByClinic && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full mt-1 inline-block">
              Bloqueado manualmente
            </span>
          )}
          {budget.budgetBlocked && !budget.blockedByClinic && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mt-1 inline-block">
              Saldo esgotado — aguardando pagamento
            </span>
          )}
        </div>
        <button
          onClick={onEditLimit}
          className="text-xs text-indigo-600 hover:underline"
        >
          Editar limite
        </button>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
        <div className="text-center">
          <p className="text-gray-500 text-xs">Limite</p>
          <p className="font-bold text-gray-800">{fmt(budget.limit)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs">Utilizado</p>
          <p className={`font-bold ${budget.committed > budget.limit ? 'text-red-600' : 'text-gray-800'}`}>
            {fmt(budget.committed)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs">Disponível</p>
          <p className={`font-bold ${budget.available < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {fmt(budget.available)}
          </p>
        </div>
      </div>
    </div>
  )
}

function EditLimitModal({ current, onSave, onClose }) {
  const [value, setValue] = useState(current)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await onSave(value)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">Editar Limite de Orçamento</h3>
        <input
          type="number"
          min="100"
          step="50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClinicPartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [partner, setPartner] = useState(null)
  const [showEditLimit, setShowEditLimit] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      setPartner(await api.getClinicPartner(id))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleToggleBlock() {
    if (!confirm(`${partner.status === 'blocked' ? 'Desbloquear' : 'Bloquear'} este parceiro?`)) return
    await api.toggleBlockPartner(id)
    load()
  }

  async function handleSaveLimit(newLimit) {
    await api.updatePartner(id, { budget_limit: newLimit })
    setShowEditLimit(false)
    load()
  }

  if (!partner) return <div className="text-center py-20 text-gray-400">{error || 'Carregando...'}</div>

  const isBlocked = partner.status === 'blocked'

  return (
    <div>
      {showEditLimit && (
        <EditLimitModal
          current={partner.budget_limit}
          onSave={handleSaveLimit}
          onClose={() => setShowEditLimit(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clinic')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{partner.name}</h1>
          <p className="text-sm text-gray-400">{partner.email}</p>
        </div>
        <button
          onClick={handleToggleBlock}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
            isBlocked
              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
              : 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100'
          }`}
        >
          {isBlocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BudgetCard budget={partner.budget} onEditLimit={() => setShowEditLimit(true)} />

        {/* Payment history */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Histórico de Pagamentos</h3>
          {partner.paymentHistory.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum pagamento registrado</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {partner.paymentHistory.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{fmt(p.amount)}</span>
                    <span className="ml-2 text-xs text-gray-400 capitalize">{p.method === 'pix' ? 'Pix' : 'Cartão'}</span>
                  </div>
                  <span className="text-xs text-gray-400">{fmtDate(p.paid_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patients list (read-only) */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">
            Pacientes ({partner.patients.length})
          </h3>
        </div>
        {partner.patients.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Nenhum paciente cadastrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Paciente</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">CPF</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Valor</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">QR Status</th>
              </tr>
            </thead>
            <tbody>
              {partner.patients.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{fmtCpf(p.cpf)}</td>
                  <td className="px-5 py-3 text-gray-700">{fmt(p.total_value)}</td>
                  <td className="px-5 py-3">
                    {!p.qr_id ? (
                      <span className="text-xs text-gray-400">Sem QR</span>
                    ) : p.qr_status === 'exhausted' ? (
                      <span className="text-xs text-red-600">Esgotado</span>
                    ) : p.qr_status === 'revoked' ? (
                      <span className="text-xs text-gray-400">Revogado</span>
                    ) : (
                      <span className="text-xs text-green-600">Ativo ({p.qr_uses}/{p.qr_max_uses})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
