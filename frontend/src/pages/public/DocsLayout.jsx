import { Link } from 'react-router-dom'

const NAV = [
  { to: '/documentacao', label: 'Documentação' },
  { to: '/privacidade', label: 'Privacidade (LGPD)' },
  { to: '/seguranca', label: 'Segurança & dados' },
  { to: '/tratamento-de-dados', label: 'Tratamento de dados (DPA)' },
  { to: '/termos', label: 'Termos de uso' },
]

// Casca das páginas públicas de documentação (acessíveis sem login).
export default function DocsLayout({ title, subtitle, updated, children }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <header className="bg-white border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl font-extrabold tracking-tight text-primary">ExameQR</span>
          </Link>
          <Link to="/entrar" className="text-sm font-bold text-on-surface-variant hover:text-primary">Entrar</Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          {NAV.map(n => (
            <Link key={n.to} to={n.to} className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition">{n.label}</Link>
          ))}
        </div>

        <header className="mb-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
          {subtitle && <p className="text-on-surface-variant mt-2">{subtitle}</p>}
          {updated && <p className="text-[11px] text-on-surface-variant mt-3">Última atualização: {updated}</p>}
        </header>

        <article className="doc-prose">{children}</article>
      </main>

      <footer className="border-t border-outline-variant/10 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant">
          <span>© ExameQR · Campina Grande — PB</span>
          <div className="flex flex-wrap gap-4">
            {NAV.map(n => <Link key={n.to} to={n.to} className="hover:text-primary">{n.label}</Link>)}
          </div>
        </div>
      </footer>
    </div>
  )
}

// helpers de conteúdo
export function H2({ children }) { return <h2 className="font-display text-xl font-extrabold tracking-tight mt-8 mb-3">{children}</h2> }
export function P({ children }) { return <p className="text-[15px] leading-relaxed text-on-surface/90 mb-3">{children}</p> }
export function UL({ children }) { return <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-on-surface/90 mb-3">{children}</ul> }
