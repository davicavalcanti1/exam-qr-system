import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// v2 (Supabase Auth / multi-tenant) — único fluxo ativo
import Entrar from './pages/v2/Entrar'
import Painel from './pages/v2/Painel'
import ScanPage from './pages/v2/ScanPage'
import IntegracaoNetris from './pages/v2/IntegracaoNetris'
import Documentacao from './pages/public/Documentacao'
import Privacidade from './pages/public/Privacidade'
import Seguranca from './pages/public/Seguranca'
import Termos from './pages/public/Termos'
import TratamentoDados from './pages/public/TratamentoDados'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/integracao-netris" element={<IntegracaoNetris />} />
        {/* documentação pública (sem login) */}
        <Route path="/documentacao" element={<Documentacao />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/tratamento-de-dados" element={<TratamentoDados />} />
        {/* rotas legadas (Express/clinic/partner) desativadas — tudo cai no login v2 */}
        <Route path="/login" element={<Navigate to="/entrar" replace />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
