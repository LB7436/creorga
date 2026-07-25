import { describe, it, expect, beforeAll } from 'vitest'
import { api, auth, login, assertServerUp, COMPANY_ID } from './helpers'

/** TESTPLAN §1 — Authentification et accès. */
describe('AUTH — authentification et accès', () => {
  beforeAll(assertServerUp)

  it('AUTH-1 : login valide renvoie un access token', async () => {
    const token = await login()
    expect(token).toBeTruthy()
    // Un JWT a trois segments séparés par des points.
    expect(String(token).split('.')).toHaveLength(3)
  })

  it('AUTH-2 : mot de passe incorrect → 401 sans token', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'bryan@cafe-rondpoint.lu', password: 'MauvaisMotDePasse!' })
    expect(res.status).toBe(401)
    expect(res.body.accessToken).toBeUndefined()
  })

  it('AUTH-3 : email inconnu → 401, message identique (pas d\'énumération)', async () => {
    const inconnu = await api()
      .post('/api/auth/login')
      .send({ email: 'personne@nulle-part.lu', password: 'MauvaisMotDePasse!' })
    const connu = await api()
      .post('/api/auth/login')
      .send({ email: 'bryan@cafe-rondpoint.lu', password: 'MauvaisMotDePasse!' })

    expect(inconnu.status).toBe(401)
    // Si les messages diffèrent, un attaquant peut deviner les comptes existants.
    expect(inconnu.body.message ?? inconnu.body.error).toBe(connu.body.message ?? connu.body.error)
  })

  it('AUTH-4 : route protégée sans token → 401', async () => {
    const res = await api().get('/api/crm/customers')
    expect(res.status).toBe(401)
  })

  it('AUTH-5 : token malformé → 401, jamais 500', async () => {
    const res = await api()
      .get('/api/crm/customers')
      .set('Authorization', 'Bearer pas-du-tout-un-jwt')
      .set('x-company-id', COMPANY_ID)
    expect(res.status).toBe(401)
  })

  it('AUTH-8 : société inexistante → pas de fuite de données', async () => {
    const token = await login()
    const res = await api()
      .get('/api/crm/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', 'societe-qui-nexiste-pas')

    // Soit accès refusé, soit liste vide — jamais les clients d'une autre société.
    if (res.status === 200) {
      expect(res.body.customers ?? []).toHaveLength(0)
    } else {
      expect([400, 403, 404]).toContain(res.status)
    }
  })

  it('ROB-1 : JSON malformé → 400, jamais 500', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ ceci nest pas du json')
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('ROB-2 : champs obligatoires manquants → 4xx', async () => {
    const res = await api().post('/api/auth/login').send({})
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('ROB-7 : identifiant inexistant → 404, jamais 500', async () => {
    const token = await login()
    const res = await auth(api().get('/api/crm/customers/id-qui-nexiste-pas'), token)
    expect(res.status).not.toBe(500)
    expect([400, 404]).toContain(res.status)
  })
})
