import { useEffect, useState, useCallback, useRef } from 'react'

export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'NETTOYAGE'

export interface FloorItem {
  id: string
  name: string
  price: number
  qty: number
  note?: string
  addedAt: number
}

export interface FloorChair {
  id: string
  label: string
  tableId: string | null
  customerName?: string
  items: FloorItem[]
  x?: number
  y?: number
  status?: TableStatus
  openedAt?: number
}

export interface FloorPhoto {
  id: string
  dataUrl: string
  x: number
  y: number
  w: number
  h: number
  section?: string
  rotate?: number
}

export interface FloorZone {
  id: string
  name: string
  color?: string
  backgroundImage?: string
}

export interface FloorTable {
  id: string
  name: string
  seats: number
  section: string
  shape: 'round' | 'square' | 'rect' | 'bar'
  status: TableStatus
  x: number
  y: number
  openedAt?: number
  items: FloorItem[]
}

export interface FloorState {
  tables: FloorTable[]
  chairs: FloorChair[]
  photos: FloorPhoto[]
  zones: FloorZone[]
  globalBackground?: string
  updatedAt: number
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const BASE = `${BACKEND}/api/floor-state`

const DEFAULT_FLOOR_STATE: FloorState = {
  tables: [
    { id: 'T1', name: 'T1', seats: 2, section: 'Salle', shape: 'round', status: 'LIBRE', x: 120, y: 120, items: [] },
    { id: 'T2', name: 'T2', seats: 4, section: 'Salle', shape: 'round', status: 'LIBRE', x: 300, y: 120, items: [] },
    { id: 'T3', name: 'T3', seats: 4, section: 'Salle', shape: 'square', status: 'LIBRE', x: 500, y: 130, items: [] },
    { id: 'T4', name: 'T4', seats: 2, section: 'Salle', shape: 'round', status: 'LIBRE', x: 160, y: 310, items: [] },
    { id: 'T5', name: 'T5', seats: 6, section: 'Salle', shape: 'rect', status: 'LIBRE', x: 380, y: 310, items: [] },
    { id: 'B1', name: 'Bar 1', seats: 1, section: 'Bar', shape: 'bar', status: 'LIBRE', x: 110, y: 520, items: [] },
    { id: 'B2', name: 'Bar 2', seats: 1, section: 'Bar', shape: 'bar', status: 'LIBRE', x: 230, y: 520, items: [] },
    { id: 'TE1', name: 'Terrasse 1', seats: 4, section: 'Terrasse', shape: 'round', status: 'LIBRE', x: 560, y: 500, items: [] },
    { id: 'TE2', name: 'Terrasse 2', seats: 4, section: 'Terrasse', shape: 'round', status: 'LIBRE', x: 740, y: 500, items: [] },
  ],
  chairs: [],
  photos: [],
  zones: [
    { id: 'Salle', name: 'Salle', color: '#2563eb' },
    { id: 'Bar', name: 'Bar', color: '#9333ea' },
    { id: 'Terrasse', name: 'Terrasse', color: '#16a34a' },
  ],
  updatedAt: Date.now(),
}

function cloneDefaultFloorState(): FloorState {
  return JSON.parse(JSON.stringify({ ...DEFAULT_FLOOR_STATE, updatedAt: Date.now() }))
}

function isUsableFloorState(data: FloorState | null | undefined) {
  return Boolean(data?.tables?.length && data?.zones?.length)
}

export function useFloorState(pollMs = 2000) {
  const [state, setState] = useState<FloorState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastUpdate = useRef(0)

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch(BASE)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json() as FloorState
      const next = isUsableFloorState(data) ? data : cloneDefaultFloorState()
      // Only update if remote is newer (prevent clobbering optimistic edits)
      if (next.updatedAt >= lastUpdate.current) {
        setState(next)
        lastUpdate.current = next.updatedAt
      }
      setError(null)
    } catch (e: any) {
      setError(e.message)
      setState((current) => current ?? cloneDefaultFloorState())
    }
  }, [])

  useEffect(() => {
    fetchState()
    if (pollMs > 0) {
      const id = setInterval(fetchState, pollMs)
      return () => clearInterval(id)
    }
  }, [fetchState, pollMs])

  // ── Actions ────────────────────────────────────────────────────────────────
  const apply = useCallback(async (res: Response) => {
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as FloorState
    setState(data)
    lastUpdate.current = data.updatedAt
    return data
  }, [])

  async function fetchFn(url: string, method: string, body?: any) {
    return fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const actions = {
    openTable: async (id: string) => apply(await fetchFn(`${BASE}/tables/${id}/open`, 'POST')),
    closeTable: async (id: string) => apply(await fetchFn(`${BASE}/tables/${id}/close`, 'POST')),
    setStatus: async (id: string, status: TableStatus) =>
      apply(await fetchFn(`${BASE}/tables/${id}/status`, 'POST', { status })),

    addChair: async (tableId: string, label?: string, customerName?: string) =>
      apply(await fetchFn(`${BASE}/chairs`, 'POST', { tableId, label, customerName })),
    removeChair: async (id: string) => apply(await fetchFn(`${BASE}/chairs/${id}`, 'DELETE')),
    renameChair: async (id: string, label: string) =>
      apply(await fetchFn(`${BASE}/chairs/${id}`, 'PATCH', { label })),
    setChairCustomer: async (id: string, customerName: string) =>
      apply(await fetchFn(`${BASE}/chairs/${id}`, 'PATCH', { customerName })),

    addItemToChair: async (chairId: string, item: { name: string; price: number; qty?: number; note?: string }) =>
      apply(await fetchFn(`${BASE}/chairs/${chairId}/items`, 'POST', item)),
    removeItemFromChair: async (chairId: string, itemId: string) =>
      apply(await fetchFn(`${BASE}/chairs/${chairId}/items/${itemId}`, 'DELETE')),

    addItemToTable: async (tableId: string, item: { name: string; price: number; qty?: number; note?: string }) =>
      apply(await fetchFn(`${BASE}/tables/${tableId}/items`, 'POST', item)),

    transferChair: async (chairId: string, toTableId: string) =>
      apply(await fetchFn(`${BASE}/transfer/chair`, 'POST', { chairId, toTableId })),

    // Drag & drop
    moveTable: async (id: string, x: number, y: number) =>
      apply(await fetchFn(`${BASE}/tables/${id}/position`, 'PATCH', { x, y })),
    moveChair: async (id: string, x: number, y: number) =>
      apply(await fetchFn(`${BASE}/chairs/${id}/position`, 'PATCH', { x, y })),

    // Zones (salles) CRUD
    addZone: async (data: { name: string; color?: string; emoji?: string }) =>
      apply(await fetchFn(`${BASE}/zones`, 'POST', data)),
    patchZone: async (id: string, data: { name?: string; color?: string }) =>
      apply(await fetchFn(`${BASE}/zones/${id}`, 'PATCH', data)),
    deleteZone: async (id: string) =>
      apply(await fetchFn(`${BASE}/zones/${id}`, 'DELETE')),

    transferItems: async (fromType: 'chair' | 'table', fromId: string, toType: 'chair' | 'table', toId: string, itemIds: string[]) =>
      apply(await fetchFn(`${BASE}/transfer/items`, 'POST', { fromType, fromId, toType, toId, itemIds })),

    // Chair status
    closeChair: async (id: string) => apply(await fetchFn(`${BASE}/chairs/${id}/close`, 'POST')),

    // Photos
    addPhoto: async (photo: { dataUrl: string; x?: number; y?: number; w?: number; h?: number; section?: string }) =>
      apply(await fetchFn(`${BASE}/photos`, 'POST', photo)),
    movePhoto: async (id: string, patch: Partial<FloorPhoto>) =>
      apply(await fetchFn(`${BASE}/photos/${id}`, 'PATCH', patch)),
    removePhoto: async (id: string) => apply(await fetchFn(`${BASE}/photos/${id}`, 'DELETE')),

    // Global background
    setGlobalBackground: async (dataUrl: string | null) =>
      apply(await fetchFn(`${BASE}/background`, 'PUT', { dataUrl })),

    // AI floor-plan generator
    aiGeneratePlan: async (prompt: string) => {
      const r = await fetchFn(`${BASE}/ai-generate`, 'POST', { prompt })
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json() as { state: FloorState; aiResponse: any }
      setState(data.state)
      lastUpdate.current = data.state.updatedAt
      return data
    },

    reset: async () => apply(await fetchFn(`${BASE}/reset`, 'POST')),
    refresh: fetchState,
  }

  return { state, error, ...actions }
}

export function tableTotal(state: FloorState | null, tableId: string): number {
  if (!state) return 0
  const table = state.tables.find((t) => t.id === tableId)
  if (!table) return 0
  const own = table.items.reduce((s, i) => s + i.price * i.qty, 0)
  const fromChairs = state.chairs
    .filter((c) => c.tableId === tableId)
    .flatMap((c) => c.items)
    .reduce((s, i) => s + i.price * i.qty, 0)
  return own + fromChairs
}

export function chairTotal(chair: FloorChair): number {
  return chair.items.reduce((s, i) => s + i.price * i.qty, 0)
}
