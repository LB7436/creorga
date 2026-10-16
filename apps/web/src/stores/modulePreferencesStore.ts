import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import { authDataScope } from '@/lib/authScope'
import { useAuthStore } from './authStore'

/**
 * Le serveur est la seule source attribuée des préférences de modules.
 * Le cache actif reste en mémoire, pour une identité, une société, des droits
 * et une génération de session. Les anciens caches non attribuables sont
 * conservés, mais jamais affichés ni importés automatiquement chez un client.
 * Une valeur n'est remplacée qu'après confirmation du serveur.
 */
export type ModuleDisplayMode = 'visible' | 'hidden' | 'coming_soon'

export interface PreferenceModule {
  displayMode: ModuleDisplayMode
  customLabel?: string
  pinnedToDashboard?: boolean
  enabled?: boolean
  order?: number
}

type EtatSync = 'inconnu' | 'chargement' | 'pret' | 'erreur'
interface ReponseServeur {
  config: Record<string, PreferenceModule>
  updatedAt: number
}

interface PreferencesModulesState {
  scopeKey: string | null
  config: Record<string, PreferenceModule>
  etat: EtatSync
  erreur: string | null
  enAttente: Record<string, true>
  reinitialisationEnCours: boolean
  derniereSync: number
  revisionServeur: number
  /** Copie de l'ancien état global, sans attribution à la session courante. */
  quarantinedPreferences: unknown
  charger: () => Promise<void>
  regler: (moduleId: string, patch: Partial<PreferenceModule>) => Promise<void>
  reinitialiser: () => Promise<void>
  lire: (moduleId: string) => PreferenceModule
}

const DEFAUT: PreferenceModule = { displayMode: 'visible' }
let generation = 0
let mutationVersion = 0
let lectureEnCours: Promise<void> | null = null
let fileEcritures: Promise<void> = Promise.resolve()

function scopeActuel(): string | null {
  const auth = useAuthStore.getState()
  return auth.isAuthenticated && auth.user?.id && auth.companyId ? authDataScope(auth) : null
}

/** Les formulaires utilisent aussi la génération, y compris pour A → B → A. */
export function capturerContextePreferencesModules() {
  return { scope: scopeActuel(), generation }
}

function contexte() {
  const context = capturerContextePreferencesModules()
  if (!context.scope) throw new Error('Connectez-vous et sélectionnez une société avant de modifier ses modules.')
  return context
}

export function estContextePreferencesModulesCourant(context: ReturnType<typeof capturerContextePreferencesModules>): boolean {
  return context.scope !== null && context.generation === generation && context.scope === scopeActuel()
}

const estCourant = estContextePreferencesModulesCourant

function verifierContexte(context: ReturnType<typeof contexte>): void {
  if (!estCourant(context)) throw new Error('La session ou la société a changé. Rechargez les réglages dans votre espace actuel.')
}

function verifierDroits(): void {
  const auth = useAuthStore.getState()
  if (!['owner', 'manager'].includes(auth.role) || auth.viewMode !== 'owner') {
    throw new Error('La configuration des modules est réservée aux responsables, hors vue salarié.')
  }
}

function verifierReponse(data: ReponseServeur): void {
  if (!data || !data.config || typeof data.config !== 'object' || Array.isArray(data.config)
    || !Number.isFinite(data.updatedAt) || data.updatedAt < 0) {
    throw new Error('Réponse de configuration incomplète : aucune confirmation d’enregistrement.')
  }
}

const messageErreur = (error: unknown) => error instanceof Error ? error.message : 'Serveur injoignable'

export const useModulePreferences = create<PreferencesModulesState>()(
  persist(
    (set, get) => ({
      scopeKey: scopeActuel(), config: {}, etat: 'inconnu', erreur: null,
      enAttente: {}, reinitialisationEnCours: false, derniereSync: 0,
      revisionServeur: 0, quarantinedPreferences: null,

      charger: () => {
        if (!scopeActuel()) return Promise.resolve()
        if (lectureEnCours) return lectureEnCours
        if (get().reinitialisationEnCours || Object.keys(get().enAttente).length) return Promise.resolve()
        const context = contexte()
        const version = mutationVersion
        // Une relecture de fond n'interdit pas une action sur une copie déjà
        // confirmée. Son résultat est invalidé dès qu'une écriture commence.
        if (!get().derniereSync) set({ etat: 'chargement' })
        const operation = (async () => {
          try {
            const { data } = await api.get<ReponseServeur>('/module-config')
            if (!estCourant(context) || version !== mutationVersion) return
            verifierReponse(data)
            if (data.updatedAt < get().revisionServeur) return
            set({ config: data.config, revisionServeur: data.updatedAt, etat: 'pret', erreur: null, derniereSync: Date.now() })
          } catch (error) {
            if (estCourant(context) && version === mutationVersion) set({ etat: 'erreur', erreur: messageErreur(error) })
          }
        })().finally(() => { if (lectureEnCours === operation) lectureEnCours = null })
        lectureEnCours = operation
        return operation
      },

      regler: async (moduleId, patch) => {
        const context = contexte()
        verifierDroits()
        if (get().etat !== 'pret') throw new Error('Attendez une synchronisation confirmée avant de modifier les modules.')
        if (get().reinitialisationEnCours || get().enAttente[moduleId]) throw new Error('Un enregistrement est déjà en cours. Attendez sa confirmation.')
        mutationVersion++
        // Le formulaire utilise undefined pour revenir au libellé d'origine.
        // JSON supprimerait ce champ ; la route attend une chaîne vide explicite.
        const modification = Object.prototype.hasOwnProperty.call(patch, 'customLabel')
          ? { ...patch, customLabel: patch.customLabel ?? '' } : patch
        set((state) => ({ enAttente: { ...state.enAttente, [moduleId]: true } }))
        const operation = fileEcritures.then(async () => {
          verifierContexte(context)
          if (get().etat !== 'pret') throw new Error('Un enregistrement précédent n’est pas confirmé. Resynchronisez avant de poursuivre.')
          const { data } = await api.patch<ReponseServeur>(`/module-config/${encodeURIComponent(moduleId)}`, modification)
          verifierContexte(context)
          verifierReponse(data)
          if (data.updatedAt < get().revisionServeur) throw new Error('Réponse ancienne : resynchronisez la configuration avant de poursuivre.')
          set({ config: data.config, revisionServeur: data.updatedAt, erreur: null, derniereSync: Date.now() })
        })
        // Le refus d'une écriture ne bloque pas définitivement la file ; une
        // nouvelle lecture est toutefois obligatoire avant une autre action.
        fileEcritures = operation.catch(() => {})
        try { await operation }
        catch (error) {
          if (estCourant(context)) set({ etat: 'erreur', erreur: messageErreur(error) })
          throw error
        } finally {
          if (estCourant(context)) set((state) => {
            const { [moduleId]: _fini, ...enAttente } = state.enAttente
            return { enAttente }
          })
        }
      },

      reinitialiser: async () => {
        const context = contexte()
        verifierDroits()
        if (get().reinitialisationEnCours || Object.keys(get().enAttente).length) throw new Error('Un enregistrement est en cours. Attendez avant de réinitialiser.')
        if (get().etat !== 'pret') throw new Error('Attendez une synchronisation confirmée avant de réinitialiser les modules.')
        mutationVersion++
        set({ reinitialisationEnCours: true })
        try {
          const { data } = await api.post<ReponseServeur>('/module-config/reset')
          verifierContexte(context)
          verifierReponse(data)
          if (data.updatedAt < get().revisionServeur) throw new Error('Réponse ancienne : resynchronisez la configuration avant de poursuivre.')
          set({ config: data.config, revisionServeur: data.updatedAt, erreur: null, derniereSync: Date.now() })
        } catch (error) {
          if (estCourant(context)) set({ etat: 'erreur', erreur: messageErreur(error) })
          throw error
        } finally {
          if (estCourant(context)) set({ reinitialisationEnCours: false })
        }
      },

      lire: (moduleId) => get().config[moduleId] ?? DEFAUT,
    }),
    {
      name: 'creorga-module-prefs', version: 1,
      migrate: (persisted, version) => version < 1 ? { quarantinedPreferences: persisted } : persisted as any,
      // Même une réhydratation explicite ne peut installer le cache d'une
      // autre identité. L'ancienne clé creorga-module-config reste intacte.
      merge: (persisted: any, current) => ({ ...current, quarantinedPreferences: persisted?.quarantinedPreferences ?? current.quarantinedPreferences }),
      partialize: (state) => ({ quarantinedPreferences: state.quarantinedPreferences }),
    }
  )
)

/* Un cycle partagé uniquement tant qu'un écran consommateur est monté. */
let lecteurs = 0
let arreterLecturePeriodique: (() => void) | null = null

function actualiserCycle(): void {
  arreterLecturePeriodique?.()
  arreterLecturePeriodique = null
  if (!lecteurs || !scopeActuel() || typeof window === 'undefined') return
  const charger = () => { void useModulePreferences.getState().charger() }
  window.addEventListener('focus', charger)
  const interval = window.setInterval(charger, 60_000)
  arreterLecturePeriodique = () => {
    window.removeEventListener('focus', charger)
    window.clearInterval(interval)
  }
  charger()
}

/** Le désabonnement est celui de useEffect, y compris sous React StrictMode. */
export function demarrerSyncPreferencesModules(): () => void {
  lecteurs++
  if (lecteurs === 1) actualiserCycle()
  let actif = true
  return () => {
    if (!actif) return
    actif = false
    lecteurs--
    if (!lecteurs) {
      arreterLecturePeriodique?.()
      arreterLecturePeriodique = null
    }
  }
}

const unsubscribeAuthScope = useAuthStore.subscribe((auth, previous) => {
  if (authDataScope(auth) === authDataScope(previous)) return
  generation++
  mutationVersion++
  lectureEnCours = null
  fileEcritures = Promise.resolve()
  useModulePreferences.setState({ scopeKey: scopeActuel(), config: {}, etat: 'inconnu', erreur: null,
    enAttente: {}, reinitialisationEnCours: false, derniereSync: 0, revisionServeur: 0 })
  actualiserCycle()
})

;(import.meta as any).hot?.dispose(() => {
  unsubscribeAuthScope()
  arreterLecturePeriodique?.()
})
