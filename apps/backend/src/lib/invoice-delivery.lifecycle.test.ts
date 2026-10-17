import { describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ calls: 0, release: null as null | (() => void) }))
vi.mock('./prisma', () => ({ default: { invoiceDelivery: { updateMany: async () => {
  fixture.calls++
  await new Promise<void>(resolve => { fixture.release = resolve })
  return { count: 0 }
} } } }))
vi.mock('./email', () => ({ emailConfigured: () => false, sendEmail: () => { throw new Error('Aucun envoi autorisé') } }))
vi.mock('./pos-ledger', () => ({ escapeHtml: (value: string) => value }))
import { processInvoiceDeliveries, pauseInvoiceDeliveries, drainInvoiceDeliveries } from './invoice-delivery'

describe('arrêt de la file de documents', () => {
  it('attend le travail admis et ne commence pas un nouveau traitement après le gel', async () => {
    const active = processInvoiceDeliveries()
    await vi.waitFor(() => expect(fixture.release).toBeTypeOf('function'))
    pauseInvoiceDeliveries()
    let drained = false
    const waiting = drainInvoiceDeliveries().then(() => { drained = true })
    await Promise.resolve(); await Promise.resolve()
    expect(drained).toBe(false)
    await processInvoiceDeliveries()
    expect(fixture.calls).toBe(1)
    fixture.release!()
    await active; await waiting
    expect(drained).toBe(true)
  })
})
