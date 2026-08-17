import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

/**
 * Préférences de modules — source de vérité : le serveur.
 *
 * Remplace le couple défaillant moduleConfigStore (localStorage seul, jamais
 * poussé au serveur) + useSharedModuleConfig (fetch nu sans jeton, repli
 * localhost:3002 mort en production, erreurs avalées). Historique du défaut :
 * SettingsModules écrivait en local pendant que le sélecteur fusionnait avec
 * « le distant gagne » — tout réglage pouvait être écrasé en silence et rien
 * n'était partagé entre navigateurs.
 *
 * Règles :
 *  - toute écriture est optimiste MAIS annulée si l'API refuse : un
 *    interrupteur ne reste jamais affiché « enregistré » sur un échec ;
 *  - les erreurs remontent à l'appelant (pour le toast), jamais avalées ;
 *  - le cache localStorage ne sert qu'à l'affichage instantané au démarrage,
 *    le serveur reprend la main dès la première lecture.
 *
 * La « dernière sélection » (module actif) reste portée par moduleStore
 * (protégé) ; le mode service/admin/tout reste dans moduleUXStore — un seul
 * propriétaire par donnée.
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
  config: Record<string, PreferenceModule>
  etat: EtatSync
  erreur: string | null
  /** Modules dont l'enregistrement est en cours : leurs contrôles se désactivent. */
  enAttente: Record<string, true>
  /** Migration unique de l'ancien localStorage vers le serveur. */
  migrationFaite: boolean
  derniereSync: number

  charger: () => Promise<void>
  regler: (moduleId: string, patch: Partial<PreferenceModule>) => Promise<void>
  reinitialiser: () => Promise<void>
  lire: (moduleId: string) => PreferenceModule
}

const DEFAUT: PreferenceModule = { displayMode: 'visible' }

/** Clé de l'ancien store local, lue une seule fois pour la reprise. */
const ANCIENNE_CLE = 'creorga-module-config'

function lireAncienStockage(): Record<string, PreferenceModule> {
  try {
    const brut = localStorage.getItem(ANCIENNE_CLE)
    if (!brut) return {}
    const parse = JSON.parse(brut)
    return parse?.state?.config ?? {}
  } catch {
    return {}
  }
}

export const useModulePreferences = create<PreferencesModulesState>()(
  persist(
    (set, get) => ({
      config: {},
      etat: 'inconnu',
      erreur: null,
      enAttente: {},
      migrationFaite: false,
      derniereSync: 0,

      charger: async () => {
        if (get().etat === 'chargement') return
        set({ etat: 'chargement' })
        try {
          const { data } = await api.get<ReponseServeur>('/module-config')
          let config = data.config ?? {}

          // Reprise unique : si le serveur est vierge mais que l'ancien store
          // local contient des réglages, on les pousse — sinon des mois de
          // configuration disparaîtraient au premier passage sur ce code.
          if (!get().migrationFaite && Object.keys(config).length === 0) {
            const ancien = lireAncienStockage()
            if (Object.keys(ancien).length > 0) {
              const { data: apres } = await api.put<ReponseServeur>('/module-config', { config: ancien })
              config = apres.config ?? ancien
            }
          }

          set({
            config,
            etat: 'pret',
            erreur: null,
            migrationFaite: true,
            derniereSync: Date.now(),
          })
        } catch (e) {
          // On garde le cache affiché, mais l'échec est visible, jamais muet.
          set({
            etat: 'erreur',
            erreur: e instanceof Error ? e.message : 'Serveur injoignable',
          })
        }
      },

      regler: async (moduleId, patch) => {
        const precedent = get().config[moduleId]
        // Optimiste : l'interface réagit tout de suite…
        set((s) => ({
          config: { ...s.config, [moduleId]: { ...(precedent ?? DEFAUT), ...patch } },
          enAttente: { ...s.enAttente, [moduleId]: true },
        }))
        try {
          const { data } = await api.patch<ReponseServeur>(`/module-config/${moduleId}`, patch)
          set((s) => {
            const { [moduleId]: _fini, ...reste } = s.enAttente
            return { config: data.config ?? s.config, enAttente: reste, erreur: null, derniereSync: Date.now() }
          })
        } catch (e) {
          // …mais un refus du serveur ANNULE l'affichage : jamais un réglage
          // montré comme enregistré alors qu'il ne l'est pas.
          set((s) => {
            const { [moduleId]: _fini, ...reste } = s.enAttente
            const config = { ...s.config }
            if (precedent === undefined) delete config[moduleId]
            else config[moduleId] = precedent
            return { config, enAttente: reste, erreur: e instanceof Error ? e.message : 'Échec de l’enregistrement' }
          })
          throw e
        }
      },

      reinitialiser: async () => {
        const precedent = get().config
        set({ config: {} })
        try {
          const { data } = await api.post<ReponseServeur>('/module-config/reset')
          set({ config: data.config ?? {}, erreur: null, derniereSync: Date.now() })
        } catch (e) {
          set({ config: precedent, erreur: e instanceof Error ? e.message : 'Échec de la réinitialisation' })
          throw e
        }
      },

      lire: (moduleId) => get().config[moduleId] ?? DEFAUT,
    }),
    {
      name: 'creorga-module-prefs',
      // Seul le cache de config et le drapeau de migration survivent au
      // rechargement ; l'état de sync repart toujours de zéro.
      partialize: (s) => ({ config: s.config, migrationFaite: s.migrationFaite }),
    }
  )
)

/* ------------------------------------------------------------------ */
/* Cycle de vie de la synchronisation                                  */
/* ------------------------------------------------------------------ */

let syncDemarree = false

/**
 * Démarre la synchronisation (une seule fois par onglet) : lecture immédiate,
 * relecture au retour de focus et toutes les 60 s. L'ancien canal interrogeait
 * le serveur toutes les 1,5 s sans authentification — c'est ce polling qui
 * rendait « networkidle » inatteignable pour les tests e2e.
 */
export function demarrerSyncPreferencesModules(): void {
  if (syncDemarree || typeof window === 'undefined') return
  syncDemarree = true
  const charger = () => useModulePreferences.getState().charger()
  charger()
  window.addEventListener('focus', charger)
  window.setInterval(charger, 60_000)
}
