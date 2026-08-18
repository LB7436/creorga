import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CATEGORY_META,
  GAME_ID_ALIASES,
  GUEST_GAMES,
  JEUX_RECOMMANDES,
  estCasino,
  estJouable,
  libelleJoueurs,
  libelleModes,
  type GuestGameDef,
} from './catalog'

/**
 * Invariants du registre des jeux (vague v4.9).
 * L'audit avait relevé : 3 jeux « 2 joueurs » qui se jouent contre l'ordinateur,
 * 37 jeux sur 40 qui ignoraient la difficulté du lanceur, des « 3D » en CSS,
 * des notes inventées et un casino mêlé aux jeux pour enfants. Ces tests
 * empêchent ces dérives de revenir sans être vues.
 */

const proposes = GUEST_GAMES.filter((game) => game.statut !== 'bientot')

/**
 * Source d'un jeu, déduite de son chargeur `() => import('./XGame')`.
 * Vitest réécrit le spécificateur (chemin absolu, suffixe `?import`…) : on
 * prend donc la première chaîne quotée dont le nom de base existe ici en `.tsx`.
 */
function sourceDuJeu(game: GuestGameDef): string | null {
  if (!game.chargeur) return null
  const quotees = [...game.chargeur.toString().matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
  for (const q of quotees) {
    const base = (q.split(/[\\/]/).pop() ?? '').replace(/\?.*$/, '').replace(/\.tsx?$/, '')
    if (!base) continue
    const chemin = join(__dirname, `${base}.tsx`)
    if (existsSync(chemin)) return readFileSync(chemin, 'utf8')
  }
  return null
}

describe('registre des jeux — identité', () => {
  it('les identifiants sont uniques (clés de la config portail et des scores)', () => {
    const ids = GUEST_GAMES.map((game) => game.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('les emojis sont uniques : plus de 🃏 ×4 ni de 🎲 ×3 dans le catalogue', () => {
    const icons = GUEST_GAMES.map((game) => game.icon)
    const doublons = icons.filter((icon, index) => icons.indexOf(icon) !== index)
    expect(doublons).toEqual([])
  })

  it('les alias historiques pointent tous vers un jeu existant', () => {
    const ids = new Set(GUEST_GAMES.map((game) => game.id))
    for (const [ancien, canonique] of Object.entries(GAME_ID_ALIASES)) {
      expect(ids.has(canonique), `${ancien} → ${canonique}`).toBe(true)
    }
  })

  it('chaque catégorie utilisée est déclarée dans CATEGORY_META', () => {
    const connues = new Set(CATEGORY_META.map((meta) => meta.id))
    for (const game of GUEST_GAMES) {
      expect(game.categories.length, game.id).toBeGreaterThan(0)
      for (const categorie of game.categories) expect(connues.has(categorie), `${game.id}: ${categorie}`).toBe(true)
    }
  })
})

describe('registre des jeux — jouabilité', () => {
  it('un jeu proposé a un composant à charger, un jeu « bientôt » n’en a pas', () => {
    for (const game of GUEST_GAMES) {
      if (game.statut === 'bientot') {
        expect(game.chargeur, game.id).toBeUndefined()
        expect(estJouable(game)).toBe(false)
      } else {
        expect(typeof game.chargeur, game.id).toBe('function')
        expect(estJouable(game)).toBe(true)
        expect(sourceDuJeu(game), `${game.id}: fichier du composant introuvable`).not.toBeNull()
      }
    }
  })

  it('les jeux proposés ont des règles et une description écrites', () => {
    for (const game of proposes) {
      expect(game.regles.trim().length, game.id).toBeGreaterThan(20)
      expect(game.description.trim().length, game.id).toBeGreaterThan(10)
    }
  })

  it('un jeu bêta dit pourquoi', () => {
    for (const game of GUEST_GAMES.filter((g) => g.statut === 'beta')) {
      expect(game.raisonBeta?.trim().length ?? 0, game.id).toBeGreaterThan(10)
    }
  })
})

describe('registre des jeux — joueurs et modes cohérents', () => {
  it('« Multijoueur » signifie vraiment plusieurs personnes sur la tablette', () => {
    for (const game of GUEST_GAMES) {
      const multi = game.categories.includes('multi')
      const local = game.modes.includes('local')
      if (multi) {
        expect(local, `${game.id} est en catégorie multi sans mode local`).toBe(true)
      }
      if (local) {
        expect(game.joueurs.max, `${game.id} : mode local mais 1 joueur max`).toBeGreaterThanOrEqual(2)
      } else {
        expect(game.joueurs.max, `${game.id} : ${game.joueurs.max} joueurs sans mode local`).toBe(1)
      }
      expect(game.joueurs.min).toBeGreaterThanOrEqual(1)
      expect(game.joueurs.min).toBeLessThanOrEqual(game.joueurs.max)
    }
  })

  it('« Tournois » exige un vrai mode tournoi', () => {
    for (const game of GUEST_GAMES.filter((g) => g.categories.includes('tournois'))) {
      expect(game.modes.includes('tournoi'), game.id).toBe(true)
    }
  })

  it('les jeux dits contre l’ordinateur ne prétendent pas être « 2 joueurs »', () => {
    // Régression de l'audit : Puissance 4, Morpion et Bataille étaient badgés « 2 joueurs ».
    for (const id of ['connect4', 'ttt', 'bataille']) {
      const game = GUEST_GAMES.find((g) => g.id === id)!
      expect(game.modes).toEqual(['cpu'])
      expect(libelleJoueurs(game)).toBe('Vs ordinateur')
    }
  })

  it('libellés joueurs et modes', () => {
    const mensch = GUEST_GAMES.find((g) => g.id === 'mensch')!
    const scoopa = GUEST_GAMES.find((g) => g.id === 'scoopa')!
    const memory = GUEST_GAMES.find((g) => g.id === 'memory')!
    expect(libelleJoueurs(mensch)).toBe('1–4 joueurs')
    expect(libelleJoueurs(scoopa)).toBe('2–4 joueurs')
    expect(libelleJoueurs(memory)).toBe('Solo')
    expect(libelleModes(mensch)).toBe('Se joue contre l’ordinateur, de 2 à 4 sur cette tablette, en tournoi de table.')
    expect(libelleModes(scoopa)).toBe('Se joue de 2 à 4 sur cette tablette.')
    expect(libelleModes(memory)).toBe('Se joue seul.')
  })
})

describe('registre des jeux — promesses tenues par le code', () => {
  it('« niveau: lanceur » seulement si le jeu lit la difficulté du GameShell', () => {
    for (const game of proposes) {
      const source = sourceDuJeu(game)
      if (!source) throw new Error(`source de ${game.id} introuvable`)
      const litLeShell = /useGameShell\(\)/.test(source) && /\.difficulty|\{\s*difficulty\s*\}/.test(source)
      if (game.niveau === 'lanceur') {
        expect(litLeShell, `${game.id} annonce un niveau choisi au lancement mais ne le lit pas`).toBe(true)
      } else {
        expect(litLeShell, `${game.id} lit la difficulté du lanceur : déclarer niveau 'lanceur'`).toBe(false)
      }
    }
  })

  it('« rendu: 3d » seulement pour les jeux en three.js', () => {
    for (const game of proposes) {
      const source = sourceDuJeu(game) ?? ''
      const three = /from ['"]three['"]|from ['"]three\//.test(source)
      expect(three, `${game.id} : rendu ${game.rendu}`).toBe(game.rendu === '3d')
    }
  })

  it('aucun nom ne promet la 3D sans three.js', () => {
    for (const game of proposes.filter((g) => g.rendu !== '3d')) {
      expect(/3d/i.test(game.name), `${game.name}`).toBe(false)
    }
  })

  it('les jeux multijoueur locaux ont bien un choix de nombre de joueurs dans leur code', () => {
    for (const game of proposes.filter((g) => g.modes.includes('local'))) {
      const source = sourceDuJeu(game) ?? ''
      const choix = /joueurs|players|playMode/.test(source)
      expect(choix, game.id).toBe(true)
    }
  })
})

describe('registre des jeux — recommandations et casino', () => {
  it('les recommandés sont famille, jouables, hors casino, et incluent le socle demandé', () => {
    expect(JEUX_RECOMMANDES.length).toBeGreaterThan(0)
    for (const game of JEUX_RECOMMANDES) {
      expect(game.categories.includes('famille'), game.id).toBe(true)
      expect(game.statut, game.id).toBe('jouable')
      expect(estCasino(game), game.id).toBe(false)
      expect(game.ageMin, game.id).toBeLessThanOrEqual(8)
    }
    for (const id of ['mensch', 'scoopa', 'memory', 'connect4']) {
      expect(JEUX_RECOMMANDES.some((game) => game.id === id), id).toBe(true)
    }
  })

  it('un jeu marqué recommande=true dans le registre mais inéligible est écarté (jamais recommandé)', () => {
    for (const game of GUEST_GAMES.filter((g) => g.recommande)) {
      const eligible = game.categories.includes('famille') && game.statut === 'jouable' && !estCasino(game)
      expect(eligible, `${game.id} porte recommande: true sans être éligible`).toBe(true)
    }
  })

  it('le casino est réservé aux adultes et n’est jamais famille', () => {
    for (const game of GUEST_GAMES.filter(estCasino)) {
      expect(game.ageMin, game.id).toBeGreaterThanOrEqual(18)
      expect(game.categories.includes('famille'), game.id).toBe(false)
      expect(game.recommande ?? false, game.id).toBe(false)
    }
  })

  it('les jeux famille conviennent à des enfants (âge minimal ≤ 12)', () => {
    for (const game of GUEST_GAMES.filter((g) => g.categories.includes('famille'))) {
      expect(game.ageMin, game.id).toBeLessThanOrEqual(12)
    }
  })
})
