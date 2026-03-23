import { useNavigate } from 'react-router-dom'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function BudgetBar({ budget }) {
  const navigate = useNavigate()
  if (!budget) return null

  const pct = Math.min(budget.percentUsed ?? (budget.committed / budget.limit) * 100, 100)
  const barColor = budget.blocked ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500'

  // Bloqueado pela clínica
  if (budget.blockedByClinic) {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔒</span>
          <div>
            <h2 className="font-bold text-red-700 text-lg">Emissão Bloqueada pela Clínica</h2>
            <p className="text-red-500 text-sm">Entre em contato com a clínica para regularização.</p>
          </div>
        </div>
      </div>
    )
  }

  // Saldo esgotado
  if (budget.budgetBlocked) {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔒</span>
              <h2 className="font-bold text-red-700 text-lg">Emissão de QR Codes Bloqueada</h2>
            </div>
            <p className="text-red-600 text-sm">
              Saldo devedor: <strong>{fmt(budget.amountDue)}</strong>
              {budget.amountDue > budget.limit && (
                <span className="ml-1 text-xs opacity-70">(+{fmt(budget.amountDue - budget.limit)} acima do limite)</span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/payment')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow"
          >
            💳 Fazer Pagamento
          </button>
        </div>
        <div className="w-full bg-red-200 rounded-full h-3 overflow-hidden mt-4">
          <div className="bg-red-500 h-3 rounded-full w-full" />
        </div>
        <div className="flex justify-between text-xs text-red-400 mt-1">
          <span>Utilizado: {fmt(budget.committed)}</span>
          <span>Limite: {fmt(budget.limit)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-gray-700">Saldo de Liberação</h2>
        <span className={`text-sm font-bold ${pct >= 80 ? 'text-yellow-600' : 'text-green-700'}`}>
          {fmt(budget.available)} disponível
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div className={`${barColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Utilizado: {fmt(budget.committed)}</span>
        <span>Limite: {fmt(budget.limit)}</span>
      </div>
    </div>
  )
}
