/**
 * Phase 3.3 — preuve de la numerotation sequentielle sous concurrence.
 *
 * Huit commandes ET huit factures creees SIMULTANEMENT doivent produire
 * 16 numeros distincts. Un doublon de numero de facture est une infraction
 * comptable, pas un simple bug d'affichage.
 *
 * Lancer depuis apps/backend :  npx tsx scripts/concurrency-numbering.ts
 */

const API = process.env.API_URL || 'http://localhost:3002/api'
const EMAIL = process.env.QA_EMAIL || 'bryan@cafe-rondpoint.lu'
const PASSWORD = process.env.QA_PASSWORD || 'Demo1234!'
const N = Number(process.env.QA_CONCURRENCY || 8)

let token = ''
let companyId = ''

async function api(path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'x-company-id': companyId } : {}),
      ...(init.headers || {}),
    },
  })
}

async function json(path: string, init: RequestInit = {}) {
  const res = await api(path, init)
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

function doublons(valeurs: (string | number)[]): (string | number)[] {
  const vus = new Set<string | number>()
  const dbl = new Set<string | number>()
  for (const v of valeurs) {
    if (vus.has(v)) dbl.add(v)
    vus.add(v)
  }
  return [...dbl]
}

async function main() {
  // 1. Authentification
  const login = await json('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  token = login.token || login.accessToken
  if (!token) throw new Error(`Pas de token dans la reponse: ${JSON.stringify(login).slice(0, 200)}`)

  const companies = login.companies || login.user?.companies || []
  companyId = companies[0]?.companyId || companies[0]?.company?.id || companies[0]?.id
  if (!companyId) throw new Error(`Pas de companyId: ${JSON.stringify(login).slice(0, 300)}`)
  console.log(`Societe    : ${companyId}`)

  // 2. Un produit reel pour les commandes
  const produits = await json('/products?limit=1')
  const produit = (Array.isArray(produits) ? produits : produits.data || produits.products)[0]
  if (!produit) throw new Error('Aucun produit disponible')
  console.log(`Produit    : ${produit.name} (${produit.price} EUR, TVA ${produit.taxRate} %)`)

  // 3. LE TEST : 8 commandes et 8 factures lancees en meme temps.
  //    Promise.all part reellement en parallele : aucune n'attend l'autre.
  const t0 = Date.now()
  const [commandes, factures] = await Promise.all([
    Promise.allSettled(
      Array.from({ length: N }, () =>
        json('/orders', {
          method: 'POST',
          body: JSON.stringify({ items: [{ productId: produit.id, quantity: 1 }] }),
        })
      )
    ),
    Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        json('/invoices', {
          method: 'POST',
          body: JSON.stringify({
            items: [{ description: `Concurrence ${i + 1}`, quantity: 1, unitPrice: 100, taxRate: 17 }],
          }),
        })
      )
    ),
  ])
  const duree = Date.now() - t0

  // 4. Verdict
  const cmdOk = commandes.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[]
  const factOk = factures.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[]
  const numCmd = cmdOk.map((r) => r.value.orderNumber)
  const numFact = factOk.map((r) => r.value.number)

  console.log(`\nDuree      : ${duree} ms`)
  console.log(`Commandes  : ${cmdOk.length}/${N} creees -> ${JSON.stringify(numCmd)}`)
  console.log(`Factures   : ${factOk.length}/${N} creees -> ${JSON.stringify(numFact)}`)

  for (const r of [...commandes, ...factures]) {
    if (r.status === 'rejected') console.log(`  ECHEC: ${String(r.reason).slice(0, 160)}`)
  }

  const dblCmd = doublons(numCmd)
  const dblFact = doublons(numFact)
  const distincts = new Set(numCmd).size + new Set(numFact).size

  console.log(`\nDoublons commandes : ${dblCmd.length ? JSON.stringify(dblCmd) : 'aucun'}`)
  console.log(`Doublons factures  : ${dblFact.length ? JSON.stringify(dblFact) : 'aucun'}`)
  console.log(`Numeros distincts  : ${distincts} / ${2 * N} attendus`)

  const ok =
    cmdOk.length === N && factOk.length === N && dblCmd.length === 0 && dblFact.length === 0 && distincts === 2 * N

  console.log(`\nVERDICT    : ${ok ? `OK — ${2 * N} numeros distincts` : 'ECHEC'}`)
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
