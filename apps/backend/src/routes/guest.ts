import { Router, type Request, type Response } from 'express'
import path from 'path'
import { randomUUID } from 'node:crypto'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { getFloorState } from './floorState'
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
const asyncRoute = (handler: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await handler(req, res) }
  catch (error) {
    logger.error('[guest] opération non confirmée', error)
    if (!res.headersSent) res.status(error instanceof PosError || error instanceof PaymentError ? error.status : 503).json({ error: error instanceof PosError || error instanceof PaymentError ? error.message : 'Le serveur ne peut pas confirmer cette opération. Réessayez avec la même référence.' })
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
async function resolveTable(companyId: string, value: string): Promise<string | null> {
  const fromDb = await prisma.table.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true } })
  const tables = [...new Map([...fromDb, ...getFloorState(companyId).tables].map(t => [t.id, t])).values()]
  const exact = tables.find(t => t.id === value)
  if (exact) return exact.id
  const normal = (s: string) => s.toLowerCase().trim().replace(/^table\s*/i, '')
  const matches = tables.filter(t => normal(t.name) === normal(value))
  return matches.length === 1 ? matches[0].id : null
}

async function readOrders(companyId: string): Promise<GuestOrder[]> {
  const stored = await prisma.order.findMany({ where: { companyId, source: 'GUEST' }, include: { items: { include: { product: true } } } })
  const central = stored.map(o => ({ id: o.publicToken!, companyId, tableId: o.externalTableId!,
    items: o.items.map(i => ({ productId: i.productId, name: i.productName || i.product.name, qty: i.quantity, price: i.unitPrice })),
    total: o.total, status: (o.guestStatus || 'received') as OrderStatus, paid: !!o.paidAt || o.status === 'CANCELLED',
    paidAt: o.paidAt?.getTime(), createdAt: o.createdAt.getTime(), updatedAt: o.updatedAt.getTime(),
    stripeSessionId: o.paymentMethod?.startsWith('stripe:') ? o.paymentMethod.slice(7) : undefined }))
  // Les impayés historiques restent visibles : aucune purge ni conversion destructive automatique.
  return [...central, ...safeReadJson<GuestOrder[]>(ORDERS_FILE, []).filter(o => o.companyId === companyId && !central.some(c => c.id === o.id))]
}

// ─── Suivi de commande ──────────────────────────────────

router.post('/orders', async (req, res) => {
  const { companyId, items, requestId } = req.body as { companyId?: unknown; tableId?: unknown; items?: unknown; requestId?: unknown }
  let tableId = req.body.tableId as unknown
  if (!companyValide(companyId)) {
    return res.status(400).json({ error: 'Établissement requis : scannez le QR code de votre table.' })
  }
  if (!tableValide(tableId)) {
    return res.status(400).json({ error: 'Table requise : scannez le QR code de votre table.' })
  }
  try {
    const realTable = await resolveTable(companyId, tableId)
    if (!realTable) return res.status(404).json({ error: 'Table inconnue : scannez son QR code actuel.' })
    tableId = realTable
  } catch { return res.status(503).json({ error: 'Vérification de la table impossible.' }) }
  if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId))) return res.status(400).json({ error: 'Référence de commande invalide.' })
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LIGNES) {
    return res.status(400).json({ error: `items[] requis (1 à ${MAX_LIGNES} lignes)` })
  }

  // Quantités et identifiants seulement : le prix et le nom viennent de la base.
  const lignes: { productId: string; qty: number }[] = []
  for (const brut of items as any[]) {
    const productId = typeof brut?.productId === 'string' ? brut.productId.trim() : ''
    const qty = Number(brut?.qty)
    if (!productId) return res.status(400).json({ error: 'Chaque ligne doit porter un productId.' })
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTE) {
      return res.status(400).json({ error: `Quantité invalide pour ${productId} (entier de 1 à ${MAX_QTE}).` })
    }
    const existante = lignes.find((l) => l.productId === productId)
    if (existante) existante.qty += qty
    else lignes.push({ productId, qty })
  }
  if (lignes.some(l => l.qty > MAX_QTE)) return res.status(400).json({ error: `Maximum ${MAX_QTE} unités par produit, lignes répétées comprises.` })

  let produits: { id: string; name: string; price: number; companyId: string }[]
  try {
    produits = await prisma.product.findMany({
      where: { companyId, id: { in: lignes.map((l) => l.productId) }, isActive: true },
      select: { id: true, name: true, price: true, companyId: true },
    })
  } catch (e: any) {
    // Sans base, impossible de connaître les prix : on n'enregistre pas une
    // commande à montant inventé.
    logger.error(`[guest] commande refusée, base indisponible : ${e?.message || e}`)
    return res.status(503).json({ error: 'Commande impossible pour le moment, appelez le serveur.' })
  }

  const parId = new Map(produits.map((p) => [p.id, p]))
  const inconnu = lignes.find((l) => !parId.has(l.productId))
  if (inconnu) {
    return res.status(400).json({ error: `Produit inconnu ou indisponible : ${inconnu.productId}` })
  }
  const enseignes = new Set(produits.map((p) => p.companyId))
  if (enseignes.size !== 1) {
    return res.status(400).json({ error: 'Une commande ne peut pas mélanger plusieurs enseignes.' })
  }
  if (produits[0].companyId !== companyId) {
    return res.status(400).json({ error: 'Ces produits ne correspondent pas à cet établissement.' })
  }

  const orderItems: GuestOrderItem[] = lignes.map((l) => {
    const p = parId.get(l.productId)!
    return { productId: p.id, name: p.name, qty: l.qty, price: arrondi(p.price) }
  })
  const total = arrondi(orderItems.reduce((sum, i) => sum + i.price * i.qty, 0))
  const now = Date.now()
  const order: GuestOrder = {
    id: 'gord-' + Math.random().toString(36).slice(2, 10),
    companyId,
    tableId: String(tableId),
    items: orderItems,
    total,
    status: 'received',
    paid: false,
    createdAt: now,
    updatedAt: now,
  }
  try {
    const token = typeof requestId === 'string' ? requestId : randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('pos-ledger'))::text`
      const previous = await tx.order.findUnique({ where: { publicToken: token } })
      if (previous) {
        if (previous.companyId !== companyId || previous.externalTableId !== tableId) throw new Error('Référence déjà utilisée.')
        return
      }
      const products = await tx.product.findMany({ where: { companyId, id: { in: lignes.map(l => l.productId) }, isActive: true } })
      if (products.length !== lignes.length) throw new Error('Un produit est devenu indisponible.')
      const lineData = lignes.map(l => {
        const p = products.find(p => p.id === l.productId)!
        if (p.stock !== null && p.stock < l.qty) throw new Error(`Stock insuffisant pour ${p.name}.`)
        return { productId: p.id, productName: p.name, quantity: l.qty, unitPrice: arrondi(p.price), taxRate: p.taxRate }
      })
      const amount = arrondi(lineData.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
      const ht = arrondi(lineData.reduce((s, l) => s + l.unitPrice * l.quantity / (1 + l.taxRate / 100), 0))
      const last = await tx.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } })
      await tx.order.create({ data: { companyId, userId: null, source: 'GUEST', externalTableId: String(tableId), publicToken: token,
        guestStatus: 'received', orderNumber: (last?.orderNumber || 0) + 1, subtotal: ht, taxAmount: arrondi(amount - ht), total: amount,
        items: { create: lineData } } })
    })
    const saved = (await readOrders(companyId)).find(o => o.id === token)!
    broadcast(`table-${companyId}-${tableId}`, 'order-status', { orderId: saved.id, status: saved.status, ts: saved.updatedAt })
    res.status(201).json(saved)
  } catch (e: any) {
    logger.warn('[guest] commande centrale refusée', { code: e?.code })
    res.status(e?.code === 'P2002' ? 409 : 503).json({ error: 'Commande non confirmée. Réessayez avec la même référence ou appelez le serveur.' })
  }
})

router.get('/orders/:id', asyncRoute(async (req, res) => {
  const companyId = req.query.companyId
  if (!companyValide(companyId)) return res.status(400).json({ error: 'Établissement requis' })
  const orders = await readOrders(companyId)
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
  const callKey = `${companyId}:${tableId}`
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
  const orders = commandesARegler(await readOrders(companyId), realTable)
  const total = arrondi(orders.reduce((s, o) => s + o.total, 0))
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
  const result = await createTablePayment(companyId, realTable, { requestId: req.body.requestId, provider: req.body.provider })
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
