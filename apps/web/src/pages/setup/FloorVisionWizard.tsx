import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, Loader2, X, Check, Sparkles, ArrowRight, AlertCircle } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Setup Wizard — Vision IA
 *
 * Upload N photos du restaurant → LLaVA analyse → propose FloorState initial.
 *
 * Flow :
 *   1. Drop / pick up to 8 photos
 *   2. POST /api/agent/analyze-photos
 *   3. Preview proposal (zones, tables, features, surface)
 *   4. Validate → PUT /api/floor-state → redirige vers /pos/floor
 *
 * Modèle requis côté Ollama : llava:7b (≈ 4 GB)
 *   ollama pull llava:7b
 */

interface PhotoEntry {
  file: File
  preview: string  // dataURL
}

interface AnalysisResult {
  summary: {
    photosAnalyzed: number
    totalTables: number
    zones: string[]
    features: string[]
    estimatedSize_m2: number
  }
  perPhoto: any[]
  proposal: {
    zones: { id: string; name: string; color: string }[]
    tables: any[]
  }
}

export default function FloorVisionWizard() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [stage, setStage] = useState<'upload' | 'analyzing' | 'review' | 'saving' | 'done'>('upload')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fileToDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 8 - photos.length)
    const entries: PhotoEntry[] = []
    for (const file of arr) {
      const preview = await fileToDataURL(file)
      entries.push({ file, preview })
    }
    setPhotos((p) => [...p, ...entries])
  }

  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, idx) => idx !== i))

  const analyze = async () => {
    if (photos.length === 0) return
    setStage('analyzing')
    setError(null)
    try {
      const r = await fetch(`${BACKEND}/api/agent/analyze-photos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: photos.map((p) => p.preview) }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setResult(data)
      setStage('review')
    } catch (e: any) {
      setError(`${e?.message || 'erreur'}. Vérifiez qu'Ollama est démarré et que le modèle llava:7b est installé (ollama pull llava:7b).`)
      setStage('upload')
    }
  }

  const validate = async () => {
    if (!result) return
    setStage('saving')
    try {
      const r = await fetch(`${BACKEND}/api/floor-state`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: result.proposal.tables,
          zones:  result.proposal.zones,
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStage('done')
      setTimeout(() => navigate('/pos/floor'), 1500)
    } catch (e: any) {
      setError(`Sauvegarde échouée : ${e?.message || 'inconnue'}`)
      setStage('review')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', padding: 32,
      background: 'linear-gradient(180deg,#0a0a14 0%, #1a0a2e 100%)', color: '#f1f5f9',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            ✨ Setup Wizard · Vision IA
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0,
                       background: 'linear-gradient(135deg,#a78bfa,#ec4899)',
                       WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Photographiez votre restaurant
          </h1>
          <p style={{ marginTop: 8, color: '#94a3b8', fontSize: 14 }}>
            L'IA LLaVA analyse vos photos et génère automatiquement votre plan de salle :
            comptez les tables, détectez le bar, l'escalier, les fenêtres…
          </p>
        </header>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {([
            { id: 'upload',     label: '📸 Photos',   active: stage === 'upload' },
            { id: 'analyzing',  label: '🤖 Analyse', active: stage === 'analyzing' },
            { id: 'review',     label: '✅ Validation', active: stage === 'review' || stage === 'saving' || stage === 'done' },
          ] as const).map((s) => (
            <div key={s.id} style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: s.active ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(236,72,153,0.1))' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.active ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`,
              fontWeight: 700, fontSize: 13, color: s.active ? '#fff' : '#94a3b8', textAlign: 'center',
            }}>{s.label}</div>
          ))}
        </div>

        {/* Upload zone */}
        {stage === 'upload' && (
          <>
            <div
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files) }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              style={{
                padding: 50, textAlign: 'center', borderRadius: 16, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(167,139,250,0.4)',
              }}
            >
              <Upload size={40} style={{ color: '#a78bfa', marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                Glissez 1 à 8 photos ou cliquez pour choisir
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                JPG / PNG · multi-zones (intérieur, bar, terrasse, comptoir, escalier…)
              </div>
            </div>
            <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
              onChange={(e) => e.target.files && addFiles(e.target.files)} />

            {photos.length > 0 && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
                  {photos.map((p, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={p.preview} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => removePhoto(i)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 24, height: 24, borderRadius: '50%', border: 'none',
                          background: 'rgba(15,23,42,0.85)', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><X size={12} /></button>
                    </div>
                  ))}
                </div>

                <button onClick={analyze}
                  style={{
                    marginTop: 18, width: '100%', padding: '14px 20px', borderRadius: 999, border: 'none',
                    background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff',
                    fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  <Sparkles size={16} /> Analyser {photos.length} photo(s) avec LLaVA
                </button>
              </>
            )}

            {error && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: 13 }}>
                <AlertCircle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                {error}
              </div>
            )}
          </>
        )}

        {/* Analyzing */}
        {stage === 'analyzing' && (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Loader2 size={40} className="ai-spin" style={{ color: '#a78bfa' }} />
            <div style={{ marginTop: 16, fontSize: 16, fontWeight: 700 }}>LLaVA analyse vos photos…</div>
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
              ~5 s par photo · {photos.length} photo(s) à traiter
            </div>
            <style>{`@keyframes ai-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} } .ai-spin { animation: ai-spin 1s linear infinite }`}</style>
          </div>
        )}

        {/* Review */}
        {stage === 'review' && result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              <KPI label="Tables détectées" value={result.summary.totalTables} color="#a78bfa" />
              <KPI label="Zones"            value={result.summary.zones.length}  color="#10b981" sub={result.summary.zones.join(' · ')} />
              <KPI label="Surface estimée"   value={`${Math.round(result.summary.estimatedSize_m2)} m²`} color="#f59e0b" />
              <KPI label="Photos analysées"  value={result.summary.photosAnalyzed} color="#3b82f6" />
            </div>

            {result.summary.features.length > 0 && (
              <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Caractéristiques détectées
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {result.summary.features.map((f) => (
                    <span key={f} style={{
                      padding: '4px 10px', borderRadius: 999, background: 'rgba(167,139,250,0.15)',
                      color: '#c4b5fd', fontSize: 12, fontWeight: 600,
                    }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Plan de salle proposé · {result.proposal.tables.length} tables
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                {result.proposal.tables.map((t: any) => (
                  <div key={t.id} style={{
                    padding: 8, borderRadius: 8, background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.3)', textAlign: 'center', fontSize: 11,
                  }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>{t.name}</div>
                    <div style={{ color: '#94a3b8' }}>{t.seats} pl.</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStage('upload'); setResult(null) }}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer',
                }}>
                Recommencer
              </button>
              <button onClick={validate}
                style={{
                  flex: 2, padding: '12px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 800,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Check size={16} /> Valider & créer le plan de salle
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {stage === 'saving' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#a78bfa' }}>
            <Loader2 size={32} className="ai-spin" /> Création du plan de salle…
          </div>
        )}

        {stage === 'done' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 8 }}>Plan de salle créé !</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6 }}>Redirection vers /pos/floor…</div>
          </div>
        )}
      </div>
    </div>
  )
}

function KPI({ label, value, color, sub }: any) {
  return (
    <div style={{ padding: 14, borderRadius: 12,
                  background: `linear-gradient(135deg, ${color}15, rgba(255,255,255,0.02))`,
                  border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 10, color, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
