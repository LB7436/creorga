import { Router, Request, Response } from 'express'
import Stripe from 'stripe'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
})

type PlanKey = 'starter' | 'pro' | 'business'

// Créer une session de paiement Stripe Checkout
router.post('/create-checkout', async (req: Request, res: Response) => {
  const { plan, email } = req.body as { plan: PlanKey; email: string }
  const prices: Record<PlanKey, string> = {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_39',
    pro: process.env.STRIPE_PRICE_PRO || 'price_pro_79',
    business: process.env.STRIPE_PRICE_BUSINESS || 'price_business_149',
  }

  if (!prices[plan]) {
    return res.status(400).json({ error: `Plan inconnu: ${plan}` })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{ price: prices[plan], quantity: 1 }],
      customer_email: email,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing`,
      locale: 'fr',
      subscription_data: {
        trial_period_days: 14,
        metadata: { plan },
      },
      metadata: { plan, email },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error('[Stripe] Erreur création checkout:', err?.message)
    res.status(500).json({ error: err?.message || 'Erreur Stripe' })
  }
})

// Webhook Stripe pour synchroniser les événements abonnement
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  try {
    if (secret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, secret)
    } else {
      event = req.body as Stripe.Event
    }
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature invalide:', err?.message)
    return res.status(400).send(`Webhook Error: ${err?.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[Stripe] Paiement complété:', session.id, session.customer_email)
        // TODO: Créer / activer l'abonnement en base
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[Stripe] Abonnement mis à jour:', sub.id, sub.status)
        // TODO: Mettre à jour l'état d'abonnement en base
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[Stripe] Abonnement annulé:', sub.id)
        // TODO: Désactiver l'accès
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[Stripe] Paiement réussi:', invoice.id, invoice.amount_paid)
        // TODO: Envoyer email de confirmation
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[Stripe] Paiement échoué:', invoice.id)
        // TODO: Envoyer relance paiement
        break
      }
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[Stripe] Fin essai imminente:', sub.id)
        // TODO: Envoyer email "trial ending"
        break
      }
      default:
        console.log(`[Stripe] Événement non géré: ${event.type}`)
    }
    res.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook] Erreur traitement:', err?.message)
    res.status(500).json({ error: err?.message })
  }
})

// Portail client Stripe (gestion carte, factures, annulation)
router.post('/portal', async (req: Request, res: Response) => {
  const { customerId } = req.body as { customerId: string }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/billing`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[Stripe] Erreur portail:', err?.message)
    res.status(500).json({ error: err?.message })
  }
})

// Récupérer une session checkout (après succès)
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['subscription', 'customer'],
    })
    res.json(session)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// Lister les abonnements d'un client
router.get('/subscriptions/:customerId', async (req: Request, res: Response) => {
  try {
    const subs = await stripe.subscriptions.list({
      customer: req.params.customerId,
      status: 'all',
      limit: 20,
    })
    res.json(subs.data)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// Annuler un abonnement
router.delete('/subscription/:id', async (req: Request, res: Response) => {
  try {
    const sub = await stripe.subscriptions.cancel(req.params.id)
    res.json(sub)
  } catch (err: any) {
    console.error('[Stripe] Erreur annulation:', err?.message)
    res.status(500).json({ error: err?.message })
  }
})

// Mettre à jour un abonnement (changement de plan)
router.patch('/subscription/:id', async (req: Request, res: Response) => {
  const { newPriceId } = req.body as { newPriceId: string }
  try {
    const current = await stripe.subscriptions.retrieve(req.params.id)
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
