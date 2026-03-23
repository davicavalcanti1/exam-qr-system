import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../auth'

export default function PartnerNavbar() {
  const navigate = useNavigate()
  const location = useNavigate()
  const user = getUser()
  function handleLogout() { logout(); navigate('/login') }

  function linkClass(path) {
    const active = window.location.pathname === path
    return active
      ? 'text-indigo-700 font-semibold border-b-2 border-indigo-600 pb-1 font-inter tracking-tight text-sm'
      : 'text-slate-500 hover:text-indigo-500 font-inter tracking-tight text-sm font-medium transition-colors'
  }

  return (
    <nav className="bg-white border-none sticky top-0 z-50 shadow-sm">
      <div className="flex justify-between items-center w-full px-8 py-4">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-indigo-700">ExameQR</span>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
            <Link to="/patients/new" className={linkClass('/patients/new')}>Pacientes</Link>
            <Link to="/scanner" className={linkClass('/scanner')}>Scanner</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30 mx-2" />
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white font-bold text-sm ring-2 ring-surface-container-high hover:opacity-90 transition"
            title={user?.partnerName || 'Sair'}
          >
            {user?.partnerName?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        </div>
      </div>
    </nav>
  )
}
