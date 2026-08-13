import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { compterLignes, poidsDonnees } from '../lib/creator/volumetrie'

/**
 * Photographie quotidienne par société (TenantMetricDaily) — la matière
 * première de la console créateur.
 *
 * Tourne toutes les heures mais ne photographie que J-1 : l'upsert sur
 * (companyId, date) rend le job idempotent et rattrape les redémarrages.
 */

const JOUR_MS = 24 * 60 * 60 * 1000

/** Minuit local du jour de `d` (discipline « jour local » de rapports-caisse). */
export function jourLocal(d: Date): Date {
  const jour = new Date(d)
  jour.setHours(0, 0, 0, 0)
  return jour
}

/**
 * Agrège les comptages (module, méthode) en usage par module.
 * Les GET sont échantillonnés à 1/5 par audit-log : le facteur ×5 est
 * réappliqué ici. Les mutations comptent brut.
 */
export function agregerUsage(
  groupes: Array<{ module: string; method: string; nombre: number }>,
): { moduleUsage: Record<string, number>; mutations: number } {
  const moduleUsage: Record<string, number> = {}
  let mutations = 0
  for (const g of groupes) {
    const pondere = g.method === 'GET' ? g.nombre * 5 : g.nombre
    moduleUsage[g.module] = (moduleUsage[g.module] ?? 0) + pondere
    if (g.method !== 'GET') mutations += g.nombre
  }
  return { moduleUsage, mutations }
}

const arrondi = (n: number) => Math.round(n * 100) / 100

export async function calculerSnapshotSociete(companyId: string, jour: Date) {
  const debut = jourLocal(jour)
  const fin = new Date(debut.getTime() + JOUR_MS)

  const evenements = await prisma.activityEvent.groupBy({
    by: ['module', 'method'],
    where: { companyId, ts: { gte: debut, lt: fin } },
    _count: { _all: true },
  })
  const { moduleUsage, mutations } = agregerUsage(
    evenements.map((e) => ({ module: e.module, method: e.method, nombre: e._count._all })),
  )

  const actifs = await prisma.activityEvent.findMany({
    where: { companyId, ts: { gte: debut, lt: fin }, userId: { not: null } },
    distinct: ['userId'],
    select: { userId: true },
  })

  const ventes = await prisma.order.aggregate({
    where: { companyId, status: 'PAID', paidAt: { gte: debut, lt: fin } },
    _sum: { total: true },
    _count: { _all: true },
  })

  const caisses = await prisma.cashDrawer.findMany({
    where: { companyId, closedAt: { gte: debut, lt: fin } },
    select: { discrepancy: true },
  })
  const cashDiscrepancy = arrondi(caisses.reduce((acc, c) => acc + Math.abs(c.discrepancy ?? 0), 0))

  // Encours d'impayés à la fin du jour photographié — toujours par dueDate,
  // jamais par le statut OVERDUE (posé à la main, donc jamais fiable).
  const impayes = await prisma.invoice.aggregate({
    where: { companyId, dueDate: { lt: fin }, status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] } },
    _sum: { total: true },
    _count: { _all: true },
  })

  const sansRecu = await prisma.expense.count({
    where: { companyId, date: { gte: debut, lt: fin }, receiptUrl: null },
  })
  const haccpLogs = await prisma.haccpLog.count({
    where: { companyId, loggedAt: { gte: debut, lt: fin } },
  })

  const rowCounts = await compterLignes(companyId)
  const dataBytes = await poidsDonnees(companyId)

  return {
    activeUsers: actifs.length,
    mutations,
    moduleUsage,
    revenue: arrondi(ventes._sum.total ?? 0),
    orders: ventes._count._all,
    cashDiscrepancy,
    invoicesOverdueCount: impayes._count._all,
    invoicesOverdueAmount: arrondi(impayes._sum.total ?? 0),
    expensesNoReceipt: sansRecu,
    haccpLogs,
    wasOpen: ventes._count._all > 0,
    rowCounts,
    dataBytes,
  }
}

/** Photographie J-1 pour toutes les sociétés. Renvoie le nombre traité. */
export async function prendreSnapshots(maintenant: Date = new Date()): Promise<number> {
  const hier = jourLocal(new Date(maintenant.getTime() - JOUR_MS))
  const societes = await prisma.company.findMany({ select: { id: true } })
  for (const societe of societes) {
    const donnees = await calculerSnapshotSociete(societe.id, hier)
    await prisma.tenantMetricDaily.upsert({
      where: { companyId_date: { companyId: societe.id, date: hier } },
      update: donnees,
      create: { companyId: societe.id, date: hier, ...donnees },
    })
  }
  return societes.length
}

let premierPassage: NodeJS.Timeout | null = null
let minuteur: NodeJS.Timeout | null = null

export function startCreatorMetrics(): void {
  if (minuteur) return
  const lancer = () => {
    prendreSnapshots()
      .then((n) => logger.info(`[creator-metrics] snapshot J-1 pris pour ${n} société(s)`))
      .catch((e) => logger.error(`[creator-metrics] snapshot impossible: ${e?.message || e}`))
  }
  // Premier passage 2 min après le démarrage, puis toutes les heures.
  premierPassage = setTimeout(lancer, 2 * 60 * 1000)
  premierPassage.unref?.()
  minuteur = setInterval(lancer, 60 * 60 * 1000)
  minuteur.unref?.()
}

export function stopCreatorMetrics(): void {
  if (premierPassage) {
    clearTimeout(premierPassage)
    premierPassage = null
  }
  if (minuteur) {
    clearInterval(minuteur)
    minuteur = null
  }
}
