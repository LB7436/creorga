import { createHash } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import prisma from './prisma'
import { accessFor, hasCapability, type BusinessAccess } from './business-permissions'
import { AssistantRequestError, type AssistantBudget } from './assistant-budget'
import { currentFloorCompanyId, getFloorState } from '../routes/floorState'
import { moneyMinor } from './money'

type Capability = Parameters<typeof hasCapability>[1]
interface AssistantScope { readonly companyId: string; readonly userId: string; readonly revision: string }
const admittedScopes = new WeakMap<Request, Readonly<AssistantScope>>()
const changedScope = () => new AssistantRequestError('ASSISTANT_SCOPE_CHANGED', 403,
  'Vos droits ou la société ont changé pendant cette demande. Aucun résultat périmé n’est retourné ; relancez la demande avec votre accès actuel.')
const unavailableScope = () => new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
  'Le contexte autorisé de cette société ne peut pas être vérifié. Aucun résultat métier supplémentaire n’est confirmé.')
function scopeRevision(companyId: string, userId: string, access: BusinessAccess) {
  return createHash('sha256').update(JSON.stringify([
    companyId, userId, access.role, access.revision, [...access.capabilities].sort(),
  ])).digest('hex')
}
export function assertAssistantCapability(req: Request, capability: Capability) {
  if (!hasCapability(req as any, capability)) throw new AssistantRequestError('ASSISTANT_FORBIDDEN', 403,
    'Vos droits actuels ne permettent pas cette lecture dans l’assistant.')
}

/** Seulement l'identité et la société admises par les middlewares serveur. */
export function assistantScope(req: Request) {
  const { user, companyId, businessAccess } = req as any
  const expected = admittedScopes.get(req)
  if (!user?.userId || user.userId === 'internal-service' || !companyId
    || companyId !== currentFloorCompanyId() || !businessAccess?.revision) {
    if (expected) throw changedScope()
    throw new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
      'Le contexte autorisé de cette société n’est pas disponible dans l’assistant.')
  }
  assertAssistantCapability(req, 'assistant.use')
  const revision = scopeRevision(String(companyId), String(user.userId), businessAccess)
  if (expected) {
    if (expected.companyId !== companyId || expected.userId !== user.userId || expected.revision !== revision) throw changedScope()
    return expected
  }
  const admitted = Object.freeze({ companyId: String(companyId), userId: String(user.userId), revision })
  admittedScopes.set(req, admitted)
  return admitted
}

/** Relecture courte sans verrou : une réattribution ne ressuscite jamais la demande ancienne. */
export async function revalidateAssistantScope(req: Request, budget?: AssistantBudget) {
  const expected = assistantScope(req)
  const verify = async () => {
    let timer!: ReturnType<typeof setTimeout>
    try {
      const member = await Promise.race([
        prisma.userCompany.findFirst({
          where: { userId: expected.userId, companyId: expected.companyId, isActive: true },
          select: { userId: true, companyId: true, role: true, capabilities: true, accessVersion: true, isActive: true },
        }),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(unavailableScope()), 2000) }),
      ])
      assistantScope(req)
      if (!member || member.isActive !== true || member.userId !== expected.userId || member.companyId !== expected.companyId
        || scopeRevision(expected.companyId, expected.userId, accessFor(member)) !== expected.revision) throw changedScope()
      return expected
    } finally { clearTimeout(timer) }
  }
  try { return budget ? await budget.wait(verify) : await verify() }
  catch (error) { if (error instanceof AssistantRequestError) throw error; throw unavailableScope() }
}

export function assistantGuard(req: Request, res: Response, next: NextFunction) {
  try { assistantScope(req); next() }
  catch (error) {
    const failure = error as AssistantRequestError
    res.status(failure.status || 503).json({ kind: 'error', code: failure.code, text: failure.message })
  }
}

export function assistantCapabilityGuard(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try { for (const capability of capabilities) assertAssistantCapability(req, capability); next() }
    catch (error) { const failure = error as AssistantRequestError; res.status(failure.status || 403).json({ kind: 'error', code: failure.code, text: failure.message }) }
  }
}

export interface AssistantBusinessContext { [key: string]: any }

const luxClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Luxembourg', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const luxParts = (date: Date) => Object.fromEntries(luxClock.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]))
/** Les minuits civils sont résolus séparément : une journée n'est pas toujours 24 h. */
export function luxembourgDayBounds(now = new Date()) {
  const parts = luxParts(now)
  const midnight = (day: number) => {
    const target = Date.UTC(parts.year, parts.month - 1, day)
    let instant = target
    for (let i = 0; i < 3; i++) {
      const p = luxParts(new Date(instant))
      instant += target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    }
    return new Date(instant)
  }
  return { gte: midnight(parts.day), lt: midnight(parts.day + 1) }
}

/** « Ce soir » est explicitement 18 h–minuit, après les transitions DST locales. */
function luxembourgEveningBounds(now = new Date()) {
  const { lt } = luxembourgDayBounds(now)
  return { gt: new Date(lt.getTime() - 6 * 60 * 60 * 1000), lt }
}

function localReadIntent(question: string) {
  // Formulations complètes seulement : aucun modificateur temporel/ordre caché ignoré.
  const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[?!.]+\s*$/, '').trim().replace(/\s+/g, ' ')
  if (/^(quels produits sont en rupture(?: de stock)?|produits en rupture(?: de stock)?)$/.test(normalized)) return 'stockouts'
  if (/^(quel employe travaille ce soir|quels employes travaillent ce soir|qui travaille ce soir)$/.test(normalized)) return 'evening'
  return null
}

async function localStockouts(companyId: string) {
  const rows = await prisma.product.findMany({ where: { companyId, isActive: true, stock: { lte: 0 } }, take: 41,
    orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true, stock: true } })
  if (rows.some(row => !Number.isSafeInteger(row.stock) || row.stock! > 0 || typeof row.name !== 'string' || row.name.length > 300)) throw Error('stock invalide')
  return { type: 'product-stockouts' as const, items: rows.slice(0, 40), truncated: rows.length > 40,
    observedAt: new Date().toISOString(), basis: 'active_products_with_tracked_stock_lte_zero',
    limits: 'Produits actifs dont le stock suivi est inférieur ou égal à zéro ; stocks non suivis (null) exclus. Les ingrédients sont un stock distinct. Maximum 40 produits affichés.' }
}

async function localEveningSchedule(req: Request, companyId: string, userId: string) {
  const team = hasCapability(req as any, 'hr.schedule.manage'), period = luxembourgEveningBounds()
  const rows = await prisma.shift.findMany({ where: { companyId, ...(!team ? { userId } : {}),
    startTime: { lt: period.lt }, endTime: { gt: period.gt }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    take: 41, orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    select: { id: true, userId: true, startTime: true, endTime: true, status: true, user: { select: { firstName: true, lastName: true } } } })
  if (rows.some(row => !(row.startTime instanceof Date) || !(row.endTime instanceof Date)
    || !Number.isFinite(row.startTime.getTime()) || !Number.isFinite(row.endTime.getTime())
    || row.startTime >= row.endTime || row.startTime >= period.lt || row.endTime <= period.gt
    || !['SCHEDULED', 'CONFIRMED'].includes(row.status) || !team && row.userId !== userId
    || !row.user || typeof row.user.firstName !== 'string' || typeof row.user.lastName !== 'string'
    || row.user.firstName.length > 200 || row.user.lastName.length > 200)) throw Error('créneau invalide')
  return { type: 'evening-schedule' as const, items: rows.slice(0, 40), truncated: rows.length > 40, scope: team ? 'team' : 'self',
    period: { from: period.gt.toISOString(), toExclusive: period.lt.toISOString(), timeZone: 'Europe/Luxembourg' },
    basis: 'scheduled_or_confirmed_shifts_overlapping_evening',
    limits: `${team ? 'Créneaux de l’équipe' : 'uniquement vos créneaux'} prévus ou confirmés de ce soir, 18:00–00:00 Europe/Luxembourg ; présence réelle non vérifiée. Maximum 40 créneaux affichés.` }
}

async function todayRevenue(companyId: string, question: string) {
  if (/hier|demain|dernier|prochain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|semaine|mois|ann[ée]e|depuis|entre|\d|net|rembours|avoir/i.test(question)) {
    throw new AssistantRequestError('ASSISTANT_REVENUE_PERIOD_UNAVAILABLE', 503,
      'Robi sait actuellement lire les ventes finalisées du jour au Luxembourg. Pour une autre période, le net, les avoirs ou les remboursements, consultez les rapports de caisse.')
  }
  const period = luxembourgDayBounds()
  const orders = await prisma.order.findMany({ where: { companyId, status: 'PAID', paidAt: period }, take: 1001,
    orderBy: { id: 'asc' }, select: { id: true, status: true, paidAt: true, total: true, subtotal: true, taxAmount: true,
      tenders: { where: { companyId }, take: 101, select: { amountCents: true } } } })
  try {
    if (orders.length > 1000) throw Error('borne dépassée')
    let sales = 0n, base = 0n, tax = 0n
    for (const order of orders) {
      if (order.status !== 'PAID' || !order.paidAt || order.paidAt < period.gte || order.paidAt >= period.lt || !order.tenders.length || order.tenders.length > 100) throw Error('vente incomplète')
      const total = moneyMinor(order.total), subtotal = moneyMinor(order.subtotal), vat = moneyMinor(order.taxAmount)
      if (total < 0 || subtotal < 0 || vat < 0 || BigInt(subtotal) + BigInt(vat) !== BigInt(total)) throw Error('taxes incohérentes')
      let paid = 0n
      for (const tender of order.tenders) {
        if (!Number.isSafeInteger(tender.amountCents) || tender.amountCents < 0) throw Error('règlement invalide')
        paid += BigInt(tender.amountCents)
      }
      if (paid !== BigInt(total)) throw Error('règlements incohérents')
      sales += BigInt(total); base += BigInt(subtotal); tax += BigInt(vat)
    }
    const amounts = [sales, base, tax].map(Number)
    if (amounts.some(value => !Number.isSafeInteger(value))) throw Error('montant hors limites')
    return { salesCents: amounts[0], baseCents: amounts[1], taxCents: amounts[2], orderCount: orders.length,
      currency: 'EUR', period: { from: period.gte.toISOString(), toExclusive: period.lt.toISOString(), timeZone: 'Europe/Luxembourg' },
      basis: 'finalized_paid_orders_documents_separate_not_certified_accounting',
      sources: orders.slice(0, 20).map(order => order.id), sourceCount: orders.length, sourcesTruncated: orders.length > 20,
      limits: 'Ventes finalisées brutes du jour. Factures et tickets non additionnés ; avoirs et remboursements séparés, non déduits. Aucun total bancaire ou net comptable.' }
  } catch {
    throw new AssistantRequestError('ASSISTANT_REVENUE_INCONSISTENT', 503,
      'Le total de ventes ne peut pas être vérifié : données incohérentes, incomplètes ou hors limites. Consultez le rapprochement financier.')
  }
}

/** Une intention/page sélectionne une ressource, mais ne confère jamais un droit. */
export async function loadAssistantBusinessContext(req: Request, currentPath: string, question: string): Promise<AssistantBusinessContext> {
  const { companyId, userId } = assistantScope(req)
  assertAssistantCapability(req, 'assistant.business.read')
  const ctx: AssistantBusinessContext = {}
  const localIntent = localReadIntent(question)
  if (localIntent) {
    assertAssistantCapability(req, localIntent === 'stockouts' ? 'inventory.quantities.read' : 'hr.schedule.read')
    try {
      return { localRead: localIntent === 'stockouts' ? await localStockouts(companyId) : await localEveningSchedule(req, companyId, userId) }
    } catch {
      throw new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
        'Cette lecture métier locale ne peut pas être vérifiée : source indisponible, incohérente ou hors limites. Aucun résultat de repli n’est inventé.')
    }
  }
  const revenue = /chiffre.d.affaires|\bCA\b|recette|revenue|turnover/i.test(question)
  const invoiceQuestion = /factur|impay/i.test(question)
  const expenseQuestion = /dépens|depens|co[uû]ts?|charges/i.test(question)
  const explicitFinance = revenue || invoiceQuestion || expenseQuestion
  const accountingOverview = !explicitFinance && /^\/accounting(\/|$)/.test(currentPath)
  const invoices = invoiceQuestion || (!explicitFinance && /^\/(invoices|accounting)(\/|$)/.test(currentPath))
  const expenses = expenseQuestion || accountingOverview
  const finance = revenue || accountingOverview || invoices || expenses
  const stock = /^\/(inventory|haccp)(\/|$)/.test(currentPath) || /\bstocks?\b|ruptures?|quantit|ingr[ée]dient|produits? disponibles/i.test(question)
  const shifts = /^\/hr(\/|$)/.test(currentPath) || /planning|horaires?|cr[ée]neaux?|shifts?|travaille|ce soir/i.test(question)
  const customers = /^\/crm(\/|$)/.test(currentPath)
  const marketing = /^\/marketing(\/|$)/.test(currentPath)
  const reviews = /^\/reputation(\/|$)/.test(currentPath)
  // Toutes les permissions sont contrôlées AVANT la première lecture.
  if (revenue || accountingOverview) assertAssistantCapability(req, 'finance.revenue.read')
  if (invoices) assertAssistantCapability(req, 'invoices.read')
  if (expenses) assertAssistantCapability(req, 'finance.costs.read')
  if (stock) assertAssistantCapability(req, 'inventory.quantities.read')
  if (shifts) assertAssistantCapability(req, 'hr.schedule.read')
  if (customers || marketing) assertAssistantCapability(req, 'crm.customers.read')
  if (marketing) assertAssistantCapability(req, 'marketing.read')
  if (reviews) assertAssistantCapability(req, 'reputation.read')
  try {
    if (revenue) return { revenue: await todayRevenue(companyId, question) }
    if (invoices) {
      ctx.invoices = await prisma.invoice.findMany({ where: { companyId }, take: 20, orderBy: { createdAt: 'desc' },
        select: { id: true, number: true, status: true, total: true, dueDate: true, currency: true } })
    }
    if (expenses) {
      ctx.expenses = await prisma.expense.findMany({ where: { companyId }, take: 20, orderBy: { date: 'desc' },
        select: { id: true, amount: true, category: true, description: true, date: true } })
    }
    if (stock) {
      ctx.products = await prisma.product.findMany({ where: { companyId, isActive: true }, take: 40, orderBy: { name: 'asc' },
        select: { id: true, name: true, stock: true } })
      ctx.ingredients = await prisma.ingredient.findMany({ where: { companyId }, take: 40, orderBy: { name: 'asc' },
        select: { id: true, name: true, unit: true, currentStock: true, minStockLevel: true } })
    }
    if (shifts) {
      const team = hasCapability(req as any, 'hr.schedule.manage')
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(start); end.setDate(end.getDate() + 31)
      ctx.shifts = await prisma.shift.findMany({ where: { companyId, ...(!team ? { userId } : {}), startTime: { lt: end }, endTime: { gte: start } },
        take: 40, orderBy: { startTime: 'asc' }, select: { id: true, userId: true, role: true, startTime: true, endTime: true, status: true,
          user: { select: { firstName: true, lastName: true } } } })
      ctx.planningScope = team ? 'équipe, 31 prochains jours, 40 créneaux maximum' : 'uniquement vos créneaux, 31 prochains jours, 40 créneaux maximum'
    }
    if (customers || marketing) ctx.customers = await prisma.customer.findMany({ where: { companyId }, take: 20, orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true } })
    if (marketing) ctx.campaigns = await prisma.campaign.findMany({ where: { companyId }, take: 10, orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, type: true, status: true, scheduledFor: true } })
    if (reviews) ctx.reviews = await prisma.review.findMany({ where: { companyId }, take: 20, orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, platform: true, replied: true, createdAt: true } })
    if (!finance && !stock && !shifts && !customers && !marketing && !reviews
      && (/^\/(pos|owner|modules)(\/|$)/.test(currentPath) || currentPath === '/')) {
      assertAssistantCapability(req, 'service.read')
      const floor = getFloorState(companyId)
      ctx.floor = { tablesOccupied: floor.tables.filter(t => t.status === 'OCCUPEE').length,
        tablesFree: floor.tables.filter(t => t.status === 'LIBRE').length, totalTables: floor.tables.length }
    }
    if (!Object.keys(ctx).length) throw new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
      'Aucune source métier autorisée n’est raccordée à cette page dans Robi. Ouvrez le module concerné pour vérifier les données.')
  } catch (error) {
    if (error instanceof AssistantRequestError) throw error
    throw new AssistantRequestError('ASSISTANT_CONTEXT_UNAVAILABLE', 503,
      'Les données autorisées de cette société ne peuvent pas être vérifiées. Aucun contexte de repli n’est utilisé.')
  }
  return ctx
}
