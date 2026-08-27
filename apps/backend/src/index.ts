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
// Provide safe runtime defaults so the server boots even if .env is broken —
// mais jamais en production, où un secret par défaut permettrait de forger des tokens.
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('[FATAL] JWT_SECRET / JWT_REFRESH_SECRET manquant(s) en production — arrêt.')
    process.exit(1)
  }
  process.env.JWT_SECRET ||= 'dev-jwt-secret-creorga-change-in-production'
  process.env.JWT_REFRESH_SECRET ||= 'dev-refresh-secret-creorga-change-in-production'
}
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
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import logger from './lib/logger'
import prisma from './lib/prisma'
import { listFullBackups } from './jobs/backup-worker'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/auth'
import { requireCompany, requireRole } from './middleware/requireCompany'
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
import rapportsCaisseRoutes from './routes/rapports-caisse'
import reputationRoutes from './routes/reputation'
import eventsRoutes from './routes/events'
import stripeRoutes, { stripeWebhook } from './routes/stripe'
import emailRoutes from './routes/email'
import paymentsRoutes from './routes/payments'
import portalConfigRoutes from './routes/portalConfig'
import floorStateRoutes, { floorCompanyContext } from './routes/floorState'
import moduleConfigRoutes from './routes/moduleConfig'
import adsRoutes, { liveAdsPublicRouter } from './routes/ads'
import affichageRoutes, { mediasPublicRouter, maintenantPublicRouter } from './routes/affichage'
import rhDossierRoutes from './routes/rh-dossier'
import aiActionsRoutes from './routes/ai-actions'
import agentRoutes from './routes/agent'
import helpFeedbackRoutes from './routes/help-feedback'
import assistantRoutes from './routes/assistant'
import assistantAdvancedRoutes from './routes/assistant-advanced'
import ownerRoutes from './routes/owner'
import gameScoresRoutes from './routes/gameScores'
import guestRoutes from './routes/guest'
import { auditLog } from './middleware/audit-log'
import { assertProductionSecrets, buildCorsOrigin, authLimiter, aiLimiter, publicLimiter, creatorAuthLimiter } from './lib/security'
import { deviceOrUserAuth } from './middleware/deviceAuth'
import { initMonitoring } from './lib/monitoring'
import { startStockSyncJob } from './lib/stockStore'
import creatorAuthRoutes from './routes/creator/auth'
import creatorDonneesRoutes from './routes/creator/donnees'
import creatorOpportunitesRoutes from './routes/creator/opportunites'
import { creatorConfigure } from './lib/creatorSecurity'
import { brancherVidageArret } from './lib/eventSink'
import { ErrorLogTransport } from './lib/errorLogTransport'

// Refuse de démarrer en production avec des secrets de dev ou absents.
assertProductionSecrets()
// Sentry (no-op sans SENTRY_DSN)
initMonitoring()

const app = express()

// Un seul intermédiaire devant nous : Caddy, sur la même machine.
// Sans ce réglage, express-rate-limit voit l'IP de Caddy (127.0.0.1) pour
// TOUT LE MONDE : soit un seul visiteur bloque le site entier, soit la limite
// ne protège plus rien. L'avertissement était journalisé depuis le 8 août.
// Valeur `1` et non `true` : `true` reviendrait à croire n'importe quel
// X-Forwarded-For envoyé par le client, donc à laisser contourner la limite.
app.set('trust proxy', 1)

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
  socket.on('subscribe', (channels: unknown) => {
    if (!Array.isArray(channels)) return
    // Ce namespace est public pour le suivi QR. Seuls les canaux publics,
    // bornés et cloisonnés par société peuvent être rejoints. Les boîtes
    // internes (`inbox-*`, etc.) restent accessibles uniquement par API JWT.
    const publicChannel = /^(?:table-[a-zA-Z0-9_-]{1,100}-[\w .-]{1,40}|games-[a-zA-Z0-9_-]{1,100}|floor-[a-zA-Z0-9_-]{1,100})$/
    channels.slice(0, 10).forEach((channel) => {
      if (typeof channel === 'string' && publicChannel.test(channel)) socket.join(channel)
    })
  })
})
// Broadcast helper used by routes (assistant, floor-state, invoices, etc.)
;(globalThis as any).liveBroadcast = (channel: string, event: string, payload: any) => {
  liveNs.to(channel).emit(event, { ts: Date.now(), ...payload })
}

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
// Compression gzip/deflate des réponses. Le catalogue produits, la liste des
// commandes et le plan de salle partaient bruts : c'est du JSON très répétitif,
// donc très compressible, et la caisse tourne sur une tablette en Wi-Fi.
app.use(compression({
  filter: (req, res) => {
    // L'assistant (routes/agent.ts) répond en flux SSE, morceau par morceau.
    // Compressé, chaque morceau resterait dans le tampon jusqu'à la fin de la
    // réponse : la réponse s'afficherait d'un bloc au lieu de s'écrire au fil
    // de l'eau, et un flux long paraîtrait figé.
    const type = String(res.getHeader('Content-Type') || '')
    if (type.includes('text/event-stream')) return false
    return compression.filter(req, res)
  },
}))
// v3.16 — bump JSON body limit pour OCR vision (images base64 ~ 1-5 MB)
// v4.7 — Body limit ciblé : 20mb réservé aux routes qui reçoivent des images
// base64 (OCR/vision), 1mb pour tout le reste. body-parser marque req._body
// après un premier parse et skip un second passage, donc l'ordre ici fait foi.
const LARGE_BODY_PATHS = ['/api/agent', '/api/floor-state', '/api/inventory-ocr']
// v5.0 — Webhook Stripe : corps BRUT (la signature se vérifie sur les octets
// exacts) et hors `authenticate` (Stripe n'a pas de JWT). Doit précéder
// express.json(), qui marquerait le corps comme déjà lu.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook)
app.use(LARGE_BODY_PATHS, express.json({ limit: '20mb' }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(auditLog)

// Health check
/**
 * Contrôle de santé réel.
 *
 * L'ancienne version répondait toujours « ok » : même base morte, un moniteur
 * externe aurait vu vert pendant que la caisse et le back-office renvoyaient
 * des 503. On sonde donc PostgreSQL et on expose l'âge de la dernière
 * sauvegarde, puis on renvoie 503 si la base est injoignable — c'est ce qui
 * rend une surveillance externe (UptimeRobot) réellement utile.
 */
app.get('/api/health', async (_req, res) => {
  const base: Record<string, unknown> = {
    service: 'creorga-api',
    timestamp: new Date().toISOString(),
  }

  let baseDeDonnees = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (e: any) {
    baseDeDonnees = 'injoignable'
    logger.error(`[health] PostgreSQL injoignable: ${e?.message || e}`)
  }

  try {
    const derniere = listFullBackups()[0]
    base.derniereSauvegarde = derniere
      ? { fichier: derniere.filename, ageHeures: Math.round((Date.now() - derniere.createdAt) / 3_600_000) }
      : null
  } catch {
    base.derniereSauvegarde = null
  }

  const ok = baseDeDonnees === 'ok'
  res.status(ok ? 200 : 503).json({ ...base, status: ok ? 'ok' : 'degraded', baseDeDonnees })
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
// Dossier employé : fiche RH, notes, contrats et fiches de paie.
// Données personnelles — jamais de route publique ici, contrairement aux
// médias de l'affichage TV.
app.use('/api/hr-dossier', authenticate, requireCompany, rhDossierRoutes)
app.use('/api/haccp', authenticate, requireCompany, haccpRoutes)
app.use('/api/marketing', authenticate, requireCompany, marketingRoutes)
app.use('/api/accounting', authenticate, requireCompany, accountingRoutes)
// Extraits de caisse : chiffre d'affaires de l'établissement. Réservé au
// propriétaire — un serveur n'a pas à voir les recettes ni les totaux TVA.
app.use('/api/rapports-caisse', authenticate, requireCompany, requireRole('OWNER'), rapportsCaisseRoutes)
app.use('/api/reputation', authenticate, requireCompany, reputationRoutes)
app.use('/api/events', authenticate, requireCompany, eventsRoutes)
// Auth exigée : les routes Stripe (ouverture de portail, annulation
// d'abonnement, lecture client) étaient montées en accès public — IDOR de
// facturation. Le webhook n'est pas utilisé en prod (clé mock, handlers no-op).
app.use('/api/stripe', authenticate, stripeRoutes)
app.use('/api/email', authenticate, requireCompany, requireRole('OWNER', 'MANAGER'), emailRoutes)
app.use('/api/payments', deviceOrUserAuth, paymentsRoutes)
// Le portail client reste public pour les lectures QR et l'inscription client,
// mais sa configuration et son journal d'événements sont des données de gestion.
// Les laisser derrière le seul rate-limit permettait à un visiteur anonyme de
// changer le branding, désactiver les jeux ou lire les événements des tables.
function portalConfigManagementGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  const path = req.path
  const protectedRoute =
    req.method === 'PUT' ||
    req.method === 'PATCH' ||
    (req.method === 'POST' && path === '/reset') ||
    (req.method === 'GET' && path === '/client-events')

  if (!protectedRoute) {
    next()
    return
  }

  authenticate(req, res, () => {
    requireCompany(req, res, () => {
      requireRole('OWNER')(req, res, next)
    })
  })
}

app.use('/api/portal-config', publicLimiter, portalConfigManagementGuard, portalConfigRoutes) // portail client public (QR)
app.use('/api/game-scores', publicLimiter, gameScoresRoutes) // scores jeux guest (public)
app.use('/api/guest', publicLimiter, guestRoutes) // suivi commande, appel serveur, paiement (public)
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorStateRoutes)
// L'ancien pont caisse → stock et l'ancien OCR s'appuyaient sur un fichier
// partagé par toutes les entreprises. Ils restent fermés jusqu'à leur migration
// vers les tables Prisma multi-locataires.
const inventoryUnavailable = (_req: express.Request, res: express.Response) => {
  res.status(503).json({
    code: 'INVENTORY_MIGRATION_REQUIRED',
    message: "L'inventaire est temporairement indisponible pendant sa migration sécurisée par entreprise.",
  })
}
app.use('/api/stock-ventes', deviceOrUserAuth, requireCompany, inventoryUnavailable)
app.use('/api/module-config', deviceOrUserAuth, requireCompany, moduleConfigRoutes)
app.use('/api/inventory-ocr', authenticate, requireCompany, inventoryUnavailable)
app.use('/api/ads', liveAdsPublicRouter)
app.use('/api/ads', authenticate, requireCompany, adsRoutes)
// Programmation de l'affichage TV : médiathèque, séquences, grille horaire.
// AVANT la version authentifiée : Express résout dans l'ordre d'enregistrement.
// `/ads/tv` est la page ouverte sur la télévision de la salle, sans session —
// derrière `authenticate` elle recevait un 401 et l'écran restait vide.
app.use('/api/affichage', maintenantPublicRouter)
app.use('/api/affichage', authenticate, requireCompany, affichageRoutes)
// Service des fichiers médias — volontairement PUBLIC : <img> et <video>
// n'envoient pas d'en-tête Authorization. L'identifiant de 128 bits tiré au
// sort fait office de jeton, et il s'agit de visuels destinés à être projetés
// en salle, pas de données personnelles.
app.use('/api/media-affichage', mediasPublicRouter)
app.use('/api/ai', authenticate, aiLimiter, aiActionsRoutes)
app.use('/api/agent', authenticate, requireCompany, floorCompanyContext, aiLimiter, agentRoutes)
app.use('/api/help/feedback', helpFeedbackRoutes)
// Rôle OWNER exigé : journal d'audit global (avec mots de passe) et purge RGPD
// destructive étaient ouverts à tout membre. Sauvegardes intégrales idem.
app.use('/api/owner', authenticate, requireCompany, requireRole('OWNER'), ownerRoutes)
app.use('/api/backup', authenticate, requireCompany, requireRole('OWNER'), (_req, res) => {
  res.status(503).json({
    code: 'COMPANY_BACKUP_MIGRATION_REQUIRED',
    message: "Les exports et restaurations sont temporairement indisponibles jusqu'à leur isolation par entreprise.",
  })
})
// v3.9 — assistantRoutes MUST be before agentRoutes to take precedence on /intent
app.use('/api/agent', authenticate, requireCompany, floorCompanyContext, aiLimiter, assistantRoutes)
app.use('/api/agent', authenticate, requireCompany, floorCompanyContext, aiLimiter, assistantAdvancedRoutes)

// Console créateur — auth totalement disjointe des comptes sociétés : jamais
// authenticate ni requireCompany ici. En production, la console n'est montée
// que si ses secrets dédiés sont posés (l'app clients démarre quand même).
if (creatorConfigure()) {
  app.use('/api/creator/auth', creatorAuthLimiter, creatorAuthRoutes)
  app.use('/api/creator', creatorDonneesRoutes)
  app.use('/api/creator', creatorOpportunitesRoutes)
} else {
  logger.warn('[creator] CREATOR_JWT_SECRET / CREATOR_TOTP_KEY absents — console créateur non montée')
}

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

  // L'ancien planificateur utilisait un unique scheduled-tasks.json et un
  // canal « inbox » commun. Il reste fermé tant que les tâches ne portent pas
  // une entreprise et que leur diffusion n'est pas cloisonnée.
  logger.info('[scheduler] worker désactivé — migration multi-locataire requise')

  // L'ancien worker proactif lisait des fichiers JSON globaux (stock,
  // factures, équipe et avis) puis diffusait les alertes à tous les clients.
  // Il est volontairement désactivé tant que ses lectures ne sont pas
  // intégralement filtrées par entreprise.
  logger.info('[proactive] worker désactivé — migration multi-locataire requise')

  // Même règle pour le détecteur historique : customers.json n'est pas une
  // source multi-locataire et ne doit plus produire de notifications.
  logger.info('[duplicate-detector] worker désactivé — migration Prisma par entreprise requise')

  // v4.7 — Sauvegarde ZIP complète de data/ (60s après boot, puis toutes les 6h)
  import('./jobs/backup-worker').then(({ startBackupWorker }) => {
    startBackupWorker()
    logger.info('[backup] worker démarré — snapshot complet data/ (6h)')
  }).catch((e) => logger.warn('[backup] non démarré:', e?.message))

  // Console créateur — rétention RGPD des événements (5 min après boot, puis 24h)
  import('./jobs/creator-retention').then(({ startCreatorRetention }) => {
    startCreatorRetention()
    logger.info('[creator-retention] purge quotidienne activée (ActivityEvent 90j, LoginEvent 180j, ErrorLog 30j)')
  }).catch((e) => logger.warn('[creator-retention] non démarré:', e?.message))

  // Console créateur — snapshot quotidien par société (2 min après boot, puis 1h, idempotent)
  import('./jobs/creator-metrics').then(({ startCreatorMetrics }) => {
    startCreatorMetrics()
    logger.info('[creator-metrics] snapshot quotidien par société activé (1h, upsert J-1)')
  }).catch((e) => logger.warn('[creator-metrics] non démarré:', e?.message))

  // Console créateur — moteur d'opportunités (10 min après boot, puis 24h ;
  // CREATOR_ENGINE_ENABLED=1 requis en production)
  import('./jobs/opportunity-engine').then(({ startOpportunityEngine }) => {
    startOpportunityEngine()
  }).catch((e) => logger.warn('[opportunites] non démarré:', e?.message))
})

// Console créateur — collecte : toute erreur logger.error() part aussi en base,
// et l'arrêt du service vide le tampon d'événements (2 dernières secondes).
logger.add(new ErrorLogTransport())
brancherVidageArret()
