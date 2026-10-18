import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'express'
import { EventEmitter } from 'node:events'

const fixtures = vi.hoisted(() => {
  const delegate = () => ({ findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() })
  const db: any = { $queryRaw: vi.fn(), $transaction: vi.fn() }
  for (const model of ['product', 'posCoverPayment', 'order', 'table', 'saleOrigin', 'serviceShare', 'serviceAllocation', 'orderItem', 'serviceCover', 'userCompany', 'posSale', 'posClosure', 'companySettings', 'reservation', 'ingredient', 'recipe', 'customer', 'cashDrawer', 'invoice', 'invoiceDocumentLink', 'invoiceDelivery', 'creditNote', 'manualRefund', 'refundAttempt', 'paymentAttempt', 'paymentAllocation', 'orderTender', 'paymentSettlement', 'cashMovement', 'bankPayout', 'payoutDecision', 'payoutStatement']) db[model] = delegate()
  return { db, report: vi.fn(), floor: { tables: [], chairs: [], zones: [], updatedAt: 1 }, mail: vi.fn() }
})
vi.mock('../lib/prisma', () => ({ default: fixtures.db }))
vi.mock('../lib/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock('../lib/email', () => ({ sendEmail: fixtures.mail, emailConfigured: () => true }))
vi.mock('./floorState', () => ({
  getFloorState: () => fixtures.floor, currentFloorCompanyId: () => 'company-a',
  lockFloorForPayment: () => () => {}, prepareFloorPricing: vi.fn(), setReviewedFloorQuote: vi.fn(), commitCurrentFloor: vi.fn(),
}))
vi.mock('../lib/cash-ledger', () => ({ cashDrawerReport: fixtures.report, activeCashDrawerId: vi.fn() }))
vi.mock('../middleware/requireCompany', () => ({
  requireCompany: (_req: any, _res: any, next: any) => next(),
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => roles.includes(req.role) ? next() : res.status(403).json({ error: 'Refus de rôle' }),
}))

import pos from './pos'
import inventory from './inventory'
import crm from './crm'
import orders from './orders'
import cash from './cashLedger'
import accounting from './accounting'
import { listInvoiceDocumentLinks } from '../lib/invoice-document-links'
import { createCreditNote } from '../lib/credit-notes'
import { enqueueInvoice, processInvoiceDeliveries } from '../lib/invoice-delivery'
import { declareManualRefund } from '../lib/payments/manual-refunds'
import { requestRefund } from '../lib/payments/refunds'
import { createPayment } from '../lib/payments/ledger'
import { refreshPayout } from '../lib/bank-payouts'
import { floorHash } from '../lib/floor-workspace'

function application(router: Router, capabilities: Record<string, boolean> = {}, role = 'EMPLOYEE') {
  return { router, capabilities, role }
}

// Le vrai routeur Express est parcouru en mémoire ; aucun port ni runtime métier.
function request(app: ReturnType<typeof application>) {
  const endpoint = (method: string, url: string) => {
    let body: unknown = {}
    const call = {
      send(value: unknown) { body = value; return call },
      async expect(status: number) {
        const result = await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const parsed = new URL(url, 'http://fixture.test')
          const req: any = Object.assign(new EventEmitter(), { method, url, originalUrl: url, headers: {}, body, query: Object.fromEntries(parsed.searchParams),
            companyId: 'company-a', company: { id: 'company-a', name: 'Établissement fictif' }, user: { userId: 'actor-a' }, role: app.role,
            businessAccess: { role: app.role, capabilities: Object.keys(app.capabilities).filter(key => app.capabilities[key]), revision: 'test', version: 0 },
            get: (key: string) => req.headers[key.toLowerCase()] })
          const res: any = Object.assign(new EventEmitter(), { writableEnded: false, statusCode: 200, status(value: number) { res.statusCode = value; return res },
            set() { return res }, type() { return res }, setHeader() {},
            json(value: unknown) { res.writableEnded = true; resolve({ status: res.statusCode, body: JSON.parse(JSON.stringify(value)) }); return res },
            send(value: unknown) { res.writableEnded = true; resolve({ status: res.statusCode, body: value }); return res } })
          app.router(req, res, (error: unknown) => error ? reject(error) : resolve({ status: 404, body: null }))
        })
        expect(result.status).toBe(status)
        return result
      },
    }
    return call
  }
  return { get: (url: string) => endpoint('GET', url), post: (url: string) => endpoint('POST', url), put: (url: string) => endpoint('PUT', url),
    delete: (url: string) => endpoint('DELETE', url), patch: (url: string) => endpoint('PATCH', url) }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const value of Object.values(fixtures.db) as any[]) {
    if (typeof value !== 'object') continue
    value.findMany.mockResolvedValue([]); value.findFirst.mockResolvedValue(null)
    value.findUnique.mockResolvedValue(null); value.count.mockResolvedValue(0)
    value.updateMany.mockResolvedValue({ count: 1 })
  }
  fixtures.db.$transaction.mockImplementation((work: any) => work(fixtures.db))
  fixtures.db.$queryRaw.mockResolvedValue([{ role: 'CASHIER', capabilities: {}, accessVersion: 0, isActive: true }])
  fixtures.floor.tables = []
})

describe('Projections financières selon les droits de l’adhésion', () => {
  it('le bootstrap salarié ne lit aucun historique financier et conserve son vrai rôle', async () => {
    fixtures.db.userCompany.findMany.mockResolvedValue([{ userId: 'actor-a', role: 'EMPLOYEE', user: { firstName: 'Équipe', lastName: 'Test' } }])
    fixtures.db.posSale.findMany.mockResolvedValue([{ snapshot: { total: 12345 } }])
    fixtures.db.posClosure.findMany.mockResolvedValue([{ snapshot: { totalTTC: 67890 } }])
    const result = await request(application(pos)).get('/bootstrap').expect(200)
    expect(result.body.ventes).toEqual([]); expect(result.body.clotures).toEqual([])
    expect(result.body.currentStaff.role).toBe('EMPLOYEE')
    expect(result.body.businessAccess.role).toBe('EMPLOYEE')
    expect(fixtures.db.posSale.findMany).not.toHaveBeenCalled()
    expect(fixtures.db.posClosure.findMany).not.toHaveBeenCalled()
  })

  it('un grant explicite restitue les ventes et clôtures sans changer le rôle', async () => {
    fixtures.db.posSale.findMany.mockResolvedValue([{ snapshot: { total: 12 } }])
    fixtures.db.posClosure.findMany.mockResolvedValue([{ snapshot: { totalTTC: 34 } }])
    const result = await request(application(pos, { 'finance.revenue.read': true })).get('/bootstrap').expect(200)
    expect(result.body.ventes).toEqual([{ total: 12 }]); expect(result.body.clotures).toEqual([{ totalTTC: 34 }])
  })

  it('le bootstrap ne réexpose pas les anciens couverts payés dans le champ brut du plan', async () => {
    ;(fixtures.floor as any).tables = [{ id: 'table-a', name: 'Table', section: 'Salle', status: 'LIBRE', items: [],
      posCovers: [{ id: 'paid-cover', paidAt: 123, items: [{ id: 'line-paid', price: 9876, qty: 1 }] }] }]
    const result = await request(application(pos)).get('/bootstrap').expect(200)
    expect(result.body.tables[0]).not.toHaveProperty('posCovers')
    expect(result.body.tables[0].covers).toEqual([])
  })

  it('le bootstrap ne ressuscite pas un miroir de couvert fermé dans l’autorité SQL', async () => {
    ;(fixtures.floor as any).tables = [{ id: 'table-a', name: 'Table', section: 'Salle', status: 'LIBRE', items: [],
      posCovers: [{ id: 'closed-cover', label: 'Ancien', items: [{ id: 'closed-line', name: 'Ancien', price: 9876, qty: 1 }] }] }]
    fixtures.db.serviceCover.findMany.mockImplementation(async (query: any) => query.where.state?.not === 'OPEN' ? [{ coverId: 'closed-cover' }] : [])
    const result = await request(application(pos)).get('/bootstrap').expect(200)
    expect(result.body.tables[0].covers).toEqual([])
    expect(JSON.stringify(result.body)).not.toContain('closed-line')
  })

  it('le rôle MANAGER ne contourne pas un retrait explicite de lecture du CA', async () => {
    const result = await request(application(pos, {}, 'MANAGER')).get('/bootstrap').expect(200)
    expect(result.body.ventes).toEqual([])
    expect(fixtures.db.posSale.findMany).not.toHaveBeenCalled()
  })

  it('un opérateur conserve la récupération exacte de son propre règlement après réponse perdue', async () => {
    fixtures.db.posSale.findFirst.mockImplementation(async (query: any) => query.where.userId === 'actor-a' ? { snapshot: { id: 'sale-a', total: 12 } } : null)
    const result = await request(application(pos)).get('/sales/sale-a').expect(200)
    expect(result.body).toEqual({ id: 'sale-a', total: 12 })
  })

  it('un reçu et son envoi refusent la vente d’un autre opérateur sans droit financier', async () => {
    fixtures.db.posSale.findFirst.mockImplementation(async (query: any) => query.where.userId === 'actor-a' ? null : { id: 'sale-b', userId: 'actor-b', snapshot: {} })
    await request(application(pos)).get('/sales/sale-b/receipt').expect(404)
    await request(application(pos)).post('/sales/sale-b/email').send({ requestId: '11111111-1111-4111-8111-111111111111', to: 'fictif@example.test' }).expect(404)
    expect(fixtures.mail).not.toHaveBeenCalled()
  })

  it('les coûts sont omis des ingrédients et des ingrédients imbriqués dans une recette', async () => {
    const ingredient = { id: 'ingredient-a', name: 'Farine', costPerUnit: 987.65, currentStock: 10, minStockLevel: 2 }
    fixtures.db.ingredient.findMany.mockResolvedValue([ingredient])
    fixtures.db.product.findFirst.mockResolvedValue({ id: 'product-a' })
    fixtures.db.recipe.findMany.mockResolvedValue([{ id: 'recipe-a', quantity: 1, ingredient }])
    const ingredientResult = await request(application(inventory)).get('/ingredients').expect(200)
    const recipeResult = await request(application(inventory)).get('/recipes/product-a').expect(200)
    expect(ingredientResult.body[0]).not.toHaveProperty('costPerUnit')
    expect(ingredientResult.body[0].currentStock).toBe(10)
    expect(recipeResult.body[0].ingredient).not.toHaveProperty('costPerUnit')
  })

  it('la lecture des quantités ne contourne pas le droit fournisseurs via une relation imbriquée', async () => {
    const supplier = { id: 'supplier-a', companyId: 'company-a', name: 'Fournisseur fictif',
      contactName: 'Contact privé fictif', email: 'fournisseur@localhost.invalid', notes: 'Conditions commerciales fictives' }
    fixtures.db.ingredient.findMany.mockResolvedValue([{ id: 'ingredient-a', name: 'Farine', costPerUnit: 987.65,
      currentStock: 10, minStockLevel: 2, supplierId: supplier.id, supplier }])
    const result = await request(application(inventory)).get('/ingredients').expect(200)
    expect(fixtures.db.ingredient.findMany.mock.calls[0][0].select.supplier).toBe(false)
    expect(result.body[0]).not.toHaveProperty('supplier')
    expect(result.body[0]).not.toHaveProperty('costPerUnit')
    expect(result.body[0]).toMatchObject({ id: 'ingredient-a', currentStock: 10, supplierId: 'supplier-a' })
  })

  it('la lecture des coûts conserve le fournisseur autorisé sans changer les données stockées', async () => {
    const supplier = { id: 'supplier-a', companyId: 'company-a', name: 'Fournisseur fictif', notes: 'Conditions fictives' }
    const ingredient = { id: 'ingredient-a', name: 'Farine', costPerUnit: 2.75, currentStock: 10, minStockLevel: 2, supplier }
    fixtures.db.ingredient.findMany.mockResolvedValue([ingredient])
    const result = await request(application(inventory, { 'finance.costs.read': true })).get('/ingredients').expect(200)
    expect(fixtures.db.ingredient.findMany.mock.calls[0][0].select.supplier).toBe(true)
    expect(result.body[0]).toMatchObject({ costPerUnit: 2.75, supplier })
    expect(ingredient).toMatchObject({ costPerUnit: 2.75, supplier })
  })

  it('le CRM ne retourne ni portefeuille ni commandes payées ni transactions de fidélité financières', async () => {
    const customer = { id: 'customer-a', firstName: 'Client', walletBalance: 876.54,
      orders: [{ id: 'paid', status: 'PAID', paidAt: new Date(), total: 123 }, { id: 'open', status: 'OPEN', paidAt: null, total: 4 }],
      loyaltyTransactions: [{ id: 'loyalty', amount: 500 }] }
    fixtures.db.customer.findMany.mockResolvedValue([customer]); fixtures.db.customer.findFirst.mockResolvedValue(customer)
    const list = await request(application(crm)).get('/customers').expect(200)
    const detail = await request(application(crm)).get('/customers/customer-a').expect(200)
    for (const value of [list.body.customers[0], detail.body]) {
      expect(value).not.toHaveProperty('walletBalance')
      expect(value.orders?.some((order: any) => order.id === 'paid')).not.toBe(true)
      expect(value.loyaltyTransactions).toBeUndefined()
    }
  })

  it('le filtre PAID demandé ne remplace jamais le filtre serveur des commandes ouvertes', async () => {
    await request(application(orders)).get('/?status=PAID').expect(200)
    expect(fixtures.db.order.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'company-a', AND: [{ status: 'PAID' }, { paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }] })
  })

  it('le droit de modifier les prix ne permet pas de modifier le stock par import catalogue', async () => {
    await request(application(pos, { 'catalog.prices.write': true })).post('/catalog-import').send({
      products: [{ id: 'product-a', name: 'Produit test', category: 'Catégorie', price: 5, taxRate: 10, stock: 100 }],
    }).expect(403)
    expect(fixtures.db.$transaction).not.toHaveBeenCalled()
  })

  it('réduire ou supprimer une ligne native requiert orders.cancel, même avec service.manage', async () => {
    const line = { id: 'line-a', menuItemId: 'product-a', name: 'Fictif', price: 5, qty: 2, note: '', coverId: 'cover-a', addedAt: 1 }
    const table = { id: 'table-a', name: 'Table', shape: 'round', seats: 2, x: 0, y: 0, status: 'OCCUPEE', section: 'Salle', mergedWith: [], items: [line], posCovers: [{ id: 'cover-a', label: 'Client', items: [line] }] }
    ;(fixtures.floor as any).tables = [table]
    for (const items of [[], [{ ...line, qty: 1 }]]) {
      await request(application(pos, { 'service.manage': true })).put('/draft').send({
        tables: [{ ...table, status: 'occupied', covers: [{ id: 'cover-a', label: 'Client', items }] }],
      }).expect(403)
      expect((fixtures.floor as any).tables[0].posCovers[0].items[0].qty).toBe(2)
    }
  })

  it('orders et cuisine ne contournent pas le refus d’annulation du brouillon', async () => {
    fixtures.db.order.findFirst.mockResolvedValue({ id: 'order-a', status: 'OPEN', paidAt: null })
    fixtures.db.orderItem.findFirst.mockResolvedValue({ id: 'item-a', quantity: 3, status: 'PENDING' })
    const rights = { 'service.manage': true }
    await request(application(orders, rights)).put('/order-a/items/item-a').send({ quantity: 1 }).expect(403)
    await request(application(orders, rights)).delete('/order-a/items/item-a').expect(403)
    await request(application(pos, rights)).patch('/kitchen/ticket-a').send({ status: 'cancelled', updatedAt: 1 }).expect(403)
    expect(fixtures.db.orderItem.update).not.toHaveBeenCalled()
  })

  it.each([
    ['avoir', () => createCreditNote('company-a', 'actor-a', 'invoice-a', { requestId: '11111111-1111-4111-8111-111111111111', reason: 'Correction fictive', amountCents: 100 })],
    ['remboursement manuel', () => declareManualRefund('company-a', 'actor-a', { requestId: '11111111-1111-4111-8111-111111111111', creditNoteId: 'credit-a', tenderId: 'tender-a', method: 'CARD', amountCents: 100, reason: 'Correction fictive', reference: 'FICTIF' })],
    ['remboursement prestataire', () => requestRefund('company-a', 'actor-a', { requestId: '11111111-1111-4111-8111-111111111111', creditNoteId: 'credit-a', settlementId: 'settlement-a', amountCents: 100, reason: 'Correction fictive' })],
    ['encaissement prestataire', () => createPayment('company-a', 'actor-a', { requestId: '11111111-1111-4111-8111-111111111111', provider: 'sumup', orderId: 'order-a' })],
    ['envoi facture', () => enqueueInvoice('company-a', 'actor-a', 'invoice-a', { requestId: '11111111-1111-4111-8111-111111111111', to: 'fictif@localhost.invalid' })],
  ])('le service %s refuse un droit retiré avant même une relecture idempotente', async (_label, action) => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'EMPLOYEE', capabilities: {}, accessVersion: 2, isActive: true }])
    await expect((action as () => Promise<unknown>)()).rejects.toMatchObject({ status: 403 })
    expect(fixtures.db.invoice.findFirst).not.toHaveBeenCalled()
    expect(fixtures.db.manualRefund.findUnique).not.toHaveBeenCalled()
    expect(fixtures.db.refundAttempt.findUnique).not.toHaveBeenCalled()
    expect(fixtures.db.paymentAttempt.findUnique).not.toHaveBeenCalled()
    expect(fixtures.db.invoiceDelivery.create).not.toHaveBeenCalled()
  })

  it('une facture en file ne part pas après révocation de son émetteur', async () => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'EMPLOYEE', capabilities: {}, accessVersion: 2, isActive: true }])
    fixtures.db.invoiceDelivery.findMany.mockResolvedValue([{ id: 'job-a', companyId: 'company-a', userId: 'actor-a', invoiceId: 'invoice-a', status: 'QUEUED' }])
    await processInvoiceDeliveries()
    expect(fixtures.mail).not.toHaveBeenCalled()
    expect(fixtures.db.invoiceDelivery.update).toHaveBeenCalledWith({ where: { id: 'job-a' }, data: { status: 'FAILED', lastErrorCode: 'ACCESS_REVOKED' } })
    expect(fixtures.db.invoice.findFirst).not.toHaveBeenCalled()
  })

  it.each(['/document-journal', '/reconciliation', '/payouts', '/payouts/payout-a/history'])('le rôle MANAGER seul ne permet plus la lecture comptable %s', async url => {
    await request(application(accounting, {}, 'MANAGER')).get(url).expect(403)
    expect(fixtures.db.$transaction).not.toHaveBeenCalled()
    expect(fixtures.db.bankPayout.findFirst).not.toHaveBeenCalled()
  })

  it.each(['/document-journal', '/reconciliation', '/payouts', '/payouts/payout-a/history'])('un grant explicite autorise la lecture comptable %s sans alias MANAGER', async url => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'EMPLOYEE', capabilities: { 'finance.revenue.read': true }, accessVersion: 1, isActive: true }])
    fixtures.db.bankPayout.findFirst.mockResolvedValue({ id: 'payout-a' })
    await request(application(accounting, { 'finance.revenue.read': true })).get(url).expect(200)
  })

  it('le CSV requiert exports.read en plus de la lecture comptable', async () => {
    await request(application(accounting, { 'finance.revenue.read': true }, 'MANAGER')).get('/reconciliation?format=csv').expect(403)
    expect(fixtures.db.$transaction).not.toHaveBeenCalled()
  })

  it.each(['/document-journal', '/reconciliation', '/payouts', '/payouts/payout-a/history'])('la lecture %s revalide l’adhésion dans sa transaction', async url => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'MANAGER', capabilities: { 'finance.revenue.read': false }, accessVersion: 2, isActive: true }])
    await request(application(accounting, { 'finance.revenue.read': true }, 'MANAGER')).get(url).expect(403)
    expect(fixtures.db.invoice.findMany).not.toHaveBeenCalled()
    expect(fixtures.db.bankPayout.findMany).not.toHaveBeenCalled()
    expect(fixtures.db.bankPayout.findFirst).not.toHaveBeenCalled()
  })

  it('finance.manage révoqué sous verrou bloque le service de rapprochement avant le replay', async () => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'MANAGER', capabilities: { 'finance.manage': false }, accessVersion: 2, isActive: true }])
    await expect(refreshPayout('company-a', 'actor-a', 'payout-a', { requestId: '11111111-1111-4111-8111-111111111111', reason: 'Fictif contrôle' })).rejects.toMatchObject({ status: 403 })
    expect(fixtures.db.payoutDecision.findUnique).not.toHaveBeenCalled()
    expect(fixtures.db.bankPayout.findFirst).not.toHaveBeenCalled()
  })

  it('un rejeu de rapprochement ne divulgue pas son montant si la lecture financière a été retirée pendant l’attente', async () => {
    const input = { requestId: '11111111-1111-4111-8111-111111111111', reason: 'Relecture fictive' }
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'EMPLOYEE', capabilities: { 'finance.manage': true, 'finance.revenue.read': false }, accessVersion: 2, isActive: true }])
    fixtures.db.payoutDecision.findUnique.mockResolvedValue({ companyId: 'company-a', requestHash: floorHash({ companyId: 'company-a', actorId: 'actor-a', id: 'payout-a', action: 'REFRESH', ...input }),
      snapshot: { result: { id: 'payout-a', status: 'IMPORTED', confirmation: 'not_reconciled', computedNetCents: 98765, lines: [{ amountCents: 98765 }] } } })
    const result = await request(application(accounting, { 'finance.manage': true, 'finance.revenue.read': true })).post('/payouts/payout-a/refresh').send(input).expect(200)
    expect(result.body).toEqual({ id: 'payout-a', status: 'IMPORTED', confirmation: 'not_reconciled', source: 'FICTIONAL_DECLARATION', financialDetailsRestricted: true })
    expect(fixtures.db.payoutDecision.create).not.toHaveBeenCalled()
  })

  it('le rapport caissier permet le comptage espèces sans paiements, ventes ni agrégats cartes', async () => {
    fixtures.db.cashDrawer.findFirst.mockResolvedValue({ id: 'drawer-a', ledgerVersion: 2 })
    fixtures.report.mockResolvedValue({ drawerId: 'drawer-a', version: 2, openingCents: 10000, cashReceiptsCents: 2000, movementInCents: 0, movementOutCents: 0, expectedCents: 12000,
      byMethod: { CASH: 2000, CARD: 98765 }, payments: [{ orderId: 'other', amountCents: 98765 }], tipCents: 99, charityCents: 12 })
    const result = await request(application(cash, { 'cash.close': true }, 'CASHIER')).get('/drawer-a/report').expect(200)
    expect(result.body.expectedCents).toBe(12000)
    for (const field of ['byMethod', 'payments', 'tipCents', 'charityCents']) expect(result.body).not.toHaveProperty(field)
  })

  it('une révocation de clôture après attente du verrou empêche la mutation', async () => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'CASHIER', capabilities: { 'cash.close': false }, accessVersion: 2, isActive: true }])
    await request(application(cash, { 'cash.close': true }, 'CASHIER')).put('/drawer-a/close').send({ closeAmount: 100 }).expect(403)
    expect(fixtures.db.cashDrawer.update).not.toHaveBeenCalled()
    expect(fixtures.db.$queryRaw).toHaveBeenCalled()
  })

  it('la liste opérationnelle du caissier et l’ACK de clôture ne contiennent aucun snapshot de ventes', async () => {
    const drawer = { id: 'drawer-a', ledgerVersion: 2, openAmount: 100, totalSales: 98765, closeSnapshot: { byMethod: { CARD: 45678 }, payments: [{ orderId: 'secret-sale' }] } }
    fixtures.db.cashDrawer.findMany.mockResolvedValue([drawer])
    const list = await request(application(accounting, { 'cash.close': true }, 'CASHIER')).get('/cash-drawers').expect(200)
    expect(fixtures.db.cashDrawer.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'company-a', closedAt: null })
    expect(list.body[0]).not.toHaveProperty('totalSales'); expect(list.body[0]).not.toHaveProperty('closeSnapshot')
    fixtures.db.cashDrawer.findFirst.mockResolvedValue({ ...drawer, closeSnapshot: null })
    fixtures.db.cashDrawer.update.mockResolvedValue({ ...drawer, closedAt: new Date(), closeAmount: 100, discrepancy: 0 })
    fixtures.report.mockResolvedValue({ expectedCents: 10000, cashReceiptsCents: 0, byMethod: { CARD: 45678 }, payments: [{ orderId: 'secret-sale' }] })
    const closed = await request(application(cash, { 'cash.close': true }, 'CASHIER')).put('/drawer-a/close').send({ closeAmount: 100 }).expect(200)
    expect(closed.body.closeAmount).toBe(100)
    expect(closed.body).not.toHaveProperty('totalSales'); expect(closed.body).not.toHaveProperty('closeSnapshot')
  })

  it('le retrait du droit d’encaissement sous verrou refuse une nouvelle vente', async () => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'SERVER', capabilities: { 'payments.receive': false }, accessVersion: 4, isActive: true }])
    await request(application(pos, { 'payments.receive': true }, 'SERVER')).post('/checkout').send({
      requestId: '11111111-1111-4111-8111-111111111111', tableId: 'table-a', coverIds: ['cover-a'], method: 'cash', tip: 0, expectedTotal: 12, cashReceived: 12,
    }).expect(403)
    expect(fixtures.db.posSale.create).not.toHaveBeenCalled()
    expect(fixtures.db.posSale.findUnique).not.toHaveBeenCalled()
  })

  it('le contrôle SQL des liens refuse un responsable dont l’export a été révoqué', async () => {
    fixtures.db.$queryRaw.mockResolvedValue([{ role: 'MANAGER', capabilities: { 'exports.read': false }, accessVersion: 3, isActive: true }])
    await expect(listInvoiceDocumentLinks('company-a', 'actor-a', 'invoice-a')).rejects.toMatchObject({ status: 403 })
    expect(fixtures.db.invoice.findFirst).not.toHaveBeenCalled()
  })
})
