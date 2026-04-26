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

const app = express()
const httpServer = createServer(app)

// Accept any localhost origin in dev so all 5 front apps (5174-5178) + POS (5175)
// can talk to the backend without CORS issues.
const ALLOWED_ORIGINS = [
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
  'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178',
  process.env.FRONTEND_URL || 'http://localhost:5174',
]

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    // Allow no-origin requests (curl, server-side) and any localhost in dev.
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return cb(null, true)
    }
    cb(null, true) // permissive in dev
  },
  credentials: true,
}

const io = new SocketServer(httpServer, { cors: corsOptions })

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'creorga-api', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tables', tablesRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/companies', companiesRoutes)
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
app.use('/api/stripe', stripeRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/portal-config', portalConfigRoutes)
app.use('/api/floor-state', floorStateRoutes)
app.use('/api/module-config', moduleConfigRoutes)
// Mounted on /api/inventory-ocr to avoid clash with the auth-protected /api/inventory
app.use('/api/inventory-ocr', inventoryAIRoutes)

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
})
