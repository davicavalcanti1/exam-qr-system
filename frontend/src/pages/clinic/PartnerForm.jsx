import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

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

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clinic')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Novo Parceiro</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Parceiro</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex: Clínica São Lucas"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email de Acesso</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="parceiro@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite de Orçamento (R$)
          </label>
          <input
            type="number"
            min="100"
            step="50"
            value={form.budget_limit}
            onChange={set('budget_limit')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            O parceiro poderá liberar exames até este valor. Quando ultrapassado, emissão é bloqueada automaticamente.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/clinic')}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Parceiro'}
          </button>
        </div>
      </form>
    </div>
  )
}
