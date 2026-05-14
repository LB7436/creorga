export type GuestProvider = 'email' | 'google' | 'apple'

export interface GuestClientProfile {
  id: string
  displayName: string
  email: string
  phone: string
  provider: GuestProvider
  createdAt: number
  updatedAt: number
}

export interface GuestClientEvent {
  id: string
  type: 'registration' | 'game_start' | 'order' | 'review' | 'chat' | 'invite'
  profileId: string | null
  createdAt: number
  payload: Record<string, unknown>
}

const PROFILE_KEY = 'creorga-guest-client-profile-v1'
const EVENTS_KEY = 'creorga-guest-client-events-v1'
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

function uid(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `${prefix}-${random}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function loadGuestClient(): GuestClientProfile | null {
  return readJson<GuestClientProfile | null>(PROFILE_KEY, null)
}

export function saveGuestClient(input: {
  displayName: string
  email: string
  phone: string
  provider: GuestProvider
}) {
  const now = Date.now()
  const previous = loadGuestClient()
  const profile: GuestClientProfile = {
    id: previous?.id ?? uid('guest'),
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    provider: input.provider,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  }
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  fetch(`${BACKEND}/api/portal-config/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  }).catch(() => undefined)
  recordGuestEvent('registration', profile, {
    provider: profile.provider,
    displayName: profile.displayName,
    email: profile.email,
    phone: profile.phone,
  })
  window.dispatchEvent(new CustomEvent('creorga-guest-client-updated', { detail: profile }))
  return profile
}

export function loadGuestEvents(): GuestClientEvent[] {
  return readJson<GuestClientEvent[]>(EVENTS_KEY, [])
}

export function recordGuestEvent(
  type: GuestClientEvent['type'],
  profile: GuestClientProfile | null,
  payload: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return null
  const event: GuestClientEvent = {
    id: uid('event'),
    type,
    profileId: profile?.id ?? null,
    createdAt: Date.now(),
    payload,
  }
  const next = [event, ...loadGuestEvents()].slice(0, 200)
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(next))
  fetch(`${BACKEND}/api/portal-config/client-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, profile }),
  }).catch(() => undefined)
  window.dispatchEvent(new CustomEvent('creorga-guest-client-event', { detail: event }))
  return event
}

export function guestDisplayName(profile: GuestClientProfile | null) {
  return profile?.displayName?.trim() || 'Invite'
}
