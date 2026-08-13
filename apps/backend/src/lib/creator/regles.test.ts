import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock est hissé en tête de fichier : bd doit l'être aussi (vi.hoisted).
const bd = vi.hoisted(() => ({
  cashDrawer: { findMany: vi.fn() },
  purchaseOrder: { findMany: vi.fn() },
  expense: { findMany: vi.fn(), count: vi.fn() },
  invoice: { findMany: vi.fn() },
  quote: { findMany: vi.fn() },
  tenantMetricDaily: { findMany: vi.fn(), findFirst: vi.fn() },
  companyModule: { findMany: vi.fn() },
  activityEvent: { findFirst: vi.fn() },
}))
vi.mock('../prisma', () => ({ default: bd }))

const listFullBackups = vi.hoisted(() => vi.fn())
vi.mock('../../jobs/backup-worker', () => ({
  listFullBackups: (...a: any[]) => listFullBackups(...a),
}))

import { REGLES_SOCIETE, REGLES_GLOBALES, CONFIG_DEFAUT, type RegleCtx } from './regles'

const regle = (id: string) =>
  [...REGLES_SOCIETE, ...REGLES_GLOBALES].find((r) => r.id === id)!

const MAINTENANT = new Date('2026-08-13T12:00:00Z')
const JOUR_MS = 24 * 60 * 60 * 1000

function ctx(id: string, surcharge: Partial<RegleCtx> = {}): RegleCtx {
  return {
    companyId: 'societe-a',
    companyName: 'Café Test',
    creeLe: new Date('2026-01-01'),
    maintenant: MAINTENANT,
    reglage: CONFIG_DEFAUT[id],
    ...surcharge,
  }
}

beforeEach(() => {
  for (const table of Object.values(bd)) {
    for (const fn of Object.values(table)) (fn as ReturnType<typeof vi.fn>).mockReset()
  }
  listFullBackups.mockReset()
})

describe('ecart-caisse', () => {
  it("déclenche au-dessus du seuil avec la preuve chiffrée (l'exemple des 300 €)", async () => {
    bd.cashDrawer.findMany.mockResolvedValue([
      { closedAt: new Date('2026-08-01'), discrepancy: -180.5, user: { firstName: 'Marc', lastName: 'D' } },
      { closedAt: new Date('2026-08-05'), discrepancy: 120.1, user: { firstName: 'Léa', lastName: 'B' } },
    ])
    const o = await regle('ecart-caisse').evaluer(ctx('ecart-caisse'))
    expect(o).not.toBeNull()
    expect(o!.evidence.valeur).toBe(300.6)
    expect(o!.severity).toBe('critical') // > 200 €
    expect(o!.message).toContain('300,60 €')
  })

  it('reste muet sous le seuil et ignore les écarts aberrants (> 10 000 €)', async () => {
    bd.cashDrawer.findMany.mockResolvedValue([
      { closedAt: new Date('2026-08-01'), discrepancy: -20, user: { firstName: 'M', lastName: 'D' } },
      { closedAt: new Date('2026-08-02'), discrepancy: 45000, user: { firstName: 'M', lastName: 'D' } },
    ])
    expect(await regle('ecart-caisse').evaluer(ctx('ecart-caisse'))).toBeNull()
  })
})

describe('factures-non-scannees', () => {
  it("compte les réceptions sans dépense rapprochée (l'exemple des 3 factures)", async () => {
    const recu = (jour: string, total: number, nom: string) => ({
      total,
      createdAt: new Date(jour),
      supplier: { name: nom },
    })
    bd.purchaseOrder.findMany.mockResolvedValue([
      recu('2026-08-01', 240.5, 'Brasserie Nationale'),
      recu('2026-08-04', 89.9, 'Metro'),
      recu('2026-08-08', 150, 'Cactus'),
      recu('2026-08-10', 60, 'Metro'),
    ])
    // Seule la livraison Cactus a une dépense au même montant à ± 7 jours.
    bd.expense.findMany.mockResolvedValue([{ amount: 150, date: new Date('2026-08-09') }])
    const o = await regle('factures-non-scannees').evaluer(ctx('factures-non-scannees'))
    expect(o).not.toBeNull()
    expect(o!.evidence.valeur).toBe(3)
    expect(o!.evidence.fiabilite).toBe('estimation')
    expect(o!.message).toContain('3 factures fournisseurs non scannées')
  })

  it('muet sans réception', async () => {
    bd.purchaseOrder.findMany.mockResolvedValue([])
    expect(await regle('factures-non-scannees').evaluer(ctx('factures-non-scannees'))).toBeNull()
  })
})

describe('impayes', () => {
  it('critical quand le retard dépasse 30 jours', async () => {
    bd.invoice.findMany.mockResolvedValue([
      { number: 'F-2026-004', total: 800, dueDate: new Date(MAINTENANT.getTime() - 45 * JOUR_MS) },
    ])
    const o = await regle('impayes').evaluer(ctx('impayes'))
    expect(o).not.toBeNull()
    expect(o!.severity).toBe('critical')
    expect(o!.evidence.valeur).toBe(800)
  })

  it('muet sous 500 € et moins de 3 factures', async () => {
    bd.invoice.findMany.mockResolvedValue([
      { number: 'F-1', total: 120, dueDate: new Date(MAINTENANT.getTime() - 5 * JOUR_MS) },
    ])
    expect(await regle('impayes').evaluer(ctx('impayes'))).toBeNull()
  })
})

describe('depenses-sans-justificatif', () => {
  it('exige un dénominateur ≥ 5 (module réellement utilisé)', async () => {
    bd.expense.count.mockResolvedValueOnce(4).mockResolvedValueOnce(4)
    expect(
      await regle('depenses-sans-justificatif').evaluer(ctx('depenses-sans-justificatif')),
    ).toBeNull()
  })

  it('déclenche à 3 dépenses sans reçu sur 8', async () => {
    bd.expense.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3)
    const o = await regle('depenses-sans-justificatif').evaluer(ctx('depenses-sans-justificatif'))
    expect(o).not.toBeNull()
    expect(o!.title).toContain('3 dépense(s) sur 8')
  })
})

describe('haccp-silence', () => {
  it("compte les jours ouverts sans relevé", async () => {
    const jour = (d: string, ouvert: boolean, releves: number) => ({
      date: new Date(d),
      wasOpen: ouvert,
      haccpLogs: releves,
    })
    bd.tenantMetricDaily.findMany.mockResolvedValue([
      jour('2026-08-01', true, 0),
      jour('2026-08-02', true, 0),
      jour('2026-08-03', false, 0), // fermé : ne compte pas
      jour('2026-08-04', true, 0),
      jour('2026-08-05', true, 0),
      jour('2026-08-06', true, 0),
      jour('2026-08-07', true, 4), // relevés faits : ne compte pas
    ])
    const o = await regle('haccp-silence').evaluer(ctx('haccp-silence'))
    expect(o).not.toBeNull()
    expect(o!.evidence.valeur).toBe(5)
    expect(o!.severity).toBe('critical')
  })
})

describe('devis-morts', () => {
  it('additionne les devis SENT expirés', async () => {
    bd.quote.findMany.mockResolvedValue([
      { number: 'D-1', total: 1200, validUntil: new Date('2026-07-01') },
      { number: 'D-2', total: 800, validUntil: new Date('2026-07-15') },
      { number: 'D-3', total: 500, validUntil: new Date('2026-08-01') },
    ])
    const o = await regle('devis-morts').evaluer(ctx('devis-morts'))
    expect(o).not.toBeNull()
    expect(o!.title).toContain('2500,00 €')
  })
})

describe('module-dormant', () => {
  it("s'abstient sous 21 jours d'historique — jamais d'accusation prématurée", async () => {
    bd.tenantMetricDaily.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => ({ moduleUsage: {} })),
    )
    expect(await regle('module-dormant').evaluer(ctx('module-dormant'))).toBeNull()
  })

  it('détecte un module actif à zéro usage sur un mois', async () => {
    bd.tenantMetricDaily.findMany.mockResolvedValue(
      Array.from({ length: 25 }, () => ({ moduleUsage: { crm: 12, orders: 40 } })),
    )
    bd.companyModule.findMany.mockResolvedValue([
      { moduleId: 'pos' }, // orders utilisé → vivant
      { moduleId: 'haccp' }, // aucun segment → dormant
      { moduleId: 'qrmenu' }, // non mesurable → ignoré
    ])
    const o = await regle('module-dormant').evaluer(ctx('module-dormant'))
    expect(o).not.toBeNull()
    expect(o!.evidence.details).toEqual([{ module: 'haccp' }])
  })
})

describe('societe-inactive', () => {
  it("s'abstient si la collecte n'a jamais rien vu", async () => {
    bd.activityEvent.findFirst.mockResolvedValue(null)
    expect(await regle('societe-inactive').evaluer(ctx('societe-inactive'))).toBeNull()
  })

  it('déclenche après 14 jours de silence', async () => {
    const ancien = { ts: new Date(MAINTENANT.getTime() - 20 * JOUR_MS) }
    bd.activityEvent.findFirst.mockResolvedValue(ancien)
    const o = await regle('societe-inactive').evaluer(ctx('societe-inactive'))
    expect(o).not.toBeNull()
    expect(o!.severity).toBe('critical')
    expect(o!.evidence.valeur).toBe(20)
  })
})

describe('volume-donnees', () => {
  it("déclenche au palier 1 Go avec les compteurs (l'exemple du giga)", async () => {
    bd.tenantMetricDaily.findFirst.mockResolvedValue({
      dataBytes: BigInt(Math.round(1.2 * 1024 ** 3)),
      rowCounts: { Order: 1240, Customer: 310, Invoice: 85 },
    })
    const o = await regle('volume-donnees').evaluer(ctx('volume-donnees'))
    expect(o).not.toBeNull()
    expect(o!.title).toContain('1 Go')
    expect(o!.message).toContain('1240 commandes')
    expect(o!.periode).toBe('palier-1Go')
  })

  it('muet sous 100 Mo', async () => {
    bd.tenantMetricDaily.findFirst.mockResolvedValue({ dataBytes: BigInt(5 * 1024 ** 2), rowCounts: {} })
    expect(await regle('volume-donnees').evaluer(ctx('volume-donnees'))).toBeNull()
  })
})

describe('sauvegarde-agee (globale)', () => {
  it('critical quand le dernier ZIP dépasse 24 h', async () => {
    listFullBackups.mockReturnValue([
      { filename: 'creorga-full-2026-08-11-0300.zip', size: 1000, createdAt: MAINTENANT.getTime() - 40 * 3600 * 1000 },
    ])
    const o = await regle('sauvegarde-agee').evaluer(ctx('sauvegarde-agee'))
    expect(o).not.toBeNull()
    expect(o!.severity).toBe('critical')
    expect(o!.evidence.valeur).toBe(40)
  })

  it('muet quand la sauvegarde est fraîche', async () => {
    listFullBackups.mockReturnValue([
      { filename: 'creorga-full.zip', size: 1000, createdAt: MAINTENANT.getTime() - 3 * 3600 * 1000 },
    ])
    expect(await regle('sauvegarde-agee').evaluer(ctx('sauvegarde-agee'))).toBeNull()
  })
})
