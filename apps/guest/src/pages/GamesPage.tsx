import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { usePortalConfig } from '../usePortalConfig'
import GameLauncher from '../games/GameLauncher'

/**
 * Games page on guest portal — Creorga dark theme.
 * Lists games enabled by admin, opens GameLauncher modal on tap.
 */

const ALL_GAMES = [
  { id: 'morpion',    name: 'Morpion',     emoji: '⭕', desc: 'Tic-tac-toe vs CPU',     playable: true  },
  { id: 'snake',      name: 'Snake',       emoji: '🐍', desc: 'Le serpent culte',       playable: true  },
  { id: '2048',       name: '2048',        emoji: '🔢', desc: 'Glissez et fusionnez',   playable: true  },
  { id: 'memory',     name: 'Memory',      emoji: '🧠', desc: 'Paires de cartes',       playable: true  },
  { id: 'pong',       name: 'Pong',        emoji: '🏓', desc: 'Le pong original',       playable: true  },
  { id: 'puissance4', name: 'Puissance 4', emoji: '🔵', desc: 'Aligner 4 jetons',       playable: true  },
  { id: 'quiz',       name: 'Quiz',        emoji: '❓', desc: 'Culture générale',       playable: true  },
  { id: 'darts',      name: 'Fléchettes',  emoji: '🎯', desc: 'Visez le centre',        playable: true  },
  { id: 'echecs',     name: 'Échecs',      emoji: '♟', desc: 'Le classique stratégique', playable: false },
  { id: 'solitaire',  name: 'Solitaire',   emoji: '🃏', desc: 'Cartes en solo',         playable: false },
  { id: 'blackjack',  name: 'Blackjack',   emoji: '🂡', desc: '21 ou rien',             playable: false },
  { id: 'demineur',   name: 'Démineur',    emoji: '💣', desc: 'Bombes et logique',      playable: false },
  { id: 'bingo',      name: 'Bingo',       emoji: '🎱', desc: 'Cartons et hasard',      playable: false },
  { id: 'simon',      name: 'Simon',       emoji: '🔴', desc: 'Mémorisez la séquence',  playable: false },
  { id: 'pendu',      name: 'Le Pendu',    emoji: '🪢', desc: 'Devinez le mot',         playable: false },
  { id: 'dames',      name: 'Dames',       emoji: '⬛', desc: 'Manger les pièces',      playable: false },
  { id: 'puzzle',     name: 'Puzzle',      emoji: '🧩', desc: 'Reconstituez',           playable: false },
  { id: 'tetris',     name: 'Tetris',      emoji: '🟦', desc: 'Lignes complètes',       playable: false },
  { id: 'flappy',     name: 'Flappy',      emoji: '🐦', desc: 'Évitez les obstacles',   playable: false },
  { id: 'sudoku',     name: 'Sudoku',      emoji: '🔢', desc: 'Logique 9×9',            playable: false },
  { id: 'mots',       name: 'Mots cachés', emoji: '🔤', desc: 'Trouvez les mots',       playable: false },
  { id: 'billiard',   name: 'Billard',     emoji: '🎱', desc: 'Empochez les boules',    playable: false },
  { id: 'foot',       name: 'Penalty',     emoji: '⚽', desc: 'Tirs au but',            playable: false },
  { id: 'racing',     name: 'Racing',      emoji: '🏎', desc: 'Course rapide',          playable: false },
  { id: 'pacman',     name: 'Pac-Man',     emoji: '👻', desc: 'Mangez les fantômes',    playable: false },
  { id: 'mahjong',    name: 'Mahjong',     emoji: '🀄', desc: 'Tuiles solitaire',       playable: false },
  { id: 'reversi',    name: 'Reversi',     emoji: '⚪', desc: 'Othello / Reversi',      playable: false },
  { id: 'morpion',    name: 'Morpion',     emoji: '⭕', desc: 'Doublon',                 playable: false },
]

export default function GamesPage() {
  const { config } = usePortalConfig(2500)
  const enabled = config?.games || {}
  const [activeGame, setActiveGame] = useState<string | null>(null)

  // Default: if no per-game config received yet, show all
  const visibleGames = (Object.keys(enabled).length === 0
    ? ALL_GAMES
    : ALL_GAMES.filter((g) => enabled[g.id] !== false))
    // Dedupe by ID (in case the list above has accidental doubles)
    .filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i)

  const accent = config?.accentColor || '#a78bfa'

  return (
    <div style={{
      padding: 16,
      background: 'linear-gradient(180deg, #0a0a14 0%, #1a0a2e 100%)',
      color: '#f1f5f9',
      minHeight: '100%',
    }}>
      <header style={{ marginBottom: 16, paddingTop: 20 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 800,
          background: `linear-gradient(135deg, ${accent}, #ec4899)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          🎮 Jeux à votre table
        </h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
          {visibleGames.length} jeu(x) — gratuits, sans inscription
        </p>
      </header>

      {visibleGames.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, color: '#94a3b8',
        }}>
          <div style={{ fontSize: 40 }}>🚧</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            Aucun jeu activé
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}>
          {visibleGames.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGame(g.id)}
              style={{
                padding: 16, borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                border: g.playable ? `1px solid ${accent}40` : '1px solid rgba(255,255,255,0.08)',
                background: g.playable
                  ? `linear-gradient(135deg, ${accent}15, rgba(236,72,153,0.08))`
                  : 'rgba(255,255,255,0.03)',
                color: '#f1f5f9',
                transition: 'all .15s', position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${accent}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {g.playable && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  padding: '2px 6px', borderRadius: 999,
                  background: '#10b981', color: '#fff',
                  fontSize: 8, fontWeight: 800, letterSpacing: 0.5,
                }}>JOUABLE</span>
              )}
              <div style={{ fontSize: 36 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: '#f1f5f9' }}>
                {g.name}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {g.desc}
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeGame && (
          <GameLauncher
            gameId={activeGame}
            onClose={() => setActiveGame(null)}
            accent={accent}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
