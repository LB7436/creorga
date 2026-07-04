/**
 * v4.8 — File de synchronisation offline pour les commandes POS.
 *
 * queuedFetch() essaie un fetch normal ; si le réseau est indisponible sur
 * une méthode mutante, la requête est sérialisée dans IndexedDB et rejouée
 * plus tard (retour en ligne, ou toutes les 30s). Le service ne s'arrête
 * jamais faute de réseau.
 */
import { useEffect, useState } from 'react'

const DB_NAME = 'creorga-offline'
const STORE = 'queue'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

interface QueuedRequest {
  id: string
  url: string
  options: { method: string; headers?: Record<string, string>; body?: string }
  ts: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function enqueue(item: QueuedRequest): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function listQueued(): Promise<QueuedRequest[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function removeQueued(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueueCount(): Promise<number> {
  try { return (await listQueued()).length } catch { return 0 }
}

export async function queuedFetch(url: string, options: RequestInit = {}): Promise<{ queued: boolean; response?: Response }> {
  const method = (options.method || 'GET').toUpperCase()
  try {
    const response = await fetch(url, options)
    return { queued: false, response }
  } catch (err) {
    if (!MUTATING.has(method)) throw err
    const item: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      options: {
        method,
        headers: options.headers as Record<string, string> | undefined,
        body: typeof options.body === 'string' ? options.body : undefined,
      },
      ts: Date.now(),
    }
    await enqueue(item)
    window.dispatchEvent(new Event('creorga:offline-queue-changed'))
    return { queued: true }
  }
}

export async function flushQueue(): Promise<void> {
  let items: QueuedRequest[]
  try { items = await listQueued() } catch { return }
  items.sort((a, b) => a.ts - b.ts)
  for (const item of items) {
    try {
      await fetch(item.url, item.options)
      await removeQueued(item.id)
      window.dispatchEvent(new Event('creorga:offline-queue-changed'))
    } catch {
      break // réseau toujours indisponible — on réessaiera au prochain cycle
    }
  }
}

let flushTimer: number | null = null

export function startOfflineSync(): void {
  window.addEventListener('online', () => { flushQueue() })
  if (flushTimer) return
  flushTimer = window.setInterval(() => { flushQueue() }, 30_000)
}

export function useOfflineStatus(): { online: boolean; pendingCount: number } {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const refresh = () => { getQueueCount().then(setPendingCount) }
    refresh()
    const onOnline = () => { setOnline(true); refresh() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('creorga:offline-queue-changed', refresh)
    const id = window.setInterval(refresh, 10_000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('creorga:offline-queue-changed', refresh)
      window.clearInterval(id)
    }
  }, [])

  return { online, pendingCount }
}
