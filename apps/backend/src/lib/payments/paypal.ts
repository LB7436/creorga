import { moneyMinor } from '../money'
import type { ChargeRequest, ChargeResult, PaymentEvidence, PaymentGateway } from './gateway'

export class PayPalClient {
  private token = ''
  private expires = 0
  private readonly base: string
  private readonly merchant: string
  private readonly clientId: string
  private readonly secret: string
  constructor() {
    const environment = process.env.PAYPAL_ENV || 'sandbox'
    if (!['sandbox', 'live'].includes(environment) || (environment === 'live' && process.env.PAYPAL_LIVE_ENABLED !== 'true')) throw new Error('PayPal live non activé.')
    this.base = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
    this.clientId = process.env.PAYPAL_CLIENT_ID || ''; this.secret = process.env.PAYPAL_CLIENT_SECRET || ''; this.merchant = process.env.PAYPAL_MERCHANT_ID || ''
    if (!this.clientId || !this.secret || !this.merchant) throw new Error('PayPal non configuré.')
  }
  private async accessToken() {
    if (this.token && Date.now() < this.expires) return this.token
    const response = await fetch(this.base + '/v1/oauth2/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Basic ' + Buffer.from(`${this.clientId}:${this.secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' })
    if (!response.ok) throw new Error('Autorisation PayPal impossible.')
    const body = await response.json() as any
    if (typeof body.access_token !== 'string') throw new Error('Réponse OAuth PayPal invalide.')
    this.token = body.access_token; this.expires = Date.now() + Math.max(0, Math.min(3600, Number(body.expires_in) || 300) - 30) * 1000
    return this.token
  }
  private async api(endpoint: string, method = 'GET', body?: unknown, key?: string) {
    const token = await this.accessToken()
    const response = await fetch(this.base + endpoint, { method, redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(key ? { 'PayPal-Request-Id': key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error('Résultat PayPal non confirmé.')
    return response.json() as Promise<any>
  }
  async create(input: ChargeRequest): Promise<ChargeResult> {
    if (!input.requestId || !input.metadata?.attemptId) throw new Error('Référence de tentative PayPal obligatoire.')
    const body = await this.api('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE', purchase_units: [{ reference_id: input.orderId, custom_id: input.metadata.attemptId,
        payee: { merchant_id: this.merchant }, amount: { currency_code: input.currency || 'EUR', value: (moneyMinor(input.amount) / 100).toFixed(2) } }],
      payment_source: { paypal: { experience_context: { user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', return_url: input.returnUrl, cancel_url: input.cancelUrl } } },
    }, input.requestId)
    const redirectUrl = body.links?.find((link: any) => ['payer-action', 'approve'].includes(link.rel))?.href
    if (typeof body.id !== 'string' || typeof redirectUrl !== 'string') throw new Error('Commande PayPal sans référence ou lien d’approbation.')
    const url = new URL(redirectUrl)
    if (url.protocol !== 'https:' || !['www.sandbox.paypal.com', 'www.paypal.com'].includes(url.hostname) || url.username || url.password) throw new Error('Lien PayPal inattendu.')
    return { ok: true, provider: 'paypal', transactionId: body.id, redirectUrl, status: 'pending' }
  }
  async verify(id: string): Promise<ChargeResult> {
    const body = await this.api('/v2/checkout/orders/' + encodeURIComponent(id))
    if (body.id !== id) throw new Error('Référence PayPal incohérente.')
    if (body.status !== 'COMPLETED') return { ok: false, provider: 'paypal', transactionId: id, status: 'pending' }
    const unit = body.purchase_units?.[0], captures = unit?.payments?.captures
    if (body.purchase_units?.length !== 1 || captures?.length !== 1 || captures[0].status !== 'COMPLETED') throw new Error('Capture PayPal ambiguë ou non aboutie.')
    const capture = captures[0]
    const evidence: PaymentEvidence = { amountCents: moneyMinor(capture.amount?.value), currency: capture.amount?.currency_code,
      merchantId: unit.payee?.merchant_id, orderId: unit.reference_id, attemptId: unit.custom_id, captureId: capture.id }
    if (evidence.merchantId !== this.merchant) throw new Error('Compte marchand PayPal incohérent.')
    return { ok: true, provider: 'paypal', transactionId: id, status: 'succeeded', evidence }
  }
  async capture(id: string, key: string) {
    const current = await this.verify(id)
    if (current.status === 'succeeded') return current
    await this.api('/v2/checkout/orders/' + encodeURIComponent(id) + '/capture', 'POST', {}, key)
    // Relire l'ordre complet : la réponse de capture seule peut omettre le payee/custom_id.
    return this.verify(id)
  }
  async verifyWebhook(headers: Record<string, unknown>, event: unknown) {
    const names = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']
    if (!process.env.PAYPAL_WEBHOOK_ID || names.some(name => typeof headers[name] !== 'string' || !headers[name])) return false
    const cert = new URL(String(headers['paypal-cert-url']))
    if (cert.protocol !== 'https:' || !(cert.hostname === 'paypal.com' || cert.hostname.endsWith('.paypal.com')) || cert.username || cert.password) return false
    const response = await this.api('/v1/notifications/verify-webhook-signature', 'POST', {
      auth_algo: headers['paypal-auth-algo'], cert_url: cert.href, transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event,
    })
    return response.verification_status === 'SUCCESS'
  }
}
export const paypalGateway: PaymentGateway = {
  provider: 'paypal',
  async charge(input) {
    try { return await new PayPalClient().create(input) }
    catch { return { ok: false, provider: 'paypal', status: 'failed', error: 'PayPal non configuré ou résultat de création inconnu.' } }
  },
  verify(id) { return new PayPalClient().verify(id) },
  capture(id, key) { return new PayPalClient().capture(id, key) },
}
