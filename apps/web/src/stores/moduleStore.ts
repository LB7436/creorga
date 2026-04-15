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
