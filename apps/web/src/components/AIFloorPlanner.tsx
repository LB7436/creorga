import { useState } from 'react'

interface Props {
  onGenerate: (prompt: string) => Promise<any>
  theme: any
}

const EXAMPLES = [
  'Petit café de quartier avec 6 tables rondes et un comptoir',
  'Restaurant avec 10 tables en salle, un bar de 6 places et une terrasse de 4 tables',
  'Brasserie moderne : 12 tables carrées alignées, bar central, 3 tables terrasse',
  'Café cosy : 4 tables rondes, 3 tables carrées, 8 tabourets au bar',
]

export default function AIFloorPlanner({ onGenerate, theme }: Props) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await onGenerate(prompt.trim())
      setPreview(r.aiResponse)
    } catch (e: any) {
      setError(e.message || 'Erreur IA — vérifiez qu\'Ollama + Gemma 2B tournent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(139,92,246,0.08)',
      border: `1px solid ${theme.primary}40`,
      borderRadius: 14, padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>🤖</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
            Générer le plan avec l'IA locale (Gemma 2B)
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>
            Décrivez votre salle — l'IA dessine tables & chaises automatiquement.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
          placeholder="Ex : Brasserie 40 places avec bar central et terrasse…"
          disabled={busy}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${theme.primary}30`,
            background: 'rgba(0,0,0,0.3)',
            color: theme.text, outline: 'none', fontSize: 13,
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={busy || !prompt.trim()}
          style={{
            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: busy ? 'rgba(148,163,184,0.3)' : `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`,
            color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
          }}>
          {busy ? '⏳ Génération…' : '✨ Générer'}
        </button>
      </div>

      {/* Example chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => setPrompt(ex)} disabled={busy}
            style={{
              padding: '5px 10px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: theme.textMuted, cursor: 'pointer', fontSize: 11,
            }}>
            {ex.slice(0, 45)}…
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 12 }}>
          ❌ {error}
        </div>
      )}

      {preview && !error && (
        <div style={{ marginTop: 10, padding: 10, background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#6ee7b7', fontSize: 12 }}>
          ✅ Plan généré : <strong>{preview.tables?.length || 0} tables</strong>, <strong>{preview.chairs?.length || 0} chaises</strong>
        </div>
      )}
    </div>
  )
}
