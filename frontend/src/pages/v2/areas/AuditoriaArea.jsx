import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const ACOES = {
  'exame.autorizado': { label: 'Exame autorizado', icon: 'verified', cls: 'text-primary' },
  'exame.recusado': { label: 'Exame recusado', icon: 'block', cls: 'text-error' },
  'qr.validado': { label: 'Exame realizado (scan)', icon: 'qr_code_scanner', cls: 'text-on-tertiary-fixed-variant' },
  'netris.agendado': { label: 'Agendado no NetRis', icon: 'event_available', cls: 'text-primary' },
  'netris.cancelado': { label: 'Agendamento cancelado', icon: 'event_busy', cls: 'text-error' },
  'contrato.assinado': { label: 'Contrato assinado', icon: 'draw', cls: 'text-primary' },
  'cobranca.fechada': { label: 'Lote de cobrança fechado', icon: 'receipt_long', cls: 'text-on-surface' },
  'cobranca.paga': { label: 'Cobrança marcada paga', icon: 'paid', cls: 'text-primary' },
  'paciente.exportado': { label: 'Dados do paciente exportados (LGPD)', icon: 'download', cls: 'text-on-surface-variant' },
  'paciente.anonimizado': { label: 'Paciente anonimizado (LGPD)', icon: 'person_off', cls: 'text-error' },
  'autorizacao.lote_gerado': { label: 'Link de confirmação gerado', icon: 'send', cls: 'text-primary' },
  'qr.pdf_gerado': { label: 'Comprovantes (PDF) gerados', icon: 'picture_as_pdf', cls: 'text-on-surface' },
  'qr.whatsapp_enviado': { label: 'Comprovante enviado por WhatsApp', icon: 'send', cls: 'text-primary' },
}
// traduz rows antigas em que o "ator" foi gravado como a role crua (empresa_operador, etc.)
const ROLE_LABEL = { owner: 'Dono', empresa_admin: 'Administrador', empresa_operador: 'Operador', parceiro_coordenador: 'Coordenador', parceiro_funcionario: 'Funcionário' }
const atorLabel = (nome) => ROLE_LABEL[nome] || nome || '—'
const dataBR = (s) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function resumo(d) {
  if (!d) return ''
  const p = []
  if (d.paciente) p.push(d.paciente)
  if (d.exame) p.push(d.exame)
  if (d.titulo) p.push(d.titulo)
  if (d.qtd != null) p.push(`${d.qtd} exame(s)`)
  if (d.whatsapp === true) p.push('WhatsApp enviado')
  if (d.total != null) p.push(Number(d.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
  if (d.protocolo) p.push(`protocolo ${d.protocolo}`)
  return p.join(' · ')
}

export default function AuditoriaArea() {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('audit_log').select('id, ator_nome, acao, entidade, detalhe, created_at')
      .order('created_at', { ascending: false }).limit(150)
      .then(({ data }) => { setItens(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-card overflow-hidden">
      <div className="p-6 border-b border-outline-variant/10">
        <h3 className="text-lg font-semibold">Auditoria</h3>
        <p className="text-sm text-on-surface-variant mt-1">Trilha das ações sensíveis (clínicas e financeiras) da sua empresa.</p>
      </div>
      {itens.length === 0
        ? <p className="text-center py-16 text-on-surface-variant text-sm">Nenhuma ação registrada ainda.</p>
        : <div className="divide-y divide-outline-variant/10">
            {itens.map(a => {
              const ac = ACOES[a.acao] || { label: a.acao, icon: 'history', cls: 'text-on-surface-variant' }
              return (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <span className={`material-symbols-outlined ${ac.cls}`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>{ac.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{ac.label}{resumo(a.detalhe) && <span className="font-normal text-on-surface-variant"> — {resumo(a.detalhe)}</span>}</p>
                    <p className="text-[11px] text-on-surface-variant">{atorLabel(a.ator_nome)}</p>
                  </div>
                  <span className="text-[11px] text-on-surface-variant tabular-nums flex-none">{dataBR(a.created_at)}</span>
                </div>
              )
            })}
          </div>}
    </section>
  )
}
