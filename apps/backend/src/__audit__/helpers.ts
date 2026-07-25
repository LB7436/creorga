import request from 'supertest'

/** Serveur visé par la suite d'audit (cf. vitest.api.config.ts). */
export const API_URL = process.env.API_URL || 'http://localhost:3002'

export const DEMO_EMAIL = process.env.DEMO_EMAIL || 'bryan@cafe-rondpoint.lu'
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!'
export const COMPANY_ID = process.env.DEMO_COMPANY_ID || 'seed-rich-company'

export const api = () => request(API_URL)

let cachedToken: string | null = null

/** Jeton d'accès du compte de démo (mis en cache pour la durée du run). */
export async function login(
  email = DEMO_EMAIL,
  password = DEMO_PASSWORD,
): Promise<string> {
  if (email === DEMO_EMAIL && cachedToken) return cachedToken
  const res = await api().post('/api/auth/login').send({ email, password })
  if (res.status !== 200) {
    throw new Error(
      `Login impossible (${res.status}). Le backend tourne-t-il sur ${API_URL} ` +
        `avec une base seedée (npm run db:seed:rich) ?`,
    )
  }
  const token = res.body.accessToken || res.body.token
  if (email === DEMO_EMAIL) cachedToken = token
  return token
}

/** Requête authentifiée : jeton + en-tête société. */
export function auth(req: request.Test, token: string): request.Test {
  return req.set('Authorization', `Bearer ${token}`).set('x-company-id', COMPANY_ID)
}

/** Vérifie que le serveur répond avant de lancer la suite. */
export async function assertServerUp(): Promise<void> {
  try {
    const res = await api().get('/api/health')
    if (res.status !== 200) throw new Error(`/api/health → ${res.status}`)
  } catch (e: any) {
    throw new Error(
      `Backend injoignable sur ${API_URL} (${e?.message}).\n` +
        `Lancer « npm run dev » dans apps/backend avant « npm run test:api ».`,
    )
  }
}

/** Premier produit du catalogue — utilisé pour composer des commandes. */
export async function firstProduct(token: string): Promise<any> {
  const res = await auth(api().get('/api/products'), token)
  const list = Array.isArray(res.body) ? res.body : res.body.products || []
  if (!list.length) throw new Error('Aucun produit : base non seedée ?')
  return list[0]
}

/**
 * Arrondi monétaire au centime — même formule que `cents()` dans
 * routes/orders.ts. La correction par Number.EPSILON est nécessaire :
 * sans elle, 1.275 (représenté 1.27499999…) tomberait à 1.27 au lieu de 1.28.
 */
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
