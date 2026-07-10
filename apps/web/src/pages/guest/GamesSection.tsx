import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type CSSProperties, type LazyExoticComponent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Bot, Check, ChevronLeft, Clock, Copy, Crown, Gamepad2, Heart,
  History, Lock, Medal, Search, ShieldCheck, Sparkles, Star, Target,
  Timer, Trophy, Users, X, Zap,
} from 'lucide-react'
import { usePortalConfig } from '@/hooks/usePortalConfig'
import { useAssistant } from '@/stores/assistantStore'
import GuestRegistrationModal from './GuestRegistrationModal'
import GamesLeaderboard from './games/GamesLeaderboard'
import {
  guestDisplayName,
  loadGuestClient,
  recordGuestEvent,
  type GuestClientProfile,
} from './guestClient'
import { ACCENT, TEXT, MUTED } from './games/theme'
import {
  CATEGORY_META,
  GAME_ID_ALIASES,
  GUEST_GAMES,
  PLAYERS_LABEL,
  difficultyLabel,
  type GameCategory,
  type GameDifficulty,
  type GuestGameDef,
} from './games/catalog'
import {
  deriveAchievements,
  formatDuration,
  loadGameProgress,
  recordGameEnd,
  recordGameStart,
  timeAgo,
  toggleGameFavorite,
  type GameProgress,
} from './games/progress'
import { GameShellProvider, readTableId, type GameShellValue } from './games/lib/GameShell'

type DifficultyFilter = 'all' | GameDifficulty
type GameModule = { default: ComponentType<{ onBack?: () => void }> }
type GameComponent = LazyExoticComponent<ComponentType<{ onBack?: () => void }>> & {
  preload?: () => Promise<GameModule>
}
type GameTheme = ReturnType<typeof createGameTheme>
type PlayMode = 'solo' | 'ensemble' | 'individuel' | 'tournoi'

const PLAY_MODE_KEY = 'creorga-guest-play-mode-v1'
const PLAY_DIFFICULTY_KEY = 'creorga-guest-play-difficulty-v1'
const PLAY_MODES: { id: PlayMode; label: string; desc: string; icon: typeof Users }[] = [
  { id: 'solo', label: 'Solo', desc: 'Client seul ou CPU quand possible', icon: Gamepad2 },
  { id: 'ensemble', label: 'Ensemble', desc: 'Plusieurs joueurs sur la meme table', icon: Users },
  { id: 'individuel', label: 'Individuel', desc: 'Scores separes apres la partie', icon: Medal },
  { id: 'tournoi', label: 'Tournoi', desc: 'Manches locales et classement table', icon: Crown },
]
const PLAY_DIFFICULTIES: GameDifficulty[] = ['facile', 'moyen', 'difficile']
const FAMILY_FEATURED_IDS = ['mensch', 'connect4', 'rummikub', 'memory', 'simon', 'ttt', 'yahtzee', 'bingo', '421']

const GAME_BACKDROP_POOL = [
  'radial-gradient(circle at 18% 18%, rgba(34,197,94,0.34), transparent 24%), linear-gradient(135deg, rgba(15,118,110,0.55), rgba(17,24,39,0.88))',
  'radial-gradient(circle at 78% 20%, rgba(245,158,11,0.32), transparent 22%), linear-gradient(135deg, rgba(120,53,15,0.5), rgba(17,24,39,0.9))',
  'radial-gradient(circle at 24% 24%, rgba(6,182,212,0.28), transparent 22%), linear-gradient(135deg, rgba(30,64,175,0.48), rgba(17,24,39,0.92))',
  'radial-gradient(circle at 80% 22%, rgba(236,72,153,0.25), transparent 22%), linear-gradient(135deg, rgba(88,28,135,0.52), rgba(17,24,39,0.92))',
]

function createGameTheme(mode: 'dark' | 'light', accent: string) {
  const dark = mode !== 'light'
  return {
    mode,
    bg: dark ? '#05050f' : '#f7f9fc',
    surface: dark ? '#11111d' : '#ffffff',
    surface2: dark ? '#17172a' : '#eef4ff',
    card: dark ? 'rgba(17,17,29,0.92)' : 'rgba(255,255,255,0.93)',
    text: dark ? TEXT : '#0f172a',
    muted: dark ? MUTED : '#64748b',
    border: dark ? 'rgba(255,255,255,0.1)' : '#dbe4f0',
    soft: dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    accent,
  }
}

function gameBackdrop(game: GuestGameDef) {
  const seed = game.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return GAME_BACKDROP_POOL[seed % GAME_BACKDROP_POOL.length]
}

function gameAccent(game: GuestGameDef) {
  if (game.id === 'mensch' || game.id === 'rummikub') return '#f59e0b'
  if (game.id === 'scoopa' || game.categories.includes('cartes')) return '#ef4444'
  if (game.id === 'basket3d' || game.categories.includes('arcade')) return '#22c55e'
  if (game.id === 'billard' || game.categories.includes('casino')) return '#06b6d4'
  if (game.categories.includes('reflexion')) return '#3b82f6'
  if (game.categories.includes('multi')) return '#a855f7'
  return '#fbbf24'
}

function gameMiniatureKind(game: GuestGameDef) {
  if (game.id === 'chess') return 'chess'
  if (game.id === 'mensch') return 'board'
  if (['yahtzee', 'farkle', '421', 'pig'].includes(game.id)) return 'dice'
  if (['motus', 'hangman', 'wordscramble', 'quizgen'].includes(game.id)) return 'word'
  if (['memory', 'simon'].includes(game.id)) return 'memory'
  if (game.id === 'snake') return 'snake'
  if (game.id === 'bingo') return 'bingo'
  if (game.id === 'basket3d') return 'hoop'
  if (game.id === 'billard') return 'pool'
  if (game.id === 'mahjong3d' || game.id === 'rummikub') return 'tiles'
  if (game.id === 'towerdefense') return 'tower'
  if (game.categories.includes('cartes')) return 'cards'
  if (game.categories.includes('arcade')) return 'arcade'
  if (game.categories.includes('reflexion')) return 'grid'
  return 'tokens'
}

function loadPlayMode(): PlayMode {
  if (typeof window === 'undefined') return 'ensemble'
  const saved = window.localStorage.getItem(PLAY_MODE_KEY)
  return PLAY_MODES.some((item) => item.id === saved) ? saved as PlayMode : 'ensemble'
}

function savePlayMode(mode: PlayMode) {
  if (typeof window !== 'undefined') window.localStorage.setItem(PLAY_MODE_KEY, mode)
  return mode
}

function loadPlayDifficulty(): GameDifficulty {
  if (typeof window === 'undefined') return 'moyen'
  const saved = window.localStorage.getItem(PLAY_DIFFICULTY_KEY)
  return PLAY_DIFFICULTIES.includes(saved as GameDifficulty) ? saved as GameDifficulty : 'moyen'
}

function savePlayDifficulty(value: GameDifficulty) {
  if (typeof window !== 'undefined') window.localStorage.setItem(PLAY_DIFFICULTY_KEY, value)
  return value
}

function gameRequiresProfile(game: GuestGameDef, mode: PlayMode) {
  return mode !== 'solo' || game.categories.includes('multi') || game.categories.includes('casino') || game.hot || game.new
}

const loadMenschGame = () => import('./games/MenschGame')
const MenschGameComponent = lazy(loadMenschGame) as GameComponent
MenschGameComponent.preload = loadMenschGame

const GAME_COMPONENTS: Record<string, GameComponent> = {
  blackjack: lazy(() => import('./games/BlackjackGame')) as GameComponent,
  poker: lazy(() => import('./games/PokerGame')) as GameComponent,
  solitaire: lazy(() => import('./games/SolitaireGame')) as GameComponent,
  memory: lazy(() => import('./games/MemoryGame')) as GameComponent,
  bataille: lazy(() => import('./games/WarGame')) as GameComponent,
  higherlower: lazy(() => import('./games/HigherLowerGame')) as GameComponent,
  chess: lazy(() => import('./games/ChessGame')) as GameComponent,
  towerdefense: lazy(() => import('./games/TowerDefenseGame')) as GameComponent,
  ttt: lazy(() => import('./games/TicTacToeGame')) as GameComponent,
  connect4: lazy(() => import('./games/ConnectFourGame')) as GameComponent,
  mastermind: lazy(() => import('./games/MastermindGame')) as GameComponent,
  reversi: lazy(() => import('./games/ReversiGame')) as GameComponent,
  sliding: lazy(() => import('./games/SlidingPuzzleGame')) as GameComponent,
  yahtzee: lazy(() => import('./games/YahtzeeGame')) as GameComponent,
  farkle: lazy(() => import('./games/FarkleGame')) as GameComponent,
  '421': lazy(() => import('./games/Game421')) as GameComponent,
  pig: lazy(() => import('./games/PigGame')) as GameComponent,
  motus: lazy(() => import('./games/MotusGame')) as GameComponent,
  hangman: lazy(() => import('./games/Hangman')) as GameComponent,
  '2048': lazy(() => import('./games/Game2048')) as GameComponent,
  snake: lazy(() => import('./games/SnakeGame')) as GameComponent,
  simon: lazy(() => import('./games/SimonGame')) as GameComponent,
  reaction: lazy(() => import('./games/ReactionGame')) as GameComponent,
  minesweeper: lazy(() => import('./games/MinesweeperGame')) as GameComponent,
  quizgen: lazy(() => import('./games/QuizGame')) as GameComponent,
  bingo: lazy(() => import('./games/BingoGame')) as GameComponent,
  numbermemory: lazy(() => import('./games/NumberMemoryGame')) as GameComponent,
  wordscramble: lazy(() => import('./games/WordScrambleGame')) as GameComponent,
  scoopa: lazy(() => import('./games/ScopaGame')) as GameComponent,
  mensch: MenschGameComponent,
  basket3d: lazy(() => import('./games/BasketballGame')) as GameComponent,
  mahjong3d: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.MahjongGame }))) as GameComponent,
  erreur11: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.SpotErrorGame }))) as GameComponent,
  billard: lazy(() => import('./games/BilliardsGame')) as GameComponent,
  run21: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.Run21Game }))) as GameComponent,
  tritowers: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.TriTowersGame }))) as GameComponent,
  rami: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.RamiGame }))) as GameComponent,
  rummikub: lazy(() => import('./games/CreorgaOriginals').then((m) => ({ default: m.RummikubGame }))) as GameComponent,
}

function gameEnabled(configured: Record<string, boolean>, gameId: string) {
  if (!Object.keys(configured).length) return true
  if (configured[gameId] === true) return true
  return Object.entries(GAME_ID_ALIASES).some(([legacyId, canonicalId]) => canonicalId === gameId && configured[legacyId] === true)
}

function statLine(progress: GameProgress, visibleGames: GuestGameDef[]) {
  const unique = Object.keys(progress.playsByGame).filter((id) => progress.playsByGame[id] > 0).length
  const favoriteCount = progress.favorites.filter((id) => visibleGames.some((game) => game.id === id)).length
  return [
    { icon: <Gamepad2 size={14} />, label: 'Parties', value: String(progress.totalPlays), color: '#a855f7' },
    { icon: <Trophy size={14} />, label: 'Jeux testés', value: String(unique), color: '#f59e0b' },
    { icon: <Timer size={14} />, label: 'Temps', value: formatDuration(progress.totalSeconds), color: '#06b6d4' },
    { icon: <Heart size={14} />, label: 'Favoris', value: String(favoriteCount), color: '#ec4899' },
  ]
}

function difficultyMatches(game: GuestGameDef, filter: DifficultyFilter) {
  if (filter === 'all') return true
  return difficultyLabel(game.difficulty) === filter
}

function GameMiniature({ game, ui, large }: { game: GuestGameDef; ui: GameTheme; large?: boolean }) {
  const accent = gameAccent(game)
  const kind = gameMiniatureKind(game)
  return (
    <div style={miniatureFrameStyle(accent, ui, large)}>
      <span style={miniatureGlowStyle(accent)} />
      <span style={miniatureIconStyle(large)}>{game.icon}</span>
      <span style={miniatureFloorStyle} />
      {kind === 'cards' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2].map((index) => <span key={index} style={miniCardChipStyle(index, large)} />)}
        </span>
      )}
      {kind === 'board' && (
        <span style={miniatureLayerStyle}>
          <span style={miniBoardStyle(large)} />
          {['#1d9bf0', '#facc15', '#22c55e', '#ef4444'].map((color, index) => (
            <span key={color} style={miniTokenStyle(color, index, large)} />
          ))}
        </span>
      )}
      {kind === 'hoop' && (
        <span style={miniatureLayerStyle}>
          <span style={miniBackboardStyle(large)} />
          <span style={miniRimStyle(large)} />
          <span style={miniBallStyle(large)} />
        </span>
      )}
      {kind === 'pool' && (
        <span style={miniatureLayerStyle}>
          <span style={miniPoolTableStyle(large)} />
          {[0, 1, 2, 3].map((index) => <span key={index} style={miniPoolBallStyle(index, large)} />)}
        </span>
      )}
      {kind === 'tiles' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3, 4, 5].map((index) => <span key={index} style={miniTileStyle(index, large)} />)}
        </span>
      )}
      {kind === 'dice' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2].map((index) => <span key={index} style={miniDiceStyle(index, large)} />)}
        </span>
      )}
      {kind === 'word' && (
        <span style={miniatureLayerStyle}>
          {['M', 'O', 'T'].map((letter, index) => <span key={letter} style={miniLetterStyle(index, large)}>{letter}</span>)}
        </span>
      )}
      {kind === 'memory' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3].map((index) => <span key={index} style={miniMemoryPadStyle(index, large)} />)}
        </span>
      )}
      {kind === 'snake' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3, 4].map((index) => <span key={index} style={miniSnakeSegmentStyle(index, large)} />)}
        </span>
      )}
      {kind === 'bingo' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3, 4].map((index) => <span key={index} style={miniBingoBallStyle(index, large)}>{index + 7}</span>)}
        </span>
      )}
      {kind === 'chess' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3].map((index) => <span key={index} style={miniChessPieceStyle(index, large)} />)}
        </span>
      )}
      {kind === 'tower' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2].map((index) => <span key={index} style={miniTowerStyle(index, large)} />)}
          <span style={miniPathStyle(large)} />
        </span>
      )}
      {kind === 'arcade' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3].map((index) => <span key={index} style={miniArcadeBarStyle(index, large)} />)}
        </span>
      )}
      {kind === 'grid' && (
        <span style={miniatureLayerStyle}>
          {Array.from({ length: 9 }, (_, index) => <span key={index} style={miniGridCellStyle(index, large)} />)}
        </span>
      )}
      {kind === 'tokens' && (
        <span style={miniatureLayerStyle}>
          {[0, 1, 2, 3].map((index) => <span key={index} style={miniTokenStyle(accent, index, large)} />)}
        </span>
      )}
    </div>
  )
}

function miniatureFrameStyle(accent: string, ui: GameTheme, large?: boolean): CSSProperties {
  return {
    width: large ? 104 : 58,
    height: large ? 78 : 48,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: large ? 18 : 11,
    background: `radial-gradient(circle at 28% 20%, ${accent}55, transparent 45%), linear-gradient(145deg, ${ui.mode === 'light' ? '#ffffff' : '#202033'}, ${ui.mode === 'light' ? '#e2e8f0' : '#070710'})`,
    border: `1px solid ${accent}55`,
    boxShadow: large
      ? `0 18px 34px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.24)`
      : `0 12px 22px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.18)`,
    flex: '0 0 auto',
  }
}

const miniatureLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'block',
}

function miniatureIconStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    right: large ? 10 : 7,
    top: large ? 8 : 6,
    zIndex: 3,
    fontSize: large ? 30 : 21,
    filter: 'drop-shadow(0 5px 8px rgba(0,0,0,0.38))',
  }
}

function miniatureGlowStyle(accent: string): CSSProperties {
  return {
    position: 'absolute',
    inset: -24,
    background: `radial-gradient(circle at 30% 25%, ${accent}55, transparent 36%)`,
    opacity: 0.8,
  }
}

const miniatureFloorStyle: CSSProperties = {
  position: 'absolute',
  left: '14%',
  right: '10%',
  bottom: 6,
  height: '30%',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.16)',
  transform: 'rotateX(62deg)',
  boxShadow: '0 10px 16px rgba(0,0,0,0.18)',
}

function miniCardChipStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 16 + index * 17 : 10 + index * 13,
    bottom: large ? 14 + index * 2 : 11 + index,
    width: large ? 29 : 22,
    height: large ? 40 : 31,
    borderRadius: large ? 6 : 4,
    background: index % 2 ? '#fee2e2' : '#f8fafc',
    border: '1px solid rgba(15,23,42,0.18)',
    transform: `rotate(${(index - 1) * 9}deg)`,
    boxShadow: '0 8px 12px rgba(0,0,0,0.28)',
  }
}

function miniBoardStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 16 : 11,
    bottom: large ? 10 : 9,
    width: large ? 52 : 40,
    height: large ? 45 : 35,
    borderRadius: large ? 10 : 7,
    background: 'linear-gradient(135deg, #1d9bf0 0 25%, #facc15 25% 50%, #22c55e 50% 75%, #ef4444 75%)',
    transform: 'rotateX(52deg) rotateZ(-9deg)',
    boxShadow: '0 13px 18px rgba(0,0,0,0.34)',
  }
}

function miniTokenStyle(color: string, index: number, large?: boolean): CSSProperties {
  const positions = large
    ? [[20, 20], [47, 18], [40, 48], [20, 47]]
    : [[14, 17], [37, 15], [32, 39], [15, 40]]
  return {
    position: 'absolute',
    left: positions[index][0],
    top: positions[index][1],
    width: large ? 10 : 8,
    height: large ? 10 : 8,
    borderRadius: 999,
    background: color,
    border: '1px solid rgba(255,255,255,0.74)',
    boxShadow: `0 0 10px ${color}88`,
  }
}

function miniBackboardStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 20 : 10,
    top: large ? 15 : 10,
    width: large ? 44 : 30,
    height: large ? 27 : 19,
    borderRadius: 5,
    background: 'rgba(248,250,252,0.88)',
    border: '2px solid rgba(255,255,255,0.72)',
  }
}

function miniRimStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 31 : 19,
    top: large ? 40 : 28,
    width: large ? 24 : 16,
    height: large ? 8 : 6,
    borderRadius: '50%',
    border: '3px solid #f97316',
    boxShadow: '0 0 14px rgba(249,115,22,0.7)',
  }
}

function miniBallStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    right: large ? 18 : 11,
    bottom: large ? 13 : 9,
    width: large ? 19 : 13,
    height: large ? 19 : 13,
    borderRadius: 999,
    background: 'radial-gradient(circle at 32% 28%, #fed7aa 0 12%, #f97316 13% 100%)',
    boxShadow: '0 9px 12px rgba(0,0,0,0.28)',
  }
}

function miniPoolTableStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 13 : 8,
    bottom: large ? 13 : 9,
    width: large ? 60 : 39,
    height: large ? 32 : 21,
    borderRadius: large ? 12 : 8,
    background: '#0f766e',
    border: `${large ? 6 : 4}px solid #78350f`,
    transform: 'rotateX(46deg) rotateZ(-5deg)',
    boxShadow: '0 14px 18px rgba(0,0,0,0.32)',
  }
}

function miniPoolBallStyle(index: number, large?: boolean): CSSProperties {
  const colors = ['#facc15', '#2563eb', '#ef4444', '#f8fafc']
  return {
    position: 'absolute',
    left: large ? 31 + index * 8 : 19 + index * 5,
    top: large ? 38 + (index % 2) * 5 : 28 + (index % 2) * 3,
    width: large ? 7 : 5,
    height: large ? 7 : 5,
    borderRadius: 999,
    background: colors[index],
    boxShadow: '0 5px 7px rgba(0,0,0,0.3)',
  }
}

function miniTileStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 15 + (index % 3) * 16 : 8 + (index % 3) * 10,
    top: large ? 23 + Math.floor(index / 3) * 19 : 18 + Math.floor(index / 3) * 12,
    width: large ? 13 : 9,
    height: large ? 17 : 12,
    borderRadius: 4,
    background: 'linear-gradient(145deg, #f8fafc, #d9f99d)',
    border: '1px solid rgba(15,23,42,0.16)',
    transform: 'rotateX(12deg)',
    boxShadow: '0 7px 9px rgba(0,0,0,0.24)',
  }
}

function miniDiceStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 18 + index * 18 : 10 + index * 12,
    top: large ? 25 + (index % 2) * 8 : 19 + (index % 2) * 5,
    width: large ? 22 : 16,
    height: large ? 22 : 16,
    borderRadius: large ? 7 : 5,
    background: 'linear-gradient(145deg, #ffffff, #bfdbfe)',
    border: '1px solid rgba(15,23,42,0.18)',
    transform: `rotate(${index * 12 - 8}deg)`,
    boxShadow: '0 8px 12px rgba(0,0,0,0.28), inset 0 -4px 8px rgba(37,99,235,0.16)',
  }
}

function miniLetterStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 16 + index * 20 : 9 + index * 13,
    top: large ? 29 : 22,
    width: large ? 18 : 12,
    height: large ? 22 : 16,
    borderRadius: 5,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(145deg, #fef3c7, #f59e0b)',
    color: '#3b1d05',
    fontSize: large ? 12 : 8,
    fontWeight: 950,
    boxShadow: '0 8px 12px rgba(0,0,0,0.24)',
  }
}

function miniMemoryPadStyle(index: number, large?: boolean): CSSProperties {
  const colors = ['#1d9bf0', '#facc15', '#22c55e', '#ef4444']
  return {
    position: 'absolute',
    left: large ? 18 + (index % 2) * 26 : 12 + (index % 2) * 17,
    top: large ? 22 + Math.floor(index / 2) * 22 : 16 + Math.floor(index / 2) * 15,
    width: large ? 20 : 13,
    height: large ? 16 : 11,
    borderRadius: 6,
    background: colors[index],
    boxShadow: `0 0 12px ${colors[index]}99`,
  }
}

function miniSnakeSegmentStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 17 + index * 10 : 10 + index * 7,
    top: large ? 30 + Math.sin(index) * 7 : 23 + Math.sin(index) * 5,
    width: large ? 15 : 10,
    height: large ? 15 : 10,
    borderRadius: 999,
    background: index === 0 ? '#bbf7d0' : '#22c55e',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 7px 9px rgba(0,0,0,0.24)',
  }
}

function miniBingoBallStyle(index: number, large?: boolean): CSSProperties {
  const colors = ['#f8fafc', '#facc15', '#60a5fa', '#fb7185', '#34d399']
  return {
    position: 'absolute',
    left: large ? 15 + (index % 3) * 20 : 8 + (index % 3) * 13,
    top: large ? 22 + Math.floor(index / 3) * 21 : 16 + Math.floor(index / 3) * 14,
    width: large ? 17 : 11,
    height: large ? 17 : 11,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: colors[index],
    color: '#0f172a',
    fontSize: large ? 8 : 5,
    fontWeight: 950,
    boxShadow: '0 7px 10px rgba(0,0,0,0.25)',
  }
}

function miniChessPieceStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 20 + index * 14 : 11 + index * 9,
    bottom: large ? 17 + (index % 2) * 5 : 10 + (index % 2) * 3,
    width: large ? 11 : 8,
    height: large ? 26 : 18,
    borderRadius: '8px 8px 4px 4px',
    background: index % 2 ? '#111827' : '#f8fafc',
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: '0 10px 13px rgba(0,0,0,0.3)',
  }
}

function miniTowerStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 18 + index * 18 : 11 + index * 10,
    bottom: large ? 15 : 9,
    width: large ? 13 : 8,
    height: large ? 25 + index * 8 : 16 + index * 5,
    borderRadius: 5,
    background: ['#06b6d4', '#f59e0b', '#a855f7'][index],
    boxShadow: '0 10px 14px rgba(0,0,0,0.3)',
  }
}

function miniPathStyle(large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    right: large ? 15 : 9,
    bottom: large ? 18 : 11,
    width: large ? 28 : 18,
    height: large ? 10 : 7,
    borderRadius: 999,
    background: 'linear-gradient(90deg, #ef4444, #f97316)',
    transform: 'rotate(-14deg)',
  }
}

function miniArcadeBarStyle(index: number, large?: boolean): CSSProperties {
  const colors = ['#06b6d4', '#a855f7', '#22c55e', '#f59e0b']
  return {
    position: 'absolute',
    left: large ? 16 + index * 14 : 10 + index * 8,
    bottom: large ? 14 : 9,
    width: large ? 9 : 6,
    height: large ? 18 + index * 8 : 12 + index * 5,
    borderRadius: 999,
    background: colors[index],
    boxShadow: `0 0 14px ${colors[index]}88`,
  }
}

function miniGridCellStyle(index: number, large?: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: large ? 16 + (index % 3) * 16 : 9 + (index % 3) * 10,
    top: large ? 20 + Math.floor(index / 3) * 14 : 15 + Math.floor(index / 3) * 9,
    width: large ? 12 : 8,
    height: large ? 12 : 8,
    borderRadius: 3,
    background: index % 2 ? 'rgba(255,255,255,0.86)' : 'rgba(96,165,250,0.88)',
    boxShadow: '0 6px 8px rgba(0,0,0,0.22)',
  }
}

function GameCard({
  game,
  progress,
  onPlay,
  onFavorite,
  ui,
}: {
  game: GuestGameDef
  progress: GameProgress
  onPlay: () => void
  onFavorite: () => void
  ui: GameTheme
}) {
  const played = progress.playsByGame[game.id] ?? 0
  const seconds = progress.secondsByGame[game.id] ?? 0
  const favorite = progress.favorites.includes(game.id)
  const disabled = !game.available || !GAME_COMPONENTS[game.id]

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
      <button
        onClick={disabled ? undefined : onPlay}
        data-game-id={game.id}
        className="relative text-left w-full"
        style={{ cursor: disabled ? 'default' : 'pointer' }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            height: 146,
            padding: 10,
            borderRadius: 12,
            backgroundImage: `linear-gradient(180deg, ${ui.mode === 'light' ? 'rgba(255,255,255,0.72)' : 'rgba(5,5,15,0.55)'}, ${ui.card}), ${gameBackdrop(game)}`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `1px solid ${disabled ? ui.border : `${ui.accent}44`}`,
            opacity: disabled ? 0.55 : 1,
            boxShadow: disabled ? 'none' : `0 12px 28px ${ui.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.24)'}`,
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <GameMiniature game={game} ui={ui} />
            <div className="flex items-center gap-1">
              {game.new && <span style={badge('#22c55e')}>NEW</span>}
              {game.hot && !game.new && <span style={badge('#f59e0b')}>HOT</span>}
              {!disabled && (
                <span style={badge('#6366f1')}>{PLAYERS_LABEL[game.players ?? (game.categories.includes('multi') ? 'duo' : 'solo')]}</span>
              )}
              {disabled ? (
                <Lock size={13} style={{ color: ui.muted }} />
              ) : (
                <span style={{ color: favorite ? '#ec4899' : ui.muted }}>
                  <Heart size={14} fill={favorite ? '#ec4899' : 'transparent'} />
                </span>
              )}
            </div>
          </div>

          <p className="font-bold text-[13px] leading-tight mb-1" style={{ color: ui.text }}>{game.name}</p>
          <p className="text-[10px] leading-snug mb-2" style={{ color: ui.muted, minHeight: 27, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{game.description}</p>

          <div className="flex items-center gap-0.5 mb-1.5">
            {[1, 2, 3].map((i) => (
              <Star key={i} size={10} fill={i <= game.difficulty ? '#fbbf24' : 'transparent'} color={i <= game.difficulty ? '#fbbf24' : 'rgba(255,255,255,0.2)'} />
            ))}
            <span className="ml-1 text-[10px]" style={{ color: ui.muted }}>{difficultyLabel(game.difficulty)}</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[9px]" style={{ color: ui.muted }}>
            <span className="flex items-center gap-1"><Clock size={9} />{game.estTime}</span>
            <span className="flex items-center gap-1"><Star size={9} fill="#fbbf24" color="#fbbf24" />{game.rating}</span>
            <span className="flex items-center gap-1"><Users size={9} />{played}x</span>
          </div>

          {seconds > 0 && (
            <div className="mt-1 text-[9px]" style={{ color: ui.muted }}>
              Temps joué: {formatDuration(seconds)}
            </div>
          )}
        </div>
      </button>
      {!disabled && (
        <button
          onClick={onFavorite}
          className="mt-1 text-[10px]"
          style={{ color: favorite ? '#ec4899' : ui.muted }}
        >
          {favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        </button>
      )}
    </motion.div>
  )
}

function badge(color: string) {
  return {
    color,
    border: `1px solid ${color}55`,
    background: `${color}18`,
    borderRadius: 6,
    padding: '2px 5px',
    fontSize: 8,
    fontWeight: 800,
  } as const
}

function ChallengePanel({
  ui,
  mode,
  onMode,
  onQuickPlay,
}: {
  ui: GameTheme
  mode: PlayMode
  onMode: (mode: PlayMode) => void
  onQuickPlay: () => void
}) {
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const assistant = useAssistant()
  const createCode = () => {
    const prefix = mode === 'tournoi' ? 'TOUR' : 'DUEL'
    setCode(`${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
    setStatus('Invitation prete sur cette table.')
    setCopied(false)
  }
  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  const askRobi = () => {
    assistant.setPanelSize('normal')
    assistant.setOpen(true)
    assistant.addMessage({
      role: 'bot',
      text: 'Je suis Robi. Je peux choisir un jeu selon le temps disponible, expliquer les regles, lancer un defi de table ou aider un client bloque dans une partie.',
    })
  }
  const join = () => {
    const normalized = joinCode.trim().toUpperCase()
    if (!normalized) {
      setStatus('Entrez un code invitation.')
      return
    }
    if (normalized.startsWith('TOUR')) onMode('tournoi')
    else onMode('ensemble')
    setCode(normalized)
    setStatus('Invitation rejointe. Choisissez le jeu et lancez la partie.')
  }

  return (
    <div className="rounded-xl p-3 grid gap-3" style={{ background: ui.surface, border: `1px solid ${ui.accent}33` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.12)', color: '#67e8f9' }}>
        <Zap size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: ui.text }}>Invitation de table</p>
        <p className="text-[10px]" style={{ color: ui.muted }}>
          Creez un code duel/tournoi, l'adversaire le rejoint, puis la partie se declenche.
        </p>
      </div>
      <button onClick={askRobi} className="px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1" style={{ background: 'rgba(168,85,247,0.14)', color: ui.text, border: `1px solid ${ui.accent}44` }}>
        <Bot size={13} /> Robi
      </button>
      {code ? (
        <button onClick={copy} className="px-2 py-1 rounded-lg text-xs font-black" style={{ background: ui.bg, color: ui.text, border: `1px solid ${ui.border}` }}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {code}
        </button>
      ) : (
        <button onClick={createCode} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#06b6d4', color: '#041014', border: 'none' }}>
          Creer
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onMode('ensemble')} className="rounded-lg px-3 py-2 text-xs font-black" style={{ background: mode === 'ensemble' ? `${ui.accent}22` : ui.soft, color: ui.text, border: `1px solid ${mode === 'ensemble' ? `${ui.accent}66` : ui.border}` }}>Duel ensemble</button>
        <button onClick={() => onMode('tournoi')} className="rounded-lg px-3 py-2 text-xs font-black" style={{ background: mode === 'tournoi' ? 'rgba(245,158,11,0.2)' : ui.soft, color: ui.text, border: `1px solid ${mode === 'tournoi' ? '#f59e0b88' : ui.border}` }}>Tournoi</button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value)}
          placeholder="Code recu: DUEL-A7K2"
          className="rounded-lg text-xs"
          style={{ background: ui.bg, color: ui.text, border: `1px solid ${ui.border}`, padding: '9px 10px', outline: 'none' }}
        />
        <button onClick={join} className="px-3 py-2 rounded-lg text-xs font-black" style={{ background: ui.soft, color: ui.text, border: `1px solid ${ui.border}` }}>Rejoindre</button>
      </div>
      <button onClick={onQuickPlay} className="px-3 py-2 rounded-lg text-xs font-black" style={{ background: ui.accent, color: '#fff', border: 'none' }}>
        Lancer le defi
      </button>
      {status && <p className="text-[10px]" style={{ color: ui.muted }}>{status}</p>}
    </div>
  )
}

function PlayModePanel({ ui, mode, onMode }: { ui: GameTheme; mode: PlayMode; onMode: (mode: PlayMode) => void }) {
  return (
    <div className="rounded-xl p-3" style={{ background: ui.surface, border: `1px solid ${ui.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: ui.text }}>Mode de jeu</span>
        <Users size={13} style={{ color: ui.muted }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PLAY_MODES.map((item) => {
          const Icon = item.icon
          const active = mode === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMode(item.id)}
              className="rounded-lg p-2 text-left"
              style={{
                background: active ? `${ui.accent}22` : ui.soft,
                border: `1px solid ${active ? `${ui.accent}66` : ui.border}`,
                color: ui.text,
              }}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-black">
                <Icon size={12} /> {item.label}
              </span>
              <span className="block text-[9px] mt-1 leading-snug" style={{ color: ui.muted }}>{item.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GameLaunchDialog({
  game,
  ui,
  mode,
  difficulty,
  profile,
  starting,
  onClose,
  onMode,
  onDifficulty,
  onStart,
  onNeedProfile,
}: {
  game: GuestGameDef | null
  ui: GameTheme
  mode: PlayMode
  difficulty: GameDifficulty
  profile: GuestClientProfile | null
  starting?: boolean
  onClose: () => void
  onMode: (mode: PlayMode) => void
  onDifficulty: (difficulty: GameDifficulty) => void
  onStart: () => void
  onNeedProfile: () => void
}) {
  if (!game) return null
  const requiresProfile = gameRequiresProfile(game, mode)
  const canStart = !requiresProfile || Boolean(profile)
  return (
    <AnimatePresence>
      <motion.div
        key="game-launch-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.72)' }}
        onClick={onClose}
      />
      <motion.div
        key="game-launch-panel"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Lancer ${game.name}`}
        style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 71,
          maxWidth: 560,
          margin: '0 auto',
          color: ui.text,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundImage: `linear-gradient(145deg, ${ui.mode === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(8,8,18,0.98)'}, ${ui.card}), ${gameBackdrop(game)}`,
          backgroundSize: 'cover',
          border: `1px solid ${ui.accent}44`,
          boxShadow: '0 24px 70px rgba(0,0,0,0.58)',
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${ui.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <GameMiniature game={game} ui={ui} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-sm font-black truncate" style={{ color: ui.text }}>{game.name}</p>
            <p className="text-[11px] leading-snug" style={{ color: ui.muted }}>{game.description}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-xl p-2" style={{ color: ui.text, border: `1px solid ${ui.border}`, background: ui.soft }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
          <div>
            <p className="text-xs font-black mb-2" style={{ color: ui.text }}>Qui joue ?</p>
            <div className="grid grid-cols-2 gap-2">
              {PLAY_MODES.map((item) => {
                const Icon = item.icon
                const active = mode === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onMode(item.id)}
                    className="rounded-xl p-2 text-left"
                    style={{
                      background: active ? `${ui.accent}24` : ui.soft,
                      border: `1px solid ${active ? `${ui.accent}88` : ui.border}`,
                      color: ui.text,
                    }}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-black">
                      <Icon size={12} /> {item.label}
                    </span>
                    <span className="block text-[9px] mt-1 leading-snug" style={{ color: ui.muted }}>{item.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-black mb-2" style={{ color: ui.text }}>Difficulte</p>
            <div className="grid grid-cols-3 gap-2">
              {PLAY_DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  onClick={() => onDifficulty(level)}
                  className="rounded-xl py-2 text-xs font-black capitalize"
                  style={{
                    background: difficulty === level
                      ? level === 'facile' ? '#22c55e' : level === 'moyen' ? '#f59e0b' : '#ef4444'
                      : ui.soft,
                    color: difficulty === level ? '#fff' : ui.text,
                    border: `1px solid ${difficulty === level ? 'transparent' : ui.border}`,
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: ui.soft, border: `1px solid ${ui.border}` }}>
            <p className="text-[11px] font-black" style={{ color: ui.text }}>
              Joueur: {profile ? guestDisplayName(profile) : 'non inscrit'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: ui.muted }}>
              {requiresProfile
                ? 'Inscription requise pour les records, tournois, invitations et succes.'
                : 'Ce jeu peut se lancer sans compte. Le profil garde quand meme vos records.'}
            </p>
          </div>

          <button
            disabled={starting}
            onClick={canStart ? onStart : onNeedProfile}
            className="w-full rounded-xl py-3 text-sm font-black"
            style={{
              border: 'none',
              background: starting
                ? 'linear-gradient(135deg, #475569, #334155)'
                : canStart ? ui.accent : 'linear-gradient(135deg, #06b6d4, #2563eb)',
              color: '#fff',
              boxShadow: `0 12px 28px ${ui.accent}33`,
              opacity: starting ? 0.78 : 1,
            }}
          >
            {starting ? 'Preparation du jeu...' : canStart ? 'Lancer la partie' : "S'inscrire et jouer"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ActiveGameView({
  game,
  progress,
  startedAt,
  onBack,
  onFavorite,
  ui,
  playMode,
  difficulty,
  profile,
}: {
  game: GuestGameDef
  progress: GameProgress
  startedAt: number
  onBack: () => void
  onFavorite: () => void
  ui: GameTheme
  playMode: PlayMode
  difficulty: GameDifficulty
  profile: GuestClientProfile | null
}) {
  const Game = GAME_COMPONENTS[game.id]
  const favorite = progress.favorites.includes(game.id)
  const shell = useMemo<GameShellValue>(
    () => ({ onBack, difficulty, playMode, profile, tableId: readTableId() }),
    [onBack, difficulty, playMode, profile],
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: ui.bg, color: ui.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${ui.border}`, background: ui.surface }}>
        <button onClick={onBack} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm" style={{ color: ui.muted, border: `1px solid ${ui.border}` }}>
          <ChevronLeft size={16} /> Retour
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: ui.text }}>{game.icon} {game.name}</p>
          <p className="text-[10px]" style={{ color: ui.muted }}>Session lancée {timeAgo(startedAt)} · mode {PLAY_MODES.find((item) => item.id === playMode)?.label.toLowerCase()}</p>
        </div>
        <button onClick={onFavorite} className="rounded-lg p-2" style={{ color: favorite ? '#ec4899' : ui.muted, border: `1px solid ${ui.border}` }}>
          <Heart size={16} fill={favorite ? '#ec4899' : 'transparent'} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Suspense fallback={
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div style={{ fontSize: 42 }}>{game.icon}</div>
            <div className="text-sm font-bold" style={{ color: ui.text }}>Chargement du jeu...</div>
            <div className="text-xs" style={{ color: ui.muted }}>Optimisé pour mobile, sans charger tout le catalogue.</div>
          </div>
        }>
          {Game ? (
            <GameShellProvider value={shell}>
              <Game onBack={onBack} />
            </GameShellProvider>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: ui.muted }}>Ce jeu arrive bientôt.</div>
          )}
        </Suspense>
      </div>
    </div>
  )
}

export default function GamesSection() {
  const { config } = usePortalConfig(2500)
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all')
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [progress, setProgress] = useState<GameProgress>(() => loadGameProgress())
  const [playMode, setPlayMode] = useState<PlayMode>(() => loadPlayMode())
  const [launchGame, setLaunchGame] = useState<GuestGameDef | null>(null)
  const [launchMode, setLaunchMode] = useState<PlayMode>(() => loadPlayMode())
  const [launchDifficulty, setLaunchDifficulty] = useState<GameDifficulty>(() => loadPlayDifficulty())
  const [guestClient, setGuestClient] = useState<GuestClientProfile | null>(() => loadGuestClient())
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [launchingGameId, setLaunchingGameId] = useState<string | null>(null)

  useEffect(() => {
    const onStorage = () => setProgress(loadGameProgress())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const refreshGuest = () => setGuestClient(loadGuestClient())
    window.addEventListener('creorga-guest-client-updated', refreshGuest)
    window.addEventListener('storage', refreshGuest)
    return () => {
      window.removeEventListener('creorga-guest-client-updated', refreshGuest)
      window.removeEventListener('storage', refreshGuest)
    }
  }, [])

  const accent = config?.accentColor || ACCENT
  const ui = createGameTheme(config?.themeMode === 'light' ? 'light' : 'dark', accent)
  const visibleGames = useMemo(() => {
    const enabled = config?.games ?? {}
    return GUEST_GAMES
      .filter((game) => game.available && GAME_COMPONENTS[game.id])
      .filter((game) => gameEnabled(enabled, game.id))
  }, [config?.games])

  const featured = useMemo(() => {
    const familyGames = FAMILY_FEATURED_IDS
      .map((id) => visibleGames.find((game) => game.id === id))
      .filter(Boolean) as GuestGameDef[]
    const favorite = familyGames.find((game) => progress.favorites.includes(game.id))
    return favorite || familyGames[new Date().getDate() % Math.max(familyGames.length, 1)] || visibleGames[0]
  }, [visibleGames, progress.favorites])

  const filtered = useMemo(() => {
    let list = activeCategory === 'all'
      ? visibleGames
      : visibleGames.filter((game) => game.categories.includes(activeCategory))
    list = list.filter((game) => difficultyMatches(game, difficulty))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((game) =>
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.categories.some((category) => category.includes(q))
      )
    }
    return list
  }, [activeCategory, difficulty, search, visibleGames])

  const achievements = useMemo(() => deriveAchievements(progress, visibleGames), [progress, visibleGames])
  const topGames = useMemo(() => {
    return [...visibleGames]
      .sort((a, b) => (progress.playsByGame[b.id] ?? 0) - (progress.playsByGame[a.id] ?? 0))
      .filter((game) => (progress.playsByGame[game.id] ?? 0) > 0)
      .slice(0, 8)
  }, [progress.playsByGame, visibleGames])
  const selectPlayMode = (mode: PlayMode) => setPlayMode(savePlayMode(mode))

  const startGame = (
    game: GuestGameDef,
    mode: PlayMode = playMode,
    selectedDifficulty: GameDifficulty = launchDifficulty,
    profile: GuestClientProfile | null = guestClient,
  ) => {
    const now = Date.now()
    selectPlayMode(mode)
    savePlayDifficulty(selectedDifficulty)
    recordGuestEvent('game_start', profile, {
      gameId: game.id,
      gameName: game.name,
      mode,
      difficulty: selectedDifficulty,
    })
    setSessionStartedAt(now)
    setProgress(recordGameStart(game, now))
    setActiveGame(game.id)
  }

  const requestPlay = (game: GuestGameDef) => {
    setLaunchGame(game)
    setLaunchMode(playMode)
    setLaunchDifficulty(loadPlayDifficulty() || difficultyLabel(game.difficulty))
    void GAME_COMPONENTS[game.id]?.preload?.()
  }

  const confirmLaunch = async (profile: GuestClientProfile | null = guestClient) => {
    if (!launchGame) return
    const game = launchGame
    if (gameRequiresProfile(game, launchMode) && !profile) {
      setRegistrationOpen(true)
      return
    }
    setLaunchingGameId(game.id)
    try {
      await GAME_COMPONENTS[game.id]?.preload?.()
      startGame(game, launchMode, launchDifficulty, profile)
    } finally {
      setLaunchingGameId(null)
    }
    setLaunchGame(null)
  }

  const closeGame = () => {
    if (activeGame && sessionStartedAt) {
      setProgress(recordGameEnd(activeGame, sessionStartedAt))
    }
    setActiveGame(null)
    setSessionStartedAt(null)
  }

  const toggleFavorite = (gameId: string) => setProgress(toggleGameFavorite(gameId))

  const active = activeGame ? visibleGames.find((game) => game.id === activeGame) : null
  if (active && sessionStartedAt) {
    return (
      <ActiveGameView
        game={active}
        progress={progress}
        startedAt={sessionStartedAt}
        onBack={closeGame}
        onFavorite={() => toggleFavorite(active.id)}
        ui={ui}
        playMode={playMode}
        difficulty={launchDifficulty}
        profile={guestClient}
      />
    )
  }

  if (!visibleGames.length) {
    return (
      <div className="rounded-xl p-5 text-center" style={{ background: ui.surface, border: `1px solid ${ui.border}` }}>
        <ShieldCheck size={28} style={{ margin: '0 auto 10px', color: ui.muted }} />
        <p className="font-bold" style={{ color: TEXT }}>Aucun jeu activé</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>Le restaurateur peut activer les jeux depuis le portail client.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6" style={{ color: ui.text }}>
      {featured && (
        <button
          onClick={() => requestPlay(featured)}
          data-game-id={`featured-${featured.id}`}
          className="w-full text-left overflow-hidden"
          style={{
            borderRadius: 12,
            backgroundImage: `linear-gradient(135deg, ${ui.mode === 'light' ? 'rgba(255,255,255,0.78)' : 'rgba(5,5,15,0.64)'}, ${ui.mode === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(17,17,29,0.94)'}), ${gameBackdrop(featured)}`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `1px solid ${accent}55`,
            color: ui.text,
            whiteSpace: 'normal',
            boxShadow: ui.mode === 'light' ? '0 18px 34px rgba(15,23,42,0.08)' : '0 18px 40px rgba(0,0,0,0.32)',
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} style={{ color: '#fbbf24' }} />
              <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>Jeu recommandé</span>
            </div>
            <div className="flex items-center gap-4">
              <GameMiniature game={featured} ui={ui} large />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black mb-1" style={{ color: ui.text }}>{featured.name}</h2>
                <p className="text-[11px] font-semibold" style={{ color: ui.muted }}>{difficultyLabel(featured.difficulty)} · mobile first</p>
              </div>
            </div>
            <p
              className="mt-3 text-xs"
              style={{
                color: ui.muted,
                lineHeight: 1.4,
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
              }}
            >
              {featured.description}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] mt-2" style={{ color: ui.muted }}>
              <span className="flex items-center gap-1"><Star size={10} fill="#fbbf24" color="#fbbf24" />{featured.rating}</span>
              <span className="flex items-center gap-1"><Clock size={10} />{featured.estTime}</span>
              <span className="flex items-center gap-1"><Gamepad2 size={10} />{progress.playsByGame[featured.id] ?? 0} parties</span>
            </div>
            <div className="mt-4 py-2.5 rounded-lg text-center text-sm font-black" style={{ background: accent, color: '#fff' }}>
              Jouer maintenant
            </div>
          </div>
        </button>
      )}

      <div className="relative">
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: ui.muted }} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un jeu..."
          className="w-full rounded-xl text-sm"
          style={{
            background: ui.surface,
            border: `1px solid ${ui.border}`,
            color: ui.text,
            padding: '10px 12px 10px 34px',
            outline: 'none',
          }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {CATEGORY_META.map((cat) => {
          const count = cat.id === 'all'
            ? visibleGames.length
            : visibleGames.filter((game) => game.categories.includes(cat.id as Exclude<GameCategory, 'all'>)).length
          const activeCat = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={activeCat
                ? { background: cat.color, color: '#fff' }
                : { background: ui.surface, color: ui.muted, border: `1px solid ${ui.border}` }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="text-[9px]">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl p-3" style={{ background: ui.surface, border: `1px solid ${ui.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: ui.muted }}>Niveau</span>
          <Target size={13} style={{ color: ui.muted }} />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(['all', 'facile', 'moyen', 'difficile'] as DifficultyFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className="py-2 rounded-lg text-[11px] font-bold capitalize"
              style={difficulty === d
                ? { background: d === 'facile' ? '#22c55e' : d === 'moyen' ? '#f59e0b' : d === 'difficile' ? '#ef4444' : accent, color: '#fff' }
                : { background: ui.soft, color: ui.muted, border: `1px solid ${ui.border}` }}
            >
              {d === 'all' ? 'Tous' : d}
            </button>
          ))}
        </div>
      </div>

      <GamesLeaderboard />

      <div className="grid grid-cols-4 gap-2">
        {statLine(progress, visibleGames).map((s) => (
          <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: ui.surface, border: `1px solid ${s.color}33` }}>
            <div className="flex items-center justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
            <p className="text-sm font-black" style={{ color: ui.text }}>{s.value}</p>
            <p className="text-[9px]" style={{ color: ui.muted }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: ui.text }}>Catalogue ({filtered.length})</p>
          {search && <button onClick={() => setSearch('')} className="text-[10px]" style={{ color: ui.muted }}>Effacer</button>}
        </div>
        <motion.div className="grid grid-cols-2 gap-2.5" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}>
          {filtered.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              progress={progress}
              onPlay={() => requestPlay(game)}
              onFavorite={() => toggleFavorite(game.id)}
              ui={ui}
            />
          ))}
        </motion.div>
        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ color: ui.muted }}>
            <p className="text-sm">Aucun jeu trouvé</p>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#11111d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setShowLeaderboard((v) => !v)} className="w-full p-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}><Crown size={16} color="#fbbf24" /> Jeux les plus joués</span>
          <Medal size={14} style={{ color: MUTED }} />
        </button>
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="px-3 pb-3 space-y-1.5">
                {topGames.length ? topGames.map((game, index) => (
                  <div key={game.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="w-6 text-xs font-black" style={{ color: index < 3 ? '#fbbf24' : MUTED }}>#{index + 1}</span>
                    <span className="text-lg">{game.icon}</span>
                    <span className="flex-1 text-xs font-semibold" style={{ color: TEXT }}>{game.name}</span>
                    <span className="text-xs font-black" style={{ color: TEXT }}>{progress.playsByGame[game.id]}x</span>
                  </div>
                )) : (
                  <p className="text-xs py-2" style={{ color: MUTED }}>Jouez une partie pour créer votre classement local.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#11111d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setShowAchievements((v) => !v)} className="w-full p-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}>
            <Award size={16} color={accent} /> Succès ({achievements.filter((a) => a.progress === 100).length}/{achievements.length})
          </span>
          <Medal size={14} style={{ color: MUTED }} />
        </button>
        <AnimatePresence>
          {showAchievements && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                {achievements.map((a) => (
                  <div key={a.id} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${a.progress === 100 ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{a.icon}</span>
                      <span className="text-[11px] font-bold truncate" style={{ color: TEXT }}>{a.name}</span>
                    </div>
                    <p className="text-[9px] mb-1.5" style={{ color: MUTED }}>{a.desc}</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${a.progress}%`, height: '100%', background: a.progress === 100 ? '#fbbf24' : accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#11111d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setShowHistory((v) => !v)} className="w-full p-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}><History size={16} color="#06b6d4" /> Dernières parties</span>
          <Clock size={14} style={{ color: MUTED }} />
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="px-3 pb-3 space-y-1.5">
                {progress.history.length ? progress.history.slice(0, 8).map((entry) => {
                  const game = GUEST_GAMES.find((g) => g.id === entry.gameId)
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-lg">{game?.icon ?? '🎮'}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: TEXT }}>{entry.gameName}</p>
                        <p className="text-[9px]" style={{ color: MUTED }}>{timeAgo(entry.playedAt)}</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: MUTED }}>{formatDuration(entry.durationSec)}</span>
                    </div>
                  )
                }) : (
                  <p className="text-xs py-2" style={{ color: MUTED }}>Aucune partie enregistrée sur cette tablette.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChallengePanel
        ui={ui}
        mode={playMode}
        onMode={selectPlayMode}
        onQuickPlay={() => featured && requestPlay(featured)}
      />
      <GameLaunchDialog
        game={launchGame}
        ui={ui}
        mode={launchMode}
        difficulty={launchDifficulty}
        profile={guestClient}
        starting={launchingGameId === launchGame?.id}
        onClose={() => setLaunchGame(null)}
        onMode={setLaunchMode}
        onDifficulty={setLaunchDifficulty}
        onStart={() => { void confirmLaunch() }}
        onNeedProfile={() => setRegistrationOpen(true)}
      />
      <GuestRegistrationModal
        open={registrationOpen}
        reason="Creorga garde votre pseudo, email et mobile pour les commandes, les records, les succes et les invitations de jeux."
        onClose={() => setRegistrationOpen(false)}
        onSaved={(profile) => {
          setGuestClient(profile)
          if (launchGame) void confirmLaunch(profile)
        }}
      />
    </div>
  )
}
