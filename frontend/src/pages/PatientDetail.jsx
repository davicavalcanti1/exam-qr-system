import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR')

const USE_LABELS = { transport: 'Transporte', snack: 'Lanche', exam: 'Exame' }

function UsageDot({ type, usageLog }) {
  const used = usageLog?.find(u => u.use_type === type)
  return (
    <div className={`flex flex-col items-center gap-1`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${used ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
        {type === 'transport' ? '🚌' : type === 'snack' ? '🍱' : '🏥'}
      </div>
      <span className="text-xs text-gray-600">{USE_LABELS[type]}</span>
      {used && <span className="text-xs text-green-600 font-medium">✓ Usado</span>}
    </div>
  )
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [qrImage, setQrImage] = useState(null)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const printRef = useRef()

  async function load() {
    try {
      const data = await api.getPatient(id)
      setPatient(data)
      if (data.qrCode) {
        const imgData = await api.getQRImage(id)
        setQrImage(imgData.dataUrl)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleGenerateQR() {
    setError('')
    setGenerating(true)
    try {
      const data = await api.generateQR(id)
      setQrImage(data.dataUrl)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (!patient) return <div className="text-center py-20 text-gray-500">Carregando...</div>

  const total = patient.exams?.reduce((s, e) => s + e.value, 0) || 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">{patient.name}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Patient info */}
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Dados do Paciente</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">CPF:</span>
            <span className="ml-2 font-mono font-medium">{fmtCpf(patient.cpf)}</span>
          </div>
          <div>
            <span className="text-gray-500">Cadastro:</span>
            <span className="ml-2">{fmtDate(patient.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Exams */}
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Exames</h2>
        <div className="space-y-2">
          {patient.exams?.map((exam, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <span className="font-medium text-gray-800">{exam.exam_name}</span>
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {exam.exam_type}
                </span>
              </div>
              <span className="font-semibold text-gray-700">{fmt(exam.value)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 font-bold text-gray-800">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* QR Code section */}
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-4">QR Code</h2>

        {!patient.qrCode ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-4">
              Nenhum QR Code gerado. Clique abaixo para liberar os exames e gerar o QR Code.
            </p>
            <button
              onClick={handleGenerateQR}
              disabled={generating}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {generating ? 'Gerando...' : 'Gerar QR Code'}
            </button>
          </div>
        ) : (
          <div>
            {/* Usage status */}
            <div className="flex justify-center gap-8 mb-5">
              <UsageDot type="transport" usageLog={patient.usageLog} />
              <UsageDot type="snack" usageLog={patient.usageLog} />
              <UsageDot type="exam" usageLog={patient.usageLog} />
            </div>

            {patient.qrCode.status === 'exhausted' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm text-center mb-4">
                QR Code esgotado — todas as 3 utilizações foram consumidas
              </div>
            )}

            {/* QR image */}
            {qrImage && (
              <div ref={printRef} className="flex flex-col items-center gap-3">
                <img src={qrImage} alt="QR Code" className="w-56 h-56 rounded-lg border border-gray-200" />
                <p className="text-xs text-gray-400 font-mono text-center break-all max-w-xs hidden print:block">
                  {patient.name} — {fmtCpf(patient.cpf)}
                </p>
                <button
                  onClick={handlePrint}
                  className="mt-2 border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition print:hidden"
                >
                  Imprimir QR Code
                </button>
              </div>
            )}

            {/* Usage log */}
            {patient.usageLog?.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Histórico de uso</h3>
                <div className="space-y-1">
                  {patient.usageLog.map((log, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500">
                      <span>{USE_LABELS[log.use_type]}</span>
                      <span>{fmtDate(log.used_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
