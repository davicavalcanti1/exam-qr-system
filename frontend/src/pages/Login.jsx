import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 glass-gradient flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '22px' }}>qr_code_2</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Carnexa</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestão inteligente<br />de carnês virtuais
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Controle completo de pacientes, exames e pagamentos com QR codes seguros e validação em tempo real.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: 'shield_lock', label: 'QR Codes Assinados', desc: 'HMAC-SHA256 seguro' },
              { icon: 'groups', label: 'Multi-parceiro', desc: 'Isolamento total de dados' },
              { icon: 'account_balance_wallet', label: 'Controle de Saldo', desc: 'Limites por ciclo' },
              { icon: 'qr_code_scanner', label: 'Scanner Integrado', desc: 'Validação por câmera' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-2xl p-4">
                <span className="material-symbols-outlined text-white/80 mb-2" style={{ fontSize: '22px' }}>{f.icon}</span>
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2025 Carnexa. Todos os direitos reservados.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 glass-gradient rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>qr_code_2</span>
            </div>
            <span className="font-bold text-on-surface text-lg">Carnexa</span>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Entrar</h2>
          <p className="text-on-surface-variant text-sm mb-8">Acesse o sistema com suas credenciais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-outline-variant bg-surface-container-low rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Senha</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-outline-variant bg-surface-container-low rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-error-container border border-error/30 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
                <p className="text-on-error-container text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-gradient text-white font-semibold py-3 rounded-xl transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-on-surface-variant mt-8">
            Somente usuários autorizados pela clínica
          </p>
        </div>
      </div>
    </div>
  )
}
