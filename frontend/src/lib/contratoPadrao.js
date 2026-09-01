import { supabase } from './supabase'
import {
  CONTRATO_MODELO, CONTRATO_TITULO, CONTRATO_VERSAO,
  PARAMETROS, PARAMETROS_PADRAO, REPASSE,
} from '../legal/contratoParceria'

// Resolução do contrato: QUAL texto a empresa usa e COM QUAIS valores ele é
// preenchido. Vive aqui porque três telas precisam da mesma resposta — a clínica
// ao gerar (`ContratosArea`), o dono ao publicar e pré-visualizar
// (`ContratosPlataformaArea`), e qualquer prévia futura.
//
// Ordem de precedência do TEXTO:
//   1. modelo próprio da empresa, quando `usa_padrao = false` e há conteúdo;
//   2. versão vigente em `contrato_padrao` (o contrato da plataforma);
//   3. o texto que vem no bundle (`legal/contratoParceria.js`) — fallback de
//      ambiente onde nada foi publicado ainda.
//
// Ordem de precedência dos PARÂMETROS: valor da empresa → default da versão
// publicada → default do bundle.

export const ORIGEM = {
  propria: { label: 'Modelo próprio da empresa', icon: 'edit_document' },
  plataforma: { label: 'Contrato padrão do sistema', icon: 'verified' },
  bundle: { label: 'Padrão do sistema (não publicado)', icon: 'inventory_2' },
}

export async function carregarPadraoVigente() {
  const { data, error } = await supabase
    .from('contrato_padrao')
    .select('versao, titulo, conteudo, parametros, notas, publicado_em')
    .eq('vigente', true).maybeSingle()
  if (error) throw error
  return data || null
}

export async function carregarVersoesPadrao() {
  const { data, error } = await supabase
    .from('contrato_padrao')
    .select('versao, titulo, notas, vigente, publicado_em, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Qual texto vale para esta empresa, e de onde ele vem.
export function resolverModelo({ modelo, padrao }) {
  const propria = modelo && modelo.usa_padrao === false && (modelo.conteudo || '').trim()
  if (propria) return { titulo: modelo.titulo || CONTRATO_TITULO, conteudo: modelo.conteudo, origem: 'propria', versao: null }
  if (padrao) return { titulo: padrao.titulo, conteudo: padrao.conteudo, origem: 'plataforma', versao: padrao.versao }
  return { titulo: CONTRATO_TITULO, conteudo: CONTRATO_MODELO, origem: 'bundle', versao: CONTRATO_VERSAO }
}

export function resolverParametros({ modelo, padrao }) {
  return { ...PARAMETROS_PADRAO, ...(padrao?.parametros || {}), ...(modelo?.parametros || {}) }
}

const vazio = (v) => v === null || v === undefined || String(v).trim() === ''

// Preenche o texto e devolve TAMBÉM o que faltou. Quem chama decide se bloqueia:
// escrever "{{foro_comarca}}" ou vazio num contrato que vai para assinatura é
// pior do que recusar a geração.
export function montarConteudo({ conteudo, empresa, parceiro, parametros, data }) {
  const repasse = REPASSE[parceiro?.forma_repasse]
  const ctx = {
    empresa_nome: empresa?.nome || '',
    empresa_cnpj: empresa?.cnpj || '',
    empresa_endereco: empresa?.endereco || '',
    parceiro_nome: parceiro?.nome || '',
    parceiro_cnpj: parceiro?.cnpj || '',
    parceiro_endereco: parceiro?.endereco || '',
    teto: Number(parceiro?.teto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    data: data || new Date().toLocaleDateString('pt-BR'),
    forma_repasse: repasse?.texto || '',
    ...(parametros || {}),
  }

  const faltando = []
  const texto = String(conteudo || '').replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in ctx)) { faltando.push({ k, motivo: 'placeholder sem origem no sistema' }); return `{{${k}}}` }
    if (vazio(ctx[k])) { faltando.push({ k, motivo: rotuloFalta(k) }); return `{{${k}}}` }
    return ctx[k]
  })
  return { texto, faltando }
}

// Mensagem que diz ONDE resolver, não só o que falta.
function rotuloFalta(k) {
  const p = PARAMETROS.find(x => x.k === k)
  if (p) return `parâmetro "${p.label}" (cláusula ${p.clausula}) — preencha em Contratos`
  const cadastro = {
    empresa_cnpj: 'CNPJ da empresa — preencha no cadastro da empresa',
    empresa_endereco: 'endereço da empresa — preencha no cadastro da empresa',
    empresa_nome: 'nome da empresa — preencha no cadastro da empresa',
    parceiro_cnpj: 'CNPJ do parceiro — preencha no cadastro do parceiro',
    parceiro_endereco: 'endereço do parceiro — preencha no cadastro do parceiro',
    forma_repasse: 'forma de repasse ao paciente — escolha na linha do parceiro (cláusula 8.1)',
  }
  return cadastro[k] || `campo "${k}"`
}

// Guardas de publicação: o que o dono não deve conseguir publicar sem ver.
// Casam com os marcadores usados no painel de conformidade.
export function conferirTexto(conteudo) {
  const t = String(conteudo || '')
  const avisos = []
  if (!/2\.200-2/.test(t)) avisos.push({ grave: true, msg: 'Sem a cláusula de anuência à assinatura eletrônica (MP 2.200-2/2001, art. 10 §2) — é dela que depende a validade da assinatura fora da ICP-Brasil.' })
  if (!/2\.217/.test(t)) avisos.push({ grave: true, msg: 'Sem a cláusula de vedações éticas (Res. CFM 2.217/2018, arts. 58 e 59) — é a que afasta remuneração por paciente encaminhado.' })
  if (!/784/.test(t)) avisos.push({ grave: false, msg: 'Sem a referência ao art. 784 do CPC — o contrato não afirma valer como título executivo extrajudicial.' })
  const colchetes = t.match(/\[[^\]\n]{1,120}\]/g) || []
  if (colchetes.length) avisos.push({ grave: true, msg: `${colchetes.length} campo(s) entre colchetes: ${colchetes.slice(0, 5).join(' ')} — vira lacuna no contrato assinado. Use {{placeholder}} com origem no sistema.` })
  const semOrigem = [...new Set((t.match(/\{\{(\w+)\}\}/g) || []))]
    .map(s => s.replace(/[{}]/g, ''))
    .filter(k => !CONHECIDOS.has(k))
  if (semOrigem.length) avisos.push({ grave: true, msg: `Placeholder sem origem: ${semOrigem.map(k => `{{${k}}}`).join(' ')} — nada preenche isso na geração.` })
  return avisos
}

const CONHECIDOS = new Set([
  'empresa_nome', 'empresa_cnpj', 'empresa_endereco',
  'parceiro_nome', 'parceiro_cnpj', 'parceiro_endereco',
  'teto', 'data', 'forma_repasse',
  ...PARAMETROS.map(p => p.k),
])

// Versão nova: data de hoje, com sufixo se o dia já tiver uma publicação.
export function proximaVersao(existentes) {
  const hoje = new Date().toISOString().slice(0, 10)
  const usadas = new Set((existentes || []).map(v => v.versao))
  if (!usadas.has(hoje)) return hoje
  for (let i = 2; i < 50; i++) if (!usadas.has(`${hoje}-${i}`)) return `${hoje}-${i}`
  return `${hoje}-${Date.now()}`
}

// Publicar = a nova passa a ser a vigente. O índice único parcial garante que
// nunca haja duas vigentes; por isso a antiga é desmarcada ANTES do insert. Se o
// insert falhar no meio, fica sem vigente e a geração cai no fallback do bundle
// — visível no painel, e não silencioso.
export async function publicarVersao({ versao, titulo, conteudo, parametros, notas, criadoPor }) {
  const { error: e1 } = await supabase.from('contrato_padrao').update({ vigente: false }).eq('vigente', true)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('contrato_padrao').insert({
    versao, titulo, conteudo, parametros: parametros || {}, notas: notas || null,
    vigente: true, publicado_em: new Date().toISOString(), criado_por: criadoPor || null,
  })
  if (e2) throw e2
}

export async function tornarVigente(versao) {
  const { error: e1 } = await supabase.from('contrato_padrao').update({ vigente: false }).eq('vigente', true)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('contrato_padrao')
    .update({ vigente: true, publicado_em: new Date().toISOString() }).eq('versao', versao)
  if (e2) throw e2
}
