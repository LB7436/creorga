import { describe, expect, it } from 'vitest'
import { createDocumentLinkList } from './document-link-list'

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
describe('Liste documentaire : lectures tardives sans écraser la décision courante', () => {
  it('ne republie pas un lien actif après la liste récente qui confirme sa révocation', async () => {
    const old = deferred<{ revoked: boolean }[]>(), current = deferred<{ revoked: boolean }[]>()
    const reader = createDocumentLinkList(), published: unknown[] = []
    const first = reader.read(() => old.promise, value => published.push(value))
    const second = reader.read(() => current.promise, value => published.push(value))
    current.resolve([{ revoked: true }]); await second
    old.resolve([{ revoked: false }]); await first
    expect(published).toEqual([[{ revoked: true }]])
  })
  it('invalide la lecture antérieure dès le début de la création, pas seulement après son accusé', async () => {
    const old = deferred<string[]>(), reader = createDocumentLinkList(), published: unknown[] = []
    const pending = reader.read(() => old.promise, value => published.push(value))
    reader.invalidate()
    old.resolve(['ancien lien']); await pending
    expect(published).toEqual([])
  })
  it('ignore même une erreur de lecture retirée au lieu de polluer une nouvelle société', async () => {
    const old = deferred<string[]>(), reader = createDocumentLinkList(), published: unknown[] = []
    const pending = reader.read(() => old.promise, value => published.push(value))
    reader.dispose(); old.reject(Error('Ancienne erreur réseau'))
    await expect(pending).resolves.toBe(false)
    expect(published).toEqual([])
  })
  it('remonte un échec courant sans inventer une liste vide ni effacer le dernier état connu', async () => {
    const reader = createDocumentLinkList(), published: unknown[] = []
    await reader.read(async () => ['lien confirmé'], value => published.push(value))
    await expect(reader.read(async () => { throw Error('Refus actuel') }, value => published.push(value))).rejects.toThrow('Refus actuel')
    expect(published).toEqual([['lien confirmé']])
  })
})
