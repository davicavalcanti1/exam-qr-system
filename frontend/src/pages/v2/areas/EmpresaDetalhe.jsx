import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { Card, Button, Badge, Loading, EmptyState, useToast } from '../../../components/ui'
import CreateUserModal from '../CreateUserModal'
import DesenvolvedorArea from './DesenvolvedorArea'

const dataBR = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
const ABAS = [
  { k: 'info', label: 'Informações', icon: 'info' },
  { k: 'usuarios', label: 'Usuários', icon: 'group' },
  { k: 'integracao', label: 'Integração', icon: 'terminal' },
]

function Linha({ label, valor }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface-variant flex-none">{label}</span>
      <span className="text-sm font-semibold text-right">{valor || '—'}</span>
    </div>
  )
}

export default function EmpresaDetalhe({ empresa, onBack, onChange }) {
  const toast = useToast()
  const [aba, setAba] = useState('info')
  const [emp, setEmp] = useState(empresa)
  const [carregando, setCarregando] = useState(true)
  const [admins, setAdmins] = useState(null)
  const [modal, setModal] = useState(false)
  const [logoInput, setLogoInput] = useState('')

  async function loadEmpresa() {
    const { data } = await supabase.from('empresas').select('*').eq('id', empresa.id).maybeSingle()
    if (data) setEmp(data)
    setCarregando(false)
  }
  async function loadAdmins() {
    const { data } = await supabase.from('profiles').select('id, nome, username, email, role, ativo').eq('empresa_id', empresa.id).order('created_at', { ascending: false })
    setAdmins(data || [])
  }
  useEffect(() => { loadEmpresa() }, [empresa.id])
  useEffect(() => { setLogoInput(emp.logo_url || '') }, [emp.logo_url])
  useEffect(() => { if (aba === 'usuarios' && admins === null) loadAdmins() }, [aba])

  async function salvarLogo(url) {
    const v = (url ?? '').trim() || null
    const { error } = await supabase.from('empresas').update({ logo_url: v }).eq('id', emp.id)
    if (error) return toast.error(error.message)
    setEmp(e => ({ ...e, logo_url: v })); onChange?.(); toast.success('Logo atualizada.')
  }
  async function toggleStatus() {
    const novo = emp.status === 'ativa' ? 'inativa' : 'ativa'
    const { error } = await supabase.from('empresas').update({ status: novo }).eq('id', emp.id)
    if (error) return toast.error(error.message)
    setEmp(e => ({ ...e, status: novo })); onChange?.(); toast.success(`Empresa ${novo}.`)
  }
  async function toggleUser(u) { await adminApi.updateUser(u.id, { ativo: !u.ativo }).catch(() => {}); await loadAdmins() }
  async function resetSenha(u) {
    if (!window.confirm(`Redefinir a senha de ${u.nome}?`)) return
    try { const r = await adminApi.resetarSenha(u.id); window.alert(`Nova senha de ${u.nome}:\n\n${r.senha}\n\nRepasse — troca no próximo acesso.`) }
    catch (e) { toast.error(e.message) }
  }

  const roleLabel = (r) => ({ empresa_admin: 'Administrador', owner: 'Dono' }[r] || r)

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" icon="arrow_back" onClick={onBack}>Empresas</Button>
        <div className="flex items-center gap-3 min-w-0">
          {emp.logo_url
            ? <span className="h-11 flex items-center flex-none"><img src={emp.logo_url} alt={emp.nome} className="h-9 max-w-[160px] object-contain" /></span>
            : <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-none"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>business</span></span>}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold tracking-tight truncate">{emp.nome}</h2>
            <p className="text-[11px] text-on-surface-variant">{emp.slug}</p>
          </div>
        </div>
        <Badge tone={emp.status === 'ativa' ? 'success' : 'neutral'} className="ml-auto flex-none">{emp.status}</Badge>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
        {ABAS.map(a => (
          <button key={a.k} onClick={() => setAba(a.k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${aba === a.k ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {aba === 'info' && (carregando ? <Loading /> : (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Informações</h3>
            <Button variant="secondary" size="sm" onClick={toggleStatus}>{emp.status === 'ativa' ? 'Inativar' : 'Ativar'} empresa</Button>
          </div>
          <Linha label="Razão social" valor={emp.nome} />
          <Linha label="Nome fantasia" valor={emp.nome_fantasia} />
          <Linha label="CNPJ" valor={emp.cnpj} />
          <Linha label="Identificador (slug)" valor={emp.slug} />
          <Linha label="Endereço" valor={emp.endereco} />
          <Linha label="Telefone" valor={emp.telefone} />
          <Linha label="E-mail" valor={emp.email} />
          <Linha label="Criada em" valor={dataBR(emp.created_at)} />

          <div className="mt-5 pt-5 border-t border-outline-variant/10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Logomarca</span>
            <div className="flex items-center gap-3 mt-2">
              <span className="w-24 h-14 rounded-xl bg-surface ring-1 ring-outline-variant/20 flex items-center justify-center flex-none overflow-hidden">
                {emp.logo_url ? <img src={emp.logo_url} alt="" className="max-h-10 max-w-[84px] object-contain" /> : <span className="material-symbols-outlined text-on-surface-variant/50">image</span>}
              </span>
              <input value={logoInput} onChange={e => setLogoInput(e.target.value)} placeholder="URL da logo (ex.: /imago-logo.png)" className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" />
              <Button variant="secondary" onClick={() => salvarLogo(logoInput)} className="flex-none">Salvar</Button>
            </div>
            <button onClick={() => salvarLogo('/imago-logo.png')} className="text-xs font-bold text-primary hover:underline mt-2">Usar logo IMAGO</button>
          </div>
        </Card>
      ))}

      {aba === 'usuarios' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Administradores</h3>
            <Button size="sm" icon="add" onClick={() => setModal(true)}>Criar administrador</Button>
          </div>
          {admins === null ? <Loading />
            : admins.length === 0 ? <EmptyState icon="group_add" title="Nenhum administrador" hint="Crie o administrador desta empresa." />
            : <div className="divide-y divide-outline-variant/10">
                {admins.map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-none">{(u.nome || '?').charAt(0).toUpperCase()}</span>
                    <div className={`min-w-0 flex-1 ${u.ativo ? '' : 'opacity-50'}`}>
                      <p className={`font-semibold text-sm truncate ${u.ativo ? '' : 'line-through'}`}>{u.nome}</p>
                      <p className="text-[11px] text-on-surface-variant">{u.username} · {roleLabel(u.role)}</p>
                    </div>
                    <button onClick={() => resetSenha(u)} title="Redefinir senha" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 hover:text-primary"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>key</span></button>
                    <button onClick={() => toggleUser(u)} title={u.ativo ? 'Desativar' : 'Ativar'}><Badge tone={u.ativo ? 'success' : 'neutral'}>{u.ativo ? 'ativo' : 'inativo'}</Badge></button>
                  </div>
                ))}
              </div>}
        </Card>
      )}

      {aba === 'integracao' && <DesenvolvedorArea empresaId={emp.id} empresaNome={emp.nome} />}

      <CreateUserModal
        open={modal}
        title="Novo administrador da empresa"
        role="empresa_admin"
        empresaId={emp.id}
        onClose={() => setModal(false)}
        onCreated={loadAdmins}
      />
    </div>
  )
}
