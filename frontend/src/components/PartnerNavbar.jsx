import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../auth'

export default function PartnerNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()

  function handleLogout() { logout(); navigate('/login') }

  function navClass(path) {
    return location.pathname === path
      ? 'text-white font-semibold'
      : 'text-white/70 hover:text-white'
  }

  return (
    <nav className="glass-gradient shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-0 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '16px' }}>qr_code_2</span>
            </div>
            <span className="font-bold text-white tracking-tight">Carnexa</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link to="/dashboard" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${navClass('/dashboard')}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>grid_view</span>
              Pacientes
            </Link>
            <Link to="/patients/new" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${navClass('/patients/new')}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
              Novo Paciente
            </Link>
            <Link to="/scanner" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${navClass('/scanner')}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>qr_code_scanner</span>
              Leitor
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm hidden sm:block">{user?.partnerName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition px-2 py-1.5 rounded-lg hover:bg-white/10"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}
