/**
 * Anciennes écritures hors ligne : conservées pour récupération contrôlée.
 * Aucun rejeu d'une requête sans identité, société et référence idempotente.
 */
import { useEffect, useState } from 'react'

const DB_NAME = 'creorga-offline'
const STORE = 'queue'

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

async function listQueued(): Promise<QueuedRequest[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function getQueueCount(): Promise<number> {
  try { return (await listQueued()).length } catch { return 0 }
}

export async function queuedFetch(url: string, options: RequestInit = {}): Promise<{ queued: boolean; response?: Response }> {
  return { queued: false, response: await fetch(url, options) }
}

export async function flushQueue(): Promise<void> {
  // Ne pas supprimer ni rejouer les anciennes écritures sans identité vérifiable.
  window.dispatchEvent(new Event('creorga:offline-queue-changed'))
}

let flushTimer: number | null = null

export function startOfflineSync(): void {
  if (flushTimer) return
  window.addEventListener('online', () => { void flushQueue() })
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
