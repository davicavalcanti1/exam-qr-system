// Gera um PDF de "ingressos" com 1..N comprovantes (QR + dados do paciente).
// Usado tanto no comprovante individual quanto no kit em lote para o parceiro.
// Sem valor/preço — o QR é voltado ao paciente.
import PDFDocument from 'pdfkit'

const PRIMARY = '#0E7C3A'
const DARK = '#1f2937'
const GRAY = '#6b7280'
const LINE = '#d1d5db'

// tickets: [{ paciente, exame, quando, protocolo, empresaNome, logoBuf, qrBuf }]
export async function gerarKitPdf(tickets) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true })
      const chunks = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const margin = 36
      const w = doc.page.width - margin * 2
      const gap = 22
      const h = (doc.page.height - margin * 2 - gap) / 2 // 2 ingressos por página

      tickets.forEach((t, i) => {
        const slot = i % 2
        if (i > 0 && slot === 0) doc.addPage()
        desenharTicket(doc, t, margin, margin + slot * (h + gap), w, h)
      })

      doc.end()
    } catch (e) { reject(e) }
  })
}

function desenharTicket(doc, t, x, y, w, h) {
  const pad = 18
  // moldura estilo ticket
  doc.roundedRect(x, y, w, h, 12).lineWidth(1).strokeColor(LINE).stroke()

  // cabeçalho — marca da clínica
  let hx = x + pad
  const hy = y + pad
  if (t.logoBuf) {
    try { doc.image(t.logoBuf, hx, hy - 2, { fit: [120, 26] }); hx += 130 } catch { /* logo inválido: ignora */ }
  }
  if (!t.logoBuf) {
    doc.font('Helvetica-Bold').fontSize(15).fillColor(PRIMARY)
      .text(t.empresaNome || 'Clínica', hx, hy, { width: w - pad * 2 - 120, lineBreak: false, ellipsis: true })
  }
  // protocolo (à direita)
  doc.font('Helvetica').fontSize(8).fillColor(GRAY)
    .text('COMPROVANTE', x + w - pad - 130, hy, { width: 130, align: 'right' })
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text(`#${t.protocolo}`, x + w - pad - 130, hy + 11, { width: 130, align: 'right' })

  // divisória
  const divY = y + pad + 30
  doc.moveTo(x + pad, divY).lineTo(x + w - pad, divY).lineWidth(0.5).strokeColor(LINE).stroke()

  // QR à esquerda
  const qr = Math.min(h - 74, 150)
  const qrY = divY + 14
  if (t.qrBuf) { try { doc.image(t.qrBuf, x + pad, qrY, { width: qr, height: qr }) } catch { /* ignora */ } }

  // dados à direita
  const dx = x + pad + qr + 22
  const dw = x + w - pad - dx
  let dy = qrY + 2
  const linha = (label, val) => {
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(String(label).toUpperCase(), dx, dy)
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text(val || '—', dx, dy + 10, { width: dw })
    dy = doc.y + 9
  }
  linha('Paciente', t.paciente)
  linha('Exame', t.exame)
  if (t.quando) linha('Data / horário', t.quando)

  // rodapé
  doc.font('Helvetica').fontSize(7).fillColor(GRAY)
    .text('Apresente este QR na recepção da clínica para confirmar o exame. Gerado pelo ExameQR · não é documento fiscal.',
      x + pad, y + h - 22, { width: w - pad * 2 })
}
