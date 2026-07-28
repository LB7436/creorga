/**
 * Phase 3.1 — preuve de la persistance fichier (data/*.json via safe-json.ts).
 *
 * Trois epreuves que les tests unitaires ne peuvent pas faire :
 *   A. hash avant/apres : le contenu relu est bit pour bit celui ecrit ;
 *   B. kill brutal (SIGKILL) pendant une rafale d'ecritures : le fichier
 *      reste-t-il un JSON valide, ou finit-il tronque ?
 *   C. dossier en lecture seule : echec bruyant ou perte silencieuse ?
 *
 * Lancer depuis apps/backend :  npx tsx scripts/persistence-proof.ts
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { execFileSync, spawn } from 'child_process'
import { safeWriteJson, safeReadJson } from '../src/lib/safe-json'

const sha = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-persist-'))
let echecs = 0

function verdict(nom: string, ok: boolean, detail: string) {
  if (!ok) echecs++
  console.log(`${ok ? 'OK  ' : 'ECHEC'} ${nom} — ${detail}`)
}

// ── A. Hash avant/apres ────────────────────────────────────────────────
function epreuveHash() {
  const f = path.join(racine, 'stock.json')
  const donnees = {
    items: Array.from({ length: 500 }, (_, i) => ({
      id: `ing-${i}`,
      nom: `Ingrédient éàü #${i}`,
      quantite: i * 1.5,
    })),
  }

  safeWriteJson(f, donnees)
  const hAvant = crypto.createHash('sha256').update(JSON.stringify(donnees, null, 2), 'utf8').digest('hex')
  const hApres = sha(f)
  verdict('A1 hash ecrit == hash sur disque', hAvant === hApres, `${hApres.slice(0, 16)}…`)

  const relu = safeReadJson<typeof donnees>(f, { items: [] })
  verdict(
    'A2 relecture identique (accents compris)',
    JSON.stringify(relu) === JSON.stringify(donnees),
    `${relu.items.length} entrees, "${relu.items[3]?.nom}"`
  )

  const restes = fs.readdirSync(racine).filter((n) => n.endsWith('.tmp'))
  verdict('A3 aucun .tmp residuel', restes.length === 0, restes.length ? restes.join(', ') : 'dossier propre')
}

// ── B. Kill brutal pendant l'ecriture ──────────────────────────────────
async function epreuveKill() {
  const dossier = path.join(racine, 'kill')
  fs.mkdirSync(dossier, { recursive: true })
  const cible = path.join(dossier, 'orders.json')

  // Enfant : ecrit en boucle un JSON volumineux jusqu'a se faire tuer.
  const enfant = path.join(racine, 'boucle.js')
  fs.writeFileSync(
    enfant,
    `
const fs = require('fs')
const cible = ${JSON.stringify(cible)}
function safeWrite(p, d) {
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2), 'utf8')
  if (fs.existsSync(p)) { try { fs.copyFileSync(p, p + '.bak') } catch {} }
  fs.renameSync(tmp, p)
}
let n = 0
for (;;) {
  safeWrite(cible, { tour: n++, lignes: Array.from({length: 4000}, (_, i) => ({ i, v: 'x'.repeat(60) })) })
}
`,
    'utf8'
  )

  const proc = spawn(process.execPath, [enfant], { stdio: 'ignore' })
  await new Promise((r) => setTimeout(r, 700)) // laisse tourner quelques milliers d'ecritures
  const vivant = !proc.killed && proc.exitCode === null
  process.kill(proc.pid!, 'SIGKILL') // sous Windows : TerminateProcess, aucun nettoyage
  await new Promise((r) => setTimeout(r, 300))

  verdict('B0 enfant bien tue en pleine ecriture', vivant, `pid ${proc.pid}`)

  // Le fichier doit etre un JSON valide : soit le tour N, soit le tour N-1.
  let valide = false
  let tour: unknown = null
  try {
    const contenu = JSON.parse(fs.readFileSync(cible, 'utf8'))
    valide = true
    tour = contenu.tour
  } catch (e: any) {
    valide = false
    tour = e.message.slice(0, 60)
  }
  verdict('B1 fichier principal reste un JSON valide', valide, `tour=${tour}`)

  // Meme tue, safeReadJson doit rendre des donnees exploitables.
  const recupere = safeReadJson<any>(cible, null)
  verdict('B2 safeReadJson recupere des donnees', recupere !== null, `tour=${recupere?.tour}`)

  const tmpRestants = fs.readdirSync(dossier).filter((n) => n.endsWith('.tmp'))
  verdict(
    'B3 .tmp orphelin apres kill',
    true, // constat, pas un echec : on veut savoir, pas juger
    tmpRestants.length ? `${tmpRestants.length} orphelin(s) — ${tmpRestants.join(', ')}` : 'aucun'
  )
}

// ── C. Dossier en lecture seule ────────────────────────────────────────
function epreuveLectureSeule() {
  const dossier = path.join(racine, 'readonly')
  fs.mkdirSync(dossier, { recursive: true })
  const cible = path.join(dossier, 'config.json')
  safeWriteJson(cible, { avant: true })
  const hAvant = sha(cible)

  // Deny sur l'utilisateur courant (equivalent NTFS d'un chmod 500).
  const user = `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
  try {
    execFileSync('icacls', [dossier, '/deny', `${user}:(WD,AD,DC)`], { stdio: 'ignore' })
  } catch {
    console.log('SKIP C — icacls indisponible')
    return
  }

  let leve = false
  let code = ''
  try {
    safeWriteJson(cible, { apres: true })
  } catch (e: any) {
    leve = true
    code = e.code || e.message.slice(0, 40)
  }
  verdict('C1 ecriture refusee leve une erreur (pas de perte silencieuse)', leve, code || 'aucune erreur levee')

  const intact = fs.existsSync(cible) && sha(cible) === hAvant
  verdict('C2 ancien contenu intact apres refus', intact, intact ? 'hash inchange' : 'CONTENU ALTERE')

  execFileSync('icacls', [dossier, '/remove:d', user], { stdio: 'ignore' })
}

async function main() {
  console.log(`Bac a sable : ${racine}\n`)
  epreuveHash()
  console.log('')
  await epreuveKill()
  console.log('')
  epreuveLectureSeule()

  console.log(`\nVERDICT : ${echecs === 0 ? 'OK — toutes les epreuves passent' : `${echecs} ECHEC(S)`}`)
  try {
    fs.rmSync(racine, { recursive: true, force: true })
  } catch {
    console.log(`(bac a sable conserve : ${racine})`)
  }
  if (echecs) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
