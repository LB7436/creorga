import { describe, expect, it } from 'vitest'
import { createFloorStateClient } from './floorStateClient'
import type { FloorState } from './useFloorState'

const floor = (updatedAt: number, name = 'Table verte'): FloorState => ({
  tables: [{ id: 'table-3', name, seats: 4, section: 'Salle', shape: 'round', status: 'OCCUPEE', x: 20, y: 40,
    items: [{ id: 'ligne-cafe', name: 'Café', price: 2.4, qty: 2, addedAt: 1 }] }],
  chairs: [], photos: [], zones: [{ id: 'salle', name: 'Salle' }], updatedAt,
})

function lab() {
  let scope = 'société-a/session-1'
  const scopes = new Set<() => void>()
  const requests: Array<{ init?: RequestInit; resolve: (value: Response) => void; reject: (error: Error) => void }> = []
  const client = createFloorStateClient({ base: '/api/floor-state', getScope: () => scope,
    subscribeScope: (callback) => { scopes.add(callback); return () => { scopes.delete(callback) } },
    fetcher: (_url, init) => new Promise<Response>((resolve, reject) => { requests.push({ init, resolve, reject }) }),
  })
  client.start()
  return { client, requests, changeScope: (next: string) => { scope = next; scopes.forEach((callback) => callback()) } }
}

describe('client réel de plan de salle', () => {
  it('lit le plan sans réécrire ses montants puis porte la révision du serveur au PATCH', async () => {
    const { client, requests } = lab()
    const read = client.refresh()
    requests[0].resolve(Response.json(floor(100)))
    await read
    expect(client.getSnapshot().state?.tables[0].items).toEqual([{ id: 'ligne-cafe', name: 'Café', price: 2.4, qty: 2, addedAt: 1 }])
    const write = client.mutate('/tables/table-3/position', 'PATCH', { x: 80, y: 90 })
    expect(new Headers(requests[1].init?.headers).get('If-Match')).toBe('100')
    requests[1].resolve(Response.json(floor(101)))
    await write
    expect(client.getSnapshot().state?.updatedAt).toBe(101)
    client.stop()
  })

  it('une ancienne réponse PATCH ne remplace pas le GET plus récent ni sa révision CAS', async () => {
    const { client, requests } = lab()
    const patch = client.mutate('/tables/table-3/position', 'PATCH', { x: 80 })
    const read = client.refresh()
    requests[1].resolve(Response.json(floor(300, 'Salle actuelle')))
    await read
    requests[0].resolve(Response.json(floor(200, 'Ancienne salle')))
    await patch
    expect(client.getSnapshot().state?.tables[0].name).toBe('Salle actuelle')
    const next = client.mutate('/tables/table-3/position', 'PATCH', { x: 90 })
    expect(new Headers(requests[2].init?.headers).get('If-Match')).toBe('300')
    requests[2].resolve(Response.json(floor(301)))
    await next
    client.stop()
  })

  it('un ancien GET ne remplace pas une mutation récente', async () => {
    const { client, requests } = lab()
    const read = client.refresh(), patch = client.mutate('/tables/table-3/position', 'PATCH', { x: 80 })
    requests[1].resolve(Response.json(floor(400)))
    await patch
    requests[0].resolve(Response.json(floor(399)))
    await read
    expect(client.getSnapshot().state?.updatedAt).toBe(400)
    client.stop()
  })

  it('une génération IA ancienne conserve le dernier état connu', async () => {
    const { client, requests } = lab()
    const ai = client.generate('Ajouter une terrasse'), read = client.refresh()
    requests[1].resolve(Response.json(floor(500)))
    await read
    requests[0].resolve(Response.json({ state: floor(499), aiResponse: { message: 'Proposition' } }))
    const result = await ai
    expect(result.state.updatedAt).toBe(500)
    expect(client.getSnapshot().state?.updatedAt).toBe(500)
    client.stop()
  })

  it.each(['GET', 'PATCH', 'IA'])('%s refuse une réponse structurellement invalide sans écraser le plan', async (mode) => {
    const { client, requests } = lab()
    const initial = client.refresh()
    requests[0].resolve(Response.json(floor(600)))
    await initial
    const pending = (mode === 'GET' ? client.refresh() : mode === 'IA' ? client.generate('Salle') : client.mutate('/tables/x', 'PATCH', { name: 'Test' })).catch((error) => error)
    const invalid = { ...floor(601), tables: [null], updatedAt: '601' }
    requests[1].resolve(Response.json(mode === 'IA' ? { state: invalid, aiResponse: {} } : invalid))
    await pending
    expect(client.getSnapshot().state?.updatedAt).toBe(600)
    expect(client.getSnapshot().error).toBe('Réponse du plan de salle invalide')
    client.stop()
  })

  it('une société changée durant le décodage JSON ne reçoit pas les données de l’ancienne société', async () => {
    const { client, requests, changeScope } = lab()
    let complete!: () => void
    let reading!: () => void
    const started = new Promise<void>((resolve) => { reading = resolve })
    const body = new ReadableStream<Uint8Array>({
      start(controller) { complete = () => { controller.enqueue(new TextEncoder().encode(JSON.stringify(floor(700)))); controller.close() } },
      pull() { reading() },
    })
    const write = client.mutate('/tables/x', 'PATCH', { name: 'A' }).catch((error) => error)
    requests[0].resolve(new Response(body))
    await started
    changeScope('société-b/session-1')
    complete()
    expect(await write).toMatchObject({ code: 'ERR_CANCELED' })
    expect(client.getSnapshot()).toEqual({ state: null, error: null })
    const next = client.refresh()
    requests[1].resolve(Response.json(floor(1, 'Salle de B')))
    await next
    expect(client.getSnapshot().state?.tables[0].name).toBe('Salle de B')
    client.stop()
  })

  it('A → B → A annule définitivement les réponses de l’ancienne visite A', async () => {
    const { client, requests, changeScope } = lab()
    const old = client.refresh()
    changeScope('société-b/session-1')
    changeScope('société-a/session-1')
    const fresh = client.refresh()
    requests[1].resolve(Response.json(floor(800, 'Nouvelle visite A')))
    await fresh
    requests[0].resolve(Response.json(floor(801, 'Ancienne visite A')))
    await old
    expect(client.getSnapshot().state?.tables[0].name).toBe('Nouvelle visite A')
    expect(requests[0].init?.signal?.aborted).toBe(true)
    client.stop()
  })

  it('un échec réseau conserve les données et expose une erreur, sans rejouer une écriture', async () => {
    const { client, requests } = lab()
    const read = client.refresh()
    requests[0].resolve(Response.json(floor(900)))
    await read
    const write = client.mutate('/tables/x', 'PATCH', { name: 'A' }).catch((error) => error)
    requests[1].reject(new TypeError('Réseau interrompu'))
    expect(await write).toMatchObject({ message: 'Réseau interrompu' })
    expect(client.getSnapshot().state?.updatedAt).toBe(900)
    expect(client.getSnapshot().error).toBe('Réseau interrompu')
    expect(requests).toHaveLength(2)
    client.stop()
  })

  it('une erreur ancienne ne masque pas le rétablissement d’une lecture plus récente', async () => {
    const { client, requests } = lab()
    const old = client.refresh(), fresh = client.refresh()
    requests[1].resolve(Response.json(floor(1000)))
    await fresh
    requests[0].reject(new TypeError('Ancienne panne'))
    await old
    expect(client.getSnapshot().error).toBeNull()
    client.stop()
  })

  it('le conflit CAS reste un refus explicite et ne remet pas la révision à zéro', async () => {
    const { client, requests } = lab()
    const read = client.refresh()
    requests[0].resolve(Response.json(floor(1100)))
    await read
    const write = client.mutate('/tables/x', 'PATCH', { name: 'A' }).catch((error) => error)
    requests[1].resolve(Response.json({ error: 'La salle a changé : rechargez le plan.' }, { status: 409 }))
    expect(await write).toMatchObject({ message: 'La salle a changé : rechargez le plan.' })
    expect(client.getSnapshot().state?.updatedAt).toBe(1100)
    expect(client.getSnapshot().error).toBe('La salle a changé : rechargez le plan.')
    client.stop()
  })

  it('le démontage puis redémarrage ne réactive pas les requêtes du cycle précédent', async () => {
    const { client, requests } = lab()
    const old = client.refresh()
    client.stop()
    client.start()
    const fresh = client.refresh()
    requests[1].resolve(Response.json(floor(1200, 'Cycle courant')))
    await fresh
    requests[0].resolve(Response.json(floor(1201, 'Cycle démonté')))
    await old
    expect(client.getSnapshot().state?.tables[0].name).toBe('Cycle courant')
    expect(requests[0].init?.signal?.aborted).toBe(true)
    client.stop()
  })

  it('un callback de formulaire conservé avant A → B → A ne soumet pas sa commande dans le nouveau contexte', async () => {
    const { client, requests, changeScope } = lab()
    const actions = client.bindActions()
    changeScope('société-b/session-1')
    changeScope('société-a/session-1')
    await expect(actions.mutate('/tables/x', 'PATCH', { name: 'Ancienne saisie' })).rejects.toMatchObject({ code: 'ERR_CANCELED' })
    expect(requests).toHaveLength(0)
    client.stop()
  })

  it.each([
    ['une révision non finie', { ...floor(1), updatedAt: Number.NaN }],
    ['des lignes sans collection', { ...floor(1), tables: [{ ...floor(1).tables[0], items: null }] }],
    ['une quantité textuelle', { ...floor(1), tables: [{ ...floor(1).tables[0], items: [{ id: 'l', name: 'Café', price: 2, qty: '2', addedAt: 1 }] }] }],
  ])('refuse %s', async (_name, invalid) => {
    const { client, requests } = lab()
    const read = client.refresh()
    requests[0].resolve(Response.json(invalid))
    await read
    expect(client.getSnapshot()).toEqual({ state: null, error: 'Réponse du plan de salle invalide' })
    client.stop()
  })

  it('conserve les extensions de prix et de provenance reçues sans recalcul fiscal client', async () => {
    const { client, requests } = lab()
    const read = client.refresh()
    requests[0].resolve(Response.json({ ...floor(1), lineOrigins: { 'ligne-cafe': 'qr-original' },
      posPricing: { 'ligne-cafe': { priceCents: 240, taxRate: 17, source: 'catalog' } } }))
    await read
    expect(client.getSnapshot().state).toMatchObject({ lineOrigins: { 'ligne-cafe': 'qr-original' },
      posPricing: { 'ligne-cafe': { priceCents: 240, taxRate: 17, source: 'catalog' } } })
    client.stop()
  })
})
