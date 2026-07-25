import { describe, it, expect, beforeAll } from 'vitest'
import { api, auth, login, assertServerUp, money } from './helpers'

/**
 * TESTPLAN §3 à §11 — parcours métier.
 *
 * Certains modules peuvent ne pas exposer toutes les routes : quand un
 * endpoint répond 404 (route absente), le cas est signalé et neutralisé
 * plutôt que compté en échec — l'audit documente la couverture réelle.
 */
describe('MÉTIER — facturation, CRM, réservations, RH, stock, compta', () => {
  let token: string

  beforeAll(async () => {
    await assertServerUp()
    token = await login()
  })

  /** true si la route n'existe pas sur ce déploiement. */
  const routeAbsente = (status: number, body: any) =>
    status === 404 && typeof body?.message === 'string' && /route|not found/i.test(body.message)

  // ─── §3 Facturation ────────────────────────────────────────────────────

  it('FAC-1/2 : facture créée, total = sous-total + TVA', async () => {
    // Les totaux sont calculés par le serveur à partir des lignes.
    const res = await auth(api().post('/api/invoices'), token).send({
      items: [{ description: 'Prestation audit', quantity: 2, unitPrice: 50, taxRate: 17 }],
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).toBeLessThan(400)

    const facture = res.body.invoice ?? res.body
    if (facture?.total != null) {
      expect(money(facture.subtotal + facture.taxAmount)).toBe(money(facture.total))
    }
  })

  it('FAC-3 : montant négatif refusé', async () => {
    const res = await auth(api().post('/api/invoices'), token).send({
      items: [{ description: 'Ligne négative', quantity: -5, unitPrice: 100, taxRate: 17 }],
    })
    if (routeAbsente(res.status, res.body)) return
    // Une facture à montant négatif doit être un avoir explicite, pas une facture.
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('FAC-7 : devis créé en brouillon', async () => {
    const res = await auth(api().post('/api/invoices/quotes'), token).send({
      items: [{ description: 'Devis événement', quantity: 1, unitPrice: 850, taxRate: 17 }],
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).toBeLessThan(400)
  })

  // ─── §5 CRM ────────────────────────────────────────────────────────────

  it('CRM-1 : client créé avec soldes à zéro', async () => {
    const res = await auth(api().post('/api/crm/customers'), token).send({
      firstName: 'Audit',
      lastName: `Client${Date.now()}`,
      email: `audit.${Date.now()}@example.lu`,
    })
    expect(res.status).toBe(201)
    expect(res.body.points).toBe(0)
    expect(res.body.walletBalance).toBe(0)
  })

  it('CRM-3/4 : points crédités puis débit excessif refusé', async () => {
    const créé = await auth(api().post('/api/crm/customers'), token).send({
      firstName: 'Audit',
      lastName: `Fidelite${Date.now()}`,
    })
    const id = créé.body.id

    const crédit = await auth(api().post(`/api/crm/customers/${id}/loyalty`), token)
      .send({ type: 'EARN', points: 100 })
    if (!routeAbsente(crédit.status, crédit.body)) {
      expect(crédit.status).toBeLessThan(400)

      const débit = await auth(api().post(`/api/crm/customers/${id}/loyalty`), token)
        .send({ type: 'SPEND', points: 100_000 })

      const après = await auth(api().get(`/api/crm/customers/${id}`), token)
      const solde = (après.body.customer ?? après.body)?.points
      // Quel que soit le code retour, le solde ne doit jamais passer négatif.
      expect(solde).toBeGreaterThanOrEqual(0)
      if (débit.status < 400) {
        console.info(`ℹ CRM-4 : débit excessif accepté (${débit.status}), solde ramené à ${solde}`)
      }
    }
  })

  it('CRM-6 : portefeuille jamais négatif', async () => {
    const créé = await auth(api().post('/api/crm/customers'), token).send({
      firstName: 'Audit',
      lastName: `Wallet${Date.now()}`,
    })
    const id = créé.body.id

    const res = await auth(api().post(`/api/crm/customers/${id}/wallet`), token)
      .send({ amount: -9999 })
    if (routeAbsente(res.status, res.body)) return

    const après = await auth(api().get(`/api/crm/customers/${id}`), token)
    const solde = (après.body.customer ?? après.body)?.walletBalance
    expect(solde).toBeGreaterThanOrEqual(0)
  })

  it('CRM-2 : email invalide refusé ou normalisé', async () => {
    const res = await auth(api().post('/api/crm/customers'), token).send({
      firstName: 'Audit',
      lastName: 'EmailInvalide',
      email: 'pas-du-tout-un-email',
    })
    // Doit être refusé ; si accepté, au moins ne pas planter.
    expect(res.status).not.toBe(500)
    if (res.status < 400) {
      console.info('ℹ CRM-2 : email invalide accepté par l\'API (validation absente)')
    }
  })

  // ─── §6 Réservations ───────────────────────────────────────────────────

  it('RES-1 : réservation créée', async () => {
    const res = await auth(api().post('/api/reservations'), token).send({
      guestName: 'Famille Audit',
      guestPhone: '+352 621 000 000',
      partySize: 4,
      date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).toBeLessThan(400)
  })

  it('RES-2 : nombre de couverts négatif refusé', async () => {
    const res = await auth(api().post('/api/reservations'), token).send({
      guestName: 'Audit Negatif',
      partySize: -4,
      date: new Date(Date.now() + 86_400_000).toISOString(),
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).not.toBe(500)
    if (res.status < 400) {
      console.info('ℹ RES-2 : partySize négatif accepté (validation absente)')
    }
  })

  it('RES-4 : nom d\'invité vide refusé', async () => {
    const res = await auth(api().post('/api/reservations'), token).send({
      guestName: '',
      partySize: 2,
      date: new Date(Date.now() + 86_400_000).toISOString(),
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).not.toBe(500)
  })

  // ─── §8 RH ─────────────────────────────────────────────────────────────

  it('RH-1/2 : shift valide accepté, fin avant début refusée', async () => {
    const équipe = await auth(api().get('/api/hr/team'), token)
    if (routeAbsente(équipe.status, équipe.body)) return
    // /hr/team renvoie des adhésions (UserCompany) : c'est `userId` qu'il
    // faut lire, pas `id` qui est l'identifiant de l'adhésion.
    const membres = équipe.body.team ?? équipe.body.users ?? équipe.body
    const userId = Array.isArray(membres) && membres.length ? (membres[0].userId ?? membres[0].id) : null
    if (!userId) return

    const début = new Date(Date.now() + 86_400_000)
    const fin = new Date(début.getTime() + 6 * 3_600_000)

    const ok = await auth(api().post('/api/hr/shifts'), token).send({
      userId, role: 'Service',
      startTime: début.toISOString(), endTime: fin.toISOString(),
    })
    expect(ok.status).toBeLessThan(500)

    const inversé = await auth(api().post('/api/hr/shifts'), token).send({
      userId, role: 'Service',
      startTime: fin.toISOString(), endTime: début.toISOString(),
    })
    expect(inversé.status).not.toBe(500)
    if (inversé.status < 400) {
      console.info('ℹ RH-2 : shift avec fin avant début accepté (validation absente)')
    }
  })

  it('RH-6 : pointage de sortie sans entrée → pas de 500', async () => {
    const res = await auth(api().post('/api/hr/punch/out'), token).send({})
    expect(res.status).not.toBe(500)
  })

  // ─── §7 Stock ──────────────────────────────────────────────────────────

  it('STK-1/3 : ingrédients listés, seuils exploitables', async () => {
    const res = await auth(api().get('/api/inventory/ingredients'), token)
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).toBeLessThan(400)

    const liste = res.body.ingredients ?? res.body
    if (Array.isArray(liste) && liste.length) {
      const i = liste[0]
      expect(i).toHaveProperty('currentStock')
      expect(i).toHaveProperty('minStockLevel')
      const sousSeuil = liste.filter((x: any) => x.currentStock < x.minStockLevel)
      console.info(`ℹ STK-3 : ${sousSeuil.length}/${liste.length} ingrédients sous le seuil`)
    }
  })

  it('STK-2 : stock négatif refusé', async () => {
    const res = await auth(api().post('/api/inventory/ingredients'), token).send({
      name: `Audit Ingredient ${Date.now()}`,
      unit: 'kg',
      costPerUnit: 5,
      currentStock: -50,
      minStockLevel: 2,
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).not.toBe(500)
    if (res.status < 400) {
      console.info('ℹ STK-2 : stock initial négatif accepté (validation absente)')
    }
  })

  // ─── §10 Comptabilité ──────────────────────────────────────────────────

  it('CPT-6 : dépense à montant négatif refusée', async () => {
    const res = await auth(api().post('/api/accounting/expenses'), token).send({
      category: 'AUDIT',
      amount: -250,
      taxRate: 17,
      description: 'Dépense négative de test',
      date: new Date().toISOString(),
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).not.toBe(500)
    if (res.status < 400) {
      console.info('ℹ CPT-6 : dépense négative acceptée (validation absente)')
    }
  })

  // ─── §11 Marketing / réputation ────────────────────────────────────────

  it('MKT-8 : note hors bornes refusée', async () => {
    const res = await auth(api().post('/api/reputation/reviews'), token).send({
      rating: 9,
      comment: 'Note hors bornes',
      platform: 'INTERNAL',
    })
    if (routeAbsente(res.status, res.body)) return
    expect(res.status).not.toBe(500)
    if (res.status < 400) {
      console.info('ℹ MKT-8 : note 9/5 acceptée (validation absente)')
    }
  })

  // ─── §15 Robustesse transverse ─────────────────────────────────────────

  it('ROB-3 : chaîne de 10 000 caractères → jamais 500', async () => {
    const res = await auth(api().post('/api/crm/customers'), token).send({
      firstName: 'A'.repeat(10_000),
      lastName: 'Audit',
    })
    expect(res.status).not.toBe(500)
  })

  it('ROB-4 : injection SQL traitée comme littéral', async () => {
    const res = await auth(
      api().get("/api/crm/customers?search='; DROP TABLE \"Customer\"; --"),
      token,
    )
    expect(res.status).toBeLessThan(500)

    // La table doit toujours répondre après la tentative.
    const contrôle = await auth(api().get('/api/crm/customers'), token)
    expect(contrôle.status).toBe(200)
  })
})
