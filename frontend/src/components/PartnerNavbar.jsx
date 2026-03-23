import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../auth'

export default function PartnerNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()

  function handleLogout() { logout(); navigate('/login') }

  function linkClass(path) {
    const active = location.pathname === path || location.pathname.startsWith(path + '/')
    return active
      ? 'text-indigo-700 font-semibold border-b-2 border-indigo-600 pb-1 font-inter tracking-tight text-sm'
      : 'text-slate-500 hover:text-indigo-500 font-inter tracking-tight text-sm font-medium transition-colors'
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.partnerName?.charAt(0)?.toUpperCase() || 'P'
  const displayName = user?.name || user?.partnerName || 'Parceiro'

  return (
    <nav className="bg-white border-none sticky top-0 z-50 shadow-sm">
      <div className="flex justify-between items-center w-full px-8 py-4">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-xl font-bold tracking-tighter text-indigo-700">ExameQR</Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
            <Link to="/patients/new" className={linkClass('/patients')}>Pacientes</Link>
            <Link to="/scanner" className={linkClass('/scanner')}>Scanner</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              title="Notificações"
              onClick={() => alert('Nenhuma notificação no momento.')}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              title="Configurações"
              onClick={() => alert('Configurações da conta disponíveis em breve.')}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30 mx-2" />
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-sm ring-2 ring-surface-container-high hover:opacity-90 transition"
            title={`${displayName} — Clique para sair`}
          >
            {initial}
          </button>
        </div>
      </div>
    </nav>
  )
}
