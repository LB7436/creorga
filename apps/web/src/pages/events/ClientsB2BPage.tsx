import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Building2, Search, Plus, X, Mail, Phone, MapPin, Euro, FileText,
  Calendar, Hash, TrendingUp, Edit3, ShoppingBag, Eye, CheckCircle2,
  AlertCircle, Users, Award, Clock, Target, Briefcase, Star,
  BarChart3, TrendingDown, UserCheck, MessageSquare, Activity,
  CreditCard, Shield, Zap, Bell, ChevronRight, Trophy, FileCheck,
  PhoneCall, Video, Coffee, ArrowUpRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type Sector = 'Banque' | 'Consulting' | 'IT' | 'Pharma' | 'Administration'
type ClientTier = 'A' | 'B' | 'C'
type PaymentTerms = 'Net 30' | 'Net 60' | 'Net 90'
type ActivityType = 'email' | 'call' | 'meeting' | 'order' | 'proposal'

interface Contact {
  name: string
  role: string
  email: string
  phone: string
  isDecisionMaker: boolean
}

interface Meeting {
  date: string
  type: 'Visio' | 'Présentiel' | 'Déjeuner'
  subject: string
  outcome: string
  actions: string[]
}

interface Proposal {
  id: string
  name: string
  amount: number
  sentDate: string
  status: 'En cours' | 'Gagné' | 'Perdu'
}

interface Activity {
  date: string
  type: ActivityType
  description: string
}

interface B2BClient {
  id: string
  company: string
  sector: Sector
  gradient: [string, string]
  contacts: Contact[]
  address: string
  vat: string
  // Contract
  contractActive: boolean
  contractStart: string
  contractEnd: string
  contractTerms: string
  discountRate: number
  paymentTerms: PaymentTerms
  // Financial
  totalEvents: number
  totalRevenue: number
  annualSpend: number
  creditLimit: number
  creditUsed: number
  lastEvent: string
  // Relationship
  tier: ClientTier
  healthScore: number
  accountManager: string
  onboardingDate: string
  // Extended
  meetings: Meeting[]
  proposals: Proposal[]
  activities: Activity[]
  monthlyRevenue: { month: string; amount: number }[]
}

const MOCK_CLIENTS: B2BClient[] = [
  {
    id: 'c1', company: 'BGL BNP Paribas', sector: 'Banque', gradient: ['#0ea5e9', '#1e40af'],
    contacts: [
      { name: 'Sophie Becker', role: 'Responsable RH', email: 's.becker@bgl.lu', phone: '+352 42 42 20 00', isDecisionMaker: true },
      { name: 'Marc Dupont', role: 'Directeur Communication', email: 'm.dupont@bgl.lu', phone: '+352 42 42 20 15', isDecisionMaker: true },
      { name: 'Anne Wagner', role: 'Assistante Events', email: 'a.wagner@bgl.lu', phone: '+352 42 42 20 33', isDecisionMaker: false },
    ],
    address: '50 Avenue J.F. Kennedy, L-2951 Luxembourg', vat: 'LU10708497',
    contractActive: true, contractStart: '2024-01-15', contractEnd: '2026-06-30',
    contractTerms: 'Contrat annuel renouvelable, facturation mensuelle',
    discountRate: 10, paymentTerms: 'Net 30',
    totalEvents: 14, totalRevenue: 28400, annualSpend: 22500, creditLimit: 50000, creditUsed: 8200,
    lastEvent: '2026-04-02', tier: 'A', healthScore: 92,
    accountManager: 'Sarah Martin', onboardingDate: '2022-03-10',
    meetings: [
      { date: '2026-04-05', type: 'Présentiel', subject: 'Renouvellement contrat 2026', outcome: 'Accord de principe', actions: ['Envoyer avenant', 'Planifier signature'] },
      { date: '2026-03-12', type: 'Visio', subject: 'Planification événements Q2', outcome: 'Validation calendrier', actions: ['Réserver dates', 'Devis cocktail juin'] },
      { date: '2026-02-18', type: 'Déjeuner', subject: 'Point relation annuel', outcome: 'Très positif', actions: [] },
    ],
    proposals: [
      { id: 'p1', name: 'Cocktail été 2026', amount: 8500, sentDate: '2026-04-01', status: 'Gagné' },
      { id: 'p2', name: 'Séminaire direction', amount: 12400, sentDate: '2026-03-15', status: 'En cours' },
    ],
    activities: [
      { date: '2026-04-15', type: 'email', description: 'Confirmation cocktail été envoyée' },
      { date: '2026-04-12', type: 'call', description: 'Appel Sophie Becker — menu végétarien' },
      { date: '2026-04-08', type: 'order', description: 'Commande validée — 3 200 €' },
      { date: '2026-04-05', type: 'meeting', description: 'Réunion renouvellement contrat' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 1800 }, { month: 'Déc', amount: 3200 }, { month: 'Jan', amount: 2100 },
      { month: 'Fév', amount: 2800 }, { month: 'Mar', amount: 3400 }, { month: 'Avr', amount: 3200 },
    ],
  },
  {
    id: 'c2', company: 'KPMG Luxembourg', sector: 'Consulting', gradient: ['#7c3aed', '#4c1d95'],
    contacts: [
      { name: 'Marc Weiland', role: 'Partner', email: 'm.weiland@kpmg.lu', phone: '+352 22 51 51 1', isDecisionMaker: true },
      { name: 'Léa Thiel', role: 'HR Business Partner', email: 'l.thiel@kpmg.lu', phone: '+352 22 51 51 22', isDecisionMaker: false },
    ],
    address: '39 Avenue John F. Kennedy, L-1855', vat: 'LU15562746',
    contractActive: true, contractStart: '2023-09-01', contractEnd: '2026-08-31',
    contractTerms: 'Tarif préférentiel -15%, volume minimum annuel 30k€',
    discountRate: 15, paymentTerms: 'Net 60',
    totalEvents: 22, totalRevenue: 41250, annualSpend: 38200, creditLimit: 75000, creditUsed: 14500,
    lastEvent: '2026-04-08', tier: 'A', healthScore: 96,
    accountManager: 'Thomas Klein', onboardingDate: '2021-06-22',
    meetings: [
      { date: '2026-04-10', type: 'Présentiel', subject: 'Gala annuel 2026', outcome: 'Brief complet reçu', actions: ['Proposition détaillée sous 7j'] },
      { date: '2026-03-20', type: 'Visio', subject: 'Retour team building', outcome: 'Excellent feedback', actions: ['Témoignage vidéo'] },
    ],
    proposals: [
      { id: 'p3', name: 'Gala annuel 200 pers.', amount: 28500, sentDate: '2026-04-12', status: 'En cours' },
      { id: 'p4', name: 'Team building Q1', amount: 8400, sentDate: '2026-02-10', status: 'Gagné' },
    ],
    activities: [
      { date: '2026-04-14', type: 'proposal', description: 'Proposition Gala envoyée' },
      { date: '2026-04-10', type: 'meeting', description: 'Brief Gala annuel' },
      { date: '2026-04-08', type: 'order', description: 'Cocktail partners — 4 200 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 4200 }, { month: 'Déc', amount: 6800 }, { month: 'Jan', amount: 3200 },
      { month: 'Fév', amount: 5400 }, { month: 'Mar', amount: 4800 }, { month: 'Avr', amount: 4200 },
    ],
  },
  {
    id: 'c3', company: 'Deloitte', sector: 'Consulting', gradient: ['#059669', '#064e3b'],
    contacts: [
      { name: 'Julie Hoffmann', role: 'Office Manager', email: 'j.hoffmann@deloitte.lu', phone: '+352 45 145 1', isDecisionMaker: true },
    ],
    address: '20 Boulevard de Kockelscheuer, L-1821', vat: 'LU20011769',
    contractActive: true, contractStart: '2024-04-01', contractEnd: '2026-03-31',
    contractTerms: 'Facturation mensuelle groupée',
    discountRate: 8, paymentTerms: 'Net 30',
    totalEvents: 9, totalRevenue: 17600, annualSpend: 15400, creditLimit: 30000, creditUsed: 4200,
    lastEvent: '2026-03-25', tier: 'B', healthScore: 78,
    accountManager: 'Sarah Martin', onboardingDate: '2023-01-15',
    meetings: [
      { date: '2026-03-28', type: 'Visio', subject: 'Revue trimestrielle', outcome: 'Satisfaction moyenne', actions: ['Proposer nouvelles formules'] },
    ],
    proposals: [
      { id: 'p5', name: 'Séminaire managers', amount: 6800, sentDate: '2026-04-02', status: 'En cours' },
    ],
    activities: [
      { date: '2026-04-02', type: 'proposal', description: 'Devis séminaire envoyé' },
      { date: '2026-03-28', type: 'meeting', description: 'Revue trimestrielle' },
      { date: '2026-03-25', type: 'order', description: 'Afterwork — 1 800 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 2200 }, { month: 'Déc', amount: 3800 }, { month: 'Jan', amount: 1200 },
      { month: 'Fév', amount: 2400 }, { month: 'Mar', amount: 1800 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c4', company: 'ArcelorMittal', sector: 'Administration', gradient: ['#f97316', '#9a3412'],
    contacts: [
      { name: 'Pierre Lentz', role: 'Events & Communications', email: 'p.lentz@arcelormittal.com', phone: '+352 47 92 1', isDecisionMaker: true },
      { name: 'Martine Schroeder', role: 'Procurement', email: 'm.schroeder@arcelormittal.com', phone: '+352 47 92 25', isDecisionMaker: true },
    ],
    address: "24-26 Boulevard d'Avranches, L-1160", vat: 'LU17518770',
    contractActive: true, contractStart: '2025-01-01', contractEnd: '2026-12-31',
    contractTerms: 'Compte ouvert avec facturation trimestrielle',
    discountRate: 12, paymentTerms: 'Net 90',
    totalEvents: 6, totalRevenue: 21800, annualSpend: 18500, creditLimit: 100000, creditUsed: 12400,
    lastEvent: '2026-02-12', tier: 'A', healthScore: 84,
    accountManager: 'Thomas Klein', onboardingDate: '2022-11-08',
    meetings: [
      { date: '2026-02-14', type: 'Présentiel', subject: 'Inauguration site', outcome: 'Très réussi', actions: ['Remerciements', 'Photos'] },
    ],
    proposals: [
      { id: 'p6', name: 'Congrès européen', amount: 45000, sentDate: '2026-03-28', status: 'En cours' },
    ],
    activities: [
      { date: '2026-03-28', type: 'proposal', description: 'Proposition Congrès européen' },
      { date: '2026-02-14', type: 'order', description: 'Inauguration — 9 800 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 0 }, { month: 'Déc', amount: 4200 }, { month: 'Jan', amount: 0 },
      { month: 'Fév', amount: 9800 }, { month: 'Mar', amount: 0 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c5', company: 'PwC Luxembourg', sector: 'Consulting', gradient: ['#e11d48', '#881337'],
    contacts: [
      { name: 'Nathalie Muller', role: 'HR Director', email: 'n.muller@pwc.lu', phone: '+352 49 48 48 1', isDecisionMaker: true },
      { name: 'Antoine Rollinger', role: 'Internal Communications', email: 'a.rollinger@pwc.lu', phone: '+352 49 48 48 42', isDecisionMaker: false },
    ],
    address: '2 Rue Gerhard Mercator, L-1014', vat: 'LU17564447',
    contractActive: true, contractStart: '2023-07-01', contractEnd: '2026-06-30',
    contractTerms: 'Tarif préférentiel -15% volume > 30k€/an',
    discountRate: 15, paymentTerms: 'Net 30',
    totalEvents: 18, totalRevenue: 34200, annualSpend: 31800, creditLimit: 60000, creditUsed: 9200,
    lastEvent: '2026-04-10', tier: 'A', healthScore: 94,
    accountManager: 'Sarah Martin', onboardingDate: '2021-09-14',
    meetings: [
      { date: '2026-04-10', type: 'Déjeuner', subject: 'Bilan Q1', outcome: 'Très positif', actions: ['Préparer Q2'] },
    ],
    proposals: [
      { id: 'p7', name: 'Summer party', amount: 18500, sentDate: '2026-04-08', status: 'Gagné' },
    ],
    activities: [
      { date: '2026-04-12', type: 'order', description: 'Summer party confirmée' },
      { date: '2026-04-10', type: 'meeting', description: 'Déjeuner bilan' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 5200 }, { month: 'Déc', amount: 8400 }, { month: 'Jan', amount: 3200 },
      { month: 'Fév', amount: 4800 }, { month: 'Mar', amount: 6200 }, { month: 'Avr', amount: 6400 },
    ],
  },
  {
    id: 'c6', company: 'RTL Group', sector: 'IT', gradient: ['#8b5cf6', '#581c87'],
    contacts: [
      { name: 'Thomas Reuter', role: 'Chef production', email: 't.reuter@rtlgroup.com', phone: '+352 24 86 1', isDecisionMaker: true },
    ],
    address: '45 Boulevard Pierre Frieden, L-1543', vat: 'LU10402205',
    contractActive: false, contractStart: '2023-03-01', contractEnd: '2025-11-30',
    contractTerms: 'Contrat expiré — à renouveler',
    discountRate: 0, paymentTerms: 'Net 30',
    totalEvents: 4, totalRevenue: 8200, annualSpend: 3800, creditLimit: 15000, creditUsed: 0,
    lastEvent: '2025-11-28', tier: 'C', healthScore: 45,
    accountManager: 'Sarah Martin', onboardingDate: '2023-03-01',
    meetings: [
      { date: '2025-11-28', type: 'Visio', subject: 'Fin de contrat', outcome: 'Pas de suite immédiate', actions: ['Relance dans 6 mois'] },
    ],
    proposals: [
      { id: 'p8', name: 'Nouvelle saison 2026', amount: 12000, sentDate: '2026-01-15', status: 'Perdu' },
    ],
    activities: [
      { date: '2026-01-20', type: 'email', description: 'Refus proposition 2026' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 2200 }, { month: 'Déc', amount: 0 }, { month: 'Jan', amount: 0 },
      { month: 'Fév', amount: 0 }, { month: 'Mar', amount: 0 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c7', company: 'SES Astra', sector: 'IT', gradient: ['#0284c7', '#0c4a6e'],
    contacts: [
      { name: 'Isabelle Roth', role: 'Event Coordinator', email: 'i.roth@ses.com', phone: '+352 710 725 1', isDecisionMaker: true },
    ],
    address: 'Château de Betzdorf, L-6815', vat: 'LU19729474',
    contractActive: true, contractStart: '2024-06-01', contractEnd: '2026-05-31',
    contractTerms: 'Compte ouvert avec tarif catalogue',
    discountRate: 5, paymentTerms: 'Net 60',
    totalEvents: 11, totalRevenue: 19800, annualSpend: 17200, creditLimit: 40000, creditUsed: 5400,
    lastEvent: '2026-03-18', tier: 'B', healthScore: 82,
    accountManager: 'Thomas Klein', onboardingDate: '2023-02-20',
    meetings: [
      { date: '2026-03-20', type: 'Présentiel', subject: 'Suivi événements 2026', outcome: 'Plan validé', actions: ['Prévoir 3 dates'] },
    ],
    proposals: [
      { id: 'p9', name: 'Lancement satellite', amount: 9800, sentDate: '2026-03-30', status: 'En cours' },
    ],
    activities: [
      { date: '2026-03-30', type: 'proposal', description: 'Devis lancement satellite' },
      { date: '2026-03-18', type: 'order', description: 'Réception partenaires — 3 400 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 2400 }, { month: 'Déc', amount: 3800 }, { month: 'Jan', amount: 1800 },
      { month: 'Fév', amount: 2200 }, { month: 'Mar', amount: 3400 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c8', company: 'Post Luxembourg', sector: 'Administration', gradient: ['#facc15', '#854d0e'],
    contacts: [
      { name: 'Paul Schumacher', role: 'Direction Communication', email: 'p.schumacher@post.lu', phone: '+352 80 02 80 04', isDecisionMaker: true },
    ],
    address: '20 Rue de Reims, L-2417', vat: 'LU15734515',
    contractActive: true, contractStart: '2024-09-01', contractEnd: '2026-09-01',
    contractTerms: 'Tarif préférentiel administration publique',
    discountRate: 12, paymentTerms: 'Net 60',
    totalEvents: 7, totalRevenue: 12400, annualSpend: 10200, creditLimit: 25000, creditUsed: 3400,
    lastEvent: '2026-02-26', tier: 'B', healthScore: 76,
    accountManager: 'Sarah Martin', onboardingDate: '2023-09-12',
    meetings: [
      { date: '2026-02-28', type: 'Visio', subject: 'Planning Q2', outcome: 'À confirmer', actions: ['Rappel dans 2 semaines'] },
    ],
    proposals: [],
    activities: [
      { date: '2026-02-26', type: 'order', description: 'Conférence de presse — 2 200 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 1800 }, { month: 'Déc', amount: 2400 }, { month: 'Jan', amount: 1200 },
      { month: 'Fév', amount: 2200 }, { month: 'Mar', amount: 0 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c9', company: 'Laboratoires Ketterthill', sector: 'Pharma', gradient: ['#10b981', '#064e3b'],
    contacts: [
      { name: 'Céline Jungen', role: 'Admin manager', email: 'c.jungen@ketterthill.lu', phone: '+352 488 288 1', isDecisionMaker: true },
    ],
    address: '37 Rue Romain Fandel, L-4149', vat: 'LU11895442',
    contractActive: true, contractStart: '2025-02-01', contractEnd: '2027-01-31',
    contractTerms: 'Facturation mensuelle standard',
    discountRate: 5, paymentTerms: 'Net 30',
    totalEvents: 5, totalRevenue: 9600, annualSpend: 8800, creditLimit: 20000, creditUsed: 2100,
    lastEvent: '2026-03-30', tier: 'B', healthScore: 80,
    accountManager: 'Thomas Klein', onboardingDate: '2024-02-15',
    meetings: [
      { date: '2026-04-01', type: 'Visio', subject: 'Événement scientifique', outcome: 'Brief reçu', actions: ['Devis sous 10j'] },
    ],
    proposals: [
      { id: 'p10', name: 'Congrès médical', amount: 8400, sentDate: '2026-04-08', status: 'En cours' },
    ],
    activities: [
      { date: '2026-04-08', type: 'proposal', description: 'Proposition Congrès envoyée' },
      { date: '2026-03-30', type: 'order', description: 'Réunion annuelle — 2 800 €' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 1400 }, { month: 'Déc', amount: 1800 }, { month: 'Jan', amount: 800 },
      { month: 'Fév', amount: 1600 }, { month: 'Mar', amount: 2800 }, { month: 'Avr', amount: 0 },
    ],
  },
  {
    id: 'c10', company: 'Spuerkeess', sector: 'Banque', gradient: ['#0891b2', '#164e63'],
    contacts: [
      { name: 'François Origer', role: 'Events Manager', email: 'f.origer@spuerkeess.lu', phone: '+352 40 15 1', isDecisionMaker: true },
    ],
    address: '1 Place de Metz, L-2954', vat: 'LU14388823',
    contractActive: false, contractStart: '2023-01-01', contractEnd: '2025-12-31',
    contractTerms: 'Contrat expiré — négociation en cours',
    discountRate: 0, paymentTerms: 'Net 30',
    totalEvents: 3, totalRevenue: 5400, annualSpend: 1800, creditLimit: 10000, creditUsed: 0,
    lastEvent: '2025-12-05', tier: 'C', healthScore: 52,
    accountManager: 'Sarah Martin', onboardingDate: '2023-01-10',
    meetings: [
      { date: '2026-03-15', type: 'Visio', subject: 'Renouvellement possible', outcome: 'Intérêt confirmé', actions: ['Nouvelle proposition commerciale'] },
    ],
    proposals: [
      { id: 'p11', name: 'Pack entreprise 2026', amount: 15000, sentDate: '2026-03-20', status: 'En cours' },
    ],
    activities: [
      { date: '2026-03-20', type: 'proposal', description: 'Nouveau pack commercial' },
      { date: '2026-03-15', type: 'meeting', description: 'Rdv renouvellement' },
    ],
    monthlyRevenue: [
      { month: 'Nov', amount: 1800 }, { month: 'Déc', amount: 1800 }, { month: 'Jan', amount: 0 },
      { month: 'Fév', amount: 0 }, { month: 'Mar', amount: 0 }, { month: 'Avr', amount: 0 },
    ],
  },
]

const SECTOR_COLORS: Record<Sector, string> = {
  'Banque': '#0ea5e9',
  'Consulting': '#8b5cf6',
  'IT': '#06b6d4',
  'Pharma': '#10b981',
  'Administration': '#f97316',
}

const TIER_CONFIG: Record<ClientTier, { color: string; bg: string; label: string }> = {
  A: { color: '#b45309', bg: '#fef3c7', label: 'Tier A — Stratégique' },
  B: { color: '#1d4ed8', bg: '#dbeafe', label: 'Tier B — Important' },
  C: { color: '#64748b', bg: '#f1f5f9', label: 'Tier C — Standard' },
}

const ACTIVITY_ICONS: Record<ActivityType, any> = {
  email: Mail, call: PhoneCall, meeting: Users, order: ShoppingBag, proposal: FileText,
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  email: '#8b5cf6', call: '#0ea5e9', meeting: '#f59e0b', order: '#10b981', proposal: '#ef4444',
}

const INDUSTRY_INSIGHTS: Record<Sector, { competitors: string[]; avgBudget: number; growth: number }> = {
  'Banque': { competitors: ['Sodexo', 'Lux Catering'], avgBudget: 25000, growth: 8.5 },
  'Consulting': { competitors: ['Traiteur Steffen', 'Namur'], avgBudget: 35000, growth: 12.3 },
  'IT': { competitors: ['Oberweis', 'Lux Catering'], avgBudget: 18000, growth: 15.2 },
  'Pharma': { competitors: ['Traiteur Steffen'], avgBudget: 22000, growth: 6.8 },
  'Administration': { competitors: ['Sodexo', 'Namur'], avgBudget: 15000, growth: 3.2 },
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const daysUntil = (date: string) => {
  const diff = new Date(date).getTime() - new Date('2026-04-17').getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  color: '#1e293b',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function ClientsB2BPage() {
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState<Sector | 'Tous'>('Tous')
  const [tierFilter, setTierFilter] = useState<ClientTier | 'Tous'>('Tous')
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState<B2BClient | null>(null)

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      if (sectorFilter !== 'Tous' && c.sector !== sectorFilter) return false
      if (tierFilter !== 'Tous' && c.tier !== tierFilter) return false
      if (search && !`${c.company} ${c.contacts[0]?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, sectorFilter, tierFilter])

  const renewalAlerts = MOCK_CLIENTS.filter((c) => {
    const d = daysUntil(c.contractEnd)
    return c.contractActive && d <= 60 && d >= 0
  })

  const totalRevenue = MOCK_CLIENTS.reduce((s, c) => s + c.totalRevenue, 0)
  const activeContracts = MOCK_CLIENTS.filter((c) => c.contractActive).length
  const tierACount = MOCK_CLIENTS.filter((c) => c.tier === 'A').length
  const avgHealth = Math.round(MOCK_CLIENTS.reduce((s, c) => s + c.healthScore, 0) / MOCK_CLIENTS.length)

  const stats = [
    { label: 'Clients B2B', value: String(MOCK_CLIENTS.length), icon: Building2, color: '#3b82f6', sub: `${activeContracts} contrats actifs` },
    { label: 'Clients Tier A', value: String(tierACount), icon: Trophy, color: '#f59e0b', sub: 'Comptes stratégiques' },
    { label: 'CA B2B cumulé', value: fmtEUR(totalRevenue), icon: TrendingUp, color: '#10b981', sub: '+18% vs année N-1' },
    { label: 'Santé moyenne', value: `${avgHealth}%`, icon: Activity, color: '#8b5cf6', sub: 'Score relation' },
  ]

  const sectorData = Object.entries(
    MOCK_CLIENTS.reduce((acc, c) => {
      acc[c.sector] = (acc[c.sector] ?? 0) + c.totalRevenue
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const tierData = (['A', 'B', 'C'] as ClientTier[]).map((t) => ({
    name: `Tier ${t}`,
    clients: MOCK_CLIENTS.filter((c) => c.tier === t).length,
    revenue: MOCK_CLIENTS.filter((c) => c.tier === t).reduce((s, c) => s + c.totalRevenue, 0),
  }))

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Clients B2B</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gestion complète de la relation — contrats, comptes, proposals, KAM
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: '#1e293b', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouveau client B2B
        </motion.button>
      </div>

      {/* Renewal alerts */}
      {renewalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...card,
            padding: 16,
            marginBottom: 20,
            background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
            border: '1px solid #fcd34d',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#b45309', flexShrink: 0,
          }}>
            <Bell size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#78350f' }}>
              Alertes renouvellement de contrat
            </div>
            <div style={{ fontSize: 13, color: '#92400e', marginTop: 2 }}>
              {renewalAlerts.length} contrat{renewalAlerts.length > 1 ? 's' : ''} arrive{renewalAlerts.length > 1 ? 'nt' : ''} à échéance dans les 60 jours —{' '}
              {renewalAlerts.map((c) => c.company).join(', ')}
            </div>
          </div>
          <button style={{
            padding: '8px 16px', background: '#92400e', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Voir les détails <ChevronRight size={14} />
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={card}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.sub}</div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${s.color}15`, color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Analytics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Répartition CA par tier</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Volume et nombre de clients</div>
            </div>
            <BarChart3 size={18} style={{ color: '#94a3b8' }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <RTooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                formatter={(v: any, k: string) => k === 'revenue' ? fmtEUR(v) : v}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="CA €" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="clients" name="Clients" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>CA par secteur</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Distribution</div>
            </div>
            <Target size={18} style={{ color: '#94a3b8' }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sectorData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {sectorData.map((s) => (
                  <Cell key={s.name} fill={SECTOR_COLORS[s.name as Sector]} />
                ))}
              </Pie>
              <RTooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                formatter={(v: any) => fmtEUR(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {sectorData.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: SECTOR_COLORS[s.name as Sector] }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher une société ou un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Tous', 'Banque', 'Consulting', 'IT', 'Pharma', 'Administration'] as const).map((s) => {
            const active = sectorFilter === s
            const color = s !== 'Tous' ? SECTOR_COLORS[s] : '#1e293b'
            return (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? color : '#e2e8f0'}`,
                  background: active ? color : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, borderLeft: '1px solid #e2e8f0', paddingLeft: 10 }}>
          {(['Tous', 'A', 'B', 'C'] as const).map((t) => {
            const active = tierFilter === t
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? '#1e293b' : '#e2e8f0'}`,
                  background: active ? '#1e293b' : '#fff',
                  color: active ? '#fff' : '#475569',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t === 'Tous' ? 'Tous tiers' : `Tier ${t}`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((c, i) => {
          const tier = TIER_CONFIG[c.tier]
          const renewDays = daysUntil(c.contractEnd)
          const needsRenewal = c.contractActive && renewDays <= 60
          const creditPct = (c.creditUsed / c.creditLimit) * 100
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
              onClick={() => setDetail(c)}
              style={{ ...card, padding: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{
                padding: 16,
                background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                color: '#fff',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700,
                  }}>
                    {c.company.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{c.company}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span style={{
                        padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                        background: 'rgba(255,255,255,0.25)',
                      }}>
                        {c.sector}
                      </span>
                      <span style={{
                        padding: '2px 8px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                        background: '#fff', color: tier.color,
                      }}>
                        Tier {c.tier}
                      </span>
                    </div>
                  </div>
                </div>
                {needsRenewal && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    padding: '3px 8px', background: '#ef4444', color: '#fff',
                    borderRadius: 6, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Bell size={10} /> J-{renewDays}
                  </div>
                )}
              </div>

              <div style={{ padding: 16, flex: 1 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.contacts[0].name}</div>
                    {c.contacts.length > 1 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#8b5cf6', background: '#ede9fe', padding: '2px 6px', borderRadius: 5 }}>
                        +{c.contacts.length - 1} contacts
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.contacts[0].role}</div>
                </div>

                {/* Health score */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Santé relation</span>
                    <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>{c.healthScore}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${c.healthScore}%`,
                      background: c.healthScore >= 85 ? '#10b981' : c.healthScore >= 65 ? '#f59e0b' : '#ef4444',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>

                {/* Credit limit */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Crédit utilisé</span>
                    <span style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>
                      {fmtEUR(c.creditUsed)} / {fmtEUR(c.creditLimit)}
                    </span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(creditPct, 100)}%`,
                      background: creditPct > 80 ? '#ef4444' : creditPct > 50 ? '#f59e0b' : '#3b82f6',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>

                {/* KAM */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: '#f8fafc', borderRadius: 8, marginBottom: 10,
                }}>
                  <UserCheck size={14} style={{ color: '#64748b' }} />
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>KAM :</span>{' '}
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{c.accountManager}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', background: c.contractActive ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8, marginBottom: 12,
                }}>
                  {c.contractActive
                    ? <CheckCircle2 size={13} style={{ color: '#15803d' }} />
                    : <AlertCircle size={13} style={{ color: '#b91c1c' }} />}
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.contractActive ? '#15803d' : '#b91c1c', flex: 1 }}>
                    {c.contractActive ? `Contrat actif — -${c.discountRate}% · ${c.paymentTerms}` : 'Contrat expiré'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  <MiniStat label="Évts" value={String(c.totalEvents)} />
                  <MiniStat label="CA total" value={fmtEUR(c.totalRevenue)} />
                  <MiniStat label="Annuel" value={fmtEUR(c.annualSpend)} />
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <ActionBtn icon={Eye} label="Détails" onClick={() => setDetail(c)} primary />
                  <ActionBtn icon={ShoppingBag} label="Commande" onClick={() => {}} />
                  <ActionBtn icon={Edit3} label="Éditer" onClick={() => {}} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {modal && <NewClientModal onClose={() => setModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {detail && <ClientDetail client={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 6px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary }: { icon: any; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 8px',
        background: primary ? '#1e293b' : '#f8fafc',
        color: primary ? '#fff' : '#475569',
        border: primary ? 'none' : '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
      }}
    >
      <Icon size={12} /> {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  New Client Modal                                                   */
/* ------------------------------------------------------------------ */

function NewClientModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Nouveau client B2B</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Société</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Field label="Raison sociale"><input style={input} placeholder="Ex. BGL BNP Paribas" /></Field>
            <Field label="Secteur">
              <select style={input}>
                <option>Banque</option><option>Consulting</option><option>IT</option><option>Pharma</option><option>Administration</option>
              </select>
            </Field>
            <Field label="N° TVA"><input style={input} placeholder="LU..." /></Field>
            <Field label="Tier client">
              <select style={input}>
                <option>Tier A — Stratégique</option>
                <option>Tier B — Important</option>
                <option>Tier C — Standard</option>
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Adresse facturation"><input style={input} placeholder="50 Avenue J.F. Kennedy, L-2951 Luxembourg" /></Field>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Contrat & conditions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Field label="Remise volume %"><input style={input} type="number" placeholder="10" /></Field>
            <Field label="Conditions de paiement">
              <select style={input}><option>Net 30</option><option>Net 60</option><option>Net 90</option></select>
            </Field>
            <Field label="Limite de crédit (€)"><input style={input} type="number" placeholder="50000" /></Field>
            <Field label="Key Account Manager">
              <select style={input}><option>Sarah Martin</option><option>Thomas Klein</option></select>
            </Field>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Contact principal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nom & prénom"><input style={input} placeholder="Sophie Becker" /></Field>
            <Field label="Poste"><input style={input} placeholder="Responsable RH" /></Field>
            <Field label="Email"><input style={input} placeholder="contact@entreprise.lu" /></Field>
            <Field label="Téléphone"><input style={input} placeholder="+352 ..." /></Field>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 18px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button style={{ padding: '10px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Créer le client</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Client Detail                                                      */
/* ------------------------------------------------------------------ */

function ClientDetail({ client, onClose }: { client: B2BClient; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'contract' | 'contacts' | 'meetings' | 'timeline' | 'proposals' | 'insights'>('overview')
  const insights = INDUSTRY_INSIGHTS[client.sector]
  const tier = TIER_CONFIG[client.tier]

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble", icon: Eye },
    { id: 'contract', label: 'Contrat', icon: FileCheck },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'meetings', label: 'Réunions', icon: Video },
    { id: 'timeline', label: 'Historique', icon: Activity },
    { id: 'proposals', label: 'Propositions', icon: FileText },
    { id: 'insights', label: 'Insights', icon: Zap },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 920, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          padding: 20,
          background: `linear-gradient(135deg, ${client.gradient[0]}, ${client.gradient[1]})`,
          color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{client.company}</h2>
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#fff', color: tier.color }}>
                Tier {client.tier}
              </span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {client.sector} · KAM {client.accountManager} · Client depuis {new Date(client.onboardingDate).getFullYear()}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '0 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none', borderBottom: `2px solid ${active ? '#1e293b' : 'transparent'}`,
                  color: active ? '#0f172a' : '#64748b',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          {tab === 'overview' && <OverviewTab client={client} />}
          {tab === 'contract' && <ContractTab client={client} />}
          {tab === 'contacts' && <ContactsTab client={client} />}
          {tab === 'meetings' && <MeetingsTab client={client} />}
          {tab === 'timeline' && <TimelineTab client={client} />}
          {tab === 'proposals' && <ProposalsTab client={client} />}
          {tab === 'insights' && <InsightsTab client={client} insights={insights} />}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* -------- Tab: Overview -------- */
function OverviewTab({ client }: { client: B2BClient }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <SummaryBox label="Total événements" value={String(client.totalEvents)} icon={Calendar} />
        <SummaryBox label="CA cumulé" value={fmtEUR(client.totalRevenue)} icon={Euro} />
        <SummaryBox label="CA annuel" value={fmtEUR(client.annualSpend)} icon={TrendingUp} />
        <SummaryBox label="Santé" value={`${client.healthScore}%`} icon={Activity} />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenus 6 derniers mois</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={client.monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <RTooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} formatter={(v: any) => fmtEUR(v)} />
            <Line type="monotone" dataKey="amount" stroke={client.gradient[0]} strokeWidth={3} dot={{ r: 5, fill: client.gradient[0] }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...card, background: '#f8fafc' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Limite de crédit</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Utilisé</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            {fmtEUR(client.creditUsed)} / {fmtEUR(client.creditLimit)}
          </span>
        </div>
        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(client.creditUsed / client.creditLimit) * 100}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          }} />
        </div>
      </div>
    </div>
  )
}

/* -------- Tab: Contract -------- */
function ContractTab({ client }: { client: B2BClient }) {
  const renewDays = daysUntil(client.contractEnd)
  return (
    <div>
      <div style={{
        ...card, marginBottom: 16,
        background: client.contractActive ? 'linear-gradient(135deg, #dcfce7, #ecfccb)' : 'linear-gradient(135deg, #fee2e2, #fef2f2)',
        border: `1px solid ${client.contractActive ? '#86efac' : '#fca5a5'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {client.contractActive
            ? <CheckCircle2 size={24} style={{ color: '#15803d' }} />
            : <AlertCircle size={24} style={{ color: '#b91c1c' }} />}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: client.contractActive ? '#15803d' : '#b91c1c' }}>
              {client.contractActive ? 'Contrat actif' : 'Contrat expiré'}
            </div>
            <div style={{ fontSize: 12, color: client.contractActive ? '#166534' : '#991b1b', marginTop: 2 }}>
              {client.contractActive && renewDays <= 60
                ? `Renouvellement requis dans ${renewDays} jours`
                : `Valable du ${new Date(client.contractStart).toLocaleDateString('fr-LU')} au ${new Date(client.contractEnd).toLocaleDateString('fr-LU')}`
              }
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <DataCell label="Remise volume" value={`-${client.discountRate}%`} icon={TrendingDown} />
        <DataCell label="Conditions paiement" value={client.paymentTerms} icon={CreditCard} />
        <DataCell label="Limite crédit" value={fmtEUR(client.creditLimit)} icon={Shield} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Termes du contrat</div>
        <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{client.contractTerms}</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button style={{ flex: 1, padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FileCheck size={15} /> Renouveler le contrat
        </button>
        <button style={{ flex: 1, padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Edit3 size={15} /> Modifier les termes
        </button>
      </div>
    </div>
  )
}

/* -------- Tab: Contacts -------- */
function ContactsTab({ client }: { client: B2BClient }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {client.contacts.length} contact{client.contacts.length > 1 ? 's' : ''}
        </div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Ajouter
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {client.contacts.map((c, i) => (
          <div key={i} style={{ ...card, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#475569',
                }}>
                  {c.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                    {c.isDecisionMaker && (
                      <span style={{ padding: '1px 7px', background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700, borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={10} /> Décideur
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.role}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#475569' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {c.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {c.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------- Tab: Meetings -------- */
function MeetingsTab({ client }: { client: B2BClient }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Historique des réunions</div>
        <button style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Nouvelle note
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {client.meetings.map((m, i) => {
          const TypeIcon = m.type === 'Visio' ? Video : m.type === 'Déjeuner' ? Coffee : Users
          return (
            <div key={i} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569',
                  }}>
                    <TypeIcon size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{m.subject}</div>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8 }}>
                      <span>{new Date(m.date).toLocaleDateString('fr-LU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>{m.type}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', marginBottom: m.actions.length ? 10 : 0 }}>
                <strong style={{ color: '#0f172a' }}>Résultat :</strong> {m.outcome}
              </div>
              {m.actions.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Actions à suivre</div>
                  {m.actions.map((a, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', padding: '3px 0' }}>
                      <CheckCircle2 size={12} style={{ color: '#10b981' }} /> {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------- Tab: Timeline -------- */
function TimelineTab({ client }: { client: B2BClient }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Fil d'activité depuis {new Date(client.onboardingDate).toLocaleDateString('fr-LU')}
      </div>
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: '#e2e8f0' }} />
        {client.activities.map((a, i) => {
          const Icon = ACTIVITY_ICONS[a.type]
          const color = ACTIVITY_COLORS[a.type]
          return (
            <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
              <div style={{
                position: 'absolute', left: -24, top: 2,
                width: 24, height: 24, borderRadius: '50%',
                background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: `0 0 0 3px ${color}22`,
              }}>
                <Icon size={12} />
              </div>
              <div style={{ ...card, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(a.date).toLocaleDateString('fr-LU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------- Tab: Proposals -------- */
function ProposalsTab({ client }: { client: B2BClient }) {
  const won = client.proposals.filter((p) => p.status === 'Gagné').length
  const lost = client.proposals.filter((p) => p.status === 'Perdu').length
  const total = client.proposals.length
  const rate = total > 0 ? Math.round((won / total) * 100) : 0
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <SummaryBox label="Propositions" value={String(total)} icon={FileText} />
        <SummaryBox label="Gagnées" value={String(won)} icon={Trophy} />
        <SummaryBox label="Perdues" value={String(lost)} icon={X} />
        <SummaryBox label="Taux conversion" value={`${rate}%`} icon={Target} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {client.proposals.map((p) => {
          const statusColor = p.status === 'Gagné' ? '#10b981' : p.status === 'Perdu' ? '#ef4444' : '#f59e0b'
          const statusBg = p.status === 'Gagné' ? '#dcfce7' : p.status === 'Perdu' ? '#fee2e2' : '#fef3c7'
          return (
            <div key={p.id} style={{ ...card, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Envoyé le {new Date(p.sentDate).toLocaleDateString('fr-LU')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{fmtEUR(p.amount)}</div>
                <span style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, background: statusBg, color: statusColor }}>
                  {p.status}
                </span>
              </div>
            </div>
          )
        })}
        {client.proposals.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <FileText size={32} style={{ marginBottom: 8 }} />
            <div>Aucune proposition pour ce client</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------- Tab: Insights -------- */
function InsightsTab({ client, insights }: { client: B2BClient; insights: typeof INDUSTRY_INSIGHTS[Sector] }) {
  return (
    <div>
      <div style={{ ...card, marginBottom: 16, background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)', border: '1px solid #c7d2fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Briefcase size={18} style={{ color: '#4338ca' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3730a3' }}>Analyse sectorielle — {client.sector}</div>
        </div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          Le secteur <strong>{client.sector}</strong> affiche une croissance moyenne de <strong style={{ color: '#10b981' }}>+{insights.growth}%</strong> cette année.
          Le budget moyen par client de ce secteur est de <strong>{fmtEUR(insights.avgBudget)}</strong>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Position vs marché</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {client.annualSpend > insights.avgBudget ? '+' : ''}
            {Math.round(((client.annualSpend - insights.avgBudget) / insights.avgBudget) * 100)}%
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {client.annualSpend > insights.avgBudget ? 'Au-dessus' : 'En-dessous'} du budget moyen du secteur
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Croissance secteur</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>+{insights.growth}%</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Opportunité d'upsell à considérer</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <ArrowUpRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Concurrents actifs dans ce secteur
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {insights.competitors.map((c) => (
            <span key={c} style={{
              padding: '6px 12px', background: '#f1f5f9', color: '#475569',
              borderRadius: 20, fontSize: 13, fontWeight: 600,
            }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------- helpers -------- */
function SummaryBox({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
        <Icon size={13} /> {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

function DataCell({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
        <Icon size={13} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}
