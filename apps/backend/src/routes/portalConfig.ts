import { Router } from 'express'

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
  logoDataUrl: null,
  restaurantName: 'Café um Rond-Point',
  updatedAt: Date.now(),
}

let current: PortalConfig = { ...DEFAULT_CONFIG }

const router = Router()

// Public — the guest portal polls this without auth
router.get('/', (_req, res) => {
  res.json(current)
})

// Public PATCH — accepted from admin UI (in dev). In prod add auth.
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
