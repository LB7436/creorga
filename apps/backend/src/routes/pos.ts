import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireRole } from '../middleware/requireCompany'
import { getFloorState, lockFloorForPayment } from './floorState'
import { PosError, cents, calculateSale, buildClosure, receiptHtml, checkoutSchema, posTableSchema, seatSchema, type PosTable } from '../lib/pos-ledger'
import { sendEmail } from '../lib/email'
import logger from '../lib/logger'
import { syncKitchenTickets } from '../lib/kitchen-tickets'
import { importedProductId } from '../lib/catalog-import'

const router = Router()
const stateStatus: Record<string, string> = { available: 'LIBRE', occupied: 'OCCUPEE', reserved: 'RESERVEE', dirty: 'NETTOYAGE' }
const posStatus = Object.fromEntries(Object.entries(stateStatus).map(([a, b]) => [b, a]))
function editorFor(companyId?: string) {
  const floor = getFloorState(companyId)
  const saved = floor.posEditor || { fixtures: [], scenes: [], background: null }
  return { ...saved, rooms: floor.zones.map((zone, i) => ({
    x: 20 + i * 360, y: 20, w: 600, h: 636,
    ...saved.rooms?.find((r: any) => r.id === zone.id || r.id === zone.name),
    id: zone.id, label: zone.name, color: zone.color || '#6366f1',
  })) }
}
const lock = (tx: any, companyId: string) => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('pos-ledger'))::text`
const wrap = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { await fn(req, res) } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Saisie invalide', details: e.issues })
    if (e instanceof PosError) return res.status(e.status).json({ error: e.message })
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Ce règlement existe déjà. Rechargez le journal.' })
    logger.error('[pos] opération refusée', e)
    return res.status(503).json({ error: 'Confirmation serveur impossible. Conservez cet écran et réessayez : aucun règlement ne sera créé deux fois.' })
  }
}

async function tablesFor(companyId: string): Promise<PosTable[]> {
  const [products, paid, guests, dbTables] = await Promise.all([
    prisma.product.findMany({ where: { companyId }, select: { id: true, name: true, price: true } }),
    prisma.posCoverPayment.findMany({ where: { companyId }, select: { coverId: true } }),
    prisma.order.findMany({ where: { companyId, source: 'GUEST', paidAt: null, status: { not: 'CANCELLED' } }, include: { items: { include: { product: true } } } }),
    prisma.table.findMany({ where: { companyId, isActive: true } }),
  ])
  const paidIds = new Set(paid.map(p => p.coverId))
  const toItems = (items: any[], coverId: string) => items.map(i => ({
    id: i.id, menuItemId: i.productId || i.menuItemId || (products.filter(p => p.name === i.name).length === 1 ? products.find(p => p.name === i.name)!.id : 'produit-a-verifier'),
    name: i.name, price: i.price, qty: i.qty, note: i.note || '', coverId,
  }))
  const configured = getFloorState(companyId).tables
  const standalone = getFloorState(companyId).chairs.filter(c => c.tableId === null).map(c => ({ id: `standalone-seat:${c.id}`, name: c.label, section: 'Chaises indépendantes', seats: 1, x: c.x || 0, y: c.y || 0, shape: 'round', status: c.status || 'LIBRE', items: [] }))
  const allTables = [...configured, ...dbTables.filter(t => !configured.some(f => f.id === t.id)).map(t => ({ id: t.id, name: t.name, section: t.section, seats: t.capacity, x: t.posX, y: t.posY, shape: 'round', status: 'LIBRE', items: [] })), ...standalone]
  return allTables.map((t: any) => {
    const fallbackId = `table-${t.id}-${t.openedAt || 0}`
    const covers = [
      ...(t.posCovers || (t.items?.length ? [{ id: fallbackId, label: 'Table', items: toItems(t.items, fallbackId) }] : [])),
      ...getFloorState(companyId).chairs.filter(c => (c.tableId === t.id || (c.tableId === null && t.id === `standalone-seat:${c.id}`)) && c.items.length).map((c: any) => {
        const id = `seat:${c.id}:${c.createdAt || c.openedAt || 0}`
        return { id, label: c.customerName || c.label, items: toItems(c.items, id) }
      }),
    ]
    const unpaid = covers.filter((c: any) => !paidIds.has(c.id) && !c.id.startsWith('guest:')).map((c: any) => ({ ...c, paidAt: undefined, paidMethod: undefined, items: c.items.map((i: any) => {
      const p = products.find(p => p.id === i.menuItemId)
      return p ? { ...i, name: p.name, price: p.price } : i
    }) }))
    const fromGuest = guests.filter(g => g.externalTableId === t.id).map(g => ({
      id: `guest:${g.id}`, label: `QR #${g.orderNumber}`, items: g.items.map(i => ({ id: i.id, menuItemId: i.productId,
        name: i.productName || i.product.name, price: i.unitPrice, qty: i.quantity, note: i.notes || '', coverId: `guest:${g.id}` })),
    }))
    return { ...t, status: unpaid.some((c: any) => c.items.length) || fromGuest.length ? 'occupied' : (posStatus[t.status] || 'available'),
      covers: [...unpaid, ...fromGuest], mergedWith: t.mergedWith || [] }
  })
}

router.get('/bootstrap', wrap(async (req, res) => {
  const companyId = req.companyId
  const [tables, products, members, sales, closures, settings] = await Promise.all([
    tablesFor(companyId), prisma.product.findMany({ where: { companyId, isActive: true }, include: { category: true } }),
    prisma.userCompany.findMany({ where: { companyId, isActive: true }, include: { user: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.posSale.findMany({ where: { companyId, closedId: null }, orderBy: { number: 'desc' } }),
    prisma.posClosure.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } }),
    prisma.companySettings.findUnique({ where: { companyId } }),
  ])
  const reservations = await prisma.reservation.findMany({ where: { companyId, status: { in: ['PENDING', 'CONFIRMED'] }, date: { gte: new Date() } }, select: { id: true, tableId: true, guestName: true, date: true }, take: 100 })
  const staff = members.map(m => ({ id: m.userId, name: `${m.user.firstName} ${m.user.lastName}`, role: m.role === 'EMPLOYEE' ? 'WAITER' : m.role, pin: '', color: '#6366f1' }))
  const editor = editorFor(companyId)
  res.json({ companyId, revision: getFloorState(companyId).updatedAt, tables: tables.filter(t => !t.id.startsWith('standalone-seat:')).map(t => ({ ...t, section: editor.rooms.find((r: any) => r.label === t.section)?.id || t.section })),
    seats: getFloorState(companyId).chairs.map((c: any) => ({ ...c, position: c.position, createdAt: c.createdAt || c.openedAt || 0, status: c.status === 'RESERVEE' ? 'reserved' : c.items.length ? 'occupied' : 'free',
      items: c.items.map((i: any) => { const exact = products.find(p => p.id === (i.productId || i.menuItemId)); const byName = products.filter(p => p.name === i.name); const p = exact || (!i.productId && !i.menuItemId && byName.length === 1 ? byName[0] : undefined); return { ...i, menuItemId: p?.id || i.productId || i.menuItemId || 'produit-a-verifier', name: p?.name || i.name, price: p?.price ?? i.price, note: i.note || '', coverId: `seat:${c.id}:${c.createdAt || c.openedAt || 0}` } }) })),
    reservations,
    editor,
    menu: products.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category.name, emoji: p.category.icon || '🍽️', active: true, stock: p.stock ?? undefined, taxRate: p.taxRate })),
    staff, currentStaff: staff.find(s => s.id === req.user.userId), ventes: sales.map(s => s.snapshot), clotures: closures.map(c => c.snapshot),
    settings: { restaurantName: req.company.name, receiptFooter: settings?.receiptFooter || '', currency: 'EUR', taxRate: settings?.defaultTaxRate || 0, defaultTip: 0, tipPresets: [0, 5, 10, 15] } })
}))

router.put('/draft', wrap(async (req, res) => {
  const tables = z.array(posTableSchema).max(300).parse(req.body.tables)
  if (tables.some(t => t.covers.some(c => c.paidAt !== undefined || c.paidMethod !== undefined))) throw new PosError('Un brouillon ne peut pas déclarer un règlement. Utilisez l’encaissement serveur.')
  const alreadyPaid = await prisma.posCoverPayment.count({ where: { companyId: req.companyId, coverId: { in: tables.flatMap(t => t.covers.map(c => c.id)) } } })
  if (alreadyPaid) throw new PosError('Ce brouillon contient un couvert déjà réglé. Rechargez le plan serveur.', 409)
  const floor = getFloorState()
  const seats = req.body.seats === undefined ? undefined : z.array(seatSchema).max(9000).parse(req.body.seats)
  if (seats && (new Set(seats.map(s => s.id)).size !== seats.length || seats.some(s => s.tableId && !tables.some(t => t.id === s.tableId)))) throw new PosError('Chaises dupliquées ou table inconnue.')
  if (seats && floor.chairs.some(c => c.items.length && !seats.some(s => s.id === c.id))) throw new PosError('Une chaise non vide ne peut pas être supprimée.', 409)
  if (req.body.editor !== undefined) {
    const editor = z.object({ rooms: z.array(z.object({ id: z.string().min(1).max(100), label: z.string().min(1).max(100), color: z.string().regex(/^#[0-9a-f]{6}$/i), x: z.number().finite(), y: z.number().finite(), w: z.number().positive().max(10000), h: z.number().positive().max(10000) })).max(100),
      fixtures: z.array(z.object({ id: z.string().max(100), type: z.string().max(100), x: z.number().finite(), y: z.number().finite(), rotation: z.number().finite(), label: z.string().max(160).optional(), room: z.string().max(100).optional() })).max(1000),
      scenes: z.array(z.object({ id: z.string(), label: z.string().max(100), tables: z.array(posTableSchema).max(300), fixtures: z.array(z.record(z.unknown())).max(1000), rooms: z.array(z.record(z.unknown())).max(100), createdAt: z.number() })).max(30),
      background: z.string().max(3_000_000).regex(/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/).nullable(),
    }).parse(req.body.editor)
    const current = editorFor()
    if (new Set(editor.rooms.map(r => r.id)).size !== editor.rooms.length || new Set(editor.rooms.map(r => r.label.trim().toLocaleLowerCase())).size !== editor.rooms.length) throw new PosError('Les identifiants et noms des salles doivent être uniques.')
    if (!['OWNER', 'MANAGER'].includes(req.role) && JSON.stringify(editor) !== JSON.stringify(current)) throw new PosError('La configuration des salles est réservée aux responsables.', 403)
    floor.posEditor = editor
  }
  // La caisse manipule des identifiants stables ; le plan partagé utilise les noms.
  for (const t of tables) {
    const room = floor.posEditor?.rooms?.find((r: any) => r.id === t.section || r.label === t.section)
    if (room) t.section = room.label
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
    if (!['OWNER', 'MANAGER'].includes(req.role) && JSON.stringify([t.orderDiscount || null, t.offeredItemIds || []]) !== JSON.stringify([old?.orderDiscount || null, old?.offeredItemIds || []])) throw new PosError('Les gestes commerciaux nécessitent une connexion responsable.', 403)
  }
  if (!['OWNER', 'MANAGER'].includes(req.role) && JSON.stringify(tables.map(config)) !== JSON.stringify(floor.tables.map(config))) throw new PosError('La configuration des salles est réservée au propriétaire et au responsable.', 403)
  for (const old of floor.tables) if (!tables.some(t => t.id === old.id) && (old.items.length || floor.chairs.some(c => c.tableId === old.id && c.items.length))) throw new PosError('Une table non vide ne peut pas être supprimée.', 409)
  floor.tables = tables.map(t => ({ ...floor.tables.find(old => old.id === t.id), ...t, status: stateStatus[t.status] as any,
    posCovers: t.covers.filter(c => !c.id.startsWith('guest:') && !c.id.startsWith('seat:')), items: t.covers.filter(c => !c.id.startsWith('guest:') && !c.id.startsWith('seat:') && !c.paidAt).flatMap(c => c.items.map(i => ({ ...i, productId: i.menuItemId, addedAt: Date.now() }))),
  }))
  for (const t of tables) if (!floor.zones.some(z => z.name === t.section)) floor.zones.push({ id: `pos-${t.id}`, name: t.section })
  if (floor.posEditor?.rooms?.length) floor.zones = floor.posEditor.rooms.map((r: any) => ({ id: r.id, name: r.label, color: r.color }))
  if (seats) floor.chairs = seats.map(s => ({ ...s, label: `Place ${(s.position ?? 0) + 1}`, status: s.status === 'reserved' ? 'RESERVEE' : s.items.length ? 'OCCUPEE' : 'LIBRE',
    items: s.items.map(i => ({ ...i, productId: i.menuItemId, addedAt: Date.now() })) }))
  const activeTickets = syncKitchenTickets(floor, await tablesFor(req.companyId), req.user.userId)
  const paidTickets = new Set((await prisma.posCoverPayment.findMany({ where: { companyId: req.companyId }, select: { coverId: true } })).map(p => p.coverId))
  for (const ticket of Object.values(floor.kitchenTickets || {}) as any[]) if (!activeTickets.has(ticket.id) && !paidTickets.has(ticket.id) && !['served', 'cancelled'].includes(ticket.status)) {
    ticket.status = 'cancelled'; ticket.updatedAt = Date.now(); ticket.actorId = req.user.userId
  }
  res.json(floor)
}))

router.get('/kitchen', wrap(async (req, res) => {
  const floor = getFloorState()
  const guests = await prisma.order.findMany({ where: { companyId: req.companyId, source: 'GUEST', status: { not: 'CANCELLED' }, guestStatus: { not: 'served' } }, include: { items: true }, orderBy: { createdAt: 'asc' } })
  const tickets = [...Object.values(floor.kitchenTickets || {}).filter((t: any) => !['served', 'cancelled'].includes(t.status)),
    ...guests.map(g => ({ id: `guest:${g.id}`, tableName: floor.tables.find(t => t.id === g.externalTableId)?.name || g.externalTableId,
      coverLabel: `QR #${g.orderNumber}`, status: g.guestStatus === 'on_the_way' ? 'ready' : g.guestStatus === 'preparing' ? 'preparing' : 'waiting',
      createdAt: g.createdAt.getTime(), updatedAt: g.updatedAt.getTime(), items: g.items.map(i => ({ id: i.id, name: i.productName || 'Produit', qty: i.quantity, note: i.notes || '' })) }))]
  res.json({ revision: floor.updatedAt, tickets })
}))
router.patch('/kitchen/:id', wrap(async (req, res) => {
  const { status, updatedAt } = z.object({ status: z.enum(['waiting', 'preparing', 'ready', 'served', 'cancelled']), updatedAt: z.number().finite() }).parse(req.body)
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

router.post('/checkout', requireRole('OWNER', 'MANAGER', 'EMPLOYEE', 'WAITER', 'CASHIER'), wrap(async (req, res) => {
  const input = checkoutSchema.parse(req.body)
  const release = lockFloorForPayment()
  if (!release) throw new PosError('Un encaissement est en cours. Réessayez avec la même référence.', 409)
  try {
  const companyId = req.companyId
  const sale = await prisma.$transaction(async tx => {
    await lock(tx, companyId)
    const existing = await tx.posSale.findUnique({ where: { id: input.requestId } })
    if (existing) {
      if (existing.companyId !== companyId || existing.userId !== req.user.userId) throw new PosError('Référence de règlement indisponible.', 409)
      return existing.snapshot as any
    }
    const table = (await tablesFor(companyId)).find(t => t.id === input.tableId)
    const covers = table?.covers.filter(c => input.coverIds.includes(c.id)) || []
    if (!table || !covers.length || covers.length !== new Set(input.coverIds).size || covers.some(c => c.paidAt || !c.items.length)) throw new PosError('Ces couverts sont absents, vides ou déjà réglés.', 409)
    if (table.customerId && !await tx.customer.findFirst({ where: { id: table.customerId, companyId }, select: { id: true } })) throw new PosError('Le client rattaché à cette table est absent de cet établissement.', 409)
    const alreadyPaid = await tx.posCoverPayment.count({ where: { companyId, coverId: { in: input.coverIds } } })
    if (alreadyPaid) throw new PosError('Un de ces couverts est déjà réglé.', 409)
    const guestIds = covers.filter(c => c.id.startsWith('guest:')).map(c => c.id.slice(6))
    const guests = await tx.order.findMany({ where: { companyId, id: { in: guestIds }, paidAt: null, status: { not: 'CANCELLED' } }, include: { items: true } })
    if (guests.length !== guestIds.length) throw new PosError('Une commande QR a déjà été réglée.', 409)
    const products = await tx.product.findMany({ where: { companyId, id: { in: covers.flatMap(c => c.items.map(i => i.menuItemId)) } } })
    const lines = covers.flatMap(c => c.items.map(i => {
      const p = products.find(p => p.id === i.menuItemId)
      const guest = c.id.startsWith('guest:') ? guests.find(g => g.id === c.id.slice(6))?.items.find(l => l.id === i.id) : undefined
      if (!p || (!guest && !p.isActive)) throw new PosError(`Article indisponible : ${i.name}.`)
      return { name: guest?.productName || p.name, productId: p.id, price: guest?.unitPrice ?? p.price, taxRate: guest?.taxRate ?? p.taxRate,
        qty: guest?.quantity ?? i.qty, notes: i.note, guest: !!guest }
    }))
    const brut = cents(lines.reduce((s, l) => s + l.price * l.qty, 0))
    const remises: Array<{ type: string; libelle: string; montant: number }> = []
    let remaining = brut
    const used = new Set<string>()
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
        const gift = await tx.giftCard.findFirst({ where: { companyId, code: r.code, isActive: true } })
        if (!r.code || !gift || (gift.expiresAt && gift.expiresAt < new Date())) throw new PosError('Carte cadeau invalide ou expirée.')
        amount = cents(Math.min(remaining, gift.currentBalance))
        const updated = await tx.giftCard.updateMany({ where: { id: gift.id, currentBalance: { gte: amount } }, data: { currentBalance: { decrement: amount } } })
        if (!updated.count) throw new PosError('Le solde de la carte cadeau a changé.', 409)
      } else if (r.type !== 'geste' || !['OWNER', 'MANAGER'].includes(req.role)) {
        throw new PosError('Cette remise nécessite un droit responsable ou un programme client vérifié.', 403)
      }
      amount = cents(Math.min(remaining, amount)); remaining = cents(remaining - amount)
      if (Math.abs(amount - r.montant) > 0.01) throw new PosError('Le montant de la remise a changé. Actualisez avant de confirmer.', 409)
      remises.push({ type: r.type, libelle: r.libelle, montant: amount })
    }
    const tip = cents(input.tip), charity = cents(input.options?.arrondiCaritatif || 0)
    const amounts = calculateSale(lines, cents(brut - remaining), tip, charity)
    if (Math.abs(input.expectedTotal - amounts.total) > 0.01) throw new PosError(`Le prix serveur est ${amounts.total.toFixed(2)} €. Actualisez l'addition avant de confirmer.`, 409)
    const reglements = input.options?.reglements?.filter(p => p.montant > 0).map(p => ({ ...p, montant: cents(p.montant) })) || [{ methode: input.method, montant: amounts.total }]
    if (!reglements.length || Math.abs(cents(reglements.reduce((s, p) => s + p.montant, 0)) - amounts.total) > 0.01) throw new PosError('Les règlements ne correspondent pas au total.')
    if (input.method === 'cash' && !input.options?.reglements && input.cashReceived !== undefined && input.cashReceived < amounts.total) throw new PosError('Le montant reçu est insuffisant.')
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
    if (native.length) {
      // La numérotation reste protégée par l'unicité ; les autres routes conservent leur reprise avec attente aléatoire.
      const lastOrder = await tx.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } })
      const a = calculateSale(native, cents(brut - remaining), 0, 0)
      await tx.order.create({ data: { companyId, userId: req.user.userId, source: 'POS', externalTableId: table.id,
        customerId: table.customerId || null, notes: table.orderNote || null,
        orderNumber: (lastOrder?.orderNumber || 0) + 1, status: 'PAID', paidAt: new Date(), paymentMethod: principale,
        subtotal: a.sousTotal, taxAmount: a.tva, total: cents(a.brut - (brut - remaining)),
        items: { create: native.map(l => ({ productId: l.productId, productName: l.name, quantity: l.qty, unitPrice: l.price, taxRate: l.taxRate, notes: l.notes })) } } })
    }
    if (guestIds.length) await tx.order.updateMany({ where: { companyId, id: { in: guestIds }, paidAt: null }, data: { status: 'PAID', paidAt: new Date(), paymentMethod: principale } })
    const previous = await tx.posSale.findFirst({ where: { companyId }, orderBy: { number: 'desc' } })
    const user = await tx.user.findUniqueOrThrow({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } })
    const snapshot = { id: input.requestId, numero: (previous?.number || 0) + 1, horodatage: Date.now(), tableId: table.id, tableName: table.name,
      couverts: covers.map(c => c.label), coverIds: input.coverIds, lignes: lines.map(({ name, price, qty }) => ({ name, price, qty })),
      receipt: input.options?.receipt || { message: '', includeBrand: false, includePromo: false },
      ...amounts, pourboire: tip, arrondiCaritatif: charity, remises, reglements, methode: principale, vendeur: `${user.firstName} ${user.lastName}` }
    await tx.posSale.create({ data: { id: snapshot.id, companyId, userId: req.user.userId, number: snapshot.numero, snapshot,
      covers: { create: input.coverIds.map(coverId => ({ companyId, coverId })) } } })
    return snapshot
  }, { timeout: 15000 })
  // Si le disque tombe après le commit, la même référence permet de retrouver la vente sans la rejouer.
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
    const stillUnpaid = (await tablesFor(companyId)).find(t => t.id === table.id)?.covers.some(c => c.items.length)
    if (!stillUnpaid) { table.posCovers = []; table.status = 'NETTOYAGE'; table.openedAt = undefined; table.orderDiscount = null; table.offeredItemIds = []; table.customerId = null; table.orderNote = ''; table.kitchenNote = ''; table.vip = false }
  }
  res.json(sale)
  } finally { release() }
}))

router.post('/close', requireRole('OWNER', 'MANAGER'), wrap(async (req, res) => {
  const id = z.string().uuid().parse(req.body.requestId)
  const snapshot = await prisma.$transaction(async tx => {
    await lock(tx, req.companyId)
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

router.get('/sales/:id/receipt', wrap(async (req, res) => {
  const sale = await prisma.posSale.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
  if (!sale) throw new PosError('Ticket introuvable.', 404)
  res.set('Cache-Control', 'private, no-store').type('html').send(receiptHtml(sale.snapshot, req.company))
}))

// Réconciliation après réponse perdue : lecture uniquement, aucune nouvelle vente.
router.get('/sales/:id', wrap(async (req, res) => {
  const sale = await prisma.posSale.findFirst({ where: { id: req.params.id, companyId: req.companyId,
    ...(!['OWNER', 'MANAGER'].includes(req.role) ? { userId: req.user.userId } : {}) } })
  if (!sale) throw new PosError('Règlement non retrouvé.', 404)
  res.set('Cache-Control', 'private, no-store').json(sale.snapshot)
}))

router.post('/sales/:id/email', wrap(async (req, res) => {
  const input = z.object({ requestId: z.string().uuid(), to: z.string().trim().email().max(254) }).parse(req.body)
  const sale = await prisma.posSale.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
  if (!sale) throw new PosError('Ticket introuvable.', 404)
  const existing = await prisma.posReceiptDelivery.findUnique({ where: { id: input.requestId } })
  if (existing) {
    if (existing.companyId !== req.companyId || existing.saleId !== sale.id || existing.recipient !== input.to) throw new PosError('Référence d’envoi invalide.', 409)
    if (existing.status === 'SENT') return res.json({ ok: true, messageId: existing.providerId })
    throw new PosError('Cet envoi est en cours ou son résultat est incertain. Vérifiez la boîte destinataire avant un nouvel envoi.', 409)
  }
  await prisma.posReceiptDelivery.create({ data: { id: input.requestId, companyId: req.companyId, saleId: sale.id, recipient: input.to } })
  try {
    const sent = await sendEmail({ to: input.to, subject: `Votre ticket — ${req.company.name}`, html: receiptHtml(sale.snapshot, req.company) })
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
router.get('/catalog', requireRole('OWNER', 'MANAGER'), wrap(async (req, res) => {
  res.json(await prisma.product.findMany({ where: { companyId: req.companyId }, include: { category: true }, orderBy: { name: 'asc' } }))
}))
router.post('/catalog-import', requireRole('OWNER', 'MANAGER'), wrap(async (req, res) => {
  const products = z.array(z.object({ id: z.string().max(100).optional(), name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(100), price: z.number().positive().max(1e6), taxRate: z.number().min(0).max(100),
    stock: z.number().int().min(0).nullable().optional(), isActive: z.boolean().optional() })).min(1).max(500).parse(req.body.products)
  await prisma.$transaction(async tx => {
    await lock(tx, req.companyId)
    const seen = new Set<string>()
    for (const p of products) {
      let category = await tx.category.findFirst({ where: { companyId: req.companyId, name: p.category } })
      if (!category) category = await tx.category.create({ data: { companyId: req.companyId, name: p.category } })
      const data = { name: p.name, categoryId: category.id, price: p.price, taxRate: p.taxRate, stock: p.stock ?? null, isActive: p.isActive ?? true }
      const existing = p.id ? await tx.product.findFirst({ where: { id: p.id, companyId: req.companyId } }) : null
      const id = existing?.id || importedProductId(req.companyId, p)
      if (seen.has(id)) throw new PosError('Produit répété dans le fichier. Utilisez des identifiants distincts pour les homonymes.')
      seen.add(id)
      await tx.product.upsert({ where: { id }, update: data, create: { id, ...data, companyId: req.companyId } })
    }
  }, { timeout: 15000 })
  res.json({ saved: products.length })
}))
router.get('/settings', requireRole('OWNER', 'MANAGER'), wrap(async (req, res) => {
  res.json(await prisma.companySettings.findUnique({ where: { companyId: req.companyId } }))
}))
router.put('/settings', requireRole('OWNER', 'MANAGER'), wrap(async (req, res) => {
  const data = settingsSchema.parse(req.body)
  res.json(await prisma.companySettings.upsert({ where: { companyId: req.companyId }, create: { companyId: req.companyId, ...data }, update: data }))
}))

export default router
