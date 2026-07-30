import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Non-régression du P0 n°1 : le flux opérateur de Robi partait sans jeton.
 *
 * `new EventSource(url)` ne peut pas porter d'en-tête. Le flux étant monté
 * derrière `authenticate`, il répondait 401 et la fonctionnalité était morte.
 */

const flux = (morceaux: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controleur) {
      const encodeur = new TextEncoder()
      morceaux.forEach((m) => controleur.enqueue(encodeur.encode(m)))
      controleur.close()
    },
  })

let appels: Array<{ url: string; init: RequestInit }>

const poserEnvironnement = (corps: ReadableStream<Uint8Array>) => {
  appels = []
  ;(globalThis as any).window = {
    location: { pathname: '/dashboard', href: '/dashboard' },
    localStorage: { getItem: () => null },
  }
  ;(globalThis as any).fetch = vi.fn(async (url: any, init: RequestInit = {}) => {
    appels.push({ url: String(url), init })
    return { ok: true, status: 200, body: corps } as unknown as Response
  })
}

describe('ouvrirFluxAuthentifie', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete (globalThis as any).window
    delete (globalThis as any).fetch
  })

  it('envoie le jeton dans l en-tete Authorization', async () => {
    poserEnvironnement(flux(['data: {"type":"connected"}\n\n']))
    const { ouvrirFluxAuthentifie } = await import('./sseAuth')
    const { useAuthStore } = await import('@/stores/authStore')
    useAuthStore.getState().setAccessToken('jeton-valide')

    const recus: string[] = []
    const fermer = ouvrirFluxAuthentifie('http://x/api/agent/operator/stream', {
      onMessage: (d) => recus.push(d),
    })
    await vi.waitFor(() => expect(recus.length).toBe(1))
    fermer()

    const entetes = new Headers(appels[0].init.headers)
    expect(entetes.get('Authorization')).toBe('Bearer jeton-valide')
    expect(entetes.get('Accept')).toBe('text/event-stream')
  })

  it('decoupe les evenements et recolle les lignes data multiples', async () => {
    // Deux évènements, dont un scindé au milieu par la découpe réseau.
    poserEnvironnement(flux(['data: un\n\ndata: de', 'ux\ndata: suite\n\n']))
    const { ouvrirFluxAuthentifie } = await import('./sseAuth')

    const recus: string[] = []
    const fermer = ouvrirFluxAuthentifie('http://x/api/agent/operator/stream', {
      onMessage: (d) => recus.push(d),
    })
    await vi.waitFor(() => expect(recus.length).toBe(2))
    fermer()

    expect(recus[0]).toBe('un')
    expect(recus[1]).toBe('deux\nsuite')
  })
})
