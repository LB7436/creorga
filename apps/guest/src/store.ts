// Lightweight guest store using localStorage — no external deps

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  emoji: string
}

export interface GuestState {
  cart: CartItem[]
  tableCode: string | null
  guestName: string | null
}

const STORAGE_KEY = 'creorga-guest'

function load(): GuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { cart: [], tableCode: null, guestName: null }
}

function save(state: GuestState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

let state = load()
const listeners = new Set<() => void>()

function notify() {
  save(state)
  listeners.forEach(fn => fn())
}

export const store = {
  getState: () => state,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn) },

  setTable: (code: string) => { state = { ...state, tableCode: code }; notify() },
  setName: (name: string) => { state = { ...state, guestName: name }; notify() },

  addItem: (item: Omit<CartItem, 'qty'>) => {
    const existing = state.cart.find(c => c.id === item.id)
    if (existing) {
      state = { ...state, cart: state.cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) }
    } else {
      state = { ...state, cart: [...state.cart, { ...item, qty: 1 }] }
    }
    notify()
  },

  changeQty: (id: string, delta: number) => {
    state = {
      ...state,
      cart: state.cart.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0),
    }
    notify()
  },

  clearCart: () => { state = { ...state, cart: [] }; notify() },

  reset: () => { state = { cart: [], tableCode: null, guestName: null }; notify() },
}

// React hook
import { useSyncExternalStore } from 'react'
export function useGuest() {
  return useSyncExternalStore(store.subscribe, store.getState)
}
