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

const app = express()
const httpServer = createServer(app)

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true,
  },
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
}))
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
