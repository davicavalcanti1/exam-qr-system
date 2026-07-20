import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../../lib/adminApi'
import { Card, Button, Field, Input, Loading } from '../../../components/ui'
import NetrisConsole from './NetrisConsole'
import NetrisMapeamento from './NetrisMapeamento'

export default function DesenvolvedorArea({ empresaId, empresaNome }) {
  const [providers, setProviders] = useState({})
  const [provider, setProvider] = useState('manual')
  const [config, setConfig] = useState({})
  const [ativo, setAtivo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testando, setTestando] = useState(false)
  const [teste, setTeste] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [{ providers }, atual] = await Promise.all([adminApi.listarProviders(), adminApi.getIntegracao(empresaId)])
        setProviders(providers || {})
        setProvider(atual.provider || 'manual')
        setConfig(atual.config || {})
        setAtivo(atual.ativo || false)
      } catch (e) { setMsg(e.message) } finally { setLoading(false) }
    })()
  }, [empresaId])

  function trocarProvider(p) {
    setProvider(p); setTeste(null); setMsg('')
    // reseta os campos para os do novo provedor
    const def = providers[p]
    const novo = {}
    for (const f of def?.fields || []) novo[f.key] = ''
    setConfig(novo)
    if (p === 'manual') setAtivo(false)
  }

  async function salvar() {
    setSaving(true); setMsg(''); setTeste(null)
    try {
      const r = await adminApi.salvarIntegracao({ provider, config, ativo, empresaId })
      setConfig(r.config || {}); setAtivo(r.ativo)
      setMsg('Salvo com sucesso.')
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  async function testar() {
    setTestando(true); setTeste(null)
    try { setTeste(await adminApi.testarIntegracao({ empresaId })) }
    catch (e) { setTeste({ ok: false, mensagem: e.message }) }
    finally { setTestando(false) }
  }

  if (loading) return <Loading />

  const def = providers[provider] || { fields: [] }
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant'

  const ICONE_PROVEDOR = { manual: 'edit_calendar', netris: 'sync_alt' }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Desenvolvedor{empresaNome ? ` · ${empresaNome}` : ''}</h2>
          <p className="text-sm text-on-surface-variant mt-1">Escolha como {empresaNome ? 'esta empresa' : 'a empresa'} marca os exames. As credenciais ficam no servidor — nunca chegam ao navegador.</p>
        </div>
        <Link to="/integracao-netris" className="flex-none flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition whitespace-nowrap">
          <span className="material-symbols-outlined text-base">help</span>Como funciona
        </Link>
      </div>

      {/* Seleção do método */}
      <Card className="p-6">
        <span className={label}>Método de agendamento</span>
        <div className="grid gap-3 mt-3 sm:grid-cols-2">
          {Object.entries(providers).map(([k, v]) => (
            <button key={k} onClick={() => trocarProvider(k)}
              className={`text-left p-4 rounded-xl ring-1 transition ${provider === k ? 'ring-2 ring-primary bg-primary/5' : 'ring-outline-variant/30 hover:ring-primary/40'}`}>
              <div className="flex items-center gap-2">
                {k === 'netris'
                  ? <img src="/netris-logo.png" alt="NetRis" className="h-5 object-contain flex-1" style={{ objectPosition: 'left', filter: 'brightness(0) opacity(0.85)' }} />
                  : <>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${provider === k ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{ICONE_PROVEDOR[k] || 'extension'}</span>
                      </span>
                      <span className="font-bold text-sm flex-1">{v.label}</span>
                    </>}
                {provider === k && <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">{v.descricao}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Config do provedor selecionado */}
      {def.fields.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className={label}>Configuração — {def.label}</span>
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer flex-none">
              <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="w-4 h-4 accent-primary" />
              Integração ativa
            </label>
          </div>
          {def.fields.map(f => (
            <Field key={f.key} label={<>{f.label}{f.secret && <span className="ml-1 text-on-surface-variant/60 normal-case tracking-normal">(secreto)</span>}</>}>
              <Input
                type={f.type === 'password' ? 'password' : 'text'}
                placeholder={f.placeholder}
                value={config[f.key] ?? ''}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                autoComplete="off"
              />
            </Field>
          ))}
          <p className="text-[11px] text-on-surface-variant">Campos secretos aparecem mascarados (••••). Deixe como está para manter o valor salvo; digite por cima para trocar.</p>
        </Card>
      )}

      {msg && <div className="text-sm px-3 py-2 rounded-xl bg-surface-container text-on-surface">{msg}</div>}
      {teste && <div className={`text-sm px-3 py-2 rounded-xl ${teste.ok ? 'bg-primary/10 text-primary' : 'bg-error-container/50 text-on-error-container'}`}>{teste.ok ? '✓ ' : '✕ '}{teste.mensagem}</div>}

      <div className="flex gap-2">
        <Button onClick={salvar} loading={saving} icon="save">Salvar</Button>
        {provider !== 'manual' && <Button variant="secondary" onClick={testar} loading={testando} icon="wifi_tethering">Testar conexão</Button>}
      </div>

      {provider === 'netris' && <NetrisConsole key={`c-${empresaId || 'me'}-${ativo}`} empresaId={empresaId} />}
      {provider === 'netris' && ativo && <NetrisMapeamento key={`m-${empresaId || 'me'}`} empresaId={empresaId} />}
    </div>
  )
}
