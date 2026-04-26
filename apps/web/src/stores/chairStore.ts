import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Chair-level orders — each chair can have its own order items, be moved
 * across tables, and be transferred to another table/chair. Orders are
 * attached to the chair (not the table), so transfers keep the order intact.
 */
export interface ChairOrderItem {
  id: string
  name: string
  price: number
  qty: number
  note?: string
}

export interface Chair {
  id: string
  label: string
  tableId: string       // which table the chair currently sits at
  x: number             // relative to table center (or absolute in room)
  y: number
  customerName?: string
  items: ChairOrderItem[]
  locked?: boolean      // prevents accidental transfer
}

interface ChairState {
  chairs: Chair[]
  addChair: (tableId: string, label?: string, x?: number, y?: number) => string
  removeChair: (chairId: string) => void
  moveChair: (chairId: string, x: number, y: number) => void
  renameChair: (chairId: string, label: string) => void
  setCustomer: (chairId: string, name: string) => void

  // Order items
  addItem: (chairId: string, item: Omit<ChairOrderItem, 'id'>) => void
  removeItem: (chairId: string, itemId: string) => void
  setItemQty: (chairId: string, itemId: string, qty: number) => void
  setItemNote: (chairId: string, itemId: string, note: string) => void
  clearItems: (chairId: string) => void

  // Transfer
  transferChair: (chairId: string, toTableId: string) => void
  transferItems: (fromChairId: string, toChairId: string) => void

  // Selectors
  byTable: (tableId: string) => Chair[]
  chairTotal: (chairId: string) => number
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useChairs = create<ChairState>()(
  persist(
    (set, get) => ({
      chairs: [],

      addChair: (tableId, label, x = 0, y = 0) => {
        const id = uid()
        set((s) => ({
          chairs: [...s.chairs, {
            id,
            label: label ?? `Ch${s.chairs.filter((c) => c.tableId === tableId).length + 1}`,
            tableId, x, y, items: [],
          }],
        }))
        return id
      },

      removeChair: (chairId) => set((s) => ({ chairs: s.chairs.filter((c) => c.id !== chairId) })),

      moveChair: (chairId, x, y) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : { ...c, x, y }),
      })),

      renameChair: (chairId, label) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : { ...c, label }),
      })),

      setCustomer: (chairId, customerName) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : { ...c, customerName }),
      })),

      addItem: (chairId, item) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : {
          ...c,
          items: [...c.items, { ...item, id: uid() }],
        }),
      })),

      removeItem: (chairId, itemId) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : {
          ...c, items: c.items.filter((i) => i.id !== itemId),
        }),
      })),

      setItemQty: (chairId, itemId, qty) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : {
          ...c,
          items: qty <= 0
            ? c.items.filter((i) => i.id !== itemId)
            : c.items.map((i) => i.id !== itemId ? i : { ...i, qty }),
        }),
      })),

      setItemNote: (chairId, itemId, note) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : {
          ...c, items: c.items.map((i) => i.id !== itemId ? i : { ...i, note }),
        }),
      })),

      clearItems: (chairId) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : { ...c, items: [] }),
      })),

      transferChair: (chairId, toTableId) => set((s) => ({
        chairs: s.chairs.map((c) => c.id !== chairId ? c : { ...c, tableId: toTableId }),
      })),

      transferItems: (fromChairId, toChairId) => set((s) => {
        const from = s.chairs.find((c) => c.id === fromChairId)
        if (!from) return s
        const itemsCopy = from.items.map((i) => ({ ...i, id: uid() }))
        return {
          chairs: s.chairs.map((c) => {
            if (c.id === fromChairId) return { ...c, items: [] }
            if (c.id === toChairId)   return { ...c, items: [...c.items, ...itemsCopy] }
            return c
          }),
        }
      }),

      byTable: (tableId) => get().chairs.filter((c) => c.tableId === tableId),
      chairTotal: (chairId) => {
        const c = get().chairs.find((x) => x.id === chairId)
        return c ? c.items.reduce((s, i) => s + i.price * i.qty, 0) : 0
      },
    }),
    { name: 'creorga-chairs' }
  )
)
