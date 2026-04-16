import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode, Upload, Link2, Palette, Download, Printer, FileText,
  Image as ImageIcon, Eye, BarChart3, Globe, ShoppingCart,
  Tag, AlertCircle, Check, Sparkles, RefreshCw, Smartphone,
} from 'lucide-react'

/* ───────────────────────── Mock QR Generator ─────────────────────────
   Deterministic 25×25 grid based on a seed string. Not a real QR code,
   but visually indistinguishable at a glance.
*/
function seededPattern(seed: string, size = 25): boolean[][] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const grid: boolean[][] = []
  for (let y = 0; y < size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < size; x++) {
      h = (h * 1103515245 + 12345) >>> 0
      row.push(((h >>> 16) & 1) === 1)
    }
    grid.push(row)
  }
  // Force finder patterns (corners) for realism
  const drawFinder = (gx: number, gy: number) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const onEdge = dx === 0 || dy === 0 || dx === 6 || dy === 6
        const onCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
        grid[gy + dy][gx + dx] = onEdge || onCore
        if (dx === 1 || dy === 1 || dx === 5 || dy === 5) {
          grid[gy + dy][gx + dx] = false
        }
        if (onEdge || onCore) grid[gy + dy][gx + dx] = true
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(size - 7, 0)
  drawFinder(0, size - 7)
  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }
  return grid
}

function QrSvg({
  seed, size, fg, bg = '#ffffff', radius = 0,
}: { seed: string; size: number; fg: string; bg?: string; radius?: number }) {
  const grid = useMemo(() => seededPattern(seed, 25), [seed])
  const cell = size / 25
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', borderRadius: radius }}>
      <rect width={size} height={size} fill={bg} />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill={fg}
              rx={cell * 0.15}
            />
          ) : null
        )
      )}
    </svg>
  )
}

/* ───────────────────────── Menu Mock Data ──────────────────────── */
const MENU_CATEGORIES = [
  { id: 'entrees', label: 'Entrées', emoji: '🥗' },
  { id: 'plats', label: 'Plats', emoji: '🍽️' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'boissons', label: 'Boissons', emoji: '🥂' },
]

const MENU_ITEMS: Record<string, Array<{
  name: string; price: number; emoji: string; allergens: string[]
}>> = {
  entrees: [
    { name: 'Salade du chef', price: 12.5, emoji: '🥗', allergens: ['G', 'L'] },
    { name: 'Tartare de saumon', price: 16.0, emoji: '🐟', allergens: ['P'] },
    { name: 'Burrata fumée', price: 14.0, emoji: '🧀', allergens: ['L'] },
  ],
  plats: [
    { name: 'Entrecôte grillée', price: 28.0, emoji: '🥩', allergens: [] },
    { name: 'Risotto truffé', price: 22.5, emoji: '🍚', allergens: ['L', 'G'] },
    { name: 'Poulet fermier', price: 24.0, emoji: '🍗', allergens: [] },
  ],
  desserts: [
    { name: 'Tiramisu maison', price: 8.5, emoji: '🍰', allergens: ['L', 'O'] },
    { name: 'Tarte au citron', price: 7.5, emoji: '🥧', allergens: ['G', 'O'] },
  ],
  boissons: [
    { name: 'Vin rouge (verre)', price: 6.5, emoji: '🍷', allergens: [] },
    { name: 'Cocktail signature', price: 11.0, emoji: '🍸', allergens: [] },
    { name: 'Café espresso', price: 2.8, emoji: '☕', allergens: [] },
  ],
}

/* ───────────────────────── Presets ──────────────────────── */
const COLOR_SWATCHES = ['#7C3AED', '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444']
const PATTERNS = [
  { id: 'none', label: 'Aucun' },
  { id: 'dots', label: 'Points' },
  { id: 'lines', label: 'Lignes' },
  { id: 'abstract', label: 'Abstrait' },
] as const
type PatternId = typeof PATTERNS[number]['id']

const LANGUAGES = ['FR', 'DE', 'EN', 'PT']

/* ───────────────────────── Main Component ──────────────────────── */
export default function QrMenuPage() {
  // Restaurant config
  const [restaurantName, setRestaurantName] = useState('Café um Rond-Point')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Menu source
  const [posSync, setPosSync] = useState(true)

  // URL
  const [customSlug, setCustomSlug] = useState('cafe-rond-point')

  // Display options
  const [showPrices, setShowPrices] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)
  const [showPhotos, setShowPhotos] = useState(true)
  const [allowOrdering, setAllowOrdering] = useState(false)
  const [multilingual, setMultilingual] = useState(true)

  // Style
  const [accentColor, setAccentColor] = useState('#7C3AED')
  const [pattern, setPattern] = useState<PatternId>('dots')

  // Analytics
  const [tracking, setTracking] = useState(true)

  // QR
  const [qrSize, setQrSize] = useState<'S' | 'M' | 'L'>('M')
  const [activeCategory, setActiveCategory] = useState('entrees')

  const qrPixelSize = qrSize === 'S' ? 100 : qrSize === 'M' ? 200 : 400
  const fullUrl = `${customSlug}.creorga.lu/menu`

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      padding: 32, maxWidth: 1600, margin: '0 auto',
      background: '#f8fafc', minHeight: '100vh',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 20px ${accentColor}33`,
          }}>
            <QrCode size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>
              Générateur QR Menu
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '2px 0 0 0' }}>
              Créez votre carte numérique en quelques clics
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '8px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <BarChart3 size={16} color={accentColor} />
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
            <strong style={{ color: '#0f172a', fontWeight: 700 }}>234</strong> scans ce mois
          </span>
        </div>
      </motion.div>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '55fr 25fr 20fr', gap: 20 }}>
        {/* ── LEFT: Configuration ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Restaurant Info */}
          <Card title="Informations restaurant" icon={<Sparkles size={16} />} color={accentColor}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <Label>Logo</Label>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 88, height: 88, borderRadius: 14,
                    border: `2px dashed ${logoUrl ? 'transparent' : '#cbd5e1'}`,
                    background: logoUrl ? `url(${logoUrl}) center/cover, #fff` : '#f8fafc',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {!logoUrl && <Upload size={22} color="#94a3b8" />}
                </motion.button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Nom du restaurant</Label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '8px 0 0 0' }}>
                  Format PNG ou SVG recommandé. Taille max : 2 Mo.
                </p>
              </div>
            </div>
          </Card>

          {/* Menu source */}
          <Card title="Source du menu" icon={<RefreshCw size={16} />} color={accentColor}>
            <ToggleRow
              label="Synchroniser avec le POS"
              description="Les changements du POS sont reflétés en temps réel"
              checked={posSync}
              onChange={setPosSync}
              color={accentColor}
            />
            <div style={{ height: 1, background: '#e2e8f0', margin: '14px 0' }} />
            <button style={{
              ...inputStyle, display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', justifyContent: 'center', fontWeight: 500,
              color: '#475569', background: '#f8fafc',
            }}>
              <FileText size={16} />
              Importer un PDF à la place
            </button>
          </Card>

          {/* URL */}
          <Card title="URL personnalisée" icon={<Link2 size={16} />} color={accentColor}>
            <Label>Sous-domaine</Label>
            <div style={{
              display: 'flex', alignItems: 'stretch',
              border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
              background: '#fff',
            }}>
              <input
                type="text"
                value={customSlug}
                onChange={e => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  padding: '10px 14px', fontSize: 14, color: '#0f172a',
                  background: 'transparent',
                }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', padding: '0 14px',
                background: '#f1f5f9', fontSize: 13, color: '#64748b', fontWeight: 500,
              }}>
                .creorga.lu/menu
              </div>
            </div>
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: `${accentColor}0d`, borderRadius: 8,
              fontSize: 12, color: accentColor, fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}>
              → {fullUrl}
            </div>
          </Card>

          {/* Display options */}
          <Card title="Options d'affichage" icon={<Eye size={16} />} color={accentColor}>
            <ToggleRow
              label="Afficher les prix"
              description="Les clients voient les prix sur chaque plat"
              icon={<Tag size={14} />}
              checked={showPrices} onChange={setShowPrices} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Afficher les allergènes"
              description="Icônes des allergènes à côté des plats"
              icon={<AlertCircle size={14} />}
              checked={showAllergens} onChange={setShowAllergens} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Afficher les photos"
              description="Images pour chaque plat (recommandé)"
              icon={<ImageIcon size={14} />}
              checked={showPhotos} onChange={setShowPhotos} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Permettre la commande"
              description="Les clients peuvent commander depuis le QR"
              icon={<ShoppingCart size={14} />}
              checked={allowOrdering} onChange={setAllowOrdering} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Multilingue"
              description="FR / DE / EN / PT disponibles pour les clients"
              icon={<Globe size={14} />}
              checked={multilingual} onChange={setMultilingual} color={accentColor}
            />
            {multilingual && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {LANGUAGES.map(lang => (
                  <span key={lang} style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: `${accentColor}1a`, color: accentColor,
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  }}>{lang}</span>
                ))}
              </div>
            )}
          </Card>

          {/* Style */}
          <Card title="Apparence" icon={<Palette size={16} />} color={accentColor}>
            <Label>Couleur d'accent</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              {COLOR_SWATCHES.map(c => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAccentColor(c)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, background: c,
                    border: accentColor === c ? '3px solid #0f172a' : '2px solid #e2e8f0',
                    cursor: 'pointer', transition: 'border .2s',
                  }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                style={{
                  width: 34, height: 34, border: '2px solid #e2e8f0',
                  borderRadius: 10, cursor: 'pointer', padding: 0,
                  background: 'transparent',
                }}
              />
            </div>
            <Label>Motif de fond</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PATTERNS.map(p => (
                <motion.button
                  key={p.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPattern(p.id)}
                  style={{
                    padding: 10, borderRadius: 10, cursor: 'pointer',
                    border: pattern === p.id ? `2px solid ${accentColor}` : '2px solid #e2e8f0',
                    background: pattern === p.id ? `${accentColor}0d` : '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <PatternPreview id={p.id} color={accentColor} />
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: pattern === p.id ? accentColor : '#64748b',
                  }}>
                    {p.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </Card>

          {/* Analytics */}
          <Card title="Analytics" icon={<BarChart3 size={16} />} color={accentColor}>
            <ToggleRow
              label="Activer le tracking"
              description="Suivre le nombre de scans et les plats populaires"
              checked={tracking} onChange={setTracking} color={accentColor}
            />
          </Card>
        </motion.div>

        {/* ── CENTER: QR Code Display ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{
            background: '#fff', borderRadius: 20, padding: 24,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20, height: 'fit-content',
            position: 'sticky', top: 20,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Votre QR Code
            </h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0 0' }}>
              Scannez pour tester
            </p>
          </div>

          {/* QR */}
          <motion.div
            key={`${accentColor}-${qrPixelSize}-${customSlug}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            style={{
              padding: 16, borderRadius: 18,
              background: '#fff',
              border: `3px solid ${accentColor}`,
              boxShadow: `0 12px 40px ${accentColor}33`,
            }}
          >
            <QrSvg
              seed={fullUrl + accentColor}
              size={Math.min(qrPixelSize, 260)}
              fg={accentColor}
            />
          </motion.div>

          {/* Size selector */}
          <div>
            <Label style={{ textAlign: 'center', marginBottom: 8 }}>Taille</Label>
            <div style={{
              display: 'flex', gap: 4, background: '#f1f5f9',
              padding: 4, borderRadius: 10,
            }}>
              {(['S', 'M', 'L'] as const).map(s => (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQrSize(s)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: qrSize === s ? '#fff' : 'transparent',
                    color: qrSize === s ? accentColor : '#64748b',
                    fontSize: 12, fontWeight: 700,
                    boxShadow: qrSize === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {s === 'S' ? 'S · 100px' : s === 'M' ? 'M · 200px' : 'L · 400px'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Download buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {['PNG', 'SVG', 'PDF'].map(fmt => (
                <motion.button
                  key={fmt}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '10px 8px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Download size={13} />
                  {fmt}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 14px', borderRadius: 12,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 6px 16px ${accentColor}4d`,
              }}
            >
              <Printer size={15} />
              Imprimer poster A4
            </motion.button>
          </div>

          {/* Mini stats */}
          <div style={{
            width: '100%', padding: '12px 14px',
            background: `${accentColor}0d`, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>
                Scans ce mois
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                234
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: '#10b98122', color: '#10b981',
              fontSize: 12, fontWeight: 700,
            }}>
              ↑ 18%
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT: Live Menu Preview ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            height: 'fit-content', position: 'sticky', top: 20,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 4px',
          }}>
            <Smartphone size={14} color="#64748b" />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Aperçu en direct
            </span>
          </div>

          {/* Phone mockup */}
          <div style={{
            width: '100%', maxWidth: 240, aspectRatio: '1 / 2',
            background: '#0f172a', borderRadius: 28, padding: 8,
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            margin: '0 auto',
          }}>
            <div style={{
              width: '100%', height: '100%',
              background: '#fff', borderRadius: 22,
              overflow: 'hidden', position: 'relative',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Notch */}
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 60, height: 14,
                background: '#0f172a', borderRadius: '0 0 10px 10px',
                zIndex: 2,
              }} />

              {/* Pattern background layer */}
              <div style={{
                position: 'absolute', inset: 0,
                opacity: 0.4, pointerEvents: 'none',
              }}>
                <PatternBackground id={pattern} color={accentColor} />
              </div>

              {/* Header */}
              <div style={{
                padding: '22px 14px 14px',
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                color: '#fff', position: 'relative', zIndex: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: logoUrl ? `url(${logoUrl}) center/cover` : 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)',
                  }}>
                    {!logoUrl && <Sparkles size={16} color="#fff" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: 700, margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {restaurantName}
                    </p>
                    <p style={{ fontSize: 9, margin: '2px 0 0 0', opacity: 0.85 }}>
                      Menu numérique
                    </p>
                  </div>
                </div>
                {multilingual && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {LANGUAGES.map((l, i) => (
                      <span key={l} style={{
                        fontSize: 8, padding: '2px 6px', borderRadius: 4,
                        background: i === 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                        color: i === 0 ? accentColor : '#fff',
                        fontWeight: 700,
                      }}>{l}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex', gap: 4, padding: '8px 10px',
                borderBottom: '1px solid #f1f5f9', overflowX: 'auto',
                position: 'relative', zIndex: 1, background: '#fff',
              }}>
                {MENU_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    style={{
                      padding: '5px 9px', borderRadius: 6,
                      border: 'none', cursor: 'pointer',
                      background: activeCategory === c.id ? accentColor : '#f8fafc',
                      color: activeCategory === c.id ? '#fff' : '#475569',
                      fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Items */}
              <div style={{
                flex: 1, overflow: 'auto', padding: 10,
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    {MENU_ITEMS[activeCategory]?.map((item, i) => (
                      <div key={i} style={{
                        background: '#fff', borderRadius: 10, padding: 8,
                        border: '1px solid #f1f5f9',
                        display: 'flex', gap: 8, alignItems: 'center',
                      }}>
                        {showPhotos && (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: `${accentColor}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, flexShrink: 0,
                          }}>
                            {item.emoji}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 10, fontWeight: 700, color: '#0f172a',
                            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {showPrices && (
                              <span style={{
                                fontSize: 10, fontWeight: 800, color: accentColor,
                              }}>
                                {item.price.toFixed(2)} €
                              </span>
                            )}
                            {showAllergens && item.allergens.length > 0 && (
                              <div style={{ display: 'flex', gap: 2 }}>
                                {item.allergens.map(a => (
                                  <span key={a} style={{
                                    fontSize: 7, padding: '1px 4px', borderRadius: 3,
                                    background: '#fef3c7', color: '#92400e', fontWeight: 700,
                                  }}>{a}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {allowOrdering && (
                          <button style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: accentColor, color: '#fff',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                          }}>+</button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer bar if ordering */}
              {allowOrdering && (
                <div style={{
                  padding: 8, borderTop: '1px solid #f1f5f9',
                  position: 'relative', zIndex: 1, background: '#fff',
                }}>
                  <button style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    background: accentColor, color: '#fff', border: 'none',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}>
                    Commander (0)
                  </button>
                </div>
              )}
            </div>
          </div>

          <p style={{
            fontSize: 11, color: '#94a3b8', textAlign: 'center',
            margin: '4px 0 0 0',
          }}>
            Mise à jour en temps réel
          </p>
        </motion.div>
      </div>

      {/* ── Bottom: Table Stickers ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: 24,
          background: '#fff', borderRadius: 20, padding: 28,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Stickers pour les tables
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
              Chaque table a son propre QR pour identifier les commandes
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '11px 18px', borderRadius: 12,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 14px ${accentColor}44`,
            }}
          >
            <Download size={15} />
            Télécharger tous les QR tables
          </motion.button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
        }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
            <motion.div
              key={n}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.02 * n }}
              whileHover={{ y: -4, boxShadow: `0 8px 24px ${accentColor}22` }}
              style={{
                padding: 14, borderRadius: 14,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'box-shadow .2s',
              }}
            >
              <div style={{
                padding: 6, borderRadius: 8,
                background: '#fff', border: `2px solid ${accentColor}`,
              }}>
                <QrSvg seed={`${fullUrl}?t=${n}`} size={80} fg={accentColor} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: 11, color: '#94a3b8', margin: 0,
                  textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600,
                }}>
                  Table
                </p>
                <p style={{
                  fontSize: 18, fontWeight: 800, color: '#0f172a',
                  margin: 0, lineHeight: 1.2,
                }}>
                  N°{n}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/* ───────────────────────── Sub-components ─────────────────────── */

function Card({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 20,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${color}15`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: '#64748b',
      margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: 0.6,
      ...style,
    }}>
      {children}
    </p>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e2e8f0', fontSize: 14, color: '#0f172a',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
}

function Divider() {
  return <div style={{ height: 1, background: '#f1f5f9', margin: '12px 0' }} />
}

function ToggleRow({ label, description, icon, checked, onChange, color }: {
  label: string
  description: string
  icon?: React.ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: checked ? `${color}15` : '#f1f5f9',
            color: checked ? color : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 1, transition: 'all .2s',
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>
            {label}
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
          background: checked ? color : '#e2e8f0',
          position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 20, height: 20, borderRadius: 10,
            background: '#fff', position: 'absolute', top: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {checked && <Check size={12} color={color} strokeWidth={3} />}
        </motion.div>
      </motion.button>
    </div>
  )
}

/* ── Pattern previews and backgrounds ──────────────────────────── */
function PatternPreview({ id, color }: { id: PatternId; color: string }) {
  const size = 32
  if (id === 'none') {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: '#fff', border: '1px solid #e2e8f0',
      }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: '#fff', border: '1px solid #e2e8f0',
      overflow: 'hidden', position: 'relative',
    }}>
      <PatternBackground id={id} color={color} />
    </div>
  )
}

function PatternBackground({ id, color }: { id: PatternId; color: string }) {
  if (id === 'none') return null
  if (id === 'dots') {
    return (
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <pattern id={`dots-${color}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={color} opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${color})`} />
      </svg>
    )
  }
  if (id === 'lines') {
    return (
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <pattern id={`lines-${color}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={color} strokeWidth="1" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#lines-${color})`} />
      </svg>
    )
  }
  // abstract
  return (
    <svg width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id={`abs-${color}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="1" opacity="0.25" />
          <circle cx="30" cy="30" r="4" fill={color} opacity="0.2" />
          <path d="M0 20 Q20 0 40 20" fill="none" stroke={color} strokeWidth="1" opacity="0.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#abs-${color})`} />
    </svg>
  )
}
