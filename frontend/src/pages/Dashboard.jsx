import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import BudgetBar from '../components/BudgetBar'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

function StatusBadge({ patient }) {
  if (!patient.qr_id) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Sem QR</span>
  }
  if (patient.qr_status === 'exhausted') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Esgotado</span>
  }
  if (patient.qr_status === 'revoked') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Revogado</span>
  }
  const uses = patient.qr_uses || 0
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
      QR Ativo ({uses}/{patient.qr_max_uses} usos)
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

  if (loading) return <div className="text-center py-20 text-gray-500">Carregando...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes Cadastrados</h1>
        <Link
          to="/patients/new"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${budget?.blocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          + Novo Paciente
        </Link>
      </div>

      <BudgetBar budget={budget} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {patients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <p className="text-gray-400 text-lg">Nenhum paciente cadastrado ainda.</p>
          <Link to="/patients/new" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Cadastrar primeiro paciente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Paciente</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">CPF</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Total Exames</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status QR</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{fmtCpf(p.cpf)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(p.total_value)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge patient={p} />
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <Link
                      to={`/patients/${p.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver detalhes
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
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
