import { useNavigate } from 'react-router-dom'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function BudgetBar({ budget }) {
  const navigate = useNavigate()
  if (!budget) return null

  const pct = Math.min(budget.percentUsed ?? (budget.committed / budget.limit) * 100, 100)

  if (budget.blockedByClinic) {
    return (
      <div className="bg-error-container/40 border-2 border-error/30 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '20px' }}>lock</span>
          </div>
          <div>
            <h2 className="font-bold text-error text-base">Emissão Bloqueada pela Clínica</h2>
            <p className="text-on-error-container text-sm mt-0.5">Entre em contato com a clínica para regularização.</p>
          </div>
        </div>
      </div>
    )
  }

  if (budget.budgetBlocked) {
    return (
      <div className="bg-error-container/40 border-2 border-error/30 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-error" style={{ fontSize: '20px' }}>block</span>
            </div>
            <div>
              <h2 className="font-bold text-error text-base">Emissão de QR Codes Bloqueada</h2>
              <p className="text-on-error-container text-sm mt-0.5">
                Saldo devedor: <strong>{fmt(budget.amountDue)}</strong>
                {budget.amountDue > budget.limit && (
                  <span className="ml-1 text-xs opacity-70">
                    (+{fmt(budget.amountDue - budget.limit)} acima do limite)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/payment')}
            className="glass-gradient text-white font-bold px-5 py-2.5 rounded-xl text-sm transition hover:opacity-90 shadow flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>credit_card</span>
            Fazer Pagamento
          </button>
        </div>
        <div className="w-full bg-error/20 rounded-full h-2 overflow-hidden mt-4">
          <div className="bg-error h-2 rounded-full w-full" />
        </div>
        <div className="flex justify-between text-xs text-on-error-container/60 mt-1.5">
          <span>Utilizado: {fmt(budget.committed)}</span>
          <span>Limite: {fmt(budget.limit)}</span>
        </div>
      </div>
    )
  }

  const barClass = pct >= 80 ? 'bg-yellow-400' : 'bg-tertiary-fixed-dim'
  const availableColor = pct >= 80 ? 'text-yellow-700' : 'text-tertiary'

  return (
    <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-5 mb-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>account_balance_wallet</span>
          <h2 className="font-semibold text-on-surface">Saldo de Liberação</h2>
        </div>
        <span className={`text-sm font-bold ${availableColor}`}>
          {fmt(budget.available)} disponível
        </span>
      </div>
      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
        <div className={`${barClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-on-surface-variant mt-1.5">
        <span>Utilizado: {fmt(budget.committed)}</span>
        <span>Limite: {fmt(budget.limit)}</span>
      </div>
    </div>
  )
}
