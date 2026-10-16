import { useState, useEffect } from 'react'
import { Globe, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'
import { assertApiDestination } from '@/lib/apiDestination'

const BACKEND_DEFAULT = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Mobile / Distance — accès au restaurant depuis n'importe où.
 *
 * Pattern :
 *   - localhost  : depuis la même machine
 *   - http://192.168.x.x:3002  : LAN (même WiFi que le restaurant)
 *   - https://xxx.ngrok.io   : depuis Internet (tunnel)
 *
 * Affiche le statut de connexion live, IP locale détectée, et propose
 * des solutions si l'utilisateur est à distance (Portugal etc.).
 */

export default function MobileWorld() {
  const [backend, setBackend] = useState(localStorage.getItem('creorga.backend.remote') || BACKEND_DEFAULT)
  const [connectedBackend, setConnectedBackend] = useState(BACKEND_DEFAULT)
  const [configurationError, setConfigurationError] = useState('')
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const [serverInfo, setServerInfo] = useState<any>(null)

  useEffect(() => {
    const check = async () => {
      setStatus('checking')
      const start = Date.now()
      try {
        const r = await fetchAuth(`${connectedBackend}/api/agent/commands`, { signal: AbortSignal.timeout(8000) })
        if (!r.ok) throw new Error('not ok')
        const data = await r.json()
        setLatency(Date.now() - start)
        setStatus('online')
        setServerInfo({ commands: data.commands?.length || 0 })
      } catch {
        setStatus('offline')
        setLatency(null)
        setServerInfo(null)
      }
    }
    check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [connectedBackend])

  const setRemote = (url: string) => {
    try {
      const normalized = url.trim().replace(/\/+$/, '')
      assertApiDestination(`${normalized}/api/agent/commands`)
      localStorage.setItem('creorga.backend.remote', normalized)
      setBackend(normalized)
      setConnectedBackend(normalized)
      setConfigurationError('')
    } catch {
      setConfigurationError('Adresse non autorisée. Aucun jeton n’a été envoyé. Un accès distant doit être configuré par votre administrateur ; ce champ ne connecte pas un autre serveur.')
    }
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>🌍 Connexion à distance</div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Pilotez de partout</h1>
      </div>

      {/* Status card */}
      <div style={{
        padding: 16, borderRadius: 14,
        background: status === 'online'
          ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))'
          : status === 'offline'
          ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${status === 'online' ? 'rgba(16,185,129,0.4)' : status === 'offline' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {status === 'online' ? <CheckCircle2 size={32} color="#10b981" />
            : status === 'offline' ? <AlertCircle size={32} color="#ef4444" />
            : <Wifi size={32} color="#94a3b8" />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {status === 'online' ? 'Connecté' : status === 'offline' ? 'Hors ligne' : 'Vérification…'}
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
              {status === 'online' && latency != null ? `Latence : ${latency} ms · ${serverInfo?.commands || 0} commandes IA` :
               status === 'offline' ? 'Le serveur Creorga ne répond pas' :
               'Connexion au backend…'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', wordBreak: 'break-all' }}>
          {backend}
        </div>
      </div>

      {/* Backend URL setting */}
      <div style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          🔌 URL du serveur
        </div>
        <input
          aria-label="URL du serveur"
          value={backend} onChange={(e) => setBackend(e.target.value)}
          placeholder="https://creorga.example.com:3002"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
            color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {configurationError && <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>{configurationError}</p>}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setRemote(backend)}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, fontSize: 12,
            }}>
            Sauvegarder & connecter
          </button>
          <button onClick={() => { setBackend(BACKEND_DEFAULT); setRemote(BACKEND_DEFAULT) }}
            style={{
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#cbd5e1', cursor: 'pointer', fontSize: 11,
            }}>
            🏠 Local
          </button>
        </div>
      </div>

      {/* How-to remote access */}
      <div style={{
        padding: 14, borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
        border: '1px solid rgba(99,102,241,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Globe size={18} color="#a78bfa" />
          <div style={{ fontWeight: 800, fontSize: 13, color: '#a78bfa' }}>Vous êtes à l'étranger ?</div>
        </div>
        <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>
          La connexion distante nécessite une installation configurée et sécurisée par votre administrateur.
        </div>
        <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>
          Ne publiez pas le serveur de caisse à partir de cet écran. Le jeton actuel ne peut être
          transmis qu’à l’origine de l’application ou au backend configuré lors de son installation.
        </p>
      </div>

      {/* Quick access tips */}
      <div style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          💡 Astuces
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.7 }}>
          <li><b>Installer cette app</b> : menu Chrome → "Ajouter à l'écran d'accueil"</li>
          <li><b>Hors ligne</b> : une valeur en cache ne prouve pas l’état actuel du restaurant.</li>
          <li><b>Micro et son</b> : dépendent des permissions et du matériel ; non vérifiés par cette page.</li>
          <li><b>Confidentialité</b> : aucun tunnel ou chiffrement distant n’est créé automatiquement ici.</li>
        </ul>
      </div>
    </div>
  )
}
