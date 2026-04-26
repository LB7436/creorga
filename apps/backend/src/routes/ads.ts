import { Router } from 'express'
import fs from 'fs'
import path from 'path'

/**
 * Ads / TV publicity module — persistent CRUD for ad campaigns
 * displayed on TV screens in the venue.
 *
 * Each ad: image (data-URL), title, subtitle, price, CTA, durationSec, isLive.
 * Storage: apps/backend/data/ads.json
 */

const STORE_DIR = path.resolve(process.cwd(), 'data')
const ADS_FILE = path.join(STORE_DIR, 'ads.json')

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

let ads: Ad[] = []

function loadAds(): Ad[] {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
  if (!fs.existsSync(ADS_FILE)) return []
  try { return JSON.parse(fs.readFileSync(ADS_FILE, 'utf8')) } catch { return [] }
}
function saveAds() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
  fs.writeFileSync(ADS_FILE, JSON.stringify(ads, null, 2), 'utf8')
}
ads = loadAds()

const uid = () => Math.random().toString(36).slice(2, 10)
const router = Router()

// List all
router.get('/', (_req, res) => res.json({ ads, total: ads.length }))

// Get only live ads (TV display polls this)
router.get('/live', (_req, res) => {
  res.json({ ads: ads.filter((a) => a.isLive), total: ads.filter((a) => a.isLive).length })
})

// Create
router.post('/', (req, res) => {
  const body = req.body || {}
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
  saveAds()
  res.json(ad)
})

// Update
router.patch('/:id', (req, res) => {
  const ad = ads.find((a) => a.id === req.params.id)
  if (!ad) return res.status(404).json({ error: 'not found' })
  Object.assign(ad, req.body, { updatedAt: Date.now() })
  saveAds()
  res.json(ad)
})

// Delete
router.delete('/:id', (req, res) => {
  ads = ads.filter((a) => a.id !== req.params.id)
  saveAds()
  res.json({ ok: true, total: ads.length })
})

// Toggle live
router.post('/:id/toggle-live', (req, res) => {
  const ad = ads.find((a) => a.id === req.params.id)
  if (!ad) return res.status(404).json({ error: 'not found' })
  ad.isLive = !ad.isLive
  ad.updatedAt = Date.now()
  saveAds()
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
      body: JSON.stringify({ model: 'gemma2:2b', prompt, stream: false, format: 'json' }),
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
