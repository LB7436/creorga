import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import logger from '../lib/logger'
import { requireCompany, requireRole } from '../middleware/requireCompany'

/**
 * Abonnements Creorga (Stripe Billing).
 *
 * v5.0 — deux failles fermées :
 *  1. IDOR : `/portal`, `/session/:id`, `/subscriptions/:customerId`,
 *     `DELETE|PATCH /subscription/:id` acceptaient n'importe quel identifiant
 *     Stripe — un membre STAFF d'une société pouvait annuler l'abonnement d'une
 *     autre. Chaque session/abonnement est désormais étiqueté `companyId` à la
 *     création, et chaque lecture/modification vérifie cette étiquette contre
 *     la société de l'appelant, propriétaire uniquement.
 *  2. Webhook : il était monté derrière `authenticate` (Stripe n'a pas de JWT →
 *     jamais appelé) et après `express.json()` (signature invérifiable). Il est
 *     maintenant exporté (`stripeWebhook`) et monté dans `index.ts` en
 *     `express.raw`, hors authentification, **signature obligatoire** : sans
 *     `STRIPE_WEBHOOK_SECRET`, aucun événement n'est accepté (503) — on ne
 *     traite jamais un corps non signé.
 */

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
})

type PlanKey = 'starter' | 'pro' | 'business'

const societeDe = (req: Request) => String((req as any).companyId || '')

/** Un objet Stripe appartient à l'appelant si son étiquette `companyId` correspond. */
function appartient(metadata: Stripe.Metadata | null | undefined, companyId: string) {
  return !!companyId && !!metadata && metadata.companyId === companyId
}

// Créer une session de paiement Stripe Checkout (propriétaire de la société)
router.post('/create-checkout', requireCompany, requireRole('OWNER'), async (req: Request, res: Response) => {
  // Le webhook journalise les paiements mais aucun modèle ne persiste encore
  // l'abonnement. Encaisser dans cet état laisserait le client payé affiché
  // comme gratuit : la création de Checkout reste donc fermée.
  return res.status(503).json({
    code: 'BILLING_PERSISTENCE_REQUIRED',
    error: "Souscription désactivée jusqu'à la persistance et au test complet des webhooks Stripe.",
  })

  const { plan, email } = req.body as { plan: PlanKey; email: string }
  const companyId = societeDe(req)
  const prices: Record<PlanKey, string> = {
    starter: process.env.STRIPE_PRICE_STARTER || '',
    pro: process.env.STRIPE_PRICE_PRO || '',
    business: process.env.STRIPE_PRICE_BUSINESS || '',
  }

  if (!['starter', 'pro', 'business'].includes(plan)) {
    return res.status(400).json({ error: `Plan inconnu: ${plan}` })
  }
  if (!process.env.STRIPE_SECRET_KEY || !prices[plan]) {
    return res.status(503).json({ error: 'Paiement Stripe non configuré' })
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Email de facturation invalide' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{ price: prices[plan], quantity: 1 }],
      customer_email: email,
      client_reference_id: companyId,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/owner/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/owner/abonnement`,
      locale: 'fr',
      subscription_data: {
        trial_period_days: 14,
        metadata: { plan, companyId },
      },
      metadata: { plan, email, companyId },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url, sessionId: session.id })
  } catch (err: any) {
    logger.error(`[Stripe] Erreur création checkout: ${err?.message}`)
    res.status(500).json({ error: err?.message || 'Erreur Stripe' })
  }
})

/**
 * Webhook Stripe — à monter AVANT `express.json()` avec `express.raw`, hors
 * `authenticate` (voir index.ts). Signature obligatoire.
 */
export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    logger.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET absent : événement ignoré (jamais de corps non signé)')
    return res.status(503).json({ error: 'Webhook non configuré' })
  }
  if (typeof sig !== 'string' || !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Signature ou corps brut manquant' })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret)
  } catch (err: any) {
    logger.warn(`[Stripe Webhook] Signature invalide: ${err?.message}`)
    return res.status(400).send(`Webhook Error: ${err?.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        logger.info(`[Stripe] Paiement complété: ${session.id} (société ${session.metadata?.companyId ?? '?'})`)
        // TODO follow-up : activer l'abonnement en base (aucun modèle Stripe dans le schéma aujourd'hui)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        logger.info(`[Stripe] Abonnement mis à jour: ${sub.id} ${sub.status}`)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        logger.info(`[Stripe] Abonnement annulé: ${sub.id}`)
        break
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.trial_will_end':
        logger.info(`[Stripe] Événement ${event.type} reçu`)
        break
      default:
        logger.info(`[Stripe] Événement non géré: ${event.type}`)
    }
    res.json({ received: true })
  } catch (err: any) {
    logger.error(`[Stripe Webhook] Erreur traitement: ${err?.message}`)
    res.status(500).json({ error: err?.message })
  }
}

// Toutes les routes suivantes : société résolue + propriétaire.
router.use(requireCompany, requireRole('OWNER'))

/** Le client Stripe appartient à la société si l'un de ses abonnements porte son étiquette. */
async function clientAppartient(customerId: string, companyId: string) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
  return subs.data.some((s) => appartient(s.metadata, companyId))
}

// Portail client Stripe (gestion carte, factures, annulation)
router.post('/portal', async (req: Request, res: Response) => {
  const { customerId } = req.body as { customerId: string }
  const companyId = societeDe(req)
  try {
    if (!customerId || !(await clientAppartient(customerId, companyId))) {
      return res.status(403).json({ error: 'Ce client Stripe n’appartient pas à votre société' })
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    logger.error(`[Stripe] Erreur portail: ${err?.message}`)
    res.status(500).json({ error: err?.message })
  }
})

// Récupérer une session checkout (après succès)
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['subscription', 'customer'],
    })
    if (!appartient(session.metadata, societeDe(req))) {
      return res.status(403).json({ error: 'Cette session n’appartient pas à votre société' })
    }
    res.json(session)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// Lister les abonnements d'un client (ceux de la société seulement)
router.get('/subscriptions/:customerId', async (req: Request, res: Response) => {
  try {
    const subs = await stripe.subscriptions.list({
      customer: req.params.customerId,
      status: 'all',
      limit: 20,
    })
    const companyId = societeDe(req)
    res.json(subs.data.filter((s) => appartient(s.metadata, companyId)))
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// Annuler un abonnement (de sa société uniquement)
router.delete('/subscription/:id', async (req: Request, res: Response) => {
  try {
    const current = await stripe.subscriptions.retrieve(req.params.id)
    if (!appartient(current.metadata, societeDe(req))) {
      return res.status(403).json({ error: 'Cet abonnement n’appartient pas à votre société' })
    }
    const sub = await stripe.subscriptions.cancel(req.params.id)
    res.json(sub)
  } catch (err: any) {
    logger.error(`[Stripe] Erreur annulation: ${err?.message}`)
    res.status(500).json({ error: err?.message })
  }
})

// Mettre à jour un abonnement (changement de plan) — de sa société uniquement
router.patch('/subscription/:id', async (req: Request, res: Response) => {
  const { newPriceId } = req.body as { newPriceId: string }
  try {
    const current = await stripe.subscriptions.retrieve(req.params.id)
    if (!appartient(current.metadata, societeDe(req))) {
      return res.status(403).json({ error: 'Cet abonnement n’appartient pas à votre société' })
    }
    const updated = await stripe.subscriptions.update(req.params.id, {
      items: [{ id: current.items.data[0].id, price: newPriceId }],
      proration_behavior: 'create_prorations',
    })
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

export default router
