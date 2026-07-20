import { useAuth } from '../../../auth/AuthContext'
import { Loading } from '../../../components/ui'
import ConfiguracoesEmpresa from './ConfiguracoesEmpresa'

// Auto-serviço do admin da empresa: configura a própria empresa (via RPC).
export default function ConfiguracoesArea() {
  const { empresa, reloadProfile } = useAuth()
  if (!empresa) return <Loading />
  return <ConfiguracoesEmpresa empresa={empresa} viaRpc onSaved={reloadProfile} />
}
