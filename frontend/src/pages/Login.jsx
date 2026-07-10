import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import PartnershipMark from '../components/PartnershipMark'

const SUPPORT_EMAIL = 'suporte@exameqr.com.br'

const MODALS = {
  forgot: {
    title: 'Esqueceu a senha?',
    body: [
      'Por segurança, a redefinição de senha é feita pela clínica.',
      'Peça ao administrador da clínica — ou, se você for funcionário, ao coordenador do seu parceiro — para gerar uma nova senha de acesso.',
    ],
    action: { label: 'Falar com o suporte', href: `mailto:${SUPPORT_EMAIL}?subject=Redefinição de senha` },
  },
  access: {
    title: 'Solicitar acesso de parceiro',
    body: [
      'As credenciais de parceiro são criadas pela clínica.',
      'Entre em contato informando o nome da instituição e um e-mail para receber seu acesso de coordenador.',
    ],
    action: { label: 'Solicitar por e-mail', href: `mailto:${SUPPORT_EMAIL}?subject=Solicitação de acesso de parceiro` },
  },
  privacidade: {
    title: 'Política de Privacidade',
    body: [
      'O ExameQR coleta apenas os dados necessários ao controle de exames por parceria: nome e CPF do paciente, exames autorizados e informações da conta do parceiro.',
      'Os dados são usados exclusivamente para gerar e validar as autorizações (QR Code) e para o controle financeiro entre a clínica e seus parceiros. Não compartilhamos dados com terceiros para fins de marketing.',
      'O QR Code contém apenas um token de autorização criptografado — nenhum dado sensível trafega nele. Para exercer direitos sobre seus dados (acesso, correção ou exclusão), fale com a clínica responsável.',
    ],
  },
  termos: {
    title: 'Termos de Uso',
    body: [
      'O acesso ao ExameQR é concedido pela clínica aos seus parceiros e destina-se ao registro e à autorização de exames dentro do teto de crédito acordado.',
      'O parceiro é responsável pelos dados que registra e pelo uso feito por seus funcionários. A geração e a autorização do QR Code são de responsabilidade do coordenador do parceiro.',
      'O uso indevido, o compartilhamento de credenciais ou o registro de informações falsas podem levar à suspensão do acesso pela clínica.',
    ],
  },
}

export default function Login() {
  const [modal, setModal] = useState(null)
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
          <img src="/brotopay.png" alt="ExameQR" className="w-24 h-24 mx-auto mb-2 object-contain" />
          <h1 className="text-3xl font-black tracking-tighter text-primary">ExameQR</h1>
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
                  <button
                    type="button"
                    onClick={() => setModal('forgot')}
                    className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                  >
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
              <button
                onClick={() => setModal('access')}
                className="text-sm font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-2"
              >
                Solicitar acesso para parceiro
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
              </button>
            </div>
          </div>
        </div>

        <PartnershipMark className="mt-8" />

        {/* Footer */}
        <footer className="mt-6 flex justify-between items-center px-2">
          <div className="flex gap-4">
            <button onClick={() => setModal('privacidade')} className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/60 hover:text-primary transition-colors">Privacidade</button>
            <button onClick={() => setModal('termos')} className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/60 hover:text-primary transition-colors">Termos</button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
            <span className="text-[10px] font-medium text-on-surface-variant/60">Sistemas Operantes</span>
          </div>
        </footer>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
              <h3 className="text-lg font-bold">{MODALS[modal].title}</h3>
              <button onClick={() => setModal(null)} className="p-1 text-on-surface-variant hover:text-on-surface rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {MODALS[modal].body.map((p, i) => (
                <p key={i} className="text-sm text-on-surface-variant leading-relaxed">{p}</p>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-end gap-3">
              {MODALS[modal].action && (
                <a href={MODALS[modal].action.href} className="px-4 py-2 rounded-lg signature-gradient text-white text-sm font-bold hover:opacity-90 transition-opacity">
                  {MODALS[modal].action.label}
                </a>
              )}
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
