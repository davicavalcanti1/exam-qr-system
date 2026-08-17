import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../auth/AuthContext'
import { adminApi } from '../../../lib/adminApi'
import { Field, Input, Select, Button, Badge, useToast } from '../../../components/ui'

// Configuração fiscal da NFS-e (prestador) — só empresa-level. Recolhível.
// Campos fiscais vão em empresas (RPC update_empresa_fiscal, sob RLS); o token do
// provedor vai no backend (integracao_configs, service role). Enquanto nfse_ativo
// estiver desligado, a emissão fica invisível no resto do sistema.
export default function NfseConfig({ onChanged }) {
  const { empresa, empresaId, reloadProfile } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tokenConfigurado, setTokenConfigurado] = useState(false)

  const [f, setF] = useState({
    nfse_ativo: false, nfse_ambiente: 'homologacao',
    nfse_inscricao_municipal: '', nfse_codigo_municipio: '',
    nfse_item_lista_servico: '', nfse_codigo_tributario: '', nfse_cnae: '',
    nfse_aliquota_iss: '', nfse_iss_retido: false,
  })
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!empresa) return
    setF({
      nfse_ativo: !!empresa.nfse_ativo,
      nfse_ambiente: empresa.nfse_ambiente || 'homologacao',
      nfse_inscricao_municipal: empresa.nfse_inscricao_municipal || '',
      nfse_codigo_municipio: empresa.nfse_codigo_municipio || '',
      nfse_item_lista_servico: empresa.nfse_item_lista_servico || '',
      nfse_codigo_tributario: empresa.nfse_codigo_tributario || '',
      nfse_cnae: empresa.nfse_cnae || '',
      nfse_aliquota_iss: empresa.nfse_aliquota_iss ?? '',
      nfse_iss_retido: !!empresa.nfse_iss_retido,
    })
  }, [empresa])

  useEffect(() => {
    adminApi.nfseConfig().then(r => setTokenConfigurado(!!r.tokenConfigurado)).catch(() => {})
  }, [empresaId])

  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (token.trim()) {
        await adminApi.nfseSalvarToken(token.trim())
        setToken(''); setTokenConfigurado(true)
      }
      const { error } = await supabase.rpc('update_empresa_fiscal', {
        p_ativo: f.nfse_ativo,
        p_ambiente: f.nfse_ambiente,
        p_inscricao_municipal: f.nfse_inscricao_municipal,
        p_codigo_municipio: f.nfse_codigo_municipio,
        p_item_lista_servico: f.nfse_item_lista_servico,
        p_codigo_tributario: f.nfse_codigo_tributario,
        p_cnae: f.nfse_cnae,
        p_aliquota_iss: f.nfse_aliquota_iss === '' ? null : Number(f.nfse_aliquota_iss),
        p_iss_retido: f.nfse_iss_retido,
      })
      if (error) throw error
      await reloadProfile()
      onChanged?.()
      toast.success('Configuração fiscal salva.')
    } catch (err) {
      toast.error(err.message || 'Falha ao salvar.')
    } finally { setSaving(false) }
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-primary">receipt</span>
          <div className="min-w-0">
            <p className="font-semibold">Nota fiscal (NFS-e)</p>
            <p className="text-[11px] text-on-surface-variant">Emissão de nota de serviço no fechamento do lote</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {f.nfse_ativo
            ? <Badge tone="success" icon="check">{f.nfse_ambiente === 'producao' ? 'Ativa · produção' : 'Ativa · homologação'}</Badge>
            : <Badge tone="neutral">Desligada</Badge>}
          <span className="material-symbols-outlined text-on-surface-variant">{open ? 'expand_less' : 'expand_more'}</span>
        </div>
      </button>

      {open && (
        <form onSubmit={salvar} className="px-5 sm:px-6 pb-6 border-t border-outline-variant/10 pt-5 space-y-5">
          <p className="text-sm text-on-surface-variant">
            Provedor <b>Focus NFe</b> (Campina Grande/PB homologada · WebISS). Preencha com os dados
            do <b>contador da clínica</b>. Nada é emitido enquanto a emissão estiver desligada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ambiente" hint="Comece em homologação (teste). Só mude para produção com tudo validado.">
              <Select value={f.nfse_ambiente} onChange={set('nfse_ambiente')}>
                <option value="homologacao">Homologação (teste)</option>
                <option value="producao">Produção</option>
              </Select>
            </Field>
            <Field label="Token do provedor (Focus NFe)" hint={tokenConfigurado ? 'Já configurado — preencha só para trocar.' : 'Obrigatório para emitir.'}>
              <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={tokenConfigurado ? '••••••••' : 'cole o token da Focus'} autoComplete="off" />
            </Field>
            <Field label="Inscrição municipal" required>
              <Input value={f.nfse_inscricao_municipal} onChange={set('nfse_inscricao_municipal')} />
            </Field>
            <Field label="Código do município (IBGE)" required hint="Campina Grande/PB = 2504009.">
              <Input value={f.nfse_codigo_municipio} onChange={set('nfse_codigo_municipio')} placeholder="2504009" />
            </Field>
            <Field label="Código de serviço (LC 116/2003)" required hint="Ex.: 4.03 — hospitais, clínicas, laboratórios.">
              <Input value={f.nfse_item_lista_servico} onChange={set('nfse_item_lista_servico')} />
            </Field>
            <Field label="Código tributário do município" hint="Se a prefeitura exigir (CNAE/serviço municipal).">
              <Input value={f.nfse_codigo_tributario} onChange={set('nfse_codigo_tributario')} />
            </Field>
            <Field label="CNAE">
              <Input value={f.nfse_cnae} onChange={set('nfse_cnae')} />
            </Field>
            <Field label="Alíquota ISS (%)" required>
              <Input type="number" step="0.01" min="0" value={f.nfse_aliquota_iss} onChange={set('nfse_aliquota_iss')} placeholder="ex.: 2.00" />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={f.nfse_iss_retido} onChange={set('nfse_iss_retido')} className="w-4 h-4 accent-primary" />
            ISS retido pelo tomador
          </label>

          <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Ligar emissão de NFS-e</p>
              <p className="text-[11px] text-on-surface-variant">Enquanto desligado, o botão de emitir não aparece em Cobranças.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={f.nfse_ativo} onChange={set('nfse_ativo')} className="w-5 h-5 accent-primary" />
            </label>
          </div>

          {f.nfse_ambiente === 'producao' && (
            <p className="text-[11px] text-on-surface-variant">⚠️ Em Campina Grande/PB o <b>cancelamento</b> da NFS-e não é feito por aqui — só pelo portal do WebISS.</p>
          )}

          <div className="flex justify-end"><Button type="submit" loading={saving} icon="save">Salvar configuração</Button></div>
        </form>
      )}
    </section>
  )
}
