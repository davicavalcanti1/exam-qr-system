import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { resolveLoginEmail } from '../../lib/supabase'
import { Button, Field, Input } from '../../components/ui'

const DESTAQUES = [
  { icon: 'qr_code_2', txt: 'QR único por paciente — o exame só debita o teto no scan' },
  { icon: 'event_available', txt: 'Agendamento real, integrado ao NetRis' },
  { icon: 'receipt_long', txt: 'Cobrança por lote, com recibo e contrato' },
]

export default function Entrar() {
  const { ready, signIn, signInGoogle } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()

  // Login é neutro: usa o accent padrão (verde), não a cor pessoal do usuário.
  // Restaura a preferência salva ao sair da tela — sem alterar o que está salvo.
  useEffect(() => {
    const prev = document.documentElement.dataset.accent
    delete document.documentElement.dataset.accent
    return () => { if (prev) document.documentElement.dataset.accent = prev }
  }, [])

  async function handleGoogle() {
    setError(''); setGoogleLoading(true)
    const { error } = await signInGoogle()
    if (error) { setError(error.message || 'Não foi possível entrar com o Google.'); setGoogleLoading(false) }
    // sucesso: o navegador é redirecionado ao Google, não volta aqui.
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error } = await signIn(resolveLoginEmail(login), password)
      if (error) {
        const m = (error.message || '').toLowerCase()
        if (m.includes('not confirmed')) setError('E-mail não confirmado no Supabase (ative Auto Confirm).')
        else if (m.includes('invalid login')) setError('Usuário ou senha incorretos.')
        else setError(error.message || 'Não foi possível entrar.')
        return
      }
      navigate('/painel')
    } catch { setError('Não foi possível entrar. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Painel de marca (esquerda, desktop) */}
      <aside className="hidden lg:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden signature-gradient">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" aria-hidden />
        <div className="absolute right-6 bottom-6 opacity-25 animate-float pointer-events-none" aria-hidden>
          <img src="/brotopay.png" alt="" className="w-56 h-56 object-contain drop-shadow-2xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <img src="/brotopay.png" alt="ExameQR" className="w-16 h-16 object-contain" />
          <span className="font-display text-4xl font-extrabold tracking-tight">ExameQR</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-extrabold tracking-tight leading-tight text-balance">Controle de exames por parceria, do jeito certo.</h1>
          <ul className="mt-8 space-y-4">
            {DESTAQUES.map((d, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-none"><span className="material-symbols-outlined">{d.icon}</span></span>
                <span className="text-white/90 text-sm">{d.txt}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-white/60 text-xs">ExameQR · Campina Grande — PB</p>
      </aside>

      {/* Formulário (direita) */}
      <main className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <img src="/brotopay.png" alt="ExameQR" className="w-24 h-24 mx-auto mb-2 object-contain" />
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-primary">ExameQR</h1>
          </div>

          <h2 className="font-display text-2xl font-extrabold tracking-tight">Acesse sua conta</h2>
          <p className="text-on-surface-variant text-sm mt-1 mb-6">Entre com seu usuário ou e-mail.</p>

          {!ready && <div className="mb-4 p-3 rounded-xl bg-yellow-50 text-yellow-800 text-sm">Configuração do Supabase pendente (VITE_SUPABASE_URL / ANON_KEY).</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Usuário ou e-mail">
              <Input placeholder="nome.sobrenome" value={login} onChange={e => setLogin(e.target.value)} autoFocus required />
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Input type={show ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pr-10" required />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </Field>

            {error && <div className="bg-error-container/40 rounded-xl px-4 py-3 text-sm text-on-error-container">{error}</div>}

            <Button type="submit" loading={loading} disabled={!ready} iconRight="arrow_forward" className="w-full !py-3.5">Entrar</Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-outline-variant/30" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">ou</span>
            <span className="flex-1 h-px bg-outline-variant/30" />
          </div>

          <button type="button" onClick={handleGoogle} disabled={!ready || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg ring-1 ring-outline-variant/40 bg-surface-container-lowest font-bold text-sm hover:ring-primary hover:bg-black/[.02] transition disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {googleLoading ? 'Redirecionando…' : 'Entrar com Google'}
          </button>
          <p className="text-[11px] text-on-surface-variant mt-2 text-center">Use o Google do e-mail convidado pela sua empresa.</p>

          <div className="mt-8 pt-4 border-t border-outline-variant/10 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
            <a href="/documentacao" className="hover:text-primary">Documentação</a>
            <a href="/privacidade" className="hover:text-primary">Privacidade (LGPD)</a>
            <a href="/seguranca" className="hover:text-primary">Segurança &amp; dados</a>
            <a href="/termos" className="hover:text-primary">Termos</a>
          </div>
        </div>
      </main>
    </div>
  )
}
