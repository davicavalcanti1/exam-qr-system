// Monta o PDF de um documento de texto (contrato de parceria, DPA) para mandar
// ao provedor de assinatura.
//
// O texto já existe no banco — `contratos.conteudo` é o snapshot preenchido, e o
// DPA vem do front com a versão que o usuário leu. Aqui ele só vira papel: sem
// reescrever nada, porque é exatamente este conteúdo que será assinado.
//
// O ZapSign carimba a própria página de assinaturas no fim do arquivo, então
// este PDF não desenha campo de assinatura nenhum.

import PDFDocument from 'pdfkit'

// Mesma paleta do kit de QR (src/utils/qrKitPdf.js). Nota: este verde é o do
// PDF e difere do #0E9E4E usado no app — quando a marca for unificada, os dois
// arquivos mudam juntos.
const PRIMARY = '#0E7C3A'
const DARK = '#1f2937'
const GRAY = '#6b7280'
const LINE = '#d1d5db'

const MARGEM = 56

/**
 * @param {object} p
 * @param {string} p.titulo       título do documento
 * @param {string} p.conteudo     corpo, texto puro (quebras de linha preservadas)
 * @param {string} p.empresaNome  marca de quem emite
 * @param {Buffer} [p.logoBuf]    logo da empresa, se houver
 * @param {string} [p.referencia] identificador curto mostrado no cabeçalho
 * @param {string} [p.rodape]     linha fixa no pé de cada página
 * @returns {Promise<Buffer>}
 */
export async function gerarDocumentoPdf({ titulo, conteudo, empresaNome, logoBuf, referencia, rodape }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: MARGEM, bufferPages: true })
      const chunks = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const largura = doc.page.width - MARGEM * 2

      // ── Cabeçalho (só na primeira página) ──────────────────────────────────
      let y = MARGEM
      if (logoBuf) {
        try {
          doc.image(logoBuf, MARGEM, y, { fit: [140, 32] })
          y += 40
        } catch { /* logo inválido: segue sem ele */ }
      }
      if (!logoBuf) {
        doc.font('Helvetica-Bold').fontSize(16).fillColor(PRIMARY)
          .text(empresaNome || 'Clínica', MARGEM, y, { width: largura, lineBreak: false, ellipsis: true })
        y = doc.y + 8
      }

      if (referencia) {
        doc.font('Helvetica').fontSize(8).fillColor(GRAY)
          .text(referencia.toUpperCase(), MARGEM, y, { width: largura })
        y = doc.y + 4
      }

      doc.moveTo(MARGEM, y).lineTo(MARGEM + largura, y).lineWidth(0.5).strokeColor(LINE).stroke()
      y += 22

      // ── Título ────────────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(17).fillColor(DARK)
        .text(titulo || 'Documento', MARGEM, y, { width: largura })
      y = doc.y + 16

      // ── Corpo ─────────────────────────────────────────────────────────────
      // `text` já quebra página sozinho quando o conteúdo não cabe.
      doc.font('Helvetica').fontSize(10.5).fillColor(DARK)
        .text(String(conteudo || '').trim(), MARGEM, y, {
          width: largura,
          align: 'left',
          lineGap: 3.5,
        })

      // ── Rodapé em todas as páginas ────────────────────────────────────────
      const linhaRodape = rodape || `${empresaNome || 'ExameQR'} · documento gerado pelo ExameQR`
      const paginas = doc.bufferedPageRange()
      for (let i = 0; i < paginas.count; i++) {
        doc.switchToPage(paginas.start + i)
        const yRodape = doc.page.height - MARGEM + 14
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
          .text(linhaRodape, MARGEM, yRodape, { width: largura - 60, lineBreak: false, ellipsis: true })
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
          .text(`${i + 1} / ${paginas.count}`, MARGEM + largura - 60, yRodape, { width: 60, align: 'right' })
      }

      doc.flushPages()
      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

// Baixa a logo da empresa para embutir no PDF. Best-effort e com timeout: uma
// URL de logo lenta não pode segurar o envio do contrato.
export async function baixarLogo(url) {
  if (!url) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 5000)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    // pdfkit só entende PNG e JPEG; buffer grande demais também não vale a pena.
    return buf.length && buf.length < 3_000_000 ? buf : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}
