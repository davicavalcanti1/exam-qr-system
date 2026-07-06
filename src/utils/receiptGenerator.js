import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const fmt = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value)

const COLORS = {
  primary: '#1e3a5f',
  accent: '#4f46e5',
  success: '#10b981',
  border: '#e5e7eb',
  text: '#1f2937',
  lightText: '#6b7280',
  background: '#f9fafb'
}

export async function generateReceipt(patient, exams, qrToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 35,
        bufferPages: true
      })

      // Gerar QR code como imagem
      const qrImage = await QRCode.toDataURL(qrToken, {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#000', light: '#fff' }
      })

      // Buffer para coletar PDF
      const chunks = []
      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = 35

      // ============ HEADER COM FUNDO ============
      doc.rect(0, 0, pageWidth, 80).fill(COLORS.primary)

      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('white')
        .text('ExameQR', margin, 15)

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#cbd5e1')
        .text('Autorização Digital de Exames', margin, 45)

      doc.fontSize(8)
        .fillColor('#94a3b8')
        .text('Sistema Seguro e Criptografado', margin, 58)

      // ============ RECIBO HEADER ============
      doc.y = 95
      doc.fillColor(COLORS.text)
      doc.fontSize(11).font('Helvetica-Bold').text('RECIBO DE AUTORIZAÇÃO', margin)

      doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightText)
      doc.text(`Protocolo: #${patient.id.toString().padStart(8, '0')}`, margin)
      doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`)

      // ============ SEÇÃO PACIENTE ============
      doc.y = doc.y + 12
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary).text('DADOS DO PACIENTE')

      // Box do paciente
      const patientBoxY = doc.y + 3
      doc.rect(margin, patientBoxY, pageWidth - margin * 2, 60)
        .stroke(COLORS.border)

      doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightText)
      doc.text('NOME', margin + 10, patientBoxY + 8)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
      doc.text(patient.name, margin + 10, patientBoxY + 18)

      doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightText)
      doc.text('CPF', margin + 10, patientBoxY + 35)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
      doc.text(patient.cpf, margin + 10, patientBoxY + 45)

      doc.fontSize(8).font('Helvetica').fillColor(COLORS.lightText)
      doc.text('REGISTRADO EM', pageWidth / 2 + 10, patientBoxY + 8)
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
      doc.text(new Date(patient.created_at).toLocaleDateString('pt-BR'), pageWidth / 2 + 10, patientBoxY + 18)

      doc.y = patientBoxY + 65

      // ============ SEÇÃO EXAMES ============
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary).text('EXAMES AUTORIZADOS')

      const examsY = doc.y + 8
      const colX = { exam: margin, value: pageWidth - margin - 50 }
      const rowHeight = 22

      // Header da tabela
      doc.rect(margin, examsY - 3, pageWidth - margin * 2, rowHeight)
        .fill(COLORS.primary)

      doc.fontSize(8).font('Helvetica-Bold').fillColor('white')
      doc.text('EXAME', colX.exam + 8, examsY + 6)
      doc.text('TIPO', colX.exam + 180, examsY + 6)
      doc.text('VALOR', colX.value + 15, examsY + 6, { align: 'right' })

      // Linhas da tabela
      let total = 0
      doc.fillColor(COLORS.text)
      exams.forEach((exam, idx) => {
        const currentY = examsY + rowHeight + (idx * rowHeight)

        // Fundo alternado
        if (idx % 2 === 0) {
          doc.rect(margin, currentY - 3, pageWidth - margin * 2, rowHeight)
            .fill(COLORS.background)
        }

        // Borda inferior
        doc.strokeColor(COLORS.border).lineWidth(0.5)
        doc.moveTo(margin, currentY + rowHeight - 3)
          .lineTo(pageWidth - margin, currentY + rowHeight - 3)
          .stroke()

        // Conteúdo
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.text)
        doc.text(exam.exam_name.substring(0, 35), colX.exam + 8, currentY + 6, { width: 170 })
        doc.text(exam.exam_type || '—', colX.exam + 180, currentY + 6)

        doc.font('Helvetica-Bold').fillColor(COLORS.accent)
        doc.text(fmt(exam.value), colX.value - 5, currentY + 6, { align: 'right', width: 50 })

        total += exam.value
      })

      // Linha de TOTAL
      const totalY = examsY + rowHeight + (exams.length * rowHeight)
      doc.rect(margin, totalY - 3, pageWidth - margin * 2, rowHeight * 1.2)
        .fill(COLORS.accent)

      doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
      doc.text('TOTAL', colX.exam + 8, totalY + 8)
      doc.fontSize(11).font('Helvetica-Bold')
      doc.text(fmt(total), colX.value - 5, totalY + 5, { align: 'right', width: 50 })

      // ============ GRID QR + VALIDADE ============
      doc.y = totalY + 35

      // QR Code (esquerda)
      const qrX = margin + 20
      const qrY = doc.y
      doc.image(qrImage, qrX, qrY, { width: 120, height: 120 })

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.lightText)
      doc.text('Escaneie para validar', qrX + 5, qrY + 130, { width: 110, align: 'center' })

      // Informações de validade (direita)
      const infoX = qrX + 155
      const infoBoxWidth = pageWidth - margin - infoX

      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.success)
      doc.text('✓ INFORMAÇÕES IMPORTANTES', infoX, qrY)

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.text)
      doc.text('Validade', infoX, qrY + 16)

      const validityDate = new Date()
      validityDate.setHours(validityDate.getHours() + 72)
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary)
      doc.text(`72 horas - até ${validityDate.toLocaleString('pt-BR')}`, infoX, qrY + 24, { width: infoBoxWidth })

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.text)
      doc.text('Usos', infoX, qrY + 40)
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary)
      doc.text('Máximo de 3 utilizações', infoX, qrY + 48)

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.text)
      doc.text('Segurança', infoX, qrY + 64)
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary)
      doc.text('Dados criptografados end-to-end', infoX, qrY + 72, { width: infoBoxWidth })

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.text)
      doc.text('Transferência', infoX, qrY + 88)
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.primary)
      doc.text('Uso pessoal e não transferível', infoX, qrY + 96, { width: infoBoxWidth })

      // ============ RODAPÉ ============
      doc.moveTo(margin, pageHeight - 65).lineTo(pageWidth - margin, pageHeight - 65).stroke(COLORS.border)

      doc.fontSize(7).font('Helvetica').fillColor(COLORS.lightText)
      doc.text(
        'Este documento é um recibo oficial de autorização digital. A apresentação do QR code é obrigatória para validação. ' +
        'Os dados sensíveis são criptografados e armazenados de forma segura conforme LGPD.',
        margin, pageHeight - 58, {
          width: pageWidth - margin * 2,
          align: 'left'
        }
      )

      doc.fontSize(6).fillColor('#9ca3af')
      doc.text(`ExameQR © 2026 | Gerado em ${new Date().toLocaleString('pt-BR')} | v1.0`, margin, pageHeight - 18, {
        width: pageWidth - margin * 2,
        align: 'center'
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
