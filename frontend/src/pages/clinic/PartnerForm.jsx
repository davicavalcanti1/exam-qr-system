import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

export default function PartnerForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', budgetLimit: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.createPartner({
        name: form.name,
        email: form.email,
        password: form.password,
        budget_limit: parseFloat(form.budgetLimit.replace(',', '.')) || 0,
      })
      navigate('/clinic')
    } catch (err) {
      setError(err.message || 'Erro ao criar parceiro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen">
      {/* Top Navigation */}
      <header className="bg-surface-container-low flex justify-between items-center w-full px-8 py-4">
        <div className="text-xl font-bold tracking-tighter text-indigo-700">ExameQR</div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-primary-container flex items-center justify-center text-white font-bold text-sm">A</div>
          </div>
        </div>
      </header>

      <main className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-on-surface-variant mb-6 text-sm font-medium">
            <span
              className="hover:text-primary cursor-pointer transition-colors"
              onClick={() => navigate('/clinic')}
            >Parceiros</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary font-semibold">Novo Registro</span>
          </nav>

          {/* Form Card */}
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/15 shadow-2xl shadow-indigo-900/5">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-2">Criar Novo Parceiro</h1>
              <p className="text-on-surface-variant text-sm">
                Preencha os dados abaixo para registrar uma nova unidade ou laboratório parceiro no sistema.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-sm font-medium">{error}</div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Nome do Parceiro */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Nome do Parceiro
                </label>
                <input
                  className="w-full bg-surface border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-secondary-fixed rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 transition-all outline-none"
                  placeholder="Ex: Laboratório Central"
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
              </div>

              {/* Email + Senha grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Email de Acesso
                  </label>
                  <input
                    className="w-full bg-surface border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-secondary-fixed rounded-lg py-3 px-4 text-on-surface placeholder:text-outline/50 transition-all outline-none"
                    placeholder="admin@parceiro.com.br"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Senha Temporária
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-secondary-fixed rounded-lg py-3 px-4 pr-10 text-on-surface placeholder:text-outline/50 transition-all outline-none"
                      placeholder="••••••••"
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3.5 text-on-surface-variant"
                      onClick={() => setShowPass(s => !s)}
                    >
                      <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Limite de Orçamento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Limite de Orçamento (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-on-surface-variant font-medium">R$</span>
                  </div>
                  <input
                    className="w-full bg-surface border-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-secondary-fixed rounded-lg py-3 pl-12 pr-4 text-on-surface tabular-nums placeholder:text-outline/50 transition-all outline-none"
                    placeholder="0,00"
                    type="text"
                    value={form.budgetLimit}
                    onChange={set('budgetLimit')}
                  />
                </div>
                <div className="flex items-start gap-2 mt-2 px-1">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <p className="text-[0.8rem] text-on-surface-variant leading-relaxed">
                    Quando o limite for atingido, novas solicitações de exames serão bloqueadas automaticamente até a renovação da cota ou ajuste manual pelo administrador.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="form-gradient-btn text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-1 disabled:opacity-60"
                >
                  <span>{loading ? 'Criando...' : 'Criar Parceiro'}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/clinic')}
                  className="bg-surface-container-high text-on-surface font-semibold py-3 px-8 rounded-lg hover:bg-surface-dim transition-all flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* Footer Meta */}
          <div className="mt-8 flex justify-center items-center gap-8 text-xs text-outline font-medium tracking-wide uppercase">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Transação Criptografada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>Conformidade LGPD</span>
            </div>
          </div>
        </div>
      </main>

      {/* Side decoration */}
      <div className="hidden lg:block fixed bottom-0 right-0 p-12 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'wght' 200" }}>clinical_notes</span>
      </div>
    </div>
  )
}
