import { useEffect, useState } from 'react'
import { Loading, EmptyState } from '../../../components/ui'
import { carregarUso, carregarMensal, fmtBytes, fmtMoeda, fmtData, rotuloMes } from '../../../lib/uso'

function VolumeMensal({ empresaId }) {
  const [dados, setDados] = useState(undefined)
  useEffect(() => { carregarMensal(empresaId).then(setDados).catch(() => setDados([])) }, [empresaId])
  if (dados === undefined || dados.length === 0) return null
  const max = Math.max(...dados.map(d => Number(d.qtd)), 1)
  return (
    <div className="bg-surface rounded-2xl p-4 ring-1 ring-outline-variant/10 mt-3">
      <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Exames por mês (12 meses)</span>
      <div className="flex items-end gap-1.5 h-28 mt-3">
        {dados.map(d => (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.qtd} exames · ${fmtMoeda(d.faturado)}`}>
            <span className="text-[10px] font-bold tabular-nums text-on-surface-variant">{d.qtd}</span>
            <div className="w-full rounded-t-md bg-primary/70" style={{ height: `${Math.max(4, (Number(d.qtd) / max) * 84)}px` }} />
            <span className="text-[9px] text-on-surface-variant truncate w-full text-center">{rotuloMes(d.mes)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metrica({ icon, label, valor, sub }) {
  return (
    <div className="bg-surface rounded-2xl p-4 ring-1 ring-outline-variant/10">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tracking-tight mt-1.5 tabular-nums">{valor}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-0.5">{sub}</p>}
    </div>
  )
}

// Consumo de UMA empresa (usado na aba Consumo do EmpresaDetalhe).
export default function ConsumoEmpresa({ empresaId }) {
  const [u, setU] = useState(undefined)
  useEffect(() => {
    carregarUso().then(rows => setU(rows.find(r => r.empresa_id === empresaId) || null)).catch(() => setU(null))
  }, [empresaId])

  if (u === undefined) return <Loading />
  if (!u) return <EmptyState icon="monitoring" title="Sem dados de consumo" hint="A empresa ainda não registrou uso." />

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Metrica icon="handshake" label="Parceiros" valor={u.parceiros} sub={`${u.parceiros_ativos} ativos`} />
        <Metrica icon="group" label="Usuários" valor={u.usuarios} sub={`${u.usuarios_ativos} ativos`} />
        <Metrica icon="groups" label="Pacientes" valor={u.pacientes} />
        <Metrica icon="medical_services" label="Exames (30d)" valor={u.exames_30d} sub={`${u.exames} no total · ${u.exames_realizados} realizados`} />
        <Metrica icon="receipt_long" label="Faturado" valor={fmtMoeda(u.faturado)} sub={`${u.cobrancas} lotes`} />
        <Metrica icon="database" label="Storage" valor={fmtBytes(u.storage_bytes)} sub={`${u.qr_codes} QRs · ${u.contratos} contratos`} />
        <Metrica icon="schedule" label="Último exame" valor={fmtData(u.ultimo_exame_at)} />
      </div>
      <VolumeMensal empresaId={empresaId} />
    </div>
  )
}
