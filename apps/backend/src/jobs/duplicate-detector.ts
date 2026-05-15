/**
 * v4.6 — Détecteur de doublons clients.
 *
 * Worker setInterval(24h) qui scanne data/customers.json :
 *   1. Normalise nom+prénom (lowercase, strip accents, trim, collapse spaces)
 *   2. Normalise téléphone (digits only, last 8 chars pour matcher préfixes pays)
 *   3. Levenshtein < 2 sur nom + similarité téléphone → suggère fusion
 *   4. Broadcast via globalThis.liveBroadcast('inbox', 'duplicate-suggestion', payload)
 *
 * Pas d'écriture dans customers.json — uniquement détection + notification.
 *
 * TODO follow-up : POST /api/crm/merge-customers pour fusionner depuis l'UI.
 * Le fichier crm.ts est zone interdite ce commit (Codex en cours).
 */

import fs from 'fs'
import path from 'path'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json')
const NOTIFS_FILE = path.join(DATA_DIR, 'duplicate-notifs.json')

interface Customer {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  phone?: string
  email?: string
  [k: string]: any
}

interface DuplicateSuggestion {
  id: string
  ts: number
  customerA: { id: string; label: string; phone?: string; email?: string }
  customerB: { id: string; label: string; phone?: string; email?: string }
  reason: string
  confidence: number
}

// ─── Normalisation ─────────────────────────────────────────────────────
function normalizeName(c: Customer): string {
  const full = (c.name ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`).trim()
  return full
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(c: Customer): string {
  const digits = String(c.phone ?? '').replace(/\D/g, '')
  return digits.slice(-8) // garde les 8 derniers chiffres (élimine indicatifs pays)
}

function normalizeEmail(c: Customer): string {
  return String(c.email ?? '').toLowerCase().trim()
}

// ─── Levenshtein (DP classique, O(m*n)) ────────────────────────────────
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const dp: number[] = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) dp[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[b.length]
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch { return fallback }
}

function writeJson(file: string, data: unknown): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  } catch { /* */ }
}

// ─── Scan principal ────────────────────────────────────────────────────
function scan(): DuplicateSuggestion[] {
  const customers = readJson<Customer[]>(CUSTOMERS_FILE, [])
  if (!Array.isArray(customers) || customers.length < 2) return []

  const suggestions: DuplicateSuggestion[] = []
  const alreadyNotified = new Set(
    readJson<DuplicateSuggestion[]>(NOTIFS_FILE, [])
      .map((n) => `${n.customerA.id}::${n.customerB.id}`)
  )

  // Comparaison O(n²) — acceptable pour <1000 clients
  for (let i = 0; i < customers.length; i++) {
    const a = customers[i]
    const nameA = normalizeName(a)
    const phoneA = normalizePhone(a)
    const emailA = normalizeEmail(a)
    if (!nameA && !phoneA && !emailA) continue

    for (let j = i + 1; j < customers.length; j++) {
      const b = customers[j]
      const nameB = normalizeName(b)
      const phoneB = normalizePhone(b)
      const emailB = normalizeEmail(b)

      // Skip si pair déjà notifié
      const pairKey = `${a.id}::${b.id}`
      const reversedKey = `${b.id}::${a.id}`
      if (alreadyNotified.has(pairKey) || alreadyNotified.has(reversedKey)) continue

      let reason = ''
      let confidence = 0

      // Email exact = très haute confiance
      if (emailA && emailB && emailA === emailB) {
        reason = 'Même email'
        confidence = 0.98
      }
      // Téléphone identique = haute confiance
      else if (phoneA && phoneA === phoneB && phoneA.length >= 6) {
        reason = 'Même numéro de téléphone'
        confidence = 0.9
      }
      // Nom très proche (Levenshtein < 2) + téléphone similaire (>=4 digits identiques) = moyen
      else if (nameA && nameB && nameA.length >= 4) {
        const dist = levenshtein(nameA, nameB)
        if (dist < 2) {
          const sharedPhonePrefix = phoneA && phoneB
            && phoneA.slice(0, 4) === phoneB.slice(0, 4)
          if (sharedPhonePrefix) {
            reason = `Noms quasi identiques (distance ${dist}) + téléphones similaires`
            confidence = 0.75
          } else if (dist === 0) {
            reason = 'Noms identiques'
            confidence = 0.65
          }
        }
      }

      if (confidence < 0.65) continue

      suggestions.push({
        id: 'dup-' + Math.random().toString(36).slice(2, 10),
        ts: Date.now(),
        customerA: { id: a.id, label: a.name ?? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim(), phone: a.phone, email: a.email },
        customerB: { id: b.id, label: b.name ?? `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim(), phone: b.phone, email: b.email },
        reason,
        confidence,
      })
    }
  }

  return suggestions
}

function broadcastSuggestions(suggestions: DuplicateSuggestion[]): void {
  const broadcast = (globalThis as any).liveBroadcast
  for (const s of suggestions) {
    if (typeof broadcast === 'function') {
      try {
        broadcast('inbox', 'duplicate-suggestion', s)
      } catch { /* broadcast peut être indisponible */ }
    }
  }
  // Persiste les notifs pour dédup
  if (suggestions.length > 0) {
    const previous = readJson<DuplicateSuggestion[]>(NOTIFS_FILE, [])
    const merged = [...suggestions, ...previous].slice(0, 200)
    writeJson(NOTIFS_FILE, merged)
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────
let timer: NodeJS.Timeout | null = null
const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000

export function startDuplicateDetector(): void {
  if (timer) return
  // Scan initial après 30s (laisse backend boot)
  setTimeout(() => {
    try { broadcastSuggestions(scan()) } catch { /* */ }
  }, 30_000)
  // Scan récurrent toutes les 24h
  timer = setInterval(() => {
    try { broadcastSuggestions(scan()) } catch { /* */ }
  }, SCAN_INTERVAL_MS)
}

export function stopDuplicateDetector(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function listDuplicateSuggestions(limit = 50): DuplicateSuggestion[] {
  return readJson<DuplicateSuggestion[]>(NOTIFS_FILE, []).slice(0, limit)
}
