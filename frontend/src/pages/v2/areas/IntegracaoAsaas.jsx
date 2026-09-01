import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/adminApi'
import { Field, Input, Select, Button, Badge, useToast } from '../../../components/ui'

// Configurações → Integração → Asaas.
//
// Ligado, o lote de cobrança deixa de ser "marcado pago na mão" e vira um
// recebível de verdade: o gestor gera a cobrança, o parceiro paga por
// PIX/boleto/cartão, e o Asaas avisa por webhook — a baixa e a liberação do
// teto acontecem sozinhas. Desligado, o fechamento de lote continua 100%
// manual, exatamente como hoje.
//
// Como no ZapSign, o token nunca chega ao navegador: a tela só sabe SE existe
// um guardado, e quem lê e grava é o servidor.
export default function IntegracaoAsaas({ empresaId }) {
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
      setEstado(await adminApi.asaasConfig(empresaId))
    } catch (e) {
      toast.error(e.message || 'Não foi possível carregar o Asaas.')
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [empresaId])

  async function salvar() {
    if (!estado) return
    setSalvando(true)
    try {
      const r = await adminApi.asaasSalvarConfig({
        ativo: estado.ativo,
        ambiente: estado.ambiente,
        ...(token.trim() ? { token: token.trim() } : {}),
        ...(empresaId ? { empresaId } : {}),
      })
      setToken('')
      setEstado(s => ({ ...s, ...r }))
      toast.success(r.ativo ? 'Asaas ligado.' : 'Asaas salvo (desligado).')
    } catch (e) {
      toast.error(e.message || 'Falha ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function testar() {
    setTestando(true); setTeste(null)
    try {
      setTeste(await adminApi.asaasTestar({
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
        Carregando Asaas…
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
          <span className="material-symbols-outlined text-primary">payments</span>
          <div className="min-w-0">
            <p className="font-semibold">Cobrança automática (Asaas)</p>
            <p className="text-[11px] text-on-surface-variant">Lote vira PIX/boleto e a baixa acontece sozinha, sem "marcar paga" na mão</p>
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
            Com o Asaas ligado, ao fechar um lote o gestor pode gerar a cobrança: o parceiro recebe o
            link (e o PIX copia-e-cola) e paga direto. Um webhook do Asaas confirma o pagamento e
            baixa o lote sozinho — libera o teto sem ninguém precisar clicar em "Marcar paga".
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ambiente" hint="Comece no sandbox (conta grátis em sandbox.asaas.com). Só passe para produção depois de gerar e pagar uma cobrança de teste ponta a ponta.">
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
                placeholder={estado.tokenConfigurado ? '•••••••• guardado' : 'cole o token do Asaas'}
                autoComplete="off"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Ligar a cobrança automática pelo Asaas</p>
              <p className="text-[11px] text-on-surface-variant">
                Desligado, o fechamento de lote segue 100% manual, como hoje. Lotes já gerados no
                Asaas continuam sendo baixados pelo webhook mesmo se você desligar depois.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-none">
              <input
                type="checkbox"
                checked={estado.ativo}
                onChange={e => setEstado(s => ({ ...s, ativo: e.target.checked }))}
                className="w-5 h-5 accent-primary"
                aria-label="Ligar a cobrança automática pelo Asaas"
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

          {/* Diferente do ZapSign (que manda a URL junto de cada documento), o
              Asaas não registra webhook por chamada — precisa ser cadastrado uma
              vez no painel do Asaas. Sem isso, a cobrança é gerada mas nunca
              baixa sozinha: o gestor teria que ficar clicando "Verificar
              pagamento" manualmente. */}
          {estado.webhookUrl && (
            <div className="space-y-2 rounded-xl bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                URL do webhook
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Cadastre esta URL uma vez em <b>Asaas → Configurações → Integrações → Webhooks</b>,
                marcando pelo menos os eventos <code>PAYMENT_CONFIRMED</code> e{' '}
                <code>PAYMENT_RECEIVED</code>. Sem isso, a baixa não acontece sozinha.
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
                A URL contém um segredo: quem a tiver consegue baixar cobranças como pagas.
                Não compartilhe fora do painel do Asaas.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
