import type { GuestGameDef } from './catalog'

export interface GameHistoryEntry {
  id: string
  gameId: string
  gameName: string
  playedAt: number
  durationSec: number
}

export interface GameProgress {
  totalPlays: number
  totalSeconds: number
  playsByGame: Record<string, number>
  secondsByGame: Record<string, number>
  firstPlayedAt: number | null
  lastPlayedAt: number | null
  favorites: string[]
  history: GameHistoryEntry[]
}

export interface GameAchievement {
  id: string
  name: string
  icon: string
  desc: string
  progress: number
}

const STORAGE_KEY = 'creorga-guest-game-progress-v2'

const emptyProgress = (): GameProgress => ({
  totalPlays: 0,
  totalSeconds: 0,
  playsByGame: {},
  secondsByGame: {},
  firstPlayedAt: null,
  lastPlayedAt: null,
  favorites: [],
  history: [],
})

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

export function loadGameProgress(): GameProgress {
  const w = safeWindow()
  if (!w) return emptyProgress()
  try {
    const raw = w.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<GameProgress>
    return {
      ...emptyProgress(),
      ...parsed,
      playsByGame: parsed.playsByGame ?? {},
      secondsByGame: parsed.secondsByGame ?? {},
      favorites: parsed.favorites ?? [],
      history: parsed.history ?? [],
    }
  } catch {
    return emptyProgress()
  }
}

export function saveGameProgress(progress: GameProgress): GameProgress {
  const w = safeWindow()
  if (!w) return progress
  try {
    w.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // localStorage can be full or blocked in private browsing.
  }
  return progress
}

export function recordGameStart(game: Pick<GuestGameDef, 'id' | 'name'>, now = Date.now()) {
  const current = loadGameProgress()
  const next: GameProgress = {
    ...current,
    totalPlays: current.totalPlays + 1,
    playsByGame: {
      ...current.playsByGame,
      [game.id]: (current.playsByGame[game.id] ?? 0) + 1,
    },
    firstPlayedAt: current.firstPlayedAt ?? now,
    lastPlayedAt: now,
    history: [
      {
        id: `${game.id}-${now}`,
        gameId: game.id,
        gameName: game.name,
        playedAt: now,
        durationSec: 0,
      },
      ...current.history,
    ].slice(0, 20),
  }
  return saveGameProgress(next)
}

export function recordGameEnd(gameId: string, startedAt: number, now = Date.now()) {
  const current = loadGameProgress()
  const durationSec = Math.max(1, Math.round((now - startedAt) / 1000))
  const nextHistory = current.history.map((entry, index) => {
    if (index === 0 && entry.gameId === gameId && entry.playedAt === startedAt) {
      return { ...entry, durationSec }
    }
    return entry
  })
  return saveGameProgress({
    ...current,
    totalSeconds: current.totalSeconds + durationSec,
    secondsByGame: {
      ...current.secondsByGame,
      [gameId]: (current.secondsByGame[gameId] ?? 0) + durationSec,
    },
    history: nextHistory,
  })
}

export function toggleGameFavorite(gameId: string) {
  const current = loadGameProgress()
  const exists = current.favorites.includes(gameId)
  return saveGameProgress({
    ...current,
    favorites: exists
      ? current.favorites.filter((id) => id !== gameId)
      : [gameId, ...current.favorites].slice(0, 12),
  })
}

export function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function timeAgo(timestamp: number, now = Date.now()) {
  const diff = Math.max(0, now - timestamp)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export function deriveAchievements(progress: GameProgress, games: GuestGameDef[]): GameAchievement[] {
  const playedIds = Object.keys(progress.playsByGame).filter((id) => progress.playsByGame[id] > 0)
  const playedGames = games.filter((game) => playedIds.includes(game.id))
  const playedCategories = new Set(playedGames.flatMap((game) => game.categories))
  const casinoPlays = playedGames.filter((game) => game.categories.includes('casino')).length
  const arcadePlays = playedGames.filter((game) => game.categories.includes('arcade')).length

  const pct = (value: number, target: number) => Math.min(100, Math.round((value / target) * 100))
  return [
    { id: 'first', name: 'Premier service', icon: '🎯', desc: 'Lancer 1 jeu', progress: pct(progress.totalPlays, 1) },
    { id: 'regular', name: 'Habitué', icon: '⭐', desc: 'Jouer 10 parties', progress: pct(progress.totalPlays, 10) },
    { id: 'explorer', name: 'Explorateur', icon: '🧭', desc: 'Tester 5 jeux différents', progress: pct(playedIds.length, 5) },
    { id: 'allrounder', name: 'Polyvalent', icon: '🏅', desc: 'Jouer dans 4 catégories', progress: pct(playedCategories.size, 4) },
    { id: 'arcade', name: 'Réflexes', icon: '⚡', desc: 'Tester 3 jeux arcade', progress: pct(arcadePlays, 3) },
    { id: 'cards', name: 'Cartes sur table', icon: '🃏', desc: 'Tester 3 jeux de cartes/casino', progress: pct(casinoPlays, 3) },
    { id: 'long', name: 'Marathon', icon: '⏱️', desc: '30 minutes de jeu cumulées', progress: pct(progress.totalSeconds, 30 * 60) },
    { id: 'favorite', name: 'Favori', icon: '♥', desc: 'Marquer un jeu favori', progress: pct(progress.favorites.length, 1) },
  ]
}
