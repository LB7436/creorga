import type { ModuleId } from '@/stores/moduleStore'

/**
 * Les six espaces de travail — la couche d'organisation au-dessus des
 * 18 modules de moduleStore (protégé, non modifié). Chaque module appartient
 * à exactement un espace ; les anciennes routes ne changent pas, seul le
 * regroupement visuel du sélecteur change.
 *
 * Le module `owner` est à cheval (rapport → Pilotage, abonnement/parrainage →
 * Finance) : il est rangé dans Pilotage, sa carte d'entrée principale étant
 * le rapport patron.
 */

export interface EspaceDef {
  id: string
  nom: string
  description: string
  emoji: string
  couleur: string
  modules: ModuleId[]
}

export const ESPACES: EspaceDef[] = [
  {
    id: 'pilotage',
    nom: 'Pilotage',
    description: 'Vue globale, rapports, multi-sites et assistant',
    emoji: '🎯',
    couleur: '#6366f1',
    modules: ['owner', 'sites', 'ai'],
  },
  {
    id: 'service',
    nom: 'Service & Caisse',
    description: 'Caisse, ventes externes et menu QR',
    emoji: '🧾',
    couleur: '#1E5F8A',
    modules: ['pos', 'sales', 'qrmenu'],
  },
  {
    id: 'stock',
    nom: 'Stock & Achats',
    description: 'Stock, recettes, fournisseurs et réapprovisionnement',
    emoji: '📦',
    couleur: '#92400E',
    modules: ['inventory'],
  },
  {
    id: 'equipe',
    nom: 'Équipe & Qualité',
    description: 'RH, planning, HACCP et maintenance',
    emoji: '👥',
    couleur: '#991B1B',
    modules: ['hr', 'haccp', 'maintenance'],
  },
  {
    id: 'clients',
    nom: 'Clients & Marketing',
    description: 'CRM, fidélité, portail client et affichage',
    emoji: '💬',
    couleur: '#BE185D',
    modules: ['marketing', 'clients', 'ads'],
  },
  {
    id: 'finance',
    nom: 'Finance & Administration',
    description: 'Factures, comptabilité, RGPD, sauvegardes et API',
    emoji: '🏦',
    couleur: '#065F46',
    modules: ['invoices', 'accounting', 'rgpd', 'backup', 'api'],
  },
]

/** Espace d'appartenance d'un module (null si hors sélecteur). */
export function espaceDuModule(moduleId: ModuleId): EspaceDef | null {
  return ESPACES.find((e) => e.modules.includes(moduleId)) ?? null
}

/**
 * Modules réservés au propriétaire/manager. Source unique pour :
 *  - le badge « Réservé au propriétaire » du sélecteur ;
 *  - la garde de route (un employé qui tape l'URL est redirigé).
 * Avant cette constante, la liste vivait en double dans ModuleSelector
 * (masquage purement visuel, URL directe non protégée).
 */
export const MODULES_PROPRIETAIRE: ReadonlySet<ModuleId> = new Set([
  'owner',
  'sites',
  'rgpd',
  'backup',
  'api',
  'maintenance',
])
