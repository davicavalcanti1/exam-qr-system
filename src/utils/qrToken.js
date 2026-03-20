import crypto from 'crypto'

const SECRET = process.env.QR_SECRET || 'examsys-secret-MUDE-EM-PRODUCAO'
const PREFIX = 'EXAMSYS_V1'

export function generateQRToken(qrId, patientId) {
  const payload = {
    qid: qrId,
    pid: patientId,
    ts: Date.now(),
    n: crypto.randomBytes(8).toString('hex')
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('hex')
  return `${PREFIX}:${payloadB64}.${signature}`
}

export function verifyQRToken(token) {
  if (!token || !token.startsWith(`${PREFIX}:`)) return null

  const data = token.slice(PREFIX.length + 1)
  const dotIndex = data.lastIndexOf('.')
  if (dotIndex === -1) return null

  const payloadB64 = data.slice(0, dotIndex)
  const signature = data.slice(dotIndex + 1)

  const expectedSig = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('hex')

  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSig, 'hex')
    if (sigBuffer.length !== expectedBuffer.length) return null
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}
