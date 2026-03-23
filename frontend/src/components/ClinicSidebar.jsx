import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../auth'

const navItems = [
  { to: '/clinic', label: 'Visão Geral', icon: 'dashboard' },
  { to: '/clinic/partners/new', label: 'Novo Parceiro', icon: 'add_circle' },
]

export default function ClinicSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-full w-64 flex flex-col z-40 shadow-lg" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)' }}>
      {/* Logo */}
      <div className="glass-gradient px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>
            qr_code_2
          </span>
        </div>
        <div>
          <span className="text-white font-bold text-lg tracking-tight">Carnexa</span>
          <p className="text-white/60 text-xs">Painel da Clínica</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Menu</p>
        {navItems.map((item) => {
          const isActive = item.to === '/clinic'
            ? location.pathname === '/clinic'
            : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}

        <div className="border-t border-white/10 my-4" />

        <Link
          to="/scanner"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            qr_code_scanner
          </span>
          Leitor QR
        </Link>
      </nav>

      {/* Footer / Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-red-300 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            logout
          </span>
          Sair
        </button>
      </div>
    </aside>
  )
}
