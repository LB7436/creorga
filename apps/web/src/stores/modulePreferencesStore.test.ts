import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User, UserCompany } from '@/types'

const saved = new Map<string, string>()
const storage = {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => saved.set(key, value),
  removeItem: (key: string) => saved.delete(key),
}
vi.stubGlobal('localStorage', storage)
const { useAuthStore } = await import('./authStore')
const { default: api } = await import('@/lib/api')
const preferences = await import('./modulePreferencesStore')
const { useModulePreferences, demarrerSyncPreferencesModules } = preferences
const initialAdapter = api.defaults.adapter

type Pending = {
  request: InternalAxiosRequestConfig
  finish: (config: Record<string, unknown>, updatedAt?: number) => void
  fail: (message: string) => void
}
let pending: Pending[] = []
let cleanups: Array<() => void> = []
let events: EventTarget

function login(userId = 'user-a') {
  const user: User = { id: userId, email: `${userId}@fixture.invalid`, firstName: 'Fictif', lastName: 'Modules', avatar: null }
  const companies: UserCompany[] = ['company-a', 'company-b'].map((id) => ({
    id, companyId: id, userId, role: 'OWNER', isActive: true,
    company: { id, name: id, legalName: null, vatNumber: null, currency: 'EUR' },
  }))
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies })
}

async function load(config: Record<string, unknown> = {}, updatedAt = 100) {
  const result = useModulePreferences.getState().charger()
  await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0))
  pending.shift()!.finish(config, updatedAt)
  await result
}

beforeEach(() => {
  vi.stubGlobal('localStorage', storage)
  useAuthStore.getState().logout()
  saved.clear()
  useModulePreferences.setState({ config: {}, etat: 'inconnu', erreur: null, enAttente: {}, derniereSync: 0, migrationFaite: false, quarantinedPreferences: null } as any)
  pending = []
  events = new EventTarget()
  vi.stubGlobal('window', {
    location: { origin: 'http://127.0.0.1:5174', pathname: '/modules' },
    localStorage: storage,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
  })
  api.defaults.adapter = (request) => new Promise((resolve, reject) => {
    pending.push({ request,
      finish: (config, updatedAt = 100) => resolve({ request, config: request, data: { config, updatedAt }, status: 200, statusText: 'fixture', headers: {} }),
      fail: (message) => reject(new Error(message)),
    })
  })
  login()
})

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup())
  cleanups = []
  useAuthStore.getState().logout()
  api.defaults.adapter = initialAdapter
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('préférences de modules attribuées à la session et à la société', () => {
  it('invalide aussi les callbacks de formulaire après un aller-retour A → B → A', () => {
    const editor = preferences as any
    const oldContext = editor.capturerContextePreferencesModules?.()
    expect(editor.estContextePreferencesModulesCourant?.(oldContext)).toBe(true)
    useAuthStore.getState().setActiveCompany('company-b')
    expect(editor.estContextePreferencesModulesCourant(oldContext)).toBe(false)
    useAuthStore.getState().setActiveCompany('company-a')
    expect(editor.estContextePreferencesModulesCourant(oldContext)).toBe(false)
    const currentContext = editor.capturerContextePreferencesModules()
    expect(editor.estContextePreferencesModulesCourant(currentContext)).toBe(true)
    useAuthStore.getState().logout()
    expect(editor.estContextePreferencesModulesCourant(currentContext)).toBe(false)
  })

  it('efface immédiatement les libellés de A lors du passage à B', async () => {
    await load({ pos: { displayMode: 'hidden', customLabel: 'Privé société A' } })
    useAuthStore.getState().setActiveCompany('company-b')
    expect(useModulePreferences.getState().config).toEqual({})
    expect(useModulePreferences.getState().etat).toBe('inconnu')
  })

  it('ne réaffiche pas le cache du compte précédent dans une nouvelle session', async () => {
    await load({ hr: { displayMode: 'hidden', customLabel: 'Dossiers privés A' } })
    useAuthStore.getState().logout()
    expect(useModulePreferences.getState().config).toEqual({})
    login('user-b')
    expect(useModulePreferences.getState().config).toEqual({})
  })

  it('charge B sans attendre A et ignore ensuite l’échec tardif de A', async () => {
    const first = useModulePreferences.getState().charger()
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const requestA = pending.shift()!
    useAuthStore.getState().setActiveCompany('company-b')
    const second = useModulePreferences.getState().charger()
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const requestB = pending.shift()!
    expect(requestB.request.headers['x-company-id']).toBe('company-b')
    requestB.finish({ pos: { displayMode: 'visible', customLabel: 'Société B' } })
    await second
    requestA.fail('Ancien serveur A indisponible')
    await first
    expect(useModulePreferences.getState().config.pos.customLabel).toBe('Société B')
    expect(useModulePreferences.getState().etat).toBe('pret')
    expect(useModulePreferences.getState().erreur).toBeNull()
  })

  it('conserve l’ancien cache non attribué sans l’envoyer au serveur vierge', async () => {
    const legacy = JSON.stringify({ state: { config: { pos: { displayMode: 'hidden', customLabel: 'Ancienne société inconnue' } } } })
    saved.set('creorga-module-config', legacy)
    let serverConfig: Record<string, unknown> = {}
    api.defaults.adapter = async (config) => {
      if (config.method === 'put') serverConfig = JSON.parse(config.data).config
      return { config, data: { config: serverConfig, updatedAt: 100 }, status: 200, statusText: 'fixture', headers: {} }
    }
    await useModulePreferences.getState().charger()
    expect(serverConfig).toEqual({})
    expect(useModulePreferences.getState().config).toEqual({})
    expect(saved.get('creorga-module-config')).toBe(legacy)
  })

  it('met en quarantaine les préférences persistées non attribuables au lieu de les afficher', async () => {
    const config = { hr: { displayMode: 'hidden', customLabel: 'Ancien employeur' } }
    saved.set('creorga-module-prefs', JSON.stringify({ state: { config, migrationFaite: true }, version: 0 }))
    await useModulePreferences.persist.rehydrate()
    expect(useModulePreferences.getState().config).toEqual({})
    expect((useModulePreferences.getState() as any).quarantinedPreferences?.config).toEqual(config)
    const persisted = JSON.parse(saved.get('creorga-module-prefs')!).state
    expect(persisted.config).toBeUndefined()
    expect(persisted.quarantinedPreferences.config).toEqual(config)
  })

  it('ne sauvegarde pas en local les libellés de la session active', async () => {
    await load({ pos: { displayMode: 'visible', customLabel: 'Libellé privé non persistant' } })
    const persisted = JSON.parse(saved.get('creorga-module-prefs')!).state
    expect(persisted.config).toBeUndefined()
    expect(JSON.stringify(persisted)).not.toContain('Libellé privé non persistant')
  })
})

describe('enregistrement sans écrasement concurrent ni faux succès', () => {
  it('sérialise deux modifications et ne remplace les valeurs qu’après confirmation', async () => {
    await load()
    const first = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })
    const second = useModulePreferences.getState().regler('hr', { displayMode: 'hidden' })
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    expect(useModulePreferences.getState().config).toEqual({})
    pending.shift()!.finish({ pos: { displayMode: 'hidden' } }, 101)
    await first
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    pending.shift()!.finish({ pos: { displayMode: 'hidden' }, hr: { displayMode: 'hidden' } }, 102)
    await second
    expect(useModulePreferences.getState().config).toEqual({ pos: { displayMode: 'hidden' }, hr: { displayMode: 'hidden' } })
    expect(useModulePreferences.getState().enAttente).toEqual({})
  })

  it('refuse une réinitialisation pendant un enregistrement plutôt que réinstaller un ancien cache', async () => {
    await load()
    const patch = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const reset = useModulePreferences.getState().reinitialiser()
    const resetResult = reset.catch((error) => error)
    await Promise.resolve()
    expect(pending).toHaveLength(1)
    expect(await resetResult).toBeInstanceOf(Error)
    await expect(reset).rejects.toThrow(/cours|attend/i)
    pending.shift()!.finish({ pos: { displayMode: 'hidden' } }, 101)
    await patch
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('hidden')
    expect(pending).toEqual([])
  })

  it('ignore une lecture commencée avant une écriture confirmée', async () => {
    await load({ pos: { displayMode: 'visible' } })
    const read = useModulePreferences.getState().charger()
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const oldRead = pending.shift()!
    const patch = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    pending.shift()!.finish({ pos: { displayMode: 'hidden' } }, 101)
    await patch
    oldRead.finish({ pos: { displayMode: 'visible' } }, 100)
    await read
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('hidden')
  })

  it('conserve la dernière valeur confirmée et rend l’échec visible', async () => {
    await load({ pos: { displayMode: 'visible' } })
    const patch = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })
    const failure = expect(patch).rejects.toThrow('Enregistrement refusé')
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    pending.shift()!.fail('Enregistrement refusé')
    await failure
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('visible')
    expect(useModulePreferences.getState().erreur).toBe('Enregistrement refusé')
    expect(useModulePreferences.getState().enAttente).toEqual({})
  })

  it('efface explicitement un libellé quand le formulaire revient au libellé d’origine', async () => {
    await load({ pos: { displayMode: 'visible', customLabel: 'Ancien libellé' } })
    api.defaults.adapter = async (config) => {
      const patch = JSON.parse(config.data)
      const pos = patch.customLabel === '' ? { displayMode: 'visible' } : { displayMode: 'visible', customLabel: 'Ancien libellé' }
      return { config, data: { config: { pos }, updatedAt: 101 }, status: 200, statusText: 'fixture', headers: {} }
    }
    await useModulePreferences.getState().regler('pos', { customLabel: undefined })
    expect(useModulePreferences.getState().lire('pos').customLabel).toBeUndefined()
  })

  it('ne rejoue aucune modification mise en file après un passage à une autre société', async () => {
    await load()
    const first = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' }).catch((error) => error)
    const queued = useModulePreferences.getState().regler('hr', { displayMode: 'hidden' }).catch((error) => error)
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const oldWrite = pending.shift()!
    useAuthStore.getState().setActiveCompany('company-b')
    await load({ hr: { displayMode: 'visible', customLabel: 'Réglage B confirmé' } }, 110)
    oldWrite.finish({ pos: { displayMode: 'hidden' } }, 101)
    expect(await first).toBeInstanceOf(Error)
    expect(await queued).toBeInstanceOf(Error)
    expect(pending).toEqual([])
    expect(useModulePreferences.getState().config).toEqual({ hr: { displayMode: 'visible', customLabel: 'Réglage B confirmé' } })
    expect(useModulePreferences.getState().erreur).toBeNull()
    expect(useModulePreferences.getState().enAttente).toEqual({})
  })

  it('ne réinstalle pas une ancienne révision lors d’une relecture indépendante', async () => {
    await load({ pos: { displayMode: 'hidden' } }, 110)
    await load({ pos: { displayMode: 'visible' } }, 109)
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('hidden')
  })

  it('garde les valeurs pendant une réinitialisation puis applique sa confirmation', async () => {
    await load({ pos: { displayMode: 'hidden' } })
    const reset = useModulePreferences.getState().reinitialiser()
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('hidden')
    expect(useModulePreferences.getState().reinitialisationEnCours).toBe(true)
    await expect(useModulePreferences.getState().regler('hr', { displayMode: 'hidden' })).rejects.toThrow(/cours/i)
    pending.shift()!.finish({}, 101)
    await reset
    expect(useModulePreferences.getState().config).toEqual({})
    expect(useModulePreferences.getState().reinitialisationEnCours).toBe(false)
  })

  it('ne présente pas une réponse vide comme un enregistrement confirmé et permet de vérifier après reprise', async () => {
    await load({ pos: { displayMode: 'visible' } })
    api.defaults.adapter = async (config) => ({ config, data: {}, status: 200, statusText: 'fixture', headers: {} })
    await expect(useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })).rejects.toThrow(/confirmation/i)
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('visible')
    expect(useModulePreferences.getState().etat).toBe('erreur')
    api.defaults.adapter = async (config) => ({ config, data: { config: { pos: { displayMode: 'hidden' } }, updatedAt: 101 }, status: 200, statusText: 'fixture', headers: {} })
    await useModulePreferences.getState().charger()
    expect(useModulePreferences.getState().config.pos.displayMode).toBe('hidden')
    expect(useModulePreferences.getState().etat).toBe('pret')
    expect(useModulePreferences.getState().erreur).toBeNull()
  })

  it('ne permet ni écriture anonyme ni écriture depuis la vue salarié', async () => {
    await load()
    useAuthStore.getState().setViewMode('employee', 'employee-fixture')
    const employeeWrite = useModulePreferences.getState().regler('pos', { displayMode: 'hidden' })
    const employeeResult = employeeWrite.catch((error) => error)
    await Promise.resolve()
    expect(pending).toEqual([])
    expect(await employeeResult).toBeInstanceOf(Error)
    useAuthStore.getState().logout()
    await expect(useModulePreferences.getState().reinitialiser()).rejects.toThrow()
    expect(pending).toEqual([])
  })
})

describe('cycle de vie des lecteurs des préférences', () => {
  it('charge immédiatement au montage direct, resynchronise B, puis arrête les lectures à la déconnexion', async () => {
    vi.useFakeTimers()
    const cleanup = demarrerSyncPreferencesModules() as unknown
    if (typeof cleanup === 'function') cleanups.push(cleanup as () => void)
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    pending.shift()!.finish({ pos: { displayMode: 'hidden' } }, 100)
    await vi.waitFor(() => expect(useModulePreferences.getState().etat).toBe('pret'))
    useAuthStore.getState().setActiveCompany('company-b')
    expect(useModulePreferences.getState().config).toEqual({})
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    const requestB = pending.shift()!
    expect(requestB.request.headers['x-company-id']).toBe('company-b')
    requestB.finish({}, 101)
    await vi.waitFor(() => expect(useModulePreferences.getState().etat).toBe('pret'))
    useAuthStore.getState().logout()
    events.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(180_000)
    expect(pending).toEqual([])
    expect(useModulePreferences.getState().config).toEqual({})
    expect(typeof cleanup).toBe('function')
  })

  it('partage le polling entre lecteurs et le supprime quand le dernier écran se démonte', async () => {
    vi.useFakeTimers()
    const first = demarrerSyncPreferencesModules() as unknown
    const second = demarrerSyncPreferencesModules() as unknown
    if (typeof first === 'function') cleanups.push(first as () => void)
    if (typeof second === 'function') cleanups.push(second as () => void)
    await vi.waitFor(() => expect(pending).toHaveLength(1))
    pending.shift()!.finish({}, 100)
    await vi.waitFor(() => expect(useModulePreferences.getState().etat).toBe('pret'))
    expect(typeof first).toBe('function')
    expect(typeof second).toBe('function')
    ;(first as () => void)()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(pending).toHaveLength(1)
    pending.shift()!.finish({}, 101)
    await vi.waitFor(() => expect(useModulePreferences.getState().etat).toBe('pret'))
    ;(second as () => void)()
    events.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(120_000)
    expect(pending).toEqual([])
  })
})
