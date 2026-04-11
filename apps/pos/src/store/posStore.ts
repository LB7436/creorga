import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

export type TableShape = 'round' | 'square' | 'rect' | 'bar'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty'
export type PayMethod = 'cash' | 'card' | 'contactless'
export type StaffRole = 'OWNER' | 'WAITER' | 'KITCHEN' | 'MANAGER'

export interface StaffMember {
  id: string
  name: string
  pin: string
  role: StaffRole
  color: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  emoji: string
  active: boolean
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  qty: number
  note: string
  coverId: string
}

export interface Cover {
  id: string
  label: string      // "Couvert 1", "Marie", etc.
  items: OrderItem[]
}

export interface Table {
  id: string
  name: string
  shape: TableShape
  seats: number
  x: number          // SVG center x
  y: number          // SVG center y
  status: TableStatus
  covers: Cover[]
  openedAt?: number  // timestamp ms
  section: string
  mergedWith: string[]   // IDs of tables merged INTO this one
  isMergedInto?: string  // parent table ID if this table was absorbed
  rotation?: number
}

export interface POSSettings {
  restaurantName: string
  currency: string
  taxRate: number
  defaultTip: number
  tipPresets: number[]
}

// ─── Default data ────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

export const DEFAULT_MENU: MenuItem[] = [
  // Boissons
  { id: 'm1',  name: 'Eau minérale',      price: 2.50, category: 'Boissons',  emoji: '💧', active: true },
  { id: 'm2',  name: 'Limonade',           price: 3.00, category: 'Boissons',  emoji: '🥤', active: true },
  { id: 'm3',  name: 'Jus d\'orange',      price: 4.00, category: 'Boissons',  emoji: '🍊', active: true },
  { id: 'm4',  name: 'Café espresso',      price: 3.00, category: 'Boissons',  emoji: '☕', active: true },
  { id: 'm5',  name: 'Café crème',         price: 4.00, category: 'Boissons',  emoji: '☕', active: true },
  { id: 'm6',  name: 'Thé',               price: 3.50, category: 'Boissons',  emoji: '🫖', active: true },
  // Bières
  { id: 'm7',  name: 'Bière pression',     price: 4.50, category: 'Bières',    emoji: '🍺', active: true },
  { id: 'm8',  name: 'Bière bouteille',    price: 5.50, category: 'Bières',    emoji: '🍺', active: true },
  { id: 'm9',  name: 'Bière sans alcool',  price: 5.00, category: 'Bières',    emoji: '🍺', active: true },
  // Vins
  { id: 'm10', name: 'Vin blanc (verre)',  price: 6.00, category: 'Vins',      emoji: '🥂', active: true },
  { id: 'm11', name: 'Vin rouge (verre)',  price: 6.00, category: 'Vins',      emoji: '🍷', active: true },
  { id: 'm12', name: 'Prosecco (verre)',   price: 7.00, category: 'Vins',      emoji: '🥂', active: true },
  { id: 'm13', name: 'Champagne (verre)',  price: 14.00, category: 'Vins',     emoji: '🍾', active: true },
  // Cocktails
  { id: 'm14', name: 'Mojito',             price: 12.00, category: 'Cocktails', emoji: '🍹', active: true },
  { id: 'm15', name: 'Spritz',             price: 10.00, category: 'Cocktails', emoji: '🍹', active: true },
  { id: 'm16', name: 'Margarita',          price: 13.00, category: 'Cocktails', emoji: '🍸', active: true },
  { id: 'm17', name: 'Gin Tonic',          price: 11.00, category: 'Cocktails', emoji: '🫗', active: true },
  { id: 'm18', name: 'Virgin Mojito',      price: 8.00,  category: 'Cocktails', emoji: '🍹', active: true },
  // Nourriture
  { id: 'm19', name: 'Planche charcuterie', price: 18.00, category: 'Cuisine', emoji: '🥩', active: true },
  { id: 'm20', name: 'Planche fromages',   price: 16.00, category: 'Cuisine',  emoji: '🧀', active: true },
  { id: 'm21', name: 'Burger maison',      price: 17.00, category: 'Cuisine',  emoji: '🍔', active: true },
  { id: 'm22', name: 'Sandwich club',      price: 13.00, category: 'Cuisine',  emoji: '🥪', active: true },
  { id: 'm23', name: 'Salade César',       price: 13.00, category: 'Cuisine',  emoji: '🥗', active: true },
  { id: 'm24', name: 'Pâtes carbonara',    price: 16.00, category: 'Cuisine',  emoji: '🍝', active: true },
  { id: 'm25', name: 'Frites',             price: 5.00,  category: 'Cuisine',  emoji: '🍟', active: true },
  // Desserts
  { id: 'm26', name: 'Tiramisu',           price: 7.50,  category: 'Desserts', emoji: '🍮', active: true },
  { id: 'm27', name: 'Mousse chocolat',    price: 6.50,  category: 'Desserts', emoji: '🍫', active: true },
  { id: 'm28', name: 'Coupe glacée',       price: 8.00,  category: 'Desserts', emoji: '🍨', active: true },
]

export const makeTable = (id: string, name: string, shape: TableShape, seats: number, x: number, y: number, section: string): Table => ({
  id, name, shape, seats, x, y, status: 'available', covers: [], section, mergedWith: []
})

export const DEFAULT_TABLES: Table[] = [
  // ── Salle principale
  makeTable('t1',  'Table 1',    'round',  2, 155, 150, 'Salle'),
  makeTable('t2',  'Table 2',    'round',  4, 310, 150, 'Salle'),
  makeTable('t3',  'Table 3',    'round',  4, 465, 150, 'Salle'),
  makeTable('t4',  'Table 4',    'square', 4, 155, 320, 'Salle'),
  makeTable('t5',  'Table 5',    'square', 4, 310, 320, 'Salle'),
  makeTable('t6',  'Table 6',    'square', 4, 465, 320, 'Salle'),
  makeTable('t7',  'Table 7',    'rect',   6, 205, 490, 'Salle'),
  makeTable('t8',  'Table 8',    'rect',   8, 470, 490, 'Salle'),
  // ── Bar
  makeTable('bar', 'Bar',        'bar',    6, 840, 155, 'Bar'),
  // ── Terrasse
  makeTable('t9',  'Terrasse 1', 'round',  4, 790, 400, 'Terrasse'),
  makeTable('t10', 'Terrasse 2', 'round',  4, 930, 400, 'Terrasse'),
  makeTable('t11', 'Terrasse 3', 'round',  2, 860, 550, 'Terrasse'),
]

const DEFAULT_SETTINGS: POSSettings = {
  restaurantName: 'Creorga Café',
  currency: '€',
  taxRate: 0,
  defaultTip: 0,
  tipPresets: [10, 15, 20],
}

const DEFAULT_STAFF: StaffMember[] = [
  { id: 's1', name: 'Admin', pin: '0000', role: 'OWNER', color: '#6366f1' },
  { id: 's2', name: 'Marie', pin: '1234', role: 'WAITER', color: '#ec4899' },
  { id: 's3', name: 'Lucas', pin: '5678', role: 'WAITER', color: '#10b981' },
  { id: 's4', name: 'Chef Paul', pin: '9999', role: 'KITCHEN', color: '#f59e0b' },
]

// ─── Store ───────────────────────────────────────────────────────────────────

interface POSStore {
  tables: Table[]
  menu: MenuItem[]
  settings: POSSettings
  staff: StaffMember[]
  currentStaff: StaffMember | null
  kioskMode: boolean

  // ── Table actions
  openTable: (tableId: string, coverCount: number) => void
  closeTable: (tableId: string) => void
  setTableStatus: (tableId: string, status: TableStatus) => void
  moveTable: (tableId: string, x: number, y: number) => void
  addTable: (t: Omit<Table, 'covers' | 'mergedWith' | 'status'>) => void
  updateTable: (id: string, updates: Partial<Table>) => void
  removeTable: (id: string) => void

  // ── Cover actions
  addCover: (tableId: string, label?: string) => void
  removeCover: (tableId: string, coverId: string) => void
  renameCover: (tableId: string, coverId: string, label: string) => void

  // ── Order actions
  addItem: (tableId: string, coverId: string, item: MenuItem, note?: string) => void
  removeItem: (tableId: string, itemId: string) => void
  setItemQty: (tableId: string, itemId: string, qty: number) => void
  setItemNote: (tableId: string, itemId: string, note: string) => void
  moveItemToCover: (tableId: string, itemId: string, toCoverId: string) => void

  // ── Merge / split
  mergeTables: (fromId: string, intoId: string) => void
  unmergeTable: (tableId: string) => void

  // ── Payment
  processPayment: (tableId: string, method: PayMethod, tip: number, coverIds?: string[]) => void

  // ── Menu actions
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void
  removeMenuItem: (id: string) => void
  toggleMenuItem: (id: string) => void

  // ── Settings
  updateSettings: (updates: Partial<POSSettings>) => void

  // ── Staff actions
  loginStaff: (pin: string) => boolean
  logoutStaff: () => void
  addStaff: (s: Omit<StaffMember, 'id'>) => void
  removeStaff: (id: string) => void
  setKioskMode: (on: boolean) => void

  // ── Reset (for testing)
  resetData: () => void
}

export const usePOS = create<POSStore>()(
  persist(
    (set, get) => ({
      tables: DEFAULT_TABLES,
      menu: DEFAULT_MENU,
      settings: DEFAULT_SETTINGS,
      staff: DEFAULT_STAFF,
      currentStaff: null,
      kioskMode: false,

      // ── Table actions ─────────────────────────────────────────────────────

      openTable: (tableId, coverCount) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          status: 'occupied',
          openedAt: Date.now(),
          covers: Array.from({ length: coverCount }, (_, i) => ({
            id: uid(),
            label: `Couvert ${i + 1}`,
            items: [],
          })),
        })
      })),

      closeTable: (tableId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          status: 'dirty',
          covers: [],
          openedAt: undefined,
          mergedWith: [],
        })
      })),

      setTableStatus: (tableId, status) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : { ...t, status })
      })),

      moveTable: (tableId, x, y) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : { ...t, x, y })
      })),

      addTable: (table) => set(s => ({
        tables: [...s.tables, { ...table, covers: [], mergedWith: [], status: 'available' }]
      })),

      updateTable: (id, updates) => set(s => ({
        tables: s.tables.map(t => t.id !== id ? t : { ...t, ...updates })
      })),

      removeTable: (id) => set(s => ({
        tables: s.tables.filter(t => t.id !== id)
      })),

      // ── Cover actions ─────────────────────────────────────────────────────

      addCover: (tableId, label) => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          const num = t.covers.length + 1
          return {
            ...t,
            covers: [...t.covers, {
              id: uid(),
              label: label ?? `Couvert ${num}`,
              items: [],
            }]
          }
        })
      })),

      removeCover: (tableId, coverId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.filter(c => c.id !== coverId)
        })
      })),

      renameCover: (tableId, coverId, label) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => c.id !== coverId ? c : { ...c, label })
        })
      })),

      // ── Order actions ─────────────────────────────────────────────────────

      addItem: (tableId, coverId, menuItem, note = '') => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          return {
            ...t,
            covers: t.covers.map(c => {
              if (c.id !== coverId) return c
              // Check if same item+note already exists → increment qty
              const existing = c.items.find(i => i.menuItemId === menuItem.id && i.note === note)
              if (existing) {
                return {
                  ...c,
                  items: c.items.map(i => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i)
                }
              }
              return {
                ...c,
                items: [...c.items, {
                  id: uid(),
                  menuItemId: menuItem.id,
                  name: menuItem.name,
                  price: menuItem.price,
                  qty: 1,
                  note,
                  coverId,
                }]
              }
            })
          }
        })
      })),

      removeItem: (tableId, itemId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: c.items.filter(i => i.id !== itemId)
          }))
        })
      })),

      setItemQty: (tableId, itemId, qty) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: qty <= 0
              ? c.items.filter(i => i.id !== itemId)
              : c.items.map(i => i.id !== itemId ? i : { ...i, qty })
          }))
        })
      })),

      setItemNote: (tableId, itemId, note) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: c.items.map(i => i.id !== itemId ? i : { ...i, note })
          }))
        })
      })),

      moveItemToCover: (tableId, itemId, toCoverId) => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          let moved: OrderItem | undefined
          const covers = t.covers.map(c => ({
            ...c,
            items: c.items.filter(i => {
              if (i.id === itemId) { moved = { ...i, coverId: toCoverId }; return false }
              return true
            })
          }))
          if (!moved) return t
          return {
            ...t,
            covers: covers.map(c => c.id !== toCoverId ? c : {
              ...c, items: [...c.items, moved!]
            })
          }
        })
      })),

      // ── Merge / split ─────────────────────────────────────────────────────

      mergeTables: (fromId, intoId) => set(s => {
        const from = s.tables.find(t => t.id === fromId)
        const into = s.tables.find(t => t.id === intoId)
        if (!from || !into) return s
        return {
          tables: s.tables.map(t => {
            if (t.id === intoId) return {
              ...t,
              covers: [...t.covers, ...from.covers],
              mergedWith: [...t.mergedWith, fromId],
            }
            if (t.id === fromId) return { ...t, status: 'available', covers: [], isMergedInto: intoId }
            return t
          })
        }
      }),

      unmergeTable: (tableId) => set(s => {
        const table = s.tables.find(t => t.id === tableId)
        if (!table) return s
        return {
          tables: s.tables.map(t => {
            if (t.id === tableId) return { ...t, mergedWith: [] }
            if (table.mergedWith.includes(t.id)) return { ...t, isMergedInto: undefined }
            return t
          })
        }
      }),

      // ── Payment ──────────────────────────────────────────────────────────

      processPayment: (tableId, _method, _tip, _coverIds) => {
        // Mark paid → close table
        get().closeTable(tableId)
      },

      // ── Menu actions ─────────────────────────────────────────────────────

      addMenuItem: (item) => set(s => ({
        menu: [...s.menu, { ...item, id: uid() }]
      })),

      updateMenuItem: (id, updates) => set(s => ({
        menu: s.menu.map(m => m.id !== id ? m : { ...m, ...updates })
      })),

      removeMenuItem: (id) => set(s => ({
        menu: s.menu.filter(m => m.id !== id)
      })),

      toggleMenuItem: (id) => set(s => ({
        menu: s.menu.map(m => m.id !== id ? m : { ...m, active: !m.active })
      })),

      // ── Settings ─────────────────────────────────────────────────────────

      updateSettings: (updates) => set(s => ({
        settings: { ...s.settings, ...updates }
      })),

      // ── Staff actions ──────────────────────────────────────────────────────

      loginStaff: (pin) => {
        const found = get().staff.find(s => s.pin === pin)
        if (found) { set({ currentStaff: found }); return true }
        return false
      },

      logoutStaff: () => set({ currentStaff: null }),

      addStaff: (s) => set(st => ({
        staff: [...st.staff, { ...s, id: uid() }]
      })),

      removeStaff: (id) => set(st => ({
        staff: st.staff.filter(s => s.id !== id)
      })),

      setKioskMode: (on) => set({ kioskMode: on }),

      resetData: () => set(() => ({
        tables: DEFAULT_TABLES,
        menu: DEFAULT_MENU,
        settings: DEFAULT_SETTINGS,
        staff: DEFAULT_STAFF,
        currentStaff: null,
        kioskMode: false,
      })),
    }),
    { name: 'creorga-pos-v2' }
  )
)

// ─── Selectors ───────────────────────────────────────────────────────────────

export const tableTotal = (table: Table) =>
  table.covers.flatMap(c => c.items).reduce((s, i) => s + i.price * i.qty, 0)

export const coverTotal = (cover: Cover) =>
  cover.items.reduce((s, i) => s + i.price * i.qty, 0)

export const elapsed = (openedAt?: number) => {
  if (!openedAt) return ''
  const m = Math.floor((Date.now() - openedAt) / 60000)
  if (m < 60) return `${m}min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#10b981',
  occupied:  '#6366f1',
  reserved:  '#8b5cf6',
  dirty:     '#f43f5e',
}

export const STATUS_RGB: Record<TableStatus, string> = {
  available: '16,185,129',
  occupied:  '99,102,241',
  reserved:  '139,92,246',
  dirty:     '244,63,94',
}

export const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Libre',
  occupied:  'Occupée',
  reserved:  'Réservée',
  dirty:     'À nettoyer',
}

export const MENU_CATEGORIES = ['Boissons', 'Bières', 'Vins', 'Cocktails', 'Cuisine', 'Desserts']
