import type { Table } from '../store/posStore'

export type FloorView = { key: string; label: string; color: string; tables: Table[]; unconfirmed?: boolean }

/** Projection de lecture uniquement : ne convertit ni les positions ni les sections enregistrées. */
export function floorViews(rooms: Array<{ id: string; label: string; color?: string }>, tables: Table[]): FloorView[] {
  const views: FloorView[] = rooms.map(room => ({ key: `room:${room.id}`, label: room.label, color: room.color || '#6366f1', tables: [] }))
  for (const table of tables) {
    const exact = rooms.findIndex(room => room.id === table.section)
    const byLabel = rooms.flatMap((room, index) => room.label === table.section ? [index] : [])
    const index = exact >= 0 ? exact : byLabel.length === 1 ? byLabel[0] : -1
    if (index >= 0) views[index].tables.push(table)
    else {
      const key = `unconfirmed:${table.section}`
      let view = views.find(candidate => candidate.key === key)
      if (!view) {
        view = { key, label: `Salle à confirmer · ${table.section || 'sans section'}`, color: '#fbbf24', tables: [], unconfirmed: true }
        views.push(view)
      }
      view.tables.push(table)
    }
  }
  return views
}

function footprint(table: Table) {
  if (table.shape === 'round') {
    const r = (table.seats <= 2 ? 30 : 42) + 30
    return { w: r, h: r }
  }
  return { w: (table.shape === 'bar' ? 160 : table.shape === 'square' ? 68 : table.seats >= 8 ? 120 : 96) / 2 + 30,
    h: (table.shape === 'bar' ? 42 : table.shape === 'square' ? 68 : 60) / 2 + 30 }
}

/** Le pointeur ne doit jamais choisir un autre groupe derrière une table/chaise. */
export function ambiguousFloorGeometry(tables: Table[]): boolean {
  if (tables.some(table => !Number.isFinite(table.x) || !Number.isFinite(table.y))) return true
  for (let i = 0; i < tables.length; i++) {
    const a = tables[i], sizeA = footprint(a)
    for (let j = i + 1; j < tables.length; j++) {
      const b = tables[j], sizeB = footprint(b)
      if (Math.abs(a.x - b.x) < sizeA.w + sizeB.w && Math.abs(a.y - b.y) < sizeA.h + sizeB.h) return true
    }
  }
  return false
}

/** Cadre de lecture déduit des seules tables visibles ; leurs coordonnées restent intactes. */
export function floorViewBox(tables: Table[]) {
  if (!tables.length || tables.some(table => !Number.isFinite(table.x) || !Number.isFinite(table.y))) return { x: 0, y: 0, w: 1100, h: 680 }
  const minX = Math.min(...tables.map(table => table.x - footprint(table).w))
  const maxX = Math.max(...tables.map(table => table.x + footprint(table).w))
  const minY = Math.min(...tables.map(table => table.y - footprint(table).h))
  const maxY = Math.max(...tables.map(table => table.y + footprint(table).h))
  const w = Math.max(600, maxX - minX + 180), h = Math.max(500, maxY - minY + 200)
  return { x: (minX + maxX - w) / 2, y: (minY + maxY - h) / 2, w, h }
}
