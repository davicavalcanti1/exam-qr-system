#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Contrato de Parceria em PDF
   ---------------------------------------------------------------------------
       node scripts/gerar-contrato-pdf.mjs [caminho/de/saida.pdf]

   Lê o texto de `frontend/src/legal/contratoParceria.js` — a mesma fonte que o
   sistema usa para gerar contrato de verdade. Assim o PDF é exatamente o texto
   em vigor, e não uma cópia que envelhece.

   Só o contrato: cabeçalho da marca, cláusulas 1 a 17, fechamento. Os
   `{{campos}}` são preservados e destacados em verde — são o que o sistema
   preenche na geração.
   ═══════════════════════════════════════════════════════════════════════════ */

import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { createWriteStream, existsSync } from 'node:fs'
import PDFDocument from 'pdfkit'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '..')

const { CONTRATO_MODELO, CONTRATO_TITULO, CONTRATO_VERSAO } =
  await import(new URL('../frontend/src/legal/contratoParceria.js', import.meta.url).href)

const SAIDA = process.argv[2] || join(RAIZ, `ExameQR-Contrato-Parceria-v${CONTRATO_VERSAO}.pdf`)
const LOGO = join(RAIZ, 'frontend', 'public', 'brotopay.png')

// O verde da marca no app é #0E9E4E; o PDF usa um tom mais escuro no texto para
// não perder contraste impresso. Mesma decisão de `src/utils/documentoPdf.js`.
const VERDE = '#0E7C3A'
const VERDE_CLARO = '#0E9E4E'
const ESCURO = '#1f2937'
const CINZA = '#6b7280'

const M = 58
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: M, bottom: M + 18, left: M, right: M },
  bufferPages: true,
})
const L = doc.page.width - M * 2

doc.pipe(createWriteStream(SAIDA))
doc.info.Title = `${CONTRATO_TITULO} — ExameQR (v${CONTRATO_VERSAO})`
doc.info.Author = 'ExameQR'

const fimDaPagina = () => doc.page.height - M - 26

// ── Blocos de composição ─────────────────────────────────────────────────────

function letterhead() {
  const y = M
  if (existsSync(LOGO)) doc.image(LOGO, M, y - 5, { fit: [31, 31] })
  doc.font('Helvetica-Bold').fontSize(16).fillColor(VERDE)
    .text('ExameQR', M + 39, y + 1, { width: L - 39, lineBreak: false })
  doc.font('Helvetica').fontSize(7).fillColor(CINZA)
    .text('CONTROLE DE EXAMES POR PARCERIA', M + 39, y + 20, { width: L - 39, characterSpacing: 0.7, lineBreak: false })
  doc.moveTo(M, y + 38).lineTo(M + L, y + 38).lineWidth(0.6).strokeColor(VERDE).stroke()
  doc.x = M
  doc.y = y + 62
}

// Parágrafo com os {{campos}} em verde. Escreve em pedaços encadeados
// (`continued`) para o destaque não quebrar o fluxo da linha.
function paragrafo(texto, { size = 9.8, indent = 0, gap = 3.4, bold = false, cor = ESCURO, depois = 0.5 } = {}) {
  if (doc.y > fimDaPagina() - 40) doc.addPage()
  const partes = String(texto).split(/(\{\{\w+\}\})/g).filter(s => s !== '')
  const x = M + indent
  const largura = L - indent
  partes.forEach((parte, i) => {
    const campo = /^\{\{\w+\}\}$/.test(parte)
    const ultimo = i === partes.length - 1
    doc.font(campo || bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
      .fillColor(campo ? VERDE_CLARO : cor)
    const opts = { width: largura, align: 'left', lineGap: gap, continued: !ultimo }
    if (i === 0) doc.text(parte, x, doc.y, opts)
    else doc.text(parte, opts)
  })
  doc.moveDown(depois)
}

function secao(t) {
  // Título de seção nunca fica órfão no pé da página.
  if (doc.y > fimDaPagina() - 90) doc.addPage()
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(VERDE)
    .text(t, M, doc.y, { width: L, characterSpacing: 0.4 })
  doc.y += 4
  doc.moveTo(M, doc.y).lineTo(M + 46, doc.y).lineWidth(1.4).strokeColor(VERDE_CLARO).stroke()
  doc.y += 12
}

// ── Abertura ─────────────────────────────────────────────────────────────────

letterhead()

doc.font('Helvetica-Bold').fontSize(16).fillColor(ESCURO)
  .text(CONTRATO_TITULO.toUpperCase(), M, doc.y, { width: L, lineGap: 2 })
doc.y += 8
doc.font('Helvetica').fontSize(9).fillColor(CINZA)
  .text(`Modelo versão ${CONTRATO_VERSAO}`, M, doc.y, { width: L })
doc.y += 20

// ── Cláusulas 1 a 17 ─────────────────────────────────────────────────────────

const RE_SECAO = /^\d+\.\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ]/
const RE_ITEM = /^\d+\.\d+\./
const RE_ALINEA = /^\s+[a-z]\)/

let comecou = false
for (const bruta of CONTRATO_MODELO.split('\n')) {
  const linha = bruta.replace(/\s+$/, '')
  // Pula o título e a linha de versão do texto-fonte: já estão na abertura.
  if (!comecou) {
    if (RE_SECAO.test(linha)) comecou = true
    else continue
  }
  if (!linha.trim()) { doc.moveDown(0.25); continue }
  if (RE_SECAO.test(linha)) { secao(linha.trim()); continue }
  if (RE_ALINEA.test(bruta)) { paragrafo(linha.trim(), { indent: 20, size: 9.6, depois: 0.3 }); continue }
  if (/^\s+\{\{\w+\}\}/.test(bruta)) { paragrafo(linha.trim(), { indent: 20, depois: 0.5 }); continue }
  if (RE_ITEM.test(linha)) { paragrafo(linha.trim()); continue }
  // Fechamento ("E por estarem de acordo...") e qualquer outra linha corrida.
  doc.moveDown(0.6)
  paragrafo(linha.trim())
}

// ── Rodapé em todas as páginas ───────────────────────────────────────────────

const paginas = doc.bufferedPageRange()
for (let i = 0; i < paginas.count; i++) {
  doc.switchToPage(paginas.start + i)
  const y = doc.page.height - M + 2
  doc.font('Helvetica').fontSize(7.4).fillColor(CINZA)
    .text(`ExameQR · ${CONTRATO_TITULO} · v${CONTRATO_VERSAO}`, M, y, { width: L - 70, lineBreak: false })
  doc.font('Helvetica').fontSize(7.4).fillColor(CINZA)
    .text(`${i + 1} / ${paginas.count}`, M + L - 70, y, { width: 70, align: 'right', lineBreak: false })
}

doc.flushPages()
doc.end()
console.log(`PDF gerado: ${SAIDA}`)
console.log(`${paginas.count} páginas · versão ${CONTRATO_VERSAO}`)
