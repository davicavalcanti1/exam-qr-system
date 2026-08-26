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
import ComoFunciona from './pages/public/docs/ComoFunciona'
import Papeis from './pages/public/docs/Papeis'
import Modulos from './pages/public/docs/Modulos'
import WhiteLabel from './pages/public/docs/WhiteLabel'
import DocNetris from './pages/public/docs/Netris'
import Arquitetura from './pages/public/docs/Arquitetura'
import DadosDoc from './pages/public/docs/Dados'
import Contas from './pages/public/docs/Contas'
import AutorizarLote from './pages/public/AutorizarLote'

// Onde este app está montado. Ele atende em dois endereços com as MESMAS
// rotas: no host próprio (raiz) e sob `/scan-parceiros-app` quando exibido dentro do
// Controle Operacional. Lido do endereço porque é o mesmo build nos dois.
const BASENAME = window.location.pathname.startsWith('/scan-parceiros-app') ? '/scan-parceiros-app' : '/'

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/autorizar/:token" element={<AutorizarLote />} />
        <Route path="/integracao-netris" element={<IntegracaoNetris />} />
        {/* documentação pública (sem login) */}
        <Route path="/documentacao" element={<Documentacao />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/tratamento-de-dados" element={<TratamentoDados />} />
        <Route path="/docs/como-funciona" element={<ComoFunciona />} />
        <Route path="/docs/papeis" element={<Papeis />} />
        <Route path="/docs/modulos" element={<Modulos />} />
        <Route path="/docs/white-label" element={<WhiteLabel />} />
        <Route path="/docs/netris" element={<DocNetris />} />
        <Route path="/docs/arquitetura" element={<Arquitetura />} />
        <Route path="/docs/dados" element={<DadosDoc />} />
        <Route path="/docs/contas" element={<Contas />} />
        {/* Porta de entrada quando este app e exibido dentro do Controle
            Operacional. La o modulo ocupa /scan-parceiros, entao o iframe abre
            nesse caminho — que aqui nao corresponde a tela nenhuma. Sem esta
            linha o usuario cairia no catch-all vindo do menu do sistema.

            /painel e o destino certo: quem chega pelo sistema ja esta
            autenticado por SSO, e o painel e que decide qual area mostrar pelo
            papel da pessoa. */}
        <Route path="/scan-parceiros" element={<Navigate to="/painel" replace />} />

        {/* rotas legadas (Express/clinic/partner) desativadas — tudo cai no login v2 */}
        <Route path="/login" element={<Navigate to="/entrar" replace />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
