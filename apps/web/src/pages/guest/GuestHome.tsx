import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Loader2, Check,
  UtensilsCrossed, MessageSquare, X, Megaphone,
  Globe, Gamepad2, MessagesSquare,
} from 'lucide-react'
import GamesSection from './GamesSection'
import ChatSection from './ChatSection'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

// ─── Types ─────────────────────────────────────────────

interface Announcement {
  id: string
  message: string
}

export const ACCENT = '#a855f7'
export const ACCENT2 = '#06b6d4'
export const BG = '#05050f'
export const SURFACE = '#0e0d20'
export const SURFACE2 = '#16153a'
export const BORDER = 'rgba(168,85,247,0.18)'
export const TEXT = '#f8fafc'
export const MUTED = '#94a3b8'

// ─── Announcements ──────────────────────────────────────

function AnnouncementsBanner({ items }: { items: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = items.filter((a) => !dismissed.has(a.id))
  if (!visible.length) return null
  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border px-3 py-2.5" style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <Megaphone className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <p className="flex-1 text-sm text-amber-200/90">{a.message}</p>
          <button onClick={() => setDismissed((p) => new Set(p).add(a.id))}>
            <X className="h-3.5 w-3.5 text-amber-400/50 hover:text-amber-400" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Language picker ─────────────────────────────────────

const LANGS = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
]

function LangPicker({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-colors"
        style={{ background: SURFACE, borderColor: BORDER, color: MUTED }}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{current.code}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 rounded-xl border overflow-hidden min-w-[140px]" style={{ background: SURFACE, borderColor: BORDER }}>
            {LANGS.map(({ code, flag, name }) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm transition-colors hover:opacity-80"
                style={{
                  background: lang === code ? `rgba(109,40,217,0.15)` : 'transparent',
                  color: lang === code ? ACCENT : TEXT,
                }}
              >
                {flag} {name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────

type Tab = 'jeux' | 'menu' | 'chat' | 'avis'

export default function GuestHome() {
  const company = useAuthStore((s) => s.company)
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('table')

  const [tab, setTab] = useState<Tab>('jeux')
  const [lang, setLang] = useState('fr')
  const [announcements] = useState<Announcement[]>([])

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'jeux', icon: <Gamepad2 className="h-5 w-5" />, label: 'Jeux' },
    { id: 'menu', icon: <UtensilsCrossed className="h-5 w-5" />, label: 'Menu' },
    { id: 'chat', icon: <MessagesSquare className="h-5 w-5" />, label: 'Chat' },
    { id: 'avis', icon: <MessageSquare className="h-5 w-5" />, label: 'Avis' },
  ]

  return (
    <div className="flex min-h-screen flex-col" style={{ background: BG, color: TEXT }}>

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3"
        style={{ background: BG, borderColor: BORDER }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: ACCENT }}>
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>
              {company?.name ?? 'Creorga'}
            </p>
            {tableId && (
              <p className="text-[10px]" style={{ color: MUTED }}>Table {tableId}</p>
            )}
          </div>
        </div>
        <LangPicker lang={lang} setLang={setLang} />
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <AnnouncementsBanner items={announcements} />

        {/* JEUX */}
        {tab === 'jeux' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GamesSection />
          </motion.div>
        )}

        {/* MENU */}
        {tab === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GuestMenu />
          </motion.div>
        )}

        {/* CHAT */}
        {tab === 'chat' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ChatSection />
          </motion.div>
        )}

        {/* AVIS */}
        {tab === 'avis' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GuestFeedback onBack={() => setTab('jeux')} />
          </motion.div>
        )}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t"
        style={{ background: BG, borderColor: BORDER }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors"
            style={{ color: tab === t.id ? ACCENT : MUTED }}
          >
            {t.icon}
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="fixed bottom-16 left-0 right-0 text-center">
        <p className="text-[9px]" style={{ color: 'rgba(139,127,192,0.3)' }}>Creorga v1.0</p>
      </div>
    </div>
  )
}

// ─── Inline sub-views ────────────────────────────────────

function GuestMenu() {
  const companyId = useAuthStore((s) => s.companyId)
  const [categories, setCategories] = useState<{ id: string; name: string; icon?: string; products: { id: string; name: string; price: number; description?: string }[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      // Demo menu for guests without a company session
      const demo = [
        { id: 'boissons', name: '🍹 Boissons', products: [
          { id: 'b1', name: 'Eau minérale', price: 2.50 },
          { id: 'b2', name: 'Coca-Cola', price: 3.00 },
          { id: 'b3', name: 'Jus d\'orange', price: 3.50 },
          { id: 'b4', name: 'Bière pression', price: 4.00 },
        ]},
        { id: 'snacks', name: '🍟 Snacks', products: [
          { id: 's1', name: 'Chips maison', price: 4.50 },
          { id: 's2', name: 'Nachos & guacamole', price: 6.00 },
          { id: 's3', name: 'Mini sandwichs (×3)', price: 7.50 },
        ]},
        { id: 'desserts', name: '🍰 Desserts', products: [
          { id: 'd1', name: 'Brownie chocolat', price: 4.00 },
          { id: 'd2', name: 'Glace 2 boules', price: 5.00 },
        ]},
      ]
      setCategories(demo)
      setActiveCategory('boissons')
      setLoading(false)
      return
    }
    const headers = { 'x-company-id': companyId }
    Promise.all([
      api.get('/categories', { headers }).then((r) => r.data),
      api.get('/products', { headers }).then((r) => r.data),
    ]).then(([cats, prods]) => {
      const enriched = cats.map((c: any) => ({
        ...c,
        products: prods.filter((p: any) => p.categoryId === c.id && p.isActive),
      }))
      setCategories(enriched)
      if (enriched.length) setActiveCategory(enriched[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [companyId])

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
    </div>
  )

  const active = categories.find((c) => c.id === activeCategory)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium transition-all"
            style={
              activeCategory === cat.id
                ? { background: ACCENT, color: '#fff' }
                : { background: SURFACE, color: MUTED, border: `1px solid ${BORDER}` }
            }
          >
            {cat.icon && <span className="mr-1">{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {(active?.products ?? []).map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border p-3.5"
            style={{ background: SURFACE, borderColor: BORDER }}
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium" style={{ color: TEXT }}>{p.name}</p>
              {p.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: MUTED }}>{p.description}</p>}
            </div>
            <p className="font-bold text-sm shrink-0" style={{ color: ACCENT }}>
              {(p.price).toFixed(2)} €
            </p>
          </div>
        ))}
        {!active?.products?.length && (
          <p className="text-center py-8 text-sm" style={{ color: MUTED }}>Aucun article dans cette catégorie.</p>
        )}
      </div>
    </div>
  )
}

const FEEDBACK_CATS = [
  { value: 'ambiance', label: 'Ambiance', emoji: '🎭' },
  { value: 'service', label: 'Service', emoji: '🍽️' },
  { value: 'jeux', label: 'Jeux', emoji: '🎮' },
  { value: 'general', label: 'Général', emoji: '💬' },
]

function GuestFeedback({ onBack }: { onBack: () => void }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [category, setCategory] = useState('')
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async () => {
    if (!rating || !category) return
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, comment: comment.trim() || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur') }
      setState('success')
    } catch (err: unknown) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  if (state === 'success') return (
    <div className="flex flex-col items-center py-16 gap-5">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(109,40,217,0.15)', border: '1px solid rgba(109,40,217,0.3)' }}>
        <Check className="h-8 w-8" style={{ color: ACCENT }} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold" style={{ color: TEXT }}>Merci beaucoup !</h3>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Votre avis nous aide à nous améliorer.</p>
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: rating }).map((_, i) => (
            <span key={i} className="text-amber-400 text-xl">★</span>
          ))}
        </div>
      </div>
      <button onClick={onBack} className="rounded-xl px-5 py-2 text-sm font-medium" style={{ background: SURFACE, color: TEXT, border: `1px solid ${BORDER}` }}>
        Retour
      </button>
    </div>
  )

  const display = hovered || rating

  return (
    <div className="space-y-5 max-w-md mx-auto pb-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: MUTED }}>←</button>
        <h2 className="text-base font-semibold" style={{ color: TEXT }}>Donnez votre avis</h2>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: TEXT }}>Comment évaluez-vous votre expérience ?</label>
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
              className="p-1 transition-transform hover:scale-110 active:scale-95">
              <span className={`text-4xl ${s <= display ? 'text-amber-400' : 'text-zinc-700'}`}>★</span>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-center text-xs" style={{ color: MUTED }}>
            {['', 'Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Excellent !'][rating]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: TEXT }}>Catégorie</label>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_CATS.map((cat) => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className="flex items-center gap-2.5 rounded-xl border p-3 text-sm transition-all"
              style={category === cat.value
                ? { background: 'rgba(109,40,217,0.15)', borderColor: 'rgba(109,40,217,0.4)', color: ACCENT }
                : { background: SURFACE, borderColor: BORDER, color: MUTED }}>
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: TEXT }}>
          Commentaire <span style={{ color: MUTED }}>(optionnel)</span>
        </label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience…" rows={4} maxLength={1000}
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none transition-colors"
          style={{ background: SURFACE, borderColor: BORDER, color: TEXT }} />
        {comment.length > 0 && <p className="text-right text-[10px]" style={{ color: MUTED }}>{comment.length}/1000</p>}
      </div>

      {state === 'error' && errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400">{errorMsg}</div>
      )}

      <button onClick={submit} disabled={!rating || !category || state === 'submitting'}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: ACCENT, color: '#fff' }}>
        {state === 'submitting'
          ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          : 'Envoyer mon avis'}
      </button>
    </div>
  )
}
