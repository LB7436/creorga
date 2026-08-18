import type { ComponentType } from 'react'

/**
 * Registre central des jeux du portail client — SEULE source de vérité.
 *
 * Tout ce que le hub (`GamesSection`), le back-office (`ClientsConfig`) et la
 * progression locale savent d'un jeu vient d'ici : nom FR, vignette, joueurs
 * réels, modes réellement pris en charge, qui choisit le niveau, âge, statut,
 * moteur de rendu et chargeur du composant.
 *
 * Règles d'honnêteté (vague v4.9 de la refonte) :
 *  - `modes` ne déclare que ce que le code du jeu fait vraiment (vérifié jeu
 *    par jeu : Puissance 4, Morpion et Bataille sont contre l'ordinateur, pas
 *    « 2 joueurs » ; seuls Petits Chevaux et Scoopa se jouent à plusieurs).
 *  - `niveau` = 'lanceur' seulement si le jeu lit la difficulté choisie dans le
 *    dialogue de lancement (`useGameShell`) ; 'en-jeu' s'il a son propre
 *    sélecteur ; 'fixe' sinon. Le lanceur n'affiche le choix qu'à bon escient.
 *  - `rendu` = '3d' uniquement pour les jeux en three.js (Petits Chevaux,
 *    Tower Defense) ; les scènes CSS en perspective sont notées '2.5d'.
 *  - Aucune note « 4,7 ★ » : personne ne les avait données.
 *  - `recommande` est réservé aux jeux famille, jouables, hors casino — un
 *    test unitaire (`catalog.test.ts`) le garantit.
 *  - `statut: 'beta'` = jouable de bout en bout mais règles simplifiées par
 *    rapport au jeu annoncé ; la raison est écrite dans `raisonBeta`.
 */

export type GameCategory = 'all' | 'famille' | 'cartes' | 'reflexion' | 'arcade' | 'multi' | 'tournois' | 'casino'
export type GameDifficulty = 'facile' | 'moyen' | 'difficile'
/** jouable = complet · beta = jouable, règles simplifiées · bientot = pas encore proposé */
export type StatutJeu = 'jouable' | 'beta' | 'bientot'
/** solo = seul face au jeu · cpu = contre l'ordinateur · local = plusieurs personnes sur la même tablette · tournoi = manches et classement de table */
export type ModeJeu = 'solo' | 'cpu' | 'local' | 'tournoi'
/** lanceur = lit la difficulté du dialogue de lancement · en-jeu = sélecteur dans le jeu · fixe = pas de réglage */
export type ChoixNiveau = 'lanceur' | 'en-jeu' | 'fixe'
export type RenduJeu = '2d' | '2.5d' | '3d'
/** Aucun jeu n'est en ligne aujourd'hui : tout se joue sur l'appareil, seuls les scores remontent au serveur. */
export type ConnexionJeu = 'local' | 'en-ligne'
export type MiniatureJeu =
  | 'cards' | 'board' | 'dice' | 'word' | 'memory' | 'snake' | 'bingo' | 'hoop'
  | 'pool' | 'tiles' | 'chess' | 'tower' | 'arcade' | 'grid' | 'tokens'

export type GameModule = { default: ComponentType<{ onBack?: () => void }> }

export interface GuestGameDef {
  /** Identifiant stable : clé de la config portail, des scores et des favoris. Ne jamais renommer. */
  id: string
  /** Nom français affiché. */
  name: string
  /** Emoji unique dans tout le catalogue (test unitaire). */
  icon: string
  /** Vignette dessinée par le hub. */
  miniature: MiniatureJeu
  categories: Exclude<GameCategory, 'all'>[]
  /** Une phrase, sans promesse que le jeu ne tient pas. */
  description: string
  /** Règles en une ou deux phrases, affichées avant de lancer. */
  regles: string
  /** Durée indicative d'une partie. */
  estTime: string
  /** Complexité intrinsèque du jeu (filtre « Niveau »), indépendante d'un réglage. */
  difficulty: 1 | 2 | 3
  niveau: ChoixNiveau
  /** Nombre de personnes réellement gérées par le jeu sur la même tablette. */
  joueurs: { min: number; max: number }
  modes: ModeJeu[]
  ageMin: number
  statut: StatutJeu
  raisonBeta?: string
  rendu: RenduJeu
  connexion: ConnexionJeu
  /** Conçu pour un écran de téléphone (le hub est mobile-first). */
  mobile: boolean
  /** Mis en avant sur le portail. Famille et jouable uniquement. */
  recommande?: boolean
  /** Chargeur paresseux du composant. Absent = le jeu ne peut pas s'ouvrir (statut 'bientot'). */
  chargeur?: () => Promise<GameModule>
}

export const CATEGORY_META: { id: GameCategory; label: string; icon: string; color: string; hint?: string }[] = [
  { id: 'all', label: 'Tous', icon: '🎮', color: '#a855f7' },
  { id: 'famille', label: 'Famille', icon: '🧸', color: '#f59e0b', hint: 'Classiques pour petits et grands' },
  { id: 'cartes', label: 'Cartes', icon: '🃏', color: '#ef4444' },
  { id: 'reflexion', label: 'Réflexion', icon: '🧠', color: '#3b82f6' },
  { id: 'arcade', label: 'Arcade', icon: '🕹️', color: '#22c55e' },
  { id: 'multi', label: 'Multijoueur', icon: '👥', color: '#06b6d4', hint: 'À plusieurs sur la même tablette' },
  { id: 'tournois', label: 'Tournois', icon: '🏆', color: '#eab308', hint: 'Manches et classement de table' },
  { id: 'casino', label: 'Casino', icon: '🎰', color: '#ec4899', hint: 'Mises fictives, réservé aux adultes' },
]

const LOCAL: Pick<GuestGameDef, 'connexion' | 'mobile'> = { connexion: 'local', mobile: true }

export const GUEST_GAMES: GuestGameDef[] = [
  // ─── Famille ──────────────────────────────────────────────────────────────
  {
    id: 'mensch', name: 'Petits Chevaux 3D', icon: '🐴', miniature: 'board',
    categories: ['famille', 'multi', 'tournois'],
    description: 'Plateau en vraie 3D : seul contre l’ordinateur ou de 2 à 4 joueurs sur la tablette, avec mode tournoi.',
    regles: 'Un 6 fait sortir un pion. On avance du total du dé, on capture en tombant sur un pion adverse, et il faut le compte exact pour rentrer ses quatre pions à l’écurie.',
    estTime: '15 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 4 }, modes: ['cpu', 'local', 'tournoi'], ageMin: 6,
    statut: 'jouable', rendu: '3d', ...LOCAL, recommande: true,
    chargeur: () => import('./MenschGame'),
  },
  {
    id: 'scoopa', name: 'Scoopa', icon: '🪙', miniature: 'cards',
    categories: ['famille', 'cartes', 'multi'],
    description: 'La Scopa italienne à 40 cartes, de 2 à 4 joueurs qui se passent la tablette.',
    regles: 'À son tour, on capture les cartes de la table dont la somme égale la carte jouée. Points pour le plus de cartes, les Denari, le Settebello, la Primiera et chaque « scopa » (table vidée).',
    estTime: '12 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 2, max: 4 }, modes: ['local'], ageMin: 8,
    statut: 'jouable', rendu: '2.5d', ...LOCAL, recommande: true,
    chargeur: () => import('./ScopaGame'),
  },
  {
    id: 'memory', name: 'Memory', icon: '🔮', miniature: 'memory',
    categories: ['famille', 'reflexion'],
    description: 'Retrouvez les paires : plusieurs thèmes d’images et un mode difficile à symboles.',
    regles: 'Retournez deux cartes. Si elles sont identiques, elles restent visibles ; sinon mémorisez-les. La partie est gagnée quand toutes les paires sont trouvées.',
    estTime: '5 min', difficulty: 1, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 4,
    statut: 'jouable', rendu: '2d', ...LOCAL, recommande: true,
    chargeur: () => import('./MemoryGame'),
  },
  {
    id: 'connect4', name: 'Puissance 4', icon: '🔴', miniature: 'tokens',
    categories: ['famille', 'reflexion'],
    description: 'Alignez quatre jetons contre l’ordinateur.',
    regles: 'Chacun son tour, on lâche un jeton dans une colonne ; il tombe au plus bas. Le premier qui aligne quatre jetons (ligne, colonne ou diagonale) gagne.',
    estTime: '6 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL, recommande: true,
    chargeur: () => import('./ConnectFourGame'),
  },
  {
    id: 'ttt', name: 'Morpion', icon: '✖️', miniature: 'grid',
    categories: ['famille'],
    description: 'Le morpion contre l’ordinateur, parties d’une minute.',
    regles: 'Trois symboles alignés gagnent. L’ordinateur joue les ronds.',
    estTime: '3 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 4,
    statut: 'jouable', rendu: '2d', ...LOCAL, recommande: true,
    chargeur: () => import('./TicTacToeGame'),
  },
  {
    id: 'rummikub', name: 'Rummi Kub', icon: '🀄', miniature: 'tiles',
    categories: ['famille', 'reflexion'],
    description: 'Groupes et suites de tuiles contre l’ordinateur, table partagée et chevalet tactile.',
    regles: 'Posez des groupes (même chiffre, couleurs différentes) ou des suites (même couleur, chiffres qui se suivent) d’au moins trois tuiles. Le premier à vider son chevalet gagne.',
    estTime: '12 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 8,
    statut: 'jouable', rendu: '2.5d', ...LOCAL, recommande: true,
    chargeur: () => import('./RummikubGame'),
  },
  {
    id: 'simon', name: 'Simon', icon: '🔵', miniature: 'memory',
    categories: ['famille', 'arcade'],
    description: 'Répétez la séquence de couleurs, qui s’allonge à chaque tour.',
    regles: 'Regardez les couleurs s’allumer, puis rejouez la séquence dans l’ordre. Une erreur termine la partie.',
    estTime: '4 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 4,
    statut: 'jouable', rendu: '2d', ...LOCAL, recommande: true,
    chargeur: () => import('./SimonGame'),
  },
  {
    id: 'yahtzee', name: 'Yahtzee', icon: '🎲', miniature: 'dice',
    categories: ['famille'],
    description: 'Cinq dés, trois lancers, une feuille de score complète.',
    regles: 'Lancez jusqu’à trois fois en gardant les dés voulus, puis inscrivez le résultat dans une case libre : brelan, full, suites, Yahtzee (cinq identiques).',
    estTime: '12 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL, recommande: true,
    chargeur: () => import('./YahtzeeGame'),
  },
  {
    id: 'bingo', name: 'Bingo', icon: '🎫', miniature: 'bingo',
    categories: ['famille'],
    description: 'Un carton, des tirages, pointage au doigt ou automatique.',
    regles: 'Les numéros sortent un à un ; cochez-les sur votre carton. Une ligne complète fait bingo.',
    estTime: '10 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./BingoGame'),
  },
  {
    id: 'pig', name: 'Pig Dice', icon: '🐷', miniature: 'dice',
    categories: ['famille'],
    description: 'Banquez ou risquez tout au dé, contre l’ordinateur.',
    regles: 'Lancez le dé autant de fois que vous voulez et cumulez ; un 1 fait tout perdre pour le tour. « Banquez » pour mettre vos points à l’abri. Premier à 100.',
    estTime: '6 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./PigGame'),
  },
  {
    id: 'farkle', name: 'Farkle', icon: '💥', miniature: 'dice',
    categories: ['famille'],
    description: 'Six dés, stop ou encore, contre l’ordinateur.',
    regles: 'Mettez de côté des dés qui marquent (1, 5, brelans…) et relancez le reste, ou arrêtez-vous pour banquer. Aucun dé marquant : « farkle », le tour est perdu.',
    estTime: '8 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./FarkleGame'),
  },
  {
    id: '421', name: '421', icon: '🎯', miniature: 'dice',
    categories: ['famille'],
    description: 'Le jeu de dés des comptoirs, contre l’ordinateur.',
    regles: 'Trois dés, jusqu’à trois lancers par tour. Le 4-2-1 est la meilleure combinaison ; le perdant de la manche encaisse les jetons de la combinaison gagnante, et l’on est éliminé à 15 jetons.',
    estTime: '5 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 12,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./Game421'),
  },
  {
    id: 'bataille', name: 'Bataille', icon: '⚔️', miniature: 'cards',
    categories: ['famille', 'cartes'],
    description: 'La bataille de cartes contre l’ordinateur.',
    regles: 'Chacun retourne sa carte du dessus ; la plus forte remporte les deux. Égalité : bataille, on rejoue et le gagnant ramasse tout.',
    estTime: '7 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 5,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./WarGame'),
  },
  {
    id: 'hangman', name: 'Pendu', icon: '🪢', miniature: 'word',
    categories: ['famille', 'reflexion'],
    description: 'Devinez le mot lettre par lettre ; le nombre de vies se choisit dans le jeu.',
    regles: 'Proposez des lettres. Chaque lettre absente coûte une vie ; trouvez le mot avant d’être à court.',
    estTime: '4 min', difficulty: 1, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./Hangman'),
  },
  {
    id: 'sliding', name: 'Taquin', icon: '🧩', miniature: 'grid',
    categories: ['famille', 'reflexion'],
    description: 'Remettez les cases dans l’ordre en les faisant glisser.',
    regles: 'Faites glisser une case voisine du trou pour la déplacer. Reconstituez l’ordre en un minimum de coups.',
    estTime: '7 min', difficulty: 2, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./SlidingPuzzleGame'),
  },
  {
    id: 'mahjong3d', name: 'Mémo Bambou', icon: '🎋', miniature: 'tiles',
    categories: ['famille', 'reflexion'],
    description: 'Un memory de tuiles chronométré, dans un décor de bambou.',
    regles: 'Retournez deux tuiles pour trouver la paire. Moins de coups et moins de secondes font plus de points.',
    estTime: '6 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2.5d', ...LOCAL,
    chargeur: () => import('./MahjongGame'),
  },
  {
    id: 'erreur11', name: 'Erreur 11 Terrasse', icon: '👁️', miniature: 'grid',
    categories: ['famille', 'reflexion'],
    description: 'Trouvez les 11 différences entre les deux terrasses.',
    regles: 'Touchez les différences dans la scène de droite. Chaque erreur trouvée rapporte des points, chaque clic raté en enlève.',
    estTime: '5 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2.5d', ...LOCAL,
    chargeur: () => import('./SpotErrorGame'),
  },

  // ─── Cartes ───────────────────────────────────────────────────────────────
  {
    id: 'solitaire', name: 'Solitaire', icon: '🂡', miniature: 'cards',
    categories: ['cartes'],
    description: 'Le Klondike classique, tactile, avec annulation et déplacement automatique.',
    regles: 'Construisez les quatre familles de l’as au roi. Sur le tableau, on alterne les couleurs en descendant ; on pioche quand on est bloqué.',
    estTime: '10 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./SolitaireGame'),
  },
  {
    id: 'higherlower', name: 'Plus ou Moins', icon: '📈', miniature: 'cards',
    categories: ['cartes'],
    description: 'La prochaine carte sera-t-elle plus haute ou plus basse ?',
    regles: 'Annoncez plus ou moins avant de retourner la carte suivante. Enchaînez les bonnes réponses pour faire monter la série.',
    estTime: '4 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./HigherLowerGame'),
  },
  {
    id: 'run21', name: 'Run 21', icon: '♣️', miniature: 'cards',
    categories: ['cartes', 'arcade'],
    description: 'Placez les cartes dans cinq colonnes sans jamais dépasser 21.',
    regles: 'Une colonne qui atteint 21 pile rapporte 25 points et se vide. La partie s’arrête quand plus aucune colonne ne peut recevoir la carte en cours.',
    estTime: '6 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2.5d', ...LOCAL,
    chargeur: () => import('./Run21Game'),
  },
  {
    id: 'tritowers', name: 'Tri-Tours Neon', icon: '⛰️', miniature: 'cards',
    categories: ['cartes', 'arcade'],
    description: 'Un solitaire rapide : enchaînez les cartes à ±1 rang pour raser les trois tours.',
    regles: 'Prenez toute carte découverte qui vaut un rang de plus ou de moins que la carte en cours ; piochez si rien ne convient. Les enchaînements rapportent des combos.',
    estTime: '7 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2.5d', ...LOCAL,
    chargeur: () => import('./TriTowersGame'),
  },
  {
    id: 'rami', name: 'Rami Salon', icon: '♦️', miniature: 'cards',
    categories: ['cartes'],
    description: 'Un rami simplifié contre l’ordinateur : pioche, combinaisons, sortie à 40 points.',
    regles: 'Piochez, formez des brelans, carrés ou suites et posez-les. En mode « sortie 40 », la première pose doit valoir au moins 40 points. Le premier à vider sa main gagne.',
    estTime: '12 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 10,
    statut: 'beta', raisonBeta: 'Règles simplifiées : la défausse de l’ordinateur est affichée mais ne peut pas être prise.',
    rendu: '2.5d', ...LOCAL,
    chargeur: () => import('./RamiGame'),
  },

  // ─── Réflexion ────────────────────────────────────────────────────────────
  {
    id: 'chess', name: 'Échecs', icon: '♟️', miniature: 'chess',
    categories: ['reflexion'],
    description: 'Les échecs contre l’ordinateur, coups légaux garantis, trois niveaux d’IA.',
    regles: 'Règles classiques : roque, prise en passant et promotion inclus. Mat, pat ou abandon terminent la partie.',
    estTime: '15 min', difficulty: 3, niveau: 'lanceur',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./ChessGame'),
  },
  {
    id: 'reversi', name: 'Reversi', icon: '⭕', miniature: 'grid',
    categories: ['reflexion'],
    description: 'Othello contre l’ordinateur, niveau à choisir dans le jeu.',
    regles: 'Posez un pion de façon à encadrer des pions adverses : ils changent de couleur. Quand plus personne ne peut jouer, le plus grand nombre de pions gagne.',
    estTime: '10 min', difficulty: 2, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./ReversiGame'),
  },
  {
    id: 'mastermind', name: 'Mastermind', icon: '🔐', miniature: 'tokens',
    categories: ['reflexion'],
    description: 'Cassez le code de couleurs par déduction ; nombre de couleurs à choisir dans le jeu.',
    regles: 'Proposez une combinaison ; les indices disent combien de couleurs sont bien placées et combien sont présentes mais mal placées. Trouvez le code avant la fin des essais.',
    estTime: '6 min', difficulty: 2, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./MastermindGame'),
  },
  {
    id: '2048', name: '2048', icon: '🔢', miniature: 'grid',
    categories: ['reflexion'],
    description: 'Glissez, fusionnez, visez la tuile 2048.',
    regles: 'Glissez dans une direction : toutes les tuiles bougent et deux tuiles identiques fusionnent. La grille pleine sans fusion possible termine la partie.',
    estTime: '10 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./Game2048'),
  },
  {
    id: 'minesweeper', name: 'Démineur', icon: '💣', miniature: 'grid',
    categories: ['reflexion', 'arcade'],
    description: 'Le démineur classique, tactile, avec drapeaux ; taille de grille à choisir dans le jeu.',
    regles: 'Chaque chiffre indique le nombre de mines voisines. Découvrez toutes les cases sûres et marquez les mines d’un drapeau.',
    estTime: '8 min', difficulty: 2, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./MinesweeperGame'),
  },
  {
    id: 'motus', name: 'Motus', icon: '📝', miniature: 'word',
    categories: ['reflexion'],
    description: 'Trouvez le mot en six essais grâce aux indices de couleur.',
    regles: 'Proposez un mot de la bonne longueur : une lettre rouge est bien placée, une lettre jaune est présente ailleurs.',
    estTime: '5 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./MotusGame'),
  },
  {
    id: 'quizgen', name: 'Quiz Général', icon: '❓', miniature: 'word',
    categories: ['reflexion'],
    description: 'Dix questions de culture générale, par thème.',
    regles: 'Choisissez un thème et répondez aux dix questions à choix multiples. Chaque bonne réponse rapporte des points.',
    estTime: '6 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 10,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./QuizGame'),
  },
  {
    id: 'numbermemory', name: 'Mémoire Chiffres', icon: '🧮', miniature: 'word',
    categories: ['reflexion'],
    description: 'Retenez des suites de chiffres de plus en plus longues ; rythme à choisir dans le jeu.',
    regles: 'Une suite s’affiche puis disparaît : retapez-la. Chaque réussite ajoute un chiffre.',
    estTime: '5 min', difficulty: 2, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./NumberMemoryGame'),
  },
  {
    id: 'wordscramble', name: 'Anagramme', icon: '🔀', miniature: 'word',
    categories: ['reflexion'],
    description: 'Remettez les lettres mélangées dans l’ordre.',
    regles: 'Recomposez le mot à partir des lettres proposées avant la fin du temps.',
    estTime: '5 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./WordScrambleGame'),
  },

  // ─── Arcade ───────────────────────────────────────────────────────────────
  {
    id: 'snake', name: 'Snake', icon: '🐍', miniature: 'snake',
    categories: ['arcade'],
    description: 'Le serpent au doigt, vitesse à choisir dans le jeu.',
    regles: 'Dirigez le serpent vers la nourriture : il grandit à chaque bouchée. Toucher un mur ou sa propre queue termine la partie.',
    estTime: '5 min', difficulty: 1, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./SnakeGame'),
  },
  {
    id: 'towerdefense', name: 'Tower Defense', icon: '🗼', miniature: 'tower',
    categories: ['arcade'],
    description: 'Quinze vagues en 3D, boss, économie et tours améliorables ; niveau à choisir dans le jeu.',
    regles: 'Placez des tours le long du chemin et améliorez-les avec l’or gagné. Aucun ennemi ne doit atteindre la sortie.',
    estTime: '15 min', difficulty: 3, niveau: 'en-jeu',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 10,
    statut: 'jouable', rendu: '3d', ...LOCAL,
    chargeur: () => import('./TowerDefenseGame'),
  },
  {
    id: 'maxiburger', name: 'Maxi Burger', icon: '🍔', miniature: 'arcade',
    categories: ['arcade'],
    description: 'Empilez le plus haut burger possible : timing et découpes.',
    regles: 'Touchez au bon moment pour poser chaque étage ; ce qui dépasse est coupé. Un étage parfait relance le combo. À plusieurs, chacun joue à son tour sur la même série.',
    estTime: '3 min', difficulty: 1, niveau: 'lanceur',
    joueurs: { min: 1, max: 4 }, modes: ['solo', 'local'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./MaxiBurgerGame'),
  },
  {
    id: 'castlerush', name: 'Castle Rush', icon: '🏰', miniature: 'arcade',
    categories: ['arcade'],
    description: 'Défendez le château au réflexe : touchez les assaillants avant qu’ils n’atteignent le mur.',
    regles: 'Touchez les ennemis pour les repousser, versez l’huile bouillante (elle coûte de l’or) quand ils sont trop nombreux, et tenez face au boss de fin de vague.',
    estTime: '4 min', difficulty: 2, niveau: 'lanceur',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./CastleRushGame'),
  },
  {
    id: 'reaction', name: 'Réaction', icon: '⚡', miniature: 'arcade',
    categories: ['arcade'],
    description: 'Mesurez vos réflexes au chronomètre.',
    regles: 'Touchez l’écran dès que le signal apparaît, pas avant. Le meilleur temps fait le score.',
    estTime: '2 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./ReactionGame'),
  },
  {
    id: 'basket3d', name: 'Basket Rooftop', icon: '🏀', miniature: 'hoop',
    categories: ['arcade'],
    description: 'Visez en glissant le doigt, trente secondes chrono, trois positions de tir.',
    regles: 'Glissez pour viser, relâchez pour tirer. Marquez le plus de paniers possible avant la fin du chrono.',
    estTime: '3 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./BasketballGame'),
  },
  {
    id: 'billard', name: 'Billard Lounge', icon: '🎱', miniature: 'pool',
    categories: ['arcade'],
    description: 'Un billard d’entraînement en solo : empochez toutes les billes en un minimum de coups.',
    regles: 'Glissez pour viser et doser la force. Chaque coup et chaque faute (blanche empochée) coûtent des points.',
    estTime: '7 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 8,
    statut: 'beta', raisonBeta: '9-ball simplifié : entraînement en solo, sans adversaire ni ordre imposé des billes.',
    rendu: '2d', ...LOCAL,
    chargeur: () => import('./BilliardsGame'),
  },

  // ─── Casino (mises fictives, jamais d'argent réel) ────────────────────────
  {
    id: 'blackjack', name: 'Blackjack', icon: '🃏', miniature: 'cards',
    categories: ['casino', 'cartes'],
    description: 'Blackjack contre un croupier automatique, avec des jetons fictifs.',
    regles: 'Approchez-vous de 21 sans le dépasser. Tirez, restez, doublez ou séparez ; le croupier tire jusqu’à 17.',
    estTime: '8 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 18,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./BlackjackGame'),
  },
  {
    id: 'poker', name: "Poker Hold'em", icon: '♠️', miniature: 'cards',
    categories: ['casino', 'cartes'],
    description: "Texas Hold'em contre des adversaires automatiques, jetons fictifs.",
    regles: 'Deux cartes en main, cinq sur la table. Misez, suivez ou couchez-vous à chaque tour d’enchères ; la meilleure main de cinq cartes remporte le pot.',
    estTime: '12 min', difficulty: 3, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['cpu'], ageMin: 18,
    statut: 'jouable', rendu: '2d', ...LOCAL,
    chargeur: () => import('./PokerGame'),
  },

  // ─── Pas encore proposés (jamais affichés aux clients) ────────────────────
  {
    id: 'tetris', name: 'Tetris', icon: '🧱', miniature: 'arcade',
    categories: ['arcade'],
    description: 'Prévu pour une prochaine version.',
    regles: '—',
    estTime: '8 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 6,
    statut: 'bientot', rendu: '2d', ...LOCAL,
  },
  {
    id: 'slots', name: 'Machine à sous', icon: '🎰', miniature: 'arcade',
    categories: ['casino'],
    description: 'Désactivé tant que le cadre légal n’est pas validé.',
    regles: '—',
    estTime: '3 min', difficulty: 1, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 18,
    statut: 'bientot', rendu: '2d', ...LOCAL,
  },
  {
    id: 'roulette', name: 'Roulette', icon: '🎡', miniature: 'tokens',
    categories: ['casino'],
    description: 'Désactivé tant que le cadre légal n’est pas validé.',
    regles: '—',
    estTime: '5 min', difficulty: 2, niveau: 'fixe',
    joueurs: { min: 1, max: 1 }, modes: ['solo'], ageMin: 18,
    statut: 'bientot', rendu: '2d', ...LOCAL,
  },
]

/** Anciens identifiants encore présents dans des configs portail enregistrées. */
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

/** Un jeu s'ouvre s'il a un statut proposé ET un composant à charger. */
export function estJouable(game: GuestGameDef) {
  return game.statut !== 'bientot' && typeof game.chargeur === 'function'
}

export function estCasino(game: GuestGameDef) {
  return game.categories.includes('casino')
}

/** Libellé court du badge joueurs, fidèle au code du jeu. */
export function libelleJoueurs(game: GuestGameDef) {
  if (game.joueurs.max > 1) return `${game.joueurs.min}–${game.joueurs.max} joueurs`
  if (game.modes.includes('cpu')) return 'Vs ordinateur'
  return 'Solo'
}

/** Phrase complète pour le dialogue de lancement. */
export function libelleModes(game: GuestGameDef) {
  const parts: string[] = []
  if (game.modes.includes('solo')) parts.push('seul')
  if (game.modes.includes('cpu')) parts.push('contre l’ordinateur')
  if (game.modes.includes('local')) {
    const min = Math.max(2, game.joueurs.min)
    parts.push(game.joueurs.max > min
      ? `de ${min} à ${game.joueurs.max} sur cette tablette`
      : `à ${game.joueurs.max} sur cette tablette`)
  }
  if (game.modes.includes('tournoi')) parts.push('en tournoi de table')
  return parts.length ? `Se joue ${parts.join(', ')}.` : 'Se joue seul.'
}

export function libelleAge(game: GuestGameDef) {
  return `${game.ageMin}+`
}

/**
 * Jeux mis en avant : famille, jouables (pas bêta), hors casino. La liste est
 * dérivée du registre — pas de liste parallèle à oublier de tenir à jour.
 */
export const JEUX_RECOMMANDES: GuestGameDef[] = GUEST_GAMES.filter(
  (game) => game.recommande && game.statut === 'jouable' && game.categories.includes('famille') && !estCasino(game),
)
