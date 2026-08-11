import { Router } from 'express'
import path from 'path'
import Stripe from 'stripe'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

/**
 * v5.0 — Endpoints guest-facing : suivi commande, appel serveur/addition,
 * paiement à table. Séparé des routes staff (auth JWT) car les clients
 * scannent le QR sans compte — accès public rate-limité (publicLimiter).
 */

const DATA_DIR = path.resolve(process.cwd(), 'data')
const ORDERS_FILE = path.join(DATA_DIR, 'guest-orders.json')
const NOTIFS_FILE = path.join(DATA_DIR, 'proactive-notifs.json')

type OrderStatus = 'received' | 'preparing' | 'on_the_way'

interface GuestOrderItem {
  productId?: string
  name: string
  qty: number
  price: number
}

interface GuestOrder {
  id: string
  tableId: string
  items: GuestOrderItem[]
  total: number
  status: OrderStatus
  createdAt: number
  updatedAt: number
}

const router = Router()

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

// ─── Suivi de commande (v5.0.1) ─────────────────────────

router.post('/orders', (req, res) => {
  const { tableId, items } = req.body as { tableId?: string; items?: GuestOrderItem[] }
  if (!tableId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'tableId et items[] requis' })
  }
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const order: GuestOrder = {
    id: 'gord-' + Math.random().toString(36).slice(2, 10),
    tableId,
    items,
    total,
    status: 'received',
    createdAt: Date.now(),
    updatedAt: Date.now(),
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

router.patch('/orders/:id/status', (req, res) => {
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

// ─── Appel serveur / addition (v5.0.2) ──────────────────

const lastCallByTable = new Map<string, number>()
const CALL_COOLDOWN_MS = 30_000

router.post('/call-waiter', (req, res) => {
  const { tableId, type } = req.body as { tableId?: string; type?: 'waiter' | 'bill' }
  if (!tableId || (type !== 'waiter' && type !== 'bill')) {
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

// ─── Paiement à table (v5.0.3) ──────────────────────────

router.post('/pay', async (req, res) => {
  const { tableId, total } = req.body as { tableId?: string; total?: number }
  if (!tableId || typeof total !== 'number' || total <= 0) {
    return res.status(400).json({ error: 'tableId et total requis' })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: 'Paiement en ligne non configuré' })
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
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/c/paid?table=${encodeURIComponent(tableId)}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/c?table=${encodeURIComponent(tableId)}`,
      locale: 'fr',
      metadata: { tableId },
    })
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur Stripe' })
  }
})

/**
 * Confirmation de paiement en ligne, au retour de Stripe Checkout.
 *
 * ⚠️ Cette route est PUBLIQUE. Elle se contentait d'un `tableId` et notifiait
 * aussitôt « Table X a payé en ligne » : ouvrir `/c/paid?table=5` dans un
 * navigateur suffisait à faire croire au personnel qu'une table avait réglé.
 * Un client pouvait partir sans payer, un plaisantin vider une salle.
 *
 * Un paiement ne se déclare pas, il se prouve : on exige l'identifiant de
 * session Stripe et on le vérifie AUPRÈS DE STRIPE. Aucune confiance n'est
 * accordée à ce que le navigateur raconte.
 */
router.post('/paid-confirm', async (req, res) => {
  const { tableId, sessionId } = req.body as { tableId?: string; sessionId?: string }
  if (!tableId) return res.status(400).json({ error: 'tableId requis' })
  if (!sessionId) {
    return res.status(400).json({ error: 'Preuve de paiement manquante (sessionId).' })
  }

  // Sans clé Stripe, aucun paiement en ligne ne peut avoir lieu sur ce serveur :
  // toute confirmation reçue ici serait forcément fabriquée.
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn(`[guest] confirmation de paiement refusée (Stripe non configuré) — table ${tableId}`)
    return res.status(503).json({
      error: "Le paiement en ligne n'est pas configuré sur ce serveur.",
    })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      logger.warn(`[guest] session ${sessionId} non réglée (${session.payment_status}) — table ${tableId}`)
      return res.status(402).json({ error: "Ce paiement n'est pas abouti." })
    }

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

// ─── Fidélité (v5.0.5) — lookup en lecture seule par téléphone ──

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
