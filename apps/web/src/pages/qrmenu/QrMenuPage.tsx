import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import {
  QrCode, Upload, Link2, Palette, Download, Printer,
  Image as ImageIcon, Eye, Globe, ShoppingCart,
  Tag, AlertCircle, Check, Sparkles, RefreshCw, Smartphone,
} from 'lucide-react'
import { generateQR } from '@/components/QRCodeCanvas'

function QrSvg({
  value, size, fg, bg = '#ffffff', radius = 0,
}: { value: string; size: number; fg: string; bg?: string; radius?: number }) {
  const grid = useMemo(() => generateQR(value), [value])
  const quietZone = 4
  const cell = size / (grid.length + quietZone * 2)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', borderRadius: radius }}>
      <rect width={size} height={size} fill={bg} />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={(x + quietZone) * cell}
              y={(y + quietZone) * cell}
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

type PlatCarte = { name: string; price: number; emoji: string; allergens: string[] }

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
  const companyId = useAuthStore((state) => state.companyId)
  // Restaurant config
  const [restaurantName, setRestaurantName] = useState('Mon établissement')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menuStatus, setMenuStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')

  // Display options
  const [showPrices, setShowPrices] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)
  const [showPhotos, setShowPhotos] = useState(true)
  const [allowOrdering, setAllowOrdering] = useState(false)
  const [previewCartCount, setPreviewCartCount] = useState(0)
  const [multilingual, setMultilingual] = useState(true)

  // Style
  const [accentColor, setAccentColor] = useState('#7C3AED')
  const [pattern, setPattern] = useState<PatternId>('dots')

  // QR
  const [qrSize, setQrSize] = useState<'S' | 'M' | 'L'>('M')
  const [activeCategory, setActiveCategory] = useState('')

  // Carte réelle, chargée depuis la même source que le back-office. Aucun plat
  // de démonstration n'est affiché : l'aperçu doit toujours correspondre à ce
  // que verra réellement le client.
  const [carteReelle, setCarteReelle] = useState<{
    categories: Array<{ id: string; label: string; emoji: string }>
    items: Record<string, PlatCarte[]>
  } | null>(null)

  useEffect(() => {
    let annule = false
    setMenuStatus('loading')
    if (!companyId) {
      setCarteReelle(null)
      setMenuStatus('error')
      return () => { annule = true }
    }
    fetch(`/api/portal-config/menu${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (annule) return
        const cats = (data.categories || []).filter((c: any) => (c.products || []).length > 0)
        if (!cats.length) {
          setCarteReelle({ categories: [], items: {} })
          if (data.restaurantName) setRestaurantName(data.restaurantName)
          setActiveCategory('')
          setMenuStatus('empty')
          return
        }

        const categories = cats.map((c: any) => ({ id: c.id, label: c.name, emoji: '🍽️' }))
        const items: Record<string, PlatCarte[]> = {}
        for (const c of cats) {
          items[c.id] = (c.products || [])
            .filter((p: any) => p.isActive !== false)
            .map((p: any) => ({
              name: p.name,
              price: Number(p.price),
              emoji: '🍽️',
              allergens: [] as string[],
            }))
        }
        setCarteReelle({ categories, items })
        if (data.restaurantName) setRestaurantName(data.restaurantName)
        setActiveCategory(categories[0].id)
        setMenuStatus('ready')
      })
      .catch(() => { if (!annule) setMenuStatus('error') })

    return () => { annule = true }
  }, [companyId])

  const MENU_CATEGORIES = carteReelle?.categories ?? []
  const MENU_ITEMS = carteReelle?.items ?? {}

  const qrPixelSize = qrSize === 'S' ? 100 : qrSize === 'M' ? 200 : 400
  const portalUrl = (table: number) => {
    const origin = typeof window === 'undefined' ? 'https://creorga.n8nautomatisations.org' : window.location.origin
    const url = new URL('/c', origin)
    if (companyId && companyId !== 'fallback-company') url.searchParams.set('companyId', companyId)
    url.searchParams.set('table', String(table))
    return url.toString()
  }
  const fullUrl = portalUrl(1)

  // ── Export du QR et impression du poster ──
  // v4.8 : ces quatre boutons (PNG / SVG / PDF / Imprimer poster A4) n'avaient
  // AUCUN onClick — décoratifs. Tout se fait côté navigateur, sans dépendance :
  // le QR est un SVG, on le sérialise pour le SVG, on le peint sur un canvas
  // pour le PNG, et on imprime un poster HTML pour le PDF (« Enregistrer au
  // format PDF » dans la boîte d'impression du navigateur).
  const qrBoxRef = useRef<HTMLDivElement>(null)

  const svgDuQr = (): string | null => {
    const svg = qrBoxRef.current?.querySelector('svg')
    if (!svg) return null
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    return new XMLSerializer().serializeToString(clone)
  }

  const telecharger = (href: string, nomFichier: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = nomFichier
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const exporterSvg = () => {
    const svg = svgDuQr()
    if (!svg) { alert("QR indisponible pour l'export."); return }
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    telecharger(url, 'qr-menu-table-1.svg')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exporterPng = () => {
    const svg = svgDuQr()
    if (!svg) { alert("QR indisponible pour l'export."); return }
    const cote = qrPixelSize < 400 ? 800 : qrPixelSize // toujours net à l'impression
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = cote; canvas.height = cote
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cote, cote)
      ctx.drawImage(img, 0, 0, cote, cote)
      telecharger(canvas.toDataURL('image/png'), 'qr-menu-table-1.png')
    }
    img.onerror = () => alert('Conversion PNG impossible.')
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  }

  const echapper = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

  // Poster A4 = QR géant + nom + adresse + la vraie carte. Rendu dans une iframe
  // cachée via srcdoc (jamais document.write) ; le navigateur imprime l'iframe,
  // où « Enregistrer au format PDF » est proposé.
  const imprimerPoster = () => {
    const svg = svgDuQr()
    if (!svg) { alert('QR indisponible.'); return }
    const svgUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    const carte = MENU_CATEGORIES.map((c) => {
      const plats = (MENU_ITEMS[c.id] || [])
        .map((p) => `<tr><td>${echapper(p.name)}</td><td class="px">${p.price.toFixed(2)} &euro;</td></tr>`)
        .join('')
      return `<div class="cat"><h3>${echapper(c.emoji + ' ' + c.label)}</h3><table>${plats}</table></div>`
    }).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Poster ${echapper(restaurantName)}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
        body { color: #0f172a; margin: 0; }
        .entete { text-align: center; margin-bottom: 20px; }
        .entete h1 { font-size: 30px; margin: 0 0 4px; color: ${accentColor}; }
        .entete p { font-size: 14px; color: #64748b; margin: 0; }
        .qr { display: block; margin: 10px auto 6px; width: 300px; height: 300px; border: 6px solid ${accentColor}; border-radius: 18px; padding: 10px; }
        .url { text-align: center; font-size: 16px; font-weight: 700; color: ${accentColor}; margin-bottom: 18px; }
        .cat { break-inside: avoid; margin-bottom: 14px; }
        .cat h3 { font-size: 16px; border-bottom: 2px solid ${accentColor}; padding-bottom: 4px; margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        td { font-size: 13px; padding: 3px 0; border-bottom: 1px dotted #e2e8f0; }
        .px { text-align: right; font-weight: 700; white-space: nowrap; }
      </style></head><body>
      <div class="entete"><h1>${echapper(restaurantName)}</h1><p>Scannez pour d&eacute;couvrir notre carte</p></div>
      <img class="qr" src="${svgUrl}" alt="QR menu" />
      <div class="url">${echapper(fullUrl)}</div>
      ${carte}
      </body></html>`

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    iframe.srcdoc = html
    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) return
      win.focus()
      win.print()
      setTimeout(() => iframe.remove(), 1500)
    }
    document.body.appendChild(iframe)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const qrSvgMarkup = (value: string, size = 180) => {
    const matrix = generateQR(value)
    const quietZone = 4
    const total = matrix.length + quietZone * 2
    const modules = matrix.flatMap((row, y) => row.flatMap((on, x) => on
      ? [`<rect x="${x + quietZone}" y="${y + quietZone}" width="1" height="1"/>`]
      : []))
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/><g fill="${accentColor}">${modules.join('')}</g></svg>`
  }

  const imprimerTousLesQr = () => {
    const cartes = Array.from({ length: 12 }, (_, index) => {
      const table = index + 1
      return `<article>${qrSvgMarkup(portalUrl(table), 155)}<strong>TABLE ${table}</strong></article>`
    }).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>QR tables — ${echapper(restaurantName)}</title><style>
      @page{size:A4;margin:10mm}*{box-sizing:border-box;font-family:system-ui,sans-serif}body{margin:0;color:#0f172a}h1{text-align:center;font-size:22px;margin:0 0 10mm}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}article{display:flex;flex-direction:column;align-items:center;gap:3mm;border:1px dashed #94a3b8;border-radius:12px;padding:5mm;break-inside:avoid}strong{font-size:16px;letter-spacing:.08em}</style></head><body><h1>${echapper(restaurantName)} — QR des tables</h1><div class="grid">${cartes}</div></body></html>`
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    iframe.srcdoc = html
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1500)
    }
    document.body.appendChild(iframe)
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
          display: 'flex', alignItems: 'center', gap: 8,
          background: menuStatus === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${menuStatus === 'error' ? '#fecaca' : '#a7f3d0'}`,
          borderRadius: 12, padding: '8px 14px',
        }}>
          <span aria-hidden>{menuStatus === 'loading' ? '◌' : menuStatus === 'error' ? '!' : '✓'}</span>
          <span style={{ fontSize: 13, color: menuStatus === 'error' ? '#b91c1c' : '#047857', fontWeight: 700 }}>
            {menuStatus === 'loading' ? 'Chargement de la carte…' : menuStatus === 'error' ? 'Carte indisponible' : menuStatus === 'empty' ? 'Catalogue vide — aucun faux plat affiché' : 'Carte POS synchronisée'}
          </span>
        </div>
      </motion.div>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
        {/* ── LEFT: Configuration ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Restaurant Info */}
          <Card title="Personnalisation de l’aperçu" icon={<Sparkles size={16} />} color={accentColor}>
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
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Check size={18} color={menuStatus === 'error' ? '#dc2626' : '#16a34a'} />
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
                  {menuStatus === 'error' ? 'Connexion au catalogue impossible' : menuStatus === 'empty' ? 'Catalogue relié, mais vide' : 'Catalogue relié au POS'}
                </p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                  Les catégories, produits et prix publiés dans le catalogue sont ceux affichés dans le portail client. Modifiez-les depuis le module Catalogue.
                </p>
              </div>
            </div>
          </Card>

          {/* URL */}
          <Card title="Adresse du portail" icon={<Link2 size={16} />} color={accentColor}>
            <Label>Lien réellement encodé dans le QR</Label>
            <div style={{
              padding: '10px 12px', overflowWrap: 'anywhere',
              background: `${accentColor}0d`, borderRadius: 8,
              fontSize: 12, color: accentColor, fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}>
              {fullUrl}
            </div>
            <a href={fullUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: 10, color: accentColor, fontSize: 12, fontWeight: 700 }}>
              Ouvrir et tester le portail
            </a>
          </Card>

          {/* Display options */}
          <Card title="Options de l’aperçu et des exports" icon={<Eye size={16} />} color={accentColor}>
            <ToggleRow
              label="Afficher les prix"
              description="Afficher les prix dans l’aperçu et le poster exporté"
              icon={<Tag size={14} />}
              checked={showPrices} onChange={setShowPrices} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Afficher les allergènes"
              description="Afficher les allergènes dans l’aperçu"
              icon={<AlertCircle size={14} />}
              checked={showAllergens} onChange={setShowAllergens} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Afficher les photos"
              description="Afficher les pictogrammes dans l’aperçu"
              icon={<ImageIcon size={14} />}
              checked={showPhotos} onChange={setShowPhotos} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Permettre la commande"
              description="Simuler les boutons de commande dans l’aperçu"
              icon={<ShoppingCart size={14} />}
              checked={allowOrdering} onChange={setAllowOrdering} color={accentColor}
            />
            <Divider />
            <ToggleRow
              label="Multilingue"
              description="Prévisualiser le sélecteur FR / DE / EN / PT"
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
            key={`${accentColor}-${qrPixelSize}-${fullUrl}`}
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
            <div ref={qrBoxRef}>
              <QrSvg
                value={fullUrl}
                size={Math.min(qrPixelSize, 260)}
                fg={accentColor}
              />
            </div>
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
                  onClick={fmt === 'PNG' ? exporterPng : fmt === 'SVG' ? exporterSvg : imprimerPoster}
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
              onClick={imprimerPoster}
            >
              <Printer size={15} />
              Imprimer poster A4
            </motion.button>
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
                          <button aria-label={`Ajouter ${item.name} à l’aperçu du panier`} onClick={() => setPreviewCartCount((count) => count + 1)} style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: accentColor, color: '#fff',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                          }}>+</button>
                        )}
                      </div>
                    ))}
                    {menuStatus === 'loading' && (
                      <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', padding: 24 }}>Chargement du catalogue…</p>
                    )}
                    {menuStatus === 'empty' && (
                      <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', padding: 24 }}>Ajoutez et activez des produits dans le Catalogue pour les voir ici.</p>
                    )}
                    {menuStatus === 'error' && (
                      <p style={{ color: '#b91c1c', fontSize: 11, textAlign: 'center', padding: 24 }}>Impossible de charger le catalogue. Aucun contenu de démonstration n’est affiché.</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer bar if ordering */}
              {allowOrdering && (
                <div style={{
                  padding: 8, borderTop: '1px solid #f1f5f9',
                  position: 'relative', zIndex: 1, background: '#fff',
                }}>
                  <button onClick={() => setPreviewCartCount(0)} disabled={previewCartCount === 0} title="Réinitialiser le panier de prévisualisation" style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    background: accentColor, color: '#fff', border: 'none',
                    fontSize: 10, fontWeight: 700, cursor: previewCartCount === 0 ? 'default' : 'pointer', opacity: previewCartCount === 0 ? .65 : 1,
                  }}>
                    Aperçu panier ({previewCartCount}){previewCartCount > 0 ? ' · Réinitialiser' : ''}
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
            onClick={imprimerTousLesQr}
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
            Imprimer les 12 QR tables
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
                <QrSvg value={portalUrl(n)} size={80} fg={accentColor} />
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
