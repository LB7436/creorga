/**
 * Creorga Analytics
 * ----------------------------------------------------------
 * Wrapper analytics mock, prêt à être branché sur Plausible,
 * Fathom ou Umami. Respectueux de la vie privée (pas de cookies),
 * hébergé au Luxembourg.
 *
 * Usage :
 *   import { trackEvent, useAnalytics } from '@/lib/analytics'
 *   trackEvent('order_created', { total: 42.50 })
 */

import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type AnalyticsEventName =
  | 'order_created'
  | 'order_cancelled'
  | 'order_paid'
  | 'invoice_generated'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'client_added'
  | 'client_updated'
  | 'client_deleted'
  | 'product_added'
  | 'employee_added'
  | 'reservation_created'
  | 'module_opened'
  | 'login'
  | 'logout'
  | 'search_performed'
  | 'shortcut_used'
  | 'error_reported'
  | 'help_opened'
  | 'settings_changed'
  | string

interface AnalyticsEvent {
  name: string
  props?: Record<string, unknown>
  timestamp: number
  sessionId: string
  path: string
}

interface AnalyticsSession {
  id: string
  startedAt: number
  lastSeenAt: number
  pageViews: number
  events: number
}

/* ------------------------------------------------------------------ */
/* Constantes                                                         */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'creorga_analytics_session'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 min
const QUEUE_KEY = 'creorga_analytics_queue'
const MAX_QUEUE = 200

const ANALYTICS_ENDPOINT =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_ANALYTICS_URL) ||
  '' // vide = mock console uniquement

/* ------------------------------------------------------------------ */
/* Session                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getSession(): AnalyticsSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const s = JSON.parse(raw) as AnalyticsSession
      if (Date.now() - s.lastSeenAt < SESSION_TIMEOUT) {
        s.lastSeenAt = Date.now()
        localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        return s
      }
    }
  } catch {
    /* ignore */
  }
  const fresh: AnalyticsSession = {
    id: generateId(),
    startedAt: Date.now(),
    lastSeenAt: Date.now(),
    pageViews: 0,
    events: 0,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(fresh))
  return fresh
}

function saveSession(s: AnalyticsSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

/* ------------------------------------------------------------------ */
/* Envoi                                                              */
/* ------------------------------------------------------------------ */

function queueEvent(evt: AnalyticsEvent): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const queue: AnalyticsEvent[] = raw ? JSON.parse(raw) : []
    queue.push(evt)
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    /* ignore */
  }
}

function dispatch(evt: AnalyticsEvent): void {
  // Dev : log console
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.DEV
  ) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', evt.name, evt.props ?? {})
  }

  // Production : envoi asynchrone
  if (ANALYTICS_ENDPOINT && typeof navigator !== 'undefined') {
    try {
      const body = JSON.stringify(evt)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, body)
      } else {
        fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => queueEvent(evt))
      }
    } catch {
      queueEvent(evt)
    }
  }
}

/* ------------------------------------------------------------------ */
/* API publique                                                       */
/* ------------------------------------------------------------------ */

export function trackPageView(path: string): void {
  const session = getSession()
  session.pageViews += 1
  session.lastSeenAt = Date.now()
  saveSession(session)

  dispatch({
    name: 'pageview',
    props: { path, referrer: document.referrer || null },
    timestamp: Date.now(),
    sessionId: session.id,
    path,
  })
}

export function trackEvent(
  name: AnalyticsEventName,
  props?: Record<string, unknown>,
): void {
  const session = getSession()
  session.events += 1
  session.lastSeenAt = Date.now()
  saveSession(session)

  dispatch({
    name,
    props,
    timestamp: Date.now(),
    sessionId: session.id,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
  })
}

export function trackTiming(name: string, duration: number): void {
  trackEvent('timing', { name, duration })
}

export function trackError(error: unknown, context?: string): void {
  const err = error instanceof Error ? error : new Error(String(error))
  trackEvent('error_reported', {
    message: err.message,
    stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    context,
  })
}

export function getCurrentSession(): AnalyticsSession {
  return getSession()
}

export function resetSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

/* Evénements prédéfinis --------------------------------------------- */

export const AnalyticsEvents = {
  ORDER_CREATED: 'order_created',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_PAID: 'order_paid',
  INVOICE_GENERATED: 'invoice_generated',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_PAID: 'invoice_paid',
  CLIENT_ADDED: 'client_added',
  CLIENT_UPDATED: 'client_updated',
  CLIENT_DELETED: 'client_deleted',
  PRODUCT_ADDED: 'product_added',
  EMPLOYEE_ADDED: 'employee_added',
  RESERVATION_CREATED: 'reservation_created',
  MODULE_OPENED: 'module_opened',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SEARCH_PERFORMED: 'search_performed',
  SHORTCUT_USED: 'shortcut_used',
  HELP_OPENED: 'help_opened',
  SETTINGS_CHANGED: 'settings_changed',
} as const

/* ------------------------------------------------------------------ */
/* Hook React                                                         */
/* ------------------------------------------------------------------ */

export function useAnalytics() {
  const location = useLocation()

  // auto-track des page views
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

  const track = useCallback(
    (name: AnalyticsEventName, props?: Record<string, unknown>) => {
      trackEvent(name, props)
    },
    [],
  )

  const timing = useCallback((name: string, duration: number) => {
    trackTiming(name, duration)
  }, [])

  const error = useCallback((err: unknown, context?: string) => {
    trackError(err, context)
  }, [])

  return {
    track,
    timing,
    error,
    session: getCurrentSession(),
    events: AnalyticsEvents,
  }
}

export default {
  trackPageView,
  trackEvent,
  trackTiming,
  trackError,
  getCurrentSession,
  resetSession,
  AnalyticsEvents,
  useAnalytics,
}
