import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../auth'

export default function ClinicNavbar() {
  const navigate = useNavigate()
  function handleLogout() { logout(); navigate('/login') }

  return (
    <nav className="bg-indigo-800 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/clinic" className="font-bold text-lg tracking-wide flex items-center gap-2">
            <span className="bg-indigo-600 px-2 py-0.5 rounded text-xs font-bold tracking-wider">CLÍNICA</span>
            ExameQR
          </Link>
          <Link to="/clinic" className="text-indigo-200 hover:text-white text-sm">Visão Geral</Link>
          <Link to="/clinic/partners/new" className="text-indigo-200 hover:text-white text-sm">+ Novo Parceiro</Link>
        </div>
        <button onClick={handleLogout} className="text-sm text-indigo-300 hover:text-white">Sair</button>
      </div>
    </nav>
  )
}
