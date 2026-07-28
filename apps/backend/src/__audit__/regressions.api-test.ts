import { describe, it, expect, beforeAll } from 'vitest'
import { api, auth, login, assertServerUp, money, firstProduct } from './helpers'

/**
 * Non-régression : un test par défaut corrigé pendant l'audit.
 * Chaque cas échouait sur le code d'origine.
 */
describe('RÉGRESSIONS — défauts corrigés pendant l\'audit', () => {
  let token: string

  beforeAll(async () => {
    await assertServerUp()
    token = await login()
  })

  it('caisse : l\'ouverture répond 201 (renvoyait 500 — req.user.id inexistant)', async () => {
    // Fermer une éventuelle caisse laissée ouverte par un test précédent.
    const ouvertes = await auth(api().get('/api/accounting/cash-drawers'), token)
    const liste = ouvertes.body.drawers ?? ouvertes.body
    if (Array.isArray(liste)) {
      for (const d of liste.filter((x: any) => !x.closedAt)) {
        // La clôture est un PUT (cf. routes/accounting.ts).
        await auth(api().put(`/api/accounting/cash-drawers/${d.id}/close`), token)
          .send({ closeAmount: d.openAmount ?? 0 })
      }
    }

    const res = await auth(api().post('/api/accounting/cash-drawers/open'), token)
      .send({ openAmount: 200, notes: 'non-régression' })
    expect(res.status).toBe(201)

    const drawer = res.body.drawer ?? res.body
    expect(drawer.userId).toBeTruthy()

    // Une seconde ouverture doit être refusée.
    const doublon = await auth(api().post('/api/accounting/cash-drawers/open'), token)
      .send({ openAmount: 200 })
    expect(doublon.status).toBe(409)

    await auth(api().put(`/api/accounting/cash-drawers/${drawer.id}/close`), token)
      .send({ closeAmount: 200 })
  })

  it('factures : 8 créations concurrentes → 8 numéros distincts', async () => {
    const corps = { items: [{ description: 'Concurrence', quantity: 1, unitPrice: 10, taxRate: 17 }] }
    const lot = await Promise.all(
      Array.from({ length: 8 }, () => auth(api().post('/api/invoices'), token).send(corps)),
    )

    const numéros = lot.filter((r) => r.status === 201).map((r) => (r.body.invoice ?? r.body).number)
    // Numérotation séquentielle unique : obligation légale de facturation.
    expect(numéros.length).toBe(8)
    expect(new Set(numéros).size).toBe(8)
  })

  it('commandes : 8 créations concurrentes → 8 numéros distincts, aucun 500', async () => {
    const produit = await firstProduct(token)
    const corps = { items: [{ productId: produit.id, quantity: 1 }] }
    const lot = await Promise.all(
      Array.from({ length: 8 }, () => auth(api().post('/api/orders'), token).send(corps)),
    )

    // Avant correctif : 2 requêtes sur 8 épuisaient leurs réessais sans
    // attente et retombaient en 500, commande perdue. Le doublon n'a jamais
    // eu lieu (contrainte d'unicité en base) — c'était la perte qui menaçait.
    const echecs = lot.filter((r) => r.status >= 500)
    expect(echecs.map((r) => r.status)).toEqual([])

    const numéros = lot.filter((r) => r.status === 201).map((r) => (r.body.order ?? r.body).orderNumber)
    expect(numéros.length).toBe(8)
    expect(new Set(numéros).size).toBe(8)
  })

  it('facture : les totaux sont arrondis au centime', async () => {
    const res = await auth(api().post('/api/invoices'), token).send({
      // 3 × 2,50 € à 17 % donnait 1.275 € de TVA avant correction.
      items: [{ description: 'Arrondi', quantity: 3, unitPrice: 2.5, taxRate: 17 }],
    })
    expect(res.status).toBe(201)

    const f = res.body.invoice ?? res.body
    for (const montant of [f.subtotal, f.taxAmount, f.total]) {
      expect(money(montant)).toBe(montant)
    }
    expect(money(f.subtotal + f.taxAmount)).toBe(f.total)
  })

  it('fidélité : `type` manquant → 400 (renvoyait 500)', async () => {
    const client = await auth(api().post('/api/crm/customers'), token)
      .send({ firstName: 'Regression', lastName: `Loyalty${Date.now()}` })

    const res = await auth(api().post(`/api/crm/customers/${client.body.id}/loyalty`), token)
      .send({ points: 50 })
    expect(res.status).toBe(400)
  })

  it('portefeuille : montant non numérique refusé (écrivait NaN en base)', async () => {
    const client = await auth(api().post('/api/crm/customers'), token)
      .send({ firstName: 'Regression', lastName: `Wallet${Date.now()}` })

    const res = await auth(api().post(`/api/crm/customers/${client.body.id}/wallet`), token)
      .send({ amount: 'beaucoup' })
    expect(res.status).toBe(400)

    const après = await auth(api().get(`/api/crm/customers/${client.body.id}`), token)
    const solde = (après.body.customer ?? après.body).walletBalance
    expect(Number.isFinite(solde)).toBe(true)
  })

  it('dépense : montant négatif refusé (un remboursement est un avoir)', async () => {
    const res = await auth(api().post('/api/accounting/expenses'), token).send({
      category: 'REGRESSION',
      amount: -100,
      description: 'Dépense négative',
    })
    expect(res.status).toBe(400)
  })

  it('shift : employé inconnu → 400 (renvoyait 500 sur violation de clé)', async () => {
    const début = new Date(Date.now() + 86_400_000)
    const res = await auth(api().post('/api/hr/shifts'), token).send({
      userId: 'employe-qui-nexiste-pas',
      role: 'Service',
      startTime: début.toISOString(),
      endTime: new Date(début.getTime() + 3_600_000).toISOString(),
    })
    expect(res.status).toBe(400)
  })

  it('JSON malformé → 400 (renvoyait 500 et partait en alerte)', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
    expect(res.status).toBe(400)
  })
})

/** TESTPLAN §14 — sauvegarde et restauration. */
describe('SAUVEGARDE — archive, listing et garde-fous', () => {
  let token: string

  beforeAll(async () => {
    await assertServerUp()
    token = await login()
  })

  it('BAK-1/3 : déclenchement puis présence dans la liste', async () => {
    const créée = await auth(api().post('/api/backup/full'), token).send({})
    expect(créée.status).toBeLessThan(400)
    expect(créée.body.filename).toMatch(/^creorga-full-[\d-]+\.zip$/)

    const liste = await auth(api().get('/api/backup/full'), token)
    expect(liste.status).toBe(200)

    const noms = (liste.body.backups ?? []).map((b: any) => b.filename ?? b)
    expect(noms).toContain(créée.body.filename)
  })

  it('BAK-4 : nom de fichier hors format refusé (path traversal)', async () => {
    for (const nom of ['../../etc/passwd', 'creorga-full-2026.txt', '..%2F..%2Fetc%2Fpasswd']) {
      const res = await auth(
        api().get(`/api/backup/full/${encodeURIComponent(nom)}/download`),
        token,
      )
      expect([400, 404]).toContain(res.status)
    }
  })

  it('BAK-1 : l\'archive téléchargée est un ZIP non vide', async () => {
    const liste = await auth(api().get('/api/backup/full'), token)
    const première = (liste.body.backups ?? [])[0]
    if (!première) return

    const nom = première.filename ?? première
    const res = await auth(api().get(`/api/backup/full/${nom}/download`), token)
      .buffer(true)
      .parse((r, cb) => {
        const morceaux: Buffer[] = []
        r.on('data', (c: Buffer) => morceaux.push(c))
        r.on('end', () => cb(null, Buffer.concat(morceaux)))
      })

    expect(res.status).toBe(200)
    const zip = res.body as Buffer
    expect(zip.length).toBeGreaterThan(0)
    // Signature d'en-tête ZIP : « PK\x03\x04 ».
    expect(zip.subarray(0, 2).toString('latin1')).toBe('PK')
  })
})
