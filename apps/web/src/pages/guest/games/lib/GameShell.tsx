/**
 * v6.0 — GameShell : contexte de session injecté par le hub dans chaque jeu.
 * Corrige le bug historique "onBack jamais passé" et transmet enfin la
 * difficulté / le mode choisis dans le dialog de lancement.
 * Les jeux l'utilisent via useGameShell() — défauts sûrs hors du hub.
 */
import { createContext, useContext, type ReactNode } from 'react'
import type { GameDifficulty } from '../catalog'
import type { GuestClientProfile } from '../../guestClient'
import { useGameScore } from '../useGameScore'

export type ShellPlayMode = 'solo' | 'ensemble' | 'individuel' | 'tournoi'

export interface GameShellValue {
  /** Ferme le jeu et revient au hub (branché sur closeGame du hub). */
  onBack: () => void
  /** Difficulté choisie dans le dialog de lancement. */
  difficulty: GameDifficulty
  /** Mode de jeu choisi (solo, ensemble sur la table, individuel, tournoi). */
  playMode: ShellPlayMode
  /** Profil client inscrit (null si anonyme). */
  profile: GuestClientProfile | null
  /** Numéro de table lu depuis ?table= (null hors table). */
  tableId: string | null
}

const FALLBACK: GameShellValue = {
  onBack: () => {},
  difficulty: 'moyen',
  playMode: 'solo',
  profile: null,
  tableId: null,
}

const GameShellContext = createContext<GameShellValue>(FALLBACK)

export function GameShellProvider({ value, children }: { value: GameShellValue; children: ReactNode }) {
  return <GameShellContext.Provider value={value}>{children}</GameShellContext.Provider>
}

export function useGameShell(): GameShellValue {
  return useContext(GameShellContext)
}

/**
 * Score branché sur la session : record perso + envoi serveur avec
 * le nom du joueur et la table auto-remplis (fini le leaderboard "Anonyme").
 */
export function useShellScore(gameId: string) {
  const shell = useGameShell()
  const { best, submit } = useGameScore(gameId)
  return {
    best,
    submit: (score: number) =>
      submit(score, {
        playerName: shell.profile?.displayName || undefined,
        tableId: shell.tableId || undefined,
      }),
  }
}

/** Numéro de table depuis l'URL — utilisable hors composants React. */
export function readTableId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('table')
  } catch {
    return null
  }
}
