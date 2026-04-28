import { useState, useEffect } from 'react'
import { Globe, Wifi, Server, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react'

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
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const [serverInfo, setServerInfo] = useState<any>(null)

  useEffect(() => {
    const check = async () => {
      setStatus('checking')
      const start = Date.now()
      try {
        const r = await fetch(`${backend}/api/agent/commands`, { signal: AbortSignal.timeout(8000) })
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
  }, [backend])

  const setRemote = (url: string) => {
    localStorage.setItem('creorga.backend.remote', url)
    setBackend(url)
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
          value={backend} onChange={(e) => setBackend(e.target.value)}
          placeholder="https://creorga.example.com:3002"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
            color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setRemote(backend)}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, fontSize: 12,
            }}>
            Sauvegarder & connecter
          </button>
          <button onClick={() => setBackend('http://localhost:3002')}
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
          Pour accéder à votre restaurant depuis le Portugal (ou n'importe où) :
        </div>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 11, color: '#e2e8f0', lineHeight: 1.7 }}>
          <li>Sur l'ordi du restaurant, installez <code style={codeStyle}>cloudflared</code> (gratuit)</li>
          <li>Lancez : <code style={codeStyle}>cloudflared tunnel --url http://localhost:3002</code></li>
          <li>Cloudflare donne une URL <code style={codeStyle}>https://xxx.trycloudflare.com</code></li>
          <li>Collez-la ci-dessus → tap "Sauvegarder"</li>
        </ol>
        <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/" target="_blank" rel="noopener noreferrer"
          style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
            color: '#a78bfa', fontSize: 11, textDecoration: 'none',
          }}>
          Documentation Cloudflare Tunnel <ExternalLink size={10} />
        </a>
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
          <li><b>Mode hors-ligne</b> : les KPIs sont mis en cache 5 min</li>
          <li><b>Voix à distance</b> : le micro fonctionne, Robi répond comme local</li>
          <li><b>Confidentiel</b> : tunnel chiffré HTTPS automatique avec Cloudflare</li>
        </ul>
      </div>
    </div>
  )
}

const codeStyle: React.CSSProperties = {
  padding: '1px 5px', borderRadius: 3, background: 'rgba(0,0,0,0.4)',
  fontFamily: 'monospace', fontSize: 10, color: '#fcd34d',
}
