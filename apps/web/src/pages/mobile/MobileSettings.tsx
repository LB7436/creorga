import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Volume2, Settings, User, Palette, ChevronRight, Fingerprint, Car, MapPin, Mic, Server, RefreshCw, LogOut, Wifi } from 'lucide-react'
import { useAssistant } from '@/stores/assistantStore'
import AssistantMascot from '@/components/AssistantMascot'
import { biometricChallenge, getLocationStatus, enablePushNotifications } from '@/lib/assistantFeatures'
import { useAuthStore } from '@/stores/authStore'

const ENV_BACKEND = (import.meta as any).env?.VITE_REMOTE_BACKEND
                 || (import.meta as any).env?.VITE_BACKEND_URL
                 || ''

export default function MobileSettings() {
  const a = useAssistant()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  // v3.15 fix : Android WebView n'a pas l'API Notification globale → check defensif
  const [pushEnabled, setPushEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem('creorga.backend.remote') || ENV_BACKEND || 'http://localhost:3002'
  )
  const [pingState, setPingState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [pingMsg, setPingMsg] = useState<string>('')

  const saveBackend = () => {
    const url = backendUrl.trim().replace(/\/$/, '')
    if (!url) return
    localStorage.setItem('creorga.backend.remote', url)
    setBackendUrl(url)
    alert(`✅ URL serveur enregistrée :\n${url}\n\nL'app va recharger pour appliquer.`)
    setTimeout(() => { window.location.href = '/m/demo' }, 800)
  }

  const testBackend = async () => {
    setPingState('testing'); setPingMsg('')
    try {
      const url = backendUrl.trim().replace(/\/$/, '')
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setPingState('ok'); setPingMsg(`✅ ${j.service || 'OK'} · ${new Date(j.timestamp).toLocaleTimeString('fr-LU')}`)
    } catch (e: any) {
      setPingState('fail'); setPingMsg(`❌ ${e.message || 'Inaccessible'}`)
    }
  }

  const fullReset = () => {
    if (!confirm('⚠️ Tout réinitialiser ? Déconnexion + suppression des préférences locales.')) return
    logout()
    localStorage.removeItem('creorga.backend.remote')
    localStorage.removeItem('creorga-auth')
    localStorage.removeItem('creorga-assistant')
    setTimeout(() => { window.location.href = '/m/demo' }, 400)
  }

  const requestPush = async () => {
    if (typeof Notification === 'undefined' || !('Notification' in window)) {
      alert('Notifications non supportées sur cet appareil. Active-les au niveau système Android.')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setPushEnabled(result === 'granted')
      if (result === 'granted') {
        new Notification(`Bonjour ${a.name} 👋`, {
          body: 'Notifications activées. Vous serez prévenu des alertes critiques.',
          icon: '/icon-192.png',
        })
      }
    } catch (e: any) {
      alert('Erreur notifications : ' + (e?.message || 'inconnue'))
    }
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>⚙️ Réglages</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Personnalisez votre app distante</div>
      </div>

      {/* Backend / Serveur — v3.15 fix : permet de changer URL tunnel sans rebuild APK */}
      <Section title="🌐 Serveur (URL backend)">
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
            URL du backend Creorga. Change-la quand le tunnel Cloudflare bouge.
            Format : <code style={{ color: '#fbbf24' }}>https://xxx.trycloudflare.com</code>
          </div>
          <input value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://xxx.trycloudflare.com"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
              color: '#fff', fontSize: 11, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
            }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={testBackend} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Wifi size={14} /> {pingState === 'testing' ? 'Test…' : 'Tester'}
            </button>
            <button onClick={saveBackend} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, fontSize: 12,
            }}>💾 Enregistrer</button>
          </div>
          {pingMsg && (
            <div style={{
              padding: '8px 10px', borderRadius: 6, fontSize: 11,
              background: pingState === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: pingState === 'ok' ? '#10b981' : '#fca5a5',
              border: `1px solid ${pingState === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>{pingMsg}</div>
          )}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => setBackendUrl('http://localhost:3002')} style={presetStyle}>🏠 Local</button>
            {ENV_BACKEND && (
              <button onClick={() => setBackendUrl(ENV_BACKEND)} style={presetStyle}>🌍 Tunnel build</button>
            )}
          </div>
        </div>
      </Section>

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
        {/* v3.12 #7 — Voix par mascotte */}
        <Row icon={Volume2} label={`Profil voix · ${a.voiceProfile}`}>
          <select value={a.voiceProfile} onChange={(e) => a.setVoiceProfile(e.target.value as any)}
            style={selectStyle}>
            <option value="auto">Auto (mascotte)</option>
            <option value="masculine">Masculine</option>
            <option value="feminine">Féminine</option>
            <option value="warm">Chaleureuse</option>
            <option value="energetic">Énergique</option>
            <option value="robotic">Robotique</option>
          </select>
        </Row>
        {/* v3.12 #1 — Wake word */}
        <Row icon={Mic} label={`Wake word "Hey ${a.name}"`}>
          <Toggle on={a.wakeWordEnabled} onChange={a.setWakeWordEnabled} />
        </Row>
      </Section>

      {/* Modes */}
      <Section title="Modes">
        {/* v3.12 #17 — Mode conduite */}
        <Row icon={Car} label="Mode conduite (mains-libres)">
          <Toggle on={a.drivingMode} onChange={a.setDrivingMode} />
        </Row>
        {/* v3.12 #14 — Garde biométrique */}
        <Row icon={Fingerprint} label="Confirmer biométrie pour > 200 €">
          <Toggle on={a.biometricGuard} onChange={a.setBiometricGuard} />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row icon={Bell} label="Push (alertes critiques)" onClick={requestPush}>
          <Toggle on={pushEnabled} onChange={() => requestPush()} />
        </Row>
        {/* v3.12 #18 — Géolocalisation */}
        <Row icon={MapPin} label="Géolocalisation (resto vs distant)" onClick={async () => {
          const loc = await getLocationStatus()
          alert(loc.available
            ? `📍 ${loc.isAtRestaurant ? 'Au restaurant' : 'À distance'} (${loc.distanceMeters} m)`
            : `❌ ${loc.reason || 'Indisponible'}`)
        }}>
          <ChevronRight size={14} />
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
            if (typeof Notification === 'undefined') {
              alert('Notifications non supportées sur cet appareil.')
              return
            }
            if (Notification.permission === 'granted')
              new Notification('🚨 Test notification', { body: 'Si vous voyez ceci, tout fonctionne.', icon: '/icon-192.png' })
            else
              alert('Activez les notifications d\'abord ↑')
          }}>
          <ChevronRight size={14} />
        </Row>
        <Row icon={Fingerprint} label="Tester biométrie (Face ID / empreinte)"
          onClick={async () => {
            const ok = await biometricChallenge('Confirmer votre identité')
            alert(ok ? '✅ Biométrie validée' : '❌ Biométrie refusée')
          }}>
          <ChevronRight size={14} />
        </Row>
      </Section>

      {/* Réinitialisation — v3.15 fix : recovery quand l'app est cassée */}
      <Section title="Avancé">
        <Row icon={RefreshCw} label="Recharger l'app" onClick={() => window.location.href = '/m/demo'}>
          <ChevronRight size={14} />
        </Row>
        <Row icon={LogOut} label="Déconnecter" onClick={() => { logout(); window.location.href = '/m/demo' }}>
          <ChevronRight size={14} />
        </Row>
        <Row icon={Server} label="🔄 Reset complet (auth + URL + préférences)" onClick={fullReset}>
          <ChevronRight size={14} />
        </Row>
      </Section>

      <div style={{ padding: 12, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
        Creorga OS · v3.15 · {a.name} sur cet appareil
      </div>
    </div>
  )
}

const presetStyle: React.CSSProperties = {
  flex: 1, padding: '6px 10px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#cbd5e1', cursor: 'pointer', fontSize: 10, fontWeight: 600,
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

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
  color: '#fff', fontSize: 11, outline: 'none',
}
