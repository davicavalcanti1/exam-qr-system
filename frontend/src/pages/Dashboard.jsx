import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import BudgetBar from '../components/BudgetBar'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

function QRBadge({ patient }) {
  if (!patient.qr_id) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-surface-container text-on-surface-variant font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
        Sem QR
      </span>
    )
  }
  if (patient.qr_status === 'exhausted') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-error-container text-on-error-container font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        Esgotado
      </span>
    )
  }
  if (patient.qr_status === 'revoked') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-surface-container text-on-surface-variant font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-outline" />
        Revogado
      </span>
    )
  }
  const uses = patient.qr_uses || 0
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[#e8f5e9] text-green-800 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      QR Ativo ({uses}/{patient.qr_max_uses})
    </span>
  )
}

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function load() {
    try {
      const [p, b] = await Promise.all([api.getPatients(), api.getBudget()])
      setPatients(p)
      setBudget(b)
    } catch (err) {
      if (err.message?.includes('autorizado') || err.message?.includes('Token') || err.message?.includes('parceiro')) {
        localStorage.removeItem('token')
        navigate('/login')
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id, name) {
    if (!confirm(`Remover paciente "${name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deletePatient(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Pacientes</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Gerencie os pacientes e seus QR codes</p>
        </div>
        <Link
          to="/patients/new"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
            budget?.blocked
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed pointer-events-none opacity-50'
              : 'glass-gradient text-white hover:opacity-90'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
          Novo Paciente
        </Link>
      </div>

      <BudgetBar budget={budget} />

      {error && (
        <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3 mb-4">
          <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
          <p className="text-on-error-container text-sm">{error}</p>
        </div>
      )}

      {patients.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card text-center py-20">
          <span className="material-symbols-outlined text-outline mb-3" style={{ fontSize: '48px' }}>person_off</span>
          <p className="text-on-surface-variant text-base mb-1">Nenhum paciente cadastrado ainda.</p>
          <Link to="/patients/new" className="text-primary hover:underline text-sm font-medium">
            Cadastrar primeiro paciente →
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Paciente</th>
                <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">CPF</th>
                <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">Valor Exames</th>
                <th className="text-left px-5 py-3 text-on-surface-variant font-medium text-xs uppercase tracking-wide">QR Code</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-surface-container-high hover:bg-surface-container-low cursor-pointer transition"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-on-surface">{p.name}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-on-surface-variant">{fmtCpf(p.cpf)}</td>
                  <td className="px-5 py-4 font-medium text-on-surface">{fmt(p.total_value)}</td>
                  <td className="px-5 py-4">
                    <QRBadge patient={p} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/patients/${p.id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                        Detalhes
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="flex items-center gap-1 text-xs text-error hover:text-error/80 font-medium px-2 py-1"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
