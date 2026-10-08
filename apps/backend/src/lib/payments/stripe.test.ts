import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStripeGateway } from './gateway'

// Contrat du SDK remplacé ; aucune requête réseau ni clé bancaire.
const session = () => ({ id: 'cs_test_fixture', mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 2400,
  currency: 'eur', payment_intent: 'pi_fixture', metadata: { companyId: 'company-test', orderId: 'order-test', attemptId: 'attempt-test' } })
const intent = () => ({ id: 'pi_fixture', status: 'succeeded', amount: 2400, amount_received: 2400, currency: 'eur',
  metadata: { companyId: 'company-test', orderId: 'order-test', attemptId: 'attempt-test' } })
let checkout: any, payment: any
const client = { checkout: { sessions: { retrieve: vi.fn(async () => checkout), create: vi.fn(async () => ({ id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/fixture' })) } },
  paymentIntents: { retrieve: vi.fn(async () => payment) }, accounts: { retrieveCurrent: vi.fn(async () => ({ id: 'acct_fixture' })) } }
const gateway = createStripeGateway(client as any)
beforeEach(() => { checkout = session(); payment = intent(); vi.clearAllMocks() })
describe('Stripe : capture réelle et contrat de création', () => {
  it.each(['requires_capture', 'processing', 'requires_payment_method'])('un checkout payé avec un PaymentIntent %s ne confirme pas une capture', async status => {
    payment.status = status
    expect((await gateway.verify!('cs_test_fixture')).status).not.toBe('succeeded')
  })
  it.each([{ amount_received: 1 }, { currency: 'usd' }, { metadata: { orderId: 'other-order' } }])('rejette une incohérence entre checkout et capture %j', async mismatch => {
    Object.assign(payment, mismatch)
    expect((await gateway.verify!('cs_test_fixture')).evidence).toBeUndefined()
  })
  it('produit une preuve uniquement pour une capture cohérente', async () => {
    expect((await gateway.verify!('cs_test_fixture')).evidence).toEqual({ amountCents: 2400, currency: 'EUR', merchantId: 'acct_fixture', orderId: 'order-test', attemptId: 'attempt-test', captureId: 'pi_fixture' })
    expect(client.paymentIntents.retrieve).toHaveBeenCalledWith('pi_fixture')
  })
  it('copie les références serveur sur le checkout et le paiement, avec idempotence', async () => {
    await gateway.charge({ provider: 'stripe', requestId: 'request-test', orderId: 'order-test', amount: 24, currency: 'EUR', metadata: { companyId: 'company-test', attemptId: 'attempt-test' }, returnUrl: 'http://localhost/return', cancelUrl: 'http://localhost/cancel' })
    const [params, options] = client.checkout.sessions.create.mock.calls[0] as any
    expect(params.payment_method_types).toBeUndefined()
    expect(params.payment_intent_data.metadata).toEqual(params.metadata)
    expect(options.idempotencyKey).toBe('request-test')
  })
})
