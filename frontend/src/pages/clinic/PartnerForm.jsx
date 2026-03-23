import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ClinicPartnerForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', budget_limit: '2000' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.createPartner(form)
      navigate('/clinic')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border border-outline-variant bg-surface-container-low rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
  const labelClass = "block text-sm font-medium text-on-surface mb-1.5"

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/clinic')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Novo Parceiro</h1>
          <p className="text-on-surface-variant text-sm">Preencha os dados do parceiro</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-6 space-y-5">
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>business</span>
              Nome do Parceiro
            </span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            className={inputClass}
            placeholder="Ex: Clínica São Lucas"
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>mail</span>
              Email de Acesso
            </span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            className={inputClass}
            placeholder="parceiro@email.com"
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>lock</span>
              Senha
            </span>
          </label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            className={inputClass}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>account_balance_wallet</span>
              Limite de Orçamento (R$)
            </span>
          </label>
          <input
            type="number"
            min="100"
            step="50"
            value={form.budget_limit}
            onChange={set('budget_limit')}
            className={inputClass}
            required
          />
          <p className="text-xs text-on-surface-variant mt-1.5 flex items-start gap-1">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>info</span>
            O parceiro poderá liberar exames até este valor. Quando ultrapassado, emissão é bloqueada automaticamente.
          </p>
        </div>

        {/* Budget preview */}
        {form.budget_limit && (
          <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container-high">
            <p className="text-xs text-on-surface-variant mb-1">Limite configurado</p>
            <p className="text-xl font-bold text-primary">{fmt(parseFloat(form.budget_limit) || 0)}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
            <p className="text-on-error-container text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/clinic')}
            className="flex-1 border border-outline-variant text-on-surface-variant py-3 rounded-xl text-sm hover:bg-surface-container transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 glass-gradient text-white font-semibold py-3 rounded-xl text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                Criar Parceiro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
