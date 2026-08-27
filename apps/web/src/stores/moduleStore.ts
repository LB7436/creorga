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
    name: 'Planning & équipe',
    tagline: 'Planning, congés et collaborateurs',
    color: '#991B1B',
    colorLight: '#fee2e2',
    path: '/hr/planning',
    available: true,
    category: 'admin',
  },
  {
    id: 'inventory',
    name: 'Inventaire',
    tagline: 'En préparation : stock séparé par entreprise',
    color: '#92400E',
    colorLight: '#fef3c7',
    path: '/inventory/stock',
    available: false,
    category: 'core',
  },
  {
    id: 'invoices',
    name: 'Factures & Devis',
    tagline: 'Devis et factures sauvegardés',
    color: '#065F46',
    colorLight: '#d1fae5',
    path: '/invoices/devis',
    available: true,
    category: 'business',
  },
  {
    id: 'marketing',
    name: 'Fichier clients',
    tagline: 'Contacts et historique clients',
    color: '#BE185D',
    colorLight: '#fce7f3',
    path: '/crm/clients',
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
    tagline: 'Traçabilité & hygiène — en préparation',
    color: '#B45309',
    colorLight: '#fef3c7',
    path: '/haccp',
    available: false,
    category: 'admin',
  },
  {
    id: 'sales',
    name: 'Ventes externes',
    tagline: 'Livraison et Click & Collect — en préparation',
    color: '#ea580c',
    colorLight: '#ffedd5',
    path: '/sales/delivery',
    available: false,
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
    name: 'Espace propriétaire',
    tagline: 'Abonnement, activité et automatisations',
    color: '#166534',
    colorLight: '#d1fae5',
    path: '/owner/abonnement',
    available: true,
    category: 'business',
  },
  {
    id: 'sites',
    name: 'Multi-établissements',
    tagline: 'Gestion des sites — en préparation',
    color: '#db2777',
    colorLight: '#fce7f3',
    path: '/sites',
    available: false,
    category: 'admin',
  },
  {
    id: 'rgpd',
    name: 'RGPD / Conformité',
    tagline: 'Protection des données — en préparation',
    color: '#059669',
    colorLight: '#d1fae5',
    path: '/rgpd',
    available: false,
    category: 'admin',
  },
  {
    id: 'backup',
    name: 'Sauvegarde',
    tagline: 'Sécurité & restauration',
    color: '#0284c7',
    colorLight: '#e0f2fe',
    path: '/backup',
    available: false,
    category: 'admin',
  },

  // ─── OUTILS (2 modules) ───
  {
    id: 'api',
    name: 'API & Intégrations',
    tagline: 'Connecteurs externes — en préparation',
    color: '#475569',
    colorLight: '#f1f5f9',
    path: '/api',
    available: false,
    category: 'admin',
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    tagline: 'Équipements & interventions — en préparation',
    color: '#0891b2',
    colorLight: '#cffafe',
    path: '/maintenance',
    available: false,
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
