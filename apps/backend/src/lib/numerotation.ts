import prisma from './prisma'

/**
 * Numérotation séquentielle des documents de facturation.
 *
 * Extrait de `routes/invoices.ts` sans modification de comportement, pour
 * qu'avoirs, devis et factures partagent la même implémentation et qu'elle
 * soit enfin couverte par un test (cf. `numerotation.test.ts`).
 */

/**
 * Préfixes gérés.
 *
 * `AVO` (avoirs) partage la table `Invoice` avec `INV` : les deux séries sont
 * disjointes par leur préfixe, la contrainte `@@unique([companyId, number])`
 * couvre donc les deux sans interférence.
 */
export type PrefixeDocument = 'INV' | 'QUO' | 'AVO'

/**
 * Numéro séquentiel du prochain document de l'année en cours.
 *
 * L'ancienne version comptait les documents existants et ajoutait 1, sans
 * verrou : six factures créées simultanément recevaient toutes le même
 * numéro. On repart désormais du plus grand numéro déjà attribué pour
 * l'année (et non d'un comptage, qui décale dès qu'un document est
 * supprimé), et l'unicité est garantie en base par la contrainte
 * (companyId, number). Les appelants réessaient sur conflit via
 * `createAvecNumero`.
 */
export async function nextNumber(companyId: string, prefix: PrefixeDocument): Promise<string> {
  const year = new Date().getFullYear()
  const motif = `${prefix}-${year}-`

  const dernier = prefix === 'QUO'
    ? await prisma.quote.findFirst({
        where: { companyId, number: { startsWith: motif } },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
    : await prisma.invoice.findFirst({
        where: { companyId, number: { startsWith: motif } },
        orderBy: { number: 'desc' },
        select: { number: true },
      })

  const dernierRang = dernier ? parseInt(dernier.number.slice(motif.length), 10) : 0
  const rang = Number.isFinite(dernierRang) ? dernierRang + 1 : 1
  return `${motif}${String(rang).padStart(4, '0')}`
}

/** Erreur levée quand la numérotation échoue malgré les réessais. */
export class NumerotationIndisponibleError extends Error {
  constructor() {
    super('Numérotation de document momentanément indisponible')
    this.name = 'NumerotationIndisponibleError'
  }
}

/** Nombre maximum de tentatives avant d'abandonner. */
export const MAX_TENTATIVES = 10

/**
 * Délai d'attente avant la tentative suivante, en millisecondes.
 *
 * Le tirage aléatoire est indispensable : sans lui, les requêtes concurrentes
 * se resynchronisent à chaque tour et rejouent la même collision (2 requêtes
 * sur 8 épuisaient leurs tentatives en test). Le facteur `(tentative + 1)`
 * élargit la fenêtre à mesure que la contention persiste.
 *
 * Exporté pour que le test puisse vérifier que la dispersion existe toujours :
 * remplacer ce tirage par une constante fait échouer `numerotation.test.ts`.
 */
export function delaiAvantReessai(tentative: number): number {
  return 5 + Math.floor(Math.random() * 20) * (tentative + 1)
}

/**
 * Crée un document en réessayant si le numéro vient d'être pris par une
 * requête concurrente (P2002 sur la contrainte d'unicité).
 */
export async function createAvecNumero<T>(
  companyId: string,
  prefix: PrefixeDocument,
  create: (number: string) => Promise<T>,
): Promise<T> {
  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    try {
      return await create(await nextNumber(companyId, prefix))
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e
      await new Promise((r) => setTimeout(r, delaiAvantReessai(tentative)))
    }
  }
  throw new NumerotationIndisponibleError()
}
