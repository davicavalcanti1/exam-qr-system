import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-lg tracking-wide">
            ExameQR
          </Link>
          <Link to="/" className="text-blue-100 hover:text-white text-sm">
            Dashboard
          </Link>
          <Link to="/patients/new" className="text-blue-100 hover:text-white text-sm">
            Novo Paciente
          </Link>
          <Link to="/scanner" className="text-blue-100 hover:text-white text-sm">
            Leitor QR
          </Link>
        </div>
        <button
          onClick={logout}
          className="text-sm text-blue-200 hover:text-white"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
