import { useEffect, useRef, useState } from 'react'
import { Zap } from 'lucide-react'

/**
 * v4.8 — Saisie clavier express POS.
 *
 * Le serveur tape "2 cafe" + Entrée = ajoute 2x le produit "Café" au panier,
 * sans lâcher le clavier. Parser tolérant : quantité optionnelle en tête,
 * fuzzy match (accents/casse ignorés, Levenshtein ≤ 2 sur le 1er mot).
 */

export interface QuickEntryProduct {
  id: string
  name: string
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp: number[] = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) dp[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[b.length]
}

function parseEntry(raw: string): { qty: number; term: string } {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d+)\s+(.+)$/)
  if (match) return { qty: Math.max(1, parseInt(match[1], 10)), term: match[2] }
  return { qty: 1, term: trimmed }
}

function fuzzyMatch(term: string, products: QuickEntryProduct[]): QuickEntryProduct[] {
  const q = normalize(term)
  if (!q) return []
  const firstWord = q.split(/\s+/)[0]
  const scored = products
    .map((p) => {
      const name = normalize(p.name)
      const contains = name.includes(q)
      const dist = levenshtein(name.split(/\s+/)[0], firstWord)
      const score = contains ? -100 : dist
      return { p, score, contains }
    })
    .filter((s) => s.contains || s.score <= 2)
    .sort((a, b) => a.score - b.score)
  return scored.slice(0, 5).map((s) => s.p)
}

export default function QuickEntryBar({
  products,
  onAdd,
}: {
  products: QuickEntryProduct[]
  onAdd: (productId: string, qty: number) => void
}) {
  const [value, setValue] = useState('')
  const [matches, setMatches] = useState<QuickEntryProduct[]>([])
  const [highlight, setHighlight] = useState(0)
  const [errorFlash, setErrorFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const { term } = parseEntry(value)
    setMatches(term ? fuzzyMatch(term, products) : [])
    setHighlight(0)
  }, [value, products])

  const refocus = () => {
    window.setTimeout(() => {
      const active = document.activeElement
      if (active && active !== inputRef.current && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      inputRef.current?.focus()
    }, 100)
  }

  const commit = (product: QuickEntryProduct, qty: number) => {
    onAdd(product.id, qty)
    setValue('')
    setMatches([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      const { qty } = parseEntry(value)
      const chosen = matches[highlight]
      if (chosen) {
        commit(chosen, qty)
      } else if (value.trim()) {
        setErrorFlash(true)
        window.setTimeout(() => setErrorFlash(false), 500)
      }
    }
  }

  return (
    <div style={{ position: 'relative', padding: '10px 20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={16} color="#8b5cf6" />
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={refocus}
          placeholder='Saisie rapide : "2 cafe" + Entrée'
          style={{
            flex: 1, padding: '10px 12px', fontSize: 14, borderRadius: 10,
            border: errorFlash ? '2px solid #ef4444' : '1px solid #e2e8f0',
            outline: 'none', background: '#fff', color: '#0f172a',
            transition: 'border-color 0.2s ease',
          }}
        />
      </div>
      {matches.length > 0 && (
        <div style={{
          position: 'absolute', left: 20, right: 20, top: '100%', zIndex: 30,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {matches.map((m, i) => (
            <button
              key={m.id}
              onClick={() => commit(m, parseEntry(value).qty)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                background: i === highlight ? '#eef2ff' : '#fff', cursor: 'pointer',
                fontSize: 13, color: '#0f172a', fontWeight: i === highlight ? 700 : 500,
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
