import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { Modal, Field, Input, Select, Button, useToast } from '../../components/ui'

// Convite por e-mail: cria uma linha em `convites`. A pessoa entra com Google
// (mesmo e-mail) e herda o papel/empresa/parceiro definidos aqui.
export default function ConvidarModal({ empresaId, parceiroId, roles, onClose, onDone }) {
  const { user } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [role, setRole] = useState(roles[0]?.value)
  const [saving, setSaving] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast.error('Informe um e-mail válido.')
    setSaving(true)
    const { error } = await supabase.from('convites').insert({
      email: mail, nome: nome.trim() || null, role,
      empresa_id: empresaId || null, parceiro_id: parceiroId || null, convidado_por: user?.id,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Convite registrado. A pessoa entra com o Google desse e-mail.')
    onDone?.(); onClose()
  }

  return (
    <Modal open onClose={onClose} title="Convidar por e-mail" subtitle="A pessoa acessa com a conta Google desse e-mail" icon="mail">
      <form onSubmit={enviar} className="p-6 space-y-4">
        <Field label="E-mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pessoa@gmail.com" autoFocus required /></Field>
        <Field label="Nome (opcional)"><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da pessoa" /></Field>
        {roles.length > 1 && (
          <Field label="Papel">
            <Select value={role} onChange={e => setRole(e.target.value)}>
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} icon="send">Enviar convite</Button>
        </div>
      </form>
    </Modal>
  )
}
