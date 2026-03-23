import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtCpf = (c) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR')

const USE_LABELS = { transport: 'Transporte', snack: 'Lanche', exam: 'Exame' }
const USE_ICONS = { transport: 'directions_bus', snack: 'restaurant', exam: 'biotech' }

function UsageDot({ type, usageLog }) {
  const used = usageLog?.find(u => u.use_type === type)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
        used
          ? 'bg-[#e8f5e9] text-green-700 shadow-sm'
          : 'bg-surface-container text-on-surface-variant'
      }`}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{USE_ICONS[type]}</span>
      </div>
      <span className="text-xs font-medium text-on-surface-variant">{USE_LABELS[type]}</span>
      {used ? (
        <span className="text-xs text-green-600 font-semibold flex items-center gap-0.5">
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>check_circle</span>
          Usado
        </span>
      ) : (
        <span className="text-xs text-on-surface-variant/50">Pendente</span>
      )}
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

  if (!patient) return (
    <div className="flex items-center justify-center py-32">
      {error ? (
        <p className="text-on-surface-variant">{error}</p>
      ) : (
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )

  const total = patient.exams?.reduce((s, e) => s + e.value, 0) || 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-on-surface">{patient.name}</h1>
          <p className="text-on-surface-variant text-sm">Detalhes do paciente</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3 mb-4">
          <span className="material-symbols-outlined text-error" style={{ fontSize: '18px' }}>error</span>
          <p className="text-on-error-container text-sm">{error}</p>
        </div>
      )}

      {/* Patient info */}
      <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>person</span>
          <h2 className="font-semibold text-on-surface">Dados do Paciente</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-surface-container-low rounded-xl px-4 py-3">
            <p className="text-xs text-on-surface-variant mb-0.5">CPF</p>
            <p className="font-mono font-semibold text-on-surface">{fmtCpf(patient.cpf)}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl px-4 py-3">
            <p className="text-xs text-on-surface-variant mb-0.5">Cadastrado em</p>
            <p className="font-medium text-on-surface">{fmtDate(patient.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Exams */}
      <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>biotech</span>
          <h2 className="font-semibold text-on-surface">Exames</h2>
        </div>
        <div className="space-y-2">
          {patient.exams?.map((exam, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>medical_services</span>
                </div>
                <div>
                  <span className="font-medium text-on-surface text-sm">{exam.exam_name}</span>
                  {exam.exam_type && (
                    <span className="ml-2 text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">
                      {exam.exam_type}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-semibold text-on-surface">{fmt(exam.value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 px-4">
            <span className="text-sm font-semibold text-on-surface-variant">Total</span>
            <span className="font-bold text-lg text-primary">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* QR Code section */}
      <div className="bg-surface rounded-2xl border border-surface-container-high shadow-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>qr_code_2</span>
          <h2 className="font-semibold text-on-surface">QR Code</h2>
        </div>

        {!patient.qrCode ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '32px' }}>qr_code</span>
            </div>
            <p className="text-on-surface-variant text-sm mb-5 max-w-xs mx-auto">
              Nenhum QR Code gerado. Clique abaixo para liberar os exames e gerar o QR Code.
            </p>
            <button
              onClick={handleGenerateQR}
              disabled={generating}
              className="glass-gradient text-white font-semibold px-8 py-3 rounded-xl transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_2</span>
                  Gerar QR Code
                </>
              )}
            </button>
          </div>
        ) : (
          <div>
            {/* Usage status */}
            <div className="flex justify-center gap-6 mb-6">
              <UsageDot type="transport" usageLog={patient.usageLog} />
              <UsageDot type="snack" usageLog={patient.usageLog} />
              <UsageDot type="exam" usageLog={patient.usageLog} />
            </div>

            {patient.qrCode.status === 'exhausted' && (
              <div className="flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-4 py-3 text-on-error-container text-sm text-center mb-5 justify-center">
                <span className="material-symbols-outlined text-error" style={{ fontSize: '16px' }}>warning</span>
                QR Code esgotado — todas as 3 utilizações foram consumidas
              </div>
            )}

            {/* QR image */}
            {qrImage && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-2xl border border-surface-container-high shadow-sm">
                  <img src={qrImage} alt="QR Code" className="w-52 h-52" />
                </div>
                <p className="text-xs text-on-surface-variant text-center">
                  {patient.name} — {fmtCpf(patient.cpf)}
                </p>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-xl text-sm hover:bg-surface-container transition print:hidden font-medium"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                  Imprimir QR Code
                </button>
              </div>
            )}

            {/* Usage log */}
            {patient.usageLog?.length > 0 && (
              <div className="mt-6 border-t border-surface-container-high pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>history</span>
                  <h3 className="text-sm font-semibold text-on-surface-variant">Histórico de uso</h3>
                </div>
                <div className="space-y-2">
                  {patient.usageLog.map((log, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-surface-container-low rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '14px' }}>{USE_ICONS[log.use_type]}</span>
                        <span className="font-medium text-on-surface">{USE_LABELS[log.use_type]}</span>
                      </div>
                      <span className="text-on-surface-variant">{fmtDate(log.used_at)}</span>
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
