import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MascotVariant } from '@/components/AssistantMascot'

/**
 * Assistant store — settings + runtime state of the personal robot assistant.
 *
 * - mascot, name, voice : persisted to localStorage
 * - mode, conversation : runtime only
 */

export type AssistantMode = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface AssistantMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  ts: number
  ui?: any           // optional structured UI (download, list, kpi, action-result)
  cited?: string[]   // cited source IDs
  action?: {         // when bot triggered a real action
    intent: string
    success: boolean
    summary: string
  }
}

interface AssistantState {
  // Persisted
  mascot: MascotVariant
  name: string
  voiceEnabled: boolean    // TTS speaks responses
  voiceSpeed: number       // 0.8 - 1.4
  autoListen: boolean      // start listening when panel opens
  panelMode: 'overlay' | 'dock' | 'full'
  /** v3.12 — voice profile per mascot (#7) */
  voiceProfile: 'auto' | 'masculine' | 'feminine' | 'robotic' | 'warm' | 'energetic'
  /** v3.12 — wake word continu (#1) */
  wakeWordEnabled: boolean
  /** v3.12 — driving mode (#17) */
  drivingMode: boolean
  /** v3.12 — biometric required for destructive actions (#14) */
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

  // Runtime
  open: boolean
  mode: AssistantMode
  messages: AssistantMessage[]
  setOpen: (o: boolean) => void
  setMode: (m: AssistantMode) => void
  addMessage: (msg: Omit<AssistantMessage, 'id' | 'ts'>) => void
  clearMessages: () => void
}

export const useAssistant = create<AssistantState>()(
  persist(
    (set) => ({
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

      open: false,
      mode: 'idle',
      messages: [],
      setOpen: (o) => set({ open: o }),
      setMode: (m) => set({ mode: m }),
      addMessage: (msg) => set((s) => ({
        messages: [...s.messages, { ...msg, id: Math.random().toString(36).slice(2, 10), ts: Date.now() }],
      })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'creorga-assistant',
      partialize: (s) => ({
        mascot: s.mascot, name: s.name, voiceEnabled: s.voiceEnabled,
        voiceSpeed: s.voiceSpeed, autoListen: s.autoListen, panelMode: s.panelMode,
        voiceProfile: s.voiceProfile, wakeWordEnabled: s.wakeWordEnabled,
        drivingMode: s.drivingMode, biometricGuard: s.biometricGuard,
      }),
    }
  )
)
