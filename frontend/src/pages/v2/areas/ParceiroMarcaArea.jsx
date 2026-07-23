import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { Card, Field, Input, Button, Loading, useToast } from '../../../components/ui'

// Auto-serviço do coordenador: define a marca (logo + nome) do próprio parceiro.
export default function ParceiroMarcaArea() {
  const { parceiro, reloadProfile } = useAuth()
  const toast = useToast()
  const [nome, setNome] = useState(parceiro?.nome_exibicao || '')
  const [logo, setLogo] = useState(parceiro?.logo_url || null)
  const [subindo, setSubindo] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!parceiro) return <Loading />

  async function gravar(logoUrl, nomeVal) {
    const { error } = await supabase.rpc('update_parceiro_branding', { p_logo: logoUrl || '', p_nome: (nomeVal ?? '').trim() })
    if (error) { toast.error(error.message); return false }
    setLogo(logoUrl || null); reloadProfile?.(); return true
  }

  async function enviarLogo(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('Imagem muito grande (máx. 2 MB).')
    setSubindo(true)
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `parceiro/${parceiro.id}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setSubindo(false); return toast.error(error.message) }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const ok = await gravar(data.publicUrl, nome)
    setSubindo(false)
    if (ok) toast.success('Logo atualizada.')
  }

  async function salvarNome() {
    setSaving(true)
    const ok = await gravar(logo, nome)
    setSaving(false)
    if (ok) toast.success('Nome atualizado.')
  }

  return (
    <Card className="p-5 sm:p-6 max-w-xl mx-auto">
      <h3 className="text-lg font-semibold">Minha marca</h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-5">Personalize como o seu parceiro aparece no sistema.</p>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-on-surface-variant">Nome de exibição <span className="font-normal">(vazio = {parceiro.nome})</span></label>
          <div className="flex gap-2 mt-1">
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder={parceiro.nome} />
            <Button variant="secondary" onClick={salvarNome} loading={saving} className="flex-none">Salvar</Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-on-surface-variant">Logomarca</label>
          <div className="flex items-center gap-3 mt-1">
            <span className="w-24 h-14 rounded-xl bg-surface ring-1 ring-outline-variant/20 flex items-center justify-center flex-none overflow-hidden">
              {logo ? <img src={logo} alt="" className="max-h-10 max-w-[84px] object-contain" /> : <span className="material-symbols-outlined text-on-surface-variant/50">image</span>}
            </span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <label className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold rounded-xl bg-surface-container hover:bg-surface-container-high transition cursor-pointer ${subindo ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="material-symbols-outlined text-base">upload</span>{subindo ? 'Enviando…' : 'Enviar imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={e => enviarLogo(e.target.files?.[0])} />
              </label>
              {logo && <Button variant="ghost" size="sm" onClick={async () => { const ok = await gravar('', nome); if (ok) toast.success('Logo removida.') }} className="flex-none text-error">Remover</Button>}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
