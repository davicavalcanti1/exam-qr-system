import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Button, Badge, Loading, EmptyState, useToast } from '../../../components/ui'
import ConvidarModal from '../ConvidarModal'

const ROLE = { empresa_admin: 'Administrador', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário', owner: 'Dono' }

// Controle de usuários da empresa (dentro das Configurações do admin).
export default function UsuariosEmpresa() {
  const { empresaId } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [convidar, setConvidar] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, nome, username, email, role, ativo')
      .eq('empresa_id', empresaId).order('created_at', { ascending: false })
    setUsers(data || [])
  }
  useEffect(() => { if (empresaId) load() }, [empresaId])

  async function toggle(u) { await adminApi.updateUser(u.id, { ativo: !u.ativo }).catch(e => toast.error(e.message)); await load() }
  async function reset(u) {
    if (!window.confirm(`Redefinir a senha de ${u.nome}?`)) return
    try { const r = await adminApi.resetarSenha(u.id); window.alert(`Nova senha de ${u.nome}:\n\n${r.senha}\n\nRepasse — troca no próximo acesso.`) }
    catch (e) { toast.error(e.message) }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Usuários</h3>
        <Button size="sm" variant="secondary" icon="mail" onClick={() => setConvidar(true)}>Convidar administrador</Button>
      </div>
      {users === null ? <Loading />
        : users.length === 0 ? <EmptyState icon="group" title="Nenhum usuário" hint="Convide o primeiro administrador." />
        : <div className="divide-y divide-outline-variant/10">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{(u.nome || '?').charAt(0).toUpperCase()}</span>
                <div className={`min-w-0 flex-1 ${u.ativo ? '' : 'opacity-50'}`}>
                  <p className={`font-semibold text-sm truncate ${u.ativo ? '' : 'line-through'}`}>{u.nome || '—'}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{u.email || u.username} · {ROLE[u.role] || u.role}</p>
                </div>
                <button onClick={() => reset(u)} title="Redefinir senha" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 hover:text-primary"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>key</span></button>
                <button onClick={() => toggle(u)} title={u.ativo ? 'Desativar' : 'Ativar'}><Badge tone={u.ativo ? 'success' : 'neutral'}>{u.ativo ? 'ativo' : 'inativo'}</Badge></button>
              </div>
            ))}
          </div>}

      {convidar && (
        <ConvidarModal
          empresaId={empresaId}
          roles={[{ value: 'empresa_admin', label: 'Administrador da empresa' }]}
          onClose={() => setConvidar(false)}
          onDone={load}
        />
      )}
    </Card>
  )
}
