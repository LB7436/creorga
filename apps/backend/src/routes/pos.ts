import { createTrackedRouter as Router } from '../lib/tracked-router'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { hasCapability } from '../lib/business-permissions'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'
import { getFloorState, lockFloorForPayment, prepareFloorPricing, setReviewedFloorQuote, commitCurrentFloor } from './floorState'
import { PosError, cents, calculateSale, buildClosure, receiptHtml, checkoutSchema, posTableSchema, seatSchema, type PosTable } from '../lib/pos-ledger'
import { sendEmail } from '../lib/email'
import logger from '../lib/logger'
import { syncKitchenTickets } from '../lib/kitchen-tickets'
import { importedProductId } from '../lib/catalog-import'
import { createHash } from 'node:crypto'
import { moneyMinor, totalsFromTtc, allocateMinor } from '../lib/money'
import { activePaymentExists } from '../lib/payments/ledger'
import { floorLines, pricedItem, quoteFor, PosPricingError } from '../lib/pos-pricing'
import type { Prisma } from '@prisma/client'
import { recordPosTenders, orderPaymentBalance, orderPaymentBalances } from '../lib/order-tenders'
import { partialPaymentSchema, payPosPart } from '../lib/pos-partial-payments'
import { WorkspaceError, postgresFloorEnabled, floorHash } from '../lib/floor-workspace'
import { tableMovementSchema, previousMovement, moveTable } from '../lib/table-movements'
import { separationSchema, previousSeparation, separateService } from '../lib/service-separations'
import { MAX_FLOOR_TABLES } from '../lib/floor-validation'
import { assertSeatProjection } from '../lib/pos-seat-projection'
import { loadFloorBusinessProjection, projectFloorEditor, projectPosTable } from '../lib/floor-business-projection'
import { lockCheckoutGuestVisits, closeCheckoutGuestVisits } from '../lib/checkout-guest-visits'
import { SHARE_PREFIX, allocationSchema, allocationConfirmation, previousFinancialAllocation, previewFinancialAllocation, confirmFinancialAllocation, serviceSharesFor, shareBalance } from '../lib/financial-allocations'

const router = Router()
const stateStatus: Record<string, string> = { available: 'LIBRE', occupied: 'OCCUPEE', reserved: 'RESERVEE', dirty: 'NETTOYAGE' }
const posStatus = Object.fromEntries(Object.entries(stateStatus).map(([a, b]) => [b, a]))
function editorFor(companyId?: string) {
  const floor = getFloorState(companyId)
  const saved = floor.posEditor || { fixtures: [], scenes: [], background: null }
  return { ...saved, rooms: floor.zones.map((zone, i) => {
    // Un ancien nom ne remplace jamais un ID exact, ni n'attribue le même
    // cadre à plusieurs salles. Projection de lecture : le plan stocké reste intact.
    const exact = saved.rooms?.find((room: any) => room.id === zone.id)
    const uniqueAlias = floor.zones.filter(candidate => candidate.name === zone.name).length === 1
      && !floor.zones.some(candidate => candidate.id === zone.name)
    const legacy = uniqueAlias ? saved.rooms?.find((room: any) => room.id === zone.name) : undefined
    return { x: 20 + i * 360, y: 20, w: 600, h: 636, ...(exact || legacy),
      id: zone.id, label: zone.name, color: zone.color || '#6366f1' }
  }) }
}
const lock = (tx: any, companyId: string) => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('pos-ledger'))::text`
const wrap = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { await fn(req, res) } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Saisie invalide', details: e.issues })
    if (e instanceof PosError || e instanceof WorkspaceError || e instanceof BusinessPermissionError) return res.status(e.status).json({ error: e.message })
    if (e instanceof PosPricingError) return res.status(409).json({ error: e.message, code: 'POS_PRICING_REVIEW_REQUIRED' })
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Ce règlement existe déjà. Rechargez le journal.' })
    logger.error('[pos] opération refusée', e)
    return res.status(503).json({ error: 'Confirmation serveur impossible. Conservez cet écran et réessayez : aucun règlement ne sera créé deux fois.' })
  }
}

async function tablesFor(companyId: string, db: Prisma.TransactionClient = prisma): Promise<PosTable[]> {
  const [products, paid, guests, dbTables, consumed, closed] = await Promise.all([
    db.product.findMany({ where: { companyId }, select: { id: true, name: true, price: true } }),
    db.posCoverPayment.findMany({ where: { companyId }, select: { coverId: true } }),
    db.order.findMany({ where: { companyId, source: 'GUEST', paidAt: null, status: { notIn: ['CANCELLED', 'PAID'] } }, include: { items: { include: { product: true } } } }),
    db.table.findMany({ where: { companyId, isActive: true } }),
    db.saleOrigin.findMany({ where: { companyId, kind: 'LINE' }, select: { sourceId: true } }),
    db.serviceCover.findMany({ where: { companyId, state: { not: 'OPEN' } }, select: { coverId: true } }),
  ])
  const paidIds = new Set([...paid, ...closed].map(p => p.coverId))
  const shares = await serviceSharesFor(db, companyId)
  const allocatedOrders = new Set(shares.map(s => s.orderId))
  const consumedIds = new Set(consumed.map(p => p.sourceId))
  // Les lignes déjà rattachées à une commande ne deviennent pas des lignes POS natives.
  const existingOrderLines = await db.orderItem.findMany({ where: { id: { in: floorLines(getFloorState(companyId)).map(i => i.id) }, order: { companyId } }, select: { id: true } })
  for (const line of existingOrderLines) consumedIds.add(line.id)
  const toItems = (items: any[], coverId: string) => items.map(i => ({
    id: i.id, menuItemId: i.productId || i.menuItemId || (products.filter(p => p.name === i.name).length === 1 ? products.find(p => p.name === i.name)!.id : 'produit-a-verifier'),
    ...pricedItem(getFloorState(companyId), i), note: i.note || '', coverId,
  }))
  const configured = getFloorState(companyId).tables
  const standalone = getFloorState(companyId).chairs.filter(c => c.tableId === null).map(c => ({ id: `standalone-seat:${c.id}`, name: c.label, section: 'Chaises indépendantes', seats: 1, x: c.x || 0, y: c.y || 0, shape: 'round', status: c.status || 'LIBRE', items: [] }))
  const allTables = [...configured, ...dbTables.filter(t => !configured.some(f => f.id === t.id)).map(t => ({ id: t.id, name: t.name, section: t.section, seats: t.capacity, x: t.posX, y: t.posY, shape: 'round', status: 'LIBRE', items: [] })), ...standalone]
  const linked = await db.serviceCover.findMany({ where: { companyId, state: 'OPEN', orderId: { not: null } }, include: { order: true } })
  const orderBalances = await orderPaymentBalances(db, companyId, linked.flatMap(c => c.order ? [c.order] : []))
  const balances = new Map(linked.filter(c => c.order).map(c => [c.coverId, { orderId: c.orderId, ...orderBalances.get(c.orderId!)! }] as const))
  return allTables.map((t: any) => {
    const fallbackId = `table-${t.id}-${t.openedAt || 0}`
    const covers = [
      ...(t.posCovers || (t.items?.length ? [{ id: fallbackId, label: 'Table', items: toItems(t.items, fallbackId) }] : [])),
      ...getFloorState(companyId).chairs.filter(c => (c.tableId === t.id || (c.tableId === null && t.id === `standalone-seat:${c.id}`)) && c.items.length).map((c: any) => {
        const id = `seat:${c.id}:${c.createdAt || c.openedAt || 0}`
        return { id, label: c.customerName || c.label, items: toItems(c.items, id) }
      }),
    ]
    const unpaid = covers.filter((c: any) => !paidIds.has(c.id) && c.paidAt === undefined && c.paidMethod === undefined && !c.id.startsWith('guest:')).flatMap((c: any) => {
      const items = c.items.filter((i: any) => !consumedIds.has(i.id)).map((i: any) => pricedItem(getFloorState(companyId), i))
      // Un groupe natif ouvert attend sa première commande : son identité ne
      // disparaît pas au prochain poll. Ne jamais ressusciter un groupe rendu
      // vide par le retrait de lignes déjà vendues/rattachées à une commande.
      const waitingForFirstOrder = c.items.length === 0 && !c.id.startsWith('seat:') && t.status === 'OCCUPEE'
      return items.length || waitingForFirstOrder ? [{ ...c, paidAt: undefined, paidMethod: undefined, items }] : []
    })
    const fromGuest = guests.filter(g => g.externalTableId === t.id && !allocatedOrders.has(g.id)).map(g => ({
      id: `guest:${g.id}`, label: `QR #${g.orderNumber}`, items: g.items.map(i => ({ id: i.id, menuItemId: i.productId,
        name: i.productName || i.product.name, price: i.unitPrice, taxRate: i.taxRate, pricingStatus: 'confirmed' as const, pricingSource: 'guest-order', qty: i.quantity, note: i.notes || '', coverId: `guest:${g.id}` })),
    }))
    const fromShares = shares.filter(s => s.tableId === t.id && shareBalance(s).outstandingCents > 0 && s.order.status !== 'CANCELLED').map(s => {
      const snapshot: any = s.snapshot, coverId = SHARE_PREFIX + s.id
      return { id: coverId, label: s.label, allocationId: s.allocationId, kitchenNote: snapshot.kitchenNote, barNote: snapshot.barNote,
        items: snapshot.lines.map((l: any) => ({ id: 'portion:' + floorHash([s.id, l.itemId]), menuItemId: l.productId, name: l.name, price: l.price, taxRate: l.taxRate,
          pricingStatus: 'confirmed', pricingSource: 'historical-allocation', qty: l.qty, note: l.note, coverId })), payment: { orderId: s.orderId, ...shareBalance(s) } }
    })
    return { ...t, status: unpaid.some((c: any) => c.items.length) || fromGuest.length || fromShares.length ? 'occupied' : (posStatus[t.status] || 'available'),
      covers: [...unpaid, ...fromGuest].map(c => ({ ...c, ...(balances.has(c.id) ? { payment: balances.get(c.id) } : {}) })).concat(fromShares), mergedWith: t.mergedWith || [] }
  })
}

router.get('/bootstrap', wrap(async (req, res) => {
  const companyId = req.companyId
  const [tables, products, members, sales, closures, settings] = await Promise.all([
    tablesFor(companyId), prisma.product.findMany({ where: { companyId, isActive: true }, include: { category: true } }),
    prisma.userCompany.findMany({ where: { companyId, isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true } } } }),
    hasCapability(req, 'finance.revenue.read') ? prisma.posSale.findMany({ where: { companyId, closedId: null }, orderBy: { number: 'desc' } }) : Promise.resolve([]),
    hasCapability(req, 'finance.revenue.read') ? prisma.posClosure.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    prisma.companySettings.findUnique({ where: { companyId } }),
  ])
  const reservations = await prisma.reservation.findMany({ where: { companyId, status: { in: ['PENDING', 'CONFIRMED'] }, date: { gte: new Date() } }, select: { id: true, tableId: true, guestName: true, date: true }, take: 100 })
  const staff = members.map(m => ({ id: m.userId, name: `${m.user.firstName} ${m.user.lastName}`, role: m.role, pin: '', color: '#6366f1' }))
  const editor = hasCapability(req, 'finance.revenue.read') ? editorFor(companyId) : projectFloorEditor(editorFor(companyId))
  const visibleFloor = hasCapability(req, 'finance.revenue.read') ? getFloorState(companyId) : await loadFloorBusinessProjection(prisma, companyId, getFloorState(companyId))
  res.json({ companyId, revision: getFloorState(companyId).updatedAt, tables: tables.filter(t => !t.id.startsWith('standalone-seat:')).map(t => {
    const matches = editor.rooms.filter((room: any) => room.label === t.section)
    // Les miroirs bruts peuvent encore contenir un ancien couvert réglé ; seule
    // la projection « covers » recalculée est destinée au navigateur POS.
    const visible = projectPosTable(t)
    return { ...visible, section: editor.rooms.some((room: any) => room.id === t.section) ? t.section : matches.length === 1 ? matches[0].id : t.section }
  }),
    seats: visibleFloor.chairs.map((c: any) => ({ ...c, position: c.position, createdAt: c.createdAt || c.openedAt || 0, status: c.status === 'RESERVEE' ? 'reserved' : c.items.length ? 'occupied' : 'free',
      items: c.items.map((i: any) => ({ ...pricedItem(getFloorState(companyId), i), menuItemId: i.productId || i.menuItemId || 'produit-a-verifier', note: i.note || '', coverId: `seat:${c.id}:${c.createdAt || c.openedAt || 0}` })) })),
    reservations,
    editor,
    menu: products.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category.name, emoji: p.category.icon || '🍽️', active: true,
      ...(hasCapability(req, 'inventory.quantities.read') ? { stock: p.stock ?? undefined } : {}), taxRate: p.taxRate })),
    staff, currentStaff: staff.find(s => s.id === req.user.userId), businessAccess: req.businessAccess,
    ventes: sales.map(s => s.snapshot), clotures: closures.map(c => c.snapshot),
    settings: { restaurantName: req.company.name, receiptFooter: settings?.receiptFooter || '', currency: 'EUR', taxRate: settings?.defaultTaxRate || 0, defaultTip: 0, tipPresets: [0, 5, 10, 15], floorAuthority: postgresFloorEnabled() ? 'postgres' : 'legacy-file' } })
}))

router.post('/table-movements', requireCapabilities('service.manage'), wrap(async (req, res) => {
  if (!postgresFloorEnabled()) throw new PosError('Autorité PostgreSQL nécessaire pour déplacer des additions.', 409)
  const input = tableMovementSchema.parse(req.body), companyId = req.companyId, actorId = req.user.userId
  const previous = await previousMovement(prisma, companyId, actorId, input)
  if (previous) return void res.json(previous)
  const release = lockFloorForPayment()
  if (!release) throw new PosError('Une opération est en cours : réessayez avec la même référence.', 409)
  try {
    const result = await prisma.$transaction(async tx => {
      await lock(tx, companyId)
      await assertTransactionCapabilities(tx, req, 'service.manage')
      return await previousMovement(tx, companyId, actorId, input) || moveTable(tx, companyId, actorId, input, await tablesFor(companyId, tx))
    }, { maxWait: 15000, timeout: 20000 })
    res.json(result)
  } finally { release() }
}))
router.get('/table-movements/:id', wrap(async (req, res) => {
  const row = await prisma.tableMovement.findFirst({ where: { id: req.params.id, companyId: req.companyId, actorId: req.user.userId } })
  if (!row) throw new PosError('Transfert introuvable pour ce compte.', 404)
  res.set('Cache-Control', 'private, no-store').json(row.snapshot)
}))

router.post('/service-separations', requireCapabilities('service.manage'), wrap(async (req, res) => {
  if (!postgresFloorEnabled()) throw new PosError('Autorité PostgreSQL nécessaire pour séparer des groupes.', 409)
  const input = separationSchema.parse(req.body), companyId = req.companyId, actorId = req.user.userId
  const previous = await previousSeparation(prisma, companyId, actorId, input)
  if (previous) return void res.json(previous)
  const release = lockFloorForPayment()
  if (!release) throw new PosError('Une opération est en cours. Réessayez avec la même référence.', 409)
  try {
    await prepareFloorPricing()
    const result = await prisma.$transaction(async tx => {
      await lock(tx, companyId)
      await assertTransactionCapabilities(tx, req, 'service.manage')
      return await previousSeparation(tx, companyId, actorId, input) || separateService(tx, companyId, actorId, input, await tablesFor(companyId, tx))
    }, { maxWait: 15000, timeout: 20000 })
    res.json(result)
  } finally { release() }
}))

router.post('/financial-allocations/preview', requireCapabilities('finance.manage'), wrap(async (req, res) => {
  if (!postgresFloorEnabled()) throw new PosError('Autorité PostgreSQL obligatoire pour répartir une créance.', 409)
  const input = allocationSchema.parse(req.body)
  const result = await prisma.$transaction(async tx => {
    await lock(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'finance.manage')
    const result = await previewFinancialAllocation(tx, req.companyId, req.user.userId, input)
    return { plan: result.plan, confirmHash: result.confirmHash }
  }, { maxWait: 15000, timeout: 20000 })
  res.set('Cache-Control', 'private, no-store').json(result)
}))
router.post('/financial-allocations', requireCapabilities('finance.manage'), wrap(async (req, res) => {
  if (!postgresFloorEnabled()) throw new PosError('Autorité PostgreSQL obligatoire pour répartir une créance.', 409)
  const { confirmHash, managerAcknowledged, ...input } = allocationConfirmation.parse(req.body)
  const previous = await previousFinancialAllocation(prisma, req.companyId, req.user.userId, input, confirmHash)
  if (previous) return void res.json(previous)
  const release = lockFloorForPayment()
  if (!release) throw new PosError('Une opération est en cours. Conservez la même référence.', 409)
  try {
    const result = await prisma.$transaction(async tx => {
      await lock(tx, req.companyId)
      await assertTransactionCapabilities(tx, req, 'finance.manage')
      return await previousFinancialAllocation(tx, req.companyId, req.user.userId, input, confirmHash) || confirmFinancialAllocation(tx, req.companyId, req.user.userId, input, confirmHash)
    }, { maxWait: 15000, timeout: 20000 })
    res.json(result)
  } finally { release() }
}))

router.put('/draft', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const tables = z.array(posTableSchema).max(MAX_FLOOR_TABLES).parse(req.body.tables)
  if (tables.some(t => t.covers.some(c => c.paidAt !== undefined || c.paidMethod !== undefined))) throw new PosError('Un brouillon ne peut pas déclarer un règlement. Utilisez l’encaissement serveur.')
  const alreadyPaid = await prisma.posCoverPayment.count({ where: { companyId: req.companyId, coverId: { in: tables.flatMap(t => t.covers.map(c => c.id)) } } })
  if (alreadyPaid) throw new PosError('Ce brouillon contient un couvert déjà réglé. Rechargez le plan serveur.', 409)
  const floor = getFloorState()
  const seats = req.body.seats === undefined ? undefined : z.array(seatSchema).max(9000).parse(req.body.seats)
  // Même instant de validation avant toute mutation de ce brouillon. La projection
  // après modification reste neuve ; aucun cache partagé entre requêtes ou sociétés.
  let originalProjection: Promise<PosTable[]> | undefined
  const beforeMutation = () => originalProjection ??= tablesFor(req.companyId)
  if (!hasCapability(req, 'orders.cancel')) {
    // La projection serveur exclut les couverts/lignes payés et supersédés.
    // Les chaises sont des miroirs : une identité compte une seule fois.
    const nextQuantities = new Map([
      ...tables.flatMap(t => t.covers.filter(c => !c.id.startsWith('guest:') && !c.id.startsWith(SHARE_PREFIX)).flatMap(c => c.items)),
      ...(seats || []).flatMap(s => s.items),
    ].map(item => [item.id, item.qty]))
    const removesLine = (await beforeMutation()).some(t => t.covers
      .filter(c => !c.id.startsWith('guest:') && !c.id.startsWith(SHARE_PREFIX))
      .some(c => c.items.some(item => (nextQuantities.get(item.id) ?? 0) < item.qty)))
    if (removesLine) throw new PosError('La suppression ou diminution d’une ligne nécessite le droit d’annuler.', 403)
  }
  const guestCovers = tables.flatMap(t => t.covers.filter(c => c.id.startsWith('guest:')).map(c => ({ tableId: t.id, cover: c })))
  if (tables.some(t => t.covers.some(c => c.id.startsWith(SHARE_PREFIX)) && (t.orderDiscount || t.offeredItemIds?.length))) throw new PosError('Les gestes globaux ne peuvent modifier une créance répartie. Utilisez une correction documentaire explicite.', 409)
  if (guestCovers.length) {
    const original = await beforeMutation()
    for (const entry of guestCovers) {
      const parent = original.find(t => t.covers.some(c => c.id === entry.cover.id)), cover = parent?.covers.find(c => c.id === entry.cover.id)
      if (!cover || parent!.id !== entry.tableId || floorHash(cover.items.map(i => [i.id, i.qty, i.menuItemId, i.note])) !== floorHash(entry.cover.items.map(i => [i.id, i.qty, i.menuItemId, i.note]))) throw new PosError('Transfert ou modification QR non pris en charge dans un brouillon : utilisez la commande d’origine. Aucune modification de table n’a été confirmée.', 409)
    }
  }
  const candidateLines = [...tables.flatMap(t => t.covers.filter(c => !c.id.startsWith('guest:')).flatMap(c => c.items.map(i => i.id))), ...(seats || []).flatMap(s => s.items.map(i => i.id))]
  if (await prisma.saleOrigin.count({ where: { companyId: req.companyId, kind: 'LINE', sourceId: { in: candidateLines } } })) throw new PosError('Ce brouillon contient une ligne déjà réglée. Rechargez depuis le serveur ; ne recréez pas la vente.', 409)
  if (await prisma.orderItem.count({ where: { id: { in: candidateLines }, order: { companyId: req.companyId } } })) throw new PosError('Une ligne de commande ou QR ne peut pas être recopiée en nouvelle vente native. Utilisez sa commande d’origine.', 409)
  if (postgresFloorEnabled()) {
    const locations = new Map<string, string>()
    for (const t of await beforeMutation()) for (const c of t.covers) for (const i of c.items) locations.set(i.id, c.id)
    const incoming = [...tables.flatMap(t => t.covers.filter(c => !c.id.startsWith('guest:')).flatMap(c => c.items.map(i => ({ id: i.id, coverId: c.id })))), ...(seats || []).flatMap(s => s.items.map(i => ({ id: i.id, coverId: `seat:${s.id}:${s.createdAt}` })))]
    if (incoming.some(i => locations.has(i.id) && locations.get(i.id) !== i.coverId)) throw new PosError('Utilisez la séparation serveur pour déplacer une ligne entre groupes ; un brouillon ne peut pas relancer la préparation ni contourner son audit.', 409)
  }
  if (seats && (new Set(seats.map(s => s.id)).size !== seats.length || seats.some(s => s.tableId && !tables.some(t => t.id === s.tableId)))) throw new PosError('Chaises dupliquées ou table inconnue.')
  if (seats && floor.chairs.some(c => c.items.length && !seats.some(s => s.id === c.id))) throw new PosError('Une chaise non vide ne peut pas être supprimée.', 409)
  let editorChanged = false
  if (req.body.editor !== undefined) {
    const editorSchema = z.object({ rooms: z.array(z.object({ id: z.string().min(1).max(100), label: z.string().min(1).max(100), color: z.string().regex(/^#[0-9a-f]{6}$/i), x: z.number().finite(), y: z.number().finite(), w: z.number().positive().max(10000), h: z.number().positive().max(10000) })).max(100),
      fixtures: z.array(z.object({ id: z.string().max(100), type: z.string().max(100), x: z.number().finite(), y: z.number().finite(), rotation: z.number().finite(), label: z.string().max(160).optional(), room: z.string().max(100).optional() })).max(1000),
      scenes: z.array(z.object({ id: z.string(), label: z.string().max(100), tables: z.array(posTableSchema).max(300), fixtures: z.array(z.record(z.unknown())).max(1000), rooms: z.array(z.record(z.unknown())).max(100), createdAt: z.number() })).max(30),
      background: z.string().max(3_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/).nullable(),
    })
    const editor = editorSchema.parse(req.body.editor), storedEditor = editorFor()
    const restricted = !hasCapability(req, 'finance.revenue.read')
    const current = editorSchema.parse(restricted ? projectFloorEditor(storedEditor) : storedEditor)
    if (restricted && floorHash(editor.scenes) !== floorHash(current.scenes)) throw new PosError('La modification de scènes contenant un historique nécessite un accès financier. Les scènes conservées restent intactes.', 403)
    // Zod et JSONB réordonnent les clés. Une projection identique n'est pas
    // une édition et ne doit ni bloquer le service, ni matérialiser des défauts.
    editorChanged = floorHash(editor) !== floorHash(current)
    if (editorChanged) {
      if (!hasCapability(req, 'settings.manage')) throw new PosError('La configuration des salles nécessite un droit de configuration.', 403)
      if (new Set(editor.rooms.map(r => r.id)).size !== editor.rooms.length || new Set(editor.rooms.map(r => r.label.trim().toLocaleLowerCase())).size !== editor.rooms.length) throw new PosError('Les identifiants et noms des salles doivent être uniques.')
      floor.posEditor = restricted ? { ...editor, scenes: storedEditor.scenes } : editor
    }
  }
  const rooms = editorFor().rooms
  const roomFor = (section: string) => {
    const exact = rooms.find((room: any) => room.id === section), aliases = rooms.filter((room: any) => room.label === section)
    return exact || (aliases.length === 1 ? aliases[0] : undefined)
  }
  // Le bootstrap expose des IDs ; un aller-retour de service conserve la
  // représentation historique du plan (ID ou libellé), sans réassociation.
  for (const t of tables) {
    const old = floor.tables.find(previous => previous.id === t.id), room = roomFor(t.section)
    if (old && (t.section === old.section || room && roomFor(old.section)?.id === room.id)) t.section = old.section
    else if (room) t.section = room.label
  }
  if (String(req.get('If-Match')) !== String(floor.updatedAt)) throw new PosError('Une autre session a modifié la salle. Rechargez avant de sauvegarder.', 409)
  if (new Set(tables.map(t => t.id)).size !== tables.length || new Set(tables.flatMap(t => t.covers.map(c => c.id))).size !== tables.flatMap(t => t.covers).length) throw new PosError('Identifiants de table ou couvert en double.')
  const config = (t: any) => [t.id, t.name, t.shape, t.seats, t.x, t.y, t.section]
  const customerIds = [...new Set(tables.map(t => t.customerId).filter((id): id is string => !!id))]
  if (customerIds.length !== await prisma.customer.count({ where: { companyId: req.companyId, id: { in: customerIds } } })) throw new PosError('Client introuvable dans cet établissement.')
  const waiterIds = [...new Set(tables.map(t => t.waiterId).filter((id): id is string => !!id))]
  if (waiterIds.length !== await prisma.userCompany.count({ where: { companyId: req.companyId, userId: { in: waiterIds }, isActive: true } })) throw new PosError('Le salarié affecté à la table est absent ou désactivé.')
  for (const t of tables) {
    const old: any = floor.tables.find(old => old.id === t.id)
    if (JSON.stringify(t.orderDiscount || null) !== JSON.stringify(old?.orderDiscount || null)) {
      for (const discount of [old?.orderDiscount, t.orderDiscount].filter(Boolean)) {
        if (!hasCapability(req, discount.type === 'free' ? 'complimentary.grant' : 'discounts.grant')) throw new PosError('Les remises et offerts nécessitent un droit explicite.', 403)
      }
    }
    if (!hasCapability(req, 'complimentary.grant') && JSON.stringify(t.offeredItemIds || []) !== JSON.stringify(old?.offeredItemIds || [])) throw new PosError('Les offerts nécessitent un droit explicite.', 403)
  }
  const layoutChanged = JSON.stringify(tables.map(config)) !== JSON.stringify(floor.tables.map(config))
  if (!hasCapability(req, 'settings.manage') && layoutChanged) throw new PosError('La configuration des salles nécessite un droit de configuration.', 403)
  assertSeatProjection(tables, seats)
  for (const old of floor.tables) if (!tables.some(t => t.id === old.id) && (old.items.length || floor.chairs.some(c => c.tableId === old.id && c.items.length))) throw new PosError('Une table non vide ne peut pas être supprimée.', 409)
  const previousLines = new Map(floorLines(floor).map(item => [item.id, item]))
  const mirrors = new Map(floor.tables.flatMap(table => table.items).map(item => [item.id, item]))
  const serviceAt = Date.now()
  const datedLine = (item: PosTable['covers'][number]['items'][number]) => {
    const previous = previousLines.get(item.id)
    const known = previous?.addedAt ?? mirrors.get(item.id)?.addedAt
    if (previous && (typeof known !== 'number' || !Number.isFinite(known))) throw new PosError('Date historique de ligne introuvable. Conservez le brouillon : une récupération contrôlée est nécessaire, aucun horaire n’a été inventé.', 409)
    return { ...item, productId: item.menuItemId, addedAt: previous ? known : serviceAt }
  }
  floor.tables = tables.map(t => {
    const posCovers = t.covers.filter(c => !c.id.startsWith('guest:') && !c.id.startsWith('seat:')).map(cover => ({ ...cover, items: cover.items.map(datedLine) }))
    return { ...floor.tables.find(old => old.id === t.id), ...t, status: stateStatus[t.status] as any, posCovers,
      items: posCovers.filter(cover => !cover.paidAt).flatMap(cover => cover.items) }
  })
  if (layoutChanged) for (const t of tables) if (!floor.zones.some(z => z.id === t.section || z.name === t.section)) floor.zones.push({ id: `pos-${t.id}`, name: t.section })
  if (editorChanged && floor.posEditor?.rooms?.length) floor.zones = floor.posEditor.rooms.map((r: any) => ({ id: r.id, name: r.label, color: r.color }))
  if (seats) floor.chairs = seats.map(s => ({ ...s, label: `Place ${(s.position ?? 0) + 1}`, status: s.status === 'reserved' ? 'RESERVEE' : s.items.length ? 'OCCUPEE' : 'LIBRE',
    items: s.items.map(datedLine) }))
  await prepareFloorPricing()
  const paidTickets = new Set((await prisma.posCoverPayment.findMany({ where: { companyId: req.companyId }, select: { coverId: true } })).map(p => p.coverId))
  const activeTickets = syncKitchenTickets(floor, await tablesFor(req.companyId), req.user.userId, Date.now(), paidTickets)
  for (const ticket of Object.values(floor.kitchenTickets || {}) as any[]) if (!activeTickets.has(ticket.id) && !ticket.preserveAfterMove && !paidTickets.has(ticket.coverId || ticket.id) && !['served', 'cancelled'].includes(ticket.status)) {
    ticket.status = 'cancelled'; ticket.updatedAt = Date.now(); ticket.actorId = req.user.userId
  }
  res.json(floor)
}))

router.post('/pricing/:lineId/review', requireCapabilities('catalog.prices.write'), wrap(async (req, res) => {
  const input = z.object({ productId: z.string().min(1), price: z.number().finite().min(0).max(1e6), taxRate: z.number().finite().min(0).max(100), reason: z.string().trim().min(5).max(500) }).parse(req.body)
  const floor = getFloorState()
  if (String(req.get('If-Match')) !== String(floor.updatedAt)) throw new PosError('Le plan a changé. Actualisez avant de vérifier la ligne.', 409)
  const item = floorLines(floor).find(i => i.id === req.params.lineId)
  if (!item) throw new PosError('Ligne absente ou déjà réglée.', 404)
  await prepareFloorPricing()
  const quote = quoteFor(floor, item)!
  if (quote.status !== 'review') throw new PosError('Cette ligne possède déjà un tarif confirmé ; il ne peut pas être réécrit.', 409)
  const product = await prisma.product.findFirst({ where: { id: input.productId, companyId: req.companyId } })
  if (!product) throw new PosError('Produit absent de cette société.', 404)
  setReviewedFloorQuote(item.id, { ...quote, productId: product.id, status: 'confirmed', source: 'legacy-reviewed', priceCents: moneyMinor(input.price), taxRate: input.taxRate,
    review: { actorId: req.user.userId, reason: input.reason, at: Date.now(), observedPriceCents: quote.priceCents } })
  item.menuItemId = product.id; item.productId = product.id
  await prepareFloorPricing()
  res.json(floor)
}))

router.get('/kitchen', wrap(async (req, res) => {
  const floor = getFloorState()
  const guests = await prisma.order.findMany({ where: { companyId: req.companyId, source: 'GUEST', status: { not: 'CANCELLED' }, guestStatus: { not: 'served' } }, include: { items: true }, orderBy: { createdAt: 'asc' } })
  const shares = await serviceSharesFor(prisma, req.companyId)
  const tickets = [...Object.values(floor.kitchenTickets || {}).filter((t: any) => !['served', 'cancelled'].includes(t.status)),
    ...guests.map(g => ({ id: `guest:${g.id}`, tableName: floor.tables.find(t => t.id === g.externalTableId)?.name || g.externalTableId,
      coverLabel: `QR #${g.orderNumber}`, status: g.guestStatus === 'on_the_way' ? 'ready' : g.guestStatus === 'preparing' ? 'preparing' : 'waiting',
      createdAt: g.createdAt.getTime(), updatedAt: g.updatedAt.getTime(), items: g.items.map(i => ({ id: i.id, name: i.productName || 'Produit', qty: i.quantity, note: i.notes || '' })),
      routing: shares.filter(s => s.orderId === g.id).flatMap(s => (s.snapshot as any).lines.map((l: any) => ({ tableId: s.tableId, tableName: floor.tables.find(t => t.id === s.tableId)?.name || s.tableId,
        coverId: SHARE_PREFIX + s.id, coverLabel: s.label, lineId: l.itemId, name: l.name, qty: l.qty, kitchenNote: (s.snapshot as any).kitchenNote, barNote: (s.snapshot as any).barNote }))) }))]
  res.json({ revision: floor.updatedAt, tickets })
}))
router.patch('/kitchen/:id', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const { status, updatedAt } = z.object({ status: z.enum(['waiting', 'preparing', 'ready', 'served', 'cancelled']), updatedAt: z.number().finite() }).parse(req.body)
  if (status === 'cancelled' && !hasCapability(req, 'orders.cancel')) throw new BusinessPermissionError()
  if (req.params.id.startsWith('guest:')) {
    if (status === 'cancelled') throw new PosError('Annulez une commande QR depuis la gestion des commandes, en conservant son traitement comptable.')
    const changed = await prisma.order.updateMany({ where: { id: req.params.id.slice(6), companyId: req.companyId, source: 'GUEST', status: { not: 'CANCELLED' }, updatedAt: new Date(updatedAt) }, data: { guestStatus: status === 'waiting' ? 'received' : status === 'ready' ? 'on_the_way' : status } })
    if (!changed.count) throw new PosError('Le ticket a changé. Actualisez la cuisine.', 409)
  } else {
    const ticket = getFloorState().kitchenTickets?.[req.params.id]
    if (!ticket) throw new PosError('Ticket introuvable.', 404)
    if (ticket.updatedAt !== updatedAt) throw new PosError('Le ticket a changé. Actualisez la cuisine.', 409)
    ticket.status = status; ticket.updatedAt = Math.max(Date.now(), updatedAt + 1); ticket.actorId = req.user.userId
  }
  res.json({ ok: true })
}))

router.get('/payments/:requestId', wrap(async (req, res) => {
  const attempt = await prisma.paymentAttempt.findFirst({ where: { companyId: req.companyId, requestId: z.string().uuid().parse(req.params.requestId), scope: 'POS_PARTIAL', userId: req.user.userId } })
  if (!attempt) throw new PosError('Règlement non retrouvé pour cet utilisateur.', 404)
  res.set('Cache-Control', 'private, no-store').json(attempt.response)
}))
router.post('/payments', requireCapabilities('payments.receive'), wrap(async (req, res) => {
  const input = partialPaymentSchema.parse(req.body)
  if (!postgresFloorEnabled()) throw new PosError('Activez l’autorité PostgreSQL sur la copie de laboratoire avant les acomptes natifs.', 409)
  // Les rejeux sont sérialisés par le verrou financier et relisent les droits,
  // mais ne prennent pas le verrou de salle : ils ne la modifient jamais.
  let release: (() => void) | undefined
  try {
    const result = await prisma.$transaction(async tx => {
      await lock(tx, req.companyId)
      await assertTransactionCapabilities(tx, req, 'payments.receive')
      // Nouvelle vérification SOUS verrou : une seconde caisse peut avoir gagné
      // après le précontrôle. Le rejeu ne termine jamais une visite plus récente.
      const existing = await tx.paymentAttempt.findUnique({ where: { companyId_requestId: { companyId: req.companyId, requestId: input.requestId } } })
      if (existing) return payPosPart(tx, req.companyId, req.user.userId, input, undefined)
      release = lockFloorForPayment() || undefined
      if (!release) throw new PosError('Un encaissement est en cours. Conservez la même référence.', 409)
      const visitScope = await lockCheckoutGuestVisits(tx, req.companyId, input.tableId,
        input.coverIds.filter(id => id.startsWith('guest:') && !id.startsWith(SHARE_PREFIX)).map(id => id.slice(6)))
      const result = await payPosPart(tx, req.companyId, req.user.userId, input, (await tablesFor(req.companyId, tx)).find(t => t.id === input.tableId))
      if (result && (result as any).status === 'SETTLED') {
        const remaining = (await tablesFor(req.companyId, tx)).find(t => t.id === input.tableId)
        if (!remaining) throw new PosError('Table absente après règlement : aucune fin de visite confirmée.', 409)
        if (!remaining.covers.some(c => c.items.length)) await closeCheckoutGuestVisits(tx, visitScope, req.user.userId, input.requestId)
      }
      return result
    }, { maxWait: 15000, timeout: 20000 })
    res.json(result)
  } finally { release?.() }
}))

router.post('/checkout', requireCapabilities('payments.receive'), wrap(async (req, res) => {
  const input = checkoutSchema.parse(req.body)
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  const release = lockFloorForPayment()
  if (!release) throw new PosError('Un encaissement est en cours. Réessayez avec la même référence.', 409)
  try {
  const companyId = req.companyId
  const sale = await prisma.$transaction(async tx => {
    await lock(tx, companyId)
    await assertTransactionCapabilities(tx, req, 'payments.receive')
    const existing = await tx.posSale.findUnique({ where: { id: input.requestId } })
    if (existing) {
      if (existing.companyId !== companyId || existing.userId !== req.user.userId) throw new PosError('Référence de règlement indisponible.', 409)
      const previous: any = existing.snapshot
      if (previous.requestHash ? previous.requestHash !== requestHash : previous.tableId !== input.tableId || moneyMinor(previous.total) !== moneyMinor(input.expectedTotal)
        || JSON.stringify([...previous.coverIds].sort()) !== JSON.stringify([...input.coverIds].sort())) throw new PosError('Cette référence désigne un autre règlement.', 409)
      return existing.snapshot as any
    }
    const visitScope = await lockCheckoutGuestVisits(tx, companyId, input.tableId,
      input.coverIds.filter(id => id.startsWith('guest:') && !id.startsWith(SHARE_PREFIX)).map(id => id.slice(6)))
    const table = (await tablesFor(companyId, tx)).find(t => t.id === input.tableId)
    const covers = table?.covers.filter(c => input.coverIds.includes(c.id)) || []
    if (input.coverIds.some(c => c.startsWith(SHARE_PREFIX))) throw new PosError('Créance répartie : utilisez Acompte / solde pour le groupe choisi. Aucun encaissement global implicite.', 409)
    if (!table || !covers.length || covers.length !== new Set(input.coverIds).size || covers.some(c => c.paidAt || !c.items.length)) throw new PosError('Ces couverts sont absents, vides ou déjà réglés.', 409)
    if (table.customerId && !await tx.customer.findFirst({ where: { id: table.customerId, companyId }, select: { id: true } })) throw new PosError('Le client rattaché à cette table est absent de cet établissement.', 409)
    const alreadyPaid = await tx.posCoverPayment.count({ where: { companyId, coverId: { in: input.coverIds } } })
    if (alreadyPaid) throw new PosError('Un de ces couverts est déjà réglé.', 409)
    if (await tx.serviceCover.count({ where: { companyId, coverId: { in: input.coverIds }, orderId: { not: null } } })) throw new PosError('Un acompte existe : utilisez Paiement partiel / solde, sans recréer le règlement complet.', 409)
    const guestIds = covers.filter(c => c.id.startsWith('guest:')).map(c => c.id.slice(6))
    // Le même verrou est partagé avec commandes, captures et rapprochements.
    // Ordre stable indispensable lorsqu'une addition regroupe plusieurs commandes.
    // Verrous société → table → commandes connues triées pris par visitScope.
    if (await activePaymentExists(tx, companyId, guestIds)) throw new PosError('Paiement en cours ou résultat incertain : vérifiez-le avant de régler cette addition en caisse.', 409)
    const guests = await tx.order.findMany({ where: { companyId, id: { in: guestIds }, paidAt: null, status: { not: 'CANCELLED' } }, include: { items: true } })
    if (guests.length !== guestIds.length) throw new PosError('Une commande QR a déjà été réglée.', 409)
    if (await tx.orderTender.count({ where: { companyId, orderId: { in: guestIds } } })) throw new PosError('Un paiement partiel existe : réglez uniquement le solde depuis la gestion des commandes.', 409)
    const products = await tx.product.findMany({ where: { companyId, id: { in: covers.flatMap(c => c.items.map(i => i.menuItemId)) } } })
    const lines = covers.flatMap(c => c.items.map(i => {
      const p = products.find(p => p.id === i.menuItemId)
      const guest = c.id.startsWith('guest:') ? guests.find(g => g.id === c.id.slice(6))?.items.find(l => l.id === i.id) : undefined
      const quote = quoteFor(getFloorState(), i)
      if (!guest && (!quote || quote.status !== 'confirmed' || quote.taxRate === undefined)) throw new PosError(`Ancienne ligne à vérifier par un responsable avant encaissement : ${i.name}.`, 409)
      if (!p || (!guest && quote?.productId !== p.id)) throw new PosError(`Article absent de cet établissement : ${i.name}.`)
      return { sourceLineId: i.id, name: guest?.productName || quote!.name, productId: p.id, price: guest?.unitPrice ?? quote!.priceCents / 100, taxRate: guest?.taxRate ?? quote!.taxRate!,
        qty: guest?.quantity ?? i.qty, notes: i.note, guest: !!guest }
    }))
    const brut = cents(lines.reduce((s, l) => s + l.price * l.qty, 0))
    const remises: Array<{ type: string; libelle: string; montant: number }> = []
    let remaining = brut
    const used = new Set<string>()
    if (table.offeredItemIds?.length && !hasCapability(req, 'complimentary.grant')) throw new PosError('Le règlement avec des offerts nécessite un droit explicite.', 403)
    if (table.orderDiscount && !hasCapability(req, table.orderDiscount.type === 'free' ? 'complimentary.grant' : 'discounts.grant')) throw new PosError('Le règlement avec un geste commercial nécessite un droit explicite.', 403)
    for (const r of input.options?.remises || []) {
      if (used.has(r.type)) throw new PosError('Une même remise ne peut pas être appliquée deux fois.')
      used.add(r.type)
      let amount = r.montant
      if (guestIds.length) throw new PosError('Réglez les commandes QR séparément pour appliquer une remise en caisse.')
      if (r.type === 'promo') {
        const promo = await tx.discountCode.findFirst({ where: { companyId, code: r.code, isActive: true } })
        if (!r.code || !promo || (promo.expiresAt && promo.expiresAt < new Date()) || (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit)) throw new PosError('Code promotionnel invalide ou épuisé.')
        amount = cents(Math.min(remaining, promo.type === 'PERCENT' ? brut * promo.value / 100 : promo.value))
        await tx.discountCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
      } else if (r.type === 'carte_cadeau') {
        throw new PosError('Une carte cadeau prépayée est un règlement. Actualisez la caisse pour utiliser le paiement par carte cadeau.')
      } else if (r.type !== 'geste' || !hasCapability(req,
        moneyMinor(amount) === moneyMinor(remaining) || table.offeredItemIds?.length && !table.orderDiscount ? 'complimentary.grant' : 'discounts.grant')) {
        throw new PosError('Cette remise nécessite un droit responsable ou un programme client vérifié.', 403)
      }
      if (r.type === 'geste' && (r.libelle.trim().length < 10 || r.libelle.trim() === 'Geste commercial responsable')) throw new PosError('Un offert ou une remise nécessite un motif explicite du responsable (10 caractères minimum).')
      amount = cents(Math.min(remaining, amount)); remaining = cents(remaining - amount)
      if (moneyMinor(amount) !== moneyMinor(r.montant)) throw new PosError('Le montant de la remise a changé. Actualisez avant de confirmer.', 409)
      remises.push({ type: r.type, libelle: r.libelle, montant: amount })
    }
    const tip = cents(input.tip), charity = cents(input.options?.arrondiCaritatif || 0)
    const amounts = calculateSale(lines, cents(brut - remaining), tip, charity)
    if (moneyMinor(input.expectedTotal) !== moneyMinor(amounts.total)) throw new PosError(`Le prix serveur est ${amounts.total.toFixed(2)} €. Actualisez l'addition avant de confirmer.`, 409)
    let giftAmount = 0, giftCardId: string | undefined
    if (input.options?.giftCard) {
      const selected = input.options.giftCard
      const requested = moneyMinor(selected.amount)
      if (requested <= 0 || requested > moneyMinor(amounts.total) - moneyMinor(tip) - moneyMinor(charity)) throw new PosError('La carte cadeau ne peut régler que les consommations de cette addition.')
      const gift = await tx.giftCard.findFirst({ where: { companyId, code: selected.code, isActive: true } })
      if (!gift || (gift.expiresAt && gift.expiresAt < new Date())) throw new PosError('Carte cadeau invalide ou expirée.')
      const balance = moneyMinor(gift.currentBalance)
      if (balance < requested) throw new PosError('Solde de carte cadeau insuffisant. Actualisez avant de confirmer.', 409)
      giftAmount = requested / 100; giftCardId = gift.id
      const updated = await tx.giftCard.updateMany({ where: { id: gift.id, companyId, currentBalance: gift.currentBalance }, data: { currentBalance: (balance - requested) / 100 } })
      if (!updated.count) throw new PosError('Le solde de la carte cadeau a changé. Actualisez avant de confirmer.', 409)
    }
    const externalDue = (moneyMinor(amounts.total) - moneyMinor(giftAmount)) / 100
    const reglements: Array<{ methode: string; montant: number; giftCardId?: string }> = input.options?.reglements?.filter(p => p.montant > 0).map(p => ({ ...p, montant: cents(p.montant) })) || (externalDue ? [{ methode: input.method, montant: externalDue }] : [])
    if (giftAmount) reglements.push({ methode: 'GIFT_CARD', montant: giftAmount, giftCardId })
    if (!amounts.total && !reglements.length) reglements.push({ methode: input.method, montant: 0 })
    if (!reglements.length || reglements.reduce((s, p) => s + moneyMinor(p.montant), 0) !== moneyMinor(amounts.total)) throw new PosError('Les règlements ne correspondent pas au total.')
    const cashDue = reglements.filter(p => p.methode === 'cash').reduce((sum, p) => sum + moneyMinor(p.montant), 0)
    if (cashDue && input.cashReceived !== undefined && moneyMinor(input.cashReceived) < cashDue) throw new PosError('Le montant reçu est insuffisant.')
    const cashChange = cashDue && input.cashReceived !== undefined ? (moneyMinor(input.cashReceived) - cashDue) / 100 : null
    const principale = reglements.reduce((a, b) => b.montant > a.montant ? b : a).methode
    for (const p of products) {
      const qty = lines.filter(l => l.productId === p.id).reduce((s, l) => s + l.qty, 0)
      if (qty > 50) throw new PosError(`Quantité cumulée excessive pour ${p.name}.`)
      if (p.stock !== null) {
        const result = await tx.product.updateMany({ where: { id: p.id, companyId, stock: { gte: qty } }, data: { stock: { decrement: qty } } })
        if (!result.count) throw new PosError(`Stock insuffisant pour ${p.name}.`, 409)
      }
    }
    const native = lines.filter(l => !l.guest)
    const orderIds = guests.map(g => g.id), orderWeights = guests.map(g => moneyMinor(g.total))
    if (native.length) {
      // La numérotation reste protégée par l'unicité ; les autres routes conservent leur reprise avec attente aléatoire.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('order-number'))::text`
      const lastOrder = await tx.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } })
      const a = calculateSale(native, cents(brut - remaining), 0, 0)
      const nativeOrder = await tx.order.create({ data: { companyId, userId: req.user.userId, source: 'POS', externalTableId: table.id,
        customerId: table.customerId || null, notes: table.orderNote || null,
        orderNumber: (lastOrder?.orderNumber || 0) + 1, status: 'PAID', paidAt: new Date(), inventoryDebitedAt: new Date(), paymentMethod: principale,
        subtotal: a.sousTotal, taxAmount: a.tva, total: cents(a.brut - (brut - remaining)),
        items: { create: native.map(l => ({ productId: l.productId, productName: l.name, quantity: l.qty, unitPrice: l.price, taxRate: l.taxRate, notes: l.notes })) } } })
      orderIds.push(nativeOrder.id); orderWeights.push(moneyMinor(nativeOrder.total))
    }
    if (guestIds.length) await tx.order.updateMany({ where: { companyId, id: { in: guestIds }, paidAt: null }, data: { status: 'PAID', paidAt: new Date(), inventoryDebitedAt: new Date(), paymentMethod: principale } })
    // Une ventilation mixte ne doit pas être réduite à son moyen principal
    // dans les rapports anciens qui lisent encore les commandes.
    const allocatedCash = allocateMinor(cashDue, orderWeights.some(Boolean) ? orderWeights : orderWeights.map(() => 1))
    const legacyMethod = reglements.length > 1 ? 'MIXED' : principale === 'cash' ? 'CASH' : principale === 'GIFT_CARD' ? 'GIFT_CARD' : 'CARD'
    for (let i = 0; i < orderIds.length; i++) await tx.order.update({ where: { id: orderIds[i] }, data: { paymentMethod: legacyMethod, cashReceived: allocatedCash[i] / 100, cashChange: 0 } })
    const previous = await tx.posSale.findFirst({ where: { companyId }, orderBy: { number: 'desc' } })
    const user = await tx.user.findUniqueOrThrow({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } })
    const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } })
    const issuer = { name: company.name, legalName: company.legalName, address: company.address, vatNumber: company.vatNumber, legalProfile: company.legalProfile }
    const taxGroups = totalsFromTtc(lines, moneyMinor(brut - remaining)).groups.map(({ taxRate, baseCents, taxCents, totalCents }) => ({ taxRate, baseCents, taxCents, totalCents }))
    const snapshot = { version: 2, id: input.requestId, requestHash, confirmation: 'manual_declaration', numero: (previous?.number || 0) + 1, horodatage: Date.now(), tableId: table.id, tableName: table.name,
      issuer, currency: company.currency, taxGroups, orderIds, cashChange,
      couverts: covers.map(c => c.label), coverIds: input.coverIds, lignes: lines.map(({ sourceLineId, name, price, qty, taxRate, productId }) => ({ sourceLineId, name, price, qty, taxRate, productId })),
      receipt: input.options?.receipt || { message: '', includeBrand: false, includePromo: false },
      ...amounts, pourboire: tip, arrondiCaritatif: charity, remises, reglements, methode: principale, vendeur: `${user.firstName} ${user.lastName}` }
    await tx.posSale.create({ data: { id: snapshot.id, companyId, userId: req.user.userId, number: snapshot.numero, snapshot,
      covers: { create: input.coverIds.map(coverId => ({ companyId, coverId })) },
      origins: { create: [...native.map(l => ({ kind: 'LINE', sourceId: l.sourceLineId })), ...orderIds.map(sourceId => ({ kind: 'ORDER', sourceId }))] } } })
    await recordPosTenders(tx, companyId, req.user.userId, snapshot)
    const remainingTable = (await tablesFor(companyId, tx)).find(t => t.id === input.tableId)
    if (!remainingTable) throw new PosError('Table absente après règlement : aucune fin de visite confirmée.', 409)
    const stillUnpaid = remainingTable.covers.some(c => c.items.length)
    if (!stillUnpaid) await closeCheckoutGuestVisits(tx, visitScope, req.user.userId, input.requestId)
    if (postgresFloorEnabled()) {
      await clearPaidFloor(snapshot, companyId, tx, stillUnpaid)
      await commitCurrentFloor(tx, req.user.userId, 'pos:checkout')
    }
    return snapshot
  }, { timeout: 15000 })
  // Si le disque tombe après le commit, la même référence permet de retrouver la vente sans la rejouer.
  if (!postgresFloorEnabled()) await clearPaidFloor(sale, companyId, prisma)
  res.json(sale)
  } finally { release() }
}))

async function clearPaidFloor(sale: any, companyId: string, db: Prisma.TransactionClient, knownStillUnpaid?: boolean) {
  const floor = getFloorState()
  for (const chair of floor.chairs as any[]) if (sale.coverIds.includes(`seat:${chair.id}:${chair.createdAt || chair.openedAt || 0}`)) {
    chair.items = []; chair.status = 'LIBRE'; chair.customerName = undefined; chair.createdAt = Date.now()
  }
  const table: any = floor.tables.find(t => t.id === sale.tableId)
  if (table) {
    if (table.orderDiscount?.type === 'amount') {
      const before = table.posCovers?.flatMap((c: any) => c.items).reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0
      table.orderDiscount.value = before ? cents(table.orderDiscount.value * Math.max(0, before - sale.brut) / before) : 0
    }
    table.posCovers = (table.posCovers || []).filter((c: any) => !sale.coverIds.includes(c.id))
    table.items = table.posCovers.flatMap((c: any) => c.items.map((i: any) => ({ ...i, productId: i.menuItemId, addedAt: Date.now() })))
    const stillUnpaid = knownStillUnpaid ?? (await tablesFor(companyId, db)).find(t => t.id === table.id)?.covers.some(c => c.items.length)
    if (!stillUnpaid) { table.posCovers = []; table.status = 'NETTOYAGE'; table.openedAt = undefined; table.orderDiscount = null; table.offeredItemIds = []; table.customerId = null; table.orderNote = ''; table.kitchenNote = ''; table.vip = false }
  }
}

router.post('/close', requireCapabilities('cash.close', 'finance.revenue.read'), wrap(async (req, res) => {
  const id = z.string().uuid().parse(req.body.requestId)
  const snapshot = await prisma.$transaction(async tx => {
    await lock(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'cash.close', 'finance.revenue.read')
    const existing = await tx.posClosure.findUnique({ where: { id } })
    if (existing) { if (existing.companyId !== req.companyId) throw new PosError('Référence indisponible.', 409); return existing.snapshot }
    const sales = await tx.posSale.findMany({ where: { companyId: req.companyId, closedId: null }, orderBy: { number: 'desc' } })
    if (!sales.length) throw new PosError('Aucune vente à clôturer.', 409)
    const snapshot = buildClosure(sales.map(s => s.snapshot), id)
    await tx.posClosure.create({ data: { id, companyId: req.companyId, userId: req.user.userId, snapshot } })
    await tx.posSale.updateMany({ where: { id: { in: sales.map(s => s.id) }, companyId: req.companyId, closedId: null }, data: { closedId: id } })
    return snapshot
  })
  res.json(snapshot)
}))

const saleReadScope = (req: any) => ({ id: req.params.id, companyId: req.companyId,
  ...(!hasCapability(req, 'finance.revenue.read') ? { userId: req.user.userId } : {}) })
router.get('/sales/:id/receipt', wrap(async (req, res) => {
  const sale = await prisma.posSale.findFirst({ where: saleReadScope(req) })
  if (!sale) throw new PosError('Ticket introuvable.', 404)
  res.set('Cache-Control', 'private, no-store').type('html').send(receiptHtml(sale.snapshot, req.company))
}))

// Réconciliation après réponse perdue : lecture uniquement, aucune nouvelle vente.
router.get('/sales/:id', wrap(async (req, res) => {
  const sale = await prisma.posSale.findFirst({ where: saleReadScope(req) })
  if (!sale) throw new PosError('Règlement non retrouvé.', 404)
  res.set('Cache-Control', 'private, no-store').json(sale.snapshot)
}))

router.post('/sales/:id/email', wrap(async (req, res) => {
  const input = z.object({ requestId: z.string().uuid(), to: z.string().trim().email().max(254) }).parse(req.body)
  const sale = await prisma.posSale.findFirst({ where: saleReadScope(req) })
  if (!sale) throw new PosError('Ticket introuvable.', 404)
  const existing = await prisma.posReceiptDelivery.findUnique({ where: { id: input.requestId } })
  if (existing) {
    if (existing.companyId !== req.companyId || existing.saleId !== sale.id || existing.recipient !== input.to) throw new PosError('Référence d’envoi invalide.', 409)
    if (existing.status === 'SENT') return res.json({ ok: true, messageId: existing.providerId })
    throw new PosError('Cet envoi est en cours ou son résultat est incertain. Vérifiez la boîte destinataire avant un nouvel envoi.', 409)
  }
  await prisma.posReceiptDelivery.create({ data: { id: input.requestId, companyId: req.companyId, saleId: sale.id, recipient: input.to } })
  try {
    const sent = await sendEmail({ to: input.to, subject: `Votre ticket — ${(sale.snapshot as any).issuer?.name || req.company.name}`, html: receiptHtml(sale.snapshot, req.company) })
    await prisma.posReceiptDelivery.update({ where: { id: input.requestId }, data: { status: 'SENT', providerId: sent.id } })
    res.json({ ok: true, messageId: sent.id })
  } catch (e) {
    await prisma.posReceiptDelivery.update({ where: { id: input.requestId }, data: { status: 'UNCERTAIN' } })
    throw e
  }
}))

router.post('/benefit', wrap(async (req, res) => {
  const { type, code } = z.object({ type: z.enum(['promo', 'gift']), code: z.string().trim().min(1).max(100) }).parse(req.body)
  const data = type === 'gift' ? await prisma.giftCard.findFirst({ where: { companyId: req.companyId, code, isActive: true } })
    : await prisma.discountCode.findFirst({ where: { companyId: req.companyId, code, isActive: true } })
  if (!data || (data.expiresAt && data.expiresAt < new Date())) throw new PosError('Code inconnu ou expiré.', 404)
  res.json(type === 'gift' ? { balance: (data as any).currentBalance } : { type: (data as any).type, value: (data as any).value })
}))

const settingsSchema = z.object({
  defaultTaxRate: z.number().min(0).max(100), taxRate1: z.number().min(0).max(100), taxRate2: z.number().min(0).max(100),
  taxRate3: z.number().min(0).max(100), taxRate4: z.number().min(0).max(100),
  receiptFooter: z.string().max(1000).nullable(), printerIp: z.string().max(100).nullable(),
})
router.get('/customers', wrap(async (req, res) => {
  const customers = await prisma.customer.findMany({ where: { companyId: req.companyId }, select: { id: true, firstName: true, lastName: true, phone: true, points: true }, orderBy: { lastName: 'asc' }, take: 1000 })
  res.json(customers.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, phone: c.phone || '', tier: 'Guest', points: c.points, discount: 0 })))
}))
router.get('/catalog', requireCapabilities('catalog.read'), wrap(async (req, res) => {
  const products = await prisma.product.findMany({ where: { companyId: req.companyId }, include: { category: true }, orderBy: { name: 'asc' } })
  res.json(products.map(product => { const { stock, ...visible } = product; return hasCapability(req, 'inventory.quantities.read') ? product : visible }))
}))
router.post('/catalog-import', requireCapabilities('catalog.prices.write'), wrap(async (req, res) => {
  const products = z.array(z.object({ id: z.string().max(100).optional(), name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(100), price: z.number().positive().max(1e6), taxRate: z.number().min(0).max(100),
    stock: z.number().int().min(0).nullable().optional(), isActive: z.boolean().optional() })).min(1).max(500).parse(req.body.products)
  const updatesStock = products.some(product => product.stock !== undefined)
  if (updatesStock && !hasCapability(req, 'inventory.adjust')) throw new BusinessPermissionError()
  await prisma.$transaction(async tx => {
    await lock(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'catalog.prices.write', ...(updatesStock ? ['inventory.adjust' as const] : []))
    const seen = new Set<string>()
    for (const p of products) {
      let category = await tx.category.findFirst({ where: { companyId: req.companyId, name: p.category } })
      if (!category) category = await tx.category.create({ data: { companyId: req.companyId, name: p.category } })
      const data = { name: p.name, categoryId: category.id, price: p.price, taxRate: p.taxRate, ...(p.stock !== undefined ? { stock: p.stock } : {}), isActive: p.isActive ?? true }
      const existing = p.id ? await tx.product.findFirst({ where: { id: p.id, companyId: req.companyId } }) : null
      const id = existing?.id || importedProductId(req.companyId, p)
      if (seen.has(id)) throw new PosError('Produit répété dans le fichier. Utilisez des identifiants distincts pour les homonymes.')
      seen.add(id)
      await tx.product.upsert({ where: { id }, update: data, create: { id, ...data, companyId: req.companyId } })
    }
  }, { timeout: 15000 })
  res.json({ saved: products.length })
}))
router.get('/settings', requireCapabilities('settings.manage'), wrap(async (req, res) => {
  res.json(await prisma.companySettings.findUnique({ where: { companyId: req.companyId } }))
}))
router.put('/settings', requireCapabilities('settings.manage'), wrap(async (req, res) => {
  const data = settingsSchema.parse(req.body)
  res.json(await prisma.companySettings.upsert({ where: { companyId: req.companyId }, create: { companyId: req.companyId, ...data }, update: data }))
}))

export default router
