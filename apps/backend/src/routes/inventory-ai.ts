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

// ─── POST OCR parse with Gemma ──────────────────────────────────────────────
router.post('/ai-parse-receipt', async (req, res) => {
  const { rawText } = req.body as { rawText: string }
  if (!rawText) return res.status(400).json({ error: 'rawText required' })

  const prompt = `Tu es un expert comptable luxembourgeois. Analyse ce reçu fournisseur et extrais les données dans un JSON STRICT.

REÇU OCR :
"""
${rawText.slice(0, 4000)}
"""

Réponds UNIQUEMENT avec ce JSON (rien d'autre, pas de texte autour) :
{
  "supplier": "nom fournisseur (ex: Métro Luxembourg)",
  "invoiceNumber": "numéro facture si présent",
  "date": "YYYY-MM-DD",
  "currency": "EUR",
  "items": [
    {
      "name": "nom produit nettoyé",
      "qty": 12,
      "unit": "kg | L | bouteille | unité | carton",
      "unitPrice": 4.50,
      "totalPrice": 54.00,
      "category": "Boissons | Viandes | Légumes | Épicerie | Divers",
      "vatRate": 17
    }
  ],
  "subtotal": 100.00,
  "vatTotal": 17.00,
  "total": 117.00,
  "confidence": 0.85,
  "warnings": ["Optionnel : alertes si OCR douteux"]
}

Règles strictes :
- Quantités numériques uniquement (12 et non "12x")
- Prix en EUR avec point décimal
- TVA Luxembourg : 3% (alimentation), 8% (restauration), 14%, 17% (standard)
- Si item ambigu, mets confidence < 0.5 et ajoute un warning
- Catégorise selon les standards HORECA luxembourgeois`

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt,
        stream: false,
        format: 'json',
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

    // Sanitise + validate
    parsed.items = (parsed.items || []).map((it: any) => ({
      name: String(it.name || '').trim() || 'Article inconnu',
      qty: Math.max(0, Number(it.qty) || 0),
      unit: String(it.unit || 'unité'),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      totalPrice: Math.max(0, Number(it.totalPrice) || 0),
      category: String(it.category || 'Divers'),
      vatRate: Number(it.vatRate) || 17,
    })).filter((it: any) => it.name && it.qty > 0)

    parsed.confidence = parsed.confidence || 0.7
    parsed.warnings = parsed.warnings || []

    res.json(parsed)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
