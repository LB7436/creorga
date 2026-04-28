import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const STORE_DIR = path.resolve(process.cwd(), 'data')
const STORE_FILE = path.join(STORE_DIR, 'inventory-stock.json')

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })
}

function loadStock(): StockEntry[] {
  ensureStore()
  if (!fs.existsSync(STORE_FILE)) return []
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) } catch { return [] }
}

function saveStock(entries: StockEntry[]) {
  ensureStore()
  fs.writeFileSync(STORE_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

/**
 * Inventory AI helpers — uses Ollama + Gemma 2B to parse OCR'd supplier
 * receipts into structured stock entries.
 *
 * Flow:
 *   1. Frontend OCRs the receipt image/PDF (Tesseract.js)
 *   2. Sends raw text to /api/inventory/ai-parse-receipt
 *   3. Gemma extracts: supplier, date, items[{name, qty, unit, price, total}]
 *   4. Frontend reviews + posts to /api/inventory/bulk to add in stock
 */

interface ParsedReceiptItem {
  name: string
  qty: number
  unit: string
  unitPrice: number
  totalPrice: number
  category?: string
  vatRate?: number
}

interface ParsedReceipt {
  supplier?: string
  invoiceNumber?: string
  date?: string
  items: ParsedReceiptItem[]
  subtotal?: number
  vatTotal?: number
  total?: number
  currency?: string
  confidence: number
  warnings?: string[]
}

const router = Router()

// Disk-persisted stock (data/inventory-stock.json)
interface StockEntry {
  id: string
  name: string
  category: string
  unit: string
  quantity: number
  avgUnitPrice: number
  lastSupplier?: string
  lastUpdated: number
  lowStockThreshold?: number
}
let stock: StockEntry[] = loadStock()
const uid = () => Math.random().toString(36).slice(2, 10)

// ─── GET stock ──────────────────────────────────────────────────────────────
router.get('/stock', (_req, res) => res.json({ stock, total: stock.length }))

// ─── POST bulk add (after OCR review) ──────────────────────────────────────
router.post('/stock/bulk', (req, res) => {
  const { items, supplier } = req.body as { items: ParsedReceiptItem[]; supplier?: string }
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' })

  const added: StockEntry[] = []
  for (const item of items) {
    // Try to find an existing entry (case-insensitive name match)
    const existing = stock.find((s) => s.name.toLowerCase() === item.name.toLowerCase())
    if (existing) {
      // Weighted average price
      const newQty = existing.quantity + item.qty
      existing.avgUnitPrice = (existing.avgUnitPrice * existing.quantity + item.unitPrice * item.qty) / Math.max(1, newQty)
      existing.quantity = newQty
      existing.lastSupplier = supplier
      existing.lastUpdated = Date.now()
      added.push(existing)
    } else {
      const entry: StockEntry = {
        id: uid(),
        name: item.name,
        category: item.category || 'Divers',
        unit: item.unit || 'unité',
        quantity: item.qty,
        avgUnitPrice: item.unitPrice,
        lastSupplier: supplier,
        lastUpdated: Date.now(),
      }
      stock.push(entry)
      added.push(entry)
    }
  }

  saveStock(stock)

  // v3.16 — push real-time vers tous les clients PC (StockPage live update)
  try {
    const broadcast = (globalThis as any).liveBroadcast
    if (broadcast) broadcast('inventory', 'inventory:bulk-added', { added, supplier, total: stock.length })
  } catch { /* ignore */ }

  res.json({ added, totalStockEntries: stock.length })
})

// ─── PATCH a stock entry (manual edit qty, price, etc.) ────────────────────
router.patch('/stock/:id', (req, res) => {
  const entry = stock.find((s) => s.id === req.params.id)
  if (!entry) return res.status(404).json({ error: 'not found' })
  Object.assign(entry, req.body)
  entry.lastUpdated = Date.now()
  saveStock(stock)
  res.json(entry)
})

// ─── DELETE stock entry ─────────────────────────────────────────────────────
router.delete('/stock/:id', (req, res) => {
  stock = stock.filter((s) => s.id !== req.params.id)
  saveStock(stock)
  res.json({ ok: true, total: stock.length })
})

// ─── DELETE all (manual reset by admin) ────────────────────────────────────
router.delete('/stock', (_req, res) => {
  stock = []
  saveStock(stock)
  res.json({ ok: true, total: 0 })
})

// ─── Backups (real disk, not mock) ─────────────────────────────────────────
const BACKUP_DIR = path.join(STORE_DIR, 'backups')
function ensureBackupDir() { if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }) }

router.get('/backups', (_req, res) => {
  ensureBackupDir()
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.bak.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f))
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtimeMs,
        items: (() => {
          try { return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8')).length }
          catch { return 0 }
        })(),
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
  res.json({ backups: files, total: files.length })
})

router.post('/backups', (_req, res) => {
  ensureBackupDir()
  const filename = `inventory-${new Date().toISOString().replace(/[:.]/g, '-')}.bak.json`
  fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(stock, null, 2), 'utf8')
  res.json({ ok: true, filename, items: stock.length })
})

router.post('/restore/:filename', (req, res) => {
  ensureBackupDir()
  const f = path.join(BACKUP_DIR, req.params.filename)
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'backup not found' })
  try {
    const content = JSON.parse(fs.readFileSync(f, 'utf8'))
    if (!Array.isArray(content)) return res.status(400).json({ error: 'invalid backup format' })
    stock = content
    saveStock(stock)
    res.json({ ok: true, restored: stock.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/backups/:filename', (req, res) => {
  ensureBackupDir()
  const f = path.join(BACKUP_DIR, req.params.filename)
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'backup not found' })
  fs.unlinkSync(f)
  res.json({ ok: true })
})

router.get('/backups/:filename/download', (req, res) => {
  const f = path.join(BACKUP_DIR, req.params.filename)
  if (!fs.existsSync(f)) return res.status(404).json({ error: 'backup not found' })
  res.download(f)
})

// ─── Categories Luxembourg HORECA (canonical, no leak in prompt) ────────────
const LU_CATEGORIES = ['Boissons', 'Viandes', 'Poissons', 'Légumes', 'Fruits', 'Pain', 'Épicerie', 'Surgelés', 'Lait/Œufs', 'Vins/Spiritueux', 'Café/Thé', 'Hygiène', 'Divers']
const LU_UNITS = ['kg', 'g', 'L', 'cl', 'bouteille', 'pack', 'carton', 'unité', 'pièce', 'tasse', 'portion']
const LU_VAT_RATES = [0, 3, 8, 14, 17]

// Heuristic category guesser used as fallback when LLM returns junk
function guessCategory(name: string): string {
  const n = name.toLowerCase()
  if (/(café|thé|tea|coffee|cappuc|espresso|moka|chocolat chaud)/.test(n)) return 'Café/Thé'
  if (/(bière|pils|stout|ale|wein|wijn|wine|vin |champagne|whisky|gin|rhum|vodka|cidre|spritz|prosecco|cremant)/.test(n)) return 'Vins/Spiritueux'
  if (/(coca|fanta|orangina|sprite|limonade|jus|eau |perrier|evian|vittel|tonic|schweppes|nestea|smoothie|red bull)/.test(n)) return 'Boissons'
  if (/(boeuf|poulet|porc|veau|agneau|jambon|saucisse|bacon|chorizo|salami|charcut|carpaccio|magret|côte)/.test(n)) return 'Viandes'
  if (/(saumon|thon|cabillaud|hareng|crevette|moule|crabe|huître|sardine|anchois|poisson)/.test(n)) return 'Poissons'
  if (/(salade|tomate|carotte|oignon|poivron|courgette|aubergine|champignon|pomme de terre|patate|concombre|laitue)/.test(n)) return 'Légumes'
  if (/(pomme|banane|orange|fraise|framboise|raisin|citron|melon|ananas|fruit)/.test(n)) return 'Fruits'
  if (/(pain|baguette|brioche|croissant|pâtisserie|tarte|gâteau|cake|cookie|donut)/.test(n)) return 'Pain'
  if (/(yaourt|fromage|beurre|crème|lait|œuf|oeuf|milk|butter|cheese)/.test(n)) return 'Lait/Œufs'
  if (/(soupe|potage|kartoffel|risotto|pâtes|pasta|riz|gnocchi)/.test(n)) return 'Épicerie'
  return 'Divers'
}

// Snap to nearest Luxembourg VAT rate
function normalizeVat(raw: any): number {
  let v = Number(raw)
  if (!Number.isFinite(v) || v < 0) v = 17
  if (v > 0 && v <= 1) v = v * 100   // 0.17 → 17
  // Snap to nearest valid LU rate
  const closest = LU_VAT_RATES.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)
  return Math.abs(closest - v) <= 2 ? closest : 17
}

// ─── POST OCR parse with Gemma (text-only, after Tesseract) ────────────────
router.post('/ai-parse-receipt', async (req, res) => {
  const { rawText, source } = req.body as { rawText: string; source?: string }
  if (!rawText) return res.status(400).json({ error: 'rawText required' })

  // v3.16 fix : prompt sans biais "Métro" + règles strictes anti-hallucination
  const prompt = `Tu extrais des données structurées d'un reçu OCR. RÈGLE ABSOLUE : n'invente AUCUNE donnée. Si une info n'est pas dans le texte, mets null.

TEXTE OCR (peut contenir des erreurs de scan) :
"""
${rawText.slice(0, 5000)}
"""

Renvoie UNIQUEMENT ce JSON, rien d'autre :
{
  "supplier": "<nom fournisseur EXACT lu en haut du reçu, ou null si absent>",
  "invoiceNumber": "<numéro de facture/ticket lu, ou null>",
  "date": "<date format YYYY-MM-DD ou null>",
  "currency": "<code 3 lettres : EUR/USD/CHF/HRK ou EUR par défaut>",
  "items": [
    {
      "name": "<nom EXACT du produit comme imprimé, sans le prix>",
      "qty": <nombre>,
      "unit": "<une seule valeur : kg, g, L, cl, bouteille, pack, carton, unité, pièce, tasse, portion>",
      "unitPrice": <nombre décimal>,
      "totalPrice": <nombre décimal>,
      "category": "<une seule valeur : Boissons, Viandes, Poissons, Légumes, Fruits, Pain, Épicerie, Surgelés, Lait/Œufs, Vins/Spiritueux, Café/Thé, Hygiène, Divers>",
      "vatRate": <entier : 0, 3, 8, 14 ou 17>
    }
  ],
  "subtotal": <nombre>,
  "vatTotal": <nombre>,
  "total": <nombre>,
  "confidence": <0 à 1>,
  "warnings": []
}

INTERDICTIONS :
- N'invente PAS de fournisseur (si pas écrit, mets null, jamais "Métro" ou "fournisseur inconnu")
- N'invente PAS de prix (si OCR illisible, mets null + ajoute warning)
- Ne mets JAMAIS de "|" ou de listes dans les champs (une seule valeur)
- VAT rate doit être un ENTIER (17, pas 0.17)
- Si la quantité n'est pas claire, prends 1
- Le nom doit être SANS le prix (ex: "Cappuccino" pas "Cappuccino 2,50")
- TVA Luxembourg uniquement : 0 (exonéré), 3 (alimentation/livre), 8 (restauration/hôtel), 14 (vin), 17 (standard)`

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, top_p: 0.9 },  // déterministe pour réduire hallucinations
      }),
    })
    if (!ollamaRes.ok) {
      return res.status(500).json({ error: 'Ollama unavailable', details: await ollamaRes.text() })
    }
    const data = await ollamaRes.json() as { response?: string }
    const raw = data.response || ''
    let parsed: ParsedReceipt
    try { parsed = JSON.parse(raw) }
    catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Invalid JSON from AI', raw })
      parsed = JSON.parse(m[0])
    }

    // ─── Post-validation strict ─────────────────────────────────────────
    const warnings: string[] = parsed.warnings || []

    // Supplier : reject hallucinated "Métro" / "fournisseur inconnu" / etc
    if (parsed.supplier) {
      const s = String(parsed.supplier).trim()
      if (/^(unknown|inconnu|fournisseur|n\/a|none|null|undefined)$/i.test(s)) {
        parsed.supplier = undefined
      } else if (/^Métro Luxembourg?$/i.test(s) && !/m[éeè]tro/i.test(rawText)) {
        // Si "Métro" n'est PAS dans le texte source, c'est une hallucination
        parsed.supplier = undefined
        warnings.push('Fournisseur "Métro" rejeté (non trouvé dans le texte OCR)')
      } else {
        parsed.supplier = s
      }
    }

    // Items : nettoyage strict + heuristique catégorie + VAT normalisé
    parsed.items = (parsed.items || []).map((it: any) => {
      let name = String(it.name || '').trim()
      // Strip embedded prices like "Cappuccino 2,50" or "Cappuccino €2,50"
      name = name.replace(/\s*[€$£]?\s*\d+[,.]\d{2}\s*$/, '').trim()
      // Strip leading qty markers like "2x" or "3 ×"
      name = name.replace(/^\d+\s*[xX×]\s*/, '').trim()
      const qty = Math.max(0.01, Number(it.qty) || 1)
      let unit = String(it.unit || 'unité').toLowerCase().trim()
      // If LLM returned "tasse | piece | etc" (pipe-separated leak), pick first
      if (unit.includes('|')) unit = unit.split('|')[0].trim()
      if (!LU_UNITS.includes(unit)) unit = 'unité'
      const unitPrice = Math.max(0, Number(it.unitPrice) || 0)
      const totalPrice = Math.max(0, Number(it.totalPrice) || (unitPrice * qty))
      let category = String(it.category || '').trim()
      if (category.includes('|') || !LU_CATEGORIES.includes(category)) {
        category = guessCategory(name)
      }
      const vatRate = normalizeVat(it.vatRate)
      return { name, qty, unit, unitPrice, totalPrice, category, vatRate }
    }).filter((it: any) => it.name && it.unitPrice > 0)

    // Total recompute & validate
    const computedSubtotal = parsed.items.reduce((s: number, i: any) => s + i.totalPrice, 0)
    if (parsed.total && Math.abs(computedSubtotal - parsed.total) > parsed.total * 0.15) {
      warnings.push(`Total OCR (${parsed.total}) ≠ somme items (${computedSubtotal.toFixed(2)}) — vérifier`)
    }
    if (!parsed.total || parsed.total <= 0) parsed.total = computedSubtotal
    if (!parsed.subtotal) parsed.subtotal = computedSubtotal

    // Confidence floor based on items count
    if (parsed.items.length === 0) {
      parsed.confidence = 0.1
      warnings.push('Aucun article détecté — recadrer la photo')
    } else if (!parsed.confidence) {
      parsed.confidence = 0.7
    }
    parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5))

    parsed.warnings = warnings
    parsed.currency = parsed.currency || 'EUR'
    ;(parsed as any).source = source || 'tesseract+gemma2:2b'

    // ─── Real-time push to PC dashboard via socket.io ──────────────────
    try {
      const broadcast = (globalThis as any).liveBroadcast
      if (broadcast) broadcast('inventory', 'inventory:ocr-parsed', { parsed })
    } catch { /* ignore */ }

    res.json(parsed)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST Vision OCR (image direct via minicpm-v / llava) ──────────────────
router.post('/vision-parse-receipt', async (req, res) => {
  const { imageBase64, model } = req.body as { imageBase64: string; model?: string }
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })

  // Strip data:image/...;base64, prefix if present
  const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  // v3.16 — Direct vision parsing (no Tesseract bottleneck)
  const visionModel = model || 'minicpm-v'
  const prompt = `Tu es un expert OCR pour reçus fournisseur HORECA luxembourgeois. Analyse cette image de reçu/ticket de caisse et extrais TOUTES les données structurées.

INSTRUCTIONS PAS-À-PAS (suivre l'ordre) :
1. Identifie le NOM DE L'ÉTABLISSEMENT en haut du ticket (souvent en gras/grand)
2. Cherche la DATE (formats : JJ/MM/AAAA, JJ.MM.AA, AAAA-MM-JJ — convertis en YYYY-MM-DD)
3. Cherche le NUMÉRO DE FACTURE / TICKET (Rechnung Nr, Facture, Reçu n°, Rn., Ticket)
4. LISTE TOUS LES ARTICLES un par un — chaque ligne avec un prix EST un article
   - Le format est généralement : NOM_ARTICLE QUANTITÉ PRIX_UNITAIRE PRIX_TOTAL
   - Ou : NOM_ARTICLE PRIX (= 1 unité au prix)
   - Ou : QTYx NOM_ARTICLE PRIX
5. Cherche les TOTAUX en bas : Subtotal/Total HT, VAT/MwSt/TVA, Total/Ukupno/Bar/Sum

RÈGLES STRICTES :
- Liste CHAQUE article visible (s'il y a 5 lignes avec prix, retourne 5 items)
- Lis EXACTEMENT ce qui est imprimé — ne traduis PAS (ex: "Cappuccino" reste "Cappuccino", "Pils" reste "Pils")
- N'invente AUCUN supplier (si pas écrit, mets null — JAMAIS "Métro Luxembourg")
- N'invente AUCUN prix (si illisible, mets 0 et ajoute warning)
- Si l'image est tournée 90°, lis quand même (les tickets sont souvent photographiés en paysage)
- Quantité par défaut = 1 si pas indiquée

Renvoie UNIQUEMENT ce JSON :
{
  "supplier": "<nom EXACT lu OU null>",
  "invoiceNumber": "<numéro lu OU null>",
  "date": "<YYYY-MM-DD ou null>",
  "currency": "<code 3 lettres : EUR par défaut, USD si $, HRK pour kuna...>",
  "items": [
    { "name": "<nom EXACT sans le prix>", "qty": <nombre>, "unit": "<unité>", "unitPrice": <nombre>, "totalPrice": <nombre>, "category": "<cat>", "vatRate": <entier> }
  ],
  "subtotal": <nombre>,
  "vatTotal": <nombre>,
  "total": <nombre>,
  "confidence": <0-1>,
  "warnings": []
}

Catégories valides : Boissons, Viandes, Poissons, Légumes, Fruits, Pain, Épicerie, Surgelés, Lait/Œufs, Vins/Spiritueux, Café/Thé, Hygiène, Divers
Unités valides : kg, g, L, cl, bouteille, pack, carton, unité, pièce, tasse, portion
TVA Luxembourg uniquement : 0, 3, 8, 14, 17 (ENTIER, pas 0.17)`

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: visionModel,
        prompt,
        images: [b64],
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    })
    if (!ollamaRes.ok) {
      const err = await ollamaRes.text()
      // Si modèle vision pas installé, retourner code spécial pour fallback côté client
      if (err.includes('not found')) {
        return res.status(503).json({ error: 'vision-model-missing', model: visionModel, details: err })
      }
      return res.status(500).json({ error: 'Ollama vision error', details: err })
    }
    const data = await ollamaRes.json() as { response?: string }
    const raw = data.response || ''
    let parsed: ParsedReceipt
    try { parsed = JSON.parse(raw) }
    catch {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) return res.status(500).json({ error: 'Invalid JSON from vision AI', raw })
      parsed = JSON.parse(m[0])
    }

    // Re-utilise le même post-validation que le path texte
    const warnings: string[] = parsed.warnings || []
    if (parsed.supplier) {
      const s = String(parsed.supplier).trim()
      if (/^(unknown|inconnu|fournisseur|n\/a|none|null|undefined)$/i.test(s)) parsed.supplier = undefined
      else parsed.supplier = s
    }
    parsed.items = (parsed.items || []).map((it: any) => {
      let name = String(it.name || '').trim().replace(/\s*[€$£]?\s*\d+[,.]\d{2}\s*$/, '').replace(/^\d+\s*[xX×]\s*/, '').trim()
      const qty = Math.max(0.01, Number(it.qty) || 1)
      let unit = String(it.unit || 'unité').toLowerCase().trim()
      if (unit.includes('|')) unit = unit.split('|')[0].trim()
      if (!LU_UNITS.includes(unit)) unit = 'unité'
      const unitPrice = Math.max(0, Number(it.unitPrice) || 0)
      const totalPrice = Math.max(0, Number(it.totalPrice) || (unitPrice * qty))
      let category = String(it.category || '').trim()
      if (category.includes('|') || !LU_CATEGORIES.includes(category)) category = guessCategory(name)
      const vatRate = normalizeVat(it.vatRate)
      return { name, qty, unit, unitPrice, totalPrice, category, vatRate }
    }).filter((it: any) => it.name && it.unitPrice > 0)

    // v3.16 fix : coerce string totals to numbers (vision model may return "€,50")
    parsed.total = Number(parsed.total) || 0
    parsed.subtotal = Number(parsed.subtotal) || 0
    parsed.vatTotal = Number(parsed.vatTotal) || 0
    if (parsed.total < 0) parsed.total = 0
    if (parsed.subtotal < 0) parsed.subtotal = 0

    const computedSubtotal = parsed.items.reduce((s: number, i: any) => s + i.totalPrice, 0)
    if (!parsed.total || parsed.total <= 0) parsed.total = computedSubtotal
    if (!parsed.subtotal) parsed.subtotal = computedSubtotal

    // Si vision n'a pas trouvé d'items mais bien le total → warning
    if (parsed.items.length === 0 && parsed.total > 0) {
      warnings.push('Vision OCR : total trouvé mais articles non détectés. Photographier le ticket plus net ou utiliser le fallback Tesseract.')
    }

    parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7))
    parsed.warnings = warnings
    parsed.currency = parsed.currency || 'EUR'
    ;(parsed as any).source = `vision:${visionModel}`

    try {
      const broadcast = (globalThis as any).liveBroadcast
      if (broadcast) broadcast('inventory', 'inventory:ocr-parsed', { parsed })
    } catch { /* ignore */ }

    res.json(parsed)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
