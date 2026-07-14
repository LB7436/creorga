export type GameCategory = 'all' | 'classiques' | 'cartes' | 'reflexion' | 'arcade' | 'multi' | 'casino'
export type GameDifficulty = 'facile' | 'moyen' | 'difficile'

export type GamePlayers = 'solo' | 'vscpu' | 'duo'

export interface GuestGameDef {
  id: string
  name: string
  icon: string
  categories: Exclude<GameCategory, 'all'>[]
  description: string
  estTime: string
  difficulty: 1 | 2 | 3
  rating: number
  hot?: boolean
  new?: boolean
  available: boolean
  players?: GamePlayers
}

export const PLAYERS_LABEL: Record<GamePlayers, string> = {
  solo: 'Solo',
  vscpu: 'Vs CPU',
  duo: '2 joueurs',
}

export const CATEGORY_META: { id: GameCategory; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'Tous', icon: '🎮', color: '#a855f7' },
  { id: 'classiques', label: 'Classiques', icon: '♟️', color: '#f59e0b' },
  { id: 'cartes', label: 'Cartes', icon: '🃏', color: '#ef4444' },
  { id: 'reflexion', label: 'Réflexion', icon: '🧠', color: '#3b82f6' },
  { id: 'arcade', label: 'Arcade', icon: '🕹️', color: '#22c55e' },
  { id: 'multi', label: 'Duel', icon: '👥', color: '#06b6d4' },
  { id: 'casino', label: 'Casino', icon: '🎲', color: '#ec4899' },
]

export const GUEST_GAMES: GuestGameDef[] = [
  { id: 'chess', name: 'Échecs', icon: '♟️', categories: ['classiques', 'reflexion'], description: 'IA tactique, coups légaux, vraie pression de fin de partie', estTime: '15 min', difficulty: 3, rating: 4.8, hot: true, available: true, players: 'vscpu' },
  { id: 'solitaire', name: 'Solitaire', icon: '🂡', categories: ['classiques', 'cartes'], description: 'Klondike tactile avec annulation et auto-move', estTime: '10 min', difficulty: 2, rating: 4.6, available: true, players: 'solo' },
  { id: 'memory', name: 'Memory', icon: '🔮', categories: ['classiques'], description: 'Paires, rythme court et parfait pendant l’attente', estTime: '5 min', difficulty: 1, rating: 4.5, available: true, players: 'solo' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', categories: ['cartes', 'casino'], description: 'Croupier CPU, mises fictives et partie rapide', estTime: '8 min', difficulty: 2, rating: 4.7, hot: true, available: true, players: 'vscpu' },
  { id: 'poker', name: "Poker Hold'em", icon: '♠️', categories: ['cartes', 'casino'], description: "Texas Hold'em contre CPU avec mains lisibles", estTime: '12 min', difficulty: 3, rating: 4.9, new: true, available: true, players: 'vscpu' },
  { id: 'bataille', name: 'Bataille', icon: '⚔️', categories: ['cartes', 'multi'], description: 'Cartes rapides, parfait à deux autour de la table', estTime: '7 min', difficulty: 1, rating: 4.2, available: true, players: 'duo' },
  { id: 'higherlower', name: 'Plus ou Moins', icon: '📈', categories: ['cartes'], description: 'Suite de cartes, risque simple et immédiat', estTime: '4 min', difficulty: 1, rating: 4.3, available: true },
  { id: 'mastermind', name: 'Mastermind', icon: '🔐', categories: ['reflexion'], description: 'Déduction courte avec feedback clair', estTime: '6 min', difficulty: 2, rating: 4.4, available: true },
  { id: '2048', name: '2048', icon: '🔢', categories: ['reflexion'], description: "Glisse, fusionne, vise le record local", estTime: '10 min', difficulty: 2, rating: 4.8, hot: true, available: true },
  { id: 'snake', name: 'Snake', icon: '🐍', categories: ['arcade'], description: 'Contrôle tactile, vitesse progressive, record tablette', estTime: '5 min', difficulty: 1, rating: 4.5, available: true },
  { id: 'towerdefense', name: 'Tower Defense', icon: '🗼', categories: ['arcade'], description: "15 vagues, boss, économie et tours améliorables", estTime: '15 min', difficulty: 3, rating: 4.6, new: true, available: true },
  { id: 'maxiburger', name: 'Maxi Burger', icon: '🍔', categories: ['arcade'], description: 'Empilez le plus haut burger : timing, découpes et combos Parfait', estTime: '3 min', difficulty: 1, rating: 4.8, new: true, available: true, players: 'solo' },
  { id: 'castlerush', name: 'Castle Rush', icon: '🏰', categories: ['arcade'], description: 'Défends ton château au réflexe : tape les assaillants, huile bouillante et boss de vague', estTime: '4 min', difficulty: 2, rating: 4.7, new: true, available: true, players: 'solo' },
  { id: 'ttt', name: 'Morpion', icon: '✖️', categories: ['classiques', 'multi'], description: 'Duel instantané, idéal pour enfants et familles', estTime: '3 min', difficulty: 1, rating: 4.1, available: true, players: 'duo' },
  { id: 'connect4', name: 'Puissance 4', icon: '🔴', categories: ['multi'], description: 'Duel clair, jetons tactiles, lecture immédiate', estTime: '6 min', difficulty: 2, rating: 4.5, available: true, players: 'duo' },
  { id: 'reversi', name: 'Reversi', icon: '⭕', categories: ['reflexion', 'multi'], description: 'Othello mobile avec IA et choix de niveau', estTime: '10 min', difficulty: 2, rating: 4.3, available: true, players: 'vscpu' },
  { id: 'sliding', name: 'Taquin', icon: '🧩', categories: ['reflexion'], description: "Puzzle tactile, records par taille de grille", estTime: '7 min', difficulty: 2, rating: 4.0, available: true },
  { id: 'yahtzee', name: 'Yahtzee', icon: '🎲', categories: ['classiques'], description: 'Dés, scorecard complète, décisions rapides', estTime: '12 min', difficulty: 2, rating: 4.6, available: true },
  { id: 'farkle', name: 'Farkle', icon: '🎲', categories: ['casino'], description: 'Stop ou encore avec dés fictifs', estTime: '8 min', difficulty: 2, rating: 4.4, available: true },
  { id: '421', name: '421', icon: '🎯', categories: ['classiques'], description: 'Jeu de café, rapide et parfait au comptoir', estTime: '5 min', difficulty: 1, rating: 4.3, available: true },
  { id: 'pig', name: 'Pig Dice', icon: '🎲', categories: ['classiques'], description: 'Banque ou risque tout, très accessible', estTime: '6 min', difficulty: 1, rating: 4.2, available: true },
  { id: 'motus', name: 'Motus', icon: '📝', categories: ['reflexion'], description: 'Mots courts, indices couleur, rythme TV', estTime: '5 min', difficulty: 2, rating: 4.7, available: true },
  { id: 'hangman', name: 'Pendu', icon: '🪢', categories: ['classiques'], description: 'Devine le mot avec une interface propre', estTime: '4 min', difficulty: 1, rating: 4.4, available: true },
  { id: 'simon', name: 'Simon', icon: '🔵', categories: ['arcade'], description: 'Mémoire visuelle, séquences progressives', estTime: '4 min', difficulty: 1, rating: 4.3, available: true },
  { id: 'reaction', name: 'Réaction', icon: '⚡', categories: ['arcade'], description: 'Réflexes, chrono, parfait en défi de table', estTime: '2 min', difficulty: 1, rating: 4.2, available: true },
  { id: 'minesweeper', name: 'Démineur', icon: '💣', categories: ['arcade', 'reflexion'], description: 'Logique classique, drapeaux et tactile', estTime: '8 min', difficulty: 2, rating: 4.5, available: true },
  { id: 'quizgen', name: 'Quiz Général', icon: '❓', categories: ['reflexion'], description: 'Culture générale en 10 questions', estTime: '6 min', difficulty: 2, rating: 4.6, available: true },
  { id: 'bingo', name: 'Bingo', icon: '🎱', categories: ['casino', 'multi'], description: 'Grille claire et tirages rapides', estTime: '10 min', difficulty: 1, rating: 4.2, available: true, players: 'duo' },
  { id: 'scoopa', name: 'Scoopa 3D', icon: '🃏', categories: ['cartes', 'multi'], description: 'Scopa italienne premium: captures, Denari, Primiera et table 3D', estTime: '12 min', difficulty: 2, rating: 4.8, new: true, available: true, players: 'vscpu' },
  { id: 'mensch', name: 'Petits Chevaux 3D', icon: '🔴', categories: ['classiques', 'multi'], description: 'Regles type Mensch/Ludo: sortir sur 6, captures, arrivee exacte et duel de table', estTime: '15 min', difficulty: 1, rating: 4.7, new: true, available: true, players: 'duo' },
  { id: 'basket3d', name: 'Basket Rooftop', icon: '🏀', categories: ['arcade'], description: 'Visez au drag, physique réelle, 30s chrono, 3 positions de tir', estTime: '3 min', difficulty: 1, rating: 4.7, new: true, available: true, players: 'solo' },
  { id: 'mahjong3d', name: 'Mahjong Bamboo 3D', icon: '🀄', categories: ['reflexion'], description: 'Tuiles face cachée, vrai memory chronométré', estTime: '6 min', difficulty: 1, rating: 4.6, new: true, available: true, players: 'solo' },
  { id: 'erreur11', name: 'Erreur 11 Terrasse', icon: '👁️', categories: ['reflexion', 'multi'], description: 'Trouvez les 11 différences entre les deux terrasses : précision récompensée, ratés pénalisés', estTime: '5 min', difficulty: 2, rating: 4.6, new: true, available: true },
  { id: 'billard', name: 'Billard Lounge', icon: '🎱', categories: ['arcade'], description: 'Physique 2D réelle (frictions, collisions), visée au drag, 9-ball', estTime: '7 min', difficulty: 2, rating: 4.7, new: true, available: true, players: 'solo' },
  { id: 'run21', name: 'Run 21 Creorga', icon: '🃏', categories: ['cartes', 'arcade'], description: 'Cartes arcade: 5 colonnes, une colonne a 21 pile se vide (+25), tenez le plus longtemps', estTime: '6 min', difficulty: 2, rating: 4.5, new: true, available: true },
  { id: 'tritowers', name: 'Tri-Tours Neon', icon: '⛰️', categories: ['cartes', 'arcade'], description: 'Solitaire rapide: enchainez ±1 rang pour vider les tours, combos et bonus de nettoyage', estTime: '7 min', difficulty: 2, rating: 4.5, new: true, available: true },
  { id: 'rami', name: 'Rami Salon 3D', icon: '🃏', categories: ['cartes', 'multi'], description: 'Rami vs CPU : tours, défausse, fin de manche et comptage', estTime: '12 min', difficulty: 2, rating: 4.8, new: true, available: true, players: 'vscpu' },
  { id: 'rummikub', name: 'Rummi Kub 3D', icon: '🧩', categories: ['classiques', 'reflexion', 'multi'], description: 'Tuiles vs CPU : groupes, suites et chevalet tactile', estTime: '12 min', difficulty: 2, rating: 4.8, new: true, available: true, players: 'vscpu' },
  { id: 'numbermemory', name: 'Mémoire Chiffres', icon: '🧠', categories: ['reflexion'], description: 'Suites de chiffres, progression nette', estTime: '5 min', difficulty: 2, rating: 4.3, available: true },
  { id: 'wordscramble', name: 'Anagramme', icon: '🔀', categories: ['reflexion'], description: "Remets les lettres dans l’ordre", estTime: '5 min', difficulty: 2, rating: 4.4, available: true },
  { id: 'tetris', name: 'Tetris', icon: '🧱', categories: ['arcade'], description: 'Prévu pour une prochaine version', estTime: '8 min', difficulty: 2, rating: 4.9, available: false },
  { id: 'slots', name: 'Machine à sous', icon: '🎰', categories: ['casino'], description: 'Désactivé tant que le cadre légal n’est pas validé', estTime: '3 min', difficulty: 1, rating: 4.6, available: false },
  { id: 'roulette', name: 'Roulette', icon: '🎡', categories: ['casino'], description: 'Désactivé tant que le cadre légal n’est pas validé', estTime: '5 min', difficulty: 2, rating: 4.5, available: false },
]

export const GAME_ID_ALIASES: Record<string, string> = {
  war: 'bataille',
  tictactoe: 'ttt',
  highlow: 'higherlower',
  puzzle: 'sliding',
  quiz: 'quizgen',
  scopa: 'scoopa',
  scoopa3d: 'scoopa',
  ludo: 'mensch',
  mensch3d: 'mensch',
  basket: 'basket3d',
  basketball: 'basket3d',
  mahjong: 'mahjong3d',
  erreur: 'erreur11',
  difference: 'erreur11',
  differences: 'erreur11',
  pool: 'billard',
  billiards: 'billard',
  rummy: 'rami',
  rummikub3d: 'rummikub',
}

export function difficultyLabel(value: GuestGameDef['difficulty']) {
  return value === 1 ? 'facile' : value === 2 ? 'moyen' : 'difficile'
}
