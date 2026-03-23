import { useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../auth'

const navItems = [
  { to: '/clinic', label: 'Visão Geral', icon: 'dashboard', exact: true },
  { to: '/clinic/stats', label: 'Gestão de Cotas', icon: 'leaderboard', exact: false },
  { to: '/clinic/auth', label: 'Autorizações', icon: 'verified_user', exact: false },
  { to: '/clinic/finance', label: 'Financeiro', icon: 'payments', exact: false },
  { to: '/clinic/support', label: 'Suporte', icon: 'contact_support', exact: false },
]

export default function ClinicSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  function isActive(item) {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col p-4 gap-2 z-50 border-r border-outline-variant/10">
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white">
            <span className="material-symbols-outlined">health_metrics</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-indigo-700 leading-none">ExameQR</h1>
            <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase mt-1">Modo Gestor Clínica</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item)
          const implemented = item.to === '/clinic'
          return (
            <button
              key={item.to}
              onClick={() => implemented ? navigate(item.to) : alert(`"${item.label}" está em desenvolvimento e será disponibilizado em breve.`)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                active
                  ? 'bg-white text-indigo-600 shadow-sm font-bold scale-105'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-500'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-inter text-sm">{item.label}</span>
              {!implemented && <span className="ml-auto text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">Em breve</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-outline-variant/15">
        <button
          onClick={() => navigate('/clinic/partners/new')}
          className="w-full glass-gradient text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined">qr_code_2</span>
          Novo Parceiro
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 mt-2 text-slate-600 hover:text-error transition-all w-full rounded-lg"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-inter text-sm">Sair</span>
        </button>
      </div>
    </aside>
  )
}
