/**
 * Confronte chaque appel HTTP brut du front à la protection réelle de la route
 * visée côté backend. Point 2 de la checklist de pré-lancement.
 *
 * Le rapport de test du 2026-07-27 recensait « 32 fichiers qui contournent le
 * client HTTP authentifié » sans trancher lesquels sont fautifs : certains
 * endpoints sont publics par conception. Ce script fait la confrontation, au
 * lieu de la supposer.
 *
 *   node scripts/audit-appels-http.mjs
 *
 * Sortie : tableau des appels classés, et code de sortie 1 s'il reste un appel
 * non authentifié vers une route protégée.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const INDEX_BACKEND = join(RACINE, 'apps/backend/src/index.ts')

/** Middlewares qui exigent une identité. `publicLimiter` n'en est pas un. */
const MIDDLEWARES_AUTH = ['authenticate', 'deviceOrUserAuth']

/** Relève les préfixes montés dans index.ts et leur protection réelle. */
function releverMontages() {
  const source = readFileSync(INDEX_BACKEND, 'utf8')
  const montages = new Map()
  const motif = /^app\.use\(\s*'(\/api\/[^']*)'\s*,?\s*([^)]*)\)/gm
  for (const [, prefixe, reste] of source.matchAll(motif)) {
    const protege = MIDDLEWARES_AUTH.some((m) => reste.includes(m))
    // Un préfixe monté plusieurs fois (/api/agent l'est 3 fois) est protégé
    // dès qu'un seul de ses montages l'est : la 1re route qui matche gagne.
    montages.set(prefixe, montages.get(prefixe) || protege)
  }
  return montages
}

/** Le préfixe monté le plus spécifique qui couvre cette URL. */
function trouverMontage(montages, chemin) {
  let meilleur = null
  for (const prefixe of montages.keys()) {
    if (chemin === prefixe || chemin.startsWith(prefixe + '/')) {
      if (!meilleur || prefixe.length > meilleur.length) meilleur = prefixe
    }
  }
  return meilleur
}

function* fichiersSources(repertoire) {
  for (const entree of readdirSync(repertoire)) {
    if (entree === 'node_modules' || entree === 'dist') continue
    const chemin = join(repertoire, entree)
    if (statSync(chemin).isDirectory()) yield* fichiersSources(chemin)
    else if (/\.(ts|tsx)$/.test(chemin) && !chemin.endsWith('.test.ts')) yield chemin
  }
}

/**
 * Repère les appels sortants bruts. On ne retient que ceux dont l'URL vise
 * `/api/…` : les `fetch` vers des ressources locales ou externes ne sont pas
 * concernés par l'authentification du backend.
 */
function releverAppels(fichier) {
  const source = readFileSync(fichier, 'utf8')
  const lignes = source.split(/\r?\n/)
  const appels = []
  lignes.forEach((ligne, i) => {
    const estFetch = /\bfetch\s*\(/.test(ligne)
    const estSse = /new EventSource\s*\(/.test(ligne)
    if (!estFetch && !estSse) return
    // URL littérale ou gabarit : on extrait le premier /api/... rencontré.
    const url = ligne.match(/\/api\/[A-Za-z0-9\-_/]*/)
    if (!url) return
    appels.push({
      fichier: relative(RACINE, fichier).replace(/\\/g, '/'),
      ligne: i + 1,
      chemin: url[0],
      transport: estSse ? 'EventSource' : 'fetch',
      // Un `fetch` portant un en-tête Authorization est authentifié ; l'en-tête
      // suit souvent l'URL de quelques lignes, d'où la fenêtre de lecture.
      porteJeton: [0, 1, 2, 3].some((d) => /Authorization/.test(lignes[i + d] ?? '')),
    })
  })
  return appels
}

const montages = releverMontages()
const appels = []
for (const fichier of fichiersSources(join(RACINE, 'apps/web/src'))) {
  appels.push(...releverAppels(fichier))
}

const fautifs = []
const publics = []
const conformes = []

for (const appel of appels) {
  const prefixe = trouverMontage(montages, appel.chemin)
  const protege = prefixe ? montages.get(prefixe) : false
  const entree = { ...appel, prefixe: prefixe ?? '(non monte)', protege }
  if (!protege) publics.push(entree)
  else if (appel.porteJeton) conformes.push(entree)
  else fautifs.push(entree)
}

const ligneTableau = (e) =>
  `  ${e.fichier}:${e.ligne}  ${e.chemin}  [${e.prefixe}]  ${e.transport}`

console.log(`\nAppels HTTP bruts vers /api dans apps/web : ${appels.length}\n`)
console.log(`ROUTES PUBLIQUES — aucun jeton requis (${publics.length})`)
publics.forEach((e) => console.log(ligneTableau(e)))
console.log(`\nDEJA AUTHENTIFIES — en-tete Authorization present (${conformes.length})`)
conformes.forEach((e) => console.log(ligneTableau(e)))
console.log(`\nFAUTIFS — route protegee, appel sans jeton (${fautifs.length})`)
fautifs.forEach((e) => console.log(ligneTableau(e)))

if (fautifs.length > 0) {
  console.log(`\nECHEC : ${fautifs.length} appel(s) partent sans jeton vers une route protegee.`)
  console.log('Chacun est une fonctionnalite morte en silence (401 avale par un fallback).')
  process.exit(1)
}
console.log('\nOK : aucun appel non authentifie vers une route protegee.')
