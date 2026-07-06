import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const fmt = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value)

export async function generateReceipt(patient, exams, qrToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      })

      // Gerar QR code como imagem
      const qrImage = await QRCode.toDataURL(qrToken, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H'
      })

      // Buffer para coletar PDF
      const chunks = []
      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ============ CABEÇALHO ============
      doc.fontSize(24).font('Helvetica-Bold').text('ExameQR', { align: 'center' })
      doc.fontSize(10).font('Helvetica').text('Sistema de Autorização Digital de Exames', { align: 'center' })
      doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke()
      doc.moveDown(0.5)

      // ============ INFO DO RECIBO ============
      doc.fontSize(9).font('Helvetica-Bold').text('RECIBO DE AUTORIZAÇÃO', { align: 'center' })
      doc.fontSize(8).font('Helvetica').text(`Protocolo #${patient.id} | Emitido em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
      doc.moveDown(1)

      // ============ DADOS DO PACIENTE ============
      doc.fontSize(10).font('Helvetica-Bold').text('PACIENTE')
      doc.rect(40, doc.y, 515, 50).stroke()
      doc.fontSize(9).font('Helvetica')

      const startY = doc.y + 5
      doc.text(`Nome: ${patient.name}`, 50, startY)
      doc.text(`CPF: ${patient.cpf}`, 50, startY + 15)
      doc.text(`Registrado em: ${new Date(patient.created_at).toLocaleDateString('pt-BR')}`, 50, startY + 30)

      doc.y = startY + 50
      doc.moveDown(0.5)

      // ============ TABELA DE EXAMES ============
      doc.fontSize(10).font('Helvetica-Bold').text('EXAMES AUTORIZADOS')
      doc.moveDown(0.3)

      // Cabeçalho da tabela
      const colX = { exam: 50, type: 280, value: 450 }
      const rowHeight = 20
      const tableY = doc.y

      doc.rect(40, tableY - 3, 515, rowHeight).fill('#1f2937').stroke()
      doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
      doc.text('Exame', colX.exam, tableY + 5)
      doc.text('Tipo', colX.type, tableY + 5)
      doc.text('Valor', colX.value, tableY + 5)

      doc.fillColor('black')
      doc.y = tableY + rowHeight

      // Linhas da tabela
      let total = 0
      exams.forEach((exam, idx) => {
        const currentY = doc.y

        // Alternating background
        if (idx % 2 === 0) {
          doc.rect(40, currentY - 2, 515, rowHeight).fill('#f9fafb').stroke()
          doc.fillColor('black')
        } else {
          doc.rect(40, currentY - 2, 515, rowHeight).stroke()
        }

        doc.fontSize(8).font('Helvetica')
        doc.text(exam.exam_name, colX.exam, currentY + 5, { width: 200 })
        doc.text(exam.exam_type || '—', colX.type, currentY + 5, { width: 150 })
        doc.font('Helvetica-Bold').text(fmt(exam.value), colX.value, currentY + 5, { align: 'right', width: 80 })

        total += exam.value
        doc.y = currentY + rowHeight
      })

      // Linha de total
      doc.rect(40, doc.y - 2, 515, rowHeight).fill('#e5e7eb').stroke()
      doc.fontSize(10).font('Helvetica-Bold').fillColor('black')
      doc.text('TOTAL', colX.exam, doc.y + 5)
      doc.text(fmt(total), colX.value, doc.y + 5, { align: 'right', width: 80 })
      doc.moveDown(1.5)

      // ============ QR CODE ============
      doc.fontSize(10).font('Helvetica-Bold').text('CÓDIGO DE VERIFICAÇÃO')
      doc.moveDown(0.3)

      const qrY = doc.y
      const qrX = 200
      doc.image(qrImage, qrX, qrY, { width: 100, height: 100 })

      doc.fontSize(8).font('Helvetica').fillColor('#666')
      doc.text('Escaneie para validar', qrX - 20, qrY + 110, { width: 140, align: 'center' })

      doc.y = qrY + 110
      doc.moveDown(0.5)

      // ============ INFORMAÇÕES DE SEGURANÇA ============
      doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke()
      doc.moveDown(0.5)

      doc.fontSize(9).font('Helvetica-Bold').fillColor('black').text('VALIDADE E SEGURANÇA')
      doc.fontSize(8).font('Helvetica').fillColor('#666')

      const validityDate = new Date()
      validityDate.setHours(validityDate.getHours() + 72)

      doc.text(`✓ Válido por 72 horas até ${validityDate.toLocaleString('pt-BR')}`, 50, doc.y)
      doc.text(`✓ Máximo de 3 utilizações`, 50, doc.y + 15)
      doc.text(`✓ Dados criptografados e verificados`, 50, doc.y + 30)
      doc.text(`✓ Uso não transferível`, 50, doc.y + 45)

      doc.moveDown(3)

      // ============ RODAPÉ ============
      doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke()
      doc.moveDown(0.5)

      doc.fontSize(7).fillColor('#999').text(
        'Este documento é um recibo de autorização digital. ' +
        'A apresentação do QR code é obrigatória para validação de exames. ' +
        'ExameQR © 2026 - Sistema Seguro de Autorização de Exames',
        40, doc.y,
        { align: 'center', width: 515 }
      )

      doc.fontSize(6).text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
