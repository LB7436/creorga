import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ModuleId =
  | 'pos'
  | 'clients'
  | 'invoices'
  | 'qrmenu'
  | 'loyalty'
  | 'planning'
  | 'contracts'
  | 'hr'
  | 'accounting'

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
    path: '/pos',
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
    available: false,
    category: 'business',
  },
  {
    id: 'qrmenu',
    name: 'Menu QR',
    tagline: 'Carte numérique & QR code',
    color: '#7C3AED',
    colorLight: '#ede9fe',
    path: '/qrmenu',
    available: false,
    category: 'digital',
  },
  {
    id: 'loyalty',
    name: 'Carte Fidélité',
    tagline: 'Programme de récompenses',
    color: '#9D174D',
    colorLight: '#fce7f3',
    path: '/loyalty',
    available: false,
    category: 'digital',
  },
  {
    id: 'planning',
    name: 'Planning',
    tagline: 'Horaires & disponibilités',
    color: '#92400E',
    colorLight: '#fef3c7',
    path: '/planning',
    available: false,
    category: 'admin',
  },
  {
    id: 'contracts',
    name: 'Contrats',
    tagline: 'Clients & fournisseurs',
    color: '#0E7490',
    colorLight: '#cffafe',
    path: '/contracts',
    available: false,
    category: 'business',
  },
  {
    id: 'hr',
    name: 'Gestion RH',
    tagline: 'Ressources humaines & paie',
    color: '#991B1B',
    colorLight: '#fee2e2',
    path: '/hr',
    available: false,
    category: 'admin',
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    tagline: 'TVA, bilan & OCR factures',
    color: '#1F2937',
    colorLight: '#f3f4f6',
    path: '/accounting',
    available: false,
    category: 'business',
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
