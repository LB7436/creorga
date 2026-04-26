import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * OCR receipt scanner.
 *
 * Pipeline :
 *   1. Drop / pick a PDF or image
 *   2. Tesseract.js extracts raw text in the browser (FR+EN)
 *   3. Backend Gemma 2B parses → structured JSON {supplier, items[]}
 *   4. User reviews/edits the table
 *   5. POST to /api/inventory/stock/bulk → updates stock
 *
 * 100% local — no cloud OCR / no API key needed.
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface ParsedItem {
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
  items: ParsedItem[]
  subtotal?: number
  vatTotal?: number
  total?: number
  currency?: string
  confidence: number
  warnings?: string[]
}

type Phase = 'idle' | 'ocr' | 'ai' | 'review' | 'done' | 'error'

export default function ReceiptOCR() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<ParsedItem[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPhase('idle'); setProgress(0); setRawText(''); setParsed(null)
    setError(null); setImagePreview(null); setSavedItems(null)
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setProgress(0)
    setRawText('')
    setParsed(null)
    setSavedItems(null)

    if (!file) return
    const isPdf = file.type === 'application/pdf'
    const isImg = file.type.startsWith('image/')
    if (!isPdf && !isImg) {
      setError('Format non supporté — PDF ou image uniquement')
      setPhase('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux — max 10 Mo')
      setPhase('error')
      return
    }

    // Preview (image only — pdf preview omitted for simplicity)
    if (isImg) {
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    // ── Phase 1 : OCR ──
    setPhase('ocr')
    setPhaseLabel('Lecture OCR du document…')
    try {
      // Lazy import — Tesseract est ~12 Mo, on ne le charge qu'au besoin
      const { default: Tesseract } = await import('tesseract.js')
      const result = await Tesseract.recognize(
        file,
        'fra+eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100))
              setPhaseLabel(`Lecture OCR… ${Math.round(m.progress * 100)}%`)
            } else if (m.status) {
              setPhaseLabel(`OCR : ${m.status}`)
            }
          },
        }
      )
      const text = result.data.text || ''
      setRawText(text)

      if (text.trim().length < 20) {
        setError('Texte OCR insuffisant — qualité de l\'image trop basse')
        setPhase('error')
        return
      }

      // ── Phase 2 : AI parsing avec Gemma ──
      setPhase('ai')
      setPhaseLabel('Analyse Gemma 2B en cours…')
      setProgress(0)

      const res = await fetch(`${BACKEND}/api/inventory-ocr/ai-parse-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text }),
      })
      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Gemma erreur (${res.status}) : ${errBody.slice(0, 200)}`)
      }
      const json = await res.json() as ParsedReceipt
      setParsed(json)
      setPhase('review')
      setPhaseLabel('')
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
      setPhase('error')
    }
  }, [])

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    if (!parsed) return
    const next = [...parsed.items]
    next[idx] = { ...next[idx], ...patch }
    setParsed({ ...parsed, items: next })
  }

  const removeItem = (idx: number) => {
    if (!parsed) return
    setParsed({ ...parsed, items: parsed.items.filter((_, i) => i !== idx) })
  }

  const addBlankItem = () => {
    if (!parsed) return
    setParsed({ ...parsed, items: [...parsed.items, { name: '', qty: 1, unit: 'unité', unitPrice: 0, totalPrice: 0, category: 'Divers' }] })
  }

  const confirmAddToStock = async () => {
    if (!parsed) return
    setPhase('ai')
    setPhaseLabel('Ajout au stock…')
    try {
      const res = await fetch(`${BACKEND}/api/inventory-ocr/stock/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed.items, supplier: parsed.supplier }),
      })
      if (!res.ok) throw new Error('Échec ajout stock')
      const data = await res.json()
      setSavedItems(parsed.items)
      setPhase('done')
      setPhaseLabel(`✓ ${data.added.length} article(s) ajoutés — total stock : ${data.totalStockEntries}`)
    } catch (e: any) {
      setError(e.message)
      setPhase('error')
    }
  }

  const total = parsed?.items.reduce((s, i) => s + i.totalPrice, 0) || 0

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
          📸 Scanner reçu fournisseur
        </h1>
        <p style={{ color: '#64748b', margin: '4px 0 0' }}>
          OCR navigateur + Gemma 2B local — extraction et ajout au stock en 1 minute.
        </p>
      </header>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'upload', label: '1. Upload',   active: phase === 'idle' || phase === 'error' },
          { id: 'ocr',    label: '2. OCR',      active: phase === 'ocr' },
          { id: 'ai',     label: '3. IA Gemma', active: phase === 'ai' },
          { id: 'review', label: '4. Vérifier', active: phase === 'review' },
          { id: 'done',   label: '5. Stock OK', active: phase === 'done' },
        ].map((s, i) => (
          <div key={s.id} style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            background: s.active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9',
            color: s.active ? '#fff' : '#64748b',
            fontSize: 12, fontWeight: 700, textAlign: 'center',
            transition: 'all .2s',
          }}>{s.label}</div>
        ))}
      </div>

      {/* IDLE / DROP ZONE */}
      {phase === 'idle' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '3px dashed #cbd5e1', borderRadius: 18, padding: 60,
            textAlign: 'center', cursor: 'pointer',
            background: 'linear-gradient(135deg,#fafbff,#f1f5f9)',
            transition: 'all .2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'linear-gradient(135deg,#fafbff,#f1f5f9)' }}
        >
          <div style={{ fontSize: 56 }}>📄</div>
          <h3 style={{ margin: '12px 0 4px', fontSize: 20, fontWeight: 800 }}>
            Glissez votre reçu ici ou cliquez pour parcourir
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            PDF · JPG · PNG · WebP — max 10 Mo
          </p>
          <div style={{
            marginTop: 16, display: 'inline-flex', gap: 8, padding: '6px 14px',
            background: '#eef2ff', borderRadius: 999, fontSize: 12, color: '#4338ca', fontWeight: 700,
          }}>
            🔒 100 % local · 🤖 Gemma 2B · 🇱🇺 TVA Lux auto
          </div>
          <input ref={inputRef} type="file" accept="image/*,application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            style={{ display: 'none' }} />
        </div>
      )}

      {/* PROCESSING */}
      {(phase === 'ocr' || phase === 'ai') && (
        <div style={{
          padding: 40, textAlign: 'center', background: '#fff',
          border: '1px solid #e2e8f0', borderRadius: 16,
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 48, display: 'inline-block' }}
          >
            {phase === 'ocr' ? '👁' : '🤖'}
          </motion.div>
          <h3 style={{ margin: '12px 0 6px', fontSize: 18 }}>{phaseLabel}</h3>
          {progress > 0 && (
            <div style={{ marginTop: 16, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', maxWidth: 320, margin: '12px auto' }}>
              <motion.div
                animate={{ width: `${progress}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
              />
            </div>
          )}
          {phase === 'ocr' && (
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>
              Premier lancement : ~10-30 s pour télécharger le moteur OCR (12 Mo, en cache ensuite).
            </p>
          )}
          {phase === 'ai' && (
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 14 }}>
              Gemma 2B analyse les lignes du reçu et structure les données.
            </p>
          )}
        </div>
      )}

      {/* REVIEW */}
      {phase === 'review' && parsed && (
        <div style={{ display: 'grid', gridTemplateColumns: imagePreview ? '1fr 1.5fr' : '1fr', gap: 16 }}>
          {/* Preview */}
          {imagePreview && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 8 }}>
                APERÇU DOCUMENT
              </div>
              <img src={imagePreview} alt="Reçu" style={{ width: '100%', borderRadius: 8, maxHeight: 600, objectFit: 'contain' }} />
              <details style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>📝 Texte OCR brut</summary>
                <pre style={{ marginTop: 6, padding: 8, background: '#f8fafc', borderRadius: 6, overflow: 'auto', maxHeight: 200, fontSize: 10 }}>
                  {rawText}
                </pre>
              </details>
            </div>
          )}

          {/* Parsed table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
            {/* Header info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
              <Field label="Fournisseur" value={parsed.supplier || ''} onChange={(v) => setParsed({ ...parsed, supplier: v })} />
              <Field label="N° facture" value={parsed.invoiceNumber || ''} onChange={(v) => setParsed({ ...parsed, invoiceNumber: v })} />
              <Field label="Date" value={parsed.date || ''} onChange={(v) => setParsed({ ...parsed, date: v })} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>CONFIANCE IA</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: parsed.confidence > 0.7 ? '#10b981' : '#f59e0b' }}>
                  {(parsed.confidence * 100).toFixed(0)} %
                </div>
              </div>
            </div>

            {/* Warnings */}
            {parsed.warnings && parsed.warnings.length > 0 && (
              <div style={{ padding: 10, background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                ⚠ {parsed.warnings.join(' · ')}
              </div>
            )}

            {/* Items */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>ARTICLES ({parsed.items.length})</span>
              <button onClick={addBlankItem} style={miniBtn}>+ Ligne</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <Th>Nom</Th><Th>Qté</Th><Th>Unité</Th><Th>PU €</Th><Th>Total €</Th><Th>TVA</Th><Th>Cat.</Th><Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}><input value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} style={tableInput} /></td>
                      <td style={td}><input type="number" min={0} value={item.qty} onChange={(e) => updateItem(idx, { qty: +e.target.value })} style={{ ...tableInput, width: 60 }} /></td>
                      <td style={td}>
                        <select value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} style={{ ...tableInput, width: 80 }}>
                          {['unité', 'kg', 'g', 'L', 'cl', 'bouteille', 'carton', 'pack', 'pièce'].map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={td}><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: +e.target.value })} style={{ ...tableInput, width: 80 }} /></td>
                      <td style={td}><input type="number" step="0.01" value={item.totalPrice} onChange={(e) => updateItem(idx, { totalPrice: +e.target.value })} style={{ ...tableInput, width: 80 }} /></td>
                      <td style={td}>
                        <select value={item.vatRate || 17} onChange={(e) => updateItem(idx, { vatRate: +e.target.value })} style={{ ...tableInput, width: 60 }}>
                          {[3, 8, 14, 17].map((v) => <option key={v} value={v}>{v}%</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <select value={item.category || 'Divers'} onChange={(e) => updateItem(idx, { category: e.target.value })} style={{ ...tableInput, width: 110 }}>
                          {['Boissons', 'Viandes', 'Légumes', 'Épicerie', 'Surgelés', 'Hygiène', 'Divers'].map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <button onClick={() => removeItem(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Total calculé</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{total.toFixed(2)} €</div>
                {parsed.total && Math.abs(parsed.total - total) > 0.5 && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                    ⚠ Différence avec OCR : {parsed.total.toFixed(2)} €
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={reset} style={btnSecondary}>Annuler</button>
                <button onClick={confirmAddToStock} style={btnPrimary}>
                  ✓ Ajouter au stock ({parsed.items.length} articles)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && savedItems && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 40, background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
            border: '2px solid #10b981', borderRadius: 16, textAlign: 'center',
          }}>
          <div style={{ fontSize: 64 }}>✅</div>
          <h2 style={{ margin: '12px 0 4px', fontSize: 24, color: '#065f46' }}>{phaseLabel}</h2>
          <p style={{ color: '#047857', marginTop: 8 }}>
            {savedItems.length} article(s) intégrés. Vous pouvez consulter le stock dans <strong>Inventaire → Stock</strong>.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={reset} style={btnPrimary}>📸 Scanner un autre reçu</button>
            <button onClick={() => navigate('/inventory/stock')} style={btnSecondary}>
              📦 Voir le stock
            </button>
          </div>
        </motion.div>
      )}

      {/* ERROR */}
      <AnimatePresence>
        {phase === 'error' && error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: 16, background: '#fef2f2', border: '1px solid #ef4444', borderRadius: 12, marginTop: 14 }}>
            <strong style={{ color: '#991b1b' }}>❌ Erreur</strong>
            <div style={{ color: '#7f1d1d', marginTop: 4, fontSize: 13 }}>{error}</div>
            <button onClick={reset} style={{ ...btnPrimary, marginTop: 10 }}>Recommencer</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

const Th = ({ children }: any) => <th style={{ padding: '8px 6px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 0.5 }}>{children}</th>
const td: React.CSSProperties = { padding: '6px 4px' }
const tableInput: React.CSSProperties = {
  width: '100%', padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, boxSizing: 'border-box',
}
const miniBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600,
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13,
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff',
  cursor: 'pointer', color: '#475569', fontWeight: 600, fontSize: 13,
}
