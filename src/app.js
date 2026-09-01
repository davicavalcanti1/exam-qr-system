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
import ssoRouter from './routes/sso.js'
import ssoAdminRouter from './routes/sso-admin.js'
import zapsignRouter from './integrations/zapsign/routes.js'
import asaasRouter from './integrations/asaas/routes.js'

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

// Alguns caminhos carregam o segredo NO PRÓPRIO path (é assim que o webhook do
// ZapSign se autentica, e é assim que o parceiro abre o lote de autorização).
// Logar o path cru publicaria esses segredos no stdout — e o stdout vai para o
// log do EasyPanel, que muita gente enxerga.
const SEGREDO_NO_PATH = [
  /^\/api\/zapsign\/webhook\//,
  /^\/api\/asaas\/webhook\//,
  /^\/scan-parceiros-api\/asaas\/webhook\//,
  /^\/api\/autorizacao\/(?!lotes)[^/]+/,
]
function caminhoSeguro(p) {
  for (const re of SEGREDO_NO_PATH) {
    if (re.test(p)) return p.replace(/[^/]{8,}/g, m => `${m.slice(0, 4)}…(${m.length})`)
  }
  return p
}

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${caminhoSeguro(req.path)} - Auth: ${req.headers.authorization ? '✓' : '✗'}`)
  next()
})

app.use('/scan-parceiros-api/admin', adminRouter)
app.use('/api/admin', adminRouter)   // criação da hierarquia (service role)
app.use('/scan-parceiros-api/qr', qrRouter)
app.use('/api/qr', qrRouter)         // gerar/validar QR do exame
app.use('/scan-parceiros-api/integracao', integracaoRouter)
app.use('/api/integracao', integracaoRouter) // método de agendamento por empresa
app.use('/scan-parceiros-api/netris', netrisRouter)
app.use('/api/netris', netrisRouter) // integração NetRis (agendamento futuro)
app.use('/scan-parceiros-api/feegow', feegowRouter)
app.use('/api/feegow', feegowRouter) // integração Feegow (mesma interface do NetRis)
app.use('/scan-parceiros-api/autorizacao', autorizacaoRouter)
app.use('/api/autorizacao', autorizacaoRouter) // lote de autorização por link público
app.use('/scan-parceiros-api/zapsign', zapsignRouter)
app.use('/api/zapsign', zapsignRouter) // assinatura eletrônica de contrato e DPA
app.use('/scan-parceiros-api/asaas', asaasRouter)
app.use('/api/asaas', asaasRouter)   // cobrança automática do lote (PIX/boleto)
app.use('/scan-parceiros-api/sso', ssoRouter)
app.use('/api/sso', ssoRouter)         // consumo do ticket vindo do Controle Operacional
app.use('/scan-parceiros-api/sso-admin', ssoAdminRouter)
app.use('/api/sso-admin', ssoAdminRouter) // gestao do SSO (owner): tenants e mapa de papeis

const frontendDist = path.join(__dirname, '../frontend/dist')
const frontendBuilt = fs.existsSync(path.join(frontendDist, 'index.html'))

if (!frontendBuilt) {
  console.warn('⚠️  frontend/dist não encontrado. Execute: npm run build')
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/scan-parceiros-api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.status(503).send('<h2>Frontend não buildado.</h2><p>Execute <code>npm run build</code> e reinicie.</p>')
  })
} else {
  // Raiz (/) = landing page de apresentação. O sistema vive em /entrar, /painel, /scan.
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDist, 'landing.html'))
  })
  // Assets primeiro, com cache longo: o nome tem hash, então são imutáveis por
  // construção. Sem isto o navegador revalida cada arquivo em cada abertura.
  const assetsDir = path.join(frontendDist, 'assets')
  const cacheImutavel = { maxAge: '1y', immutable: true }
  app.use('/scan-parceiros-app/assets', express.static(assetsDir, cacheImutavel))
  app.use('/assets', express.static(assetsDir, cacheImutavel))

  // `/scan-parceiros-app` é onde o Controle Operacional encontra este módulo (ver
  // ADR 0003). A raiz continua servindo o host próprio.
  app.use('/scan-parceiros-app', express.static(frontendDist, { index: false, redirect: false }))
  app.use(express.static(frontendDist, { index: false }))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/scan-parceiros-api/')) return res.status(404).json({ error: 'Rota não encontrada' })
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`)
})
