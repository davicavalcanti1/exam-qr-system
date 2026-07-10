import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { resolveLoginEmail } from '../../lib/supabase'

export default function Entrar() {
  const { ready, signIn } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await signIn(resolveLoginEmail(login), password)
      if (error) { setError('Usuário ou senha inválidos.'); return }
      navigate('/painel')
    } catch {
      setError('Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      <main className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <img src="/brotopay.png" alt="ExameQR" className="w-20 h-20 mx-auto mb-2 object-contain" />
          <h1 className="text-3xl font-black tracking-tighter text-primary">ExameQR</h1>
          <p className="text-on-surface-variant text-sm mt-1">Controle de exames por parceria</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-card p-8 border border-outline-variant/5">
          <h2 className="text-xl font-semibold text-on-surface mb-1">Acesse sua conta</h2>
          <p className="text-on-surface-variant text-sm mb-6">Entre com seu usuário ou e-mail.</p>

          {!ready && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
              Configuração do Supabase pendente (VITE_SUPABASE_URL / ANON_KEY).
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase">Usuário ou e-mail</label>
              <input
                className="w-full px-4 py-3 bg-surface-bright border border-outline-variant rounded-lg text-on-surface text-sm focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="nome.sobrenome"
                value={login}
                onChange={e => setLogin(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase">Senha</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-10 bg-surface-bright border border-outline-variant rounded-lg text-on-surface text-sm focus:ring-2 focus:ring-primary outline-none transition"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && <div className="bg-error-container/40 border border-error/20 rounded-lg px-4 py-3 text-sm text-on-error-container">{error}</div>}

            <button type="submit" disabled={loading || !ready} className="w-full bg-primary text-white font-bold py-3.5 rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? 'Entrando…' : 'Entrar'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
