import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
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
                    <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm">{u.nome?.charAt(0)?.toUpperCase() || 'F'}</div>
                    <div><p className="font-semibold text-sm">{u.nome}</p><p className="text-[11px] text-on-surface-variant tabular-nums">{u.username}</p></div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.ativo ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant' : 'bg-surface-container text-on-surface-variant'}`}>{u.ativo ? 'ativo' : 'inativo'}</span>
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
