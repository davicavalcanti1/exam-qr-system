import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Card, Field, Input, Button, useToast } from '../../../components/ui'

// Configurações operacionais de uma empresa. Reutilizável:
//  - dono (viaRpc=false): grava direto em empresas (já tem update).
//  - admin da empresa (viaRpc=true): grava a própria via RPC update_empresa_config.
export default function ConfiguracoesEmpresa({ empresa, onSaved, viaRpc = false }) {
  const toast = useToast()
  const [teto, setTeto] = useState(empresa?.teto_padrao ?? 2000)
  const [periodo, setPeriodo] = useState(empresa?.periodo_cobranca_dias ?? 30)
  const [saving, setSaving] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const t = Number(teto), p = parseInt(periodo, 10)
    if (!(t >= 0)) return toast.error('Teto inválido.')
    if (!(p >= 1)) return toast.error('Período deve ter ao menos 1 dia.')
    setSaving(true)
    const { error } = viaRpc
      ? await supabase.rpc('update_empresa_config', { p_teto: t, p_periodo: p, p_moeda: empresa?.moeda || 'BRL' })
      : await supabase.from('empresas').update({ teto_padrao: t, periodo_cobranca_dias: p }).eq('id', empresa.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Configurações salvas.'); onSaved?.()
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-lg font-semibold">Operação</h3>
      <p className="text-sm text-on-surface-variant mt-1 mb-5">Parâmetros operacionais desta empresa.</p>
      <form onSubmit={salvar} className="space-y-5">
        <Field label="Teto padrão de novos parceiros (R$)" hint="Valor pré-preenchido ao cadastrar um parceiro.">
          <Input type="number" min="0" step="100" value={teto} onChange={e => setTeto(e.target.value)} />
        </Field>
        <Field label="Período padrão de cobrança (dias)" hint="Pré-seleciona o intervalo ao fechar um lote (ex.: 30 = último mês).">
          <Input type="number" min="1" step="1" value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Moeda</p>
            <p className="text-[11px] text-on-surface-variant">Real brasileiro (BRL) · padrão no piloto</p>
          </div>
          <span className="text-sm font-bold tabular-nums">R$</span>
        </div>
        <div className="flex justify-end"><Button type="submit" loading={saving} icon="save">Salvar</Button></div>
      </form>
    </Card>
  )
}
