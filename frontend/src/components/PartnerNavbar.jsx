import { Link, useNavigate } from 'react-router-dom'
import { logout, getUser } from '../auth'

export default function PartnerNavbar() {
  const navigate = useNavigate()
  const user = getUser()
  function handleLogout() { logout(); navigate('/login') }

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="font-bold text-lg tracking-wide">ExameQR</Link>
          <Link to="/dashboard" className="text-blue-100 hover:text-white text-sm">Dashboard</Link>
          <Link to="/patients/new" className="text-blue-100 hover:text-white text-sm">Novo Paciente</Link>
          <Link to="/scanner" className="text-blue-100 hover:text-white text-sm">Leitor QR</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-blue-200 text-sm hidden sm:block">{user?.partnerName}</span>
          <button onClick={handleLogout} className="text-sm text-blue-300 hover:text-white">Sair</button>
        </div>
      </div>
    </nav>
  )
}
