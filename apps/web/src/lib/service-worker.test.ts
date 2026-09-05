import vm from 'node:vm'
import fs from 'node:fs'
import { describe, it, expect, vi } from 'vitest'

function worker(fetch: any) {
  const handlers: Record<string, any> = {}, caches = { open: vi.fn() }
  const self = { location: { origin: 'http://localhost' }, addEventListener: (key: string, fn: any) => { handlers[key] = fn } }
  vm.runInNewContext(fs.readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch, Response, URL, Promise })
  return { handlers, caches }
}
describe('Service worker — aucune fausse synchronisation ni cache privé', () => {
  it('retourne 503 sur une écriture hors ligne, jamais un succès en file', async () => {
    const { handlers, caches } = worker(() => Promise.reject(new Error('offline')))
    let response: Promise<Response> | undefined
    handlers.fetch({ request: new Request('http://localhost/api/crm/customers', { method: 'POST' }), respondWith: (r: any) => { response = r } })
    expect((await response)!.status).toBe(503)
    expect(caches.open).not.toHaveBeenCalled()
  })
  it('ne met jamais les documents RH ou les réponses API en cache', async () => {
    const { handlers, caches } = worker(() => Promise.resolve(new Response('document')))
    let response: Promise<Response> | undefined
    handlers.fetch({ request: new Request('http://localhost/api/hr-dossier/documents/id/fichier'), respondWith: (r: any) => { response = r } })
    expect(await (await response)!.text()).toBe('document')
    expect(caches.open).not.toHaveBeenCalled()
  })
})
