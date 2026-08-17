import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/adminApi'
import { Field, Input, Select, Button, Badge, useToast } from '../../../components/ui'

// Configurações → Integração → ZapSign.
//
// Ligada, o contrato de parceria e o DPA passam a ser assinados por link
// autenticado: o signatário recebe um e-mail, confirma um código e assina, e o
// PDF que volta é o assinado. Desligada, vale o aceite interno (nome digitado +
// data) — a clínica não deixa de fechar parceria porque uma integração caiu.
//
// Como no NetRis, o token nunca chega ao navegador: a tela só sabe SE existe um
// guardado, e quem lê e grava é o servidor.
export default function IntegracaoZapsign({ empresaId }) {
  const toast = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [estado, setEstado] = useState(null)
  const [token, setToken] = useState('')
  const [teste, setTeste] = useState(null)

  async function carregar() {
    setCarregando(true)
    try {
      setEstado(await adminApi.zapsignConfig(empresaId))
    } catch (e) {
      toast.error(e.message || 'Não foi possível carregar o ZapSign.')
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [empresaId])

  async function salvar() {
    if (!estado) return
    setSalvando(true)
    try {
      const r = await adminApi.zapsignSalvarConfig({
        ativo: estado.ativo,
        ambiente: estado.ambiente,
        ...(token.trim() ? { token: token.trim() } : {}),
        ...(empresaId ? { empresaId } : {}),
      })
      setToken('')
      setEstado(s => ({ ...s, ...r }))
      toast.success(r.ativo ? 'ZapSign ligado.' : 'ZapSign salvo (desligado).')
    } catch (e) {
      toast.error(e.message || 'Falha ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function testar() {
    setTestando(true); setTeste(null)
    try {
      setTeste(await adminApi.zapsignTestar({
        ...(token.trim() ? { token: token.trim() } : {}),
        ambiente: estado?.ambiente,
        ...(empresaId ? { empresaId } : {}),
      }))
    } catch (e) {
      toast.error(e.message || 'Falha ao testar.')
    } finally {
      setTestando(false)
    }
  }

  if (carregando) {
    return (
      <section className="bg-surface-container-lowest rounded-2xl shadow-card p-6 text-center text-sm text-on-surface-variant">
        Carregando ZapSign…
      </section>
    )
  }
  if (!estado) return null

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary">draw</span>
          <div className="min-w-0">
            <p className="font-semibold">Assinatura eletrônica (ZapSign)</p>
            <p className="text-[11px] text-on-surface-variant">Contrato de parceria e DPA assinados com autenticação do signatário</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {estado.ativo
            ? <Badge tone="success" icon="verified">{estado.ambiente === 'sandbox' ? 'Ligado · sandbox' : 'Ligado'}</Badge>
            : <Badge tone="neutral">Desligado</Badge>}
          <span className="material-symbols-outlined text-on-surface-variant">{aberto ? 'expand_less' : 'expand_more'}</span>
        </div>
      </button>

      {aberto && (
        <div className="px-5 sm:px-6 pb-6 border-t border-outline-variant/10 pt-5 space-y-5">
          <p className="text-sm text-on-surface-variant">
            Com o ZapSign ligado, o contrato deixa de ser aceito por <b>nome digitado</b> e passa a
            ser assinado por link: o signatário recebe um e-mail, confirma um código e assina. O
            arquivo assinado volta para o sistema e fica guardado com o hash do conteúdo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ambiente" hint="Comece no sandbox. Só passe para produção com um documento de teste assinado ponta a ponta.">
              <Select value={estado.ambiente} onChange={e => setEstado(s => ({ ...s, ambiente: e.target.value }))}>
                <option value="producao">Produção</option>
                <option value="sandbox">Sandbox (teste)</option>
              </Select>
            </Field>

            <Field
              label="Token da API"
              hint={estado.tokenConfigurado
                ? 'Já guardado no servidor. Deixe em branco para manter.'
                : 'Fica só no servidor — nunca chega ao navegador.'}
            >
              <Input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={estado.tokenConfigurado ? '•••••••• guardado' : 'cole o token do ZapSign'}
                autoComplete="off"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Ligar a assinatura pelo ZapSign</p>
              <p className="text-[11px] text-on-surface-variant">
                Desligado, contrato e DPA seguem no aceite interno. Contratos já enviados continuam
                valendo e não voltam para o aceite antigo.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-none">
              <input
                type="checkbox"
                checked={estado.ativo}
                onChange={e => setEstado(s => ({ ...s, ativo: e.target.checked }))}
                className="w-5 h-5 accent-primary"
                aria-label="Ligar a assinatura pelo ZapSign"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={salvar} loading={salvando} icon="save">Salvar</Button>
            <Button variant="outline" onClick={testar} loading={testando} icon="wifi_tethering">Testar token</Button>
            {estado.atualizadoEm && (
              <span className="text-[11px] text-on-surface-variant sm:ml-auto">
                Atualizado em {new Date(estado.atualizadoEm).toLocaleString('pt-BR')}
              </span>
            )}
          </div>

          {teste && (
            <div className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm ${
              teste.ok ? 'bg-primary/10 text-primary' : 'bg-error-container/50 text-on-error-container'
            }`}>
              <span className="material-symbols-outlined flex-none" style={{ fontSize: 18 }}>
                {teste.ok ? 'check_circle' : 'error'}
              </span>
              <span className="min-w-0 break-words">{teste.mensagem}</span>
            </div>
          )}

          {/* O sistema manda esta URL junto de cada documento, então normalmente
              não há nada a fazer no painel do ZapSign. Fica visível porque contas
              configuradas com webhook fixo precisam dela — e porque sem webhook
              nenhum o documento é assinado e o sistema nunca fica sabendo. */}
          {estado.webhookUrl && (
            <div className="space-y-2 rounded-xl bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                URL de retorno (webhook)
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Enviada automaticamente em cada documento. Cadastre no painel do ZapSign só se a sua
                conta exigir webhook fixo — é por ela que o sistema sabe que o documento foi assinado.
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-container px-2.5 py-2 text-[11px] font-mono">
                  {estado.webhookUrl}
                </code>
                <Button
                  variant="outline" size="sm" icon="content_copy"
                  className="flex-none"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(estado.webhookUrl)
                      toast.success('URL copiada.')
                    } catch { toast.error('Não foi possível copiar.') }
                  }}
                >Copiar</Button>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                A URL contém um segredo: quem a tiver consegue marcar documentos como assinados.
                Não compartilhe fora do painel do ZapSign.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
