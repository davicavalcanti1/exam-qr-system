import { Link, useLocation } from 'react-router-dom'

// Central de documentação: sidebar agrupada + conteúdo. Mesmo visual do site.
export const NAV_GROUPS = [
  {
    grupo: 'Produto',
    itens: [
      { to: '/documentacao', label: 'Visão geral' },
      { to: '/docs/como-funciona', label: 'Como funciona' },
      { to: '/docs/papeis', label: 'Papéis e acessos' },
      { to: '/docs/modulos', label: 'Módulos' },
      { to: '/docs/white-label', label: 'Multiempresa & white-label' },
    ],
  },
  {
    grupo: 'Integrações',
    itens: [{ to: '/docs/netris', label: 'NetRis (agendamento)' }],
  },
  {
    grupo: 'Segurança & LGPD',
    itens: [
      { to: '/privacidade', label: 'Privacidade' },
      { to: '/seguranca', label: 'Segurança & dados' },
      { to: '/tratamento-de-dados', label: 'Tratamento de dados (DPA)' },
      { to: '/termos', label: 'Termos de uso' },
    ],
  },
  {
    grupo: 'Técnico',
    itens: [
      { to: '/docs/arquitetura', label: 'Arquitetura & stack' },
      { to: '/docs/dados', label: 'Dados & isolamento' },
      { to: '/docs/contas', label: 'Contas & autenticação' },
    ],
  },
]

function Sidebar({ pathname }) {
  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map(g => (
        <div key={g.grupo}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-3 mb-1.5">{g.grupo}</p>
          <div className="space-y-0.5">
            {g.itens.map(it => {
              const on = pathname === it.to
              return (
                <Link key={it.to} to={it.to}
                  className={`block px-3 py-1.5 rounded-lg text-sm font-medium transition ${on ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-black/[.04] hover:text-on-surface'}`}>
                  {it.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function DocsLayout({ title, subtitle, updated, children }) {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <header className="bg-surface-container-lowest border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brotopay.png" alt="ExameQR" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl font-extrabold tracking-tight text-primary">ExameQR</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant ml-1 hidden sm:inline">Docs</span>
          </Link>
          <Link to="/entrar" className="text-sm font-bold text-on-surface-variant hover:text-primary">Entrar</Link>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex gap-6 lg:gap-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-56 flex-none">
          <div className="sticky top-24"><Sidebar pathname={pathname} /></div>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Índice (mobile) */}
          <details className="lg:hidden mb-6 bg-surface-container rounded-xl p-3">
            <summary className="text-sm font-bold cursor-pointer">Índice da documentação</summary>
            <div className="mt-3"><Sidebar pathname={pathname} /></div>
          </details>

          <header className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
            {subtitle && <p className="text-on-surface-variant mt-2 text-[15px]">{subtitle}</p>}
            {updated && <p className="text-[11px] text-on-surface-variant mt-3">Última atualização: {updated}</p>}
          </header>

          <article className="doc-prose max-w-3xl">{children}</article>
        </main>
      </div>

      <footer className="border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-on-surface-variant">© ExameQR · Campina Grande — PB</div>
      </footer>
    </div>
  )
}

// helpers de conteúdo
export function H2({ children }) { return <h2 className="font-display text-xl font-extrabold tracking-tight mt-8 mb-3">{children}</h2> }
export function H3({ children }) { return <h3 className="font-bold text-[15px] mt-5 mb-1.5">{children}</h3> }
export function P({ children }) { return <p className="text-[15px] leading-relaxed text-on-surface/90 mb-3">{children}</p> }
export function UL({ children }) { return <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-on-surface/90 mb-3">{children}</ul> }
export function Nota({ children }) { return <div className="my-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-xl px-4 py-3 text-[14px] text-on-surface/90">{children}</div> }
export function Passos({ children }) { return <ol className="list-decimal pl-5 space-y-1.5 text-[15px] leading-relaxed text-on-surface/90 mb-3">{children}</ol> }
