import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Globe, Loader2 } from 'lucide-react'
import AssistantMascot from '@/components/AssistantMascot'
import { useAssistant } from '@/stores/assistantStore'
import { useAuthStore } from '@/stores/authStore'

/**
 * Auto-login démo pour APK Android.
 *
 * Cette page est l'entrée par défaut de l'APK / PWA installée
 * (manifest start_url = /m/demo). Elle :
 *   1. Lit l'URL backend stockée (localStorage.creorga.backend.remote)
 *      ou utilise une valeur fournie au build (VITE_REMOTE_BACKEND)
 *   2. Login automatique avec credentials de démo
 *   3. Redirige vers /m une fois connectée
 *
 * Pour la prod, remplacer par un vrai login.
 */

/**
 * ⚠️ CONNEXION AUTOMATIQUE — DÉSACTIVÉE PAR DÉFAUT.
 *
 * Cette page ouvrait une session propriétaire à quiconque connaissait l'URL.
 * `/m/demo` est une route PUBLIQUE (App.tsx:252, hors RequireAuth) : ouvrir
 * https://…/m/demo depuis un navigateur vierge suffisait à être connecté comme
 * Bryan, sans un clic. Vérifié en direct le 11 août 2026 sur le site en ligne.
 * Le mot de passe partait de surcroît en clair dans le bundle JavaScript.
 *
 * La connexion automatique n'a lieu que si le build la demande explicitement
 * (`VITE_DEMO_AUTOLOGIN=true`), ce que le build du site ne fait pas. Sans ce
 * drapeau, la page renvoie vers l'écran de connexion normal.
 *
 * Avant de la réactiver pour l'APK : créer un compte de démonstration DÉDIÉ,
 * en lecture seule, sur une société de démonstration — jamais le compte
 * propriétaire d'un établissement réel. L'APK étant téléchargeable depuis le
 * site public, tout identifiant qu'elle contient est un identifiant public.
 */
const AUTOLOGIN_AUTORISE = (import.meta as any).env?.VITE_DEMO_AUTOLOGIN === 'true'
const DEMO_EMAIL    = (import.meta as any).env?.VITE_DEMO_EMAIL || ''
const DEMO_PASSWORD = (import.meta as any).env?.VITE_DEMO_PASSWORD || ''

const ENV_BACKEND = (import.meta as any).env?.VITE_REMOTE_BACKEND
                 || (import.meta as any).env?.VITE_BACKEND_URL
                 || ''

// v3.19 fix : on PRIORISE le bundled URL au boot (fix "Backend injoignable" sur APK
// après changement de tunnel : l'ancien localStorage gardait une URL morte)
function getBackend() {
  // Si bundled URL et localStorage diffèrent, le bundled gagne (l'APK fraîchement installée
  // a forcément le bon URL). On reset localStorage pour que les autres pages utilisent le bon.
  const fromStorage = localStorage.getItem('creorga.backend.remote')
  if (ENV_BACKEND && fromStorage && fromStorage !== ENV_BACKEND) {
    // Marqueur : on considère que le bundled est plus récent → reset
    localStorage.setItem('creorga.backend.remote', ENV_BACKEND)
    return ENV_BACKEND
  }
  return fromStorage || ENV_BACKEND || 'http://localhost:3002'
}

function getFallbacks(primary: string): string[] {
  const list = [primary]
  if (ENV_BACKEND && ENV_BACKEND !== primary) list.unshift(ENV_BACKEND)  // bundled FIRST
  if (primary !== 'http://localhost:3002') list.push('http://localhost:3002')
  return Array.from(new Set(list))
}

async function pingBackend(url: string): Promise<boolean> {
  try {
    // v3.19 fix : timeout 3s pour faire le cascade rapide si tunnel mort
    const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch { return false }
}

export default function MobileDemoLogin() {
  const navigate = useNavigate()
  const a = useAssistant()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthed = useAuthStore((s) => s.isAuthenticated)

  const [stage, setStage] = useState<'connecting' | 'logging-in' | 'success' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [backend, setBackend] = useState(getBackend())
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    if (isAuthed) {
      navigate('/m', { replace: true })
      return
    }
    // Sans autorisation explicite du build, on n'ouvre aucune session : on
    // renvoie vers l'écran de connexion normal. C'est ce qui ferme l'accès
    // libre au compte propriétaire depuis /m/demo.
    if (!AUTOLOGIN_AUTORISE || !DEMO_EMAIL || !DEMO_PASSWORD) {
      navigate('/login', { replace: true })
      return
    }
    autoLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function autoLogin() {
    setError(null)
    setStage('connecting')

    // v3.15 fix : essaye plusieurs URLs en cascade (tunnel principal → env → localhost)
    const candidates = getFallbacks(backend)
    let workingUrl: string | null = null
    for (const url of candidates) {
      if (await pingBackend(url)) { workingUrl = url; break }
    }

    if (!workingUrl) {
      setError(`Aucun serveur joignable. URLs testées :\n${candidates.map(u => `• ${u}`).join('\n')}`)
      setStage('error')
      return
    }

    // Update UI to show which URL we settled on
    if (workingUrl !== backend) setBackend(workingUrl)

    try {
      setStage('logging-in')

      // Auto-login sur l'URL qui répond
      const r = await fetch(`${workingUrl}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) {
        const txt = await r.text().catch(() => 'inconnue')
        throw new Error(`Login échoué (${r.status}) : ${txt.slice(0, 100)}`)
      }
      const data = await r.json()

      // Store auth
      setAuth({
        accessToken: data.accessToken || data.token || 'demo-token',
        user: data.user || { id: 'demo', email: DEMO_EMAIL, firstName: 'Admin', lastName: 'Demo' },
        companies: data.companies || [],
      })

      // Persist backend choice (utilisé par MobileLive, MobileSettings, etc.)
      localStorage.setItem('creorga.backend.remote', workingUrl)

      setStage('success')
      setTimeout(() => navigate('/m', { replace: true }), 1200)
    } catch (e: any) {
      setError(e?.message || 'Inconnue')
      setStage('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', padding: 24,
      background: 'linear-gradient(180deg,#0a0a14 0%, #1a0a2e 100%)', color: '#f1f5f9',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <AssistantMascot variant={a.mascot} size={120} animated speaking={stage === 'success'} listening={stage === 'connecting' || stage === 'logging-in'} />

      <h1 style={{
        margin: 0, fontSize: 26, fontWeight: 800, textAlign: 'center',
        background: 'linear-gradient(135deg,#a78bfa,#ec4899)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        {a.name}
      </h1>
      <div style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'center', maxWidth: 320 }}>
        {stage === 'connecting' && 'Connexion au serveur Creorga…'}
        {stage === 'logging-in' && 'Authentification automatique…'}
        {stage === 'success' && '✅ Connecté ! Redirection en cours…'}
        {stage === 'error' && (
          <span style={{ color: '#fca5a5' }}>
            <AlertCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
            {error}
          </span>
        )}
      </div>

      {(stage === 'connecting' || stage === 'logging-in') && (
        <Loader2 size={20} className="ai-spin" style={{ color: '#a78bfa' }} />
      )}

      {stage === 'success' && (
        <CheckCircle2 size={32} color="#10b981" />
      )}

      {(stage === 'error' || showConfig) && (
        <div style={{
          marginTop: 16, padding: 16, borderRadius: 14, width: '100%', maxWidth: 360,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a78bfa', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            <Globe size={14} /> URL serveur
          </div>
          <input
            value={backend} onChange={(e) => setBackend(e.target.value)}
            placeholder="https://creorga-tunnel.trycloudflare.com"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
              color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={autoLogin}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, fontSize: 12,
              }}>
              Réessayer
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
          <div style={{ marginTop: 10, fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>
            • <b>Local</b> : <code style={{ color: '#fbbf24' }}>http://localhost:3002</code> (si tu utilises l'app sur le PC du resto)<br />
            • <b>Distant</b> : URL Cloudflare Tunnel <code style={{ color: '#fbbf24' }}>https://xxx.trycloudflare.com</code> (depuis ton tel à l'étranger)
          </div>
        </div>
      )}

      {!showConfig && stage === 'success' && (
        <button onClick={() => setShowConfig(true)}
          style={{
            marginTop: 14, padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', cursor: 'pointer', fontSize: 11,
          }}>
          ⚙️ Changer le serveur
        </button>
      )}

      <div style={{
        position: 'absolute', bottom: 'calc(20px + env(safe-area-inset-bottom, 0))',
        fontSize: 10, color: '#64748b', textAlign: 'center', padding: '0 20px',
      }}>
        Creorga OS · Mode démo · {DEMO_EMAIL}
      </div>

      <style>{`@keyframes ai-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.ai-spin{animation:ai-spin 1s linear infinite}`}</style>
    </div>
  )
}
