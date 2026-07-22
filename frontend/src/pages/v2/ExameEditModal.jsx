import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminApi } from '../../lib/adminApi'
import { Modal, Field, Input, Button, useToast, useConfirm } from '../../components/ui'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Editar valor/indicação de um exame e cancelá-lo (libera o agendamento no NetRis).
export default function ExameEditModal({ exame, onClose, onSaved }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [valor, setValor] = useState(exame.valor ?? 0)
  const [indicacao, setIndicacao] = useState(exame.indicacao || '')
  const [saving, setSaving] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  async function salvar() {
    setSaving(true)
    const { error } = await supabase.from('exames').update({ valor: Number(valor) || 0, indicacao: indicacao.trim() || null }).eq('id', exame.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Exame atualizado.'); onSaved?.(); onClose()
  }

  async function cancelarExame() {
    if (!(await confirm({ title: 'Cancelar exame', message: `Cancelar o exame "${exame.nome}"? Se estiver agendado no NetRis, o horário será liberado.`, confirmLabel: 'Cancelar exame', danger: true }))) return
    setCancelando(true)
    try {
      if (exame.netris_atendimento_id) { try { await adminApi.netrisCancelarExame(exame.id) } catch { /* segue */ } }
      const { error } = await supabase.from('exames').update({ status: 'cancelado' }).eq('id', exame.id)
      if (error) throw error
      toast.success('Exame cancelado.'); onSaved?.(); onClose()
    } catch (e) { toast.error(e.message) } finally { setCancelando(false) }
  }

  return (
    <Modal open title="Editar exame" subtitle={exame.nome} icon="edit" onClose={onClose}
      footer={<>
        <Button variant="danger" onClick={cancelarExame} loading={cancelando} icon="cancel">Cancelar exame</Button>
        <Button onClick={salvar} loading={saving}>Salvar</Button>
      </>}>
      <div className="p-6 space-y-4">
        <Field label="Valor (R$)" hint={`Atual: ${fmt(exame.valor)}`}>
          <Input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
        </Field>
        <Field label="Indicação">
          <Input value={indicacao} onChange={e => setIndicacao(e.target.value)} placeholder="opcional" />
        </Field>
        <p className="text-[11px] text-on-surface-variant">Cancelar o exame não pode ser desfeito. Para reagendar, use o botão de agenda no exame.</p>
      </div>
    </Modal>
  )
}
