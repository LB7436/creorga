import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AIActionMenu from './AIActionMenu'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Planning assistant — bouton flottant qui ouvre 4 outils :
 *   1. Multi-jours : Ctrl+clic + drag-select de cellules
 *   2. OCR import : photo de planning papier → JSON
 *   3. IA optimisation
 *   4. Alertes effectif min sur événements nommés
 *
 * À monter dans PlanningPage existante.
 */

type Tool = 'multiselect' | 'ocr' | 'ai' | 'events' | null

export default function PlanningAssistant() {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState<Tool>(null)

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', right: 20, bottom: 80, zIndex: 200,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: 24, boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
        }}
        title="Assistant planning"
      >🪄</motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'fixed', right: 86, bottom: 80, zIndex: 200,
              width: 320, background: '#fff', borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(99,102,241,0.15)',
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              🪄 Assistant Planning
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <ToolBtn label="✋ Multi-sélection (Ctrl+clic)" onClick={() => setTool('multiselect')} desc="Sélectionnez plusieurs jours d'un coup" />
              <ToolBtn label="📸 Importer planning OCR" onClick={() => setTool('ocr')} desc="Photo → JSON via Gemma" />
              <ToolBtn label="✨ Optimiser avec IA" onClick={() => setTool('ai')} desc="Suggestion équilibre via Gemma" />
              <ToolBtn label="🎯 Événements nommés" onClick={() => setTool('events')} desc="Match fléchettes, poker… avec effectif min" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tool && <ToolModal tool={tool} onClose={() => { setTool(null); setOpen(false) }} />}
      </AnimatePresence>
    </>
  )
}

function ToolBtn({ label, onClick, desc }: any) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
      background: '#fff', cursor: 'pointer', textAlign: 'left',
      transition: 'all .15s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#6366f1' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{desc}</div>
    </button>
  )
}

function ToolModal({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  return (
    <motion.div onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(4px)',
      }}>
      <motion.div onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
          maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
        {tool === 'multiselect' && <MultiSelectGuide onClose={onClose} />}
        {tool === 'ocr' && <OCRImport onClose={onClose} />}
        {tool === 'ai' && <AIOptimize onClose={onClose} />}
        {tool === 'events' && <EventManager onClose={onClose} />}
      </motion.div>
    </motion.div>
  )
}

function MultiSelectGuide({ onClose }: any) {
  return (
    <>
      <header style={hdr}>
        <h2 style={hh}>✋ Multi-sélection de créneaux</h2>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </header>
      <div style={{ padding: 24 }}>
        <div style={tipBox}>
          <strong style={{ color: '#1e293b' }}>Comment l'utiliser :</strong>
          <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
            <li><strong>Ctrl + clic</strong> sur plusieurs cellules pour les sélectionner une par une</li>
            <li><strong>Maj + clic</strong> pour sélectionner une plage (du dernier au courant)</li>
            <li><strong>Drag</strong> avec le bouton gauche : tracer un rectangle sur les jours/employés</li>
            <li>Une fois sélectionnés → cliquez <strong>Affecter</strong> en haut → choisissez l'horaire et le rôle</li>
            <li>L'affectation se fait sur tous les créneaux sélectionnés en une action</li>
          </ol>
        </div>
        <div style={{ marginTop: 14, padding: 12, background: '#fef3c7', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
          💡 <strong>Astuce</strong> : Echap pour désélectionner tout.
        </div>
      </div>
    </>
  )
}

function OCRImport({ onClose }: any) {
  const [phase, setPhase] = useState<'idle' | 'ocr' | 'ai' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (f: File) => {
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('PDF ou image uniquement'); setPhase('error'); return
    }
    setPhase('ocr'); setProgress(0); setError(null)
    try {
      const { default: Tesseract } = await import('tesseract.js')
      const result = await Tesseract.recognize(f, 'fra+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const text = result.data.text || ''
      setRawText(text)

      // Send to Gemma to parse as planning
      setPhase('ai')
      const r = await fetch(`${BACKEND}/api/ai/run-action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: 'hr.optimize-shifts', // Reuse the HR action for parsing
          context: { freeText: text.slice(0, 3000), task: 'parse_planning' },
        }),
      })
      const data = await r.json()
      setParsed(data.data || data.text || data)
      setPhase('done')
    } catch (e: any) {
      setError(e.message); setPhase('error')
    }
  }

  return (
    <>
      <header style={hdr}>
        <h2 style={hh}>📸 Importer un planning depuis une image</h2>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </header>
      <div style={{ padding: 24 }}>
        {phase === 'idle' && (
          <button onClick={() => inputRef.current?.click()} style={{
            width: '100%', padding: 40, borderRadius: 14,
            border: '3px dashed #cbd5e1', background: '#f8fafc',
            cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>Glissez ou choisissez une image/PDF</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Tesseract OCR + Gemma 2B local</div>
          </button>
        )}
        {(phase === 'ocr' || phase === 'ai') && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48 }}>{phase === 'ocr' ? '👁' : '🤖'}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>
              {phase === 'ocr' ? `OCR Tesseract — ${progress}%` : 'Gemma analyse le planning…'}
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, marginTop: 14, maxWidth: 320, margin: '14px auto' }}>
              <div style={{ height: '100%', width: `${phase === 'ocr' ? progress : 80}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 999, transition: 'width .3s' }} />
            </div>
          </div>
        )}
        {phase === 'done' && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>✓ Extraction terminée</div>
            <pre style={{
              padding: 14, background: '#0f172a', color: '#e2e8f0',
              borderRadius: 10, fontSize: 11, fontFamily: 'monospace',
              overflow: 'auto', maxHeight: 400, margin: 0,
            }}>{typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}</pre>
            <details style={{ marginTop: 10, fontSize: 11 }}>
              <summary style={{ cursor: 'pointer' }}>Texte OCR brut</summary>
              <pre style={{ marginTop: 6, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 10, maxHeight: 200, overflow: 'auto' }}>{rawText}</pre>
            </details>
          </div>
        )}
        {phase === 'error' && (
          <div style={{ padding: 20, background: '#fef2f2', borderRadius: 10, color: '#991b1b' }}>
            ❌ {error}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    </>
  )
}

function AIOptimize({ onClose }: any) {
  const [staffCount, setStaffCount] = useState(8)
  const [coverage, setCoverage] = useState('Midi 12-14h, Soir 19-23h, Weekend renforcé')
  const [constraints, setConstraints] = useState('35h max, 2 jours OFF consécutifs')

  return (
    <>
      <header style={hdr}>
        <h2 style={hh}>✨ Optimiser le planning avec l'IA</h2>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </header>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Nombre d'employés" value={staffCount} onChange={(v: any) => setStaffCount(+v)} type="number" />
          <Field label="Couverture nécessaire" value={coverage} onChange={setCoverage} />
          <Field label="Contraintes" value={constraints} onChange={setConstraints} />
        </div>
        <div style={{ marginTop: 16, padding: 14, background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', borderRadius: 12 }}>
          <AIActionMenu module="hr" context={{ staffCount, coverage, constraints }} label="Lancer l'optimisation" inline />
        </div>
      </div>
    </>
  )
}

function EventManager({ onClose }: any) {
  return (
    <>
      <header style={hdr}>
        <h2 style={hh}>🎯 Événements nommés</h2>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </header>
      <div style={{ padding: 24 }}>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
          Configurez les événements récurrents avec un effectif minimum requis. Une alerte rouge apparaîtra dans le planning si le seuil n'est pas atteint.
        </p>
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {[
            { name: '🎯 Match de fléchettes', day: 'Mercredi 19h', minStaff: 3 },
            { name: '🃏 Soirée poker', day: 'Vendredi 20h', minStaff: 4 },
            { name: '🎤 Karaoké', day: 'Samedi 21h', minStaff: 5 },
            { name: '🍷 Dégustation vins', day: 'Jeudi 19h', minStaff: 3 },
            { name: '⚽ Match foot diffusé', day: 'Variable', minStaff: 4 },
          ].map((evt) => (
            <div key={evt.name} style={{
              padding: 12, borderRadius: 10, background: '#f8fafc',
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{evt.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{evt.day}</div>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: 999, background: '#eef2ff',
                color: '#4338ca', fontSize: 11, fontWeight: 700,
              }}>min {evt.minStaff} pers.</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Field({ label, value, onChange, type }: any) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

const hdr: React.CSSProperties = {
  padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: 'linear-gradient(135deg,#eef2ff,#faf5ff)',
}
const hh: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 800 }
const closeBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer',
}
const tipBox: React.CSSProperties = {
  padding: 16, background: '#eef2ff', borderRadius: 10, border: '1px solid #c7d2fe',
}
