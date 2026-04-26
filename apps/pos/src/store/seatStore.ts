import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OrderItem } from './posStore'

/**
 * Per-seat state for the POS 5175 floor plan.
 *
 * Each table-position (those small dots around tables) becomes a Seat object:
 *   - id              : stable id per (tableId, index) OR per standalone seat
 *   - tableId         : null if the seat is now standalone (e.g. moved to terrace)
 *   - position        : index around the table (0..seats-1)
 *   - status          : 'free' | 'occupied' | 'reserved'
 *   - customerName    : optional
 *   - items           : OrderItem[] like covers — same shape so we reuse menu logic
 *   - x, y            : absolute position when standalone (otherwise computed from table)
 *
 * Use cases:
 *   1. Click a chair dot → opens an order panel just for that seat
 *   2. Transfer a chair from Table 1 / Salle to Terrasse standalone
 *   3. Reattach a standalone seat to another table
 *   4. Each chair has its own bill, transferable, splittable, payable
 */

export type SeatStatus = 'free' | 'occupied' | 'reserved'

export interface Seat {
  id: string
  tableId: string | null   // null → standalone
  position?: number        // index around the table (0-based)
  status: SeatStatus
  customerName?: string
  items: OrderItem[]
  x?: number               // absolute when standalone
  y?: number
  createdAt: number
}

interface SeatState {
  seats: Seat[]
  // Lookups
  byTable: (tableId: string) => Seat[]
  standalone: () => Seat[]
  byId: (id: string) => Seat | undefined

  // CRUD
  ensureSeat: (tableId: string, position: number) => Seat
  setStatus: (seatId: string, status: SeatStatus) => void
  setCustomer: (seatId: string, name: string) => void
  removeSeat: (seatId: string) => void

  // Transfer
  detach: (seatId: string, x: number, y: number) => void                     // table → standalone
  attach: (seatId: string, tableId: string, position: number) => void        // standalone → table
  moveToTable: (seatId: string, toTableId: string, position: number) => void // table → another table
  moveStandalone: (seatId: string, x: number, y: number) => void             // drag standalone

  // Items
  addItem: (seatId: string, item: Omit<OrderItem, 'id' | 'coverId'>) => void
  removeItem: (seatId: string, itemId: string) => void
  setItemQty: (seatId: string, itemId: string, qty: number) => void
  clearItems: (seatId: string) => void

  // Bulk
  reset: () => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useSeats = create<SeatState>()(
  persist(
    (set, get) => ({
      seats: [],

      byTable: (tableId) => get().seats.filter((s) => s.tableId === tableId),
      standalone: () => get().seats.filter((s) => s.tableId === null),
      byId: (id) => get().seats.find((s) => s.id === id),

      ensureSeat: (tableId, position) => {
        const existing = get().seats.find((s) => s.tableId === tableId && s.position === position)
        if (existing) return existing
        const seat: Seat = {
          id: uid(),
          tableId, position,
          status: 'free',
          items: [],
          createdAt: Date.now(),
        }
        set((s) => ({ seats: [...s.seats, seat] }))
        return seat
      },

      setStatus: (seatId, status) =>
        set((s) => ({ seats: s.seats.map((x) => x.id !== seatId ? x : { ...x, status }) })),

      setCustomer: (seatId, customerName) =>
        set((s) => ({ seats: s.seats.map((x) => x.id !== seatId ? x : { ...x, customerName }) })),

      removeSeat: (seatId) =>
        set((s) => ({ seats: s.seats.filter((x) => x.id !== seatId) })),

      detach: (seatId, x, y) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat, tableId: null, position: undefined, x, y,
          }),
        })),

      attach: (seatId, toTableId, position) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat, tableId: toTableId, position, x: undefined, y: undefined,
          }),
        })),

      moveToTable: (seatId, toTableId, position) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat, tableId: toTableId, position, x: undefined, y: undefined,
          }),
        })),

      moveStandalone: (seatId, x, y) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : { ...seat, x, y }),
        })),

      addItem: (seatId, item) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat,
            status: 'occupied',
            items: [...seat.items, {
              id: uid(), coverId: seatId, // re-use coverId field for compat
              ...item,
            }],
          }),
        })),

      removeItem: (seatId, itemId) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat, items: seat.items.filter((i) => i.id !== itemId),
          }),
        })),

      setItemQty: (seatId, itemId, qty) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat,
            items: qty <= 0
              ? seat.items.filter((i) => i.id !== itemId)
              : seat.items.map((i) => i.id !== itemId ? i : { ...i, qty }),
          }),
        })),

      clearItems: (seatId) =>
        set((s) => ({
          seats: s.seats.map((seat) => seat.id !== seatId ? seat : {
            ...seat, items: [], status: 'free', customerName: undefined,
          }),
        })),

      reset: () => set({ seats: [] }),
    }),
    { name: 'creorga-pos-seats' }
  )
)

export function seatTotal(seat: Seat): number {
  return seat.items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
