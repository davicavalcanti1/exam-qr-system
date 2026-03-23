import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      localStorage.setItem('token', data.token)
      navigate(data.role === 'clinic' ? '/clinic' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/3 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full" />
      </div>
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/4 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <main className="w-full max-w-[440px]">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4 border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '30px' }}>qr_code_2</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-indigo-700">ExameQR</h1>
          <p className="text-on-surface-variant font-medium tracking-tight mt-1 text-sm">Clinical Intelligence &amp; Authorization</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden border border-outline-variant/5">
          <div className="p-8 md:p-10">
            <header className="mb-8">
              <h2 className="text-xl font-semibold text-on-surface">Acesse sua conta</h2>
              <p className="text-on-surface-variant text-sm mt-1">Insira suas credenciais para gerenciar exames.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase" htmlFor="email">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '18px' }}>mail</span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-surface-bright border border-outline-variant rounded-lg text-on-surface text-sm focus:ring-2 focus:ring-secondary-fixed focus:border-primary-container transition-all outline-none"
                    placeholder="nome@clinica.com.br"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase" htmlFor="senha">
                    Senha
                  </label>
                  <button type="button" className="text-xs font-semibold text-primary hover:text-primary-container transition-colors">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '18px' }}>lock</span>
                  </div>
                  <input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-surface-bright border border-outline-variant rounded-lg text-on-surface text-sm focus:ring-2 focus:ring-secondary-fixed focus:border-primary-container transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-outline hover:text-on-surface-variant" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-error-container/40 border border-error/20 rounded-lg px-4 py-3 text-sm text-on-error-container">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full signature-gradient text-white font-semibold py-3.5 px-4 rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: '18px' }}>arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-col items-center gap-4">
              <p className="text-xs text-on-surface-variant">Ainda não tem acesso?</p>
              <button className="text-sm font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-2">
                Solicitar acesso para parceiro
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 flex justify-between items-center px-2">
          <div className="flex gap-4">
            <a className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Privacidade</a>
            <a className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/60 hover:text-primary transition-colors" href="#">Termos</a>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
            <span className="text-[10px] font-medium text-on-surface-variant/60">Sistemas Operantes</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
