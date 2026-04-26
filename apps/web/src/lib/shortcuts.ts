/**
 * Creorga Shortcuts
 * ----------------------------------------------------------
 * Gestionnaire global de raccourcis clavier.
 * Supporte Mac (Cmd) et Windows/Linux (Ctrl) automatiquement.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { trackEvent } from './analytics'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ShortcutCategory =
  | 'navigation'
  | 'modules'
  | 'actions'
  | 'general'
  | 'accessibility'

export interface Shortcut {
  id: string
  keys: string          // "mod+k", "alt+1", "esc"
  label: string         // texte affiché
  description?: string
  category: ShortcutCategory
  handler: (e: KeyboardEvent) => void
  enabled?: boolean
  preventDefault?: boolean
}

/* ------------------------------------------------------------------ */
/* Plateforme                                                         */
/* ------------------------------------------------------------------ */

export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)

export const MOD_KEY = isMac ? '⌘' : 'Ctrl'
export const ALT_KEY = isMac ? '⌥' : 'Alt'
export const SHIFT_KEY = isMac ? '⇧' : 'Shift'

/* ------------------------------------------------------------------ */
/* Store simple                                                       */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>()
const shortcuts = new Map<string, Shortcut>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): Shortcut[] {
  return Array.from(shortcuts.values())
}

/* ------------------------------------------------------------------ */
/* Parsing & matching                                                 */
/* ------------------------------------------------------------------ */

function normalizeKeys(keys: string): string {
  return keys
    .toLowerCase()
    .split('+')
    .map((k) => k.trim())
    .sort()
    .join('+')
}

function matchEvent(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split('+').map((s) => s.trim())
  const needsMod = parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl')
  const needsAlt = parts.includes('alt') || parts.includes('option')
  const needsShift = parts.includes('shift')
  const mainKey = parts.find(
    (p) => !['mod', 'cmd', 'ctrl', 'alt', 'option', 'shift'].includes(p),
  )

  const modPressed = isMac ? e.metaKey : e.ctrlKey
  if (needsMod && !modPressed) return false
  if (!needsMod && modPressed && mainKey !== 'esc') return false
  if (needsAlt && !e.altKey) return false
  if (!needsAlt && e.altKey) return false
  if (needsShift && !e.shiftKey) return false

  if (!mainKey) return false
  const evtKey = e.key.toLowerCase()
  if (mainKey === 'esc') return evtKey === 'escape'
  return evtKey === mainKey
}

/* ------------------------------------------------------------------ */
/* API publique                                                       */
/* ------------------------------------------------------------------ */

export function registerShortcut(shortcut: Shortcut): () => void {
  shortcuts.set(shortcut.id, { enabled: true, preventDefault: true, ...shortcut })
  emit()
  return () => unregisterShortcut(shortcut.id)
}

export function unregisterShortcut(id: string): void {
  shortcuts.delete(id)
  emit()
}

export function getAllShortcuts(): Shortcut[] {
  return Array.from(shortcuts.values())
}

export function getShortcutsByCategory(): Record<ShortcutCategory, Shortcut[]> {
  const map: Record<ShortcutCategory, Shortcut[]> = {
    navigation: [],
    modules: [],
    actions: [],
    general: [],
    accessibility: [],
  }
  shortcuts.forEach((s) => {
    map[s.category].push(s)
  })
  return map
}

export function formatKeys(keys: string): string {
  return keys
    .split('+')
    .map((k) => {
      const t = k.trim().toLowerCase()
      if (t === 'mod' || t === 'cmd' || t === 'ctrl') return MOD_KEY
      if (t === 'alt' || t === 'option') return ALT_KEY
      if (t === 'shift') return SHIFT_KEY
      if (t === 'esc') return 'Esc'
      return t.toUpperCase()
    })
    .join(' + ')
}

/* ------------------------------------------------------------------ */
/* Listener global                                                    */
/* ------------------------------------------------------------------ */

let globalListenerInstalled = false

function installGlobalListener(): void {
  if (globalListenerInstalled || typeof window === 'undefined') return
  globalListenerInstalled = true

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isTyping =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)

    for (const s of shortcuts.values()) {
      if (s.enabled === false) continue
      if (!matchEvent(e, s.keys)) continue

      // quand on tape dans un champ, on n'accepte que les combos avec Mod
      if (isTyping) {
        const hasMod = /mod|cmd|ctrl/i.test(s.keys)
        if (!hasMod && s.keys.toLowerCase() !== 'esc') continue
      }

      if (s.preventDefault !== false) e.preventDefault()
      try {
        s.handler(e)
        trackEvent('shortcut_used', { id: s.id, keys: s.keys })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[shortcuts] handler failed', s.id, err)
      }
      return
    }
  })
}

if (typeof window !== 'undefined') {
  installGlobalListener()
}

/* ------------------------------------------------------------------ */
/* Hooks React                                                        */
/* ------------------------------------------------------------------ */

export function useShortcut(shortcut: Shortcut): void {
  useEffect(() => {
    const unregister = registerShortcut(shortcut)
    return () => unregister()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcut.id, shortcut.keys, shortcut.enabled])
}

export function useAllShortcuts(): Shortcut[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/* ------------------------------------------------------------------ */
/* Export utilitaires                                                 */
/* ------------------------------------------------------------------ */

export { normalizeKeys }

export const DEFAULT_SHORTCUTS_INFO: Array<Omit<Shortcut, 'handler'>> = [
  { id: 'open-palette', keys: 'mod+k', label: 'Ouvrir la palette de commandes', category: 'general' },
  { id: 'show-help', keys: 'mod+/', label: 'Afficher les raccourcis', category: 'general' },
  { id: 'new-order', keys: 'mod+n', label: 'Nouvelle commande', category: 'actions' },
  { id: 'go-dashboard', keys: 'mod+d', label: 'Aller au tableau de bord', category: 'navigation' },
  { id: 'refresh-module', keys: 'mod+r', label: 'Rafraîchir le module', category: 'actions' },
  { id: 'close-modal', keys: 'esc', label: 'Fermer / Annuler', category: 'general' },
  { id: 'module-1', keys: 'alt+1', label: 'Module 1', category: 'modules' },
  { id: 'module-2', keys: 'alt+2', label: 'Module 2', category: 'modules' },
  { id: 'module-3', keys: 'alt+3', label: 'Module 3', category: 'modules' },
  { id: 'module-4', keys: 'alt+4', label: 'Module 4', category: 'modules' },
  { id: 'module-5', keys: 'alt+5', label: 'Module 5', category: 'modules' },
  { id: 'module-6', keys: 'alt+6', label: 'Module 6', category: 'modules' },
  { id: 'module-7', keys: 'alt+7', label: 'Module 7', category: 'modules' },
  { id: 'module-8', keys: 'alt+8', label: 'Module 8', category: 'modules' },
  { id: 'module-9', keys: 'alt+9', label: 'Module 9', category: 'modules' },
]

export default {
  registerShortcut,
  unregisterShortcut,
  getAllShortcuts,
  getShortcutsByCategory,
  formatKeys,
  useShortcut,
  useAllShortcuts,
  isMac,
  MOD_KEY,
  ALT_KEY,
  SHIFT_KEY,
}
