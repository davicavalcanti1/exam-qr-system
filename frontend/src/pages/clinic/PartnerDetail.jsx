import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR')

function EditLimitModal({ current, onSave, onClose }) {
  const [value, setValue] = useState(current)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await onSave(value)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm border border-surface-container-high">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>edit</span>
          </div>
          <h3 className="font-bold text-on-surface">Editar Limite de Orçamento</h3>
        </div>
        <input
          type="number"
          min="100"
          step="50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-outline-variant bg-surface-container-low rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary mb-5 text-sm"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-outline-variant rounded-xl py-2.5 text-sm text-on-surface-variant hover:bg-surface-container transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 glass-gradient text-white rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BudgetCard({ budget, onEditLimit }) {
  const pct = Math.min(budget.percentUsed, 100)
  const barClass = budget.blocked ? 'bg-error' : pct >= 80 ? 'bg-yellow-400' : 'bg-tertiary-fixed-dim'

  return (
    <div className={`rounded-2xl border-2 p-5 ${budget.blocked ? 'border-error/30 bg-error-container/30' : 'border-surface-container-high bg-surface'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-on-surface">Saldo do Parceiro</h3>
          {budget.blockedByClinic && (
            <span className="text-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium">
              Bloqueado manualmente
            </span>
          )}
          {budget.budgetBlocked && !budget.blockedByClinic && (
            <span className="text-xs bg-[#fff3e0] text-orange-800 px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium">
              Aguardando pagamento
            </span>
          )}
        </div>
        <button onClick={onEditLimit} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
          Editar limite
        </button>
      </div>

      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mb-3">
        <div className={`h-2 rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="text-center bg-surface-container-low rounded-xl py-3">
          <p className="text-on-surface-variant text-xs mb-0.5">Limite</p>
          <p className="font-bold text-on-surface">{fmt(budget.limit)}</p>
        </div>
        <div className="text-center bg-surface-container-low rounded-xl py-3">
          <p className="text-on-surface-variant text-xs mb-0.5">Utilizado</p>
          <p className={`font-bold ${budget.committed > budget.limit ? 'text-error' : 'text-on-surface'}`}>
            {fmt(budget.committed)}
          </p>
        </div>
        <div className="text-center bg-surface-container-low rounded-xl py-3">
          <p className="text-on-surface-variant text-xs mb-0.5">Disponível</p>
          <p className={`font-bold ${budget.available < 0 ? 'text-error' : 'text-tertiary'}`}>
            {fmt(budget.available)}
          </p>
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

  if (!partner) return (
    <div className="flex items-center justify-center py-32">
      {error ? (
        <p className="text-on-surface-variant">{error}</p>
      ) : (
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )

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

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/clinic')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-on-surface">{partner.name}</h1>
          <p className="text-on-surface-variant text-sm">{partner.email}</p>
        </div>
        <button
          onClick={handleToggleBlock}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
            isBlocked
              ? 'border-tertiary/30 text-tertiary bg-tertiary/5 hover:bg-tertiary/10'
              : 'border-error/30 text-error bg-error/5 hover:bg-error/10'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{isBlocked ? 'lock_open' : 'lock'}</span>
          {isBlocked ? 'Desbloquear' : 'Bloquear'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <BudgetCard budget={partner.budget} onEditLimit={() => setShowEditLimit(true)} />

        {/* Payment history */}
        <div className="bg-surface rounded-2xl border border-surface-container-high p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>receipt_long</span>
            <h3 className="font-semibold text-on-surface">Histórico de Pagamentos</h3>
          </div>
          {partner.paymentHistory.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-outline mb-2" style={{ fontSize: '32px' }}>receipt</span>
              <p className="text-on-surface-variant text-sm">Nenhum pagamento registrado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {partner.paymentHistory.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm bg-surface-container-low rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '16px' }}>
                      {p.method === 'pix' ? 'bolt' : 'credit_card'}
                    </span>
                    <span className="font-semibold text-on-surface">{fmt(p.amount)}</span>
                    <span className="text-xs text-on-surface-variant capitalize">{p.method === 'pix' ? 'Pix' : 'Cartão'}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">{fmtDate(p.paid_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patients list */}
      <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>people</span>
            <h3 className="font-semibold text-on-surface">Pacientes</h3>
          </div>
          <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
            {partner.patients.length} cadastrados
          </span>
        </div>
        {partner.patients.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-outline mb-2" style={{ fontSize: '40px' }}>person_off</span>
            <p className="text-on-surface-variant text-sm">Nenhum paciente cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Paciente</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">CPF</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Valor</th>
                <th className="text-left px-6 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">QR Status</th>
              </tr>
            </thead>
            <tbody>
              {partner.patients.map((p) => (
                <tr key={p.id} className="border-t border-surface-container-high">
                  <td className="px-6 py-3.5 font-medium text-on-surface">{p.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-on-surface-variant">{fmtCpf(p.cpf)}</td>
                  <td className="px-6 py-3.5 text-on-surface">{fmt(p.total_value)}</td>
                  <td className="px-6 py-3.5">
                    {!p.qr_id ? (
                      <span className="text-xs text-on-surface-variant">Sem QR</span>
                    ) : p.qr_status === 'exhausted' ? (
                      <span className="text-xs text-error font-medium">Esgotado</span>
                    ) : p.qr_status === 'revoked' ? (
                      <span className="text-xs text-on-surface-variant">Revogado</span>
                    ) : (
                      <span className="text-xs text-tertiary font-medium">Ativo ({p.qr_uses}/{p.qr_max_uses})</span>
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
