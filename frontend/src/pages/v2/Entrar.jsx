import { useState } from 'react'
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
  const { ready, signIn } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
        <div className="flex items-center gap-3">
          <img src="/brotopay.png" alt="ExameQR" className="w-16 h-16 object-contain" />
          <span className="font-display text-4xl font-extrabold tracking-tight">ExameQR</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-extrabold tracking-tight leading-tight">Controle de exames por parceria, do jeito certo.</h1>
          <ul className="mt-8 space-y-4">
            {DESTAQUES.map((d, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-none"><span className="material-symbols-outlined">{d.icon}</span></span>
                <span className="text-white/90 text-sm">{d.txt}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/60 text-xs">ExameQR · Campina Grande — PB</p>
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10" aria-hidden />
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
        </div>
      </main>
    </div>
  )
}
