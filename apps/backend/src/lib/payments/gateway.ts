/**
 * Unified payment gateway abstraction
 * Supports: Stripe, SumUp, myPOS, Viva Wallet, Worldline, Servipay
 *
 * Each provider implements the PaymentGateway interface. The POS / web calls
 * a single `charge()` method and the correct provider routes through.
 */

export type PaymentProvider =
  | 'stripe'
  | 'sumup'
  | 'mypos'
  | 'viva'
  | 'worldline'
  | 'servipay'

export interface ChargeRequest {
  provider: PaymentProvider
  amount: number // in euros (will be converted to cents by provider)
  currency?: 'EUR' | 'USD'
  orderId: string
  description?: string
  customerEmail?: string
  metadata?: Record<string, string>
  /** For terminal-based gateways (SumUp/myPOS/Worldline) */
  terminalId?: string
  /** For redirect-based gateways (Viva/Servipay) */
  returnUrl?: string
  cancelUrl?: string
}

export interface ChargeResult {
  ok: boolean
  provider: PaymentProvider
  transactionId?: string
  /** Stripe/Viva: checkout URL; SumUp/myPOS: deep-link to terminal app */
  redirectUrl?: string
  /** For QR-code based (Servipay) */
  qrPayload?: string
  status: 'pending' | 'succeeded' | 'failed' | 'awaiting_terminal'
  error?: string
  raw?: unknown
}

export interface PaymentGateway {
  provider: PaymentProvider
  charge(req: ChargeRequest): Promise<ChargeResult>
  verify?(transactionId: string): Promise<ChargeResult>
  refund?(transactionId: string, amount?: number): Promise<ChargeResult>
}

// ─── Stripe ──────────────────────────────────────────────────────────────────
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-06-20' as never }) : null

const stripeGateway: PaymentGateway = {
  provider: 'stripe',
  async charge(req) {
    if (!stripe) return { ok: false, provider: 'stripe', status: 'failed', error: 'STRIPE_SECRET_KEY missing' }
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: (req.currency || 'EUR').toLowerCase(),
            product_data: { name: req.description || `Commande ${req.orderId}` },
            unit_amount: Math.round(req.amount * 100),
          },
          quantity: 1,
        }],
        success_url: req.returnUrl || 'https://app.creorga.lu/pos?paid=1',
        cancel_url: req.cancelUrl || 'https://app.creorga.lu/pos?cancelled=1',
        customer_email: req.customerEmail,
        metadata: { orderId: req.orderId, ...(req.metadata || {}) },
      })
      return {
        ok: true, provider: 'stripe',
        transactionId: session.id,
        redirectUrl: session.url || undefined,
        status: 'pending',
      }
    } catch (e: any) {
      return { ok: false, provider: 'stripe', status: 'failed', error: e.message }
    }
  },
  async verify(id) {
    if (!stripe) return { ok: false, provider: 'stripe', status: 'failed' }
    const s = await stripe.checkout.sessions.retrieve(id)
    return {
      ok: s.payment_status === 'paid',
      provider: 'stripe',
      transactionId: id,
      status: s.payment_status === 'paid' ? 'succeeded' : 'pending',
      raw: s,
    }
  },
}

// ─── SumUp (terminal deep-link) ──────────────────────────────────────────────
const sumupGateway: PaymentGateway = {
  provider: 'sumup',
  async charge(req) {
    // SumUp Air / Solo uses sumupmerchant:// deep-link on tablet
    const affiliate = process.env.SUMUP_AFFILIATE_KEY || ''
    const callback = encodeURIComponent(req.returnUrl || 'creorga://pos/return')
    const link = `sumupmerchant://pay/1.0?total=${req.amount.toFixed(2)}` +
      `&currency=${req.currency || 'EUR'}` +
      `&title=${encodeURIComponent(req.description || req.orderId)}` +
      `&foreign-tx-id=${req.orderId}` +
      (affiliate ? `&affiliate-key=${affiliate}` : '') +
      `&callback=${callback}`
    return {
      ok: true, provider: 'sumup',
      transactionId: req.orderId,
      redirectUrl: link,
      status: 'awaiting_terminal',
    }
  },
}

// ─── myPOS (terminal + API) ─────────────────────────────────────────────────
const myposGateway: PaymentGateway = {
  provider: 'mypos',
  async charge(req) {
    const sid = process.env.MYPOS_SID || ''
    const wallet = process.env.MYPOS_WALLET || ''
    if (!sid || !wallet) {
      return { ok: false, provider: 'mypos', status: 'failed', error: 'MYPOS credentials missing' }
    }
    // myPOS Glass / Go deep-link
    const link = `mypos://pay?amount=${req.amount.toFixed(2)}` +
      `&currency=${req.currency || 'EUR'}` +
      `&reference=${req.orderId}` +
      `&sid=${sid}&wallet=${wallet}`
    return {
      ok: true, provider: 'mypos',
      transactionId: req.orderId,
      redirectUrl: link,
      status: 'awaiting_terminal',
    }
  },
}

// ─── Viva Wallet (Vevo — redirect checkout) ─────────────────────────────────
const vivaGateway: PaymentGateway = {
  provider: 'viva',
  async charge(req) {
    const merchantId = process.env.VIVA_MERCHANT_ID || ''
    const apiKey = process.env.VIVA_API_KEY || ''
    if (!merchantId || !apiKey) {
      return { ok: false, provider: 'viva', status: 'failed', error: 'VIVA credentials missing' }
    }
    try {
      const base = process.env.VIVA_ENV === 'live'
        ? 'https://api.vivapayments.com'
        : 'https://demo-api.vivapayments.com'
      const auth = Buffer.from(`${merchantId}:${apiKey}`).toString('base64')
      const res = await fetch(`${base}/checkout/v2/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: Math.round(req.amount * 100),
          customerTrns: req.description || req.orderId,
          merchantTrns: req.orderId,
          customer: { email: req.customerEmail },
          allowRecurring: false,
        }),
      })
      const data = await res.json() as { orderCode?: number; ErrorCode?: number; ErrorText?: string }
      if (!data.orderCode) {
        return { ok: false, provider: 'viva', status: 'failed', error: data.ErrorText || 'viva error' }
      }
      const checkoutHost = process.env.VIVA_ENV === 'live'
        ? 'https://www.vivapayments.com'
        : 'https://demo.vivapayments.com'
      return {
        ok: true, provider: 'viva',
        transactionId: String(data.orderCode),
        redirectUrl: `${checkoutHost}/web/checkout?ref=${data.orderCode}`,
        status: 'pending',
      }
    } catch (e: any) {
      return { ok: false, provider: 'viva', status: 'failed', error: e.message }
    }
  },
}

// ─── Worldline (Saferpay / YUMI terminal) ───────────────────────────────────
const worldlineGateway: PaymentGateway = {
  provider: 'worldline',
  async charge(req) {
    const apiUser = process.env.WORLDLINE_API_USER || ''
    const apiPass = process.env.WORLDLINE_API_PASS || ''
    const customerId = process.env.WORLDLINE_CUSTOMER_ID || ''
    if (!apiUser || !apiPass || !customerId) {
      return { ok: false, provider: 'worldline', status: 'failed', error: 'Worldline credentials missing' }
    }
    // For terminal flow → deep-link; for hosted checkout → Saferpay Payment Page
    const auth = Buffer.from(`${apiUser}:${apiPass}`).toString('base64')
    try {
      const res = await fetch('https://www.saferpay.com/api/Payment/v1/PaymentPage/Initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          RequestHeader: { SpecVersion: '1.33', CustomerId: customerId, RequestId: req.orderId, RetryIndicator: 0 },
          TerminalId: req.terminalId || process.env.WORLDLINE_TERMINAL_ID,
          Payment: {
            Amount: { Value: String(Math.round(req.amount * 100)), CurrencyCode: req.currency || 'EUR' },
            OrderId: req.orderId,
            Description: req.description || req.orderId,
          },
          ReturnUrl: { Url: req.returnUrl || 'https://app.creorga.lu/pos?paid=1' },
        }),
      })
      const data = await res.json() as { Token?: string; RedirectUrl?: string; ErrorName?: string }
      if (!data.Token) {
        return { ok: false, provider: 'worldline', status: 'failed', error: data.ErrorName || 'worldline error' }
      }
      return {
        ok: true, provider: 'worldline',
        transactionId: data.Token,
        redirectUrl: data.RedirectUrl,
        status: 'pending',
      }
    } catch (e: any) {
      return { ok: false, provider: 'worldline', status: 'failed', error: e.message }
    }
  },
}

// ─── Servipay (QR-code based LU) ─────────────────────────────────────────────
const servipayGateway: PaymentGateway = {
  provider: 'servipay',
  async charge(req) {
    const merchantId = process.env.SERVIPAY_MERCHANT_ID || ''
    const apiKey = process.env.SERVIPAY_API_KEY || ''
    if (!merchantId || !apiKey) {
      return { ok: false, provider: 'servipay', status: 'failed', error: 'Servipay credentials missing' }
    }
    try {
      const res = await fetch('https://api.servipay.lu/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: Math.round(req.amount * 100),
          currency: req.currency || 'EUR',
          reference: req.orderId,
          description: req.description,
        }),
      })
      const data = await res.json() as { id?: string; qr?: string; url?: string; error?: string }
      if (!data.id) {
        return { ok: false, provider: 'servipay', status: 'failed', error: data.error || 'servipay error' }
      }
      return {
        ok: true, provider: 'servipay',
        transactionId: data.id,
        qrPayload: data.qr,
        redirectUrl: data.url,
        status: 'pending',
      }
    } catch (e: any) {
      return { ok: false, provider: 'servipay', status: 'failed', error: e.message }
    }
  },
}

// ─── Registry + dispatcher ──────────────────────────────────────────────────
const GATEWAYS: Record<PaymentProvider, PaymentGateway> = {
  stripe: stripeGateway,
  sumup: sumupGateway,
  mypos: myposGateway,
  viva: vivaGateway,
  worldline: worldlineGateway,
  servipay: servipayGateway,
}

export function getGateway(provider: PaymentProvider): PaymentGateway {
  return GATEWAYS[provider]
}

export async function charge(req: ChargeRequest): Promise<ChargeResult> {
  const gw = getGateway(req.provider)
  if (!gw) return { ok: false, provider: req.provider, status: 'failed', error: 'unknown provider' }
  return gw.charge(req)
}

export const SUPPORTED_PROVIDERS: PaymentProvider[] = [
  'stripe', 'sumup', 'mypos', 'viva', 'worldline', 'servipay',
]
