import 'dotenv/config'
import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initDB } from './database/db.js'
import authRouter from './routes/auth.js'
import clinicRouter from './routes/clinic.js'
import patientsRouter from './routes/patients.js'
import qrcodesRouter from './routes/qrcodes.js'
import scannerRouter from './routes/scanner.js'
import paymentsRouter from './routes/payments.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/clinic', clinicRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/qrcodes', qrcodesRouter)
app.use('/api/scanner', scannerRouter)
app.use('/api/payments', paymentsRouter)

const frontendDist = path.join(__dirname, '../frontend/dist')
const frontendBuilt = fs.existsSync(path.join(frontendDist, 'index.html'))

if (!frontendBuilt) {
  console.warn('⚠️  frontend/dist não encontrado. Execute: npm run build')
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.status(503).send('<h2>Frontend não buildado.</h2><p>Execute <code>npm run build</code> e reinicie.</p>')
  })
} else {
  app.use(express.static(frontendDist))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

initDB()
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`)
})
