import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAuth } from '@/lib/fetchAuth'
import {
  Camera, Sparkles, Loader2, ArrowLeft, Check, X, RotateCcw,
  Receipt, Refrigerator, Wrench, MessageSquare, Image as ImageIcon, ChefHat,
} from 'lucide-react'

/**
 * v3.17 — Photo Magique
 *
 * Une seule caméra, l'IA détecte ce que tu photographies et exécute la bonne action :
 *   📋 Reçu fournisseur → OCR + ajout stock
 *   🧊 Frigo / étagère vide → suggestion de commande basée sur historique
 *   🔧 Équipement cassé → incident HACCP créé
 *   ⭐ Avis client (papier ou écran) → ajouté au CRM
 *   🍽 Plat → photo menu / inventaire
 *
 * L'utilisateur ne choisit RIEN. Il prend la photo, Robi décide.
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:image\/\w+;base64,/, ''))
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

interface MagicResult {
  type: 'receipt' | 'fridge' | 'equipment' | 'review' | 'dish' | 'unknown'
  title: string
  summary: string
  emoji: string
  data?: any
  cta?: { label: string; route?: string; action?: string }
}

const STAGE_LABELS: Record<string, string> = {
  idle: 'Prends une photo de n\'importe quoi',
  reading: '🔍 Robi regarde la photo…',
  thinking: '🧠 Robi décide quoi faire…',
  done: '✅ Action proposée',
  error: '❌ Erreur',
}

export default function MobileMagicCam() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'idle' | 'reading' | 'thinking' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<MagicResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setResult(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStage('reading')

    try {
      const b64 = await imageToBase64(file)
      setStage('thinking')

      const r = await fetchAuth(`${getBackend()}/api/agent/photo-magic`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64 }),
        signal: AbortSignal.timeout(180_000),
      })

      if (!r.ok) {
        // Fallback : si endpoint magique pas dispo, on essaie l'OCR receipt classique
        if (r.status === 404) {
          const fb = await fetchAuth(`${getBackend()}/api/inventory-ocr/vision-parse-receipt`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: b64 }),
          })
          if (fb.ok) {
            const data = await fb.json()
            setResult({
              type: 'receipt',
              title: 'Reçu fournisseur détecté',
              summary: `${data.items?.length || 0} articles · ${data.supplier || '?'} · Total ${data.total || 0} €`,
              emoji: '📋',
              data,
              cta: { label: 'Vérifier puis ajouter au stock', route: '/m/camera' },
            })
            setStage('done')
            return
          }
        }
        throw new Error(`Backend ${r.status}`)
      }

      const data = await r.json()
      setResult(data)
      setStage('done')

      // TTS si voice activé
      if (typeof window !== 'undefined' && window.speechSynthesis && localStorage.getItem('creorga.voice') !== '0') {
        const u = new SpeechSynthesisUtterance(`${data.title}. ${data.summary}`)
        u.lang = 'fr-FR'
        window.speechSynthesis.speak(u)
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur')
      setStage('error')
    }
  }

  const reset = () => {
    setStage('idle')
    setResult(null)
    setError(null)
    setPreview(null)
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto' }}>
      <button onClick={() => navigate('/m')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 12, padding: 0,
      }}>
        <ArrowLeft size={14} /> Retour
      </button>

      <div>
        <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={12} /> PHOTO MAGIQUE
        </div>
        <h1 style={{ margin: '4px 0 4px', fontSize: 22, fontWeight: 900, color: '#fff' }}>
          1 photo, Robi fait le reste
        </h1>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Reçu, frigo, équipement, avis client — Robi détecte et propose l'action
        </div>
      </div>

      {/* What it can detect */}
      {stage === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          <Detect emoji="📋" label="Reçu fournisseur" detail="OCR + stock auto" Icon={Receipt} />
          <Detect emoji="🧊" label="Frigo / étagère" detail="Suggère commande" Icon={Refrigerator} />
          <Detect emoji="🔧" label="Équipement cassé" detail="Incident HACCP" Icon={Wrench} />
          <Detect emoji="⭐" label="Avis / Note" detail="Ajout CRM" Icon={MessageSquare} />
          <Detect emoji="🍽" label="Plat / Menu" detail="Photo gallerie" Icon={ChefHat} />
          <Detect emoji="❓" label="Autre" detail="Robi essaie quand même" Icon={ImageIcon} />
        </motion.div>
      )}

      {/* Big action button */}
      {stage === 'idle' && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: 28, borderRadius: 16, cursor: 'pointer', border: 'none',
            background: 'linear-gradient(135deg,#8b5cf6 0%,#ec4899 50%,#f59e0b 100%)',
            color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            boxShadow: '0 10px 30px rgba(139,92,246,0.4)',
          }}>
          <Camera size={48} />
          <div style={{ fontWeight: 900, fontSize: 18 }}>Prendre une photo</div>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Caméra arrière · 1 tap · Robi analyse tout seul</div>
        </motion.button>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* Loading state */}
      {(stage === 'reading' || stage === 'thinking') && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: 30, borderRadius: 16, textAlign: 'center',
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
          }}>
          {preview && (
            <img src={preview} alt="" style={{
              maxHeight: 220, marginBottom: 16, borderRadius: 12, opacity: 0.7,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }} />
          )}
          <Loader2 size={36} className="ai-spin" style={{ color: '#a78bfa' }} />
          <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>
            {STAGE_LABELS[stage]}
          </div>
          <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>
            Vision IA locale · 100% privé
          </div>
          <style>{`@keyframes ai-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.ai-spin{animation:ai-spin 1s linear infinite}`}</style>
        </motion.div>
      )}

      {/* Result */}
      {stage === 'done' && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(139,92,246,0.1))',
            border: '1px solid rgba(16,185,129,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 36 }}>{result.emoji}</div>
              <div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Détecté</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{result.title}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {result.summary}
            </div>
          </div>

          {result.cta && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => result.cta?.route && navigate(result.cta.route)}
              style={{
                padding: 16, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', fontWeight: 800, fontSize: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Check size={16} /> {result.cta.label}
            </motion.button>
          )}

          <button onClick={reset} style={{
            padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <RotateCcw size={14} /> Prendre une autre photo
          </button>
        </motion.div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5', fontSize: 13,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Robi n'a pas pu analyser</div>
          <div style={{ fontSize: 11 }}>{error}</div>
          <button onClick={reset} style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 8, border: 'none',
            background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12,
          }}>Réessayer</button>
        </div>
      )}
    </div>
  )
}

function Detect({ emoji, label, detail, Icon }: { emoji: string; label: string; detail: string; Icon: any }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>{detail}</div>
      </div>
    </div>
  )
}
