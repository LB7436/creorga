import { Router } from 'express'
import fs from 'fs'
import path from 'path'

/**
 * Ads / TV publicity module — persistent CRUD for ad campaigns
 * displayed on TV screens in the venue.
 *
 * Each ad: image (data-URL), title, subtitle, price, CTA, durationSec, isLive.
 * Storage: data/companies/<companyId>/ads.json
 */

const STORE_DIR = path.resolve(process.cwd(), 'data', 'companies')

export interface Ad {
  id: string
  imageDataUrl?: string
  title: string
  subtitle?: string
  price?: number
  currency?: string
  cta?: string
  durationSec: number
  isLive: boolean
  audience?: string
  bgColor?: string
  textColor?: string
  createdAt: number
  updatedAt: number
}

function safeCompanyId(value: unknown) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
  return id || null
}

function adsFile(companyId: string) {
  return path.join(STORE_DIR, companyId, 'ads.json')
}

function loadAds(companyId: string): Ad[] {
  const file = adsFile(companyId)
  if (!fs.existsSync(file)) return []
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return [] }
}
function saveAds(companyId: string, ads: Ad[]) {
  const dir = path.dirname(adsFile(companyId))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(adsFile(companyId), JSON.stringify(ads, null, 2), 'utf8')
}

const uid = () => Math.random().toString(36).slice(2, 10)
const router = Router()

// La télévision de salle fonctionne sans session utilisateur. Seule la liste
// des visuels déjà marqués « en direct » est publique ; le CRUD reste protégé.
export const liveAdsPublicRouter = Router()
liveAdsPublicRouter.get('/live', (req, res) => {
  const companyId = safeCompanyId(req.query.companyId)
  if (!companyId) return res.status(400).json({ message: 'companyId requis pour cet écran TV' })
  const ads = loadAds(companyId)
  const live = ads.filter((ad) => ad.isLive)
  res.json({ ads: live, total: live.length })
})

// List all
router.get('/', (req: any, res) => {
  const ads = loadAds(req.companyId)
  res.json({ ads, total: ads.length })
})

// Get only live ads (TV display polls this)
router.get('/live', (req: any, res) => {
  const ads = loadAds(req.companyId)
  res.json({ ads: ads.filter((a) => a.isLive), total: ads.filter((a) => a.isLive).length })
})

// Create
router.post('/', (req: any, res) => {
  const body = req.body || {}
  const ads = loadAds(req.companyId)
  const ad: Ad = {
    id: uid(),
    imageDataUrl: body.imageDataUrl,
    title: body.title || 'Sans titre',
    subtitle: body.subtitle,
    price: body.price,
    currency: body.currency || 'EUR',
    cta: body.cta,
    durationSec: Math.max(3, Math.min(60, Number(body.durationSec) || 8)),
    isLive: !!body.isLive,
    audience: body.audience,
    bgColor: body.bgColor || '#1e293b',
    textColor: body.textColor || '#ffffff',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  ads.push(ad)
  saveAds(req.companyId, ads)
  res.json(ad)
})

// Update
router.patch('/:id', (req: any, res) => {
  const ads = loadAds(req.companyId)
  const ad = ads.find((a) => a.id === req.params.id)
  if (!ad) return res.status(404).json({ error: 'not found' })
  const body = req.body || {}
  if (body.imageDataUrl !== undefined) ad.imageDataUrl = body.imageDataUrl ? String(body.imageDataUrl) : undefined
  if (body.title !== undefined) ad.title = String(body.title).trim().slice(0, 200) || 'Sans titre'
  if (body.subtitle !== undefined) ad.subtitle = body.subtitle ? String(body.subtitle).trim().slice(0, 500) : undefined
  if (body.price !== undefined) ad.price = Number.isFinite(Number(body.price)) ? Number(body.price) : undefined
  if (body.currency !== undefined) ad.currency = String(body.currency).trim().slice(0, 10)
  if (body.cta !== undefined) ad.cta = body.cta ? String(body.cta).trim().slice(0, 120) : undefined
  if (body.durationSec !== undefined) ad.durationSec = Math.max(3, Math.min(60, Number(body.durationSec) || 8))
  if (body.isLive !== undefined) ad.isLive = !!body.isLive
  if (body.audience !== undefined) ad.audience = body.audience ? String(body.audience).trim().slice(0, 120) : undefined
  if (body.bgColor !== undefined) ad.bgColor = String(body.bgColor).slice(0, 30)
  if (body.textColor !== undefined) ad.textColor = String(body.textColor).slice(0, 30)
  ad.updatedAt = Date.now()
  saveAds(req.companyId, ads)
  res.json(ad)
})

// Delete
router.delete('/:id', (req: any, res) => {
  const ads = loadAds(req.companyId)
  const restants = ads.filter((a) => a.id !== req.params.id)
  if (restants.length === ads.length) return res.status(404).json({ error: 'not found' })
  saveAds(req.companyId, restants)
  res.json({ ok: true, total: restants.length })
})

// Toggle live
router.post('/:id/toggle-live', (req: any, res) => {
  const ads = loadAds(req.companyId)
  const ad = ads.find((a) => a.id === req.params.id)
  if (!ad) return res.status(404).json({ error: 'not found' })
  ad.isLive = !ad.isLive
  ad.updatedAt = Date.now()
  saveAds(req.companyId, ads)
  res.json(ad)
})

// AI generation via Ollama Gemma — generates {title, subtitle, cta} from product+price+vibe
router.post('/ai-generate-text', async (req, res) => {
  const { product, price, vibe, language } = req.body || {}
  if (!product) return res.status(400).json({ error: 'product required' })

  const lang = language || 'fr'
  const prompt = `Tu es un copywriter publicitaire HORECA. Génère du texte court et accrocheur en ${lang === 'fr' ? 'français' : lang} pour une publicité TV en restaurant.

Produit : ${product}
${price ? `Prix : ${price} EUR\n` : ''}${vibe ? `Ambiance : ${vibe}\n` : ''}
Réponds UNIQUEMENT avec ce JSON (rien d'autre) :
{
  "title": "titre court ≤ 6 mots, percutant",
  "subtitle": "phrase descriptive courte ≤ 12 mots, met en valeur",
  "cta": "appel à l'action court ≤ 4 mots, ex: 'Commandez maintenant !'"
}

Style : 100% restauration / brasserie / café luxembourgeois — naturel, chaleureux, gourmand.`

  try {
    const r = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma3:4b', prompt, stream: false, format: 'json' }),
    })
    if (!r.ok) return res.status(500).json({ error: 'Ollama unavailable' })
    const data = await r.json() as { response?: string }
    const raw = data.response || ''
    let parsed: any
    try { parsed = JSON.parse(raw) }
    catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Invalid JSON', raw })
      parsed = JSON.parse(m[0])
    }
    res.json({
      title: String(parsed.title || product),
      subtitle: String(parsed.subtitle || ''),
      cta: String(parsed.cta || 'Découvrez'),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
