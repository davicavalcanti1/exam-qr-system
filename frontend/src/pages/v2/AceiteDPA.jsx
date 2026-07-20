import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button } from '../../components/ui'
import { DPA_TEXTO, DPA_VERSAO, DPA_TITULO } from '../../legal/dpa'

// Aceite obrigatório do DPA pela empresa contratante (Controladora), no 1º acesso.
export default function AceiteDPA({ onDone }) {
  const { user, profile } = useAuth()
  const [nome, setNome] = useState(profile?.nome || '')
  const [aceite, setAceite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function aceitar(e) {
    e.preventDefault(); setErr('')
    if (!aceite) return setErr('Marque que leu e concorda com o Termo.')
    if (!nome.trim()) return setErr('Digite seu nome completo para assinar.')
    setSaving(true)
    const { error } = await supabase.from('dpa_aceites').insert({
      empresa_id: profile?.empresa_id,
      versao: DPA_VERSAO,
      conteudo_snapshot: DPA_TEXTO,
      assinante_nome: nome.trim(),
      aceito_por: user?.id,
    })
    if (error) { setSaving(false); return setErr(error.message) }
    logAudit({ empresaId: profile?.empresa_id, atorId: user?.id, atorNome: nome.trim(), acao: 'dpa.aceito', entidade: 'dpa', detalhe: { versao: DPA_VERSAO } })
    setSaving(false); onDone()
  }

  return (
    <div className="min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h2 className="font-display text-xl font-extrabold tracking-tight">{DPA_TITULO}</h2>
          <p className="text-sm text-on-surface-variant mt-1">Antes de usar a plataforma, é preciso aceitar o Termo de Tratamento de Dados (LGPD). Versão {DPA_VERSAO}.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 text-[13px] leading-relaxed text-on-surface/90 whitespace-pre-wrap bg-surface">{DPA_TEXTO}</div>

        <form onSubmit={aceitar} className="p-6 border-t border-outline-variant/10 space-y-3">
          {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="w-4 h-4 accent-primary mt-0.5" />
            <span className="text-on-surface-variant">Li e concordo com o Termo de Tratamento de Dados, na qualidade de representante da empresa Controladora.</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo (assinatura)" className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" />
            <Button type="submit" loading={saving} icon="draw" className="flex-none">Aceitar e assinar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
