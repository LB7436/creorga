import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Volume2, MicIcon } from 'lucide-react'
import AssistantMascot, { MASCOT_OPTIONS, type MascotVariant } from '@/components/AssistantMascot'

const Mic: any = MicIcon || Volume2

export default function AssistantPick() {
  const navigate = useNavigate()
  const [picked, setPicked] = useState<MascotVariant>('robot')
  const [name, setName] = useState('Robi')
  const [demoState, setDemoState] = useState<'idle' | 'listening' | 'speaking'>('idle')

  const save = () => {
    localStorage.setItem('creorga.assistant.mascot', picked)
    localStorage.setItem('creorga.assistant.name', name.trim() || 'Robi')
    navigate('/modules')
  }

  return (
    <div style={{
      minHeight: '100vh', padding: 32,
      background: 'linear-gradient(180deg,#0a0a14 0%, #1a0a2e 100%)', color: '#f1f5f9',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Setup · Choix de l'assistant
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '8px 0',
                       background: 'linear-gradient(135deg,#a78bfa,#ec4899)',
                       WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Choisissez votre robot assistant
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 600, margin: '0 auto' }}>
            Il vous aidera dans toutes vos tâches : créer factures, commandes, planning…
            Donnez-lui un nom — vous l'appellerez à la voix.
          </p>
        </header>

        {/* Live preview top */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: 28, marginBottom: 24, borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.05))',
          border: '1px solid rgba(167,139,250,0.3)',
        }}>
          <AssistantMascot variant={picked} size={160} listening={demoState === 'listening'} speaking={demoState === 'speaking'} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nommez votre assistant…"
              maxLength={20}
              style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center',
                outline: 'none', width: 200,
              }}
            />
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            Bonjour, je suis <b style={{ color: '#a78bfa' }}>{name || 'votre robot'}</b>. Comment puis-je vous aider ?
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setDemoState('listening')} style={demoBtn(demoState === 'listening')}>
              🎤 Tester écoute
            </button>
            <button onClick={() => setDemoState('speaking')} style={demoBtn(demoState === 'speaking')}>
              💬 Tester parole
            </button>
            <button onClick={() => setDemoState('idle')} style={demoBtn(false)}>
              😊 Idle
            </button>
          </div>
        </div>

        {/* Grid des 6 mascottes */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14, marginBottom: 24,
        }}>
          {MASCOT_OPTIONS.map((opt) => {
            const active = opt.variant === picked
            return (
              <motion.button
                key={opt.variant}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPicked(opt.variant)}
                style={{
                  position: 'relative', padding: 20, borderRadius: 16, cursor: 'pointer',
                  border: active ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.08)',
                  background: active
                    ? 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(236,72,153,0.10))'
                    : 'rgba(255,255,255,0.03)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  textAlign: 'center', color: '#f1f5f9',
                }}
                data-mascot={opt.variant}
              >
                {active && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 24, height: 24, borderRadius: 999,
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={14} color="#fff" />
                  </div>
                )}
                <AssistantMascot variant={opt.variant} size={120} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{opt.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{opt.description}</div>
                </div>
              </motion.button>
            )
          })}
        </div>

        <button onClick={save}
          style={{
            display: 'block', margin: '0 auto', padding: '14px 40px', borderRadius: 999,
            background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', border: 'none', color: '#fff',
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
          }}>
          ✨ Créer mon assistant {name || 'Robi'}
        </button>

        <p style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: '#64748b' }}>
          Tous les designs sont en SVG vectoriel libre · animés (clignote, balance, pulse) · Creorga gradient
        </p>
      </div>
    </div>
  )
}

const demoBtn = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
  border: '1px solid ' + (active ? '#ec4899' : 'rgba(255,255,255,0.15)'),
  background: active ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.04)',
  color: '#fff', cursor: 'pointer',
})
