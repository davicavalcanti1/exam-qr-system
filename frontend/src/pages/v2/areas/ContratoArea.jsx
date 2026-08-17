import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import ContratoModal from '../ContratoModal'

const dataBR = (s) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const ST = {
  pendente: { label: 'Aguardando sua assinatura', cls: 'bg-yellow-50 text-yellow-700', icon: 'hourglass_top' },
  assinado: { label: 'Assinado', cls: 'bg-primary/10 text-primary', icon: 'verified' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container', icon: 'block' },
  recusado: { label: 'Assinatura recusada', cls: 'bg-error-container/40 text-on-error-container', icon: 'block' },
  expirado: { label: 'Prazo expirado', cls: 'bg-surface-container text-on-surface-variant', icon: 'schedule' },
}

export default function ContratoArea() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [ver, setVer] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('contratos')
      .select('id, titulo, conteudo, status, assinante_nome, assinado_at, created_at, provedor, sign_url, arquivo_path, signatario_email, enviado_at, hash_sha256, recusado_motivo')
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false })
    setContratos(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (contratos.length === 0)
    return <div className="bg-surface-container-lowest p-10 rounded-2xl shadow-card text-center text-on-surface-variant text-sm">Nenhum contrato disponível ainda. A empresa gera o contrato da parceria para você assinar.</div>

  return (
    <div className="space-y-4">
      {contratos.map(c => {
        const st = ST[c.status] || ST.pendente
        return (
          <section key={c.id} className="bg-surface-container-lowest rounded-2xl shadow-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{c.titulo}</h3>
                <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${st.cls}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{st.icon}</span>{st.label}
                </span>
                {c.status === 'assinado' && <p className="text-xs text-on-surface-variant mt-2">Assinado por {c.assinante_nome} em {dataBR(c.assinado_at)}.</p>}
                {c.status === 'pendente' && c.provedor === 'zapsign' && (
                  <p className="text-xs text-on-surface-variant mt-2">
                    A assinatura é autenticada: o ZapSign envia um código para <b>{c.signatario_email}</b> antes de você assinar.
                  </p>
                )}
              </div>
              <button onClick={() => setVer(c)} className={`px-4 py-2 font-bold text-sm rounded-lg transition flex-none ${c.status === 'pendente' ? 'bg-primary text-on-primary hover:bg-primary-container' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}>
                {c.status === 'pendente' ? 'Ler e assinar' : 'Ver contrato'}
              </button>
            </div>
          </section>
        )
      })}
      {ver && <ContratoModal contrato={ver} podeAssinar onClose={() => setVer(null)} onChange={load} />}
    </div>
  )
}
