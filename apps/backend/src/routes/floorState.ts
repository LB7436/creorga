import { Router } from 'express'

/**
 * Shared floor state — used by both 5174 (/pos/floor) and 5175 (POS standalone).
 * Single source of truth: tables + chairs + per-chair orders.
 * Both apps poll and PATCH the same endpoint.
 */

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
  tableId: string | null  // null = standalone chair (stool, bar seat)
  customerName?: string
  items: FloorItem[]
  x?: number  // absolute position when standalone
  y?: number
  status?: TableStatus
  openedAt?: number
}

export interface FloorPhoto {
  id: string
  dataUrl: string      // base64 image
  x: number
  y: number
  w: number
  h: number
  section?: string     // if attached to a section
  rotate?: number
}

export interface FloorZone {
  id: string
  name: string
  color?: string
  backgroundImage?: string  // base64 background for this zone
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
  // Direct-on-table items (not tied to a chair) — fallback
  items: FloorItem[]
}

export interface FloorState {
  tables: FloorTable[]
  chairs: FloorChair[]
  photos: FloorPhoto[]
  zones: FloorZone[]
  globalBackground?: string  // data-URL
  updatedAt: number
}

const uid = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_STATE: FloorState = {
  tables: [
    { id: 't1',  name: 'T1',  seats: 2, section: 'Salle',    status: 'LIBRE',   shape: 'round',  x: 160, y: 150, items: [] },
    { id: 't2',  name: 'T2',  seats: 4, section: 'Salle',    status: 'LIBRE',   shape: 'square', x: 320, y: 150, items: [] },
    { id: 't3',  name: 'T3',  seats: 4, section: 'Salle',    status: 'LIBRE',   shape: 'square', x: 480, y: 150, items: [] },
    { id: 't4',  name: 'T4',  seats: 6, section: 'Salle',    status: 'LIBRE',   shape: 'rect',   x: 160, y: 330, items: [] },
    { id: 't5',  name: 'T5',  seats: 4, section: 'Salle',    status: 'LIBRE',   shape: 'square', x: 320, y: 330, items: [] },
    { id: 't6',  name: 'T6',  seats: 2, section: 'Salle',    status: 'LIBRE',   shape: 'round',  x: 480, y: 330, items: [] },
    { id: 't7',  name: 'T7',  seats: 6, section: 'Salle',    status: 'LIBRE',   shape: 'rect',   x: 220, y: 500, items: [] },
    { id: 't8',  name: 'T8',  seats: 8, section: 'Salle',    status: 'LIBRE',   shape: 'rect',   x: 470, y: 500, items: [] },
    { id: 'bar', name: 'Bar', seats: 6, section: 'Bar',      status: 'LIBRE',   shape: 'bar',    x: 840, y: 155, items: [] },
    { id: 't9',  name: 'Te1', seats: 4, section: 'Terrasse', status: 'LIBRE',   shape: 'round',  x: 790, y: 400, items: [] },
    { id: 't10', name: 'Te2', seats: 4, section: 'Terrasse', status: 'LIBRE',   shape: 'round',  x: 930, y: 400, items: [] },
    { id: 't11', name: 'Te3', seats: 2, section: 'Terrasse', status: 'LIBRE',   shape: 'round',  x: 860, y: 550, items: [] },
  ],
  chairs: [],
  photos: [],
  zones: [
    { id: 'salle',    name: 'Salle',    color: '#8b5cf6' },
    { id: 'bar',      name: 'Bar',      color: '#f59e0b' },
    { id: 'terrasse', name: 'Terrasse', color: '#10b981' },
  ],
  updatedAt: Date.now(),
}

let state: FloorState = JSON.parse(JSON.stringify(DEFAULT_STATE))

const router = Router()

// Full state read (public)
router.get('/', (_req, res) => res.json(state))

// Full replace
router.put('/', (req, res) => {
  const body = req.body as Partial<FloorState>
  state = { ...state, ...body, updatedAt: Date.now() }
  res.json(state)
})

// Partial update
router.patch('/', (req, res) => {
  const body = req.body as Partial<FloorState>
  state = { ...state, ...body, updatedAt: Date.now() }
  res.json(state)
})

// ─── Table actions ──────────────────────────────────────────────────────────
router.post('/tables/:id/open', (req, res) => {
  const t = state.tables.find((x) => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'table not found' })
  t.status = 'OCCUPEE'
  t.openedAt = Date.now()
  state.updatedAt = Date.now()
  res.json(state)
})

router.post('/tables/:id/close', (req, res) => {
  const t = state.tables.find((x) => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'table not found' })
  t.status = 'NETTOYAGE'
  t.items = []
  t.openedAt = undefined
  // Also clear chairs of this table
  state.chairs = state.chairs.filter((c) => c.tableId !== req.params.id)
  state.updatedAt = Date.now()
  res.json(state)
})

// Move a table to new x/y (drag & drop)
router.patch('/tables/:id/position', (req, res) => {
  const t = state.tables.find((x) => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'table not found' })
  const { x, y } = req.body || {}
  if (typeof x === 'number') t.x = Math.max(0, Math.min(2000, x))
  if (typeof y === 'number') t.y = Math.max(0, Math.min(2000, y))
  state.updatedAt = Date.now()
  res.json(state)
})

// Move a standalone chair (drag & drop)
router.patch('/chairs/:id/position', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  const { x, y } = req.body || {}
  if (typeof x === 'number') c.x = Math.max(0, Math.min(2000, x))
  if (typeof y === 'number') c.y = Math.max(0, Math.min(2000, y))
  state.updatedAt = Date.now()
  res.json(state)
})

router.post('/tables/:id/status', (req, res) => {
  const t = state.tables.find((x) => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'table not found' })
  t.status = (req.body?.status || 'LIBRE') as TableStatus
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Chair actions ──────────────────────────────────────────────────────────
router.post('/chairs', (req, res) => {
  const { tableId, label, customerName } = req.body || {}
  if (!tableId) return res.status(400).json({ error: 'tableId required' })
  const chair: FloorChair = {
    id: uid(),
    label: label || `Ch${state.chairs.filter((c) => c.tableId === tableId).length + 1}`,
    tableId, customerName, items: [],
  }
  state.chairs.push(chair)
  const t = state.tables.find((x) => x.id === tableId)
  if (t && t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/chairs/:id', (req, res) => {
  state.chairs = state.chairs.filter((c) => c.id !== req.params.id)
  state.updatedAt = Date.now()
  res.json(state)
})

router.patch('/chairs/:id', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  Object.assign(c, req.body)
  state.updatedAt = Date.now()
  res.json(state)
})

// Add item on a chair
router.post('/chairs/:id/items', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  const { name, price, qty = 1, note } = req.body || {}
  c.items.push({ id: uid(), name, price, qty, note, addedAt: Date.now() })
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/chairs/:chairId/items/:itemId', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.chairId)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  c.items = c.items.filter((i) => i.id !== req.params.itemId)
  state.updatedAt = Date.now()
  res.json(state)
})

// Add item directly on a table (no chair)
router.post('/tables/:id/items', (req, res) => {
  const t = state.tables.find((x) => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'table not found' })
  const { name, price, qty = 1, note } = req.body || {}
  t.items.push({ id: uid(), name, price, qty, note, addedAt: Date.now() })
  if (t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Transfer ───────────────────────────────────────────────────────────────
// Transfer a chair (with all its items) to another table
router.post('/transfer/chair', (req, res) => {
  const { chairId, toTableId } = req.body || {}
  const c = state.chairs.find((x) => x.id === chairId)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  c.tableId = toTableId
  const t = state.tables.find((x) => x.id === toTableId)
  if (t && t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
  state.updatedAt = Date.now()
  res.json(state)
})

// Transfer specific items from one chair/table to another
router.post('/transfer/items', (req, res) => {
  const { fromType, fromId, toType, toId, itemIds } = req.body || {}
  if (!fromType || !fromId || !toType || !toId || !Array.isArray(itemIds)) {
    return res.status(400).json({ error: 'fromType, fromId, toType, toId, itemIds required' })
  }

  const getCollection = (type: string, id: string) => {
    if (type === 'chair') return state.chairs.find((c) => c.id === id)?.items
    if (type === 'table') return state.tables.find((t) => t.id === id)?.items
    return undefined
  }

  const src = getCollection(fromType, fromId)
  const dst = getCollection(toType, toId)
  if (!src || !dst) return res.status(404).json({ error: 'source or destination not found' })

  const toMove = src.filter((i) => itemIds.includes(i.id))
  for (const i of toMove) dst.push({ ...i, id: uid() })

  if (fromType === 'chair') {
    const c = state.chairs.find((x) => x.id === fromId)
    if (c) c.items = c.items.filter((i) => !itemIds.includes(i.id))
  } else {
    const t = state.tables.find((x) => x.id === fromId)
    if (t) t.items = t.items.filter((i) => !itemIds.includes(i.id))
  }

  // Activate destination if target table was idle
  if (toType === 'table') {
    const t = state.tables.find((x) => x.id === toId)
    if (t && t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
  } else if (toType === 'chair') {
    const c = state.chairs.find((x) => x.id === toId)
    if (c) {
      const t = state.tables.find((x) => x.id === c.tableId)
      if (t && t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
    }
  }

  state.updatedAt = Date.now()
  res.json(state)
})

// Split a table into N equal portions — duplicates the table into ghost copies
router.post('/split/table', (req, res) => {
  const { tableId, portions } = req.body || {}
  const t = state.tables.find((x) => x.id === tableId)
  if (!t) return res.status(404).json({ error: 'table not found' })
  const n = Math.max(2, Math.min(8, Number(portions) || 2))
  const totalItems = [...t.items, ...state.chairs.filter((c) => c.tableId === tableId).flatMap((c) => c.items)]
  const perPortionValue = totalItems.reduce((s, i) => s + i.price * i.qty, 0) / n
  res.json({ portions: n, perPortion: perPortionValue, state })
})

// ─── Chair status (close chair like a table) ────────────────────────────────
router.post('/chairs/:id/close', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  c.items = []
  c.customerName = undefined
  c.status = 'LIBRE'
  c.openedAt = undefined
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Photos ────────────────────────────────────────────────────────────────
router.post('/photos', (req, res) => {
  const { dataUrl, x = 40, y = 40, w = 180, h = 180, section, rotate = 0 } = req.body || {}
  if (!dataUrl) return res.status(400).json({ error: 'dataUrl required' })
  const photo: FloorPhoto = { id: uid(), dataUrl, x, y, w, h, section, rotate }
  state.photos.push(photo)
  state.updatedAt = Date.now()
  res.json(state)
})

router.patch('/photos/:id', (req, res) => {
  const p = state.photos.find((x) => x.id === req.params.id)
  if (!p) return res.status(404).json({ error: 'photo not found' })
  Object.assign(p, req.body)
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/photos/:id', (req, res) => {
  state.photos = state.photos.filter((p) => p.id !== req.params.id)
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Global background ─────────────────────────────────────────────────────
router.put('/background', (req, res) => {
  state.globalBackground = req.body?.dataUrl || undefined
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── AI floor plan generator ──────────────────────────────────────────────
// Uses local Ollama (gemma2:2b) to draft a plan from a natural-language prompt.
// Expects Ollama running at http://localhost:11434.
router.post('/ai-generate', async (req, res) => {
  const { prompt } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const systemPrompt = `Tu es un architecte de salle de restaurant. Génère un plan au format JSON strict.

Réponds UNIQUEMENT avec ce JSON (pas de texte autour) :
{
  "tables": [
    {"id":"t1","name":"T1","seats":2,"section":"Salle","shape":"round","x":200,"y":150},
    {"id":"t2","name":"T2","seats":4,"section":"Salle","shape":"square","x":400,"y":150},
    {"id":"bar1","name":"Bar","seats":6,"section":"Bar","shape":"bar","x":200,"y":100}
  ],
  "chairs": [
    {"id":"c1","label":"Tabouret 1","tableId":null,"x":300,"y":80}
  ]
}

Règles :
- shape: "round" | "square" | "rect" | "bar"
- section: "Salle" | "Bar" | "Terrasse"
- x entre 60 et 900, y entre 60 et 700
- Espace les tables d'au moins 160 pixels
- seats entre 2 et 8
- Jusqu'à 20 tables maximum

Demande : ${prompt}`

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt: systemPrompt,
        stream: false,
        format: 'json',
      }),
    })
    if (!ollamaRes.ok) {
      return res.status(500).json({ error: 'Ollama unavailable', details: await ollamaRes.text() })
    }
    const data = await ollamaRes.json() as { response?: string }
    const raw = data.response || ''
    let plan: any
    try { plan = JSON.parse(raw) }
    catch {
      // Extract JSON substring
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Invalid JSON from AI', raw })
      plan = JSON.parse(m[0])
    }

    // Sanitise + merge into state
    const newTables = Array.isArray(plan.tables) ? plan.tables.map((t: any, i: number) => ({
      id: String(t.id || `t${i + 1}`),
      name: String(t.name || `T${i + 1}`),
      seats: Math.min(8, Math.max(2, Number(t.seats) || 4)),
      section: ['Salle','Bar','Terrasse'].includes(t.section) ? t.section : 'Salle',
      shape: ['round','square','rect','bar'].includes(t.shape) ? t.shape : 'round',
      status: 'LIBRE' as TableStatus,
      x: Math.min(900, Math.max(60, Number(t.x) || 100 + i * 140)),
      y: Math.min(700, Math.max(60, Number(t.y) || 150)),
      items: [],
    })) : []

    const newChairs = Array.isArray(plan.chairs) ? plan.chairs.map((c: any, i: number) => ({
      id: String(c.id || `c${i + 1}`),
      label: String(c.label || `Chaise ${i + 1}`),
      tableId: c.tableId || null,
      x: c.x ? Number(c.x) : undefined,
      y: c.y ? Number(c.y) : undefined,
      items: [],
    })) : []

    state.tables = newTables
    state.chairs = newChairs
    state.updatedAt = Date.now()
    res.json({ state, aiResponse: plan })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Zones (salles) — CRUD ─────────────────────────────────────────────────
router.post('/zones', (req, res) => {
  const { name, color, emoji } = req.body || {}
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' })
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 32) + '-' + uid().slice(0, 4)
  state.zones.push({ id, name, color: color || '#8b5cf6', backgroundImage: undefined })
  state.updatedAt = Date.now()
  res.json(state)
})

router.patch('/zones/:id', (req, res) => {
  const z = state.zones.find((x) => x.id === req.params.id)
  if (!z) return res.status(404).json({ error: 'zone not found' })
  Object.assign(z, req.body)
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/zones/:id', (req, res) => {
  // Prevent delete if any table is in this section
  const zone = state.zones.find((z) => z.id === req.params.id)
  if (!zone) return res.status(404).json({ error: 'zone not found' })
  const used = state.tables.some((t) => t.section === zone.name)
  if (used) return res.status(400).json({ error: 'zone non vide — déplacez d\'abord les tables' })
  state.zones = state.zones.filter((z) => z.id !== req.params.id)
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Reset (dev helper) ────────────────────────────────────────────────────
router.post('/reset', (_req, res) => {
  state = JSON.parse(JSON.stringify(DEFAULT_STATE))
  res.json(state)
})

export default router
