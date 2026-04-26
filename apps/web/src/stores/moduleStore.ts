import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleId =
  | 'pos'
  | 'clients'
  | 'invoices'
  | 'qrmenu'
  | 'planning'
  | 'contracts'
  | 'hr'
  | 'accounting'
  | 'marketing'
  | 'inventory'
  | 'haccp'
  | 'events'
  | 'reputation'
  | 'formation'
  | 'maintenance'
  | 'licences'
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
  | 'autoorder'
  | 'sustainability'
  | 'community'
  | 'status'
  | 'changelog'
  | 'referral'
  | 'ads'
  | 'music'

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

export const MODULES: ModuleDef[] = [
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
    id: 'clients',
    name: 'Accès Clients',
    tagline: 'Interface & commande en ligne',
    color: '#6D28D9',
    colorLight: '#ede9fe',
    path: '/clients',
    available: true,
    category: 'digital',
  },
  {
    id: 'invoices',
    name: 'Factures & Devis',
    tagline: 'Facturation professionnelle',
    color: '#065F46',
    colorLight: '#d1fae5',
    path: '/invoices',
    available: true,
    category: 'business',
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
    id: 'planning',
    name: 'Planning',
    tagline: 'Horaires & disponibilités',
    color: '#92400E',
    colorLight: '#fef3c7',
    path: '/hr/planning',
    available: true,
    category: 'admin',
  },
  {
    id: 'contracts',
    name: 'Contrats',
    tagline: 'Clients & fournisseurs',
    color: '#0E7490',
    colorLight: '#cffafe',
    path: '/invoices/devis',
    available: true,
    category: 'business',
  },
  {
    id: 'hr',
    name: 'Gestion RH',
    tagline: 'Ressources humaines & paie',
    color: '#991B1B',
    colorLight: '#fee2e2',
    path: '/hr',
    available: true,
    category: 'admin',
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
    id: 'marketing',
    name: 'CRM & Marketing',
    tagline: 'Clients, fidélité & campagnes',
    color: '#BE185D',
    colorLight: '#fce7f3',
    path: '/crm',
    available: true,
    category: 'business',
  },
  {
    id: 'inventory',
    name: 'Inventaire',
    tagline: 'Stock, recettes & fournisseurs',
    color: '#92400E',
    colorLight: '#fef3c7',
    path: '/inventory',
    available: true,
    category: 'core',
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
    id: 'events',
    name: 'Agenda & Calendrier',
    tagline: 'Réservations & événements',
    color: '#0E7490',
    colorLight: '#cffafe',
    path: '/agenda',
    available: true,
    category: 'business',
  },
  {
    id: 'reputation',
    name: 'Réputation',
    tagline: 'Avis clients & e-réputation',
    color: '#0369A1',
    colorLight: '#e0f2fe',
    path: '/reputation',
    available: true,
    category: 'digital',
  },
  {
    id: 'formation',
    name: 'Formation',
    tagline: 'Formation & certification du personnel',
    color: '#7C3AED',
    colorLight: '#ede9fe',
    path: '/formation',
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
  {
    id: 'licences',
    name: 'Licences & Assurances',
    tagline: 'Documents légaux & échéances',
    color: '#ca8a04',
    colorLight: '#fef3c7',
    path: '/licences',
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
    id: 'ai',
    name: 'Assistant IA',
    tagline: 'Votre copilote intelligent',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    path: '/ai',
    available: true,
    category: 'digital',
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
  {
    id: 'owner',
    name: 'Rapport Patron',
    tagline: 'Vision stratégique globale',
    color: '#166534',
    colorLight: '#d1fae5',
    path: '/owner',
    available: true,
    category: 'business',
  },
  {
    id: 'delivery',
    name: 'Livraison',
    tagline: 'Uber Eats, Wedely & livreurs',
    color: '#ea580c',
    colorLight: '#ffedd5',
    path: '/delivery',
    available: true,
    category: 'core',
  },
  {
    id: 'clickcollect',
    name: 'Click & Collect',
    tagline: 'Commandes à emporter',
    color: '#0d9488',
    colorLight: '#ccfbf1',
    path: '/clickcollect',
    available: true,
    category: 'core',
  },
  {
    id: 'catering',
    name: 'Traiteur',
    tagline: 'Événements livrés & buffets',
    color: '#9333ea',
    colorLight: '#f3e8ff',
    path: '/catering',
    available: true,
    category: 'business',
  },
  {
    id: 'centralkitchen',
    name: 'Cuisine Centrale',
    tagline: 'Batch cooking & prévisions',
    color: '#be185d',
    colorLight: '#fce7f3',
    path: '/centralkitchen',
    available: true,
    category: 'core',
  },
  {
    id: 'billing',
    name: 'Facturation',
    tagline: 'Abonnement & paiements',
    color: '#0ea5e9',
    colorLight: '#e0f2fe',
    path: '/billing',
    available: true,
    category: 'admin',
  },
  {
    id: 'autoorder',
    name: 'Auto-Réapprovisionnement',
    tagline: 'Commandes IA intelligentes',
    color: '#d97706',
    colorLight: '#fef3c7',
    path: '/autoorder',
    available: true,
    category: 'core',
  },
  {
    id: 'sustainability',
    name: 'Durabilité',
    tagline: 'Impact environnemental & RSE',
    color: '#16a34a',
    colorLight: '#dcfce7',
    path: '/sustainability',
    available: true,
    category: 'admin',
  },
  {
    id: 'community',
    name: 'Communauté',
    tagline: 'Réseau & benchmarks restaurants',
    color: '#db2777',
    colorLight: '#fce7f3',
    path: '/community',
    available: true,
    category: 'digital',
  },
  {
    id: 'status',
    name: 'Statut système',
    tagline: 'Uptime & incidents en temps réel',
    color: '#10b981',
    colorLight: '#d1fae5',
    path: '/status',
    available: true,
    category: 'admin',
  },
  {
    id: 'changelog',
    name: 'Changelog',
    tagline: 'Nouveautés & versions',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    path: '/changelog',
    available: true,
    category: 'admin',
  },
  {
    id: 'referral',
    name: 'Parrainage',
    tagline: 'Invitez et gagnez 100€',
    color: '#f59e0b',
    colorLight: '#fef3c7',
    path: '/referral',
    available: true,
    category: 'business',
  },
  {
    id: 'ads',
    name: 'Régie publicitaire TV',
    tagline: 'Pubs sur écrans TV avec IA',
    color: '#ef4444',
    colorLight: '#fee2e2',
    path: '/ads',
    available: true,
    category: 'digital',
  },
  {
    id: 'music',
    name: 'Musique & Radio',
    tagline: 'Radio · Spotify · Apple · YouTube',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    path: '/music',
    available: true,
    category: 'digital',
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
