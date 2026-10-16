// Recovery only: no migration, storage write, network call or payment replay.
const FORMAT = 'creorga-browser-recovery-v1'
const MAX_BYTES = 32 * 1024 * 1024
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const exactKeys = new Set(['creorga-pos-v2', 'creorga-pos-seats', 'creorga-chairs', 'creorga-room-designer'])
export const isRecoveryKey = (key: string) => exactKeys.has(key) ||
  /^(creorga-pos-(draft|pending|close):|creorga-floor-)/.test(key)

export interface StorageReader { readonly length: number; key(index: number): string | null; getItem(key: string): string | null }
export interface StoredValue { key: string; raw: string; sha256: string }
export interface QueueSnapshot { state: 'present' | 'absent'; records: unknown[] }
export interface CachedRecord {
  cache: string; url: string; method: string; requestHeaders: [string, string][]
  status: number; responseHeaders: [string, string][]; bodyBase64: string; sha256: string
}
export interface BrowserSnapshot {
  format: typeof FORMAT; origin: string; createdAt: string
  localStorage: StoredValue[]; offlineQueue: QueueSnapshot
  recoveryCaches: CachedRecord[]
  scope: 'one-browser-one-origin'; automaticallyImported: false
}
interface Envelope { format: typeof FORMAT; id: string; algorithm: 'AES-256-GCM'; iv: string; ciphertext: string }
interface RecoveryKey { format: typeof FORMAT; id: string; key: string }

function ensureSize(value: string) {
  if (encoder.encode(value).byteLength > MAX_BYTES) throw new Error('Export trop volumineux : conserver le profil et demander une reprise accompagnée.')
}
function requireCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error('Chiffrement indisponible : utiliser HTTPS ou localhost. Aucun export en clair.')
}
export async function sha256(value: string) {
  requireCrypto()
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('')
}
function readValues(storage: StorageReader) {
  const values: Array<{ key: string; raw: string }> = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !isRecoveryKey(key)) continue
    const raw = storage.getItem(key)
    if (raw === null) throw new Error('Données modifiées pendant la lecture. Fermer les autres onglets puis recommencer.')
    values.push({ key, raw })
  }
  values.sort((a, b) => a.key.localeCompare(b.key))
  ensureSize(JSON.stringify(values))
  return values
}

// Refuse values JSON cannot preserve; do not silently turn a Blob/Date into {} or a string.
export function assertJsonValue(value: unknown, depth = 0): void {
  if (depth > 100) throw new Error('Données imbriquées non prises en charge.')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(value, i)) throw new Error('Tableau incomplet non pris en charge.')
      assertJsonValue(value[i], depth + 1)
    }
    return
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    Object.values(value).forEach(item => assertJsonValue(item, depth + 1)); return
  }
  throw new Error('Une ancienne donnée contient un format non pris en charge. Conserver le profil ; export non validé.')
}

export async function readOfflineQueue(factory: IDBFactory): Promise<QueueSnapshot> {
  if (typeof factory.databases !== 'function') throw new Error('Inventaire IndexedDB indisponible : export complet non vérifiable dans ce navigateur.')
  const databases = await factory.databases()
  if (!databases.some(db => db.name === 'creorga-offline')) return { state: 'absent', records: [] }
  return new Promise((resolve, reject) => {
    const request = factory.open('creorga-offline') // No version change or creation.
    let settled = false
    let database: IDBDatabase | undefined
    const timeout = setTimeout(() => fail(new Error('Lecture historique trop longue. Fermer les autres onglets puis réessayer.')), 15000)
    function fail(error: Error) {
      if (settled) return
      settled = true; clearTimeout(timeout); database?.close(); reject(error)
    }
    request.onupgradeneeded = () => { request.transaction?.abort() }
    request.onerror = () => fail(new Error('Lecture IndexedDB impossible ; aucune donnée effacée.'))
    request.onblocked = () => fail(new Error('Fermer les autres onglets avant cet export.'))
    request.onsuccess = () => {
      const db = request.result
      if (settled) { db.close(); return }
      database = db
      try {
      if (!db.objectStoreNames.contains('queue')) { fail(new Error('File historique introuvable ; export non validé.')); return }
      const tx = db.transaction('queue', 'readonly')
      const records: unknown[] = []
      let bytes = 0
      let failure: Error | undefined
      const cursor = tx.objectStore('queue').openCursor()
      cursor.onsuccess = () => {
        if (!cursor.result) return
        try {
          const record = { key: cursor.result.primaryKey, value: cursor.result.value }
          assertJsonValue(record)
          bytes += encoder.encode(JSON.stringify(record)).byteLength
          if (bytes > MAX_BYTES || records.length >= 10000) throw new Error('File historique trop volumineuse ; reprise accompagnée nécessaire.')
          records.push(record); cursor.result.continue()
        } catch (error) { failure = error instanceof Error ? error : new Error('Lecture impossible.'); tx.abort() }
      }
      tx.oncomplete = () => {
        db.close()
        if (settled) return
        settled = true; clearTimeout(timeout); resolve({ state: 'present', records })
      }
      tx.onabort = tx.onerror = () => fail(failure || new Error('Lecture historique interrompue.'))
      } catch { fail(new Error('Lecture de la file historique impossible ; export non validé.')) }
    }
  })
}

async function captureRecoveryCaches(factory: CacheStorage, origin: string): Promise<CachedRecord[]> {
  const names = (await factory.keys()).filter(name => name.startsWith('creorga-')).sort()
  const result: CachedRecord[] = []
  let size = 0
  for (const name of names) {
    if (!await factory.has(name)) throw new Error('Caches modifiés pendant la lecture. Fermer les autres onglets.')
    // Cache API has no readonly handle; open is used only for a cache enumerated above.
    // No put/add/delete or service-worker activation is performed by this tool.
    const cache = await factory.open(name)
    for (const request of await cache.keys()) {
      const url = new URL(request.url)
      if (url.origin !== origin || !(url.pathname === '/__queue__' || url.pathname.startsWith('/legacy-queue-') || url.pathname.startsWith('/api/'))) continue
      const response = await cache.match(request)
      if (!response || response.type === 'opaque' || response.type === 'opaqueredirect') throw new Error('Cache historique illisible : conserver le profil, export non validé.')
      const reader = response.body?.getReader(), chunks: Uint8Array[] = []
      let length = 0
      try {
        while (reader) {
          const next = await reader.read()
          if (next.done) break
          size += next.value.byteLength; length += next.value.byteLength
          if (size > MAX_BYTES) throw new Error('Caches historiques trop volumineux ; reprise accompagnée nécessaire.')
          chunks.push(next.value)
        }
      } finally { if (reader) { await reader.cancel().catch(() => {}); reader.releaseLock() } }
      const body = new Uint8Array(length); let offset = 0
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), b => b.toString(16).padStart(2, '0')).join('')
      result.push({ cache: name, url: request.url, method: request.method, requestHeaders: Array.from(request.headers.entries()),
        status: response.status, responseHeaders: Array.from(response.headers.entries()), bodyBase64: base64(body), sha256: hash })
      if (result.length > 10000) throw new Error('Trop de caches historiques ; reprise accompagnée nécessaire.')
    }
  }
  if (JSON.stringify(names) !== JSON.stringify((await factory.keys()).filter(name => name.startsWith('creorga-')).sort())) throw new Error('Caches modifiés pendant la lecture. Fermer les autres onglets.')
  return result
}

export async function readRecoveryCaches(factory: CacheStorage, origin: string): Promise<CachedRecord[]> {
  const first = await captureRecoveryCaches(factory, origin)
  const second = await captureRecoveryCaches(factory, origin)
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Contenu des caches modifié pendant la lecture. Fermer les autres onglets.')
  return first
}

export async function collectSnapshot(storage: StorageReader, origin: string, readQueue: () => Promise<QueueSnapshot>, readCaches: () => Promise<CachedRecord[]>): Promise<BrowserSnapshot> {
  if (!/^https?:\/\//.test(origin)) throw new Error('Ouvrir cet outil sur l’adresse exacte de l’ancienne caisse, pas comme fichier local.')
  const before = readValues(storage)
  const queue = await readQueue()
  const caches = await readCaches()
  assertJsonValue(queue)
  if (JSON.stringify(before) !== JSON.stringify(readValues(storage))) throw new Error('Données modifiées pendant la lecture. Fermer les autres onglets puis recommencer.')
  const snapshot: BrowserSnapshot = {
    format: FORMAT, origin, createdAt: new Date().toISOString(),
    localStorage: await Promise.all(before.map(async entry => ({ ...entry, sha256: await sha256(entry.raw) }))),
    offlineQueue: queue, scope: 'one-browser-one-origin', automaticallyImported: false,
    recoveryCaches: caches,
  }
  ensureSize(JSON.stringify(snapshot))
  return snapshot
}

function base64(bytes: Uint8Array) {
  let result = ''
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(result)
}
function unbase64(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Fichier de reprise invalide.')
  return Uint8Array.from(atob(value), ch => ch.charCodeAt(0))
}
const aad = (id: string) => encoder.encode(`${FORMAT}:${id}`)

export async function encryptSnapshot(snapshot: BrowserSnapshot) {
  requireCrypto()
  const plain = JSON.stringify(snapshot); ensureSize(plain)
  const id = crypto.randomUUID()
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(id), tagLength: 128 }, key, encoder.encode(plain))
  const envelope: Envelope = { format: FORMAT, id, algorithm: 'AES-256-GCM', iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) }
  const recoveryKey: RecoveryKey = { format: FORMAT, id, key: base64(new Uint8Array(await crypto.subtle.exportKey('raw', key))) }
  return { id, archive: JSON.stringify(envelope), recoveryKey: JSON.stringify(recoveryKey) }
}

export async function decryptSnapshot(archive: string, keyFile: string): Promise<BrowserSnapshot> {
  requireCrypto()
  if (archive.length > MAX_BYTES * 1.5 || keyFile.length > 4096) throw new Error('Fichier de reprise trop volumineux.')
  const envelope = JSON.parse(archive) as Envelope
  const recovery = JSON.parse(keyFile) as RecoveryKey
  if (envelope.format !== FORMAT || recovery.format !== FORMAT || envelope.algorithm !== 'AES-256-GCM' ||
      typeof envelope.id !== 'string' || !/^[0-9a-f-]{36}$/.test(envelope.id) || envelope.id !== recovery.id) throw new Error('Archive et clé incompatibles.')
  const keyBytes = unbase64(recovery.key), iv = unbase64(envelope.iv)
  if (keyBytes.length !== 32 || iv.length !== 12) throw new Error('Clé ou nonce invalide.')
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(envelope.id), tagLength: 128 }, key, unbase64(envelope.ciphertext))
  const text = decoder.decode(decrypted); ensureSize(text)
  const snapshot = JSON.parse(text) as BrowserSnapshot
  if (snapshot.format !== FORMAT || snapshot.scope !== 'one-browser-one-origin' || snapshot.automaticallyImported !== false ||
      typeof snapshot.origin !== 'string' || !Array.isArray(snapshot.localStorage) || !Array.isArray(snapshot.offlineQueue?.records) ||
      !['present', 'absent'].includes(snapshot.offlineQueue.state) || !Array.isArray(snapshot.recoveryCaches)) throw new Error('Contenu de reprise invalide.')
  const keys = new Set<string>()
  for (const entry of snapshot.localStorage) {
    if (typeof entry.key !== 'string' || !isRecoveryKey(entry.key) || keys.has(entry.key) || typeof entry.raw !== 'string' ||
        await sha256(entry.raw) !== entry.sha256) throw new Error('Empreinte de donnée invalide.')
    keys.add(entry.key)
  }
  for (const entry of snapshot.recoveryCaches) {
    if (typeof entry.cache !== 'string' || !entry.cache.startsWith('creorga-') || typeof entry.url !== 'string') throw new Error('Cache de reprise invalide.')
    const bytes = unbase64(entry.bodyBase64)
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
    if (hash !== entry.sha256) throw new Error('Empreinte de cache invalide.')
  }
  return snapshot // Verification only. Never import or replay here.
}
