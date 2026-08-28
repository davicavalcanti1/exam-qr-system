import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { adminApi } from '../../../lib/adminApi'
import { Card, Loading, EmptyState, Badge, Button, PageHeader, useToast } from '../../../components/ui'
import ContratoPadraoEditor from './ContratoPadraoEditor'

// Controle de contratos da PLATAFORMA (só o dono). Não é a tela da clínica
// (`ContratosArea`, que gera e envia): aqui é o painel de conformidade — quais
// contratos existem em TODAS as empresas e quais deles não sustentariam uma
// discussão de validade.
//
// Por que isto existe: contrato assinado sem provedor, sem hash, com campo entre
// colchetes em branco ou com data vinda do relógio do navegador continua
// aparecendo como "Assinado" na tela da clínica. Só uma visão cruzada mostra o
// tamanho do problema — e ela é do dono, não da clínica.
//
// Custo: a checagem de cláusula lê `contratos.conteudo` de todas as empresas
// (~12 KB por contrato com o modelo atual). É aceitável no volume de hoje e é
// owner-only; se crescer, vira RPC que devolve só as flags.

const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
const fmtDataHora = (s) => s ? new Date(s).toLocaleString('pt-BR') : '—'
const dias = (s) => s ? Math.floor((Date.now() - new Date(s).getTime()) / 86400000) : null

const COLCHETE = /\[[^\]\n]{1,120}\]/
// Marcadores das cláusulas que a pesquisa jurídica apontou como indispensáveis.
// Casam com o texto de `legal/contratoParceria.js` — se aquele texto mudar a
// forma de citar as normas, estes dois regex mudam junto.
const TEM_ANUENCIA = /2\.200-2/          // cláusula 14: anuência à assinatura eletrônica
const TEM_ETICA = /2\.217/                // cláusula 4: vedações do Código de Ética Médica

// Cada regra olha UM contrato e devolve um alerta. `tone` só pinta; o que importa
// é o `porque`, que é o que o dono precisa saber para decidir se age.
const REGRAS = [
  {
    k: 'aceite_interno', rotulo: 'Aceite interno', tone: 'warn',
    quando: (c) => c.status === 'assinado' && c.provedor !== 'zapsign',
    porque: 'Assinado sem provedor: nome digitado, sem trilha probatória. Pelo art. 784, § 4º do CPC, a dispensa de testemunhas depende de integridade conferida por provedor.',
  },
  {
    k: 'sem_hash', rotulo: 'Sem hash', tone: 'danger',
    quando: (c) => c.status === 'assinado' && !c.hash_sha256,
    porque: 'Assinado sem resumo criptográfico guardado — não há como provar que o texto não mudou depois.',
  },
  {
    k: 'data_anterior', rotulo: 'Data impossível', tone: 'danger',
    quando: (c) => c.assinado_at && c.created_at && new Date(c.assinado_at) < new Date(c.created_at),
    porque: 'Assinatura datada antes da criação do contrato. O aceite interno grava a data com o relógio do navegador do signatário (ContratoModal.jsx), então ela não é confiável.',
  },
  {
    k: 'sem_anuencia', rotulo: 'Sem anuência eletrônica', tone: 'warn',
    quando: (c) => c.conteudo && !TEM_ANUENCIA.test(c.conteudo),
    porque: 'O texto não tem a cláusula em que as partes admitem a assinatura eletrônica como válida — exigência do art. 10, § 2º da MP 2.200-2/2001 para assinatura fora da ICP-Brasil.',
  },
  {
    k: 'sem_etica', rotulo: 'Sem cláusula ética', tone: 'warn',
    quando: (c) => c.conteudo && !TEM_ETICA.test(c.conteudo),
    porque: 'O texto não afasta expressamente a remuneração por paciente encaminhado (art. 58 e 59 do Código de Ética Médica, Res. CFM 2.217/2018).',
  },
  {
    k: 'colchete', rotulo: 'Campo em branco', tone: 'danger',
    quando: (c) => c.conteudo && COLCHETE.test(c.conteudo),
    porque: 'Foi gerado com campo entre colchetes não preenchido (comarca, prazo, endereço) — o parceiro assina um contrato com lacuna.',
  },
  {
    k: 'parado', rotulo: 'Parado', tone: 'neutral',
    quando: (c) => c.status === 'pendente' && dias(c.enviado_at || c.created_at) > 15,
    porque: 'Pendente de assinatura há mais de 15 dias. Parceiro operando sem contrato assinado, ou link que nunca chegou.',
  },
]

const ST = {
  assinado: { label: 'Assinado', tone: 'success' },
  pendente: { label: 'Pendente', tone: 'warn' },
  recusado: { label: 'Recusado', tone: 'danger' },
  expirado: { label: 'Expirado', tone: 'neutral' },
  cancelado: { label: 'Cancelado', tone: 'neutral' },
}

function Resumo({ icon, label, valor, tone = 'primary' }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className={`material-symbols-outlined ${tone === 'danger' ? 'text-error' : 'text-primary'}`} style={{ fontSize: '20px' }}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight mt-2 tabular-nums">{valor}</p>
    </Card>
  )
}

export default function ContratosPlataformaArea() {
  const toast = useToast()
  const [dados, setDados] = useState(null)
  const [filtro, setFiltro] = useState('todos') // 'todos' | 'alertas' | chave de regra
  const [aberto, setAberto] = useState(null)    // id do contrato expandido

  async function load() {
    const [emp, parc, cont, mod] = await Promise.all([
      supabase.from('empresas').select('id, nome, cnpj, status').order('nome'),
      supabase.from('parceiros').select('id, empresa_id, nome, email, status, contrato_status'),
      supabase.from('contratos').select('id, empresa_id, parceiro_id, titulo, conteudo, status, provedor, assinante_nome, assinado_at, created_at, enviado_at, signatario_email, hash_sha256, arquivo_path, recusado_motivo').order('created_at', { ascending: false }),
      supabase.from('contrato_modelos').select('empresa_id, titulo, conteudo, updated_at, usa_padrao, parametros'),
    ])
    const erro = emp.error || parc.error || cont.error || mod.error
    if (erro) { toast.error(erro.message); setDados({ empresas: [], parceiros: [], contratos: [], modelos: [], zapsign: {} }); return }

    // A integração vive em `integracao_configs`, que o navegador não lê (RLS sem
    // policy). Uma chamada por empresa: é owner-only e o número de empresas é
    // pequeno. Falha de uma não derruba o painel.
    const empresas = emp.data || []
    const pares = await Promise.all(empresas.map(e =>
      adminApi.zapsignConfig(e.id).then(c => [e.id, c]).catch(() => [e.id, null])))

    setDados({
      empresas,
      parceiros: parc.data || [],
      contratos: cont.data || [],
      modelos: mod.data || [],
      zapsign: Object.fromEntries(pares),
    })
  }
  useEffect(() => { load() }, [])

  async function abrirPdf(contratoId) {
    try {
      const { url } = await adminApi.zapsignArquivo('contrato', contratoId)
      if (url) window.open(url, '_blank', 'noopener')
      else toast.error('Sem documento assinado guardado.')
    } catch (e) { toast.error(e.message) }
  }

  if (dados === null) return <Loading />

  const { empresas, parceiros, contratos, modelos, zapsign } = dados
  const nomeEmpresa = (id) => empresas.find(e => e.id === id)?.nome || '—'
  const parceiroDe = (id) => parceiros.find(p => p.id === id)
  const modeloDe = (id) => modelos.find(m => m.empresa_id === id)

  // Alertas por contrato, calculados uma vez.
  const comAlertas = contratos.map(c => ({ ...c, alertas: REGRAS.filter(r => r.quando(c)) }))
  const totalAlertas = comAlertas.reduce((s, c) => s + c.alertas.length, 0)
  const assinados = contratos.filter(c => c.status === 'assinado')
  const comProvedor = assinados.filter(c => c.provedor === 'zapsign').length

  const visiveis = filtro === 'todos' ? comAlertas
    : filtro === 'alertas' ? comAlertas.filter(c => c.alertas.length)
    : comAlertas.filter(c => c.alertas.some(a => a.k === filtro))

  // Adota o contrato do sistema quem marcou `usa_padrao` E quem nunca salvou
  // modelo nenhum: sem linha, a geração já resolve pelo padrão vigente.
  const adota = (id) => { const m = modeloDe(id); return !m || m.usa_padrao !== false }
  const adotantes = empresas.filter(e => adota(e.id)).length

  // Linha por empresa: o estado da parceria do lado da plataforma.
  const linhasEmpresa = empresas.map(e => {
    const meus = comAlertas.filter(c => c.empresa_id === e.id)
    const parc = parceiros.filter(p => p.empresa_id === e.id)
    const modelo = modeloDe(e.id)
    const z = zapsign[e.id]
    return {
      ...e,
      zapsignAtivo: !!z?.ativo,
      zapsignToken: !!z?.tokenConfigurado,
      zapsignAmbiente: z?.ambiente || null,
      modeloSalvo: !!modelo,
      adotaPadrao: adota(e.id),
      modeloOk: !!modelo?.conteudo && TEM_ANUENCIA.test(modelo.conteudo) && TEM_ETICA.test(modelo.conteudo),
      modeloColchetes: !!modelo?.conteudo && COLCHETE.test(modelo.conteudo),
      modeloEm: modelo?.updated_at || null,
      parceiros: parc.length,
      semEmail: parc.filter(p => !p.email).length,
      // `parceiros.contrato_status` é denormalizado; divergir dos contratos reais
      // significa parceiro liberado a autorizar exames sem contrato assinado.
      divergentes: parc.filter(p => p.contrato_status === 'assinado'
        && !meus.some(c => c.parceiro_id === p.id && c.status === 'assinado')).length,
      assinados: meus.filter(c => c.status === 'assinado').length,
      pendentes: meus.filter(c => c.status === 'pendente').length,
      alertas: meus.reduce((s, c) => s + c.alertas.length, 0),
    }
  })

  function exportarCsv() {
    const cols = ['empresa', 'parceiro', 'status', 'provedor', 'criado', 'enviado', 'assinado', 'hash', 'alertas']
    const linhas = comAlertas.map(c => [
      nomeEmpresa(c.empresa_id), parceiroDe(c.parceiro_id)?.nome || '—', c.status, c.provedor,
      fmtData(c.created_at), fmtData(c.enviado_at), fmtData(c.assinado_at),
      c.hash_sha256 ? 'sim' : 'não', c.alertas.map(a => a.rotulo).join(' | '),
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [cols.join(','), ...linhas].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'contratos-plataforma.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const contagemRegra = (k) => comAlertas.filter(c => c.alertas.some(a => a.k === k)).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon="gavel"
        title="Contratos da plataforma"
        subtitle="Conformidade dos contratos de todas as empresas — assinatura, integridade e cláusulas obrigatórias."
        actions={<>
          <Button size="sm" variant="secondary" icon="refresh" onClick={() => { setDados(null); load() }}>Recarregar</Button>
          <Button size="sm" variant="secondary" icon="download" onClick={exportarCsv} disabled={!contratos.length}>CSV</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Resumo icon="description" label="Contratos" valor={contratos.length} />
        <Resumo icon="verified_user" label="Assinados c/ provedor" valor={`${comProvedor}/${assinados.length}`} />
        <Resumo icon="draw" label="Aceite interno" valor={assinados.length - comProvedor} />
        <Resumo icon="warning" label="Alertas" valor={totalAlertas} tone={totalAlertas ? 'danger' : 'primary'} />
      </div>

      <ContratoPadraoEditor adotantes={adotantes} totalEmpresas={empresas.length} onPublicado={() => { setDados(null); load() }} />

      {/* Por empresa */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-outline-variant/10">
          <h3 className="text-lg font-semibold">Por empresa</h3>
          <p className="text-sm text-on-surface-variant mt-0.5">Provedor ligado, modelo em uso e parceiros aptos a receber o link de assinatura.</p>
        </div>
        {empresas.length === 0 ? <EmptyState icon="business" title="Nenhuma empresa" hint="Cadastre uma empresa para ver os contratos." />
          : <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/15">
                    <th className="text-left py-3 px-5">Empresa</th>
                    <th className="text-left py-3 px-3">ZapSign</th>
                    <th className="text-left py-3 px-3">Modelo</th>
                    <th className="text-right py-3 px-3">Parceiros</th>
                    <th className="text-right py-3 px-3">Sem e-mail</th>
                    <th className="text-right py-3 px-3">Assinados</th>
                    <th className="text-right py-3 px-3">Pendentes</th>
                    <th className="text-right py-3 px-5">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasEmpresa.map(e => (
                    <tr key={e.id} className="border-b border-outline-variant/10 hover:bg-black/[.02]">
                      <td className="py-3 px-5 font-semibold">{e.nome}</td>
                      <td className="py-3 px-3">
                        {e.zapsignAtivo
                          ? <Badge tone={e.zapsignAmbiente === 'producao' ? 'success' : 'warn'} icon="verified">{e.zapsignAmbiente === 'producao' ? 'Produção' : 'Sandbox'}</Badge>
                          : <Badge tone={e.zapsignToken ? 'warn' : 'danger'} icon="link_off">{e.zapsignToken ? 'Token, desligado' : 'Sem token'}</Badge>}
                      </td>
                      <td className="py-3 px-3">
                        {e.adotaPadrao ? <Badge tone="primary" icon="verified">Contrato do sistema</Badge>
                          : e.modeloOk
                            ? <Badge tone={e.modeloColchetes ? 'warn' : 'success'} icon={e.modeloColchetes ? 'edit_note' : 'check'}>{e.modeloColchetes ? 'Próprio · colchetes em branco' : `Próprio · ${fmtData(e.modeloEm)}`}</Badge>
                            : <Badge tone="danger" icon="gavel">Próprio · sem cláusulas obrigatórias</Badge>}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">{e.parceiros}</td>
                      <td className={`py-3 px-3 text-right tabular-nums ${e.semEmail ? 'font-bold text-error' : 'text-on-surface-variant'}`}>{e.semEmail}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{e.assinados}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{e.pendentes}</td>
                      <td className={`py-3 px-5 text-right tabular-nums ${e.alertas ? 'font-bold text-error' : 'text-on-surface-variant'}`}>{e.alertas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </Card>

      {/* Divergências de contrato_status — parceiro liberado sem contrato assinado */}
      {linhasEmpresa.some(e => e.divergentes > 0) && (
        <Card className="p-5 border border-error-container">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-error">report</span>
            <div>
              <h3 className="font-semibold">Parceiros marcados como "contrato assinado" sem contrato assinado</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                {linhasEmpresa.filter(e => e.divergentes).map(e => `${e.nome} (${e.divergentes})`).join(' · ')}
              </p>
              <p className="text-sm text-on-surface-variant mt-2">
                <code className="text-xs bg-surface-container px-1 rounded">parceiros.contrato_status</code> é denormalizado. Divergir dos contratos reais significa parceiro autorizando exames sem instrumento assinado.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Contratos */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-outline-variant/10 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Contratos ({visiveis.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltro('todos')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtro === 'todos' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>Todos ({contratos.length})</button>
            <button onClick={() => setFiltro('alertas')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtro === 'alertas' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>Com alerta ({comAlertas.filter(c => c.alertas.length).length})</button>
            {REGRAS.map(r => contagemRegra(r.k) > 0 && (
              <button key={r.k} onClick={() => setFiltro(r.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filtro === r.k ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{r.rotulo} ({contagemRegra(r.k)})</button>
            ))}
          </div>
        </div>

        {visiveis.length === 0
          ? <EmptyState icon="gavel" title={filtro === 'todos' ? 'Nenhum contrato gerado' : 'Nada neste filtro'} hint={filtro === 'todos' ? 'Os contratos aparecem aqui assim que as clínicas gerarem.' : 'Troque o filtro para ver os demais.'} />
          : <div className="divide-y divide-outline-variant/10">
              {visiveis.map(c => {
                const p = parceiroDe(c.parceiro_id)
                const st = ST[c.status] || { label: c.status, tone: 'neutral' }
                const expandido = aberto === c.id
                return (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-[240px]">
                        <p className="font-semibold">{p?.nome || 'Parceiro removido'}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{nomeEmpresa(c.empresa_id)} · {c.titulo}</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Criado {fmtData(c.created_at)}
                          {c.enviado_at && ` · enviado ${fmtData(c.enviado_at)}`}
                          {c.assinado_at && ` · assinado ${fmtDataHora(c.assinado_at)}`}
                          {c.assinante_nome && ` por ${c.assinante_nome}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <Badge tone={c.provedor === 'zapsign' ? 'primary' : 'neutral'} icon={c.provedor === 'zapsign' ? 'verified' : 'draw'}>{c.provedor === 'zapsign' ? 'ZapSign' : 'Interno'}</Badge>
                        {c.hash_sha256 && <Badge tone="neutral" icon="fingerprint">Hash</Badge>}
                        {c.arquivo_path && <Button size="sm" variant="secondary" icon="picture_as_pdf" onClick={() => abrirPdf(c.id)}>PDF</Button>}
                        <Button size="sm" variant="secondary" icon={expandido ? 'expand_less' : 'expand_more'} onClick={() => setAberto(expandido ? null : c.id)}>Detalhes</Button>
                      </div>
                    </div>

                    {c.alertas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {c.alertas.map(a => <Badge key={a.k} tone={a.tone} icon="warning">{a.rotulo}</Badge>)}
                      </div>
                    )}

                    {expandido && (
                      <div className="mt-4 space-y-3 text-sm">
                        {c.alertas.length > 0 && (
                          <ul className="space-y-2">
                            {c.alertas.map(a => (
                              <li key={a.k} className="flex gap-2">
                                <span className="material-symbols-outlined text-error flex-none" style={{ fontSize: '18px' }}>arrow_right</span>
                                <span><b>{a.rotulo}.</b> {a.porque}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                          <div><dt className="text-on-surface-variant">E-mail do signatário</dt><dd className="font-mono break-all">{c.signatario_email || p?.email || '— não cadastrado'}</dd></div>
                          <div><dt className="text-on-surface-variant">Hash SHA-256</dt><dd className="font-mono break-all">{c.hash_sha256 || '—'}</dd></div>
                          <div><dt className="text-on-surface-variant">Arquivo assinado</dt><dd className="font-mono break-all">{c.arquivo_path || '—'}</dd></div>
                          {c.recusado_motivo && <div className="sm:col-span-2"><dt className="text-on-surface-variant">Motivo da recusa</dt><dd>{c.recusado_motivo}</dd></div>}
                          <div><dt className="text-on-surface-variant">ID</dt><dd className="font-mono break-all">{c.id}</dd></div>
                        </dl>
                        <details>
                          <summary className="cursor-pointer text-xs font-bold text-on-surface-variant uppercase tracking-widest">Texto assinado</summary>
                          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs bg-surface-container rounded-lg p-3 leading-relaxed">{c.conteudo}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
      </Card>
    </div>
  )
}
