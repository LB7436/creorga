import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import { dataPath } from '../middleware/audit-log'
import logger from '../lib/logger'

/**
 * Shared floor state — used by both 5174 (/pos/floor) and 5175 (POS standalone).
 * Single source of truth: tables + chairs + per-chair orders.
 * Both apps poll and PATCH the same endpoint.
 *
 * L'état vit sur DISQUE. Avant ce correctif il n'existait qu'en mémoire : le plan
 * de salle déplacé, les chaises créées et surtout LES ADDITIONS EN COURS étaient
 * perdus à chaque redémarrage du service.
 *
 * Depuis v5.2, cet état est strictement cloisonné par société. L'ancienne
 * variable globale permettait à deux clients de lire et modifier le même plan.
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
  // Un nouvel établissement ne doit pas hériter d'un faux restaurant. Il part
  // d'une salle vide, qu'il peut compléter ou remplacer par un modèle.
  tables: [],
  chairs: [],
  photos: [],
  zones: [
    { id: 'salle-principale', name: 'Salle principale', color: '#8b5cf6' },
  ],
  updatedAt: Date.now(),
}

const FICHIER_HISTORIQUE = 'floor-state.json'
const floorContext = new AsyncLocalStorage<string>()

/** Société portée par la requête courante (routes montées derrière floorCompanyContext). */
export function currentFloorCompanyId(): string | undefined {
  return floorContext.getStore()
}
const states = new Map<string, FloorState>()

function cloneDefaultState(): FloorState {
  const plan = JSON.parse(JSON.stringify(DEFAULT_STATE)) as FloorState
  plan.updatedAt = Date.now()
  return plan
}

/** Nom sûr et stable : aucun identifiant de société ne peut sortir de data/. */
export function companyFloorFilename(companyId: string): string {
  const readable = companyId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'company'
  const digest = createHash('sha256').update(companyId).digest('hex').slice(0, 12)
  return `floor-state.${readable}.${digest}.json`
}

function chargerPlanDeSalle(companyId: string): FloorState {
  const propre = safeReadJson<FloorState | null>(dataPath(companyFloorFilename(companyId)), null)
  if (propre) return propre

  // L'ancien fichier global n'est repris QUE pour la société explicitement
  // désignée au déploiement. Il ne doit jamais servir de repli à un nouveau
  // client, sans quoi le défaut de fuite inter-sociétés réapparaîtrait.
  if (process.env.LEGACY_FLOOR_COMPANY_ID?.trim() === companyId) {
    return safeReadJson<FloorState>(dataPath(FICHIER_HISTORIQUE), cloneDefaultState())
  }
  return cloneDefaultState()
}

function companyIdCourante(companyId?: string): string {
  const resolved = companyId || floorContext.getStore()
  if (!resolved) throw new Error('Contexte société absent pour le plan de salle')
  return resolved
}

/** Retourne uniquement le plan de la société courante (ou explicitement fournie). */
export function getFloorState(companyId?: string): FloorState {
  const resolved = companyIdCourante(companyId)
  let plan = states.get(resolved)
  if (!plan) {
    plan = chargerPlanDeSalle(resolved)
    states.set(resolved, plan)
  }
  return plan
}

export function remplacerPlanDeSalle(plan: FloorState, companyId?: string): FloorState {
  const resolved = companyIdCourante(companyId)
  states.set(resolved, plan)
  return plan
}

/** États déjà utilisés depuis le démarrage, pour le travail de nettoyage. */
export function getLoadedFloorStates(): Array<{ companyId: string; state: FloorState }> {
  return [...states.entries()].map(([companyId, plan]) => ({ companyId, state: plan }))
}

/**
 * Écrit l'état sur disque (atomique, avec .bak — cf. safe-json).
 * Appelée après chaque mutation HTTP, et par les travaux de fond qui modifient
 * l'état sans passer par le routeur (closeStaleFloorSessions).
 * Un échec est journalisé, jamais avalé : une sauvegarde muette est un défaut.
 */
export function sauvegarderPlanDeSalle(companyId?: string): void {
  const resolved = companyIdCourante(companyId)
  const plan = getFloorState(resolved)
  const fichier = companyFloorFilename(resolved)
  try {
    safeWriteJson(dataPath(fichier), plan)
  } catch (err) {
    logger.error(`[floor-state] échec de la sauvegarde de ${fichier}`, err)
  }
}

/**
 * À monter après requireCompany. AsyncLocalStorage permet aussi aux actions de
 * l'assistant, qui appellent getFloorState() profondément, de rester dans la
 * bonne société. Toute mutation réussie est persistée automatiquement.
 */
export function floorCompanyContext(req: Request, res: Response, next: NextFunction): void {
  const companyId = (req as any).companyId
  if (!companyId || typeof companyId !== 'string') {
    res.status(500).json({ error: 'Contexte société absent pour le plan de salle' })
    return
  }

  floorContext.run(companyId, () => {
    if (MUTATING.has(req.method)) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400 && states.has(companyId)) {
          sauvegarderPlanDeSalle(companyId)
          try {
            const broadcast = (globalThis as any).liveBroadcast
            if (typeof broadcast === 'function') {
              broadcast(`floor-${companyId}`, 'floor-updated', {
                companyId,
                updatedAt: getFloorState(companyId).updatedAt,
              })
            }
          } catch { /* broadcast indisponible */ }
        }
      })
    }
    next()
  })
}

// Proxy de compatibilité : les nombreuses actions ci-dessous et l'assistant
// manipulent `state`, mais la cible est résolue à chaque requête via le contexte.
const state = new Proxy({} as FloorState, {
  get: (_target, property) => {
    if (property === 'toJSON') return () => getFloorState()
    return Reflect.get(getFloorState(), property)
  },
  set: (_target, property, value) => Reflect.set(getFloorState(), property, value),
  ownKeys: () => Reflect.ownKeys(getFloorState()),
  getOwnPropertyDescriptor: (_target, property) => {
    const descriptor = Object.getOwnPropertyDescriptor(getFloorState(), property)
    return descriptor ? { ...descriptor, configurable: true } : undefined
  },
})

const router = Router()
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const TABLE_SHAPES = new Set<FloorTable['shape']>(['round', 'square', 'rect', 'bar'])
const TABLE_STATUSES = new Set<TableStatus>(['LIBRE', 'OCCUPEE', 'RESERVEE', 'NETTOYAGE'])

function texteCourt(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && text.length <= max ? text : null
}

function nombreBorne(value: unknown, min: number, max: number): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : null
}

function articleValide(body: any): Omit<FloorItem, 'id' | 'addedAt'> | null {
  const name = texteCourt(body?.name, 120)
  const price = nombreBorne(body?.price, 0, 100_000)
  const qty = nombreBorne(body?.qty ?? 1, 1, 99)
  if (!name || price === null || qty === null) return null
  let note: string | undefined
  if (body?.note !== undefined && body?.note !== null && body?.note !== '') {
    const safeNote = texteCourt(body.note, 500)
    if (!safeNote) return null
    note = safeNote
  }
  return { name, price, qty: Math.round(qty), note }
}

// Full state read (public)
router.get('/', (_req, res) => res.json(state))

// Full replace
router.put('/', (req, res) => {
  const body = req.body as Partial<FloorState>
  const plan = remplacerPlanDeSalle({ ...getFloorState(), ...body, updatedAt: Date.now() })
  res.json(plan)
})

// Partial update
router.patch('/', (req, res) => {
  const body = req.body as Partial<FloorState>
  const plan = remplacerPlanDeSalle({ ...getFloorState(), ...body, updatedAt: Date.now() })
  res.json(plan)
})

// ─── Table actions ──────────────────────────────────────────────────────────
router.post('/tables', (req, res) => {
  if (state.tables.length >= 200) return res.status(400).json({ error: '200 tables maximum' })
  const name = texteCourt(req.body?.name, 60)
  const section = texteCourt(req.body?.section, 80)
  const shape = req.body?.shape as FloorTable['shape']
  const seats = nombreBorne(req.body?.seats, 1, 30)
  const x = nombreBorne(req.body?.x ?? 160, 0, 2000)
  const y = nombreBorne(req.body?.y ?? 150, 0, 2000)
  if (!name || !section || !TABLE_SHAPES.has(shape) || seats === null || x === null || y === null) {
    return res.status(400).json({ error: 'Table invalide' })
  }
  if (!state.zones.some((zone) => zone.name === section)) {
    return res.status(400).json({ error: 'Salle inconnue' })
  }
  const table: FloorTable = {
    id: `table-${uid()}`,
    name,
    seats: Math.round(seats),
    section,
    shape,
    status: 'LIBRE',
    x,
    y,
    items: [],
  }
  state.tables.push(table)
  state.updatedAt = Date.now()
  res.status(201).json(state)
})

router.patch('/tables/:id', (req, res) => {
  const table = state.tables.find((item) => item.id === req.params.id)
  if (!table) return res.status(404).json({ error: 'table not found' })
  const body = req.body || {}
  if (body.name !== undefined) {
    const name = texteCourt(body.name, 60)
    if (!name) return res.status(400).json({ error: 'Nom de table invalide' })
    table.name = name
  }
  if (body.section !== undefined) {
    const section = texteCourt(body.section, 80)
    if (!section || !state.zones.some((zone) => zone.name === section)) {
      return res.status(400).json({ error: 'Salle inconnue' })
    }
    table.section = section
  }
  if (body.shape !== undefined) {
    if (!TABLE_SHAPES.has(body.shape)) return res.status(400).json({ error: 'Forme de table invalide' })
    table.shape = body.shape
  }
  if (body.seats !== undefined) {
    const seats = nombreBorne(body.seats, 1, 30)
    if (seats === null) return res.status(400).json({ error: 'Nombre de places invalide' })
    table.seats = Math.round(seats)
  }
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/tables/:id', (req, res) => {
  const table = state.tables.find((item) => item.id === req.params.id)
  if (!table) return res.status(404).json({ error: 'table not found' })
  const chairs = state.chairs.filter((chair) => chair.tableId === table.id)
  if (table.items.length || chairs.some((chair) => chair.items.length)) {
    return res.status(409).json({ error: 'Table non vide — encaissez ou retirez les articles avant de la supprimer' })
  }
  state.chairs = state.chairs.filter((chair) => chair.tableId !== table.id)
  state.tables = state.tables.filter((item) => item.id !== table.id)
  state.updatedAt = Date.now()
  res.json(state)
})

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
  const relatedChairs = state.chairs.filter((chair) => chair.tableId === t.id)
  if (t.items.length || relatedChairs.some((chair) => chair.items.length)) {
    return res.status(409).json({ error: 'Addition non vide — encaissez ou retirez les articles avant de fermer la table' })
  }
  t.status = 'NETTOYAGE'
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
  if (!TABLE_STATUSES.has(req.body?.status)) return res.status(400).json({ error: 'Statut invalide' })
  t.status = req.body.status
  state.updatedAt = Date.now()
  res.json(state)
})

// ─── Chair actions ──────────────────────────────────────────────────────────
router.post('/chairs', (req, res) => {
  const { tableId, label, customerName } = req.body || {}
  if (!tableId) return res.status(400).json({ error: 'tableId required' })
  const t = state.tables.find((x) => x.id === tableId)
  if (!t) return res.status(404).json({ error: 'table not found' })
  if (state.chairs.filter((chair) => chair.tableId === tableId).length >= 30) {
    return res.status(400).json({ error: '30 chaises maximum par table' })
  }
  const safeLabel = label === undefined ? null : texteCourt(label, 60)
  let safeCustomer: string | undefined
  if (customerName !== undefined && customerName !== '') {
    const customer = texteCourt(customerName, 120)
    if (!customer) return res.status(400).json({ error: 'Chaise invalide' })
    safeCustomer = customer
  }
  if (label !== undefined && !safeLabel) {
    return res.status(400).json({ error: 'Chaise invalide' })
  }
  const chair: FloorChair = {
    id: uid(),
    label: safeLabel || `Ch${state.chairs.filter((c) => c.tableId === tableId).length + 1}`,
    tableId, customerName: safeCustomer, items: [],
  }
  state.chairs.push(chair)
  if (t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/chairs/:id', (req, res) => {
  const chair = state.chairs.find((item) => item.id === req.params.id)
  if (!chair) return res.status(404).json({ error: 'chair not found' })
  if (chair.items.length) return res.status(409).json({ error: 'Chaise non vide — retirez ou transférez ses articles' })
  state.chairs = state.chairs.filter((c) => c.id !== req.params.id)
  state.updatedAt = Date.now()
  res.json(state)
})

router.patch('/chairs/:id', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  if (req.body?.label !== undefined) {
    const label = texteCourt(req.body.label, 60)
    if (!label) return res.status(400).json({ error: 'Nom de chaise invalide' })
    c.label = label
  }
  if (req.body?.customerName !== undefined) {
    if (req.body.customerName === '') c.customerName = undefined
    else {
      const customerName = texteCourt(req.body.customerName, 120)
      if (!customerName) return res.status(400).json({ error: 'Nom client invalide' })
      c.customerName = customerName
    }
  }
  state.updatedAt = Date.now()
  res.json(state)
})

// Add item on a chair
router.post('/chairs/:id/items', (req, res) => {
  const c = state.chairs.find((x) => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'chair not found' })
  const item = articleValide(req.body)
  if (!item) return res.status(400).json({ error: 'Article invalide' })
  c.items.push({ id: uid(), ...item, addedAt: Date.now() })
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
  const item = articleValide(req.body)
  if (!item) return res.status(400).json({ error: 'Article invalide' })
  t.items.push({ id: uid(), ...item, addedAt: Date.now() })
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
  const t = state.tables.find((x) => x.id === toTableId)
  if (!t) return res.status(404).json({ error: 'destination table not found' })
  c.tableId = toTableId
  if (t.status === 'LIBRE') { t.status = 'OCCUPEE'; t.openedAt = Date.now() }
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
  if (c.items.length) return res.status(409).json({ error: 'Addition non vide — encaissez ou retirez les articles avant de libérer la chaise' })
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
        model: 'gemma3:4b',
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
  const safeName = texteCourt(name, 80)
  const safeColor = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#8b5cf6'
  if (!safeName) return res.status(400).json({ error: 'Nom de salle requis' })
  if (state.zones.length >= 50) return res.status(400).json({ error: '50 salles maximum' })
  if (state.zones.some((zone) => zone.name.toLocaleLowerCase() === safeName.toLocaleLowerCase())) {
    return res.status(409).json({ error: 'Une salle porte déjà ce nom' })
  }
  const id = safeName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 32) + '-' + uid().slice(0, 4)
  state.zones.push({ id, name: safeName, color: safeColor, backgroundImage: undefined })
  state.updatedAt = Date.now()
  res.json(state)
})

router.patch('/zones/:id', (req, res) => {
  const z = state.zones.find((x) => x.id === req.params.id)
  if (!z) return res.status(404).json({ error: 'zone not found' })
  if (req.body?.name !== undefined) {
    const nextName = texteCourt(req.body.name, 80)
    if (!nextName) return res.status(400).json({ error: 'Nom de salle invalide' })
    if (state.zones.some((zone) => zone.id !== z.id && zone.name.toLocaleLowerCase() === nextName.toLocaleLowerCase())) {
      return res.status(409).json({ error: 'Une salle porte déjà ce nom' })
    }
    const previousName = z.name
    z.name = nextName
    // Renommer une salle déplace aussi ses tables : sans cela elles restaient
    // dans une section orpheline invisible dans le gestionnaire.
    for (const table of state.tables) {
      if (table.section === previousName) table.section = nextName
    }
  }
  if (req.body?.color !== undefined) {
    if (typeof req.body.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(req.body.color)) {
      return res.status(400).json({ error: 'Couleur invalide' })
    }
    z.color = req.body.color
  }
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
  const plan = remplacerPlanDeSalle(cloneDefaultState())
  res.json(plan)
})

export default router
