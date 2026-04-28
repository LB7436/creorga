import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MascotVariant } from '@/components/AssistantMascot'

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

const newId = () => Math.random().toString(36).slice(2, 12)

function autoTitle(firstUserText: string): string {
  const t = firstUserText.trim().replace(/\s+/g, ' ')
  if (!t) return 'Nouvelle discussion'
  if (t.length <= 38) return t
  return t.slice(0, 35) + '…'
}

interface AssistantState {
  // ─── Persisted settings ──────────────────────────────────────────────
  mascot: MascotVariant
  name: string
  voiceEnabled: boolean
  voiceSpeed: number
  autoListen: boolean
  panelMode: 'overlay' | 'dock' | 'full'
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
      // settings
      mascot: 'robot',
      name: 'Robi',
      voiceEnabled: true,
      voiceSpeed: 1.0,
      autoListen: false,
      panelMode: 'overlay',
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
        }))
        return id
      },
      selectConversation: (id) => set((s) => {
        const conv = s.conversations.find((c) => c.id === id)
        return { currentConversationId: id, attachments: [], messages: conv?.messages || [] }
      }),
      archiveConversation: (id) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, archived: true } : c),
      })),
      unarchiveConversation: (id) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, archived: false } : c),
      })),
      deleteConversation: (id) => set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id)
        const next = remaining.length === 0
          ? [{ id: newId(), title: 'Nouvelle discussion', messages: [], createdAt: Date.now(), updatedAt: Date.now(), archived: false }]
          : remaining
        return {
          conversations: next,
          currentConversationId: s.currentConversationId === id ? next[0].id : s.currentConversationId,
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
      version: 2, // bump pour forcer migration
      migrate: (persistedState: any, version) => {
        // v1 → v2 : ancien store avait juste `messages: []` au top niveau
        if (version < 2 && persistedState) {
          const oldMessages = (persistedState.messages || []) as AssistantMessage[]
          const conv: AssistantConversation = {
            id: newId(),
            title: oldMessages.length > 0 ? autoTitle(oldMessages[0]?.text || 'Discussion') : 'Nouvelle discussion',
            messages: oldMessages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            archived: false,
          }
          return {
            ...persistedState,
            conversations: [conv],
            currentConversationId: conv.id,
            attachments: [],
            messages: oldMessages,
          }
        }
        return persistedState
      },
      onRehydrateStorage: () => (state) => {
        // sync messages from currentConversation après rehydration
        if (state) {
          const conv = state.conversations.find((c) => c.id === state.currentConversationId)
          state.messages = conv?.messages || []
        }
      },
      // v3.18.1 fix H1 : strip dataUrl des messages avant persist (sinon quota localStorage exploded
      // dès la 2ème pièce jointe image, base64 d'une image 5MB = ~7MB de string).
      // Les pièces jointes ne survivent pas un refresh — c'est OK, elles sont éphémères par design.
      partialize: (s) => ({
        mascot: s.mascot, name: s.name, voiceEnabled: s.voiceEnabled,
        voiceSpeed: s.voiceSpeed, autoListen: s.autoListen, panelMode: s.panelMode,
        voiceProfile: s.voiceProfile, wakeWordEnabled: s.wakeWordEnabled,
        drivingMode: s.drivingMode, biometricGuard: s.biometricGuard,
        conversations: s.conversations.map((c) => ({
          ...c,
          messages: c.messages.map((m) => ({
            ...m,
            attachments: m.attachments?.map((att) => ({
              ...att, dataUrl: undefined,  // strip base64 avant écriture localStorage
            })),
          })),
        })),
        currentConversationId: s.currentConversationId,
      }),
    }
  )
)
