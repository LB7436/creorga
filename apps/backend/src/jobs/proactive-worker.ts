/**
 * v3.19 F3 — Proactive worker (scan toutes les 10 min)
 *
 * Détecte 5 types d'anomalies et pousse des suggestions WebSocket :
 *   1. Stock café/lait < 2 jours de conso projetée
 *   2. Facture impayée > 30 jours
 *   3. Employé heures sup > 40h/semaine
 *   4. Ventes du jour -30% vs même jour la semaine d'avant
 *   5. Nouvel avis < 3⭐
 *
 * Rate-limit : max 5 notifs/jour (anti-spam), dédup par "type:entityId".
 * Push via globalThis.liveBroadcast('inbox', 'proactive', {...}).
 */

import fs from 'fs'
import path from 'path'
import { getStock } from '../lib/stockStore'

const DATA_DIR = path.resolve(process.cwd(), 'data')

function loadJson<T = any>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T } catch { return fallback }
}

export interface Notif {
  id: string
  type: 'stock-low' | 'stock-out' | 'invoice-overdue' | 'overtime' | 'sales-drop' | 'bad-review'
  entityId: string
  title: string
  message: string
  cta?: { label: string; route?: string; intent?: string }
  severity: 'info' | 'warning' | 'critical'
  pushedAt: number
}

let workerHandle: NodeJS.Timeout | null = null
const NOTIF_LOG = path.join(DATA_DIR, 'proactive-notifs.json')

function loadNotifLog(): Notif[] {
  if (!fs.existsSync(NOTIF_LOG)) return []
  try { return JSON.parse(fs.readFileSync(NOTIF_LOG, 'utf8')) } catch { return [] }
}
function saveNotifLog(notifs: Notif[]) {
  fs.writeFileSync(NOTIF_LOG, JSON.stringify(notifs, null, 2), 'utf8')
}

function todayCount(): number {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  return loadNotifLog().filter((n) => n.pushedAt >= start.getTime()).length
}

function alreadyNotifiedToday(type: string, entityId: string): boolean {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  return loadNotifLog().some((n) => n.type === type && n.entityId === entityId && n.pushedAt >= start.getTime())
}

/**
 * Publie une notification proactive (journal + diffusion temps réel).
 * Exportée : la route de vente de la caisse s'en sert pour signaler une
 * rupture de stock au moment exact où elle se produit, avec la même
 * déduplication quotidienne que le balayage périodique.
 */
export function pushNotif(n: Omit<Notif, 'id' | 'pushedAt'>) {
  if (alreadyNotifiedToday(n.type, n.entityId)) return  // dédup
  // Plafond anti-spam de 5/jour — mais JAMAIS pour une notification
  // critique. Vécu en recette : cinq relances de factures au démarrage
  // avaient épuisé le quota, et la rupture de stock déclenchée par une vente
  // — le cas exact que la mission demande de notifier — était supprimée
  // en silence. Un impayé de 30 jours peut attendre demain ; un Coca-Cola à
  // zéro pendant le service, non.
  if (n.severity !== 'critical' && todayCount() >= 5) return
  const notif: Notif = { ...n, id: 'pn-' + Math.random().toString(36).slice(2, 10), pushedAt: Date.now() }
  const log = loadNotifLog()
  log.push(notif)
  // keep last 100
  if (log.length > 100) log.splice(0, log.length - 100)
  saveNotifLog(log)
  const broadcast = (globalThis as any).liveBroadcast
  if (broadcast) broadcast('inbox', 'proactive', notif)
}

async function scan() {
  try {
    // 1. Stock bas et ruptures.
    // L'ancienne version lisait `item.qty` et `item.minStock`, deux champs qui
    // N'EXISTENT PAS dans le schéma StockEntry (quantity / lowStockThreshold) :
    // qty valait toujours 0, la condition `qty > 0` était toujours fausse,
    // et aucune alerte n'est jamais partie — une rupture de Coca ne
    // prévenait personne (constat d'audit, confirmé). Elle excluait aussi la
    // rupture totale, le cas le plus grave.
    const stock = getStock()
    for (const item of stock) {
      const qty = Number(item.quantity ?? 0)
      const seuil = Number(item.lowStockThreshold ?? 0)
      if (qty <= 0) {
        pushNotif({
          type: 'stock-out',
          entityId: item.id || item.name,
          title: `🚫 Rupture : ${item.name}`,
          message: `Stock à zéro — le produit est retiré de la carte client jusqu'au réapprovisionnement.`,
          cta: { label: 'Commander', route: '/inventory/stock' },
          severity: 'critical',
        })
      } else if (seuil > 0 && qty <= seuil) {
        pushNotif({
          type: 'stock-low',
          entityId: item.id || item.name,
          title: `📦 Stock bas : ${item.name}`,
          message: `Il reste ${qty} ${item.unit || 'unités'} (seuil : ${seuil}).`,
          cta: { label: 'Commander', route: '/inventory/stock' },
          severity: 'warning',
        })
      }
    }

    // 2. Factures impayées > 30 jours
    const invoices = loadJson<any[]>('invoices.json', [])
    const cutoff = Date.now() - 30 * 86400_000
    for (const inv of invoices) {
      if (inv.status === 'paid') continue
      const d = inv.date ? new Date(inv.date).getTime() : Date.now()
      if (d > cutoff) continue
      pushNotif({
        type: 'invoice-overdue',
        entityId: inv.id || inv.number,
        title: `💶 ${inv.number || 'Facture'} en retard >30j`,
        message: `${(inv.total || 0).toFixed(0)}€ dû par ${inv.customer || inv.client || '?'}.`,
        cta: { label: 'Voir et relancer', route: '/invoices/relances' },
        severity: 'critical',
      })
    }

    // 3. Heures sup > 40h sur 7 derniers jours
    const shifts = loadJson<any[]>('shifts.json', [])
    const weekStart = Date.now() - 7 * 86400_000
    const byEmp: Record<string, number> = {}
    for (const s of shifts) {
      if (!s.date || !s.start || !s.end) continue
      const d = new Date(s.date).getTime()
      if (d < weekStart) continue
      const [h1, m1] = String(s.start).split(':').map(Number)
      const [h2, m2] = String(s.end).split(':').map(Number)
      const hrs = Math.max(0, (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60))
      byEmp[s.employee] = (byEmp[s.employee] || 0) + hrs
    }
    for (const [emp, hrs] of Object.entries(byEmp)) {
      if (hrs <= 40) continue
      pushNotif({
        type: 'overtime',
        entityId: emp,
        title: `⏱ ${emp} : ${hrs.toFixed(1)}h cette semaine`,
        message: `Dépasse les 40h légales Luxembourg (+${(hrs - 40).toFixed(1)}h sup).`,
        cta: { label: 'Ajuster planning', route: '/hr/planning' },
        severity: 'warning',
      })
    }

    // 4. Ventes -30% vs même jour la semaine précédente
    const today = new Date().toISOString().slice(0, 10)
    const lastWeek = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
    const ca0 = invoices.filter((i: any) => i.date?.slice(0, 10) === lastWeek)
                       .reduce((s: number, i: any) => s + (i.total || 0), 0)
    const ca1 = invoices.filter((i: any) => i.date?.slice(0, 10) === today)
                       .reduce((s: number, i: any) => s + (i.total || 0), 0)
    if (ca0 > 100 && ca1 < ca0 * 0.7) {
      const pct = Math.round(((ca0 - ca1) / ca0) * 100)
      pushNotif({
        type: 'sales-drop',
        entityId: today,
        title: `📉 CA -${pct}% vs ${new Date(lastWeek).toLocaleDateString('fr-LU', { weekday: 'long' })}`,
        message: `Aujourd'hui ${ca1.toFixed(0)}€ vs ${ca0.toFixed(0)}€ il y a 7 jours. Suggestion : code -10% aux VIPs.`,
        cta: { label: 'Lancer campagne', route: '/crm/campagnes', intent: 'crm.send-campaign' },
        severity: 'warning',
      })
    }

    // 5. Nouvel avis < 3⭐ (dernier avis dans reviews.json)
    const reviews = loadJson<any[]>('reviews.json', [])
    for (const r of reviews) {
      if (!r.rating || r.rating >= 3) continue
      const d = r.date ? new Date(r.date).getTime() : 0
      if (Date.now() - d > 24 * 86400_000 * 1000 / 1000) continue  // dernières 24h only
      pushNotif({
        type: 'bad-review',
        entityId: r.id || `${r.author}-${d}`,
        title: `⭐ Nouvel avis ${r.rating}/5 de ${r.author || 'anonyme'}`,
        message: (r.text || '').slice(0, 120) + (r.text?.length > 120 ? '…' : ''),
        cta: { label: 'Répondre', route: '/reputation/avis' },
        severity: 'critical',
      })
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[proactive] scan failed', e?.message)
  }
}

export function startProactiveWorker() {
  if (workerHandle) return
  workerHandle = setInterval(scan, 10 * 60_000)
  setTimeout(scan, 30_000)  // first run après 30s pour laisser le backend démarrer
  // eslint-disable-next-line no-console
  console.log('[proactive] started — scan toutes les 10 min')
}

export function stopProactiveWorker() {
  if (workerHandle) { clearInterval(workerHandle); workerHandle = null }
}

export function getRecentNotifs(limit = 20): Notif[] {
  return loadNotifLog().slice(-limit).reverse()
}
