import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// v2 (Supabase Auth / multi-tenant) — único fluxo ativo
import Entrar from './pages/v2/Entrar'
import Painel from './pages/v2/Painel'
import ScanPage from './pages/v2/ScanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/scan" element={<ScanPage />} />
        {/* rotas legadas (Express/clinic/partner) desativadas — tudo cai no login v2 */}
        <Route path="/login" element={<Navigate to="/entrar" replace />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
