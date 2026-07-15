import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import CreateUserModal from '../CreateUserModal'

export default function ParceiroArea() {
  const { empresaId, parceiroId } = useAuth()
  const [funcs, setFuncs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, nome, username, role, ativo')
      .eq('parceiro_id', parceiroId)
      .order('created_at', { ascending: false })
    setFuncs((data || []).filter(u => u.role === 'parceiro_funcionario'))
    setLoading(false)
  }
  useEffect(() => { if (parceiroId) load() }, [parceiroId])

  async function toggleAtivo(u) {
    await adminApi.updateUser(u.id, { ativo: !u.ativo }).catch(() => {})
    await load()
  }
  async function resetarSenha(u) {
    if (!window.confirm(`Redefinir a senha de ${u.nome}?`)) return
    try { const r = await adminApi.resetarSenha(u.id); window.alert(`Nova senha de ${u.nome}:\n\n${r.senha}\n\nRepasse ao funcionário — ele troca no próximo acesso.`) }
    catch (e) { window.alert('Falha: ' + e.message) }
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Funcionários ({funcs.length})</h3>
          <button onClick={() => setModal(true)} className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">add</span>Criar funcionário
          </button>
        </div>
        {loading ? <p className="text-center py-10 text-on-surface-variant text-sm">Carregando…</p>
          : funcs.length === 0 ? <p className="text-center py-10 text-on-surface-variant text-sm">Nenhum funcionário ainda.</p>
          : <div className="divide-y divide-outline-variant/10">
              {funcs.map(u => (
                <div key={u.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm ${u.ativo ? '' : 'opacity-40'}`}>{u.nome?.charAt(0)?.toUpperCase() || 'F'}</div>
                    <div><p className={`font-semibold text-sm ${u.ativo ? '' : 'opacity-50 line-through'}`}>{u.nome}</p><p className="text-[11px] text-on-surface-variant tabular-nums">{u.username}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => resetarSenha(u)} title="Redefinir senha" className="p-1 text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>key</span></button>
                    <button onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar acesso' : 'Ativar acesso'} className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full transition ${u.ativo ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant hover:bg-error-container/50 hover:text-on-error-container' : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary'}`}>{u.ativo ? 'ativo' : 'inativo'}</button>
                  </div>
                </div>
              ))}
            </div>}
      </section>

      <CreateUserModal
        open={modal}
        title="Novo funcionário"
        role="parceiro_funcionario"
        empresaId={empresaId}
        parceiroId={parceiroId}
        onClose={() => setModal(false)}
        onCreated={load}
      />
    </div>
  )
}
