import { useState } from 'react'
import { adminApi } from '../../lib/adminApi'
import { Modal, Field, Input, Select, Button, useToast } from '../../components/ui'

const ROLES_EMPRESA = [{ v: 'empresa_admin', l: 'Administrador' }, { v: 'empresa_operador', l: 'Operador' }]
const ROLES_PARCEIRO = [{ v: 'parceiro_coordenador', l: 'Coordenador' }, { v: 'parceiro_funcionario', l: 'Funcionário' }]

// Edita nome, usuário (login) e — se podeRole (owner) — o papel do usuário.
export default function EditarUsuarioModal({ user, podeRole = false, onClose, onSaved }) {
  const toast = useToast()
  const [nome, setNome] = useState(user.nome || '')
  const [username, setUsername] = useState(user.username || '')
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)

  const ehParceiro = ['parceiro_coordenador', 'parceiro_funcionario'].includes(user.role)
  const roles = ehParceiro ? ROLES_PARCEIRO : ROLES_EMPRESA

  async function salvar(e) {
    e.preventDefault()
    if (!nome.trim() || !username.trim()) return toast.error('Nome e usuário são obrigatórios.')
    setSaving(true)
    try {
      const payload = { nome: nome.trim(), username: username.trim() }
      if (podeRole && role !== user.role) payload.role = role
      await adminApi.updateUser(user.id, payload)
      toast.success('Usuário atualizado.'); onSaved?.(); onClose()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Editar usuário" subtitle={user.email || user.username} icon="edit">
      <form onSubmit={salvar} className="p-6 space-y-4">
        <Field label="Nome"><Input value={nome} onChange={e => setNome(e.target.value)} required autoFocus /></Field>
        <Field label="Usuário (login)" hint="Altera o login de acesso da pessoa."><Input value={username} onChange={e => setUsername(e.target.value)} required /></Field>
        {podeRole && (
          <Field label="Papel">
            <Select value={role} onChange={e => setRole(e.target.value)}>
              {roles.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </Select>
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} icon="save">Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}
