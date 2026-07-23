import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { logAudit } from '../../lib/audit'

const dataBR = (s) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const ST = {
  pendente: { label: 'Aguardando assinatura', cls: 'bg-yellow-50 text-yellow-700' },
  assinado: { label: 'Assinado', cls: 'bg-primary/10 text-primary' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-container/40 text-on-error-container' },
}

export default function ContratoModal({ contrato, podeAssinar = false, onClose, onChange }) {
  const { user, profile, branding } = useAuth()
  const [nome, setNome] = useState(profile?.nome || '')
  const [aceite, setAceite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const st = ST[contrato.status] || ST.pendente

  async function assinar() {
    if (!aceite) return setErr('Marque que leu e concorda com os termos.')
    if (!nome.trim()) return setErr('Digite seu nome completo para assinar.')
    setSaving(true); setErr('')
    const { error } = await supabase.from('contratos').update({
      status: 'assinado', assinante_nome: nome.trim(), assinado_por: user?.id, assinado_at: new Date().toISOString(),
    }).eq('id', contrato.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    logAudit({ empresaId: profile?.empresa_id, atorId: user?.id, atorNome: nome.trim(), acao: 'contrato.assinado', entidade: 'contrato', entidadeId: contrato.id, detalhe: { titulo: contrato.titulo } })
    onChange?.(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein" onClick={onClose}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #contrato-print, #contrato-print * { visibility: visible !important; }
        #contrato-print { position: absolute; inset: 0; margin: 0; max-height: none; }
        .no-print { display: none !important; }
      }`}</style>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-card w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-popin" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{contrato.titulo}</h3>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div id="contrato-print" className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center gap-2 mb-5">
            {branding.logo && <img src={branding.logo} alt="" className="h-8 max-w-[150px] object-contain" />}
            <span className="font-display text-xl font-extrabold tracking-tight text-primary">{branding.nome}</span>
          </div>
          <h1 className="text-xl font-bold mb-4">{contrato.titulo}</h1>
          <div className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{contrato.conteudo}</div>
          {contrato.status === 'assinado' && (
            <div className="mt-8 pt-4 border-t border-outline-variant/20 text-sm">
              <p className="font-bold">Assinado eletronicamente</p>
              <p className="text-on-surface-variant">{contrato.assinante_nome} · {dataBR(contrato.assinado_at)}</p>
              <p className="text-[10px] text-on-surface-variant mt-1">Aceite eletrônico registrado por {branding.nome} (ID {contrato.id.slice(0, 8).toUpperCase()}).</p>
            </div>
          )}
        </div>

        <div className="no-print border-t border-outline-variant/10 p-5 space-y-3">
          {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
          {podeAssinar && contrato.status === 'pendente' ? (
            <>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="w-4 h-4 accent-primary mt-0.5" />
                <span>Li e concordo com os termos deste contrato de parceria.</span>
              </label>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} />
                <button disabled={saving} onClick={assinar} className="px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50 flex items-center gap-1.5"><span className="material-symbols-outlined text-base">draw</span>{saving ? 'Assinando…' : 'Assinar'}</button>
              </div>
            </>
          ) : (
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface rounded-lg">Fechar</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-primary-container transition flex items-center gap-1.5"><span className="material-symbols-outlined text-base">print</span>Imprimir / PDF</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
