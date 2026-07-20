import { useAuth } from '../../../auth/AuthContext'
import { Card, Field, Select, Loading } from '../../../components/ui'
import AparenciaControls from '../AparenciaControls'
import ConfiguracoesEmpresa from './ConfiguracoesEmpresa'
import UsuariosEmpresa from './UsuariosEmpresa'

function Preferencias() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold">Preferências</h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-5">Aparência e idioma do sistema.</p>
      <AparenciaControls />
      <div className="mt-5 max-w-sm">
        <Field label="Idioma" hint="Outros idiomas em breve.">
          <Select value="pt-BR" onChange={() => {}}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en" disabled>English (em breve)</option>
            <option value="es" disabled>Español (em breve)</option>
          </Select>
        </Field>
      </div>
    </Card>
  )
}

// Configurações do admin da empresa: preferências + operação + usuários, centralizado.
export default function ConfiguracoesArea() {
  const { empresa, reloadProfile } = useAuth()
  if (!empresa) return <Loading />
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Preferencias />
      <ConfiguracoesEmpresa empresa={empresa} viaRpc onSaved={reloadProfile} />
      <UsuariosEmpresa />
    </div>
  )
}
