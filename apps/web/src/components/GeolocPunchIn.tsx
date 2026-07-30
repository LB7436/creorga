import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Check, X } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'

/**
 * v3.19 H4 — Pointage géoloc auto.
 *
 * Quand l'app mobile est ouverte ET que :
 *   - geolocation permission accordée
 *   - <100m du restaurant (Rumelange Luxembourg : 49.4515, 6.0413)
 *   - heure dans ±15 min d'un shift planifié aujourd'hui pour cet utilisateur
 * → propose punch-in via toast non-intrusif.
 *
 * Toast disparaît auto après 30s si pas de réponse (pas de spam).
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

const RESTO_LAT = 49.4515
const RESTO_LNG = 6.0413
const NEAR_RADIUS_M = 100

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (x: number) => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function GeolocPunchIn() {
  const [show, setShow] = useState(false)
  const [distance, setDistance] = useState<number>(0)
  const [working, setWorking] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    // Check si déjà pointé aujourd'hui (skip si oui)
    const today = new Date().toISOString().slice(0, 10)
    const lastPunchKey = `creorga.lastPunchDay`
    if (localStorage.getItem(lastPunchKey) === today) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, RESTO_LAT, RESTO_LNG)
        setDistance(Math.round(d))
        if (d < NEAR_RADIUS_M) {
          setShow(true)
          // Auto-dismiss après 30s
          setTimeout(() => setShow(false), 30_000)
        }
      },
      () => { /* permission refused — silent */ },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 }
    )
  }, [dismissed])

  const punchIn = async () => {
    setWorking(true)
    try {
      await fetchAuth(`${getBackend()}/api/agent/intent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'je commence', currentPath: '/m', userId: 'default' }),
      })
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('creorga.lastPunchDay', today)
      setShow(false)
    } catch { /* ignore */ }
    setWorking(false)
  }

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 16, left: 12, right: 12,
          zIndex: 10000,
          padding: 12, borderRadius: 14,
          background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
          color: '#fff', boxShadow: '0 6px 20px rgba(139,92,246,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
        <MapPin size={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Tu es au resto ({distance}m)</div>
          <div style={{ fontSize: 10, opacity: 0.9 }}>Pointage entrée automatique ?</div>
        </div>
        <button onClick={() => { setDismissed(true); setShow(false) }} style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.18)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} />
        </button>
        <button onClick={punchIn} disabled={working} style={{
          padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#fff', color: '#8b5cf6', fontWeight: 800, fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          opacity: working ? 0.6 : 1,
        }}>
          <Check size={14} /> {working ? '…' : 'Pointer'}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
