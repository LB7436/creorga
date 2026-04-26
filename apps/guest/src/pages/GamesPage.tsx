import { usePortalConfig } from '../usePortalConfig'

/**
 * Games page on guest portal — shows only the games the admin enabled
 * via /clients (admin) module. Reads `config.games[gameId]` per-game flag.
 */

const ALL_GAMES = [
  { id: 'echecs',     name: 'Échecs',     emoji: '♟', desc: 'Le classique stratégique' },
  { id: 'solitaire',  name: 'Solitaire',  emoji: '🃏', desc: 'Cartes en solo' },
  { id: 'blackjack',  name: 'Blackjack',  emoji: '🂡', desc: '21 ou rien' },
  { id: 'snake',      name: 'Snake',      emoji: '🐍', desc: 'Le serpent culte' },
  { id: 'demineur',   name: 'Démineur',   emoji: '💣', desc: 'Bombes et logique' },
  { id: '2048',       name: '2048',       emoji: '🔢', desc: 'Glissez et fusionnez' },
  { id: 'bingo',      name: 'Bingo',      emoji: '🎱', desc: 'Cartons et hasard' },
  { id: 'simon',      name: 'Simon',      emoji: '🔴', desc: 'Mémorisez la séquence' },
  { id: 'pendu',      name: 'Le Pendu',   emoji: '🪢', desc: 'Devinez le mot' },
  { id: 'memory',     name: 'Memory',     emoji: '🧠', desc: 'Paires de cartes' },
  { id: 'puissance4', name: 'Puissance 4',emoji: '🔵', desc: 'Aligner 4 jetons' },
  { id: 'morpion',    name: 'Morpion',    emoji: '⭕', desc: 'Tic-tac-toe' },
  { id: 'dames',      name: 'Dames',      emoji: '⬛', desc: 'Manger les pièces' },
  { id: 'puzzle',     name: 'Puzzle',     emoji: '🧩', desc: 'Reconstituez l\'image' },
  { id: 'tetris',     name: 'Tetris',     emoji: '🟦', desc: 'Lignes complètes' },
  { id: 'flappy',     name: 'Flappy',     emoji: '🐦', desc: 'Évitez les obstacles' },
  { id: 'sudoku',     name: 'Sudoku',     emoji: '🔢', desc: 'Logique 9×9' },
  { id: 'mots',       name: 'Mots cachés', emoji: '🔤', desc: 'Trouvez les mots' },
  { id: 'quiz',       name: 'Quiz',       emoji: '❓', desc: 'Culture générale' },
  { id: 'darts',      name: 'Fléchettes', emoji: '🎯', desc: 'Visez le centre' },
  { id: 'billiard',   name: 'Billard',    emoji: '🎱', desc: 'Empochez les boules' },
  { id: 'foot',       name: 'Penalty',    emoji: '⚽', desc: 'Tirs au but' },
  { id: 'racing',     name: 'Racing',     emoji: '🏎', desc: 'Course rapide' },
  { id: 'pacman',     name: 'Pac-Man',    emoji: '👻', desc: 'Mangez les fantômes' },
  { id: 'mahjong',    name: 'Mahjong',    emoji: '🀄', desc: 'Tuiles solitaire' },
  { id: 'chess960',   name: 'Chess 960',  emoji: '♛', desc: 'Échecs aléatoires' },
  { id: 'reversi',    name: 'Reversi',    emoji: '⚪', desc: 'Othello / Reversi' },
  { id: 'pong',       name: 'Pong',       emoji: '🏓', desc: 'Le pong original' },
]

export default function GamesPage() {
  const { config } = usePortalConfig(2500)
  const enabled = config?.games || {}

  // Default: if no per-game config received yet, show all
  const visibleGames = Object.keys(enabled).length === 0
    ? ALL_GAMES
    : ALL_GAMES.filter((g) => enabled[g.id] !== false)

  const accent = config?.accentColor || '#6366f1'

  return (
    <div style={{ padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
          🎮 Jeux à votre table
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          {visibleGames.length} jeu(x) disponible(s) — choix du restaurant
        </p>
      </header>

      {visibleGames.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: '#f8fafc', borderRadius: 14, color: '#94a3b8',
        }}>
          <div style={{ fontSize: 40 }}>🚧</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            Aucun jeu activé pour le moment
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Le restaurant peut activer des jeux dans son admin.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        }}>
          {visibleGames.map((g) => (
            <button
              key={g.id}
              onClick={() => alert(`🎮 ${g.name}\n\n${g.desc}\n\nLe jeu sera lancé ici`)}
              style={{
                padding: 16, borderRadius: 14, border: `2px solid ${accent}30`,
                background: '#fff', cursor: 'pointer', textAlign: 'center',
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 6px 18px ${accent}30`
                e.currentTarget.style.borderColor = accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = `${accent}30`
              }}
            >
              <div style={{ fontSize: 36 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: '#1e293b' }}>
                {g.name}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {g.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
