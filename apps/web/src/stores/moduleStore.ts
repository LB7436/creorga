import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// v3.18.5 — Modules supprimés/fusionnés :
// - 'planning' fusionné dans 'hr' (RH gère maintenant Planning + Pointages + Congés + Équipe)
// - 'events' (Agenda/Calendrier) supprimé
// - 'licences' supprimé
// - 'autoorder' fusionné dans 'inventory' (sous /inventory/autoorder)
// - 'community' supprimé
// - 'status' supprimé
// - 'sustainability' supprimé
//
// v4.1 — 10 fusions supplémentaires (28 → 18 modules dans MODULES[]) :
// - 'contracts' alias (était /invoices/devis) → folded dans 'invoices'
// - 'centralkitchen' → /inventory/cuisine-centrale (sub-route Inventaire)
// - 'delivery' + 'clickcollect' + 'catering' → NEW module 'sales' (Ventes externes)
// - 'reputation' → /crm/avis + /crm/reponses + /crm/reput-stats (sub-routes CRM)
// - 'music' → /ads/music (sub-route Ads)
// - 'formation' → /hr/formation (sub-route HR)
// - 'referral' → /owner/parrainage (sub-route Owner)
// - 'billing' → /owner/abonnement (sub-route Owner)
// - 'changelog' retiré du sélecteur (URL /changelog accessible mais hors moduleStore)
//
// Le type ModuleId garde tous les anciens IDs pour rétro-compat (utilisé dans
// ModuleIllustrations Record<ModuleId,...> et help-content.ts).
export type ModuleId =
  | 'pos'
  | 'clients'
  | 'invoices'
  | 'qrmenu'
  | 'contracts'
  | 'hr'
  | 'accounting'
  | 'marketing'
  | 'inventory'
  | 'haccp'
  | 'reputation'
  | 'formation'
  | 'maintenance'
  | 'rgpd'
  | 'sites'
  | 'api'
  | 'ai'
  | 'backup'
  | 'owner'
  | 'delivery'
  | 'clickcollect'
  | 'catering'
  | 'centralkitchen'
  | 'billing'
  | 'changelog'
  | 'referral'
  | 'ads'
  | 'music'
  | 'sales'   // v4.1 NEW : Ventes externes (delivery + clickcollect + catering)

export interface ModuleDef {
  id: ModuleId
  name: string
  tagline: string
  color: string
  colorLight: string
  path: string
  available: boolean
  category: 'core' | 'digital' | 'business' | 'admin'
}

// v4.1 — 18 modules après fusion (28 → 18)
export const MODULES: ModuleDef[] = [
  // ─── CORE OPÉRATIONNEL (8 modules) ───
  {
    id: 'pos',
    name: 'Caisse POS',
    tagline: 'Tables, commandes & paiements',
    color: '#1E3A5F',
    colorLight: '#dbeafe',
    path: '/pos/dashboard',
    available: true,
    category: 'core',
  },
  {
    id: 'hr',
    name: 'Gestion RH & Formation',
    tagline: 'Planning, congés, équipe & formation',
    color: '#991B1B',
    colorLight: '#fee2e2',
    path: '/hr/planning',
    available: true,
    category: 'admin',
  },
  {
    id: 'inventory',
    name: 'Inventaire & Cuisine Centrale',
    tagline: 'Stock, recettes, fournisseurs & batch cooking',
    color: '#92400E',
    colorLight: '#fef3c7',
    path: '/inventory',
    available: true,
    category: 'core',
  },
  {
    id: 'invoices',
    name: 'Factures & Devis',
    tagline: 'Facturation professionnelle, contrats',
    color: '#065F46',
    colorLight: '#d1fae5',
    path: '/invoices',
    available: true,
    category: 'business',
  },
  {
    id: 'marketing',
    name: 'CRM, Marketing & Réputation',
    tagline: 'Clients, fidélité, campagnes & avis',
    color: '#BE185D',
    colorLight: '#fce7f3',
    path: '/crm',
    available: true,
    category: 'business',
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    tagline: 'TVA, bilan & OCR factures',
    color: '#1F2937',
    colorLight: '#f3f4f6',
    path: '/accounting',
    available: true,
    category: 'business',
  },
  {
    id: 'haccp',
    name: 'HACCP',
    tagline: 'Traçabilité & hygiène alimentaire',
    color: '#B45309',
    colorLight: '#fef3c7',
    path: '/haccp',
    available: true,
    category: 'admin',
  },
  {
    id: 'sales',
    name: 'Ventes externes',
    tagline: 'Livraison, Click & Collect, Traiteur',
    color: '#ea580c',
    colorLight: '#ffedd5',
    path: '/sales/delivery',
    available: true,
    category: 'core',
  },

  // ─── DIGITAL / CLIENT (4 modules) ───
  {
    id: 'ai',
    name: 'Assistant IA',
    tagline: 'Votre copilote intelligent (Robi)',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    path: '/ai',
    available: true,
    category: 'digital',
  },
  {
    id: 'qrmenu',
    name: 'Menu QR',
    tagline: 'Carte numérique & QR code',
    color: '#7C3AED',
    colorLight: '#ede9fe',
    path: '/qrmenu',
    available: true,
    category: 'digital',
  },
  {
    id: 'ads',
    name: 'Affichage TV & Ambiance',
    tagline: 'Régie publicitaire & musique (Spotify, radio)',
    color: '#ef4444',
    colorLight: '#fee2e2',
    path: '/ads/regie',
    available: true,
    category: 'digital',
  },
  {
    id: 'clients',
    name: 'Accès Clients',
    tagline: 'Interface & commande en ligne',
    color: '#6D28D9',
    colorLight: '#ede9fe',
    path: '/clients',
    available: true,
    category: 'digital',
  },

  // ─── ADMINISTRATION (4 modules) ───
  {
    id: 'owner',
    name: 'Rapport Patron & Programme',
    tagline: 'Vision globale, abonnement & parrainage',
    color: '#166534',
    colorLight: '#d1fae5',
    path: '/owner/rapport',
    available: true,
    category: 'business',
  },
  {
    id: 'sites',
    name: 'Multi-établissements',
    tagline: 'Gestion des sites et chaînes',
    color: '#db2777',
    colorLight: '#fce7f3',
    path: '/sites',
    available: true,
    category: 'admin',
  },
  {
    id: 'rgpd',
    name: 'RGPD / Conformité',
    tagline: 'Protection des données',
    color: '#059669',
    colorLight: '#d1fae5',
    path: '/rgpd',
    available: true,
    category: 'admin',
  },
  {
    id: 'backup',
    name: 'Sauvegarde',
    tagline: 'Sécurité & restauration',
    color: '#0284c7',
    colorLight: '#e0f2fe',
    path: '/backup',
    available: true,
    category: 'admin',
  },

  // ─── OUTILS (2 modules) ───
  {
    id: 'api',
    name: 'API & Intégrations',
    tagline: 'Connectez vos outils favoris',
    color: '#475569',
    colorLight: '#f1f5f9',
    path: '/api',
    available: true,
    category: 'admin',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    tagline: 'Équipements & interventions',
    color: '#0891b2',
    colorLight: '#cffafe',
    path: '/maintenance',
    available: true,
    category: 'admin',
  },
]

interface ModuleState {
  activeModule: ModuleId | null
  setActiveModule: (id: ModuleId) => void
  clearModule: () => void
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      activeModule: null,
      setActiveModule: (id) => set({ activeModule: id }),
      clearModule: () => set({ activeModule: null }),
    }),
    { name: 'creorga-module' }
  )
)
