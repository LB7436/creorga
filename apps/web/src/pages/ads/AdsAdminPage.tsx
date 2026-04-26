import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fileToDataUrl } from '@/stores/brandStore'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface Ad {
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

export default function AdsAdminPage() {
  const navigate = useNavigate()
  const [ads, setAds] = useState<Ad[]>([])
  const [editing, setEditing] = useState<Ad | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)

  const fetchAds = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/ads`)
      const data = await r.json()
      setAds(data.ads || [])
    } catch { /* offline */ }
  }
  useEffect(() => { fetchAds() }, [])

  const save = async (ad: Partial<Ad>) => {
    if (editing) {
      await fetch(`${BACKEND}/api/ads/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
      })
    } else {
      await fetch(`${BACKEND}/api/ads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
      })
    }
    setShowForm(false); setEditing(null); fetchAds()
  }
  const remove = async (id: string) => {
    if (!confirm('Supprimer cette pub ?')) return
    await fetch(`${BACKEND}/api/ads/${id}`, { method: 'DELETE' })
    fetchAds()
  }
  const toggleLive = async (id: string) => {
    await fetch(`${BACKEND}/api/ads/${id}/toggle-live`, { method: 'POST' })
    fetchAds()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' }}>📺 Régie publicitaire TV</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
            Gérez les pubs affichées sur les écrans TV de l'établissement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/ads/tv')} style={btnSecondary}>
            🖥 Ouvrir l'écran TV
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={btnPrimary}>
            + Nouvelle pub
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {ads.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1', padding: 60, textAlign: 'center',
            background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1',
          }}>
            <div style={{ fontSize: 60 }}>📺</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 4px' }}>Aucune publicité créée</h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
              Créez votre première pub pour l'afficher sur les écrans TV.
            </p>
          </div>
        ) : ads.map((ad) => (
          <div key={ad.id} style={{
            background: '#fff', border: ad.isLive ? '2px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: 14, overflow: 'hidden', position: 'relative',
            boxShadow: ad.isLive ? '0 4px 16px rgba(16,185,129,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            {ad.isLive && (
              <div style={{
                position: 'absolute', top: 8, left: 8, zIndex: 5,
                padding: '4px 10px', background: '#ef4444', color: '#fff',
                borderRadius: 999, fontSize: 10, fontWeight: 800,
                animation: 'pulse 2s infinite',
              }}>🔴 EN DIRECT</div>
            )}
            <div style={{
              aspectRatio: '16/9', background: ad.imageDataUrl
                ? `url(${ad.imageDataUrl}) center/cover`
                : ad.bgColor || '#1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16, color: ad.textColor || '#fff', textAlign: 'center',
            }}>
              {!ad.imageDataUrl && (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{ad.title}</div>
                  {ad.subtitle && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{ad.subtitle}</div>}
                </div>
              )}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{ad.title}</div>
              {ad.subtitle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ad.subtitle}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {ad.price !== undefined && <Pill color="#10b981">{ad.price.toFixed(2)} €</Pill>}
                <Pill color="#6366f1">{ad.durationSec}s</Pill>
                {ad.cta && <Pill color="#f59e0b">CTA</Pill>}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                <button onClick={() => toggleLive(ad.id)}
                  style={{ ...miniBtn, background: ad.isLive ? '#10b981' : '#e2e8f0', color: ad.isLive ? '#fff' : '#475569', flex: 1 }}>
                  {ad.isLive ? '🔴 En direct' : '⊝ Hors ligne'}
                </button>
                <button onClick={() => { setEditing(ad); setShowForm(true) }} style={miniBtn}>✏</button>
                <button onClick={() => remove(ad.id)} style={{ ...miniBtn, color: '#ef4444' }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <AdForm
            ad={editing}
            onSave={save}
            onClose={() => { setShowForm(false); setEditing(null) }}
            aiBusy={aiBusy}
            setAiBusy={setAiBusy}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

function AdForm({ ad, onSave, onClose, aiBusy, setAiBusy }: any) {
  const [title, setTitle] = useState(ad?.title || '')
  const [subtitle, setSubtitle] = useState(ad?.subtitle || '')
  const [price, setPrice] = useState(ad?.price || '')
  const [cta, setCta] = useState(ad?.cta || '')
  const [durationSec, setDurationSec] = useState(ad?.durationSec || 8)
  const [bgColor, setBgColor] = useState(ad?.bgColor || '#1e293b')
  const [textColor, setTextColor] = useState(ad?.textColor || '#ffffff')
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(ad?.imageDataUrl)
  const [isLive, setIsLive] = useState(ad?.isLive || false)
  const fileRef = useRef<HTMLInputElement>(null)

  const generateAI = async () => {
    if (!title) { alert('Renseignez un titre / produit pour que l\'IA s\'inspire'); return }
    setAiBusy(true)
    try {
      const r = await fetch(`${BACKEND}/api/ads/ai-generate-text`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: title, price, vibe: subtitle, language: 'fr' }),
      })
      if (r.ok) {
        const data = await r.json()
        setTitle(data.title || title)
        setSubtitle(data.subtitle || subtitle)
        setCta(data.cta || cta)
      }
    } finally { setAiBusy(false) }
  }

  const handleImage = async (f: File) => {
    if (f.size > 3 * 1024 * 1024) { alert('Image > 3 Mo'); return }
    setImageDataUrl(await fileToDataUrl(f))
  }

  return (
    <motion.div onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }}>
      <motion.div onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 720,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
        <header style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{ad ? '✏ Modifier la pub' : '+ Nouvelle pub'}</h2>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer' }}>✕</button>
        </header>

        <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 12 }}>
          <Field label="Titre *" value={title} onChange={setTitle} placeholder="Ex: Plat du jour : entrecôte" />
          <Field label="Sous-titre" value={subtitle} onChange={setSubtitle} placeholder="Ex: Servie avec frites maison & sauce poivre" />

          <button onClick={generateAI} disabled={aiBusy || !title} style={{
            padding: '10px 14px', borderRadius: 10, border: '1px solid #8b5cf6',
            background: 'linear-gradient(135deg, #eef2ff, #faf5ff)',
            color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: aiBusy ? 'wait' : 'pointer',
          }}>
            {aiBusy ? '⏳ IA Gemma travaille…' : '✨ Générer titre/sous-titre/CTA avec l\'IA'}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Prix €" value={price} onChange={(v) => setPrice(v as any)} type="number" />
            <Field label="CTA" value={cta} onChange={setCta} placeholder="Commandez !" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <Label>Durée (s)</Label>
              <input type="number" min={3} max={60} value={durationSec} onChange={(e) => setDurationSec(+e.target.value)} style={input} />
            </div>
            <div>
              <Label>Fond</Label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ ...input, padding: 0, height: 40 }} />
            </div>
            <div>
              <Label>Texte</Label>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ ...input, padding: 0, height: 40 }} />
            </div>
          </div>

          <div>
            <Label>Image (max 3 Mo)</Label>
            <button onClick={() => fileRef.current?.click()} style={{ ...input, textAlign: 'left', cursor: 'pointer' }}>
              {imageDataUrl ? '✓ Image chargée — cliquer pour changer' : '📁 Choisir une image…'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
            {imageDataUrl && (
              <img src={imageDataUrl} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: isLive ? '#ecfdf5' : '#f8fafc', borderRadius: 10, cursor: 'pointer', border: `1px solid ${isLive ? '#10b981' : '#e2e8f0'}` }}>
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
            <span style={{ flex: 1, fontWeight: 700 }}>{isLive ? '🔴 Diffuser maintenant en direct sur la TV' : '⊝ Hors ligne (ne s\'affiche pas)'}</span>
          </label>
        </div>

        <footer style={{ padding: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnSecondary}>Annuler</button>
          <button onClick={() => onSave({ title, subtitle, price: price ? Number(price) : undefined, cta, durationSec, bgColor, textColor, imageDataUrl, isLive })}
            disabled={!title} style={btnPrimary}>
            ✓ {ad ? 'Mettre à jour' : 'Créer la pub'}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, type, placeholder }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={input} />
    </div>
  )
}
const Label = ({ children }: any) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{children}</div>
)
const Pill = ({ children, color }: any) => (
  <span style={{ padding: '2px 8px', borderRadius: 999, background: `${color}20`, color, fontSize: 10, fontWeight: 700 }}>{children}</span>
)
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff',
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13,
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
  background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13,
}
const miniBtn: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
