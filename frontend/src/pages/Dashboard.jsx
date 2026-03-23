import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getUser } from '../auth'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function getInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'
}

const avatarColors = [
  'bg-primary-fixed text-primary',
  'bg-secondary-fixed text-secondary',
  'bg-surface-container-high text-on-surface-variant',
]

function qrStatusLabel(p) {
  const st = p.qr_status
  if (!st || st === 'pending') return { label: 'Pendente', cls: 'bg-surface-variant text-on-surface-variant', dot: 'bg-outline' }
  if (st === 'exhausted') return { label: 'Validado', cls: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant', dot: 'bg-tertiary-container' }
  if (st === 'revoked') return { label: 'Cancelado', cls: 'bg-error-container/20 text-on-error-container', dot: 'bg-error' }
  if (st === 'active') return { label: 'Ativo', cls: 'bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant', dot: 'bg-tertiary-container' }
  return { label: 'Pendente', cls: 'bg-surface-variant text-on-surface-variant', dot: 'bg-outline' }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getUser()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const d = await api.getPartnerDashboard()
      setData(d)
    } catch (err) {
      if (err.message?.includes('autorizado')) { localStorage.removeItem('token'); navigate('/login') }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!data) return null

  const { partner, patients } = data
  const used = partner.committed || 0
  const limit = partner.limit || partner.budgetLimit || 1
  const pct = Math.min(Math.round((used / limit) * 100), 100)
  const isBlocked = partner.blocked || pct >= 100

  let barColor = 'bg-tertiary-fixed-dim'
  if (pct > 95) barColor = 'bg-error'
  else if (pct > 70) barColor = 'bg-yellow-400'

  return (
    <div>
      {/* Critical Alert Banner (blocked state) */}
      {isBlocked && (
        <div className="bg-error-container text-on-error-container px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <span className="font-bold tracking-tight text-sm uppercase">🔒 Emissão Bloqueada</span>
            <p className="text-sm font-medium opacity-90">Sua cota de exames foi atingida ou há uma pendência financeira.</p>
          </div>
          <button
            onClick={() => navigate('/payment')}
            className="bg-error text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm">credit_card</span>
            💳 Fazer Pagamento
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Budget & Quota Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Budget Bar */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border-none shadow-sm space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-bold tracking-widest text-on-surface-variant uppercase">Status da Cota Atual</span>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mt-1">
                  {fmt(used)} <span className="text-sm font-medium text-on-surface-variant tracking-normal">/ {fmt(limit)}</span>
                </h2>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 font-bold text-sm px-3 py-1 rounded-full ${
                  pct >= 95 ? 'text-error bg-error-container/50' :
                  pct >= 70 ? 'text-yellow-700 bg-yellow-50' :
                  'text-tertiary bg-tertiary-fixed/20'
                }`}>
                  <span className="material-symbols-outlined text-sm">{pct >= 95 ? 'warning' : 'check_circle'}</span>
                  {pct}% Utilizado
                </span>
              </div>
            </div>
            {/* Budget Bar */}
            <div className="relative h-4 w-full bg-surface-container rounded-full overflow-hidden">
              <div className={`absolute top-0 left-0 h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim" /> Normal (&lt;70%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400" /> Atenção (&gt;70%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-error" /> Bloqueado
              </span>
            </div>
          </div>

          {/* Quick Stats Bento Card */}
          <div className="bg-indigo-700 text-white p-6 rounded-xl glass-gradient relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <span className="text-xs font-bold tracking-widest text-indigo-200 uppercase">Total de Exames</span>
              <h3 className="text-4xl font-black tracking-tighter mt-2">{patients.length.toLocaleString('pt-BR')}</h3>
            </div>
            <div className="relative z-10 flex justify-between items-center mt-8">
              <span className="text-sm text-indigo-100">Pacientes registrados</span>
              <span className="material-symbols-outlined text-4xl opacity-30">monitoring</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Patients Table */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Gestão de Pacientes</h1>
              <p className="text-on-surface-variant text-sm">Visualize e gerencie as emissões de QR Code para seus pacientes.</p>
            </div>
            <button
              onClick={() => navigate('/patients/new')}
              disabled={isBlocked}
              className="bg-primary text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.98] glass-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">person_add</span>
              + Novo Paciente
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/30">
                  <th className="px-6 py-4 text-xs font-bold tracking-widest text-on-surface-variant uppercase">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-widest text-on-surface-variant uppercase">CPF</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-widest text-on-surface-variant uppercase">Valor Total Exames</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-widest text-on-surface-variant uppercase text-center">Status QR</th>
                  <th className="px-6 py-4 text-xs font-bold tracking-widest text-on-surface-variant uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {patients.map((p, i) => {
                  const initials = getInitials(p.name)
                  const color = avatarColors[i % avatarColors.length]
                  const st = qrStatusLabel(p)
                  const totalValue = p.total_value || 0
                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-bold`}>{initials}</div>
                          <span className="font-semibold text-on-surface">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm tracking-tighter tabular-nums text-on-surface-variant">{p.cpf}</td>
                      <td className="px-6 py-4 font-semibold text-on-surface tabular-nums">{fmt(totalValue)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          onClick={() => navigate(`/patients/${p.id}`)}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button className="p-2 text-on-surface-variant hover:text-secondary transition-colors">
                          <span className="material-symbols-outlined">qr_code_2</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                      Nenhum paciente registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-6 py-4 bg-surface-container/10 border-t border-outline-variant/10 flex justify-between items-center">
              <span className="text-xs text-on-surface-variant font-medium">Mostrando {patients.length} pacientes</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border border-outline-variant text-xs font-bold hover:bg-surface transition-colors">Anterior</button>
                <button className="px-3 py-1 rounded border border-outline-variant text-xs font-bold hover:bg-surface transition-colors">Próximo</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FAB mobile */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 md:hidden">
        <button
          onClick={() => navigate('/patients/new')}
          disabled={isBlocked}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center glass-gradient transition-transform active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  )
}
