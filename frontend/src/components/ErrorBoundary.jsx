import { Component } from 'react'

// Captura erros de render em qualquer tela e mostra uma tela amigável
// (em vez de a página inteira ficar em branco).
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { erro: null } }
  static getDerivedStateFromError(erro) { return { erro } }
  componentDidCatch(erro, info) { console.error('ErrorBoundary:', erro, info) }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 soft-bg-gradient">
        <div className="bg-surface-container-lowest rounded-2xl shadow-card p-8 max-w-sm w-full text-center">
          <img src="/brotopay.png" alt="ExameQR" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="font-display text-xl font-extrabold tracking-tight">Algo deu errado</h1>
          <p className="text-sm text-on-surface-variant mt-2">Tivemos um problema ao carregar esta tela. Recarregar costuma resolver.</p>
          <button onClick={() => window.location.reload()} className="mt-5 w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-container transition inline-flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">refresh</span>Recarregar
          </button>
        </div>
      </div>
    )
  }
}
