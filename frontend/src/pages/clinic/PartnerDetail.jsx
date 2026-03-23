import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function qrStatusLabel(p) {
  const st = p.qr_status
  if (!st) return 'PENDENTE'
  if (st === 'exhausted') return 'VALIDADO'
  if (st === 'revoked') return 'CANCELADO'
  if (st === 'active') return 'ATIVO'
  return 'PENDENTE'
}

function statusBadge(status) {
  if (status === 'VALIDADO' || status === 'ATIVO') return 'px-3 py-1 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed text-[10px] font-bold'
  if (status === 'CANCELADO') return 'px-3 py-1 rounded-full bg-error-container text-on-error-container text-[10px] font-bold'
  return 'px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold'
}

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [partner, setPartner] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    try {
      const data = await api.getPartner(id)
      setPartner(data)
      setPatients(data.patients || [])
    } catch {
      navigate('/clinic')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleToggleBlock() {
    await api.toggleBlockPartner(id)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!partner) return null

  const budget = partner.budget || {}
  const used = budget.committed || 0
  const limit = budget.limit || partner.budget_limit || 1
  const pct = Math.min(Math.round((used / limit) * 100), 100)
  const available = Math.max(limit - used, 0)

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search)
  )

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Top Navigation */}
      <header className="bg-white border-none sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-8 py-4">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-indigo-700">ExameQR</span>
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <span className="text-slate-500 hover:text-indigo-500 cursor-pointer transition-colors">Dashboard</span>
              <span className="text-indigo-700 font-semibold border-b-2 border-indigo-600 pb-1">Parceiros</span>
              <span className="text-slate-500 hover:text-indigo-500 cursor-pointer transition-colors">Pacientes</span>
              <span className="text-slate-500 hover:text-indigo-500 cursor-pointer transition-colors">Relatórios</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-50 transition-colors rounded-full">
                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              </button>
              <button className="p-2 hover:bg-slate-50 transition-colors rounded-full">
                <span className="material-symbols-outlined text-on-surface-variant">settings</span>
              </button>
            </div>
            <div className="h-8 w-8 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center">
              <span className="text-primary font-bold text-sm">A</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-8 py-10">
        {/* Header: Partner Identity */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="tracking-widest uppercase text-on-surface-variant font-semibold text-[10px]">Detalhes do Parceiro</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${partner.status === 'blocked' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed-dim text-on-tertiary-fixed'}`}>
                {partner.status === 'blocked' ? 'BLOQUEADO' : 'ATIVO'}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-1">{partner.name}</h1>
            <p className="text-on-surface-variant font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">mail</span>
              {partner.email}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleToggleBlock}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all active:scale-[0.98] ${
                partner.status === 'blocked'
                  ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              <span className="material-symbols-outlined">{partner.status === 'blocked' ? 'lock_open' : 'block'}</span>
              {partner.status === 'blocked' ? 'Desbloquear' : 'Bloquear Acesso'}
            </button>
            <button className="flex items-center justify-center p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </section>

        {/* Bento Grid: Financial and History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Budget Card */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-bold text-on-surface tracking-tight mb-1">Controle de Verba</h3>
                <p className="text-sm text-on-surface-variant">Gestão de cotas mensais do parceiro</p>
              </div>
              <button className="text-primary font-semibold text-sm hover:underline flex items-center gap-1">
                Editar limite
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-end mb-3">
                <span className="text-3xl font-black text-primary tabular-nums tracking-tighter">
                  {fmt(used)} <span className="text-sm font-medium text-on-surface-variant tracking-normal">utilizados</span>
                </span>
                <span className="text-sm font-semibold text-on-surface-variant tabular-nums">Limite: {fmt(limit)}</span>
              </div>
              <div className="w-full h-4 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full glass-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-surface-container-low">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Limite</p>
                <p className="text-lg font-bold tabular-nums">{fmt(limit)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Utilizado</p>
                <p className="text-lg font-bold tabular-nums text-primary">{fmt(used)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Disponível</p>
                <p className="text-lg font-bold tabular-nums text-tertiary">{fmt(available)}</p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
            <h3 className="text-xl font-bold text-on-surface tracking-tight mb-6">Histórico de Pagamentos</h3>
            <div className="space-y-4">
              {[
                { label: 'Fatura Mensal - Julho', date: '12/07/2023', value: 'R$ 8.940,00' },
                { label: 'Ajuste de Cota', date: '05/07/2023', value: 'R$ 1.500,00' },
                { label: 'Fatura Mensal - Junho', date: '12/06/2023', value: 'R$ 11.200,00' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-surface hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{item.label}</p>
                      <p className="text-xs text-on-surface-variant tabular-nums">{item.date}</p>
                    </div>
                  </div>
                  <p className="font-bold text-on-surface tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
              Ver histórico completo
            </button>
          </div>
        </div>

        {/* Patients Table */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-on-surface tracking-tight">Pacientes Atendidos</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-surface rounded-lg border-none text-sm focus:ring-2 focus:ring-secondary-fixed w-64 outline-none"
                placeholder="Filtrar paciente..."
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Nome do Paciente</th>
                  <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">CPF</th>
                  <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Data Registro</th>
                  <th className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant text-center">Status QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filtered.map((p) => {
                  const st = qrStatusLabel(p)
                  const date = new Date(p.createdAt).toLocaleString('pt-BR')
                  return (
                    <tr key={p.id} className="hover:bg-surface-bright transition-colors cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td className="px-8 py-5 font-semibold text-on-surface">{p.name}</td>
                      <td className="px-8 py-5 tabular-nums font-mono text-sm text-on-surface-variant">{p.cpf}</td>
                      <td className="px-8 py-5 tabular-nums text-sm text-on-surface-variant">{date}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={statusBadge(st)}>{st}</span>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-on-surface-variant text-sm">Nenhum paciente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-4 bg-surface-container-low flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span>Mostrando {filtered.length} de {patients.length} registros</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-white border border-outline-variant hover:bg-surface-container-high">Anterior</button>
              <button className="px-3 py-1 rounded bg-white border border-outline-variant hover:bg-surface-container-high">Próxima</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
