import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Wifi, User, ChevronLeft, Lock, Star, Gamepad2 } from 'lucide-react'
import { ACCENT, SURFACE2, BORDER, TEXT, MUTED } from './games/theme'

// ─── Game imports ──────────────────────────────────────────────────────────────
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = 'all' | 'cartes' | 'plateau' | 'des' | 'arcade' | 'quiz'

interface GameDef {
  id: string
  name: string
  icon: string
  category: Category
  hot?: boolean
  new?: boolean
  available: boolean
  description: string
  players: string
}

// ─── Catalogue ──────────────────────────────────────────────────────────────────

const GAMES: GameDef[] = [
  // Cartes
  { id: 'blackjack',    name: 'Blackjack',       icon: '🃏', category: 'cartes', available: true,  description: 'Battez le croupier sans dépasser 21', players: '1', hot: true },
  { id: 'poker',        name: "Poker Hold'em",   icon: '♠️', category: 'cartes', available: true,  description: "Texas Hold'em contre le CPU", players: '1-2', new: true },
  { id: 'solitaire',    name: 'Solitaire',        icon: '🂡', category: 'cartes', available: true,  description: 'Klondike — classez toutes les cartes', players: '1', new: true },
  { id: 'memory',       name: 'Memory',           icon: '🔮', category: 'cartes', available: true,  description: 'Retrouvez les paires cachées', players: '1-2' },
  { id: 'bataille',     name: 'Bataille',         icon: '⚔️', category: 'cartes', available: true,  description: 'Comparez les cartes, le plus haut gagne', players: '2' },
  { id: 'higherlower',  name: 'Plus ou Moins',   icon: '📈', category: 'cartes', available: true,  description: 'La prochaine carte sera-t-elle plus haute ?', players: '1' },
  { id: 'belote',       name: 'Belote',           icon: '♠️', category: 'cartes', available: false, description: 'Le classique français à 4 joueurs', players: '4' },
  { id: 'uno',          name: 'Uno Style',        icon: '🎨', category: 'cartes', available: false, description: 'Videz votre main en premier', players: '2-4' },

  // Plateau
  { id: 'chess',        name: 'Échecs',           icon: '♟️', category: 'plateau', available: true,  description: 'Minimax IA — le roi des jeux', players: '1-2', new: true, hot: true },
  { id: 'towerdefense', name: 'Tower Defense',    icon: '🗼', category: 'plateau', available: true,  description: "5 vagues d'ennemis, défendez votre base", players: '1', new: true },
  { id: 'ttt',          name: 'Morpion',          icon: '✖️', category: 'plateau', available: true,  description: 'Le classique 3×3 indémodable', players: '2' },
  { id: 'connect4',     name: 'Puissance 4',      icon: '🔴', category: 'plateau', available: true,  description: '4 jetons alignés pour gagner', players: '2' },
  { id: 'mastermind',   name: 'Mastermind',       icon: '🔐', category: 'plateau', available: true,  description: 'Déchiffrez le code de couleurs secret', players: '1' },
  { id: 'reversi',      name: 'Reversi',          icon: '⭕', category: 'plateau', available: true,  description: 'Retournez les pièces — Othello', players: '2' },
  { id: 'sliding',      name: 'Taquin',           icon: '🧩', category: 'plateau', available: true,  description: "Remettez les tuiles dans l'ordre", players: '1' },
  { id: 'battleship',   name: 'Bataille Nav.',    icon: '🚢', category: 'plateau', available: false, description: 'Coulez la flotte ennemie', players: '2' },

  // Dés
  { id: 'yahtzee',      name: 'Yahtzee',          icon: '🎲', category: 'des',    available: true,  description: 'Faites les meilleures combinaisons', players: '1-5', hot: true },
  { id: 'farkle',       name: 'Farkle',           icon: '🎰', category: 'des',    available: true,  description: 'Risquez tout avec 6 dés', players: '2-6' },
  { id: '421',          name: '421',              icon: '🎯', category: 'des',    available: true,  description: 'Le jeu de café luxembourgeois', players: '2' },
  { id: 'pig',          name: 'Pig Dice',         icon: '🐷', category: 'des',    available: true,  description: 'Banquez avant de perdre tout !', players: '2' },
  { id: 'liar',         name: 'Menteur',          icon: '🤫', category: 'des',    available: false, description: 'Bluffez sur vos dés cachés', players: '2-6' },

  // Arcade
  { id: 'motus',        name: 'Motus',            icon: '📝', category: 'arcade', available: true,  description: 'Trouvez le mot en 6 tentatives', players: '1' },
  { id: 'hangman',      name: 'Pendu',            icon: '🪢', category: 'arcade', available: true,  description: 'Devinez le mot lettre par lettre', players: '1-2' },
  { id: '2048',         name: '2048',             icon: '🔢', category: 'arcade', available: true,  description: "Fusionnez les tuiles jusqu'à 2048", players: '1' },
  { id: 'snake',        name: 'Snake',            icon: '🐍', category: 'arcade', available: true,  description: 'Grandissez sans vous mordre la queue', players: '1' },
  { id: 'simon',        name: 'Simon',            icon: '🔵', category: 'arcade', available: true,  description: 'Reproduisez la séquence de couleurs', players: '1' },
  { id: 'reaction',     name: 'Réaction',         icon: '⚡', category: 'arcade', available: true,  description: 'Testez votre temps de réaction', players: '1' },
  { id: 'minesweeper',  name: 'Démineur',         icon: '💣', category: 'arcade', available: true,  description: 'Évitez toutes les mines cachées', players: '1' },

  // Quiz
  { id: 'quizgen',      name: 'Quiz Général',     icon: '❓', category: 'quiz',   available: true,  description: 'Culture générale — 10 questions', players: '1+' },
  { id: 'bingo',        name: 'Bingo',            icon: '🎰', category: 'quiz',   available: true,  description: 'Complétez votre grille en premier', players: '2+' },
  { id: 'numbermemory', name: 'Mémoire Chiffres', icon: '🧠', category: 'quiz',   available: true,  description: 'Mémorisez des suites de chiffres', players: '1' },
  { id: 'wordscramble', name: 'Anagramme',        icon: '🔀', category: 'quiz',   available: true,  description: "Remettez les lettres dans l'ordre", players: '1' },
  { id: 'blindtest',    name: 'Blind Test',       icon: '🎵', category: 'quiz',   available: false, description: 'Reconnaissez les musiques', players: '2+' },
]

const CATEGORIES: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'all',    label: 'Tous',    emoji: '🎮', color: '#a855f7' },
  { id: 'cartes', label: 'Cartes',  emoji: '🃏', color: '#f59e0b' },
  { id: 'plateau',label: 'Plateau', emoji: '♟️', color: '#3b82f6' },
  { id: 'des',    label: 'Dés',     emoji: '🎲', color: '#ef4444' },
  { id: 'arcade', label: 'Arcade',  emoji: '🕹️', color: '#22c55e' },
  { id: 'quiz',   label: 'Quiz',    emoji: '❓', color: '#ec4899' },
]

const CAT_COLOR: Record<Category, string> = {
  all: '#a855f7', cartes: '#f59e0b', plateau: '#3b82f6',
  des: '#ef4444', arcade: '#22c55e', quiz: '#ec4899',
}




// ─── Game Card ────────────────────────────────────────────────────────────────

function GameCard({ game, onPlay }: { game: GameDef; onPlay: () => void }) {
  const catColor = CAT_COLOR[game.category]
  return (
    <motion.button
      onClick={game.available ? onPlay : undefined}
      whileHover={game.available ? { y: -4, scale: 1.02 } : {}}
      whileTap={game.available ? { scale: 0.96 } : {}}
      className="relative text-left w-full"
      style={{ cursor: game.available ? 'pointer' : 'default' }}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: game.available ? SURFACE2 : 'rgba(14,13,32,0.7)',
          border: `1px solid ${game.available ? BORDER : 'rgba(168,85,247,0.08)'}`,
          opacity: game.available ? 1 : 0.55,
        }}
      >
        {/* Top accent bar */}
        <div className="h-0.5 w-full" style={{ background: game.available ? `linear-gradient(90deg, ${catColor}88, transparent)` : 'transparent' }} />

        <div className="p-3.5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-2.5">
            {/* Icon with glow */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: `radial-gradient(circle, ${catColor}25 0%, ${catColor}08 100%)`,
                border: `1px solid ${catColor}30`,
                boxShadow: game.available ? `0 0 12px ${catColor}20` : 'none',
              }}
            >
              {game.icon}
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-1">
              {game.new && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>
                  NEW
                </span>
              )}
              {game.hot && !game.new && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
                  🔥 HOT
                </span>
              )}
              {!game.available && <Lock size={12} style={{ color: MUTED }} />}
            </div>
          </div>

          {/* Name */}
          <p className="font-bold text-sm leading-tight mb-1" style={{ color: TEXT }}>{game.name}</p>

          {/* Description */}
          <p className="text-[10px] leading-snug mb-3" style={{ color: MUTED, minHeight: 28 }}>{game.description}</p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
              style={{ background: `${catColor}18`, color: catColor }}
            >
              {CATEGORIES.find(c => c.id === game.category)?.label}
            </span>

            {game.available ? (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>JOUER</span>
              </div>
            ) : (
              <span className="text-[9px]" style={{ color: MUTED }}>Bientôt</span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ─── Lobby Hero (casino felt header) ─────────────────────────────────────────

function CasinoHero({ gameCount }: { gameCount: number }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5 px-5 py-6"
      style={{
        background: 'linear-gradient(135deg, #0e0d20 0%, #1a1535 50%, #0e0d20 100%)',
        border: `2px solid ${BORDER}`,
      }}
    >
      {/* Felt texture dots */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '8px 8px',
      }} />
      {/* Corner ornaments */}
      <div className="absolute top-2 left-3 text-[10px] opacity-30" style={{ color: '#f59e0b' }}>♠ ♥</div>
      <div className="absolute top-2 right-3 text-[10px] opacity-30" style={{ color: '#f59e0b' }}>♦ ♣</div>
      <div className="absolute bottom-2 left-3 text-[10px] opacity-30" style={{ color: '#f59e0b' }}>♣ ♦</div>
      <div className="absolute bottom-2 right-3 text-[10px] opacity-30" style={{ color: '#f59e0b' }}>♥ ♠</div>

      <div className="relative text-center">
        <div className="text-4xl mb-2">🎰</div>
        <h2 className="text-xl font-black mb-1" style={{
          color: '#fff',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.05em',
        }}>
          Salle de Jeux
        </h2>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {gameCount} jeux disponibles
        </p>
        {/* Gold divider */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b88)' }} />
          <span className="text-xs" style={{ color: '#f59e0b' }}>✦</span>
          <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(90deg, #f59e0b88, transparent)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main GamesSection ────────────────────────────────────────────────────────

export default function GamesSection() {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('all')

  const back = () => setActiveGame(null)

  // Dispatch active game
  if (activeGame) {
    const GAME_MAP: Record<string, JSX.Element> = {
      blackjack:    <BlackjackGame onBack={back}/>,
      poker:        <PokerGame onBack={back}/>,
      solitaire:    <SolitaireGame onBack={back}/>,
      memory:       <MemoryGame onBack={back} />,
      bataille:     <WarGame onBack={back}/>,
      higherlower:  <HigherLowerGame onBack={back}/>,
      chess:        <ChessGame onBack={back}/>,
      towerdefense: <TowerDefenseGame onBack={back}/>,
      ttt:          <TicTacToeGame onBack={back}/>,
      connect4:     <ConnectFourGame onBack={back}/>,
      mastermind:   <MastermindGame onBack={back}/>,
      reversi:      <ReversiGame onBack={back}/>,
      sliding:      <SlidingPuzzleGame onBack={back}/>,
      yahtzee:      <YahtzeeGame onBack={back}/>,
      farkle:       <FarkleGame onBack={back}/>,
      '421':        <Game421 onBack={back}/>,
      pig:          <PigGame onBack={back}/>,
      motus:        <MotusGame onBack={back}/>,
      hangman:      <HangmanGame onBack={back}/>,
      '2048':       <Game2048 onBack={back}/>,
      snake:        <SnakeGame onBack={back}/>,
      simon:        <SimonGame onBack={back}/>,
      reaction:     <ReactionGame onBack={back}/>,
      minesweeper:  <MinesweeperGame onBack={back}/>,
      quizgen:      <QuizGame onBack={back}/>,
      bingo:        <BingoGame onBack={back}/>,
      numbermemory: <NumberMemoryGame onBack={back}/>,
      wordscramble: <WordScrambleGame onBack={back}/>,
    }
    return (
      <div style={{position:'fixed',inset:0,zIndex:50,background:'#05050f',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <AnimatePresence mode="wait">
          <motion.div key={activeGame} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
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

  const filtered = activeCategory === 'all'
    ? GAMES
    : GAMES.filter(g => g.category === activeCategory)

  const available = filtered.filter(g => g.available)
  const locked    = filtered.filter(g => !g.available)
  const totalAvail = GAMES.filter(g => g.available).length

  return (
    <div className="space-y-4 pb-4">
      <CasinoHero gameCount={totalAvail} />

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              activeCategory === cat.id
                ? { background: cat.color, color: '#fff', boxShadow: `0 0 12px ${cat.color}55` }
                : { background: 'rgba(255,255,255,0.05)', color: MUTED, border: '1px solid rgba(255,255,255,0.1)' }
            }
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            <span
              className="ml-0.5 text-[9px] font-bold px-1 rounded-full"
              style={{ background: activeCategory === cat.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)' }}
            >
              {cat.id === 'all'
                ? GAMES.filter(g => g.available).length
                : GAMES.filter(g => g.category === cat.id && g.available).length}
            </span>
          </button>
        ))}
      </div>

      {/* Available games grid */}
      {available.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22c55e' }}>
              Jouables maintenant · {available.length}
            </p>
          </div>
          <motion.div
            className="grid grid-cols-2 gap-2.5"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          >
            {available.map(g => (
              <motion.div key={g.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
                <GameCard game={g} onPlay={() => setActiveGame(g.id)} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Locked games */}
      {locked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 mt-1">
            <Lock size={10} style={{ color: MUTED }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>
              Bientôt disponibles · {locked.length}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {locked.map(g => (
              <GameCard key={g.id} game={g} onPlay={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-center gap-4 pt-2">
        {[
          { icon: <Gamepad2 size={12}/>, label: `${totalAvail} jeux`, color: ACCENT },
          { icon: <Star size={12}/>, label: '5 catégories', color: '#f59e0b' },
          { icon: <Trophy size={12}/>, label: 'Tournois bientôt', color: '#22c55e' },
          { icon: <Wifi size={12}/>, label: 'Multi en cours', color: '#06b6d4' },
          { icon: <User size={12}/>, label: 'Solo / Local', color: MUTED },
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
