import { makeTable, type Table } from '../store/posStore'

export type TableGeometry = Pick<Table, 'id' | 'name' | 'shape' | 'seats' | 'x' | 'y' | 'section' | 'rotation'>
export type LayoutRoom = { id: string; label: string; color: string; x: number; y: number; w: number; h: number }
export type LayoutFixture = { id: string; type: string; x: number; y: number; rotation: number; label?: string; room?: string }
export type LayoutSnapshot = { tables: TableGeometry[]; rooms: LayoutRoom[]; fixtures: LayoutFixture[] }
export type LayoutHistory = { entries: LayoutSnapshot[]; index: number }
export function appendLayoutHistory(history: LayoutHistory, snapshot: LayoutSnapshot): LayoutHistory {
  const next = layoutSnapshot(snapshot)
  if (JSON.stringify(history.entries[history.index]) === JSON.stringify(next)) return history
  const entries = [...history.entries.slice(0, history.index + 1), next].slice(-20)
  return { entries, index: entries.length - 1 }
}

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objet de plan invalide.')
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, limit = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(label + ' invalide.')
  return value
}
function number(value: unknown, label: string, min = -10000, max = 10000): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(label + ' invalide.')
  return value
}
function array(value: unknown, label: string, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error(label + ' invalide.')
  return value
}
function unique(values: Array<{ id: string }>, label: string) {
  if (new Set(values.map(v => v.id)).size !== values.length) throw new Error(label + ' : identifiants dupliqués.')
}
function geometry(t: TableGeometry): TableGeometry {
  return { id: t.id, name: t.name, shape: t.shape, seats: t.seats, x: t.x, y: t.y, section: t.section, rotation: t.rotation || 0 }
}

/** Le fichier et l'historique transportent un décor, jamais des écritures métier. */
export function layoutSnapshot(data: LayoutSnapshot): LayoutSnapshot {
  return { tables: data.tables.filter(t => !t.id.startsWith('standalone-seat:')).map(geometry), rooms: structuredClone(data.rooms), fixtures: structuredClone(data.fixtures) }
}

export function parseLayout(data: unknown, fallbackRooms: LayoutRoom[], fixtureTypes: string[]): LayoutSnapshot {
  const root = object(data)
  if (root.version !== undefined && root.version !== 1) throw new Error('Version du plan non prise en charge.')
  const rooms = array(root.rooms === undefined ? fallbackRooms : root.rooms, 'Salles', 100).map(value => {
    const r = object(value)
    const color = text(r.color, 'Couleur', 20)
    if (!/^#[\da-f]{3,8}$/i.test(color)) throw new Error('Couleur invalide.')
    return { id: text(r.id, 'Identifiant de salle'), label: text(r.label, 'Nom de salle'), color, x: number(r.x, 'Position'), y: number(r.y, 'Position'), w: number(r.w, 'Largeur', 1), h: number(r.h, 'Hauteur', 1) }
  })
  unique(rooms, 'Salles')
  const sections = new Set(rooms.flatMap(r => [r.id, r.label]))
  const tables = array(root.tables, 'Tables', 1000).map(value => {
    const t = object(value), shape = text(t.shape, 'Forme'), seats = number(t.seats, 'Couverts', 1, 100)
    if (!['round', 'square', 'rect', 'bar'].includes(shape) || !Number.isInteger(seats)) throw new Error('Forme ou nombre de couverts invalide.')
    const section = text(t.section, 'Salle de la table')
    if (!sections.has(section)) throw new Error('Salle de la table inconnue.')
    const id = text(t.id, 'Identifiant de table')
    if (id.startsWith('standalone-seat:')) throw new Error('Une addition de chaise indépendante n’est pas un élément de décor.')
    return { id, name: text(t.name, 'Nom de table'), shape: shape as Table['shape'], seats, x: number(t.x, 'Position'), y: number(t.y, 'Position'), section, rotation: number(t.rotation ?? 0, 'Rotation', 0, 360) }
  })
  unique(tables, 'Tables')
  const fixtures = array(root.fixtures, 'Objets', 2000).map(value => {
    const f = object(value), type = text(f.type, 'Type d’objet')
    if (!fixtureTypes.includes(type)) throw new Error('Type d’objet inconnu.')
    const room = f.room === undefined ? undefined : text(f.room, 'Salle de l’objet')
    if (room && !sections.has(room)) throw new Error('Salle de l’objet inconnue.')
    if (f.label !== undefined && (typeof f.label !== 'string' || f.label.length > 200)) throw new Error('Étiquette invalide.')
    return { id: text(f.id, 'Identifiant d’objet'), type, x: number(f.x, 'Position'), y: number(f.y, 'Position'), rotation: number(f.rotation ?? 0, 'Rotation', 0, 360), ...(room ? { room } : {}), ...(f.label === undefined ? {} : { label: f.label as string }) }
  })
  unique(fixtures, 'Objets')
  return { tables, rooms, fixtures }
}

export function restoreLayout(tables: Table[], layout: LayoutSnapshot): { tables: Table[] } {
  const ids = new Set(layout.tables.map(t => t.id))
  for (const current of tables) {
    if (current.id.startsWith('standalone-seat:')) continue
    if (!ids.has(current.id) && (current.covers.length || current.status === 'occupied' || current.status === 'reserved' || current.mergedWith.length || current.isMergedInto || current.customerId || current.orderNote || current.kitchenNote || ('barNote' in current && current.barNote) || current.orderDiscount || current.offeredItemIds?.length)) {
      throw new Error('Une table porte une session, une fusion ou des données client. Terminez son traitement avant de remplacer le plan.')
    }
  }
  const existing = new Map(tables.map(t => [t.id, t]))
  return { tables: [...layout.tables.map(t => {
    const current = existing.get(t.id), graphic = geometry(t)
    return current ? { ...current, ...graphic } : { ...makeTable(t.id, t.name, t.shape, t.seats, t.x, t.y, t.section), rotation: graphic.rotation }
  }), ...tables.filter(t => t.id.startsWith('standalone-seat:'))] }
}
