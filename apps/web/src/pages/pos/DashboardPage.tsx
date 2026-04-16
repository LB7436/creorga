import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Utensils, ShoppingCart, Euro, TrendingUp, TrendingDown,
  Clock, CheckCircle2, CreditCard, Plus, Sparkles, ChefHat,
  Activity, Flame, Users,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  ANIMATION                                                          */
/* ------------------------------------------------------------------ */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */
const metrics = {
  tablesOccupees: 8,
  tablesTotal: 12,
  commandesEnCours: 14,
  couvertsServis: 87,
  caJour: 2430,
  caHier: 2180,
  commandesJour: 42,
  commandesHier: 38,
  panierMoyen: 57.85,
  panierMoyenHier: 57.37,
  tempsMoyen: 23, // minutes per order
}

const topProducts = [
  { name: 'Entrecôte grillée', emoji: '\ud83e\udd69', qty: 18, revenue: 432, pct: 100 },
  { name: 'Burger maison',     emoji: '\ud83c\udf54', qty: 15, revenue: 278, pct: 70 },
  { name: 'Pizza margherita',  emoji: '\ud83c\udf55', qty: 12, revenue: 168, pct: 55 },
  { name: 'Tiramisu',          emoji: '\ud83c\udf70', qty: 11, revenue: 83,  pct: 48 },
  { name: 'Verre vin rouge',   emoji: '\ud83c\udf77', qty: 28, revenue: 182, pct: 45 },
]

type EventType = 'commande' | 'paiement' | 'cuisine' | 'table_ouverte' | 'table_fermee'
interface LiveEvent {
  id: string
  type: EventType
  text: string
  detail: string
  minutesAgo: number
}

const initialEvents: LiveEvent[] = [
  { id: 'e1',  type: 'paiement',      text: 'Paiement reçu',         detail: 'Table T4 · 128,80 €',              minutesAgo: 1 },
  { id: 'e2',  type: 'commande',      text: 'Nouvelle commande',     detail: 'Table X1 · 3 articles',            minutesAgo: 2 },
  { id: 'e3',  type: 'cuisine',       text: 'Plat envoyé en cuisine', detail: 'Table T1 · Entrecôte',            minutesAgo: 4 },
  { id: 'e4',  type: 'commande',      text: 'Ajout au ticket',       detail: 'Table B1 · 2× Cocktail',           minutesAgo: 5 },
  { id: 'e5',  type: 'table_ouverte', text: 'Table ouverte',         detail: 'Table T5 · 2 couverts',            minutesAgo: 7 },
  { id: 'e6',  type: 'paiement',      text: 'Paiement reçu',         detail: 'Table X3 · 94,50 €',               minutesAgo: 11 },
  { id: 'e7',  type: 'cuisine',       text: 'Plat prêt',             detail: 'Table T4 · 3 plats',               minutesAgo: 13 },
  { id: 'e8',  type: 'table_fermee',  text: 'Table fermée',          detail: 'Table B2 · durée 42 min',          minutesAgo: 16 },
  { id: 'e9',  type: 'commande',      text: 'Nouvelle commande',     detail: 'Table T3 · 5 articles',            minutesAgo: 19 },
  { id: 'e10', type: 'paiement',      text: 'Paiement reçu',         detail: 'Table T2 · 45,00 €',               minutesAgo: 22 },
]

const eventStyles: Record<EventType, { bg: string; color: string; icon: React.ReactNode }> = {
  commande:      { bg: '#dbeafe', color: '#1d4ed8', icon: <Plus size={14} /> },
  paiement:      { bg: '#dcfce7', color: '#15803d', icon: <CreditCard size={14} /> },
  cuisine:       { bg: '#fef3c7', color: '#b45309', icon: <ChefHat size={14} /> },
  table_ouverte: { bg: '#ede9fe', color: '#6d28d9', icon: <Utensils size={14} /> },
  table_fermee:  { bg: '#f1f5f9', color: '#475569', icon: <CheckCircle2 size={14} /> },
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
function fmtEuro(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '\u00a0\u20ac'
}
function fmtEuro2(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0\u20ac'
}
function trendPct(current: number, previous: number) {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100)
}
function fmtAgo(mins: number) {
  if (mins < 1) return 'à l\'instant'
  if (mins === 1) return 'il y a 1 min'
  if (mins < 60) return `il y a ${mins} min`
  const h = Math.floor(mins / 60)
  return `il y a ${h}h`
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function DashboardPage() {
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents)
  const [tick, setTick] = useState(0)

  /* ---- simulate live pulse ---- */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  /* ---- simulate new event every 18s ---- */
  useEffect(() => {
    const id = setInterval(() => {
      const templates: Omit<LiveEvent, 'id' | 'minutesAgo'>[] = [
        { type: 'commande', text: 'Nouvelle commande', detail: `Table T${1 + Math.floor(Math.random() * 6)} · ${2 + Math.floor(Math.random() * 4)} articles` },
        { type: 'paiement', text: 'Paiement reçu',     detail: `Table B${1 + Math.floor(Math.random() * 3)} · ${(20 + Math.random() * 80).toFixed(2)} €` },
        { type: 'cuisine',  text: 'Plat envoyé en cuisine', detail: 'Table T4 · Burger maison' },
      ]
      const t = templates[Math.floor(Math.random() * templates.length)]
      setEvents((prev) => [
        { ...t, id: `e${Date.now()}`, minutesAgo: 0 },
        ...prev.slice(0, 9).map((e) => ({ ...e, minutesAgo: e.minutesAgo + 1 })),
      ])
    }, 18000)
    return () => clearInterval(id)
  }, [])

  const caTrend = useMemo(() => trendPct(metrics.caJour, metrics.caHier), [])
  const cmdTrend = useMemo(() => trendPct(metrics.commandesJour, metrics.commandesHier), [])
  const panierTrend = useMemo(() => trendPct(metrics.panierMoyen, metrics.panierMoyenHier), [])

  const occupationPct = Math.round((metrics.tablesOccupees / metrics.tablesTotal) * 100)

  const card: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* =============== HEADER =============== */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tableau de bord POS</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Temps réel · Aujourd'hui {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 999,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
          fontSize: 12, fontWeight: 700,
        }}>
          <motion.span
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}
          />
          En direct · dernière mise à jour {nowStr}
        </div>
      </motion.div>

      {/* =============== KPI ROW =============== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* Tables occupées */}
        <motion.div variants={fadeUp} style={{
          ...card,
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2c5282 100%)',
          color: '#fff', border: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>Tables occupées</span>
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Utensils size={14} />
            </motion.div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {metrics.tablesOccupees}<span style={{ fontSize: 18, opacity: 0.7 }}> / {metrics.tablesTotal}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${occupationPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: '#fff' }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{occupationPct}\u00a0%</span>
          </div>
        </motion.div>

        {/* Commandes en cours */}
        <KpiCard
          card={card}
          icon={<ShoppingCart size={16} />}
          iconColor="#7c3aed"
          label="Commandes en cours"
          value={metrics.commandesEnCours.toString()}
          sub={<span style={{ color: '#64748b' }}>{metrics.couvertsServis} couverts servis</span>}
        />

        {/* CA du jour */}
        <KpiCard
          card={card}
          icon={<Euro size={16} />}
          iconColor="#059669"
          label="CA du jour"
          value={fmtEuro(metrics.caJour)}
          sub={<Trend pct={caTrend} suffix="vs hier" />}
        />

        {/* Commandes aujourd'hui */}
        <KpiCard
          card={card}
          icon={<Flame size={16} />}
          iconColor="#ea580c"
          label="Commandes aujourd'hui"
          value={metrics.commandesJour.toString()}
          sub={<Trend pct={cmdTrend} suffix="vs hier" />}
        />

        {/* Panier moyen */}
        <KpiCard
          card={card}
          icon={<Sparkles size={16} />}
          iconColor="#d946ef"
          label="Panier moyen"
          value={fmtEuro2(metrics.panierMoyen)}
          sub={<Trend pct={panierTrend} suffix="vs hier" />}
        />

        {/* Temps moyen */}
        <KpiCard
          card={card}
          icon={<Clock size={16} />}
          iconColor="#0891b2"
          label="Temps moyen / cmd"
          value={`${metrics.tempsMoyen} min`}
          sub={<span style={{ color: '#64748b' }}>Objectif 25 min</span>}
        />
      </div>

      {/* =============== COMPARISON + TOP PRODUCTS + EVENTS =============== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16 }}>
        {/* LEFT: comparison card */}
        <motion.div variants={fadeUp} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Activity size={16} color="#1E3A5F" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Aujourd'hui vs hier
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ComparisonBar
              label="Chiffre d'affaires"
              current={metrics.caJour}
              previous={metrics.caHier}
              max={Math.max(metrics.caJour, metrics.caHier)}
              fmt={fmtEuro}
              color="#059669"
            />
            <ComparisonBar
              label="Commandes"
              current={metrics.commandesJour}
              previous={metrics.commandesHier}
              max={Math.max(metrics.commandesJour, metrics.commandesHier)}
              fmt={(v) => v.toString()}
              color="#2563eb"
            />
            <ComparisonBar
              label="Panier moyen"
              current={metrics.panierMoyen}
              previous={metrics.panierMoyenHier}
              max={Math.max(metrics.panierMoyen, metrics.panierMoyenHier)}
              fmt={fmtEuro2}
              color="#d946ef"
            />
          </div>
        </motion.div>

        {/* MIDDLE: top products */}
        <motion.div variants={fadeUp} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Flame size={16} color="#ea580c" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Top 5 produits
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topProducts.map((p, i) => (
              <div key={p.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{p.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1 }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{p.qty}\u00d7</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                    {fmtEuro(p.revenue)}
                  </span>
                </div>
                <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.08 }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, #f59e0b, #ea580c)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT: events feed */}
        <motion.div variants={fadeUp} style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}
            />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Événements en direct</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', maxHeight: 360 }}>
            <AnimatePresence initial={false}>
              {events.slice(0, 10).map((ev) => {
                const st = eventStyles[ev.type]
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, y: -10, backgroundColor: '#fef3c7' }}
                    animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ backgroundColor: { duration: 1.6 } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 10px', borderRadius: 8,
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: st.bg, color: st.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {st.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{ev.text}</div>
                      <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.detail}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {fmtAgo(ev.minutesAgo)}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* =============== QUICK ACTIONS =============== */}
      <motion.div variants={fadeUp} style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Actions rapides
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Raccourcis vers les écrans POS</div>
        </div>
        <QuickLink icon={<Utensils size={14} />} label="Plan de salle" color="#1E3A5F" />
        <QuickLink icon={<ShoppingCart size={14} />} label="Nouvelle commande" color="#2563eb" />
        <QuickLink icon={<ChefHat size={14} />} label="Cuisine KDS" color="#ea580c" />
        <QuickLink icon={<CreditCard size={14} />} label="Caisse" color="#059669" />
        <QuickLink icon={<Users size={14} />} label="Clients" color="#7c3aed" />
      </motion.div>

      <div style={{ height: 12 }} />
      {/* tick is used so eslint doesn't flag unused state */}
      <span style={{ display: 'none' }}>{tick}</span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */
function KpiCard({
  card, icon, iconColor, label, value, sub,
}: {
  card: React.CSSProperties
  icon: React.ReactNode
  iconColor: string
  label: string
  value: string
  sub: React.ReactNode
}) {
  return (
    <motion.div variants={fadeUp} style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</span>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${iconColor}15`, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 12 }}>{sub}</div>
    </motion.div>
  )
}

function Trend({ pct, suffix }: { pct: number; suffix: string }) {
  const up = pct >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontWeight: 600,
      color: up ? '#059669' : '#dc2626',
    }}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}{pct}\u00a0%
      <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>{suffix}</span>
    </span>
  )
}

function ComparisonBar({
  label, current, previous, max, fmt, color,
}: {
  label: string
  current: number
  previous: number
  max: number
  fmt: (v: number) => string
  color: string
}) {
  const pct = trendPct(current, previous)
  const currPct = (current / max) * 100
  const prevPct = (previous / max) * 100
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{label}</span>
        <Trend pct={pct} suffix="" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', width: 44 }}>Aujourd.</span>
        <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', background: color, borderRadius: 5 }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', width: 72, textAlign: 'right' }}>
          {fmt(current)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#cbd5e1', width: 44 }}>Hier</span>
        <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${prevPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            style={{ height: '100%', background: '#cbd5e1', borderRadius: 5 }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'ui-monospace, monospace', width: 72, textAlign: 'right' }}>
          {fmt(previous)}
        </span>
      </div>
    </div>
  )
}

function QuickLink({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 14px', borderRadius: 10,
        background: '#fff', color,
        border: `1px solid ${color}30`,
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {icon} {label}
    </motion.button>
  )
}
