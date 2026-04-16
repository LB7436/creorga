import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Search, Star, Clock, Users, Flame, Award, TrendingUp,
  ChevronLeft, Lock, Gamepad2, Sparkles, Target, Zap, Crown, Medal,
} from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './games/theme'

// Game imports
import MemoryGame from './games/MemoryGame'
import TicTacToeGame from './games/TicTacToeGame'
import ConnectFourGame from './games/ConnectFourGame'
import PokerGame from './games/PokerGame'
import Game2048 from './games/Game2048'
import SnakeGame from './games/SnakeGame'
import MinesweeperGame from './games/MinesweeperGame'
import YahtzeeGame from './games/YahtzeeGame'
import ReversiGame from './games/ReversiGame'
import MastermindGame from './games/MastermindGame'
import SimonGame from './games/SimonGame'
import MotusGame from './games/MotusGame'
import SlidingPuzzleGame from './games/SlidingPuzzleGame'
import WarGame from './games/WarGame'
import HigherLowerGame from './games/HigherLowerGame'
import FarkleGame from './games/FarkleGame'
import Game421 from './games/Game421'
import PigGame from './games/PigGame'
import QuizGame from './games/QuizGame'
import BingoGame from './games/BingoGame'
import ReactionGame from './games/ReactionGame'
import NumberMemoryGame from './games/NumberMemoryGame'
import WordScrambleGame from './games/WordScrambleGame'
import BlackjackGame from './games/BlackjackGame'
import ChessGame from './games/ChessGame'
import TowerDefenseGame from './games/TowerDefenseGame'
import SolitaireGame from './games/SolitaireGame'
import HangmanGame from './games/Hangman'

type Category = 'all' | 'classiques' | 'cartes' | 'reflexion' | 'arcade' | 'multi' | 'casino'
type Difficulty = 'facile' | 'moyen' | 'difficile'

interface GameDef {
  id: string
  name: string
  icon: string
  categories: Category[]
  description: string
  estTime: string
  difficulty: 1 | 2 | 3
  plays: number
  rating: number
  hot?: boolean
  new?: boolean
  available: boolean
}

const GAMES: GameDef[] = [
  { id: 'chess', name: 'Échecs', icon: '♟️', categories: ['classiques', 'reflexion'], description: 'Minimax IA, le roi des jeux', estTime: '15 min', difficulty: 3, plays: 1284, rating: 4.8, hot: true, available: true },
  { id: 'solitaire', name: 'Solitaire', icon: '🂡', categories: ['classiques', 'cartes'], description: 'Klondike classique', estTime: '10 min', difficulty: 2, plays: 2103, rating: 4.6, available: true },
  { id: 'memory', name: 'Memory', icon: '🔮', categories: ['classiques'], description: 'Retrouvez les paires cachées', estTime: '5 min', difficulty: 1, plays: 3421, rating: 4.5, available: true },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', categories: ['cartes', 'casino'], description: 'Battez le croupier sans dépasser 21', estTime: '8 min', difficulty: 2, plays: 1876, rating: 4.7, hot: true, available: true },
  { id: 'poker', name: "Poker Hold'em", icon: '♠️', categories: ['cartes', 'casino'], description: "Texas Hold'em contre le CPU", estTime: '12 min', difficulty: 3, plays: 1543, rating: 4.9, new: true, available: true },
  { id: 'bataille', name: 'Bataille', icon: '⚔️', categories: ['cartes', 'multi'], description: 'Comparez les cartes, le plus haut gagne', estTime: '7 min', difficulty: 1, plays: 987, rating: 4.2, available: true },
  { id: 'higherlower', name: 'Plus ou Moins', icon: '📈', categories: ['cartes'], description: 'La prochaine sera-t-elle plus haute ?', estTime: '4 min', difficulty: 1, plays: 1432, rating: 4.3, available: true },
  { id: 'sudoku', name: 'Sudoku', icon: '🔢', categories: ['reflexion'], description: 'Le classique des grilles 9x9', estTime: '20 min', difficulty: 3, plays: 876, rating: 4.7, available: false },
  { id: 'mastermind', name: 'Mastermind', icon: '🔐', categories: ['reflexion'], description: 'Déchiffrez le code secret', estTime: '6 min', difficulty: 2, plays: 654, rating: 4.4, available: true },
  { id: '2048', name: '2048', icon: '🔢', categories: ['reflexion'], description: "Fusionnez jusqu'à 2048", estTime: '10 min', difficulty: 2, plays: 2987, rating: 4.8, hot: true, available: true },
  { id: 'snake', name: 'Snake', icon: '🐍', categories: ['arcade'], description: 'Grandissez sans vous mordre', estTime: '5 min', difficulty: 1, plays: 3210, rating: 4.5, available: true },
  { id: 'tetris', name: 'Tetris', icon: '🧱', categories: ['arcade'], description: 'Emboîtez les pièces qui tombent', estTime: '8 min', difficulty: 2, plays: 1765, rating: 4.9, available: false },
  { id: 'towerdefense', name: 'Tower Defense', icon: '🗼', categories: ['arcade'], description: "5 vagues d'ennemis à stopper", estTime: '15 min', difficulty: 3, plays: 1234, rating: 4.6, new: true, available: true },
  { id: 'ttt', name: 'Morpion', icon: '✖️', categories: ['classiques', 'multi'], description: 'Le classique 3x3 indémodable', estTime: '3 min', difficulty: 1, plays: 4532, rating: 4.1, available: true },
  { id: 'connect4', name: 'Puissance 4', icon: '🔴', categories: ['multi'], description: '4 jetons alignés pour gagner', estTime: '6 min', difficulty: 2, plays: 2109, rating: 4.5, available: true },
  { id: 'reversi', name: 'Reversi', icon: '⭕', categories: ['reflexion', 'multi'], description: 'Othello, retournez les pièces', estTime: '10 min', difficulty: 2, plays: 743, rating: 4.3, available: true },
  { id: 'sliding', name: 'Taquin', icon: '🧩', categories: ['reflexion'], description: "Remettez les tuiles dans l'ordre", estTime: '7 min', difficulty: 2, plays: 523, rating: 4.0, available: true },
  { id: 'yahtzee', name: 'Yahtzee', icon: '🎲', categories: ['classiques'], description: 'Les meilleures combinaisons de dés', estTime: '12 min', difficulty: 2, plays: 1432, rating: 4.6, available: true },
  { id: 'farkle', name: 'Farkle', icon: '🎰', categories: ['casino'], description: 'Risquez tout avec 6 dés', estTime: '8 min', difficulty: 2, plays: 876, rating: 4.4, available: true },
  { id: '421', name: '421', icon: '🎯', categories: ['classiques'], description: 'Le jeu de café luxembourgeois', estTime: '5 min', difficulty: 1, plays: 1098, rating: 4.3, available: true },
  { id: 'pig', name: 'Pig Dice', icon: '🐷', categories: ['classiques'], description: 'Banquez avant de tout perdre', estTime: '6 min', difficulty: 1, plays: 654, rating: 4.2, available: true },
  { id: 'motus', name: 'Motus', icon: '📝', categories: ['reflexion'], description: 'Trouvez le mot en 6 tentatives', estTime: '5 min', difficulty: 2, plays: 2345, rating: 4.7, available: true },
  { id: 'hangman', name: 'Pendu', icon: '🪢', categories: ['classiques'], description: 'Devinez le mot lettre par lettre', estTime: '4 min', difficulty: 1, plays: 1876, rating: 4.4, available: true },
  { id: 'simon', name: 'Simon', icon: '🔵', categories: ['arcade'], description: 'Reproduisez la séquence', estTime: '4 min', difficulty: 1, plays: 987, rating: 4.3, available: true },
  { id: 'reaction', name: 'Réaction', icon: '⚡', categories: ['arcade'], description: 'Testez vos réflexes', estTime: '2 min', difficulty: 1, plays: 1543, rating: 4.2, available: true },
  { id: 'minesweeper', name: 'Démineur', icon: '💣', categories: ['arcade', 'reflexion'], description: 'Évitez les mines cachées', estTime: '8 min', difficulty: 2, plays: 1098, rating: 4.5, available: true },
  { id: 'slots', name: 'Machine à sous', icon: '🎰', categories: ['casino'], description: 'Alignez les symboles gagnants', estTime: '3 min', difficulty: 1, plays: 2543, rating: 4.6, hot: true, available: false },
  { id: 'roulette', name: 'Roulette', icon: '🎡', categories: ['casino'], description: 'Rouge ou noir, pair ou impair', estTime: '5 min', difficulty: 2, plays: 1876, rating: 4.5, available: false },
  { id: 'quizgen', name: 'Quiz Général', icon: '❓', categories: ['reflexion'], description: 'Culture générale, 10 questions', estTime: '6 min', difficulty: 2, plays: 2109, rating: 4.6, available: true },
  { id: 'bingo', name: 'Bingo', icon: '🎱', categories: ['casino', 'multi'], description: 'Complétez votre grille en premier', estTime: '10 min', difficulty: 1, plays: 876, rating: 4.2, available: true },
  { id: 'numbermemory', name: 'Mémoire Chiffres', icon: '🧠', categories: ['reflexion'], description: 'Mémorisez des suites', estTime: '5 min', difficulty: 2, plays: 654, rating: 4.3, available: true },
  { id: 'wordscramble', name: 'Anagramme', icon: '🔀', categories: ['reflexion'], description: "Remettez les lettres dans l'ordre", estTime: '5 min', difficulty: 2, plays: 987, rating: 4.4, available: true },
]

const CATEGORIES: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'all', label: 'Tous', emoji: '🎮', color: '#a855f7' },
  { id: 'classiques', label: 'Classiques', emoji: '♟️', color: '#f59e0b' },
  { id: 'cartes', label: 'Cartes', emoji: '🃏', color: '#ef4444' },
  { id: 'reflexion', label: 'Réflexion', emoji: '🧠', color: '#3b82f6' },
  { id: 'arcade', label: 'Arcade', emoji: '🕹️', color: '#22c55e' },
  { id: 'multi', label: 'Multijoueur', emoji: '👥', color: '#06b6d4' },
  { id: 'casino', label: 'Casino', emoji: '🎰', color: '#ec4899' },
]

const LEADERBOARD = [
  { rank: 1, name: 'Alex M.', score: 128540, badge: '👑' },
  { rank: 2, name: 'Sophie L.', score: 115230, badge: '🥈' },
  { rank: 3, name: 'Thomas R.', score: 98760, badge: '🥉' },
  { rank: 4, name: 'Marie D.', score: 87650 },
  { rank: 5, name: 'Lucas B.', score: 76540 },
  { rank: 6, name: 'Emma V.', score: 65430 },
  { rank: 7, name: 'Paul K.', score: 54320 },
  { rank: 8, name: 'Julie T.', score: 43210 },
  { rank: 9, name: 'Vous', score: 38920, isMe: true },
  { rank: 10, name: 'Nicolas P.', score: 32100 },
]

const ACHIEVEMENTS = [
  { id: 1, name: 'Premier pas', icon: '🎯', desc: 'Jouer 1 partie', progress: 100 },
  { id: 2, name: 'Habitué', icon: '🔥', desc: 'Jouer 10 parties', progress: 100 },
  { id: 3, name: 'Vétéran', icon: '⭐', desc: 'Jouer 50 parties', progress: 72 },
  { id: 4, name: 'Stratège', icon: '♟️', desc: 'Gagner aux Échecs', progress: 100 },
  { id: 5, name: 'Casino King', icon: '🎰', desc: 'Gagner 1000 au Blackjack', progress: 45 },
  { id: 6, name: 'Marathonien', icon: '⏱️', desc: 'Jouer 5h cumulées', progress: 60 },
  { id: 7, name: 'Perfectionniste', icon: '💎', desc: '10 victoires consécutives', progress: 30 },
  { id: 8, name: 'Sociable', icon: '👥', desc: '5 parties multijoueur', progress: 80 },
  { id: 9, name: 'Rapide', icon: '⚡', desc: 'Gagner en moins d’1 min', progress: 0 },
  { id: 10, name: 'Collectionneur', icon: '🏆', desc: 'Jouer à 15 jeux différents', progress: 53 },
  { id: 11, name: 'Maître du 2048', icon: '🔢', desc: 'Atteindre 2048', progress: 90 },
  { id: 12, name: 'Légende', icon: '👑', desc: 'Top 3 du classement', progress: 15 },
]

const HISTORY = [
  { game: 'Blackjack', icon: '🃏', score: 2400, time: 'il y a 12 min', win: true },
  { game: 'Échecs', icon: '♟️', score: 0, time: 'il y a 35 min', win: false },
  { game: '2048', icon: '🔢', score: 18650, time: 'il y a 1 h', win: true },
  { game: 'Snake', icon: '🐍', score: 432, time: 'il y a 2 h', win: true },
  { game: 'Poker', icon: '♠️', score: 5600, time: 'il y a 3 h', win: true },
]

function Hero({ game, onPlay }: { game: GameDef; onPlay: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden mb-4"
      style={{
        background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 50%, #0f0520 100%)',
        border: '2px solid rgba(245,158,11,0.3)',
        boxShadow: '0 20px 60px rgba(168,85,247,0.25)',
      }}
    >
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }} />
      <div className="relative p-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={14} style={{ color: '#fbbf24' }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            Jeu du jour
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shrink-0"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.25), rgba(251,191,36,0.05))',
              border: '1.5px solid rgba(251,191,36,0.4)',
              boxShadow: '0 0 30px rgba(251,191,36,0.3)',
            }}
          >
            {game.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black mb-1" style={{ color: '#fff' }}>{game.name}</h2>
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>{game.description}</p>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span className="flex items-center gap-1"><Star size={10} fill="#fbbf24" color="#fbbf24"/>{game.rating}</span>
              <span className="flex items-center gap-1"><Clock size={10}/>{game.estTime}</span>
              <span className="flex items-center gap-1"><Flame size={10} color="#ef4444"/>{game.plays}</span>
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }} onClick={onPlay}
          className="mt-4 w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#1a0b2e',
            boxShadow: '0 8px 24px rgba(251,191,36,0.4)',
          }}
        >
          Jouer maintenant
        </motion.button>
      </div>
    </motion.div>
  )
}

function GameCard({ game, onPlay }: { game: GameDef; onPlay: () => void }) {
  return (
    <motion.button
      onClick={game.available ? onPlay : undefined}
      whileHover={game.available ? { y: -3, scale: 1.02 } : {}}
      whileTap={game.available ? { scale: 0.96 } : {}}
      className="relative text-left w-full"
      style={{ cursor: game.available ? 'pointer' : 'default' }}
    >
      <div
        className="relative rounded-2xl overflow-hidden p-3"
        style={{
          background: game.available
            ? 'linear-gradient(145deg, rgba(30,25,60,0.85), rgba(14,13,32,0.9))'
            : 'rgba(14,13,32,0.5)',
          border: `1px solid ${game.available ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.08)'}`,
          backdropFilter: 'blur(12px)',
          opacity: game.available ? 1 : 0.55,
          minHeight: 168,
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.2), rgba(168,85,247,0.05))',
              border: '1px solid rgba(168,85,247,0.3)',
            }}
          >
            {game.icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            {game.new && (
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>NEW</span>
            )}
            {game.hot && !game.new && (
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>🔥</span>
            )}
            {!game.available && <Lock size={11} style={{ color: MUTED }} />}
          </div>
        </div>
        <p className="font-bold text-sm leading-tight mb-0.5" style={{ color: TEXT }}>{game.name}</p>
        <p className="text-[10px] leading-snug mb-2" style={{ color: MUTED, minHeight: 24 }}>{game.description}</p>
        <div className="flex items-center gap-0.5 mb-1.5">
          {[1, 2, 3].map(i => (
            <Star key={i} size={9} fill={i <= game.difficulty ? '#fbbf24' : 'transparent'} color={i <= game.difficulty ? '#fbbf24' : 'rgba(255,255,255,0.2)'} />
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px]" style={{ color: MUTED }}>
          <span className="flex items-center gap-0.5"><Clock size={8}/>{game.estTime}</span>
          <span className="flex items-center gap-0.5"><Star size={8} fill="#fbbf24" color="#fbbf24"/>{game.rating}</span>
          <span className="flex items-center gap-0.5"><Users size={8}/>{game.plays > 999 ? `${(game.plays/1000).toFixed(1)}k` : game.plays}</span>
        </div>
      </div>
    </motion.button>
  )
}

export default function GamesSection() {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [multiTable, setMultiTable] = useState(false)

  const back = () => setActiveGame(null)

  const featured = useMemo(() => {
    const hot = GAMES.filter(g => g.hot && g.available)
    return hot[new Date().getDate() % hot.length] || GAMES[0]
  }, [])

  const filtered = useMemo(() => {
    let list = activeCategory === 'all' ? GAMES : GAMES.filter(g => g.categories.includes(activeCategory))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    }
    return list
  }, [activeCategory, search])

  useEffect(() => { if (multiTable) { const t = setTimeout(() => setMultiTable(false), 4500); return () => clearTimeout(t) } }, [multiTable])

  if (activeGame) {
    const GAME_MAP: Record<string, JSX.Element> = {
      blackjack: <BlackjackGame onBack={back}/>, poker: <PokerGame onBack={back}/>,
      solitaire: <SolitaireGame onBack={back}/>, memory: <MemoryGame onBack={back}/>,
      bataille: <WarGame onBack={back}/>, higherlower: <HigherLowerGame onBack={back}/>,
      chess: <ChessGame onBack={back}/>, towerdefense: <TowerDefenseGame onBack={back}/>,
      ttt: <TicTacToeGame onBack={back}/>, connect4: <ConnectFourGame onBack={back}/>,
      mastermind: <MastermindGame onBack={back}/>, reversi: <ReversiGame onBack={back}/>,
      sliding: <SlidingPuzzleGame onBack={back}/>, yahtzee: <YahtzeeGame onBack={back}/>,
      farkle: <FarkleGame onBack={back}/>, '421': <Game421 onBack={back}/>,
      pig: <PigGame onBack={back}/>, motus: <MotusGame onBack={back}/>,
      hangman: <HangmanGame onBack={back}/>, '2048': <Game2048 onBack={back}/>,
      snake: <SnakeGame onBack={back}/>, simon: <SimonGame onBack={back}/>,
      reaction: <ReactionGame onBack={back}/>, minesweeper: <MinesweeperGame onBack={back}/>,
      quizgen: <QuizGame onBack={back}/>, bingo: <BingoGame onBack={back}/>,
      numbermemory: <NumberMemoryGame onBack={back}/>, wordscramble: <WordScrambleGame onBack={back}/>,
    }
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#05050f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeGame} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {GAME_MAP[activeGame] ?? (
              <div className="space-y-4 p-4">
                <button onClick={back} className="flex items-center gap-2 text-sm" style={{ color: MUTED }}><ChevronLeft size={16}/>Retour</button>
                <div className="text-center py-12" style={{ color: MUTED }}>Ce jeu arrive bientôt !</div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  const totalAvail = GAMES.filter(g => g.available).length

  return (
    <div className="space-y-4 pb-6">
      <Hero game={featured} onPlay={() => setActiveGame(featured.id)} />

      <div className="relative">
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un jeu..."
          className="w-full rounded-xl text-sm"
          style={{
            background: 'rgba(30,25,60,0.6)', border: '1px solid rgba(168,85,247,0.2)',
            color: TEXT, padding: '10px 12px 10px 34px', outline: 'none', backdropFilter: 'blur(12px)',
          }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map(cat => {
          const count = cat.id === 'all' ? GAMES.length : GAMES.filter(g => g.categories.includes(cat.id)).length
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all"
              style={active
                ? { background: cat.color, color: '#fff', boxShadow: `0 0 14px ${cat.color}66` }
                : { background: 'rgba(255,255,255,0.04)', color: MUTED, border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="text-[9px] font-bold px-1.5 rounded-full" style={{ background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'rgba(30,25,60,0.5)', border: '1px solid rgba(168,85,247,0.15)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Difficulté</span>
          <Target size={12} style={{ color: MUTED }} />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className="py-2 rounded-lg text-[11px] font-bold capitalize transition-all"
              style={difficulty === d
                ? { background: d === 'facile' ? '#22c55e' : d === 'moyen' ? '#f59e0b' : '#ef4444', color: '#fff' }
                : { background: 'rgba(255,255,255,0.04)', color: MUTED }
              }
            >{d}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Gamepad2 size={14}/>, label: 'Parties', value: '347', color: '#a855f7' },
          { icon: <Trophy size={14}/>, label: 'Meilleur', value: '18.6k', color: '#f59e0b' },
          { icon: <Clock size={14}/>, label: 'Temps', value: '12h34', color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(30,25,60,0.5)', border: `1px solid ${s.color}33`, backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
            <p className="text-base font-black" style={{ color: TEXT }}>{s.value}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }} onClick={() => setMultiTable(true)}
        className="w-full rounded-2xl p-3 flex items-center gap-3"
        style={{
          background: multiTable
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.15))',
          border: `1px solid ${multiTable ? '#22c55e' : 'rgba(6,182,212,0.4)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>👥</div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold" style={{ color: TEXT }}>
            {multiTable ? 'Recherche d’une table voisine...' : 'Jouer contre la table voisine'}
          </p>
          <p className="text-[10px]" style={{ color: multiTable ? 'rgba(255,255,255,0.8)' : MUTED }}>
            {multiTable ? 'Connexion en cours' : 'Multi-table mode, défi en direct'}
          </p>
        </div>
        <Zap size={16} style={{ color: multiTable ? '#fff' : '#06b6d4' }} />
      </motion.button>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22c55e' }}>
              Catalogue ({filtered.filter(g => g.available).length})
            </p>
          </div>
          {search && <button onClick={() => setSearch('')} className="text-[10px]" style={{ color: MUTED }}>Effacer</button>}
        </div>
        <motion.div className="grid grid-cols-2 gap-2.5" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}>
          {filtered.map(g => (
            <motion.div key={g.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <GameCard game={g} onPlay={() => setActiveGame(g.id)} />
            </motion.div>
          ))}
        </motion.div>
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: MUTED }}>
            <p className="text-sm">Aucun jeu trouvé</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(30,25,60,0.5)', border: '1px solid rgba(168,85,247,0.2)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setShowLeaderboard(v => !v)} className="w-full p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={16} style={{ color: '#fbbf24' }} />
            <span className="text-sm font-bold" style={{ color: TEXT }}>Classement Top 10</span>
          </div>
          <TrendingUp size={14} style={{ color: MUTED, transform: showLeaderboard ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="px-3 pb-3 space-y-1">
                {LEADERBOARD.map(p => (
                  <div key={p.rank} className="flex items-center gap-3 p-2 rounded-lg"
                    style={{
                      background: p.isMe ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.02)',
                      border: p.isMe ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                    }}
                  >
                    <span className="text-xs font-black w-6 text-center" style={{ color: p.rank <= 3 ? '#fbbf24' : MUTED }}>
                      {p.badge || `#${p.rank}`}
                    </span>
                    <span className="flex-1 text-xs font-semibold" style={{ color: p.isMe ? '#a855f7' : TEXT }}>{p.name}</span>
                    <span className="text-xs font-black tabular-nums" style={{ color: TEXT }}>{p.score.toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(30,25,60,0.5)', border: '1px solid rgba(168,85,247,0.2)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setShowAchievements(v => !v)} className="w-full p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={16} style={{ color: '#a855f7' }} />
            <span className="text-sm font-bold" style={{ color: TEXT }}>Succès ({ACHIEVEMENTS.filter(a => a.progress === 100).length}/{ACHIEVEMENTS.length})</span>
          </div>
          <Medal size={14} style={{ color: MUTED }} />
        </button>
        <AnimatePresence>
          {showAchievements && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.map(a => (
                  <div key={a.id} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${a.progress === 100 ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.05)'}`, opacity: a.progress === 100 ? 1 : 0.7 }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{a.icon}</span>
                      <span className="text-[11px] font-bold truncate" style={{ color: TEXT }}>{a.name}</span>
                    </div>
                    <p className="text-[9px] mb-1.5" style={{ color: MUTED }}>{a.desc}</p>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${a.progress}%`, height: '100%', background: a.progress === 100 ? '#fbbf24' : '#a855f7', transition: 'width .4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={12} style={{ color: MUTED }} />
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Dernières parties</p>
        </div>
        <div className="space-y-1.5">
          {HISTORY.map((h, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(30,25,60,0.4)', border: '1px solid rgba(168,85,247,0.1)' }}>
              <span className="text-xl">{h.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: TEXT }}>{h.game}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>{h.time}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black tabular-nums" style={{ color: h.win ? '#22c55e' : '#ef4444' }}>
                  {h.win ? '+' : ''}{h.score.toLocaleString('fr-FR')}
                </p>
                <p className="text-[9px] uppercase" style={{ color: h.win ? '#22c55e' : '#ef4444' }}>{h.win ? 'Gagné' : 'Perdu'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2">
        {[
          { icon: <Gamepad2 size={12}/>, label: `${totalAvail} jeux`, color: ACCENT },
          { icon: <Star size={12}/>, label: '7 catégories', color: '#f59e0b' },
          { icon: <Trophy size={12}/>, label: 'Tournois', color: '#22c55e' },
          { icon: <Users size={12}/>, label: 'Multi', color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-1" style={{ color: s.color }}>
            {s.icon}
            <span className="text-[9px] font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
