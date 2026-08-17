import 'dotenv/config'
import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import netrisRouter from './integrations/netris/routes.js'
import feegowRouter from './integrations/feegow/routes.js'
import adminRouter from './routes/admin.js'
import qrRouter from './routes/qr.js'
import integracaoRouter from './routes/integracao.js'
import autorizacaoRouter from './routes/autorizacao.js'
import nfseRouter from './routes/nfse.js'

// ── Rotas legadas do MVP (SQLite) desativadas ────────────────────────────────
// O sistema v2 usa Supabase Auth + RLS direto no frontend e apenas os endpoints
// de service-role abaixo. Os routers antigos (auth/clinic/patients/qrcodes/
// scanner/payments/profile) e o initDB do better-sqlite3 ficam fora do ar.
// Para reativar algum, reimporte o router e remonte a linha app.use(...).

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Auth: ${req.headers.authorization ? '✓' : '✗'}`)
  next()
})

app.use('/api/admin', adminRouter)   // criação da hierarquia (service role)
app.use('/api/qr', qrRouter)         // gerar/validar QR do exame
app.use('/api/integracao', integracaoRouter) // método de agendamento por empresa
app.use('/api/netris', netrisRouter) // integração NetRis (agendamento futuro)
app.use('/api/feegow', feegowRouter) // integração Feegow (mesma interface do NetRis)
app.use('/api/autorizacao', autorizacaoRouter) // lote de autorização por link público
app.use('/api/nfse', nfseRouter)     // emissão de NFS-e (Focus NFe) — v2

const frontendDist = path.join(__dirname, '../frontend/dist')
const frontendBuilt = fs.existsSync(path.join(frontendDist, 'index.html'))

if (!frontendBuilt) {
  console.warn('⚠️  frontend/dist não encontrado. Execute: npm run build')
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.status(503).send('<h2>Frontend não buildado.</h2><p>Execute <code>npm run build</code> e reinicie.</p>')
  })
} else {
  // Raiz (/) = landing page de apresentação. O sistema vive em /entrar, /painel, /scan.
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDist, 'landing.html'))
  })
  app.use(express.static(frontendDist, { index: false }))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`)
})
