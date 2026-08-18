import { usePOS } from '../store/posStore'

/**
 * Bridge: POS 5175 local state → shared backend /api/floor-state.
 * Subscribes to Zustand changes and pushes relevant deltas to the backend,
 * so the web app (5174) sees the same tables/orders in real time.
 *
 * One-way sync (POS → backend). Readers on 5174 poll independently.
 */
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
// Token device POS (requis en production, cf. backend middleware/deviceAuth)
export const DEVICE_TOKEN = (import.meta as any).env?.VITE_POS_DEVICE_TOKEN || ''
export const deviceHeaders = (): Record<string, string> =>
  DEVICE_TOKEN ? { 'X-Device-Token': DEVICE_TOKEN } : {}

let lastSerialised = ''
let syncTimer: ReturnType<typeof setTimeout> | null = null

async function push(tables: any[]) {
  try {
    // Map POS table format → floor-state format
    const mapped = tables.map((t: any) => ({
      id: t.id,
      name: t.name,
      seats: t.seats,
      section: t.section,
      shape: t.shape === 'bar' ? 'bar' : (t.shape as 'round' | 'square' | 'rect'),
      status: statusMap(t.status),
      x: t.x, y: t.y,
      openedAt: t.openedAt,
      items: (t.covers || []).flatMap((c: any) => (c.items || []).map((i: any) => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty, note: i.note, addedAt: Date.now(),
      }))),
    }))

    await fetch(`${BACKEND}/api/floor-state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
      body: JSON.stringify({ tables: mapped }),
    })
  } catch { /* backend down: ignore */ }
}

function statusMap(s: string): 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'NETTOYAGE' {
  if (s === 'occupied') return 'OCCUPEE'
  if (s === 'reserved') return 'RESERVEE'
  if (s === 'dirty') return 'NETTOYAGE'
  return 'LIBRE'
}

export function startFloorBridge() {
  // Debounced sync on every state change
  const trigger = () => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      const tables = usePOS.getState().tables
      const serialised = JSON.stringify(tables)
      if (serialised !== lastSerialised) {
        lastSerialised = serialised
        push(tables)
      }
    }, 400)
  }

  // Initial push
  trigger()

  // Subscribe
  return usePOS.subscribe(trigger)
}

/* ------------------------------------------------------------------ */
/* Pont ventes → stock                                                 */
/* ------------------------------------------------------------------ */

const CLE_FILE_ATTENTE = 'creorga-pos-ventes-a-pousser'

/** Ventes encaissées mais pas encore confirmées par le serveur. */
function lireFile(): string[] {
  try { return JSON.parse(localStorage.getItem(CLE_FILE_ATTENTE) || '[]') } catch { return [] }
}
function ecrireFile(ids: string[]) {
  localStorage.setItem(CLE_FILE_ATTENTE, JSON.stringify(ids))
}

let poussee = false

/**
 * Pousse une vente au serveur pour décrémenter le stock.
 *
 * Le serveur est idempotent par `venteId` : rejouer après une coupure ne
 * décrémente pas deux fois. Une vente qui échoue reste dans la file et sera
 * rejouée à la prochaine vente ou au retour du réseau — le stock rattrape,
 * il ne se perd pas.
 */
async function pousserVente(vente: { id: string; lignes: Array<{ name: string; qty: number }>; vendeur: string }): Promise<boolean> {
  try {
    const r = await fetch(`${BACKEND}/api/stock-ventes/vente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...deviceHeaders() },
      body: JSON.stringify({ venteId: vente.id, lignes: vente.lignes, vendeur: vente.vendeur }),
    })
    if (!r.ok) {
      // 4xx = la vente est refusée pour de bon (corps invalide) : inutile de
      // la rejouer indéfiniment, mais on le dit.
      if (r.status >= 400 && r.status < 500) {
        console.error(`[stock] vente ${vente.id} refusée par le serveur (${r.status}) — non rejouée`)
        return true
      }
      return false
    }
    return true
  } catch {
    return false
  }
}

async function viderFile() {
  if (poussee) return
  poussee = true
  try {
    const ventes = usePOS.getState().ventes
    let file = lireFile()
    for (const id of [...file]) {
      const vente = ventes.find(v => v.id === id)
      if (!vente) { file = file.filter(x => x !== id); continue }   // clôturée entre-temps
      const ok = await pousserVente(vente)
      if (!ok) break                                                // réseau : on réessaiera
      file = file.filter(x => x !== id)
    }
    ecrireFile(file)
  } finally {
    poussee = false
  }
}

/**
 * Chaque nouvelle vente du journal est mise en file puis poussée.
 * Sans ce pont, la caisse encaissait sans que le stock ne bouge jamais.
 */
export function startStockBridge() {
  let derniereVenteVue = usePOS.getState().ventes[0]?.id ?? null
  const desabonner = usePOS.subscribe((etat) => {
    const derniere = etat.ventes[0]
    if (!derniere || derniere.id === derniereVenteVue) return
    // Plusieurs ventes peuvent arriver d'un coup (rare) : on prend toutes
    // celles qui précèdent la dernière vue.
    const nouvelles: string[] = []
    for (const v of etat.ventes) {
      if (v.id === derniereVenteVue) break
      nouvelles.push(v.id)
    }
    derniereVenteVue = derniere.id
    ecrireFile([...lireFile(), ...nouvelles.reverse()])
    void viderFile()
  })
  // Rejeu au démarrage et au retour du réseau.
  void viderFile()
  window.addEventListener('online', () => void viderFile())
  return desabonner
}
