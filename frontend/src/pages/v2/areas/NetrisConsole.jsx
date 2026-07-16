import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/adminApi'

const soDigitos = (s) => String(s || '').replace(/\D/g, '')
const mascaraCpf = (s) => {
  const d = soDigitos(s).slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
const dataBR = (iso) => iso ? iso.split('-').reverse().join('/') : '—'

function Campo({ label, valor }) {
  return (
    <div className="flex justify-between px-4 py-2.5 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold text-right">{valor ?? '—'}</span>
    </div>
  )
}

export default function NetrisConsole({ empresaId }) {
  const [ativo, setAtivo] = useState(null)
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState(null)
  const [raw, setRaw] = useState(null)
  const [verRaw, setVerRaw] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    adminApi.netrisStatus(empresaId).then(s => setAtivo(!!s.ativo)).catch(() => setAtivo(false))
  }, [empresaId])

  async function buscar(e) {
    e?.preventDefault()
    const d = soDigitos(cpf)
    if (d.length !== 11) { setErr('Informe um CPF com 11 dígitos.'); return }
    setErr(''); setLoading(true); setRes(null); setRaw(null); setVerRaw(false)
    try {
      const [norm, cru] = await Promise.all([
        adminApi.netrisPaciente(d, false, empresaId),
        adminApi.netrisPaciente(d, true, empresaId),
      ])
      setRes(norm); setRaw(cru.raw ?? null)
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  if (ativo === null) return null
  const input = 'w-full px-3 py-2.5 text-sm rounded-lg bg-surface ring-1 ring-outline-variant/30 outline-none focus:ring-2 focus:ring-primary'

  return (
    <section className="bg-surface-container-lowest p-6 rounded-2xl shadow-card space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">terminal</span>
        <h3 className="text-lg font-semibold">Console NetRis</h3>
        <span className={`ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${ativo ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-primary' : 'bg-on-surface-variant/40'}`} />{ativo ? 'Conectado' : 'Inativo'}
        </span>
      </div>

      {!ativo ? (
        <p className="text-sm text-on-surface-variant">Ative e salve a integração NetRis acima para consultar aqui.</p>
      ) : (
        <>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Buscar paciente por CPF</label>
            <form onSubmit={buscar} className="flex gap-2 mt-1">
              <input className={input} inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(mascaraCpf(e.target.value))} />
              <button disabled={loading} className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-container transition disabled:opacity-50 flex-none">{loading ? 'Buscando…' : 'Buscar'}</button>
            </form>
          </div>

          {err && <div className="text-sm px-3 py-2 rounded-lg bg-error-container/50 text-on-error-container">{err}</div>}

          {res && (res.encontrado ? (
            <div className="space-y-3">
              <div className="rounded-lg ring-1 ring-outline-variant/20 divide-y divide-outline-variant/10">
                <Campo label="Nome" valor={res.paciente?.nome} />
                <Campo label="CPF" valor={res.paciente?.cpf ? mascaraCpf(res.paciente.cpf) : '—'} />
                <Campo label="Nascimento" valor={dataBR(res.paciente?.nascimento)} />
                <Campo label="Sexo" valor={res.paciente?.sexo === 'M' ? 'Masculino' : res.paciente?.sexo === 'F' ? 'Feminino' : '—'} />
                <Campo label="Telefone" valor={res.paciente?.telefone} />
                <Campo label="E-mail" valor={res.paciente?.email} />
                <Campo label="ID no NetRis" valor={res.paciente?.netrisId} />
              </div>
              <button onClick={() => setVerRaw(v => !v)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">{verRaw ? 'expand_less' : 'expand_more'}</span>{verRaw ? 'Ocultar' : 'Ver'} resposta crua (NetRis)
              </button>
              {verRaw && <pre className="text-[11px] bg-surface rounded-lg p-3 overflow-x-auto max-h-72 overflow-y-auto">{JSON.stringify(raw, null, 2)}</pre>}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Nenhum paciente encontrado para esse CPF no NetRis.</p>
          ))}
        </>
      )}
    </section>
  )
}
