import { useEffect, useState } from 'react'
import { Card, Loading, EmptyState, Button, useToast } from '../../../components/ui'
import { carregarUso, fmtBytes, fmtMoeda, fmtData } from '../../../lib/uso'

function Resumo({ icon, label, valor }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight mt-2 tabular-nums">{valor}</p>
    </Card>
  )
}

// Visão geral de consumo de TODAS as empresas (owner).
export default function UsoArea() {
  const toast = useToast()
  const [uso, setUso] = useState(null)

  useEffect(() => { carregarUso().then(setUso).catch(e => { toast.error(e.message); setUso([]) }) }, [])

  if (uso === null) return <Loading />

  const totExames30 = uso.reduce((s, u) => s + Number(u.exames_30d || 0), 0)
  const totFaturado = uso.reduce((s, u) => s + Number(u.faturado || 0), 0)
  const totStorage = uso.reduce((s, u) => s + Number(u.storage_bytes || 0), 0)

  function exportarCsv() {
    const cols = ['nome', 'parceiros', 'parceiros_ativos', 'usuarios', 'usuarios_ativos', 'pacientes', 'exames', 'exames_30d', 'exames_realizados', 'cobrancas', 'faturado', 'qr_codes', 'contratos', 'storage_bytes', 'ultimo_exame_at']
    const linhas = uso.map(u => cols.map(c => `"${(u[c] ?? '')}"`).join(','))
    const csv = [cols.join(','), ...linhas].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'consumo-empresas.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Resumo icon="business" label="Empresas" valor={uso.length} />
        <Resumo icon="medical_services" label="Exames (30d)" valor={totExames30} />
        <Resumo icon="receipt_long" label="Faturado" valor={fmtMoeda(totFaturado)} />
        <Resumo icon="database" label="Storage" valor={fmtBytes(totStorage)} />
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Consumo por empresa</h3>
          <Button size="sm" variant="secondary" icon="download" onClick={exportarCsv} disabled={!uso.length}>Exportar CSV</Button>
        </div>
        {uso.length === 0 ? <EmptyState icon="monitoring" title="Nenhuma empresa" hint="Cadastre uma empresa para ver o consumo." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/15">
                    <th className="text-left py-3 px-5">Empresa</th>
                    <th className="text-left py-3 px-3">Plano</th>
                    <th className="text-right py-3 px-3">Parceiros</th>
                    <th className="text-right py-3 px-3">Usuários</th>
                    <th className="text-right py-3 px-3">Pacientes</th>
                    <th className="text-right py-3 px-3">Exames (30d)</th>
                    <th className="text-right py-3 px-3">Faturado</th>
                    <th className="text-right py-3 px-3">Storage</th>
                    <th className="text-right py-3 px-5">Últ. exame</th>
                  </tr>
                </thead>
                <tbody>
                  {uso.map(u => (
                    <tr key={u.empresa_id} className="border-b border-outline-variant/10 hover:bg-black/[.02]">
                      <td className="py-3 px-5 font-semibold">{u.nome}</td>
                      <td className="py-3 px-3"><span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{u.plano || '—'}</span></td>
                      <td className="py-3 px-3 text-right tabular-nums">{u.parceiros_ativos}/{u.parceiros}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{u.usuarios_ativos}/{u.usuarios}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{u.pacientes}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{u.exames_30d}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{fmtMoeda(u.faturado)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{fmtBytes(u.storage_bytes)}</td>
                      <td className="py-3 px-5 text-right tabular-nums text-on-surface-variant">{fmtData(u.ultimo_exame_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Card>
    </div>
  )
}
