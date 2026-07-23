import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Field, Input, Button, useToast } from '../../../components/ui'
import AparenciaControls from '../AparenciaControls'

const ROLE = { owner: 'Dono', empresa_admin: 'Administrador da empresa', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }

export default function PerfilArea({ onBack }) {
  const { profile, reloadProfile } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState(profile?.nome || '')
  const [savingNome, setSavingNome] = useState(false)
  const [s1, setS1] = useState(''); const [s2, setS2] = useState('')
  const [savingSenha, setSavingSenha] = useState(false)

  async function salvarNome(e) {
    e.preventDefault()
    const n = nome.trim(); if (!n) return toast.error('Informe um nome.')
    setSavingNome(true)
    const { error } = await supabase.rpc('update_own_name', { p_nome: n })
    setSavingNome(false)
    if (error) return toast.error(error.message)
    toast.success('Nome atualizado.'); reloadProfile?.()
  }
  async function salvarSenha(e) {
    e.preventDefault()
    if (s1.length < 6) return toast.error('A senha deve ter ao menos 6 caracteres.')
    if (s1 !== s2) return toast.error('As senhas não coincidem.')
    setSavingSenha(true)
    const { error } = await supabase.auth.updateUser({ password: s1 })
    setSavingSenha(false)
    if (error) return toast.error(error.message)
    setS1(''); setS2(''); toast.success('Senha alterada.')
  }

  const inicial = (profile?.nome || profile?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon="arrow_back" onClick={onBack}>Voltar</Button>
        <h2 className="font-display text-xl font-extrabold tracking-tight">Configurações do perfil</h2>
      </div>

      {/* Conta */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-5">
          <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl flex-none">{inicial}</span>
          <div className="min-w-0">
            <p className="font-bold truncate">{profile?.nome || '—'}</p>
            <p className="text-sm text-on-surface-variant truncate">{profile?.email || profile?.username} · {ROLE[profile?.role] || profile?.role}</p>
          </div>
        </div>
        <form onSubmit={salvarNome} className="flex gap-2 items-end">
          <Field label="Nome de exibição" className="flex-1"><Input value={nome} onChange={e => setNome(e.target.value)} /></Field>
          <Button type="submit" variant="secondary" loading={savingNome} className="flex-none">Salvar</Button>
        </form>
      </Card>

      {/* Aparência */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Aparência</h3>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">Tema e cor de destaque do sistema.</p>
        <AparenciaControls />
      </Card>

      {/* Segurança */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Segurança</h3>
        <p className="text-sm text-on-surface-variant mt-1 mb-4">Altere sua senha de acesso.</p>
        <form onSubmit={salvarSenha} className="space-y-4 max-w-sm">
          <Field label="Nova senha"><Input type="password" value={s1} onChange={e => setS1(e.target.value)} placeholder="mínimo 6 caracteres" /></Field>
          <Field label="Confirmar nova senha"><Input type="password" value={s2} onChange={e => setS2(e.target.value)} /></Field>
          <Button type="submit" loading={savingSenha}>Alterar senha</Button>
        </form>
      </Card>
    </div>
  )
}
