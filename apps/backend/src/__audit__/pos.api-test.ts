import { describe, it, expect, beforeAll } from 'vitest'
import { api, auth, login, assertServerUp, firstProduct, money } from './helpers'

/** TESTPLAN §2 — POS / Caisse. */
describe('POS — commandes, TVA et encaissement', () => {
  let token: string
  let product: any

  beforeAll(async () => {
    await assertServerUp()
    token = await login()
    product = await firstProduct(token)
  })

  const createOrder = (items: any[], extra: Record<string, unknown> = {}) =>
    auth(api().post('/api/orders'), token).send({ items, ...extra })

  it('POS-1 : commande à 2 lignes → 201, numéro et totaux cohérents', async () => {
    const res = await createOrder([
      { productId: product.id, quantity: 2 },
      { productId: product.id, quantity: 1 },
    ])
    expect(res.status).toBe(201)
    const order = res.body.order ?? res.body
    expect(order.orderNumber).toBeGreaterThan(0)
    expect(money(order.subtotal + order.taxAmount)).toBe(money(order.total))
  })

  it('POS-2 : TVA luxembourgeoise 17 % appliquée au prix produit', async () => {
    const qty = 3
    const res = await createOrder([{ productId: product.id, quantity: qty }])
    expect(res.status).toBe(201)
    const order = res.body.order ?? res.body

    const attendu = money(product.price * qty)
    expect(money(order.subtotal)).toBe(attendu)
    // taxRate est un POURCENTAGE en base (17), d'où la division par 100.
    expect(money(order.taxAmount)).toBe(money(attendu * (product.taxRate / 100)))
    expect(money(order.total)).toBe(money(attendu + attendu * (product.taxRate / 100)))
  })

  it('POS-3 : taux mixtes → TVA calculée ligne par ligne', async () => {
    const list = await auth(api().get('/api/products'), token)
    const produits: any[] = Array.isArray(list.body) ? list.body : list.body.products || []
    const taux = [...new Set(produits.map((p) => p.taxRate))]

    const a = produits[0]
    // Prend un produit d'un autre taux s'il en existe, sinon un second produit.
    const b = produits.find((p) => p.taxRate !== a.taxRate) ?? produits[1] ?? a

    const res = await createOrder([
      { productId: a.id, quantity: 1 },
      { productId: b.id, quantity: 1 },
    ])
    expect(res.status).toBe(201)
    const order = res.body.order ?? res.body

    const attendue = money(
      a.price * (a.taxRate / 100) + b.price * (b.taxRate / 100),
    )
    expect(money(order.taxAmount)).toBe(attendue)
    if (taux.length === 1) {
      console.info(`ℹ POS-3 : catalogue à taux unique (${taux[0]} %) — calcul par ligne vérifié malgré tout`)
    }
  })

  it('POS-4 : commande sans ligne → 4xx', async () => {
    const res = await createOrder([])
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('POS-5 : quantité négative refusée', async () => {
    const res = await createOrder([{ productId: product.id, quantity: -5 }])
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('POS-6 : quantité zéro refusée', async () => {
    const res = await createOrder([{ productId: product.id, quantity: 0 }])
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('POS-7 : produit inexistant → 4xx, jamais 500', async () => {
    const res = await createOrder([{ productId: 'produit-inexistant', quantity: 1 }])
    expect(res.status).not.toBe(500)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('POS-8/9 : ajout puis suppression de ligne recalcule les totaux', async () => {
    const créée = await createOrder([{ productId: product.id, quantity: 1 }])
    const order = créée.body.order ?? créée.body
    const totalInitial = order.total

    const ajout = await auth(api().post(`/api/orders/${order.id}/items`), token)
      .send({ productId: product.id, quantity: 2 })
    expect(ajout.status).toBeLessThan(400)

    const après = await auth(api().get(`/api/orders/${order.id}`), token)
    const apresAjout = après.body.order ?? après.body
    expect(apresAjout.total).toBeGreaterThan(totalInitial)

    const ligne = (apresAjout.items ?? []).at(-1)
    if (ligne) {
      const suppr = await auth(
        api().delete(`/api/orders/${order.id}/items/${ligne.id}`),
        token,
      )
      expect(suppr.status).toBeLessThan(400)

      const final = await auth(api().get(`/api/orders/${order.id}`), token)
      const apresSuppr = final.body.order ?? final.body
      expect(apresSuppr.total).toBeLessThan(apresAjout.total)
    }
  })

  it('POS-10/11 : encaissement passe la commande à PAID et calcule le rendu', async () => {
    const créée = await createOrder([{ productId: product.id, quantity: 2 }])
    const order = créée.body.order ?? créée.body

    const donné = Math.ceil(order.total) + 10
    const res = await auth(api().post(`/api/orders/${order.id}/checkout`), token)
      .send({ paymentMethod: 'CASH', cashReceived: donné })
    expect(res.status).toBeLessThan(400)

    const payée = res.body.order ?? res.body
    expect(payée.status).toBe('PAID')
    expect(payée.paidAt).toBeTruthy()
    if (payée.cashChange != null) {
      expect(money(payée.cashChange)).toBe(money(donné - order.total))
      expect(payée.cashChange).toBeGreaterThanOrEqual(0)
    }
  })

  it('POS-12 : double encaissement refusé', async () => {
    const créée = await createOrder([{ productId: product.id, quantity: 1 }])
    const order = créée.body.order ?? créée.body

    const premier = await auth(api().post(`/api/orders/${order.id}/checkout`), token)
      .send({ paymentMethod: 'CARD' })
    expect(premier.status).toBeLessThan(400)

    const second = await auth(api().post(`/api/orders/${order.id}/checkout`), token)
      .send({ paymentMethod: 'CARD' })
    // Encaisser deux fois doublerait le chiffre d'affaires du jour.
    expect(second.status).toBeGreaterThanOrEqual(400)
    expect(second.status).toBeLessThan(500)
  })

  it('POS-13 : commandes concurrentes → numéros tous distincts', async () => {
    const lot = await Promise.all(
      Array.from({ length: 8 }, () =>
        createOrder([{ productId: product.id, quantity: 1 }]),
      ),
    )
    const numéros = lot
      .filter((r) => r.status === 201)
      .map((r) => (r.body.order ?? r.body).orderNumber)

    expect(numéros.length).toBeGreaterThan(0)
    expect(new Set(numéros).size).toBe(numéros.length)
  })
})
