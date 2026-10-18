import type { Prisma } from '@prisma/client'

export interface FloorBusinessExclusions { paidCoverIds?: ReadonlySet<string>; consumedLineIds?: ReadonlySet<string> }
const list = (value: any): any[] => Array.isArray(value) ? value : []
const pick = (value: any, keys: readonly string[]) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]))
const tableGeometry = ['id', 'name', 'shape', 'seats', 'x', 'y', 'section', 'rotation']
const itemFields = ['id', 'name', 'price', 'qty', 'addedAt', 'note', 'productId', 'menuItemId', 'coverId', 'taxRate', 'pricingStatus', 'pricingSource']
const tableService = ['status', 'openedAt', 'mergedWith', 'isMergedInto', 'waiterId', 'vip', 'customerId', 'orderNote', 'kitchenNote', 'onHold', 'orderDiscount', 'offeredItemIds']
const room = (value: any) => pick(value, ['id', 'label', 'color', 'x', 'y', 'w', 'h'])
const fixture = (value: any) => pick(value, ['id', 'type', 'x', 'y', 'rotation', 'label', 'room'])

/** Une scène est un modèle de géométrie, pas un second journal des additions. */
export function projectFloorEditor(editor: any): any {
  return { rooms: list(editor?.rooms).map(room), fixtures: list(editor?.fixtures).map(fixture), background: editor?.background ?? null,
    scenes: list(editor?.scenes).map(scene => ({ ...pick(scene, ['id', 'label', 'createdAt']),
      tables: list(scene.tables).map(table => ({ ...pick(table, tableGeometry), status: 'available', covers: [], mergedWith: [] })),
      rooms: list(scene.rooms).map(room), fixtures: list(scene.fixtures).map(fixture) })) }
}

/** À utiliser après la projection SQL des couverts ouverts, jamais sur un miroir. */
export function projectPosTable(table: any): any {
  return { ...pick(table, [...tableGeometry, ...tableService]), covers: list(table.covers).map(cover => ({
    ...pick(cover, ['id', 'label', 'allocationId', 'kitchenNote', 'barNote', 'payment']), items: list(cover.items).map(item => pick(item, itemFields)),
  })) }
}

/** Projection sans mutation : les registres complets demeurent côté autorité. */
export function projectFloorBusiness(floor: any, excluded: FloorBusinessExclusions = {}): any {
  const visibleIds = new Set<string>()
  const items = (values: any) => list(values).filter(item => !excluded.consumedLineIds?.has(item.id)).map(item => {
    visibleIds.add(item.id)
    return pick(item, itemFields)
  })
  const tables = list(floor.tables).map(table => {
    const covers = Array.isArray(table.posCovers) ? table.posCovers
      .filter((cover: any) => cover.paidAt === undefined && cover.paidMethod === undefined && !excluded.paidCoverIds?.has(cover.id))
      .map((cover: any) => ({ ...pick(cover, ['id', 'label']), items: items(cover.items) })) : undefined
    return { ...pick(table, [...tableGeometry, ...tableService]),
      items: covers ? covers.flatMap((cover: any) => cover.items) : excluded.paidCoverIds?.has(`table-${table.id}-${table.openedAt || 0}`) ? [] : items(table.items), ...(covers ? { posCovers: covers } : {}) }
  })
  const chairs = list(floor.chairs).map(chair => {
    const coverId = `seat:${chair.id}:${chair.createdAt || chair.openedAt || 0}`
    return { ...pick(chair, ['id', 'label', 'tableId', 'position', 'customerName', 'x', 'y', 'status', 'openedAt', 'createdAt']),
      items: excluded.paidCoverIds?.has(coverId) ? [] : items(chair.items) }
  })
  const posPricing = Object.fromEntries(Object.entries(floor.posPricing || {}).filter(([id]) => visibleIds.has(id)).map(([id, value]: [string, any]) => [id, {
    ...pick(value, ['version', 'status', 'source', 'productId', 'name', 'priceCents', 'taxRate', 'quotedAt']),
    ...(value?.review ? { review: pick(value.review, ['actorId', 'reason', 'at', 'observedPriceCents']) } : {}),
  }]))
  const lineOrigins = Object.fromEntries(Object.entries(floor.lineOrigins || {}).filter(([id, origin]) => visibleIds.has(id) && typeof origin === 'string'))
  return { ...pick(floor, ['updatedAt', 'globalBackground', 'storageAuthority']), tables, chairs,
    zones: list(floor.zones).map(zone => pick(zone, ['id', 'name', 'color', 'backgroundImage'])),
    photos: list(floor.photos).map(photo => pick(photo, ['id', 'dataUrl', 'x', 'y', 'w', 'h', 'section', 'rotate'])),
    posPricing, lineOrigins, ...(floor.posEditor ? { posEditor: projectFloorEditor(floor.posEditor) } : {}) }
}

/** Le stockage peut conserver des miroirs anciens : relire les consommations SQL. */
export async function loadFloorBusinessProjection(db: Prisma.TransactionClient, companyId: string, floor: any) {
  const covers = list(floor.tables).flatMap(table => list(table.posCovers))
  const coverIds = [...covers.map(cover => cover.id), ...list(floor.tables).filter(table => !Array.isArray(table.posCovers) && list(table.items).length).map(table => `table-${table.id}-${table.openedAt || 0}`),
    ...list(floor.chairs).map(chair => `seat:${chair.id}:${chair.createdAt || chair.openedAt || 0}`)]
  const lineIds = [...new Set([...covers.flatMap(cover => list(cover.items)), ...list(floor.tables).flatMap(table => list(table.items)),
    ...list(floor.chairs).flatMap(chair => list(chair.items))].map(item => item.id))]
  const [paid, consumed, closed, ordered] = await Promise.all([
    coverIds.length ? db.posCoverPayment.findMany({ where: { companyId, coverId: { in: coverIds } }, select: { coverId: true } }) : [],
    lineIds.length ? db.saleOrigin.findMany({ where: { companyId, kind: 'LINE', sourceId: { in: lineIds } }, select: { sourceId: true } }) : [],
    coverIds.length ? db.serviceCover.findMany({ where: { companyId, coverId: { in: coverIds }, state: { not: 'OPEN' } }, select: { coverId: true } }) : [],
    lineIds.length ? db.orderItem.findMany({ where: { id: { in: lineIds }, order: { companyId } }, select: { id: true } }) : [],
  ])
  return projectFloorBusiness(floor, { paidCoverIds: new Set([...paid, ...closed].map(row => row.coverId)), consumedLineIds: new Set([...consumed.map(row => row.sourceId), ...ordered.map(row => row.id)]) })
}
