const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function BudgetBar({ budget }) {
  if (!budget) return null
  const pct = Math.min((budget.committed / budget.limit) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-gray-700">Saldo de Liberação</h2>
        <span className={`text-sm font-bold ${pct >= 90 ? 'text-red-600' : 'text-gray-700'}`}>
          {fmt(budget.available)} disponível
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`${color} h-4 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Utilizado: {fmt(budget.committed)}</span>
        <span>Limite: {fmt(budget.limit)}</span>
      </div>
    </div>
  )
}
