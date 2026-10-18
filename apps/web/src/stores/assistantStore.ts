import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MascotVariant } from '@/components/AssistantMascot'
import { useAuthStore } from './authStore'
import { authDataScope } from '@/lib/authScope'

/**
 * Assistant store v3.18 — multi-conversations + multimodal attachments
 *
 * - mascot, name, voice : persisted
 * - conversations[] persisted (max 30, auto-archive old)
 * - currentConversationId : active thread
 * - messages : derived from current conversation
 * - attachments : runtime (image/scan/file uploaded with next message)
 */

export type AssistantMode = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface AssistantAttachment {
  id: string
  kind: 'image' | 'video' | 'file' | 'scan' | 'audio'
  name: string
  mimeType: string
  size: number
  dataUrl?: string     // base64 preview for image/scan
  url?: string         // server URL after upload
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  ts: number
  ui?: any
  cited?: string[]
  action?: { intent: string; success: boolean; summary: string }
  attachments?: AssistantAttachment[]
}

export interface AssistantConversation {
  id: string
  title: string
  messages: AssistantMessage[]
  createdAt: number
  updatedAt: number
  archived: boolean
}

export interface AssistantContext {
  scopeKey: string
  sessionVersion: number
  conversationId: string
  dataScope: string
}

interface AssistantHistory {
  conversations: AssistantConversation[]
  currentConversationId: string | null
}

function authScopeKey(): string | null {
  const auth = useAuthStore.getState()
  return auth.isAuthenticated && auth.user?.id && auth.companyId
    ? JSON.stringify([auth.user.id, auth.companyId, auth.businessAccess?.revision ?? 'unverified', auth.viewMode, auth.viewAsEmployeeId]) : null
}

const newId = () => Math.random().toString(36).slice(2, 12)

function autoTitle(firstUserText: string): string {
  const t = firstUserText.trim().replace(/\s+/g, ' ')
  if (!t) return 'Nouvelle discussion'
  if (t.length <= 38) return t
  return t.slice(0, 35) + '…'
}

interface AssistantState {
  // L'historique non attribuable n'est jamais ouvert automatiquement.
  histories: Record<string, AssistantHistory>
  quarantinedHistory?: unknown
  scopeKey: string | null
  sessionVersion: number
  captureContext: () => AssistantContext | null
  isCurrentContext: (context: AssistantContext | null) => boolean
  addMessageForContext: (context: AssistantContext | null, msg: Omit<AssistantMessage, 'id' | 'ts'>) => boolean
  // ─── Persisted settings ──────────────────────────────────────────────
  mascot: MascotVariant
  name: string
  voiceEnabled: boolean
  voiceSpeed: number
  autoListen: boolean
  panelMode: 'overlay' | 'dock' | 'full'
  panelSize: 'compact' | 'normal' | 'wide'
  launcherSize: 'compact' | 'normal'
  voiceProfile: 'auto' | 'masculine' | 'feminine' | 'robotic' | 'warm' | 'energetic'
  wakeWordEnabled: boolean
  drivingMode: boolean
  biometricGuard: boolean
  setMascot: (m: MascotVariant) => void
  setName: (n: string) => void
  setVoiceEnabled: (b: boolean) => void
  setVoiceSpeed: (s: number) => void
  setAutoListen: (b: boolean) => void
  setPanelMode: (m: 'overlay' | 'dock' | 'full') => void
  setPanelSize: (s: AssistantState['panelSize']) => void
  setLauncherSize: (s: AssistantState['launcherSize']) => void
  setVoiceProfile: (p: AssistantState['voiceProfile']) => void
  setWakeWordEnabled: (b: boolean) => void
  setDrivingMode: (b: boolean) => void
  setBiometricGuard: (b: boolean) => void

  // ─── Persisted conversations ─────────────────────────────────────────
  conversations: AssistantConversation[]
  currentConversationId: string | null
  newConversation: () => string                                     // returns new id
  selectConversation: (id: string) => void
  archiveConversation: (id: string) => void
  unarchiveConversation: (id: string) => void
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void

  // ─── Runtime ─────────────────────────────────────────────────────────
  open: boolean
  mode: AssistantMode
  attachments: AssistantAttachment[]                                // pending attachments for next message
  setOpen: (o: boolean) => void
  setMode: (m: AssistantMode) => void
  addAttachment: (a: Omit<AssistantAttachment, 'id'>) => string
  removeAttachment: (id: string) => void
  clearAttachments: () => void

  // ─── Backwards compat (existing code reads .messages / addMessage / clearMessages) ──
  messages: AssistantMessage[]
  addMessage: (msg: Omit<AssistantMessage, 'id' | 'ts'>) => void
  clearMessages: () => void
}

const DEFAULT_CONV_ID = newId()
const DEFAULT_CONV: AssistantConversation = {
  id: DEFAULT_CONV_ID,
  title: 'Nouvelle discussion',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  archived: false,
}

export const useAssistant = create<AssistantState>()(
  persist(
    (set, get) => ({
      histories: {},
      scopeKey: authScopeKey(),
      sessionVersion: useAuthStore.getState().sessionVersion,
      captureContext: () => {
        const s = get()
        return s.scopeKey && s.currentConversationId
          ? { scopeKey: s.scopeKey, sessionVersion: s.sessionVersion, conversationId: s.currentConversationId, dataScope: authDataScope(useAuthStore.getState()) } : null
      },
      isCurrentContext: (context) => {
        const s = get()
        return !!context && context.scopeKey === s.scopeKey && context.sessionVersion === s.sessionVersion
          && context.dataScope === authDataScope(useAuthStore.getState())
          && context.conversationId === s.currentConversationId
      },
      addMessageForContext: (context, msg) => {
        const s = get()
        if (!context || context.scopeKey !== s.scopeKey || context.sessionVersion !== s.sessionVersion
          || context.dataScope !== authDataScope(useAuthStore.getState())
          || !s.conversations.some(c => c.id === context.conversationId)) return false
        const ts = Date.now()
        const fullMsg: AssistantMessage = { ...msg, id: newId(), ts }
        set(state => {
          const conversations = state.conversations.map(c => c.id !== context.conversationId ? c : {
            ...c,
            title: c.messages.length === 0 && msg.role === 'user' ? autoTitle(msg.text) : c.title,
            messages: [...c.messages, fullMsg], updatedAt: ts,
          })
          return { conversations, messages: conversations.find(c => c.id === state.currentConversationId)?.messages ?? [] }
        })
        return true
      },
      // settings
      mascot: 'robot',
      name: 'Robi',
      voiceEnabled: true,
      voiceSpeed: 1.0,
      autoListen: false,
      panelMode: 'overlay',
      panelSize: 'compact',
      launcherSize: 'compact',
      voiceProfile: 'auto',
      wakeWordEnabled: false,
      drivingMode: false,
      biometricGuard: false,
      setMascot: (m) => set({ mascot: m }),
      setName: (n) => set({ name: n.trim() || 'Robi' }),
      setVoiceEnabled: (b) => set({ voiceEnabled: b }),
      setVoiceSpeed: (s) => set({ voiceSpeed: Math.max(0.5, Math.min(2, s)) }),
      setAutoListen: (b) => set({ autoListen: b }),
      setPanelMode: (m) => set({ panelMode: m }),
      setPanelSize: (s) => set({ panelSize: s }),
      setLauncherSize: (s) => set({ launcherSize: s }),
      setVoiceProfile: (p) => set({ voiceProfile: p }),
      setWakeWordEnabled: (b) => set({ wakeWordEnabled: b }),
      setDrivingMode: (b) => set({ drivingMode: b }),
      setBiometricGuard: (b) => set({ biometricGuard: b }),

      // conversations
      conversations: [DEFAULT_CONV],
      currentConversationId: DEFAULT_CONV_ID,
      newConversation: () => {
        const id = newId()
        const conv: AssistantConversation = {
          id, title: 'Nouvelle discussion', messages: [],
          createdAt: Date.now(), updatedAt: Date.now(), archived: false,
        }
        set((s) => ({
          conversations: [conv, ...s.conversations].slice(0, 30),
          currentConversationId: id,
          attachments: [],
          messages: [],
          mode: 'idle',
        }))
        return id
      },
      selectConversation: (id) => set((s) => {
        const conv = s.conversations.find((c) => c.id === id)
        if (!conv) return s
        return { currentConversationId: id, attachments: [], messages: conv.messages, mode: 'idle' }
      }),
      archiveConversation: (id) => set((s) => {
        const conversations = s.conversations.map((c) => c.id === id ? { ...c, archived: true } : c)
        if (s.currentConversationId !== id) return { conversations }

        const replacement = conversations.find((c) => !c.archived)
        if (replacement) {
          return {
            conversations,
            currentConversationId: replacement.id,
            messages: replacement.messages,
            attachments: [],
          }
        }

        const fresh: AssistantConversation = {
          id: newId(), title: 'Nouvelle discussion', messages: [],
          createdAt: Date.now(), updatedAt: Date.now(), archived: false,
        }
        return {
          conversations: [fresh, ...conversations],
          currentConversationId: fresh.id,
          messages: [],
          attachments: [],
        }
      }),
      unarchiveConversation: (id) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, archived: false } : c),
      })),
      deleteConversation: (id) => set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id)
        const next = remaining.length === 0
          ? [{ id: newId(), title: 'Nouvelle discussion', messages: [], createdAt: Date.now(), updatedAt: Date.now(), archived: false }]
          : remaining
        if (s.currentConversationId !== id) return { conversations: next }
        const replacement = next.find((c) => !c.archived) ?? next[0]
        return {
          conversations: next,
          currentConversationId: replacement.id,
          messages: replacement.messages,
          attachments: [],
        }
      }),
      renameConversation: (id, title) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, title: title.trim() || 'Sans titre', updatedAt: Date.now() } : c),
      })),

      // runtime
      open: false,
      mode: 'idle',
      attachments: [],
      setOpen: (o) => set({ open: o }),
      setMode: (m) => set({ mode: m }),
      addAttachment: (a) => {
        const id = newId()
        set((s) => ({ attachments: [...s.attachments, { ...a, id }] }))
        return id
      },
      removeAttachment: (id) => set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),
      clearAttachments: () => set({ attachments: [] }),

      // ─── BACKWARDS COMPAT — `messages` proxy current conversation (regular field, sync'd)
      messages: [] as AssistantMessage[],
      addMessage: (msg) => set((s) => {
        const id = newId()
        const ts = Date.now()
        const fullMsg: AssistantMessage = { ...msg, id, ts }
        const conversations = s.conversations.map((c) => {
          if (c.id !== s.currentConversationId) return c
          const wasEmpty = c.messages.length === 0 && msg.role === 'user'
          const newTitle = wasEmpty ? autoTitle(msg.text) : c.title
          return { ...c, title: newTitle, messages: [...c.messages, fullMsg], updatedAt: ts }
        })
        const currentConv = conversations.find((c) => c.id === s.currentConversationId)
        return { conversations, messages: currentConv?.messages || [] }
      }),
      clearMessages: () => set((s) => {
        const conversations = s.conversations.map((c) =>
          c.id === s.currentConversationId ? { ...c, messages: [], updatedAt: Date.now() } : c
        )
        return { conversations, messages: [] }
      }),
    }),
    {
      name: 'creorga-assistant',
      version: 3,
      migrate: (persistedState: any, version) => {
        if (version < 3 && persistedState) {
          const { conversations, currentConversationId, messages, attachments: _attachments, ...preferences } = persistedState
          return { ...preferences, histories: {}, quarantinedHistory: { conversations, currentConversationId, messages } }
        }
        return persistedState
      },
      merge: (persisted: any, current) => {
        const scopeKey = authScopeKey()
        const history = scopeKey ? persisted?.histories?.[scopeKey] : null
        const conversations = history?.conversations ?? [{ ...DEFAULT_CONV, id: newId(), messages: [] }]
        const currentConversationId = history?.currentConversationId ?? conversations[0]?.id ?? null
        return { ...current, ...persisted, scopeKey, sessionVersion: useAuthStore.getState().sessionVersion,
          conversations, currentConversationId, attachments: [], mode: 'idle', open: false,
          messages: conversations.find((c: AssistantConversation) => c.id === currentConversationId)?.messages ?? [],
        }
      },
      // v3.18.1 fix H1 : strip dataUrl des messages avant persist (sinon quota localStorage exploded
      // dès la 2ème pièce jointe image, base64 d'une image 5MB = ~7MB de string).
      // Les pièces jointes ne survivent pas un refresh — c'est OK, elles sont éphémères par design.
      partialize: (s) => ({
        mascot: s.mascot, name: s.name, voiceEnabled: s.voiceEnabled,
        voiceSpeed: s.voiceSpeed, autoListen: s.autoListen, panelMode: s.panelMode,
        panelSize: s.panelSize, launcherSize: s.launcherSize,
        voiceProfile: s.voiceProfile, wakeWordEnabled: s.wakeWordEnabled,
        drivingMode: s.drivingMode, biometricGuard: s.biometricGuard,
        histories: Object.fromEntries(Object.entries({ ...s.histories,
          ...(s.scopeKey ? { [s.scopeKey]: { conversations: s.conversations, currentConversationId: s.currentConversationId } } : {}),
        }).map(([key, history]) => [key, {
          ...history,
          conversations: history.conversations.map(c => ({ ...c, messages: c.messages.map(m => ({
            ...m, attachments: m.attachments?.map(({ dataUrl: _dataUrl, ...attachment }) => attachment),
          })) })),
        }])),
        quarantinedHistory: s.quarantinedHistory,
      }),
    }
  )
)

// La portée change avant le prochain rendu, pas seulement au montage du panneau.
const unsubscribeAuthScope = useAuthStore.subscribe((auth, previous) => {
  if (authDataScope(auth) === authDataScope(previous)) return
  const state = useAssistant.getState()
  const histories = { ...state.histories }
  if (state.scopeKey) histories[state.scopeKey] = { conversations: state.conversations, currentConversationId: state.currentConversationId }
  const scopeKey = authScopeKey()
  const history = scopeKey ? histories[scopeKey] : null
  const conversations = history?.conversations ?? [{ ...DEFAULT_CONV, id: newId(), messages: [] }]
  const currentConversationId = history?.currentConversationId ?? conversations[0]?.id ?? null
  useAssistant.setState({ histories, scopeKey, sessionVersion: auth.sessionVersion, conversations, currentConversationId,
    messages: conversations.find(c => c.id === currentConversationId)?.messages ?? [], attachments: [], mode: 'idle', open: false,
  })
})

// Le laboratoire Vite ne doit pas conserver un ancien abonné après remplacement.
;(import.meta as any).hot?.dispose(unsubscribeAuthScope)
