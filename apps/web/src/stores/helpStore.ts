import { create } from 'zustand'

/**
 * État d'ouverture du centre d'aide.
 *
 * Extrait de `HelpChatbot` pour que le lanceur unique (`FloatingHub`) puisse
 * l'ouvrir et le refermer. Auparavant trois boutons flottants distincts se
 * chevauchaient en bas à droite (actions rapides, assistant, aide) ; ils sont
 * désormais regroupés derrière un seul bouton, qui a donc besoin de piloter
 * l'ouverture du panneau d'aide sans que celui-ci porte encore son propre
 * déclencheur.
 */
interface HelpState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useHelp = create<HelpState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
