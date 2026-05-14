import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, X, Hash, FileText, Users, Package, BookOpen, Zap, Command } from 'lucide-react'
import { HELP_CONTENT } from '@/lib/help-content'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Universal Cmd+K Search — searches across :
 *   - Modules (35+)
 *   - Help articles (50+)
 *   - Live data : invoices, customers, products (via /api/agent/execute on demand)
 *
 * Keyboard : Cmd/Ctrl+K opens, ↑/↓ navigates, ↵ selects, Esc closes.
 */

interface SearchItem {
  type: 'module' | 'article' | 'invoice' | 'customer' | 'product' | 'command'
  label: string
  sublabel?: string
  icon: any
  action: () => void
  hint?: string
}

const MODULES: { id: string; name: string; emoji: string; route: string }[] = [
  { id: 'pos',        name: 'Caisse POS',        emoji: '💳', route: '/pos' },
  { id: 'crm',        name: 'CRM Clients',       emoji: '👥', route: '/crm/clients' },
  { id: 'invoices',   name: 'Factures & Devis',  emoji: '📋', route: '/invoices/factures' },
  { id: 'inventory',  name: 'Stocks',            emoji: '📦', route: '/inventory/stock' },
  { id: 'hr',         name: 'Planning RH',       emoji: '🗓️', route: '/hr/planning' },
  { id: 'accounting', name: 'Comptabilité',      emoji: '💶', route: '/accounting/depenses' },
  { id: 'reputation', name: 'Avis',              emoji: '⭐', route: '/reputation/avis' },
  { id: 'marketing',  name: 'Marketing',         emoji: '📣', route: '/marketing' },
  { id: 'agenda',     name: 'Réservations',      emoji: '📅', route: '/agenda/calendrier' },
  { id: 'haccp',      name: 'HACCP',             emoji: '🛡️', route: '/haccp/journee' },
  { id: 'ai',         name: 'Assistant IA',      emoji: '🤖', route: '/ai' },
  { id: 'qrmenu',     name: 'QR Menu',           emoji: '📱', route: '/qrmenu' },
  { id: 'ads',        name: 'Pub TV',            emoji: '📺', route: '/ads' },
  { id: 'music',      name: 'Musique',           emoji: '🎵', route: '/music' },
  { id: 'backup',     name: 'Sauvegardes',       emoji: '💾', route: '/backup' },
  { id: 'owner',      name: 'Rapport Patron',    emoji: '👔', route: '/owner' },
  { id: 'settings',   name: 'Paramètres',        emoji: '⚙️', route: '/settings/modules' },
  { id: 'clients',    name: 'Portail Client',    emoji: '📱', route: '/clients' },
]

export default function UniversalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [liveResults, setLiveResults] = useState<SearchItem[]>([])
  const [entityResults, setEntityResults] = useState<SearchItem[]>([])
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setSelectedIdx(0); setLiveResults([]) }
  }, [open])

  // Search live data when query starts with $ (invoice), @ (customer), # (product)
  useEffect(() => {
    if (!query.trim()) { setLiveResults([]); return }
    const prefixes: Record<string, { commandId: string; field: string }> = {
      '$': { commandId: 'inv.find-by-number',  field: 'number' },
      '@': { commandId: 'crm.find-customer',   field: 'query'  },
      '#': { commandId: 'inv.find-product',    field: 'name'   },
    }
    const first = query[0]
    if (prefixes[first]) {
      const rest = query.slice(1).trim()
      if (!rest) return
      const cfg = prefixes[first]
      const t = setTimeout(() => {
        fetch(`${BACKEND}/api/agent/execute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandId: cfg.commandId, input: { [cfg.field]: rest } }),
        })
          .then((r) => r.json())
          .then((data) => {
            const items = (data?.ui?.items || []) as any[]
            setLiveResults(items.map((it) => ({
              type: first === '$' ? 'invoice' : first === '@' ? 'customer' : 'product',
              label: it.label, sublabel: it.value, icon: first === '$' ? FileText : first === '@' ? Users : Package,
              action: () => { if (it.href) { navigate(it.href); setOpen(false) } },
            })))
          })
          .catch(() => setLiveResults([]))
      }, 200)
      return () => clearTimeout(t)
    }
    return undefined
  }, [query, navigate])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || /^[$@#]/.test(q)) {
      setEntityResults([])
      return
    }
    const timeout = window.setTimeout(async () => {
      try {
        const [customers, invoices, shifts] = await Promise.all([
          fetch('/api/crm/customers?limit=3&search=' + encodeURIComponent(q)).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/invoices').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/hr/shifts').then((r) => r.ok ? r.json() : null).catch(() => null),
        ])
        const customerItems = ((customers?.customers || customers || []) as any[]).slice(0, 3).map((c) => ({
          type: 'customer' as const,
          label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Client',
          sublabel: c.email || c.phone || 'Fiche client',
          icon: Users,
          action: () => { navigate(`/crm/clients/${c.id || ''}`); setOpen(false) },
        }))
        const invoiceItems = ((invoices?.invoices || invoices || []) as any[]).slice(0, 3).map((inv) => ({
          type: 'invoice' as const,
          label: `Facture ${inv.number || inv.id}`,
          sublabel: `${inv.customerName || inv.status || ''}`,
          icon: FileText,
          action: () => { navigate(`/invoices/factures/${inv.number || inv.id}`); setOpen(false) },
        }))
        const shiftItems = ((shifts?.shifts || shifts || []) as any[]).slice(0, 2).map((shift) => ({
          type: 'command' as const,
          label: `Shift ${shift.employeeName || shift.userName || shift.id}`,
          sublabel: shift.date || 'Planning RH',
          icon: Zap,
          action: () => { navigate('/hr/planning'); setOpen(false) },
        }))
        setEntityResults([...customerItems, ...invoiceItems, ...shiftItems])
      } catch {
        setEntityResults([])
      }
    }, 260)
    return () => window.clearTimeout(timeout)
  }, [query, navigate])

  const items = useMemo<SearchItem[]>(() => {
    const q = query.toLowerCase().trim()
    const results: SearchItem[] = []

    // If prefix-driven, just live results
    if (/^[$@#]/.test(query)) return liveResults

    results.push(...entityResults)

    // Modules
    for (const m of MODULES) {
      if (!q || m.name.toLowerCase().includes(q) || m.id.includes(q)) {
        results.push({
          type: 'module', label: `${m.emoji} ${m.name}`, sublabel: m.route,
          icon: Hash,
          action: () => { navigate(m.route); setOpen(false) },
        })
      }
    }

    // Help articles
    for (const mod of HELP_CONTENT) {
      for (const a of mod.articles) {
        if (!q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)) {
          results.push({
            type: 'article', label: a.title, sublabel: `${mod.emoji} ${mod.title}`,
            icon: BookOpen,
            action: () => { navigate(`${mod.pathPrefix}?help=${a.id}`); setOpen(false) },
          })
        }
      }
    }

    results.push(
      { type: 'command', label: '🤖 Robi peut verifier les ventes du jour', sublabel: 'Commande IA', icon: Zap, action: () => { navigate('/ai?intent=ventes-du-jour'); setOpen(false) } },
      { type: 'command', label: '🤖 Robi peut relancer les clients inactifs', sublabel: 'CRM + SMS', icon: Users, action: () => { navigate('/crm/fidelite'); setOpen(false) } },
      { type: 'command', label: '🤖 Robi peut detecter les ruptures stock', sublabel: 'Inventaire', icon: Package, action: () => { navigate('/inventory/stock?filter=low'); setOpen(false) } },
    )

    // Truncate
    return results.slice(0, 30)
  }, [query, liveResults, entityResults, navigate])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(items.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(0, i - 1)) }
      else if (e.key === 'Enter') { e.preventDefault(); items[selectedIdx]?.action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, items, selectedIdx])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh',
        }}
      >
        <motion.div
          initial={{ scale: 0.95, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '90%', maxWidth: 640, background: '#fff', borderRadius: 14,
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', maxHeight: '70vh',
          }}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <Search size={18} color="#8b5cf6" />
            <input
              ref={inputRef}
              value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
              placeholder="Rechercher un module, article, $facture, @client, #produit…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1e293b' }}
            />
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          </div>

          {/* Hints */}
          {!query && (
            <div style={{ padding: '12px 18px', display: 'flex', gap: 8, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
              <kbd style={kbdStyle}>$F-2026-0142</kbd> facture
              <kbd style={kbdStyle}>@Bryan</kbd> client
              <kbd style={kbdStyle}>#tomate</kbd> produit
              <kbd style={kbdStyle}>↑↓</kbd> naviguer
              <kbd style={kbdStyle}>↵</kbd> ouvrir
              <kbd style={kbdStyle}>Esc</kbd> fermer
            </div>
          )}

          {/* Results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {items.length === 0 && query && (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Aucun résultat pour "{query}"
              </div>
            )}
            {items.map((it, i) => {
              const Icon = it.icon
              const active = i === selectedIdx
              return (
                <button key={i}
                  onClick={it.action}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: active ? 'linear-gradient(135deg,#ede9fe,#fce7f3)' : 'transparent',
                  }}
                >
                  <Icon size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{it.label}</div>
                    {it.sublabel && <div style={{ fontSize: 11, color: '#64748b' }}>{it.sublabel}</div>}
                  </div>
                  <ArrowRight size={14} color={active ? '#8b5cf6' : '#cbd5e1'} />
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span><Command size={10} style={{ verticalAlign: -1 }} /> + K pour rouvrir</span>
            <span>{items.length} résultat(s)</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const kbdStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: 4,
  background: '#fff', border: '1px solid #e2e8f0',
  fontFamily: 'monospace', fontSize: 10, color: '#475569',
}
