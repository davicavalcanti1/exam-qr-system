import { useEffect, useState } from 'react'
import { Loading, EmptyState } from '../../../components/ui'
import { carregarUso, fmtBytes, fmtMoeda, fmtData } from '../../../lib/uso'

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
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <Metrica icon="handshake" label="Parceiros" valor={u.parceiros} sub={`${u.parceiros_ativos} ativos`} />
      <Metrica icon="group" label="Usuários" valor={u.usuarios} sub={`${u.usuarios_ativos} ativos`} />
      <Metrica icon="groups" label="Pacientes" valor={u.pacientes} />
      <Metrica icon="medical_services" label="Exames (30d)" valor={u.exames_30d} sub={`${u.exames} no total · ${u.exames_realizados} realizados`} />
      <Metrica icon="receipt_long" label="Faturado" valor={fmtMoeda(u.faturado)} sub={`${u.cobrancas} lotes`} />
      <Metrica icon="database" label="Storage" valor={fmtBytes(u.storage_bytes)} sub={`${u.qr_codes} QRs · ${u.contratos} contratos`} />
      <Metrica icon="schedule" label="Último exame" valor={fmtData(u.ultimo_exame_at)} />
    </div>
  )
}
