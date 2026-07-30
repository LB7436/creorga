import { describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * Non-régression du défaut 4.2 : boucle de rechargement infinie.
 *
 * `BirthdayCelebrate` et `HelpChatbot` sont montés globalement, page de login
 * comprise. Sans jeton, leur appel partait en 401, le refresh échouait et
 * l'intercepteur faisait `window.location.href = '/login'` — donc un
 * rechargement complet alors qu'on y était déjà, qui remontait le composant et
 * relançait le cycle. Playwright le voyait comme « element was detached from
 * the DOM, retrying ».
 */

/**
 * `href` est un accesseur qui **compte les affectations**, et non une simple
 * valeur. C'est ce qui rend le test probant : sur le code d'avant correctif,
 * `href` était réaffecté à '/login' alors qu'on y était déjà — la valeur finale
 * était identique, seul le nombre d'écritures trahit le rechargement.
 */
const poserWindow = (pathname: string, demo = false) => {
  const store: Record<string, string> = demo ? { 'creorga-demo-mode': 'true' } : {}
  const affectations: string[] = []
  const location = {
    pathname,
    get href() {
      return affectations.length ? affectations[affectations.length - 1] : pathname
    },
    set href(valeur: string) {
      affectations.push(valeur)
    },
  }
  const faux = {
    location,
    localStorage: { getItem: (cle: string) => store[cle] ?? null },
  }
  ;(globalThis as any).window = faux
  return { ...faux, affectations }
}

/** Import différé : `api.ts` lit `window` dès le chargement du module. */
const chargerApi = async () => {
  const mod = await import('./api')
  const { useAuthStore } = await import('@/stores/authStore')
  return { ...mod, useAuthStore }
}

describe('traiterSessionExpiree', () => {
  beforeEach(() => {
    poserWindow('/login')
  })

  afterEach(() => {
    delete (globalThis as any).window
  })

  it('ne recharge pas la page quand on est déjà sur /login', async () => {
    const faux = poserWindow('/login')
    const { traiterSessionExpiree, useAuthStore } = await chargerApi()
    useAuthStore.getState().setAccessToken('jeton-mort')

    const aRedirige = traiterSessionExpiree()

    expect(aRedirige).toBe(false)
    // Aucune écriture sur href = aucun rechargement = pas de boucle.
    expect(faux.affectations).toEqual([])
    // La purge du jeton doit avoir lieu malgré tout : elle ne recharge rien.
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('renvoie vers /login depuis une autre page', async () => {
    const faux = poserWindow('/dashboard')
    const { traiterSessionExpiree, useAuthStore } = await chargerApi()
    useAuthStore.getState().setAccessToken('jeton-mort')

    const aRedirige = traiterSessionExpiree()

    expect(aRedirige).toBe(true)
    expect(faux.affectations).toEqual(['/login'])
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('ne touche ni au jeton ni à la navigation en session de démonstration', async () => {
    const faux = poserWindow('/dashboard', true)
    const { traiterSessionExpiree, useAuthStore } = await chargerApi()
    useAuthStore.getState().setAccessToken('jeton-demo')

    const aRedirige = traiterSessionExpiree()

    expect(aRedirige).toBe(false)
    expect(faux.affectations).toEqual([])
    expect(useAuthStore.getState().accessToken).toBe('jeton-demo')
  })
})
