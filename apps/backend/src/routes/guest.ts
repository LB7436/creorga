import { Router, type Request, type Response } from 'express'
import path from 'path'
import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { resolveGuestTable } from '../lib/guest-tables'
import { GuestAccessError, lockGuestTable, requireGuestAccess } from '../lib/guest-visits'
import { totalsFromTtc } from '../lib/money'
import { orderPaymentBalance } from '../lib/order-tenders'
import { lockFinancialCompany } from '../lib/financial-lock'
import { PosError } from '../lib/pos-ledger'
import { createTablePayment, reconcilePayment, merchantFor, PaymentError } from '../lib/payments/ledger'

/**
 * Endpoints du portail client (le convive scanne le QR, sans compte) :
 * suivi de commande, appel serveur/addition, paiement à table.
 * Montés en public (rate-limité) — donc **rien de ce que le navigateur envoie
 * n'est cru** :
 *  - `POST /orders` recalcule chaque ligne depuis les produits en base
 *    (le `price` reçu est ignoré) et refuse tout produit inconnu, inactif ou
 *    d'une autre enseigne ; sans base, on refuse (503) plutôt que d'enregistrer
 *    une commande à prix inventés ;
 *  - `POST /pay` facture le montant calculé par le serveur pour les commandes
 *    non réglées de la table (le `total` reçu est ignoré) ;
 *  - `POST /paid-confirm` vérifie la session auprès de Stripe, exige qu'elle
 *    ait été émise pour cette table, et n'avertit le personnel qu'une fois ;
 *  - `PATCH /orders/:id/status` est réservé au personnel (jeton d'appareil ou
 *    utilisateur) : un client ne passe pas lui-même sa commande « en route ».
 */

const DATA_DIR = path.resolve(process.cwd(), 'data')
const ORDERS_FILE = path.join(DATA_DIR, 'guest-orders.json')
const NOTIFS_FILE = path.join(DATA_DIR, 'proactive-notifs.json')

/** Fenêtre d'une visite : au-delà, une commande impayée n'est plus rattachée à l'addition courante. */
const MAX_LIGNES = 50
const MAX_QTE = 50

type OrderStatus = 'received' | 'preparing' | 'on_the_way'

interface GuestOrderItem {
  productId: string
  name: string
  qty: number
  /** Prix unitaire SERVEUR (base produits), jamais celui du navigateur. */
  price: number
}

export interface GuestOrder {
  id: string
  /** Enseigne déduite des produits commandés. Absent sur les anciennes entrées. */
  companyId?: string
  guestVisitId?: string | null
  tableId: string
  items: GuestOrderItem[]
  total: number
  status: OrderStatus
  paid?: boolean
  paidAt?: number
  stripeSessionId?: string
  createdAt: number
  updatedAt: number
}

const router = Router()
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  // Staff access remains authenticated; an invalid staff header never becomes a guest privilege.
  if (!req.headers.authorization && !req.headers['x-device-token']) return next()
  deviceOrUserAuth(req, res, () => requireCompany(req, res, () => {
    const context = req as any
    if (!context.device && !['OWNER', 'MANAGER', 'EMPLOYEE', 'WAITER', 'CASHIER'].includes(context.role)) {
      res.status(403).json({ error: 'Accès au service réservé au personnel habilité.' }); return
    }
    context.guestStaff = true
    next()
  }))
})
const visitToken = (req: Request) => typeof req.headers['x-guest-access'] === 'string' ? req.headers['x-guest-access'] : undefined
async function guestScope(req: Request, companyId: string, tableId?: string, db: any = prisma) {
  if ((req as any).guestStaff) {
    if ((req as any).companyId !== companyId) throw new GuestAccessError(403, 'Accès refusé à cet établissement.')
    return null
  }
  return requireGuestAccess(companyId, visitToken(req), tableId, db)
}
function returnCookieName(attemptId: string) { return 'creorga_return_' + attemptId }
function setPaymentReturn(req: Request, res: Response, companyId: string, attemptId: string) {
  const token = jwt.sign({ purpose: 'guest-payment-return', companyId, attemptId }, process.env.JWT_SECRET!, {
    expiresIn: '12h', audience: 'creorga-guest-payment', issuer: 'creorga',
  })
  const hostname = req.hostname
  res.cookie(returnCookieName(attemptId), token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname),
    sameSite: 'lax', path: '/api/guest/paid-confirm', maxAge: 12 * 3600_000 })
}
function hasPaymentReturn(req: Request, companyId: string, attemptId: string) {
  try {
    // cookie-parser is installed by the application. Tests may provide the raw Cookie header.
    const name = returnCookieName(attemptId)
    const cookie = req.cookies?.[name] || req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1)
    if (!cookie) return false
    const data = jwt.verify(decodeURIComponent(cookie), process.env.JWT_SECRET!, { audience: 'creorga-guest-payment', issuer: 'creorga' }) as jwt.JwtPayload
    return data.purpose === 'guest-payment-return' && data.companyId === companyId && data.attemptId === attemptId
  } catch { return false }
}
const asyncRoute = (handler: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await handler(req, res) }
  catch (error) {
    if (!(error instanceof GuestAccessError)) logger.error('[guest] opération non confirmée', { code: error instanceof PaymentError || error instanceof PosError ? error.status : 'GUEST_OPERATION_FAILED' })
    if (!res.headersSent) res.status(error instanceof PosError || error instanceof PaymentError || error instanceof GuestAccessError ? error.status : 503).json({ error: error instanceof PosError || error instanceof PaymentError || error instanceof GuestAccessError ? error.message : 'Le serveur ne peut pas confirmer cette opération. Réessayez avec la même référence.' })
  }
}

const arrondi = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function broadcast(channel: string, event: string, payload: any) {
  try {
    const fn = (globalThis as any).liveBroadcast
    if (typeof fn === 'function') fn(channel, event, payload)
  } catch { /* broadcast indisponible */ }
}

function pushStaffNotif(entry: Record<string, any>) {
  const notifs = safeReadJson<any[]>(NOTIFS_FILE, [])
  const next = [{ id: 'gn-' + Math.random().toString(36).slice(2, 10), pushedAt: Date.now(), ...entry }, ...notifs].slice(0, 200)
  safeWriteJson(NOTIFS_FILE, next)
  if (typeof entry.companyId === 'string') broadcast(`inbox-${entry.companyId}`, 'guest-call', entry)
}

/** Identifiant de table tel que porté par le QR : court, sans caractères de contrôle. */
function tableValide(tableId: unknown): tableId is string {
  return typeof tableId === 'string' && /^[\w .-]{1,40}$/.test(tableId) && tableId !== 'sans-table'
}

function companyValide(companyId: unknown): companyId is string {
  return typeof companyId === 'string' && /^[\w-]{1,100}$/.test(companyId)
}

/** Commandes non réglées de la table pendant la visite courante (nouveau format seulement). */
export function commandesARegler(orders: GuestOrder[], tableId: string, _now = Date.now()): GuestOrder[] {
  return orders.filter((o) =>
    o.tableId === tableId &&
    !!o.companyId &&
    !o.paid,
  )
}

/** Le QR doit désigner une table réelle, pas seulement une chaîne bien formée. */
const resolveTable = resolveGuestTable

async function readOrders(companyId: string, guestVisitId?: string): Promise<GuestOrder[]> {
  const stored = await prisma.order.findMany({ where: { companyId, source: 'GUEST', ...(guestVisitId ? { guestVisitId } : {}) }, include: { items: { include: { product: true } } } })
  const central = stored.map(o => ({ id: o.publicToken!, companyId, guestVisitId: o.guestVisitId, tableId: o.externalTableId!,
    items: o.items.map(i => ({ productId: i.productId, name: i.productName || i.product.name, qty: i.quantity, price: i.unitPrice })),
    total: o.total, status: (o.guestStatus || 'received') as OrderStatus, paid: !!o.paidAt || o.status === 'CANCELLED',
    paidAt: o.paidAt?.getTime(), createdAt: o.createdAt.getTime(), updatedAt: o.updatedAt.getTime(),
    stripeSessionId: o.paymentMethod?.startsWith('stripe:') ? o.paymentMethod.slice(7) : undefined }))
  // Les impayés historiques restent visibles : aucune purge ni conversion destructive automatique.
  return [...central, ...(guestVisitId ? [] : safeReadJson<GuestOrder[]>(ORDERS_FILE, []).filter(o => o.companyId === companyId && !central.some(c => c.id === o.id)))]
}

// ─── Suivi de commande ──────────────────────────────────

router.post('/orders', asyncRoute(async (req, res) => {
  const { companyId, items, requestId } = req.body
  if (!companyValide(companyId) || !tableValide(req.body.tableId)) return res.status(400).json({ error: 'Établissement et table requis.' })
  if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId)) return res.status(400).json({ error: 'Référence stable de commande requise.' })
  const tableId = await resolveTable(companyId, req.body.tableId)
  if (!tableId) return res.status(404).json({ error: 'Table inconnue.' })
  if (!Array.isArray(items) || !items.length || items.length > MAX_LIGNES) return res.status(400).json({ error: 'Lignes de commande invalides.' })
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (typeof item?.productId !== 'string' || !item.productId || item.productId.length > 100 || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTE) return res.status(400).json({ error: 'Produit ou quantité invalide.' })
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.qty)
  }
  const lines = [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([productId, qty]) => ({ productId, qty }))
  if (lines.some(l => l.qty > MAX_QTE)) return res.status(400).json({ error: 'Quantité maximale par produit dépassée.' })
  const saved = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    await lockGuestTable(tx, companyId, tableId)
    const visit = await guestScope(req, companyId, tableId, tx)
    const hash = createHash('sha256').update(JSON.stringify({ companyId, tableId, visitId: visit?.id || null, lines })).digest('hex')
    const previous = await tx.order.findUnique({ where: { publicToken: requestId } })
    if (previous) {
      if (previous.companyId !== companyId || previous.externalTableId !== tableId || previous.guestVisitId !== (visit?.id || null) || previous.guestRequestHash !== hash) throw new GuestAccessError(409, 'Cette référence appartient à une autre commande. Vérifiez la commande déjà envoyée.')
      return previous
    }
    const products = await tx.product.findMany({ where: { companyId, id: { in: lines.map(l => l.productId) }, isActive: true } })
    if (products.length !== lines.length) throw new GuestAccessError(409, 'Un produit est indisponible. Actualisez la carte.')
    const lineData = lines.map(line => {
      const product = products.find(p => p.id === line.productId)!
      if (product.stock !== null && product.stock < line.qty) throw new GuestAccessError(409, 'Quantité indisponible pour ce produit.')
      return { productId: product.id, productName: product.name, quantity: line.qty, unitPrice: product.price, taxRate: product.taxRate }
    })
    const totals = totalsFromTtc(lineData.map(i => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate })))
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('order-number'))::text`
    const last = await tx.order.aggregate({ where: { companyId }, _max: { orderNumber: true } })
    return tx.order.create({ data: { companyId, userId: null, source: 'GUEST', externalTableId: tableId, publicToken: requestId,
      guestVisitId: visit?.id || null, guestRequestHash: hash, guestStatus: 'received',
      orderNumber: (last._max.orderNumber || 0) + 1, subtotal: totals.baseCents / 100, taxAmount: totals.taxCents / 100,
      total: totals.totalCents / 100, items: { create: lineData } } })
  }, { maxWait: 15000, timeout: 10000 })
  const result = (await readOrders(companyId, saved.guestVisitId || undefined)).find(o => o.id === saved.publicToken)
  res.status(201).json(result)
}))

router.get('/orders/:id', asyncRoute(async (req, res) => {
  const companyId = req.query.companyId
  if (!companyValide(companyId)) return res.status(400).json({ error: 'Établissement requis' })
  const visit = await guestScope(req, companyId)
  const orders = await readOrders(companyId, visit?.id)
  const order = orders.find((o) => o.id === req.params.id && o.companyId === companyId)
  if (!order) return res.status(404).json({ error: 'not found' })
  res.json(order)
}))

const VALID_STATUSES: OrderStatus[] = ['received', 'preparing', 'on_the_way']

// Réservé au personnel : cette route était publique, n'importe qui pouvait
// passer n'importe quelle commande « en route » depuis son téléphone.
router.patch('/orders/:id/status', deviceOrUserAuth, requireCompany, asyncRoute(async (req: Request, res: Response) => {
  const { status } = req.body as { status?: OrderStatus }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status doit être l'un de ${VALID_STATUSES.join(', ')}` })
  }
  const companyId = (req as any).companyId
  const central = await prisma.order.findFirst({ where: { companyId, publicToken: req.params.id, source: 'GUEST' } })
  if (central) {
    if (central.paidAt || central.status === 'CANCELLED') return res.status(409).json({ error: 'Commande terminée.' })
    const changed = await prisma.order.updateMany({ where: { id: central.id, companyId, paidAt: null, status: { not: 'CANCELLED' } }, data: { guestStatus: status, status: status === 'received' ? 'OPEN' : status === 'preparing' ? 'IN_PROGRESS' : 'READY' } })
    if (!changed.count) return res.status(409).json({ error: 'Commande terminée dans une autre session.' })
    return res.json((await readOrders(companyId)).find(o => o.id === req.params.id))
  }
  const orders = safeReadJson<GuestOrder[]>(ORDERS_FILE, [])
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })
  if (order.companyId !== (req as any).companyId) return res.status(404).json({ error: 'not found' })
  order.status = status
  order.updatedAt = Date.now()
  safeWriteJson(ORDERS_FILE, orders)
  broadcast(`table-${order.companyId}-${order.tableId}`, 'order-status', { orderId: order.id, status: order.status, ts: order.updatedAt })
  res.json(order)
}))

// ─── Appel serveur / addition ───────────────────────────

const lastCallByTable = new Map<string, number>()
const CALL_COOLDOWN_MS = 30_000

router.post('/call-waiter', asyncRoute(async (req, res) => {
  const { companyId, tableId, type } = req.body as { companyId?: unknown; tableId?: unknown; type?: 'waiter' | 'bill' }
  if (!companyValide(companyId) || !tableValide(tableId) || (type !== 'waiter' && type !== 'bill')) {
    return res.status(400).json({ error: 'companyId, tableId et type (waiter|bill) requis' })
  }
  try {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } })
    if (!company) return res.status(404).json({ error: 'Établissement inconnu' })
    if (!await resolveTable(companyId, tableId)) return res.status(404).json({ error: 'Table inconnue.' })
  } catch {
    return res.status(503).json({ error: 'Appel impossible pour le moment' })
  }
  const realTable = await resolveTable(companyId, tableId)
  const visit = await guestScope(req, companyId, realTable!)
  const callKey = `${companyId}:${realTable}:${visit?.id || 'staff'}`
  const last = lastCallByTable.get(callKey) || 0
  if (Date.now() - last < CALL_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Appel déjà envoyé, patientez quelques secondes.' })
  }

  const isBill = type === 'bill'
  pushStaffNotif({
    type: 'guest-call',
    companyId,
    entityId: tableId,
    title: isBill ? `🧾 Table ${tableId} demande l'addition` : `🙋 Table ${tableId} appelle le serveur`,
    message: isBill ? 'Le client souhaite régler.' : 'Le client a besoin de quelque chose.',
    severity: 'info',
    cta: { label: 'Voir la table', route: '/pos/floor' },
  })
  lastCallByTable.set(callKey, Date.now())
  res.json({ ok: true })
}))

// ─── Paiement à table ───────────────────────────────────

/** Addition serveur d'une table : montant et commandes concernées. */
router.get('/bill/:tableId', asyncRoute(async (req, res) => {
  const tableId = req.params.tableId
  const companyId = req.query.companyId
  if (!companyValide(companyId) || !tableValide(tableId)) return res.status(400).json({ error: 'Établissement ou table invalide' })
  const realTable = await resolveTable(companyId, tableId)
  if (!realTable) return res.status(404).json({ error: 'Table inconnue.' })
  const visit = await guestScope(req, companyId, realTable)
  const orders = commandesARegler(await readOrders(companyId, visit?.id), realTable)
  const central = await prisma.order.findMany({ where: { companyId, publicToken: { in: orders.map(o => o.id) } } })
  const balances = await Promise.all(central.map(order => orderPaymentBalance(prisma, companyId, order)))
  const total = balances.reduce((s, b) => s + b.outstandingCents, 0) / 100
  const paymentProviders = ['paypal', 'stripe'].filter(provider => { try { merchantFor(provider, companyId); return true } catch { return false } })
  res.json({ tableId, total, orderIds: orders.map((o) => o.id), count: orders.length, paymentProviders })
}))

router.post('/pay', asyncRoute(async (req, res) => {
  const { companyId, tableId } = req.body as { companyId?: unknown; tableId?: unknown; total?: unknown }
  if (!companyValide(companyId) || !tableValide(tableId)) {
    return res.status(400).json({ error: 'companyId et tableId requis' })
  }
  const realTable = await resolveTable(companyId, tableId)
  if (!realTable) return res.status(404).json({ error: 'Table inconnue.' })
  if (typeof req.body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(req.body.requestId)) return res.status(400).json({ error: 'Référence de paiement stable requise.' })
  await guestScope(req, companyId, realTable)
  const result = await createTablePayment(companyId, realTable, { requestId: req.body.requestId, provider: req.body.provider },
    (req as any).guestStaff ? { staffUserId: (req as any).user?.userId, staffDevice: !!(req as any).device } : { guestToken: visitToken(req) })
  setPaymentReturn(req, res, companyId, result.body.attemptId)
  res.status(result.httpStatus).json({ ...result.body, url: result.body.redirectUrl, total: result.body.amount })
}))

/**
 * Le retour ne prouve rien. On retrouve une tentative persistée pour cette
 * table, puis on vérifie la capture. Les webhooks assurent aussi la reprise
 * quand le navigateur ne revient jamais. Aucun nouvel encaissement local.
 */
router.post('/paid-confirm', asyncRoute(async (req, res) => {
  const { companyId, tableId, sessionId, attemptId } = req.body as { companyId?: unknown; tableId?: unknown; sessionId?: unknown; attemptId?: unknown }
  if (!companyValide(companyId) || !tableValide(tableId)) return res.status(400).json({ error: 'companyId et tableId requis' })
  if (typeof attemptId !== 'string' && (typeof sessionId !== 'string' || !/^cs_[\w]+$/.test(sessionId))) {
    return res.status(400).json({ error: 'Référence de paiement manquante.' })
  }
  const realTable = await resolveTable(companyId, tableId)
  if (!realTable) return res.status(404).json({ error: 'Table inconnue.' })
  const attempt = await prisma.paymentAttempt.findFirst({ where: { companyId, scope: 'TABLE', tableId: realTable,
    ...(typeof attemptId === 'string' ? { id: attemptId } : { provider: 'stripe', externalId: sessionId as string }) } })
  if (!attempt) return res.status(404).json({ error: 'Référence inconnue pour cette addition. Le responsable doit vérifier les anciens règlements hors journal 2.0.' })
  if (!hasPaymentReturn(req, companyId, attempt.id)) {
    const visit = await guestScope(req, companyId, realTable)
    if (visit && attempt.guestVisitId !== visit.id) throw new GuestAccessError(403)
  }
  const payment = await reconcilePayment(companyId, attempt.id, attempt.provider === 'paypal' && attempt.status !== 'SUCCEEDED')
  if (payment.status !== 'succeeded') return res.status(202).json({ ...payment, error: 'Paiement encore en attente ou incertain. Ne réglez pas une deuxième fois sans vérification.' })
  return res.json({ ...payment, ok: true })
}))

// ─── Fidélité ───────────────────────────────────────────

router.get('/loyalty/:phone', (_req, res) => res.status(503).json({
  code: 'GUEST_AUTH_REQUIRED',
  error: 'La fidélité sera disponible après activation de la connexion client sécurisée par e-mail.',
}))

export default router
