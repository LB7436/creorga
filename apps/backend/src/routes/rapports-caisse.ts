import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

/**
 * Rapports de caisse — extraits sur une période libre.
 *
 * La caisse ne produisait aucun extrait : ni journalier, ni hebdomadaire, ni
 * annuel. `/api/stats` ne sait répondre que « aujourd'hui » et « les 7 derniers
 * jours », sans plage choisie et sans restriction de rôle.
 *
 * Ces routes sont montées derrière `requireRole('OWNER')` : un serveur ne voit
 * pas le chiffre d'affaires de l'établissement.
 *
 * Source : les commandes réellement encaissées (`Order.status = 'PAID'`),
 * datées par `paidAt` — jamais `createdAt`, qui est l'ouverture de la table et
 * peut tomber la veille pour un service de nuit.
 */

const router = Router()

/** Bornes de période, à la minute près. */
function analyserPeriode(debut?: string, fin?: string): { debut: Date; fin: Date } | { erreur: string } {
  if (!debut || !fin) return { erreur: 'Les paramètres « debut » et « fin » sont requis.' }
  const d = new Date(debut)
  const f = new Date(fin)
  if (Number.isNaN(d.getTime())) return { erreur: `Date de début illisible : ${debut}` }
  if (Number.isNaN(f.getTime())) return { erreur: `Date de fin illisible : ${fin}` }
  if (f < d) return { erreur: 'La fin de période est antérieure au début.' }
  // Une année de commandes reste raisonnable ; au-delà, on refuse plutôt que
  // de laisser une requête écrouler la base sans le dire.
  const jours = (f.getTime() - d.getTime()) / 86_400_000
  if (jours > 400) return { erreur: 'Période trop longue (maximum 400 jours).' }
  return { debut: d, fin: f }
}

const centimes = (n: number) => Math.round(n * 100) / 100

/** Clé de regroupement journalier, en heure locale du serveur. */
function jourLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ─── GET /api/rapports-caisse ──────────────────────────────────────────────

router.get('/', async (req: any, res: Response) => {
  const periode = analyserPeriode(req.query.debut, req.query.fin)
  if ('erreur' in periode) {
    res.status(400).json({ error: periode.erreur })
    return
  }

  try {
    const commandes = await prisma.order.findMany({
      where: {
        companyId: req.companyId,
        status: 'PAID',
        paidAt: { gte: periode.debut, lte: periode.fin },
      },
      orderBy: { paidAt: 'asc' },
      include: {
        table: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    // ── Agrégats
    const parMethode: Record<string, { nb: number; total: number }> = {}
    const parJour: Record<string, { total: number; nb: number }> = {}
    const parProduit: Record<string, { nom: string; quantite: number; total: number }> = {}
    const parVendeur: Record<string, { nb: number; total: number }> = {}

    let totalTTC = 0
    let totalHT = 0
    let totalTva = 0

    for (const c of commandes) {
      totalTTC += c.total
      totalHT += c.subtotal
      totalTva += c.taxAmount

      const methode = c.paymentMethod || 'non précisé'
      parMethode[methode] ??= { nb: 0, total: 0 }
      parMethode[methode].nb++
      parMethode[methode].total += c.total

      const jour = jourLocal(c.paidAt as Date)
      parJour[jour] ??= { total: 0, nb: 0 }
      parJour[jour].total += c.total
      parJour[jour].nb++

      const vendeur = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'Inconnu'
      parVendeur[vendeur] ??= { nb: 0, total: 0 }
      parVendeur[vendeur].nb++
      parVendeur[vendeur].total += c.total

      for (const l of c.items) {
        const nom = l.product?.name || 'Produit supprimé'
        parProduit[l.productId] ??= { nom, quantite: 0, total: 0 }
        parProduit[l.productId].quantite += l.quantity
        parProduit[l.productId].total += l.unitPrice * l.quantity
      }
    }

    const arrondirGroupe = <T extends { total: number }>(o: Record<string, T>) =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, total: centimes(v.total) }]))

    res.json({
      debut: periode.debut.toISOString(),
      fin: periode.fin.toISOString(),
      nbVentes: commandes.length,
      totalTTC: centimes(totalTTC),
      totalHT: centimes(totalHT),
      totalTva: centimes(totalTva),
      panierMoyen: commandes.length ? centimes(totalTTC / commandes.length) : 0,
      parMethode: arrondirGroupe(parMethode),
      parVendeur: arrondirGroupe(parVendeur),
      parJour: Object.entries(parJour)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, total: centimes(v.total), nb: v.nb })),
      topProduits: Object.values(parProduit)
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, 20)
        .map((p) => ({ ...p, total: centimes(p.total) })),
      // Le détail ligne à ligne, pour l'export et l'impression.
      ventes: commandes.map((c) => ({
        id: c.id,
        numero: c.orderNumber,
        horodatage: (c.paidAt as Date).toISOString(),
        table: c.table?.name || null,
        vendeur: `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'Inconnu',
        methode: c.paymentMethod || 'non précisé',
        sousTotal: centimes(c.subtotal),
        tva: centimes(c.taxAmount),
        total: centimes(c.total),
        lignes: c.items.map((l) => ({
          nom: l.product?.name || 'Produit supprimé',
          quantite: l.quantity,
          prixUnitaire: centimes(l.unitPrice),
          tauxTva: l.taxRate,
        })),
      })),
    })
  } catch (error) {
    logger.error('Erreur GET /rapports-caisse:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
