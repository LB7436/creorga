import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, ArrowLeft, Loader2, Check } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Mobile Camera OCR — prend une photo du ticket fournisseur,
 * envoie à Tesseract+Gemma, ajoute au stock.
 *
 * Utilise <input capture="environment"> (caméra arrière)
 * pour shortcut sur Android/iOS.
 */

export default function MobileCamera() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsing' | 'review' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [parsed, setParsed] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStage('reading')

    try {
      const { default: Tesseract } = await import('tesseract.js')
      const { data } = await Tesseract.recognize(file, 'fra')
      const rawText = data.text
      setStage('parsing')

      const r = await fetch(`${BACKEND}/api/inventory-ocr/ai-parse-receipt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })
      if (!r.ok) throw new Error(`Backend ${r.status}`)
      const result = await r.json()
      setParsed(result)
      setStage('review')
    } catch (e: any) {
      setError(e?.message || 'Erreur')
      setStage('error')
    }
  }

  const validate = async () => {
    if (!parsed?.items?.length) return
    try {
      const r = await fetch(`${BACKEND}/api/inventory-ocr/stock/bulk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsed.items, supplier: parsed.supplier }),
      })
      if (r.ok) {
        setStage('done')
        setTimeout(() => navigate('/m'), 1500)
      }
    } catch { setError('Sauvegarde échouée') }
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <button onClick={() => navigate('/m')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer',
        fontSize: 12, padding: 0, alignSelf: 'flex-start',
      }}>
        <ArrowLeft size={14} /> Retour
      </button>

      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📸 OCR Caméra</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Photographiez votre ticket fournisseur → ajout stock automatique
        </div>
      </div>

      {stage === 'idle' && (
        <>
          <button onClick={() => fileRef.current?.click()}
            style={{
              padding: 30, borderRadius: 14, cursor: 'pointer',
              background: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(236,72,153,0.05))',
              border: '2px dashed rgba(167,139,250,0.4)', color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
            <Camera size={48} color="#a78bfa" />
            <div style={{ fontWeight: 800, fontSize: 16 }}>Prendre une photo</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Caméra arrière · 1 tap</div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <button onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(ev:any) => ev.target.files?.[0] && handleFile(ev.target.files[0]); i.click() }}
            style={{
              padding: '12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', cursor: 'pointer', fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Upload size={14} /> Ou choisir depuis la galerie
          </button>
        </>
      )}

      {(stage === 'reading' || stage === 'parsing') && (
        <div style={{ padding: 30, textAlign: 'center', color: '#cbd5e1' }}>
          <Loader2 size={40} className="ai-spin" style={{ color: '#a78bfa' }} />
          <div style={{ marginTop: 10, fontWeight: 700 }}>
            {stage === 'reading' ? 'OCR Tesseract en cours…' : 'Gemma analyse les articles…'}
          </div>
          {preview && <img src={preview} alt="" style={{ maxHeight: 200, marginTop: 14, borderRadius: 8, opacity: 0.6 }} />}
          <style>{`@keyframes ai-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.ai-spin{animation:ai-spin 1s linear infinite}`}</style>
        </div>
      )}

      {stage === 'review' && parsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            padding: 14, borderRadius: 12,
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
            color: '#10b981',
          }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>✓ {parsed.items.length} article(s) détecté(s)</div>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
              Fournisseur : {parsed.supplier || '?'} · Total : {parsed.total || 0} €
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {parsed.items.map((it: any, i: number) => (
              <div key={i} style={{
                padding: 10, borderRadius: 8, fontSize: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{it.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>{it.qty} {it.unit} · {it.unitPrice}€/u · {it.category}</div>
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 700 }}>{it.totalPrice}€</div>
              </div>
            ))}
          </div>
          <button onClick={validate}
            style={{
              padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
              fontWeight: 800, fontSize: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Check size={16} /> Ajouter au stock ({parsed.items.length} articles)
          </button>
        </div>
      )}

      {stage === 'done' && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 8 }}>Stock mis à jour !</div>
        </div>
      )}

      {stage === 'error' && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 12 }}>
          {error}
          <button onClick={() => setStage('idle')}
            style={{ display: 'block', marginTop: 10, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Recommencer
          </button>
        </div>
      )}
    </div>
  )
}
