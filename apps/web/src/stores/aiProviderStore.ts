import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * AI provider preference — shared across AI Assistant pages.
 *
 * - 'local'  : Ollama Gemma 2B (privacy-safe, CNPD compliant, ~2 s)
 * - 'cloud'  : Claude / GPT-4 (best quality, requires API key, ~3 s)
 * - 'auto'   : router decides per-task (privacy-sensitive → local, quality → cloud)
 */

export type AIProvider = 'local' | 'cloud' | 'auto'

interface AIProviderState {
  provider: AIProvider
  setProvider: (p: AIProvider) => void
}

export const useAIProvider = create<AIProviderState>()(
  persist(
    (set) => ({
      provider: 'local',
      setProvider: (provider) => set({ provider }),
    }),
    { name: 'creorga-ai-provider' }
  )
)

/** Resolve a provider for a given task quality hint. */
export function resolveProvider(
  pref: AIProvider,
  hint: 'privacy' | 'quality' | 'balanced' = 'balanced'
): 'local' | 'cloud' {
  if (pref === 'local') return 'local'
  if (pref === 'cloud') return 'cloud'
  // Auto routing
  if (hint === 'privacy') return 'local'
  if (hint === 'quality') return 'cloud'
  return 'local' // balanced defaults to local for privacy + cost
}
