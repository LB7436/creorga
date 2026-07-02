// ─── Auto-bootstrap .env on fresh clones ────────────────────────────────────
// If backend/.env is missing (fresh GitHub clone on a new PC), copy from
// .env.example so the app starts with sane defaults (including fallback admin).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename_bootstrap = fileURLToPath(import.meta.url)
const __dirname_bootstrap = path.dirname(__filename_bootstrap)
const envPath = path.resolve(__dirname_bootstrap, '..', '.env')
const envExamplePath = path.resolve(__dirname_bootstrap, '..', '.env.example')
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath)
  // eslint-disable-next-line no-console
  console.log('[bootstrap] .env créé automatiquement depuis .env.example')
}
// Provide safe runtime defaults so the server boots even if .env is broken.
process.env.JWT_SECRET ||= 'dev-jwt-secret-creorga-change-in-production'
process.env.JWT_REFRESH_SECRET ||= 'dev-refresh-secret-creorga-change-in-production'
process.env.JWT_EXPIRES_IN ||= '15m'
process.env.JWT_REFRESH_EXPIRES_IN ||= '30'
process.env.PORT ||= '3002'
process.env.FRONTEND_URL ||= 'http://localhost:5174'
process.env.FALLBACK_ADMIN_EMAIL ||= 'admin@creorga.local'
process.env.FALLBACK_ADMIN_PASSWORD ||= 'Admin1234!'

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import logger from './lib/logger'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/auth'
import { requireCompany } from './middleware/requireCompany'
import authRoutes from './routes/auth'
import tablesRoutes from './routes/tables'
import categoriesRoutes from './routes/categories'
import productsRoutes from './routes/products'
import ordersRoutes from './routes/orders'
import statsRoutes from './routes/stats'
import companiesRoutes from './routes/companies'
import modulesRoutes from './routes/modules'
import crmRoutes from './routes/crm'
import invoicesRoutes from './routes/invoices'
import reservationsRoutes from './routes/reservations'
import inventoryRoutes from './routes/inventory'
import hrRoutes from './routes/hr'
import haccpRoutes from './routes/haccp'
import marketingRoutes from './routes/marketing'
import accountingRoutes from './routes/accounting'
import reputationRoutes from './routes/reputation'
import eventsRoutes from './routes/events'
import stripeRoutes from './routes/stripe'
import emailRoutes from './routes/email'
import paymentsRoutes from './routes/payments'
import portalConfigRoutes from './routes/portalConfig'
import floorStateRoutes from './routes/floorState'
import moduleConfigRoutes from './routes/moduleConfig'
import inventoryAIRoutes from './routes/inventory-ai'
import adsRoutes from './routes/ads'
import aiActionsRoutes from './routes/ai-actions'
import agentRoutes from './routes/agent'
import helpFeedbackRoutes from './routes/help-feedback'
import assistantRoutes from './routes/assistant'
import assistantAdvancedRoutes from './routes/assistant-advanced'
import ownerRoutes from './routes/owner'
import { auditLog } from './middleware/audit-log'
import { assertProductionSecrets, buildCorsOrigin, authLimiter, aiLimiter, publicLimiter } from './lib/security'
import { deviceOrUserAuth } from './middleware/deviceAuth'
import { initMonitoring } from './lib/monitoring'
import { startStockSyncJob } from './lib/stockStore'

// Refuse de démarrer en production avec des secrets de dev ou absents.
assertProductionSecrets()
// Sentry (no-op sans SENTRY_DSN)
initMonitoring()

const app = express()
const httpServer = createServer(app)

// CORS strict : liste blanche via ALLOWED_ORIGINS / FRONTEND_URL ;
// localhost accepté uniquement hors production.
const corsOptions = {
  origin: buildCorsOrigin(),
  credentials: true,
}

const io = new SocketServer(httpServer, { cors: corsOptions })

// v3.12 #29 — WebSocket Live channel for assistant + KPI realtime push
const liveNs = io.of('/live')
liveNs.on('connection', (socket) => {
  socket.emit('hello', { ts: Date.now(), version: 'v3.12' })
  socket.on('subscribe', (channels: string[]) => {
    channels.forEach((c) => socket.join(c))
  })
})
// Broadcast helper used by routes (assistant, floor-state, invoices, etc.)
;(globalThis as any).liveBroadcast = (channel: string, event: string, payload: any) => {
  liveNs.to(channel).emit(event, { ts: Date.now(), ...payload })
}

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
// v3.16 — bump JSON body limit pour OCR vision (images base64 ~ 1-5 MB)
app.use(express.json({ limit: '20mb' }))
app.use(cookieParser())
app.use(auditLog)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'creorga-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/tables', authenticate, tablesRoutes)
app.use('/api/categories', authenticate, categoriesRoutes)
app.use('/api/products', authenticate, productsRoutes)
// Routes partagées POS/web : token device (X-Device-Token) ou JWT utilisateur.
// Strict en production uniquement — cf. middleware/deviceAuth.
app.use('/api/orders', deviceOrUserAuth, ordersRoutes)
app.use('/api/stats', authenticate, statsRoutes)
app.use('/api/companies', authenticate, companiesRoutes)
app.use('/api/modules', authenticate, requireCompany, modulesRoutes)
app.use('/api/crm', authenticate, requireCompany, crmRoutes)
app.use('/api/invoices', authenticate, requireCompany, invoicesRoutes)
app.use('/api/reservations', authenticate, requireCompany, reservationsRoutes)
app.use('/api/inventory', authenticate, requireCompany, inventoryRoutes)
app.use('/api/hr', authenticate, requireCompany, hrRoutes)
app.use('/api/haccp', authenticate, requireCompany, haccpRoutes)
app.use('/api/marketing', authenticate, requireCompany, marketingRoutes)
app.use('/api/accounting', authenticate, requireCompany, accountingRoutes)
app.use('/api/reputation', authenticate, requireCompany, reputationRoutes)
app.use('/api/events', authenticate, requireCompany, eventsRoutes)
app.use('/api/stripe', stripeRoutes) // webhooks signés côté Stripe
app.use('/api/email', authenticate, emailRoutes)
app.use('/api/payments', deviceOrUserAuth, paymentsRoutes)
app.use('/api/portal-config', publicLimiter, portalConfigRoutes) // portail client public (QR)
app.use('/api/floor-state', deviceOrUserAuth, floorStateRoutes)
app.use('/api/module-config', deviceOrUserAuth, moduleConfigRoutes)
// Mounted on /api/inventory-ocr to avoid clash with the auth-protected /api/inventory
app.use('/api/inventory-ocr', authenticate, inventoryAIRoutes)
app.use('/api/ads', authenticate, adsRoutes)
app.use('/api/ai', authenticate, aiLimiter, aiActionsRoutes)
app.use('/api/agent', authenticate, aiLimiter, agentRoutes)
app.use('/api/help/feedback', helpFeedbackRoutes)
app.use('/api/owner', authenticate, ownerRoutes)
// v3.9 — assistantRoutes MUST be before agentRoutes to take precedence on /intent
app.use('/api/agent', authenticate, aiLimiter, assistantRoutes)
app.use('/api/agent', authenticate, aiLimiter, assistantAdvancedRoutes)

// Error handler
app.use(errorHandler)

// Socket.io
io.on('connection', (socket) => {
  logger.info(`Client connecté: ${socket.id}`)

  socket.on('disconnect', () => {
    logger.info(`Client déconnecté: ${socket.id}`)
  })
})

// Export io pour utilisation dans les routes
export { io }

// Start
const PORT = parseInt(process.env.PORT || '3002', 10)
httpServer.listen(PORT, () => {
  logger.info(`Serveur Creorga démarré sur http://localhost:${PORT}`)
  logger.info(`Environnement: ${process.env.NODE_ENV || 'development'}`)
  // Réplication stock JSON → Prisma Ingredient (no-op si DB indisponible)
  startStockSyncJob()
  // Janitor : auto-close any table session opened > 8h sans encaissement
  import('./jobs/closeStaleFloorSessions').then(({ startStaleSessionJanitor }) => {
    startStaleSessionJanitor()
    logger.info('[janitor] auto-close stale floor sessions activé (toutes les 30 min, > 8h)')
  }).catch((e) => logger.warn('[janitor] non démarré:', e?.message))

  // v3.19 F1 — Scheduler (rappels + tâches planifiées, check toutes les 60s)
  import('./jobs/scheduler').then(({ startScheduler }) => {
    startScheduler()
    logger.info('[scheduler] rappels + tâches planifiées activés (check 60s)')
  }).catch((e) => logger.warn('[scheduler] non démarré:', e?.message))

  // v3.19 F3 — Proactive worker (scan anomalies toutes les 10 min)
  import('./jobs/proactive-worker').then(({ startProactiveWorker }) => {
    startProactiveWorker()
    logger.info('[proactive] worker démarré — alertes auto (10 min)')
  }).catch((e) => logger.warn('[proactive] non démarré:', e?.message))

  // v4.6 — Détecteur de doublons clients (scan toutes les 24h)
  import('./jobs/duplicate-detector').then(({ startDuplicateDetector }) => {
    startDuplicateDetector()
    logger.info('[duplicate-detector] worker démarré — scan customers.json (24h)')
  }).catch((e) => logger.warn('[duplicate-detector] non démarré:', e?.message))
})
