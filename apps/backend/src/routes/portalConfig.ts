import { Router } from 'express'
import prisma from '../lib/prisma'

/**
 * Portal config — shared between the admin "/clients" (5174) page and the
 * guest portal (5178). Cross-origin, so localStorage can't be shared.
 * Stored in-memory here (sufficient for dev; swap for Redis or DB in prod).
 */
export interface PortalConfig {
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
  themeMode: 'dark' | 'light'
  logoDataUrl?: string | null
  restaurantName?: string
  updatedAt: number
}

const DEFAULT_CONFIG: PortalConfig = {
  toggles: { menu: true, order: true, games: true, chat: true, reviews: true, announcements: true },
  games: {},
  welcomeMessage: 'Bienvenue chez nous ! Scannez le QR code pour découvrir notre carte.',
  accentColor: '#10b981',
  tableNumber: '1',
  themeMode: 'dark',
  logoDataUrl: null,
  restaurantName: 'Café um Rond-Point',
  updatedAt: Date.now(),
}

let current: PortalConfig = { ...DEFAULT_CONFIG }
const clientEvents: Array<Record<string, unknown>> = []

const router = Router()

// Public — the guest portal polls this without auth
router.get('/', (_req, res) => {
  res.json(current)
})

// Public guest portal data. In prod, scope this by a signed venue/table token.
router.get('/menu', async (_req, res) => {
  try {
    const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!company) {
      res.json({ companyId: null, categories: [], products: [] })
      return
    }
    const categories = await prisma.category.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    res.json({
      companyId: company.id,
      restaurantName: company.name,
      categories,
      products: categories.flatMap((category) => category.products),
    })
  } catch {
    res.status(500).json({ message: 'Menu indisponible' })
  }
})

router.post('/client', async (req, res) => {
  try {
    const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!company) {
      res.status(404).json({ message: 'Aucune societe configuree' })
      return
    }
    const body = req.body || {}
    const displayName = String(body.displayName || 'Client').trim()
    const [firstName, ...rest] = displayName.split(/\s+/)
    const email = body.email ? String(body.email).trim().toLowerCase() : null
    const phone = body.phone ? String(body.phone).trim() : null
    const existing = email
      ? await prisma.customer.findFirst({ where: { companyId: company.id, email } })
      : null
    const customer = existing
      ? await prisma.customer.update({
        where: { id: existing.id },
        data: { firstName: firstName || 'Client', lastName: rest.join(' ') || 'Invite', phone, isGuest: true },
      })
      : await prisma.customer.create({
        data: {
          companyId: company.id,
          firstName: firstName || 'Client',
          lastName: rest.join(' ') || 'Invite',
          email,
          phone,
          isGuest: true,
          notes: `Inscription portail client via ${body.provider || 'email'}`,
        },
      })
    res.status(201).json({ customerId: customer.id, companyId: company.id })
  } catch {
    res.status(500).json({ message: 'Inscription client indisponible' })
  }
})

router.post('/client-events', async (req, res) => {
  try {
    const event = { ...(req.body || {}), receivedAt: new Date().toISOString() }
    clientEvents.unshift(event)
    clientEvents.splice(100)
    const company = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
    const payload = (event.payload || {}) as any
    const profile = (event.profile || {}) as any
    if (company && event.type === 'review' && Number(payload.rating) > 0) {
      const customer = profile.email
        ? await prisma.customer.findFirst({ where: { companyId: company.id, email: String(profile.email).toLowerCase() } })
        : null
      await prisma.review.create({
        data: {
          companyId: company.id,
          customerId: customer?.id ?? null,
          platform: 'INTERNAL',
          rating: Number(payload.rating),
          comment: typeof payload.comment === 'string' ? payload.comment : null,
        },
      })
    }
    if (company && event.type === 'order' && Array.isArray(payload.items)) {
      const customer = profile.email
        ? await prisma.customer.findFirst({ where: { companyId: company.id, email: String(profile.email).toLowerCase() } })
        : null
      const userCompany = await prisma.userCompany.findFirst({ where: { companyId: company.id, isActive: true } })
      if (userCompany) {
        const requested = payload.items
          .map((item: any) => ({ productId: String(item.id), quantity: Math.max(1, Number(item.qty) || 1) }))
        const products = await prisma.product.findMany({
          where: { companyId: company.id, id: { in: requested.map((item: any) => item.productId) } },
        })
        const productMap = new Map(products.map((product) => [product.id, product]))
        const orderItems = requested
          .filter((item: any) => productMap.has(item.productId))
          .map((item: any) => {
            const product = productMap.get(item.productId)!
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
              taxRate: product.taxRate,
            }
          })
        if (orderItems.length) {
          const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0)
          const taxAmount = orderItems.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity * (item.taxRate / 100), 0)
          const lastOrder = await prisma.order.findFirst({
            where: { companyId: company.id },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          })
          await prisma.order.create({
            data: {
              companyId: company.id,
              userId: userCompany.userId,
              customerId: customer?.id ?? null,
              orderNumber: (lastOrder?.orderNumber ?? 0) + 1,
              notes: `Commande portail client${payload.tableNumber ? ` - table ${payload.tableNumber}` : ''}`,
              subtotal,
              taxAmount,
              total: subtotal + taxAmount,
              items: { create: orderItems },
            },
          })
        }
      }
    }
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ message: 'Evenement client indisponible' })
  }
})

router.get('/client-events', (_req, res) => {
  res.json(clientEvents)
})

router.put('/', (req, res) => {
  const body = (req.body || {}) as Partial<PortalConfig>
  current = { ...current, ...body, updatedAt: Date.now() }
  res.json(current)
})

router.patch('/', (req, res) => {
  const body = (req.body || {}) as Partial<PortalConfig>
  current = { ...current, ...body, updatedAt: Date.now() }
  res.json(current)
})

router.post('/reset', (_req, res) => {
  current = { ...DEFAULT_CONFIG, updatedAt: Date.now() }
  res.json(current)
})

export default router
