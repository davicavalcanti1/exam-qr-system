import { useEffect, useState } from 'react'
import { Card, Badge, Button, Field, Input, Textarea, useToast, useConfirm } from '../../../components/ui'
import { useAuth } from '../../../auth/AuthContext'
import {
  CONTRATO_MODELO, CONTRATO_TITULO, CONTRATO_VERSAO, PARAMETROS, PARAMETROS_PADRAO,
} from '../../../legal/contratoParceria'
import {
  carregarPadraoVigente, carregarVersoesPadrao, conferirTexto, proximaVersao,
  publicarVersao, tornarVigente,
} from '../../../lib/contratoPadrao'

// O contrato padrão da PLATAFORMA, gerido pelo dono. A empresa que adota gera a
// partir da versão VIGENTE daqui — então este editor é o único lugar do sistema
// onde um texto jurídico em uso por várias clínicas pode mudar.
//
// Duas decisões que a tela materializa:
//
//  * Publicar cria VERSÃO NOVA, nunca reescreve a vigente. Contrato já assinado
//    não muda (é snapshot em `contratos.conteudo`), mas a versão precisa ficar
//    guardada para se saber, depois, qual texto valia quando cada um assinou.
//  * Publicação com problema grave é BLOQUEADA, não avisada. Aqui um erro se
//    multiplica por todas as adotantes; é o oposto do modelo próprio, onde o
//    estrago fica numa clínica.

const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

export default function ContratoPadraoEditor({ adotantes, totalEmpresas, onPublicado }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { profile } = useAuth()
  const [versoes, setVersoes] = useState(null)
  const [vigente, setVigente] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ titulo: CONTRATO_TITULO, conteudo: CONTRATO_MODELO, notas: '', parametros: PARAMETROS_PADRAO })

  async function load() {
    try {
      const [vs, vg] = await Promise.all([carregarVersoesPadrao(), carregarPadraoVigente()])
      setVersoes(vs); setVigente(vg)
      if (vg) setForm({ titulo: vg.titulo, conteudo: vg.conteudo, notas: '', parametros: { ...PARAMETROS_PADRAO, ...(vg.parametros || {}) } })
    } catch (e) { toast.error(e.message); setVersoes([]) }
  }
  useEffect(() => { load() }, [])

  const avisos = conferirTexto(form.conteudo)
  const graves = avisos.filter(a => a.grave)
  const alterado = !vigente || form.conteudo !== vigente.conteudo || form.titulo !== vigente.titulo
    || JSON.stringify(form.parametros) !== JSON.stringify({ ...PARAMETROS_PADRAO, ...(vigente.parametros || {}) })

  function semear() {
    setForm(f => ({ ...f, titulo: CONTRATO_TITULO, conteudo: CONTRATO_MODELO, parametros: { ...PARAMETROS_PADRAO } }))
    setAberto(true)
    toast.success(`Texto do sistema (v${CONTRATO_VERSAO}) carregado no editor. Revise e publique.`)
  }

  async function publicar() {
    if (graves.length) return toast.error('Resolva os problemas graves antes de publicar.')
    const versao = proximaVersao(versoes)
    const ok = await confirm({
      title: `Publicar a versão ${versao}?`,
      message: `Ela passa a ser a vigente para ${adotantes} empresa(s) que usam o contrato do sistema.

Contratos já assinados não mudam; a versão nova vale para os gerados a partir de agora.`,
      confirmLabel: 'Publicar',
    })
    if (!ok) return
    setSalvando(true)
    try {
      await publicarVersao({ ...form, versao, criadoPor: profile?.id })
      toast.success(`Versão ${versao} publicada.`)
      await load(); onPublicado?.()
    } catch (e) { toast.error(e.message) } finally { setSalvando(false) }
  }

  async function reverter(v) {
    const ok = await confirm({
      title: `Voltar para a versão ${v.versao}?`,
      message: 'Ela volta a ser a vigente. Nada é apagado — a versão atual continua guardada.',
      confirmLabel: 'Tornar vigente',
    })
    if (!ok) return
    try { await tornarVigente(v.versao); toast.success(`Versão ${v.versao} é a vigente.`); await load(); onPublicado?.() }
    catch (e) { toast.error(e.message) }
  }

  if (versoes === null) return <Card className="p-5 text-sm text-on-surface-variant">Carregando o contrato padrão…</Card>

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-outline-variant/10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Contrato padrão do sistema
            {vigente
              ? <Badge tone="success" icon="verified">v{vigente.versao}</Badge>
              : <Badge tone="warn" icon="inventory_2">nada publicado</Badge>}
          </h3>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {vigente
              ? <>Publicada em {fmtData(vigente.publicado_em)} · usada por <b>{adotantes}</b> de {totalEmpresas} empresa(s).</>
              : <>Nenhuma versão publicada: quem adota está gerando pelo texto que vem no bundle (v{CONTRATO_VERSAO}). Publique para poder corrigir cláusula sem depender de deploy.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon="download" onClick={semear}>Carregar do bundle</Button>
          <Button size="sm" variant="secondary" icon={aberto ? 'expand_less' : 'edit'} onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : 'Editar'}</Button>
        </div>
      </div>

      {aberto && (
        <div className="p-5 space-y-4">
          <Field label="Título do documento"><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></Field>

          <Field label="Texto do contrato" hint="Sem colchetes: o que varia por clínica é {{placeholder}} e vira campo no painel dela.">
            <Textarea rows={22} className="font-mono text-xs" value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} />
          </Field>

          {avisos.length > 0 && (
            <div className="space-y-2">
              {avisos.map((a, i) => (
                <p key={i} className={`text-sm rounded-lg px-3 py-2 ${a.grave ? 'bg-error-container/40 text-on-error-container' : 'bg-yellow-50 text-yellow-800'}`}>
                  <b>{a.grave ? 'Bloqueia a publicação:' : 'Atenção:'}</b> {a.msg}
                </p>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Valores sugeridos dos parâmetros</p>
            <p className="text-sm text-on-surface-variant mb-3">Cada clínica pode sobrescrever no painel dela. O que ela não definir vem daqui.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PARAMETROS.map(p => (
                <Field key={p.k} label={`${p.label}${p.sufixo ? ` (${p.sufixo})` : ''}`} hint={`cláusula ${p.clausula}`}>
                  <Input
                    value={form.parametros[p.k] ?? ''}
                    placeholder={p.obrigatorio ? 'da clínica' : ''}
                    onChange={e => setForm(f => ({ ...f, parametros: { ...f.parametros, [p.k]: e.target.value } }))}
                  />
                </Field>
              ))}
            </div>
          </div>

          <Field label="O que mudou nesta versão" hint="Fica no histórico. Vale escrever o motivo jurídico, não só 'ajustes'.">
            <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="ex.: cláusula 4.2 revisada pelo advogado — inclui vedação de bonificação indireta" />
          </Field>

          <div className="flex items-center gap-3 flex-wrap">
            <Button icon="publish" loading={salvando} disabled={graves.length > 0 || !alterado} onClick={publicar}>Publicar nova versão</Button>
            {!alterado && <span className="text-sm text-on-surface-variant">Nada mudou em relação à versão vigente.</span>}
            {graves.length > 0 && <span className="text-sm text-on-error-container">{graves.length} problema(s) grave(s) acima.</span>}
          </div>
        </div>
      )}

      {versoes.length > 0 && (
        <div className="border-t border-outline-variant/10">
          <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Histórico</p>
          <div className="divide-y divide-outline-variant/10">
            {versoes.map(v => (
              <div key={v.versao} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-[220px]">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    v{v.versao}
                    {v.vigente && <Badge tone="success">vigente</Badge>}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{v.titulo}</p>
                  {v.notas && <p className="text-xs text-on-surface-variant mt-1 italic">{v.notas}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant tabular-nums">{fmtData(v.publicado_em || v.created_at)}</span>
                  {!v.vigente && <Button size="sm" variant="secondary" icon="history" onClick={() => reverter(v)}>Tornar vigente</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
