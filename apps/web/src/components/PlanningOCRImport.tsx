import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, Loader2, X, Check, AlertCircle } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * PlanningOCRImport — photographie un planning manuscrit/imprimé,
 * Tesseract.js + Gemma extraient les shifts.
 *
 *   <PlanningOCRImport onShifts={(shifts) => merge(shifts)} />
 *
 * Sortie : Array<{ employee, day, start, end, role? }> à valider par l'utilisateur.
 */

interface Shift {
  employee: string
  day: string       // 'lundi' | 'mardi' | ... | ISO date
  start: string     // 'HH:MM'
  end: string       // 'HH:MM'
  role?: string
  warning?: string
}

interface Props {
  onShifts: (shifts: Shift[]) => void
  trigger?: React.ReactNode
}

export default function PlanningOCRImport({ onShifts, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsing' | 'review'>('idle')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null); setPreview(null); setStage('idle'); setShifts([]); setError(null)
  }

  const handleFile = async (f: File) => {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    setError(null)
    setStage('reading')

    try {
      // Lazy load Tesseract.js (~12 MB)
      const { default: Tesseract } = await import('tesseract.js')
      const result = await Tesseract.recognize(f, 'fra', {
        logger: () => { /* silent */ },
      })
      const rawText = result.data.text
      setStage('parsing')

      // Send to backend Gemma to parse
      const r = await fetch(`${BACKEND}/api/ai/run-action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: 'hr.parse-shifts-ocr',
          context: { rawText },
        }),
      })

      if (!r.ok) throw new Error(`Backend ${r.status}`)
      const data = await r.json()

      // Try to coerce to Shift[]
      let parsed: Shift[] = []
      if (data?.data?.shifts && Array.isArray(data.data.shifts)) {
        parsed = data.data.shifts
      } else if (data?.text) {
        // Fallback : regex parser if Gemma returns text instead of JSON
        const lines = data.text.split('\n').filter((l: string) => l.trim())
        for (const line of lines) {
          const m = line.match(/(\w+)\s+(\d{1,2})[hH:](\d{2})?\s*[-–à]\s*(\d{1,2})[hH:](\d{2})?\s+(\w+)/)
          if (m) {
            parsed.push({
              employee: m[6], day: m[1].toLowerCase(),
              start: `${m[2].padStart(2, '0')}:${m[3] || '00'}`,
              end: `${m[4].padStart(2, '0')}:${m[5] || '00'}`,
            })
          }
        }
      }

      if (parsed.length === 0) {
        setError('Aucun shift détecté. Texte OCR brut :\n' + rawText.slice(0, 200) + '…')
        setStage('idle')
        return
      }

      setShifts(parsed)
      setStage('review')
    } catch (e: any) {
      setError(e?.message || 'Erreur OCR')
      setStage('idle')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const validate = () => {
    onShifts(shifts)
    setOpen(false)
    reset()
  }

  const updateShift = (i: number, patch: Partial<Shift>) => {
    setShifts((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x))
  }
  const removeShift = (i: number) => setShifts((s) => s.filter((_, idx) => idx !== i))

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'inline-block' }}>
        {trigger || (
          <button style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)',
            background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(236,72,153,0.1))',
            color: '#7c3aed', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Camera size={14} /> Importer planning OCR
          </button>
        )}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setOpen(false); reset() }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              style={{
                background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700,
                maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
              <header style={{
                padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg,#eef2ff,#faf5ff)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>📸 OCR Planning</div>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800 }}>Importer un planning</h2>
                </div>
                <button onClick={() => { setOpen(false); reset() }}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </header>

              <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
                {stage === 'idle' && !error && (
                  <>
                    <div
                      onDrop={onDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => inputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1', borderRadius: 12,
                        padding: 40, textAlign: 'center', cursor: 'pointer',
                        background: '#f8fafc',
                      }}
                    >
                      <Upload size={32} style={{ color: '#8b5cf6', marginBottom: 10 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                        Glissez une photo ou cliquez pour choisir
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                        Photo de planning manuscrit ou imprimé · jpg / png / pdf
                      </div>
                    </div>
                    <input ref={inputRef} type="file" accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

                    <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                      💡 Astuce : photo bien cadrée, lumière régulière. Format type :
                      <code style={{ display: 'block', background: '#fff', padding: 8, borderRadius: 4, marginTop: 6 }}>
                        Lundi 8h-16h Marie<br/>Mardi 14h-22h Lucas
                      </code>
                    </div>
                  </>
                )}

                {error && (
                  <div style={{ padding: 14, background: '#fee2e2', borderRadius: 10, color: '#991b1b', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    <AlertCircle size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                    {error}
                    <button onClick={reset}
                      style={{ display: 'block', marginTop: 10, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                      Recommencer
                    </button>
                  </div>
                )}

                {(stage === 'reading' || stage === 'parsing') && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <Loader2 size={32} className="ai-spin" style={{ color: '#8b5cf6', marginBottom: 10 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                      {stage === 'reading' ? 'OCR Tesseract en cours…' : 'Gemma analyse les shifts…'}
                    </div>
                    {preview && (
                      <img src={preview} alt="Aperçu" style={{ maxHeight: 200, marginTop: 16, borderRadius: 8, opacity: 0.6 }} />
                    )}
                  </div>
                )}

                {stage === 'review' && (
                  <>
                    <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 10 }}>
                      <Check size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                      {shifts.length} shift(s) détecté(s) — vérifiez et validez
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={th}>Employé</th>
                          <th style={th}>Jour</th>
                          <th style={th}>Début</th>
                          <th style={th}>Fin</th>
                          <th style={th}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={td}><input value={s.employee} onChange={(e) => updateShift(i, { employee: e.target.value })} style={inp} /></td>
                            <td style={td}><input value={s.day}      onChange={(e) => updateShift(i, { day: e.target.value })}      style={inp} /></td>
                            <td style={td}><input value={s.start}    onChange={(e) => updateShift(i, { start: e.target.value })}    style={{ ...inp, width: 70 }} /></td>
                            <td style={td}><input value={s.end}      onChange={(e) => updateShift(i, { end: e.target.value })}      style={{ ...inp, width: 70 }} /></td>
                            <td style={td}>
                              <button onClick={() => removeShift(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {stage === 'review' && (
                <footer style={{ padding: 14, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={reset}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    Annuler
                  </button>
                  <button onClick={validate}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    Importer {shifts.length} shift(s)
                  </button>
                </footer>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 6px', fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '6px 6px' }
const inp: React.CSSProperties = { padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12, width: '100%' }
