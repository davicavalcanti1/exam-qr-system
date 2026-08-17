import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { logAudit } from '../../lib/audit'
import { adminApi } from '../../lib/adminApi'
import { Button } from '../../components/ui'
import { DPA_TEXTO, DPA_VERSAO, DPA_TITULO } from '../../legal/dpa'

// Aceite obrigatório do DPA pela empresa contratante (Controladora), no 1º acesso.
//
// Dois caminhos, decididos pela integração da empresa:
//  · ZapSign ligado — o termo vira PDF, vai por e-mail e é assinado com código de
//    autenticação. A tela fica esperando o retorno.
//  · ZapSign desligado — aceite interno: nome digitado + data, como sempre foi.
export default function AceiteDPA({ onDone }) {
  const { user, profile } = useAuth()
  const [nome, setNome] = useState(profile?.nome || '')
  const [aceite, setAceite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const [zapsign, setZapsign] = useState(null)   // null = ainda carregando
  const [envio, setEnvio] = useState(null)       // { id, signUrl }
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    adminApi.zapsignConfig()
      .then(c => setZapsign(c))
      .catch(() => setZapsign({ ativo: false }))
  }, [])

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
      status: 'assinado',
      provedor: 'interno',
    })
    if (error) { setSaving(false); return setErr(error.message) }
    logAudit({ empresaId: profile?.empresa_id, atorId: user?.id, atorNome: nome.trim(), acao: 'dpa.aceito', entidade: 'dpa', detalhe: { versao: DPA_VERSAO } })
    setSaving(false); onDone()
  }

  async function enviarZapsign() {
    setSaving(true); setErr('')
    try {
      const r = await adminApi.zapsignEnviarDpa({
        versao: DPA_VERSAO, titulo: DPA_TITULO, conteudo: DPA_TEXTO,
      })
      setEnvio({ id: r.id, signUrl: r.signUrl })
      if (r.signUrl) window.open(r.signUrl, '_blank', 'noopener')
    } catch (e) {
      setErr(e.message || 'Não foi possível enviar para assinatura.')
    } finally { setSaving(false) }
  }

  // O webhook fecha o aceite sozinho, mas quem está preso nesta tela precisa de
  // uma forma de dizer "já assinei" sem esperar o próximo login.
  async function verificar() {
    if (!envio?.id) return
    setVerificando(true); setErr('')
    try {
      const { registro } = await adminApi.zapsignStatus('dpa', envio.id)
      if (registro?.status === 'assinado') return onDone()
      if (registro?.status === 'recusado') return setErr('A assinatura foi recusada. Envie novamente para assinar o Termo.')
      setErr('O ZapSign ainda não registrou a assinatura. Conclua no link e tente de novo em alguns instantes.')
    } catch (e) {
      setErr(e.message || 'Não foi possível verificar.')
    } finally { setVerificando(false) }
  }

  const usarZapsign = zapsign?.ativo

  return (
    <div className="min-h-screen soft-bg-gradient flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h2 className="font-display text-xl font-extrabold tracking-tight">{DPA_TITULO}</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Antes de usar a plataforma, é preciso aceitar o Termo de Tratamento de Dados (LGPD). Versão {DPA_VERSAO}.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 text-[13px] leading-relaxed text-on-surface/90 whitespace-pre-wrap bg-surface">{DPA_TEXTO}</div>

        <div className="p-6 border-t border-outline-variant/10 space-y-3">
          {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}

          {zapsign === null ? (
            <p className="text-sm text-on-surface-variant text-center py-2">Carregando…</p>
          ) : usarZapsign ? (
            envio ? (
              <>
                <div className="flex items-start gap-2 text-sm px-3 py-2.5 rounded-lg bg-yellow-50 text-yellow-700">
                  <span className="material-symbols-outlined flex-none" style={{ fontSize: 18 }}>hourglass_top</span>
                  <span>
                    Enviamos o Termo para assinatura. Abra o link, confirme o código que chegou
                    no seu e-mail e assine — depois volte aqui e clique em “Já assinei”.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {envio.signUrl && (
                    <a
                      href={envio.signUrl} target="_blank" rel="noreferrer"
                      className="flex-1 px-5 py-2.5 bg-surface-container text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-high transition flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>Abrir link de assinatura
                    </a>
                  )}
                  <Button onClick={verificar} loading={verificando} icon="refresh" className="flex-none">Já assinei</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  O Termo será assinado com <b>autenticação</b>: você recebe um link por e-mail,
                  confirma um código e assina. O documento assinado fica guardado no sistema.
                </p>
                <Button onClick={enviarZapsign} loading={saving} icon="draw" className="w-full justify-center">
                  Assinar pelo ZapSign
                </Button>
              </>
            )
          ) : (
            <form onSubmit={aceitar} className="space-y-3">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="w-4 h-4 accent-primary mt-0.5" />
                <span className="text-on-surface-variant">Li e concordo com o Termo de Tratamento de Dados, na qualidade de representante da empresa Controladora.</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo (assinatura)" className="flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary" />
                <Button type="submit" loading={saving} icon="draw" className="flex-none">Aceitar e assinar</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
