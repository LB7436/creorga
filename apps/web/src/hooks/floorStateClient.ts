import type { FloorState } from './useFloorState'

interface FloorClientOptions {
  base: string
  fetcher: (url: string, init?: RequestInit) => Promise<Response>
  getScope: () => string
  subscribeScope: (listener: () => void) => () => void
}

interface FloorSnapshot { state: FloorState | null; error: string | null }

const object = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown): value is string => typeof value === 'string'
const items = (value: unknown) => Array.isArray(value) && value.every((item) => object(item)
  && text(item.id) && text(item.name) && finite(item.price) && item.price >= 0
  && finite(item.qty) && item.qty > 0 && finite(item.addedAt))

/** Vérifie les données que consomme l'écran, sans enlever les extensions métier. */
function usableFloor(value: unknown): value is FloorState {
  return object(value) && finite(value.updatedAt) && value.updatedAt >= 0
    && Array.isArray(value.tables) && value.tables.every((table) => object(table)
      && text(table.id) && text(table.name) && finite(table.seats) && text(table.section)
      && ['round', 'square', 'rect', 'bar'].includes(table.shape)
      && ['LIBRE', 'OCCUPEE', 'RESERVEE', 'NETTOYAGE'].includes(table.status)
      && finite(table.x) && finite(table.y) && items(table.items))
    && Array.isArray(value.chairs) && value.chairs.every((chair) => object(chair)
      && text(chair.id) && text(chair.label) && (chair.tableId === null || text(chair.tableId)) && items(chair.items))
    && Array.isArray(value.zones) && value.zones.every((zone) => object(zone) && text(zone.id) && text(zone.name))
    && Array.isArray(value.photos) && value.photos.every((photo) => object(photo) && text(photo.id)
      && text(photo.dataUrl) && finite(photo.x) && finite(photo.y) && finite(photo.w) && finite(photo.h))
}

/**
 * Une seule autorité de lecture pour GET, mutations et génération de salle.
 * Annuler le transport ne prétend pas annuler une écriture déjà reçue côté serveur.
 */
export function createFloorStateClient(options: FloorClientOptions) {
  let snapshot: FloorSnapshot = { state: null, error: null }
  let scope = options.getScope(), generation = 0, scopeGeneration = 0, sequence = 0, latestOutcome = 0
  let active = false
  let unsubscribeScope: (() => void) | undefined
  const listeners = new Set<() => void>()
  const controllers = new Set<AbortController>()
  const publish = (next: FloorSnapshot) => { snapshot = next; listeners.forEach((listener) => listener()) }
  const cancelPending = () => { generation++; controllers.forEach((controller) => controller.abort()); controllers.clear() }
  const synchronizeScope = () => {
    const next = options.getScope()
    if (next === scope) return
    scope = next
    scopeGeneration++
    cancelPending()
    latestOutcome = 0
    publish({ state: null, error: null })
  }
  const canceled = () => Object.assign(new Error('Le contexte de salle a changé ; rechargez avant de continuer.'), { code: 'ERR_CANCELED' })

  async function request(path: string, method = 'GET', body?: unknown, generated = false) {
    synchronizeScope()
    if (!active) throw canceled()
    const requestGeneration = generation, requestSequence = ++sequence
    const controller = new AbortController()
    controllers.add(controller)
    const current = () => active && requestGeneration === generation && options.getScope() === scope
    const assertCurrent = () => { if (!current()) throw canceled() }
    try {
      const response = await options.fetcher(`${options.base}${path}`, {
        method,
        signal: controller.signal,
        headers: method === 'GET' ? undefined : { 'If-Match': String(snapshot.state?.updatedAt ?? 0), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      assertCurrent()
      if (!response.ok) {
        const raw = await response.text()
        assertCurrent()
        let message = raw
        try { const payload = JSON.parse(raw); message = typeof payload?.error === 'string' ? payload.error : raw } catch { /* réponse non JSON */ }
        throw new Error(message || `HTTP ${response.status}`)
      }
      const data = await response.json()
      // Le contexte peut changer après réception des en-têtes, pendant le JSON.
      assertCurrent()
      const state: unknown = generated ? data?.state : data
      if (!usableFloor(state)) throw new Error('Réponse du plan de salle invalide')
      const nextState = !snapshot.state || state.updatedAt >= snapshot.state.updatedAt ? state : snapshot.state
      const error = requestSequence >= latestOutcome ? null : snapshot.error
      latestOutcome = Math.max(latestOutcome, requestSequence)
      if (nextState !== snapshot.state || error !== snapshot.error) publish({ state: nextState, error })
      return generated ? { ...data, state: nextState } : nextState
    } catch (error) {
      if (!current()) throw canceled()
      if (requestSequence >= latestOutcome) {
        latestOutcome = requestSequence
        publish({ ...snapshot, error: error instanceof Error ? error.message : 'Échec de lecture du plan de salle' })
      }
      throw error
    } finally {
      controllers.delete(controller)
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    start: () => {
      if (active) return
      active = true
      synchronizeScope()
      unsubscribeScope = options.subscribeScope(synchronizeScope)
    },
    stop: () => {
      active = false
      unsubscribeScope?.()
      unsubscribeScope = undefined
      cancelPending()
    },
    refresh: async () => {
      try { await request('') } catch { /* l'erreur courante est exposée dans le snapshot */ }
    },
    mutate: (path: string, method: string, body?: unknown): Promise<FloorState> => request(path, method, body),
    generate: (prompt: string): Promise<{ state: FloorState; aiResponse: any }> => request('/ai-generate', 'POST', { prompt }, true),
    bindActions: () => {
      const boundScope = scope, boundGeneration = scopeGeneration
      const assertBound = () => {
        if (!active || scopeGeneration !== boundGeneration || options.getScope() !== boundScope) throw canceled()
      }
      return {
        mutate: async (path: string, method: string, body?: unknown): Promise<FloorState> => {
          assertBound()
          return request(path, method, body)
        },
        generate: async (prompt: string): Promise<{ state: FloorState; aiResponse: any }> => {
          assertBound()
          return request('/ai-generate', 'POST', { prompt }, true)
        },
      }
    },
  }
}
