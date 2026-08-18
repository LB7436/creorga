import { Router, type Request, type Response } from 'express'
import path from 'path'
import Stripe from 'stripe'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { deviceOrUserAuth } from '../middleware/deviceAuth'

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
const FENETRE_ADDITION_MS = 6 * 60 * 60 * 1000
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
  broadcast('inbox', 'guest-call', entry)
}

/** Identifiant de table tel que porté par le QR : court, sans caractères de contrôle. */
function tableValide(tableId: unknown): tableId is string {
  return typeof tableId === 'string' && /^[\w .-]{1,40}$/.test(tableId) && tableId !== 'sans-table'
}

/** Commandes non réglées de la table pendant la visite courante (nouveau format seulement). */
export function commandesARegler(orders: GuestOrder[], tableId: string, now = Date.now()): GuestOrder[] {
  return orders.filter((o) =>
    o.tableId === tableId &&
    !!o.companyId &&
    !o.paid &&
    now - o.createdAt <= FENETRE_ADDITION_MS,
  )
}

// ─── Suivi de commande ──────────────────────────────────

router.post('/orders', async (req, res) => {
  const { tableId, items } = req.body as { tableId?: unknown; items?: unknown }
  if (!tableValide(tableId)) {
    return res.status(400).json({ error: 'Table requise : scannez le QR code de votre table.' })
  }
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

  let produits: { id: string; name: string; price: number; companyId: string }[]
  try {
    produits = await prisma.product.findMany({
      where: { id: { in: lignes.map((l) => l.productId) }, isActive: true },
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
  const companyId = produits[0].companyId

  const orderItems: GuestOrderItem[] = lignes.map((l) => {
    const p = parId.get(l.productId)!
    return { productId: p.id, name: p.name, qty: l.qty, price: arrondi(p.price) }
  })
  const total = arrondi(orderItems.reduce((sum, i) => sum + i.price * i.qty, 0))
  const now = Date.now()
  const order: GuestOrder = {
    id: 'gord-' + Math.random().toString(36).slice(2, 10),
    companyId,
    tableId,
    items: orderItems,
    total,
    status: 'received',
    paid: false,
    createdAt: now,
    updatedAt: now,
  }
  const orders = safeReadJson<GuestOrder[]>(ORDERS_FILE, [])
  safeWriteJson(ORDERS_FILE, [order, ...orders].slice(0, 500))
  broadcast(`table-${tableId}`, 'order-status', { orderId: order.id, status: order.status, ts: order.updatedAt })
  res.status(201).json(order)
})

router.get('/orders/:id', (req, res) => {
  const orders = safeReadJson<GuestOrder[]>(ORDERS_FILE, [])
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })
  res.json(order)
})

const VALID_STATUSES: OrderStatus[] = ['received', 'preparing', 'on_the_way']

// Réservé au personnel : cette route était publique, n'importe qui pouvait
// passer n'importe quelle commande « en route » depuis son téléphone.
router.patch('/orders/:id/status', deviceOrUserAuth, (req: Request, res: Response) => {
  const { status } = req.body as { status?: OrderStatus }
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status doit être l'un de ${VALID_STATUSES.join(', ')}` })
  }
  const orders = safeReadJson<GuestOrder[]>(ORDERS_FILE, [])
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })
  order.status = status
  order.updatedAt = Date.now()
  safeWriteJson(ORDERS_FILE, orders)
  broadcast(`table-${order.tableId}`, 'order-status', { orderId: order.id, status: order.status, ts: order.updatedAt })
  res.json(order)
})

// ─── Appel serveur / addition ───────────────────────────

const lastCallByTable = new Map<string, number>()
const CALL_COOLDOWN_MS = 30_000

router.post('/call-waiter', (req, res) => {
  const { tableId, type } = req.body as { tableId?: unknown; type?: 'waiter' | 'bill' }
  if (!tableValide(tableId) || (type !== 'waiter' && type !== 'bill')) {
    return res.status(400).json({ error: 'tableId et type (waiter|bill) requis' })
  }
  const last = lastCallByTable.get(tableId) || 0
  if (Date.now() - last < CALL_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Appel déjà envoyé, patientez quelques secondes.' })
  }
  lastCallByTable.set(tableId, Date.now())

  const isBill = type === 'bill'
  pushStaffNotif({
    type: 'guest-call',
    entityId: tableId,
    title: isBill ? `🧾 Table ${tableId} demande l'addition` : `🙋 Table ${tableId} appelle le serveur`,
    message: isBill ? 'Le client souhaite régler.' : 'Le client a besoin de quelque chose.',
    severity: 'info',
    cta: { label: 'Voir la table', route: '/pos/floor' },
  })
  res.json({ ok: true })
})

// ─── Paiement à table ───────────────────────────────────

/** Addition serveur d'une table : montant et commandes concernées. */
router.get('/bill/:tableId', (req, res) => {
  const tableId = req.params.tableId
  if (!tableValide(tableId)) return res.status(400).json({ error: 'Table invalide' })
  const orders = commandesARegler(safeReadJson<GuestOrder[]>(ORDERS_FILE, []), tableId)
  const total = arrondi(orders.reduce((s, o) => s + o.total, 0))
  res.json({ tableId, total, orderIds: orders.map((o) => o.id), count: orders.length })
})

router.post('/pay', async (req, res) => {
  const { tableId } = req.body as { tableId?: unknown; total?: unknown }
  if (!tableValide(tableId)) {
    return res.status(400).json({ error: 'tableId requis' })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: 'Paiement en ligne non configuré' })
  }

  // Le montant vient des commandes enregistrées côté serveur, jamais du corps
  // de la requête (l'ancien `total` du navigateur est ignoré).
  const orders = commandesARegler(safeReadJson<GuestOrder[]>(ORDERS_FILE, []), tableId)
  const total = arrondi(orders.reduce((s, o) => s + o.total, 0))
  if (!orders.length || total <= 0) {
    return res.status(400).json({ error: 'Aucune commande à régler pour cette table.' })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Addition — Table ${tableId}` },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/c/paid?table=${encodeURIComponent(tableId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/c?table=${encodeURIComponent(tableId)}`,
      locale: 'fr',
      metadata: { tableId, companyId: orders[0].companyId ?? '', orderIds: orders.map((o) => o.id).join(',') },
    })
    res.json({ url: session.url, total })
  } catch (err: any) {
    logger.error(`[guest] création de session Stripe impossible (table ${tableId}) : ${err?.message || err}`)
    res.status(502).json({ error: 'Paiement en ligne indisponible pour le moment.' })
  }
})

/**
 * Confirmation de paiement en ligne, au retour de Stripe Checkout.
 *
 * Route PUBLIQUE : un paiement ne se déclare pas, il se prouve. On exige
 * l'identifiant de session, on le vérifie AUPRÈS DE STRIPE, on exige que la
 * session ait été émise pour CETTE table, et on ne prévient le personnel
 * qu'une seule fois (rejouer la page /c/paid ne renotifie pas).
 */
router.post('/paid-confirm', async (req, res) => {
  const { tableId, sessionId } = req.body as { tableId?: unknown; sessionId?: unknown }
  if (!tableValide(tableId)) return res.status(400).json({ error: 'tableId requis' })
  if (typeof sessionId !== 'string' || !/^cs_[\w]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Preuve de paiement manquante (sessionId).' })
  }

  // Sans clé Stripe, aucun paiement en ligne ne peut avoir lieu sur ce serveur :
  // toute confirmation reçue ici serait forcément fabriquée.
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn(`[guest] confirmation de paiement refusée (Stripe non configuré) — table ${tableId}`)
    return res.status(503).json({ error: "Le paiement en ligne n'est pas configuré sur ce serveur." })
  }

  const orders = safeReadJson<GuestOrder[]>(ORDERS_FILE, [])
  if (orders.some((o) => o.stripeSessionId === sessionId)) {
    // Déjà traitée : idempotent, sans nouvelle notification.
    return res.json({ ok: true, dejaConfirme: true })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      logger.warn(`[guest] session ${sessionId} non réglée (${session.payment_status}) — table ${tableId}`)
      return res.status(402).json({ error: "Ce paiement n'est pas abouti." })
    }
    if (session.metadata?.tableId !== tableId) {
      logger.warn(`[guest] session ${sessionId} émise pour la table ${session.metadata?.tableId ?? '?'}, confirmée pour ${tableId} : refusée`)
      return res.status(400).json({ error: 'Cette preuve de paiement ne correspond pas à cette table.' })
    }

    const ids = new Set((session.metadata?.orderIds ?? '').split(',').filter(Boolean))
    const now = Date.now()
    for (const o of orders) {
      if (ids.has(o.id)) { o.paid = true; o.paidAt = now; o.stripeSessionId = sessionId; o.updatedAt = now }
    }
    safeWriteJson(ORDERS_FILE, orders)

    pushStaffNotif({
      type: 'guest-paid',
      entityId: tableId,
      title: `💳 Table ${tableId} a payé en ligne`,
      message: `Paiement vérifié auprès de Stripe (${(session.amount_total ?? 0) / 100} ${(session.currency || 'eur').toUpperCase()}).`,
      severity: 'success',
      cta: { label: 'Voir la table', route: '/pos/floor' },
    })
    return res.json({ ok: true })
  } catch (e: any) {
    // Ne jamais retomber sur « ok » : un échec de vérification n'est pas un
    // paiement. Le personnel ne doit pas être notifié dans le doute.
    logger.error(`[guest] vérification Stripe impossible (${sessionId}) : ${e?.message || e}`)
    return res.status(502).json({ error: 'Paiement invérifiable pour le moment.' })
  }
})

// ─── Fidélité — lecture seule par téléphone ─────────────

router.get('/loyalty/:phone', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { phone: req.params.phone },
      select: { points: true },
    })
    if (!customer) return res.json({ points: 0 })
    res.json({ points: customer.points })
  } catch {
    // DB indisponible en mode sans-Docker : pas de fidélité affichée, pas d'erreur bloquante.
    res.json({ points: 0 })
  }
})

export default router
