import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGateway, SUPPORTED_PROVIDERS, type PaymentProvider } from './gateway'

// Réponses HTTP fictives du prestataire : aucune clé bancaire, aucun réseau externe.
const posted: any[] = []
let paymentStatus = 'COMPLETED', merchant = 'merchant-test', amount = '24.00'
const orderFixture = () => ({ id: 'PAYPAL-ORDER', status: paymentStatus, purchase_units: [{ reference_id: 'restaurant-order', custom_id: 'attempt-test',
  payee: { merchant_id: merchant }, payments: { captures: [{ id: 'CAPTURE-TEST', status: paymentStatus, amount: { value: amount, currency_code: 'EUR' } }] } }] })
beforeEach(() => {
  vi.stubEnv('PAYPAL_CLIENT_ID', 'fixture-only'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'fixture-only'); vi.stubEnv('PAYPAL_MERCHANT_ID', 'merchant-test'); vi.stubEnv('PAYPAL_ENV', 'sandbox')
  posted.length = 0; paymentStatus = 'COMPLETED'; merchant = 'merchant-test'; amount = '24.00'
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/v1/oauth2/token')) return new Response(JSON.stringify({ access_token: 'fixture-only', expires_in: 300 }), { status: 200 })
    if (init?.method === 'POST') posted.push({ url, body: JSON.parse(String(init.body)), headers: init.headers })
    if (url.endsWith('/v2/checkout/orders') && init?.method === 'POST') return new Response(JSON.stringify({ id: 'PAYPAL-ORDER', status: 'CREATED', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER' }] }), { status: 201 })
    return new Response(JSON.stringify(orderFixture()), { status: 200 })
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
describe('Connecteur PayPal — contrat HTTP simulé', () => {
  it('déclare PayPal comme connecteur disponible à configurer', () => {
    expect(SUPPORTED_PROVIDERS).toContain('paypal')
  })
  it('crée en sandbox avec une clé stable et n’annonce pas un paiement', async () => {
    const gateway = getGateway('paypal' as PaymentProvider)
    expect(gateway).toBeDefined()
    const result = await gateway.charge({ provider: 'paypal' as PaymentProvider, requestId: '123e4567-e89b-12d3-a456-426614174000', amount: 24, currency: 'EUR', orderId: 'restaurant-order', metadata: { attemptId: 'attempt-test' }, returnUrl: 'http://localhost:5174/return', cancelUrl: 'http://localhost:5174/cancel' })
    expect(result.status).toBe('pending')
    expect(posted[0].url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders')
    expect(new Headers(posted[0].headers).get('PayPal-Request-Id')).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(posted[0].body.purchase_units[0]).toMatchObject({ reference_id: 'restaurant-order', custom_id: 'attempt-test', payee: { merchant_id: 'merchant-test' }, amount: { value: '24.00', currency_code: 'EUR' } })
  })
  it('une approbation sans capture reste en attente', async () => {
    paymentStatus = 'APPROVED'
    const gateway = getGateway('paypal' as PaymentProvider)
    expect(gateway).toBeDefined()
    expect((await gateway.verify!('PAYPAL-ORDER')).status).toBe('pending')
  })
  it('ramène une preuve structurée de montant, devise, marchand et références', async () => {
    const gateway = getGateway('paypal' as PaymentProvider)
    expect(gateway).toBeDefined()
    const result = await gateway.verify!('PAYPAL-ORDER')
    expect((result as any).evidence).toEqual({ amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: 'restaurant-order', attemptId: 'attempt-test', captureId: 'CAPTURE-TEST' })
    expect(result.status).toBe('succeeded')
    expect(result.raw).toBeUndefined()
  })
  it('refuse l’utilisation du compte live sans activation explicite', async () => {
    vi.stubEnv('PAYPAL_ENV', 'live')
    const gateway = getGateway('paypal' as PaymentProvider)
    expect(gateway).toBeDefined()
    expect((await gateway.charge({ provider: 'paypal' as PaymentProvider, amount: 24, orderId: 'restaurant-order' })).ok).toBe(false)
    expect(posted).toHaveLength(0)
  })
})
