import type { MascotVariant } from '@/components/AssistantMascot'

/**
 * Assistant runtime features (v3.12) :
 *  - getMascotVoice : pick a system voice that fits the mascot personality (#7)
 *  - useWakeWord    : Web Speech API in continuous mode listening for "Hey Robi" (#1)
 *  - biometricCheck : WebAuthn challenge for destructive actions (#14)
 *  - getLocationStatus : detects if user is at the restaurant or remote (#18)
 */

/* ─── #7 Voix par mascotte ───────────────────────────────────────────── */

export interface VoiceParams {
  voice?: SpeechSynthesisVoice
  rate: number
  pitch: number
  volume: number
}

const PROFILE_BY_MASCOT: Record<MascotVariant, { rate: number; pitch: number; preferGender?: 'male' | 'female' }> = {
  robot:   { rate: 1.0, pitch: 0.85, preferGender: 'male' },     // métallique
  spark:   { rate: 1.1, pitch: 1.3,  preferGender: 'female' },   // énergique magique
  chef:    { rate: 0.95, pitch: 1.0, preferGender: 'male' },     // chaleureux
  fox:     { rate: 1.05, pitch: 1.2, preferGender: 'female' },   // mignon
  crystal: { rate: 1.0, pitch: 1.4 },                            // mystique aigu
  cup:     { rate: 0.92, pitch: 1.05, preferGender: 'female' },  // doux
}

export function getMascotVoiceParams(mascot: MascotVariant, profile: string): VoiceParams {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth) return { rate: 1, pitch: 1, volume: 1 }
  const voices = synth.getVoices().filter((v) => v.lang.startsWith('fr'))

  const config = PROFILE_BY_MASCOT[mascot] || { rate: 1, pitch: 1 }

  // Profile override
  let prefGender = config.preferGender
  if (profile === 'masculine') prefGender = 'male'
  else if (profile === 'feminine') prefGender = 'female'

  let voice = voices[0]
  if (prefGender) {
    const guess = voices.find((v) => {
      const n = v.name.toLowerCase()
      if (prefGender === 'male')   return /male|homme|paul|thomas|claude|hugo/.test(n)
      if (prefGender === 'female') return /female|femme|marie|amelie|julie|virginie/.test(n)
      return false
    })
    if (guess) voice = guess
  }

  let rateMul = 1, pitchMul = 1
  if (profile === 'energetic') { rateMul = 1.15; pitchMul = 1.1 }
  if (profile === 'warm')      { rateMul = 0.95; pitchMul = 0.95 }
  if (profile === 'robotic')   { rateMul = 1; pitchMul = 0.7 }

  return {
    voice,
    rate:   config.rate * rateMul,
    pitch:  config.pitch * pitchMul,
    volume: 1,
  }
}

export function speak(text: string, params: VoiceParams, onEnd?: () => void) {
  const synth = window.speechSynthesis
  if (!synth) return
  synth.cancel()
  const cleanText = text.replace(/[*_`#✅❌🚪🌙☀️🎓🔍📅✨🤖💬🎤📋📑🚨📊🔗⏰🎂💶📈📉🥺⭐🆕😞💸🛵🛒🌱🌍🎵📱📺💾🎭👔🍽🍳🧑‍💼🎉]/g, '').replace(/\[Sources?:.*?\]/g, '').trim()
  const u = new SpeechSynthesisUtterance(cleanText)
  u.lang = 'fr-FR'
  u.rate = params.rate
  u.pitch = params.pitch
  u.volume = params.volume
  if (params.voice) u.voice = params.voice
  if (onEnd) u.onend = onEnd
  synth.speak(u)
}

/* ─── #14 Biométrie WebAuthn ────────────────────────────────────────── */

export async function biometricChallenge(reason = 'Confirmer l\'action sensible'): Promise<boolean> {
  if (!('credentials' in navigator) || !window.PublicKeyCredential) {
    return confirm(`${reason}\n\nWebAuthn non disponible — confirmer manuellement ?`)
  }
  try {
    // Quick check : platform authenticator (Touch ID / Face ID / Windows Hello)
    const available = await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable?.()
    if (!available) return confirm(`${reason}\n\nPas de capteur biométrique — confirmer ?`)

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    // Use a simple "get" assertion against a stored credential (or any)
    const cred = await (navigator.credentials as any).get({
      publicKey: {
        challenge,
        timeout: 30_000,
        rpId: window.location.hostname,
        userVerification: 'required',
      },
      mediation: 'optional' as any,
    }).catch(() => null)
    return !!cred
  } catch {
    return confirm(`${reason}\n\nBiométrie échouée — confirmer manuellement ?`)
  }
}

/* ─── #18 Géolocalisation ───────────────────────────────────────────── */

export interface LocationStatus {
  available: boolean
  isAtRestaurant: boolean
  distanceMeters?: number
  city?: string
  reason?: string
}

const RESTAURANT_LATLNG = { lat: 49.4515, lng: 6.0413 } // Rumelange
const AT_RESTAURANT_RADIUS_M = 200

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const aa = Math.sin(dLat / 2) ** 2 +
             Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
             Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}

export async function getLocationStatus(): Promise<LocationStatus> {
  if (!navigator.geolocation) return { available: false, isAtRestaurant: false, reason: 'API indisponible' }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          RESTAURANT_LATLNG,
        )
        resolve({
          available: true,
          isAtRestaurant: dist < AT_RESTAURANT_RADIUS_M,
          distanceMeters: Math.round(dist),
        })
      },
      (err) => resolve({ available: false, isAtRestaurant: false, reason: err.message }),
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 5 * 60 * 1000 },
    )
  })
}

/* ─── #1 Wake word continu "Hey Robi" ────────────────────────────────── */

export class WakeWordListener {
  private rec: any = null
  private active = false
  private name: string
  private onWake: () => void
  constructor(name: string, onWake: () => void) {
    this.name = (name || 'robi').toLowerCase()
    this.onWake = onWake
  }
  start() {
    if (this.active) return
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    this.active = true
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let txt = ''
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript.toLowerCase()
      // Wake words : "hey {name}", "{name}", "ok {name}", "salut {name}"
      const triggers = [
        new RegExp(`\\b(?:hey|h[ée]|ok|salut|bonjour)\\s+${this.name}\\b`),
        new RegExp(`\\b${this.name}[\\s,!?]`),
      ]
      if (triggers.some((re) => re.test(txt))) {
        this.onWake()
      }
    }
    rec.onerror = () => { /* keep listening — chrome restarts */ }
    rec.onend = () => {
      // Auto-restart while active
      if (this.active) try { rec.start() } catch { /* ignore */ }
    }
    this.rec = rec
    try { rec.start() } catch { /* ignore */ }
  }
  stop() {
    this.active = false
    try { this.rec?.stop() } catch { /* ignore */ }
    this.rec = null
  }
}

/* ─── #11 Push notifications subscribe ───────────────────────────────── */

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!('Notification' in window)) return { ok: false, reason: 'API Notification absente' }
  if (Notification.permission === 'denied') return { ok: false, reason: 'Permission refusée' }
  if (Notification.permission !== 'granted') {
    const res = await Notification.requestPermission()
    if (res !== 'granted') return { ok: false, reason: res }
  }
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'Service Worker absent' }
  const reg = await navigator.serviceWorker.ready
  // Demo : subscribe with a public dummy key (real deployment would use VAPID)
  // For local mode we just register the permission and use server-sent push via fetch poll
  return { ok: true, reason: 'Permissions OK · Service Worker prêt' }
}

export function showLocalNotification(title: string, body: string, url?: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'creorga-' + Date.now(),
          data: { url },
        }))
    } else {
      new Notification(title, { body, icon: '/icon-192.png' })
    }
  } catch { /* ignore */ }
}
