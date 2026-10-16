// Point d'entrée du profil complet ; Vite le remplace au build professionnel.
import { JEUX_SELECTIONNES, estCasino, estJouable, libelleJoueurs } from '@/pages/guest/games/catalog'
export { default as GamesSection } from '@/pages/guest/GamesSection'
export const GAMES_ENABLED = true
export const gameEntries = JEUX_SELECTIONNES.filter(estJouable).map(game => ({
  id: game.id, name: game.name, emoji: game.icon,
  detail: estCasino(game) ? 'Casino · mises fictives · 18+' : libelleJoueurs(game),
  beta: game.statut === 'beta', casino: estCasino(game),
}))
