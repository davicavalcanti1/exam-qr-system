import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

export default function ClinicAutorizacoes() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const navigate = useNavigate()

  async function load() {
    try {
      setStats(await api.getClinicStats())
    } catch (err) {
      if (err.message?.includes('autorizado')) { localStorage.removeItem('token'); navigate('/login') }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function toggle(p) {
    setBusyId(p.id)
    try { await api.toggleBlockPartner(p.id); await load() }
    catch (e) { alert(e.message) } finally { setBusyId(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!stats) return null

  const { partners } = stats
  const autorizados = partners.filter(p => !p.budget.blockedByClinic).length

  return (
    <>
      <header className="flex justify-between items-center w-full px-8 py-4 bg-white sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold tracking-tighter text-indigo-700">Autorizações</h2>
          <div className="bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter">CLÍNICA</div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card">
            <span className="text-[11px] font-bold text-on-surface-variant tracking-widest uppercase">Parceiros autorizados</span>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums mt-3 text-primary">{autorizados} <span className="text-lg text-on-surface-variant font-medium">/ {partners.length}</span></div>
            <p className="text-xs text-on-surface-variant mt-2">Podem enviar pacientes e emitir QR</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card flex flex-col justify-center">
            <p className="text-sm text-on-surface-variant">
              A autorização define <b className="text-on-surface">quem pode enviar pacientes</b> para a clínica. Suspenda um parceiro para
              interromper novas emissões de QR sem apagar o histórico.
            </p>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-lg font-semibold tracking-tight">Controle de acesso dos parceiros</h3>
          </div>
          {partners.length === 0 ? (
            <p className="text-center py-16 text-on-surface-variant text-sm">Nenhum parceiro cadastrado.</p>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {partners.map(p => {
                const suspenso = p.budget.blockedByClinic
                return (
                  <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${suspenso ? 'bg-slate-400' : 'bg-tertiary-fixed-dim'}`} />
                      <div>
                        <p className="text-sm font-semibold">{p.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{p.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[11px] font-bold ${suspenso ? 'text-slate-500' : 'text-on-tertiary-fixed-variant'}`}>
                        {suspenso ? 'Suspenso' : 'Autorizado'}
                      </span>
                      <button
                        disabled={busyId === p.id}
                        onClick={() => toggle(p)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition disabled:opacity-50 ${
                          suspenso ? 'bg-primary text-white hover:bg-primary-container' : 'bg-error-container/40 text-on-error-container hover:bg-error-container/70'
                        }`}
                      >
                        {suspenso ? 'Autorizar' : 'Suspender'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
