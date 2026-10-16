import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { fetchAuth } from '@/lib/fetchAuth'
import { authDataScope } from '@/lib/authScope'
import { useAuthStore } from '@/stores/authStore'
import { createFloorStateClient } from './floorStateClient'

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

export function useFloorState(pollMs = 2000) {
  const scope = useAuthStore(authDataScope)
  const connection = useMemo(() => createFloorStateClient({
    base: BASE,
    fetcher: fetchAuth,
    getScope: () => authDataScope(useAuthStore.getState()),
    subscribeScope: (listener) => useAuthStore.subscribe(listener),
  }), [])
  const { state, error } = useSyncExternalStore(connection.subscribe, connection.getSnapshot, connection.getSnapshot)
  const client = connection.bindActions()

  useEffect(() => {
    connection.start()
    void connection.refresh()
    const id = pollMs > 0 ? setInterval(() => { void connection.refresh() }, pollMs) : undefined
    return () => {
      if (id !== undefined) clearInterval(id)
      connection.stop()
    }
  }, [connection, pollMs, scope])

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = {
    addTable: async (data: { name: string; seats: number; section: string; shape: FloorTable['shape']; x?: number; y?: number }) =>
      client.mutate('/tables', 'POST', data),
    patchTable: async (id: string, data: Partial<Pick<FloorTable, 'name' | 'seats' | 'section' | 'shape'>>) =>
      client.mutate(`/tables/${id}`, 'PATCH', data),
    deleteTable: async (id: string) =>
      client.mutate(`/tables/${id}`, 'DELETE'),
    openTable: async (id: string) => client.mutate(`/tables/${id}/open`, 'POST'),
    closeTable: async (id: string) => client.mutate(`/tables/${id}/close`, 'POST'),
    setStatus: async (id: string, status: TableStatus) =>
      client.mutate(`/tables/${id}/status`, 'POST', { status }),

    addChair: async (tableId: string, label?: string, customerName?: string) =>
      client.mutate('/chairs', 'POST', { tableId, label, customerName }),
    removeChair: async (id: string) => client.mutate(`/chairs/${id}`, 'DELETE'),
    renameChair: async (id: string, label: string) =>
      client.mutate(`/chairs/${id}`, 'PATCH', { label }),
    setChairCustomer: async (id: string, customerName: string) =>
      client.mutate(`/chairs/${id}`, 'PATCH', { customerName }),

    addItemToChair: async (chairId: string, item: { productId: string; name: string; price: number; qty?: number; note?: string }) =>
      client.mutate(`/chairs/${chairId}/items`, 'POST', item),
    removeItemFromChair: async (chairId: string, itemId: string) =>
      client.mutate(`/chairs/${chairId}/items/${itemId}`, 'DELETE'),

    addItemToTable: async (tableId: string, item: { productId: string; name: string; price: number; qty?: number; note?: string }) =>
      client.mutate(`/tables/${tableId}/items`, 'POST', item),

    transferChair: async (chairId: string, toTableId: string) =>
      client.mutate('/transfer/chair', 'POST', { chairId, toTableId }),

    // Drag & drop
    moveTable: async (id: string, x: number, y: number) =>
      client.mutate(`/tables/${id}/position`, 'PATCH', { x, y }),
    moveChair: async (id: string, x: number, y: number) =>
      client.mutate(`/chairs/${id}/position`, 'PATCH', { x, y }),

    // Zones (salles) CRUD
    addZone: async (data: { name: string; color?: string; emoji?: string }) =>
      client.mutate('/zones', 'POST', data),
    patchZone: async (id: string, data: { name?: string; color?: string }) =>
      client.mutate(`/zones/${id}`, 'PATCH', data),
    deleteZone: async (id: string) =>
      client.mutate(`/zones/${id}`, 'DELETE'),

    transferItems: async (fromType: 'chair' | 'table', fromId: string, toType: 'chair' | 'table', toId: string, itemIds: string[]) =>
      client.mutate('/transfer/items', 'POST', { fromType, fromId, toType, toId, itemIds }),

    // Chair status
    closeChair: async (id: string) => client.mutate(`/chairs/${id}/close`, 'POST'),

    // Photos
    addPhoto: async (photo: { dataUrl: string; x?: number; y?: number; w?: number; h?: number; section?: string }) =>
      client.mutate('/photos', 'POST', photo),
    movePhoto: async (id: string, patch: Partial<FloorPhoto>) =>
      client.mutate(`/photos/${id}`, 'PATCH', patch),
    removePhoto: async (id: string) => client.mutate(`/photos/${id}`, 'DELETE'),

    // Global background
    setGlobalBackground: async (dataUrl: string | null) =>
      client.mutate('/background', 'PUT', { dataUrl }),

    // AI floor-plan generator
    aiGeneratePlan: (prompt: string) => client.generate(prompt),

    reset: async () => client.mutate('/reset', 'POST'),
    refresh: connection.refresh,
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
