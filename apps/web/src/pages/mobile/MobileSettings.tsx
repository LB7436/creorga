import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Volume2, Settings, User, Palette, ChevronRight } from 'lucide-react'
import { useAssistant } from '@/stores/assistantStore'
import AssistantMascot from '@/components/AssistantMascot'

export default function MobileSettings() {
  const a = useAssistant()
  const navigate = useNavigate()
  const [pushEnabled, setPushEnabled] = useState(Notification?.permission === 'granted')

  const requestPush = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPushEnabled(result === 'granted')
    if (result === 'granted') {
      new Notification(`Bonjour ${a.name} 👋`, {
        body: 'Notifications activées. Vous serez prévenu des alertes critiques.',
        icon: '/icon-192.png',
      })
    }
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>⚙️ Réglages</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Personnalisez votre app distante</div>
      </div>

      {/* Profile */}
      <Section title="Profil">
        <Row icon={User} label="Nom de l'assistant" value={a.name}>
          <input value={a.name} onChange={(e) => a.setName(e.target.value)} maxLength={20}
            style={inputStyle} />
        </Row>
        <Row icon={Palette} label="Mascotte" onClick={() => navigate('/setup/assistant')}>
          <AssistantMascot variant={a.mascot} size={28} animated={false} />
        </Row>
      </Section>

      {/* Voice */}
      <Section title="Voix">
        <Row icon={Volume2} label="TTS activé">
          <Toggle on={a.voiceEnabled} onChange={a.setVoiceEnabled} />
        </Row>
        <Row icon={Volume2} label={`Vitesse · ${a.voiceSpeed.toFixed(1)}×`}>
          <input type="range" min="0.7" max="1.5" step="0.1" value={a.voiceSpeed}
            onChange={(e) => a.setVoiceSpeed(parseFloat(e.target.value))}
            style={{ width: 100 }} />
        </Row>
        <Row icon={Volume2} label="Auto-écoute">
          <Toggle on={a.autoListen} onChange={a.setAutoListen} />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row icon={Bell} label="Push (alertes critiques)" onClick={requestPush}>
          <Toggle on={pushEnabled} onChange={() => requestPush()} />
        </Row>
      </Section>

      {/* Tests */}
      <Section title="Tests rapides">
        <Row icon={Settings} label="Tester voix"
          onClick={() => {
            const u = new SpeechSynthesisUtterance(`Bonjour, je suis ${a.name}. Test de la synthèse vocale.`)
            u.lang = 'fr-FR'; u.rate = a.voiceSpeed
            window.speechSynthesis.speak(u)
          }}>
          <ChevronRight size={14} />
        </Row>
        <Row icon={Settings} label="Tester notification"
          onClick={() => {
            if (Notification?.permission === 'granted')
              new Notification('🚨 Test notification', { body: 'Si vous voyez ceci, tout fonctionne.', icon: '/icon-192.png' })
            else
              alert('Activez les notifications d\'abord ↑')
          }}>
          <ChevronRight size={14} />
        </Row>
      </Section>

      <div style={{ padding: 12, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
        Creorga OS · v3.10 · {a.name} sur cet appareil
      </div>
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div style={{
      padding: 6, borderRadius: 12,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ padding: '6px 10px', fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function Row({ icon: Icon, label, value, children, onClick }: any) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.04)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <Icon size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{label}</div>
        {value && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{value}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{
        width: 38, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.1)',
        position: 'relative', padding: 0,
      }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: 100, padding: '4px 8px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
  color: '#fff', fontSize: 12, textAlign: 'right', outline: 'none',
}
