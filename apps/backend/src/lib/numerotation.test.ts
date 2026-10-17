import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * La base est simulée en mémoire : `findFirst` renvoie le plus grand numéro
 * déjà pris, et la création rejette un P2002 si le numéro vient d'être
 * attribué entre-temps — exactement ce que fait la contrainte
 * `@@unique([companyId, number])` en PostgreSQL.
 */
const attribues = new Set<string>()

/** Renvoie le plus grand numéro attribué correspondant au motif, ou null. */
function plusGrand(motif: string) {
  const candidats = [...attribues].filter((n) => n.startsWith(motif)).sort()
  const dernier = candidats[candidats.length - 1]
  return dernier ? { number: dernier } : null
}

/**
 * Le `await` avant la lecture force les appels concurrents à se croiser :
 * sans lui, chaque appel irait au bout de son tour sans jamais entrer en
 * collision et le test ne prouverait rien.
 */
async function findFirst(args: any) {
  await Promise.resolve()
  return plusGrand(args.where.number.startsWith)
}

vi.mock('./prisma', () => ({
  default: {
    invoice: { findFirst: (a: any) => findFirst(a) },
    quote: { findFirst: (a: any) => findFirst(a) },
    creditNote: { findFirst: (a: any) => findFirst(a) },
  },
}))

import { createAvecNumero, delaiAvantReessai, nextNumber, NumerotationIndisponibleError } from './numerotation'

/** Création simulée : rejette comme Prisma si le numéro est déjà pris. */
async function creer(numero: string) {
  await Promise.resolve()
  if (attribues.has(numero)) {
    throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
  }
  attribues.add(numero)
  return { number: numero }
}

describe('numérotation séquentielle', () => {
  beforeEach(() => attribues.clear())

  it('attribue 8 numéros distincts à 8 créations concurrentes', async () => {
    const resultats = await Promise.all(
      Array.from({ length: 8 }, () => createAvecNumero('societe-test', 'INV', creer)),
    )

    const numeros = resultats.map((r) => r.number)
    // Aucune perte : les 8 requêtes aboutissent.
    expect(numeros).toHaveLength(8)
    // Aucun doublon : c'est ce que la contrainte protège en base.
    expect(new Set(numeros).size).toBe(8)
    // La série est contiguë, sans trou ni saut.
    const annee = new Date().getFullYear()
    expect([...numeros].sort()).toEqual(
      Array.from({ length: 8 }, (_, i) => `INV-${annee}-${String(i + 1).padStart(4, '0')}`),
    )
  }, 20_000)

  it('sépare les séries : avoirs et factures partagent la table sans se marcher dessus', async () => {
    const annee = new Date().getFullYear()
    const facture = await createAvecNumero('societe-test', 'INV', creer)
    const avoir = await createAvecNumero('societe-test', 'AVO', creer)

    expect(facture.number).toBe(`INV-${annee}-0001`)
    expect(avoir.number).toBe(`AVO-${annee}-0001`)
  })

  it('lit la série AVO depuis le client transactionnel, y compris les anciens numéros Invoice', async () => {
    const year = new Date().getFullYear()
    // The outer connection still sees 0001. Under the invoice lock the
    // transaction sees the actual committed high-water mark, including legacy.
    attribues.add(`AVO-${year}-0001`)
    const transaction = { invoice: { findFirst: async () => ({ number: `AVO-${year}-0017` }) },
      creditNote: { findFirst: async () => ({ number: `AVO-${year}-0012` }) }, quote: { findFirst: async () => null } }
    expect(await nextNumber('societe-test', 'AVO', transaction as any)).toBe(`AVO-${year}-0018`)
  })

  it('utilise également le client fourni pour les séries INV et QUO sans toucher au défaut existant', async () => {
    const year = new Date().getFullYear()
    const transaction = { invoice: { findFirst: async () => ({ number: `INV-${year}-0007` }) },
      quote: { findFirst: async () => ({ number: `QUO-${year}-0021` }) }, creditNote: { findFirst: async () => null } }
    expect(await nextNumber('societe-test', 'INV', transaction as any)).toBe(`INV-${year}-0008`)
    expect(await nextNumber('societe-test', 'QUO', transaction as any)).toBe(`QUO-${year}-0022`)
    expect(await nextNumber('societe-test', 'INV')).toBe(`INV-${year}-0001`)
  })

  it("remonte une erreur qui n'est pas une collision au lieu de réessayer", async () => {
    const panne = async () => {
      throw Object.assign(new Error('base injoignable'), { code: 'P1001' })
    }
    await expect(createAvecNumero('societe-test', 'INV', panne)).rejects.toThrow('base injoignable')
  })

  it('abandonne proprement si la collision persiste', async () => {
    const toujoursEnConflit = async () => {
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    }
    await expect(createAvecNumero('societe-test', 'INV', toujoursEnConflit))
      .rejects.toBeInstanceOf(NumerotationIndisponibleError)
  }, 20_000)

  /**
   * Garde-fou exigé par CLAUDE.md : le délai entre deux tentatives doit rester
   * dispersé. Le remplacer par une constante ferait se resynchroniser les
   * requêtes concurrentes, qui rejoueraient la même collision — 2 requêtes sur
   * 8 perdues, comportement mesuré avant le correctif d'origine.
   */
  it('disperse le délai entre deux tentatives', () => {
    const tirages = new Set(Array.from({ length: 40 }, () => delaiAvantReessai(0)))
    expect(tirages.size).toBeGreaterThan(1)

    // La fenêtre s'élargit à mesure que la contention persiste.
    const maxPremiere = Math.max(...Array.from({ length: 60 }, () => delaiAvantReessai(0)))
    const maxCinquieme = Math.max(...Array.from({ length: 60 }, () => delaiAvantReessai(4)))
    expect(maxCinquieme).toBeGreaterThan(maxPremiere)
  })
})
