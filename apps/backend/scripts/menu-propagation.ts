/**
 * Phase 5 — propagation d'un changement de prix sur les 4 surfaces.
 *
 * Chaîne attendue : back-office → POS → carte QR → portail client.
 * Toute désynchronisation est un P0 : le client voit un prix, la caisse en
 * facture un autre. Au Luxembourg le prix affiché engage le commerçant.
 *
 * Ce script prouve la partie mesurable à l'exécution (back-office et
 * endpoint public). Les surfaces POS / QR / portail sont évaluées par
 * inspection de leur source, car elles ne font aucun appel réseau pour
 * la carte — c'est précisément le défaut.
 *
 * Lancer depuis apps/backend :  npx tsx scripts/menu-propagation.ts
 */
import fs from 'fs'
import path from 'path'

const API = process.env.API_URL || 'http://localhost:3002/api'
const EMAIL = process.env.QA_EMAIL || 'bryan@cafe-rondpoint.lu'
const PASSWORD = process.env.QA_PASSWORD || 'Demo1234!'
// Le paquet est en ESM : pas de __dirname. On part du cwd (apps/backend).
const RACINE = path.resolve(process.cwd(), '..', '..')

let token = ''
let companyId = ''
let echecs = 0

function verdict(nom: string, ok: boolean, detail: string) {
  if (!ok) echecs++
  console.log(`${ok ? 'OK   ' : 'ECHEC'} ${nom} — ${detail}`)
}

async function json(chemin: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${chemin}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'x-company-id': companyId } : {}),
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${chemin} -> ${res.status} ${await res.text()}`)
  return res.json()
}

/**
 * Cherche un CATALOGUE LITTÉRAL faisant autorité : une constante dont la
 * valeur contient un `price: <nombre>` écrit en dur. Une constante suffixée
 * `_MAQUETTE` est tolérée : c'est un repli de mise en page assumé, pas la
 * source des prix affichés au client.
 */
function carteEnDur(fichier: string): { trouve: boolean; extrait: string } {
  const chemin = path.join(RACINE, fichier)
  if (!fs.existsSync(chemin)) return { trouve: false, extrait: 'fichier absent' }
  const src = fs.readFileSync(chemin, 'utf8')

  const motif = /(?:export\s+)?const\s+(\w+)[^=\n]*=\s*[[{][\s\S]{0,400}?price:\s*[\d.]+/g
  for (const m of src.matchAll(motif)) {
    if (m[1].endsWith('_MAQUETTE')) continue
    return { trouve: true, extrait: m[0].replace(/\s+/g, ' ').slice(0, 90) }
  }
  return { trouve: false, extrait: 'aucun catalogue littéral' }
}

/** Le fichier fait-il un appel réseau pour récupérer la carte ? */
function appelleLApi(fichier: string): boolean {
  const chemin = path.join(RACINE, fichier)
  if (!fs.existsSync(chemin)) return false
  const src = fs.readFileSync(chemin, 'utf8')
  return /portal-config\/menu|api\.get\(['"`]\/products|\/api\/products/.test(src)
}

async function main() {
  // ── Authentification ────────────────────────────────────────────────
  const login = await json('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  token = login.token || login.accessToken
  const companies = login.companies || login.user?.companies || []
  companyId = companies[0]?.companyId || companies[0]?.company?.id || companies[0]?.id

  // ── Surface 1 : back-office ─────────────────────────────────────────
  const liste = await json('/products?limit=200')
  const produits = Array.isArray(liste) ? liste : liste.data || liste.products
  const menuPublicAvant = await json(`/portal-config/menu?companyId=${companyId}`)
  const nomsPublics = new Set((menuPublicAvant.products || []).map((p: any) => p.name))

  // On choisit un produit visible sur la carte publique, sinon le test
  // ne prouverait rien.
  const cible = produits.find((p: any) => nomsPublics.has(p.name))
  if (!cible) throw new Error('Aucun produit commun entre le back-office et la carte publique')

  const prixOrigine = cible.price
  const prixTest = Math.round((prixOrigine + 7.77) * 100) / 100
  console.log(`Produit cible : ${cible.name} — ${prixOrigine} EUR -> ${prixTest} EUR\n`)

  await json(`/products/${cible.id}`, { method: 'PUT', body: JSON.stringify({ price: prixTest }) })

  const relu = await json('/products?limit=200')
  const apres = (Array.isArray(relu) ? relu : relu.data || relu.products).find((p: any) => p.id === cible.id)
  verdict('S1 back-office reflete le nouveau prix', apres?.price === prixTest, `${apres?.price} EUR`)

  // ── Surface 2 : endpoint public (carte QR / portail) ────────────────
  const menuApres = await json(`/portal-config/menu?companyId=${companyId}`)
  const publicApres = (menuApres.products || []).find((p: any) => p.name === cible.name)
  verdict(
    'S2 endpoint public /portal-config/menu propage',
    publicApres?.price === prixTest,
    `${publicApres?.price} EUR`
  )

  // ── Surfaces 3/4/5 : les frontends consomment-ils cet endpoint ? ────
  // Le critere est : la surface va-t-elle CHERCHER la carte au serveur ?
  // Un tableau local explicitement nomme "MAQUETTE" reste acceptable comme
  // repli de mise en page ; un tableau qui fait autorite ne l'est pas.
  const surfaces = [
    { nom: 'S3 portail client', fichier: 'apps/guest/src/pages/MenuPage.tsx' },
    { nom: 'S4 carte QR', fichier: 'apps/web/src/pages/qrmenu/QrMenuPage.tsx' },
    { nom: 'S5 POS (caisse)', fichier: 'apps/pos/src/components/SeatPanel.tsx' },
  ]

  console.log('')
  for (const s of surfaces) {
    const dur = carteEnDur(s.fichier)
    const api = appelleLApi(s.fichier)
    verdict(
      `${s.nom} consomme la carte serveur`,
      api && !dur.trouve,
      api
        ? dur.trouve
          ? `appel API present MAIS carte en dur faisant autorite — ${dur.extrait}`
          : 'appel API present'
        : `CARTE EN DUR — ${dur.extrait}`
    )
  }

  // ── S7 : aucun catalogue de prix résiduel ailleurs dans les fronts ──
  // Corriger trois fichiers ne sert à rien s'il en reste un quatrième.
  const residus: string[] = []
  const explorer = (dossier: string) => {
    const abs = path.join(RACINE, dossier)
    if (!fs.existsSync(abs)) return
    for (const entree of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${dossier}/${entree.name}`
      if (entree.isDirectory()) {
        if (entree.name === 'node_modules' || entree.name === 'dist') continue
        explorer(rel)
      } else if (/\.(ts|tsx)$/.test(entree.name)) {
        const t = carteEnDur(rel)
        if (t.trouve) residus.push(`${rel} — ${t.extrait.slice(0, 60)}`)
      }
    }
  }
  for (const app of ['apps/guest/src', 'apps/pos/src', 'apps/web/src/pages/qrmenu']) explorer(app)

  console.log('')
  verdict(
    'S7 aucun catalogue de prix résiduel dans les fronts client',
    residus.length === 0,
    residus.length ? `${residus.length} reste(s) :\n     ${residus.join('\n     ')}` : 'aucun'
  )

  // ── Restauration ────────────────────────────────────────────────────
  await json(`/products/${cible.id}`, { method: 'PUT', body: JSON.stringify({ price: prixOrigine }) })
  const restaure = await json(`/portal-config/menu?companyId=${companyId}`)
  const fin = (restaure.products || []).find((p: any) => p.name === cible.name)
  verdict('S6 prix restaure a sa valeur initiale', fin?.price === prixOrigine, `${fin?.price} EUR`)

  console.log(`\nVERDICT : ${echecs === 0 ? 'OK — propagation complete' : `${echecs} SURFACE(S) DESYNCHRONISEE(S)`}`)
  if (echecs) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
