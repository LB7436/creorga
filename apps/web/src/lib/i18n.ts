import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'fr' | 'de' | 'en' | 'pt'

type TranslationKeys = {
  modules: string
  dashboard: string
  notifications: string
  settings: string
  logout: string
  profile: string
  back: string
  save: string
  cancel: string
  delete: string
  add: string
  edit: string
  search: string
  pos: string
  crm: string
  invoices: string
  hr: string
  planning: string
  inventory: string
  accounting: string
  haccp: string
  agenda: string
  reputation: string
  guests: string
  qrmenu: string
  today: string
  yesterday: string
  thisWeek: string
  thisMonth: string
  total: string
  status: string
  actions: string
  export: string
  print: string
  welcomeBack: string
  revenue: string
  orders: string
  tables: string
  clients: string
  waiter: string
  cook: string
  cleaner: string
  manager: string
}

const translations: Record<Locale, TranslationKeys> = {
  fr: {
    modules: 'Modules',
    dashboard: 'Tableau de bord',
    notifications: 'Notifications',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    profile: 'Mon profil',
    back: 'Retour',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    add: 'Ajouter',
    edit: 'Modifier',
    search: 'Rechercher...',
    pos: 'Caisse POS',
    crm: 'CRM & Marketing',
    invoices: 'Factures & Devis',
    hr: 'Gestion RH',
    planning: 'Planning',
    inventory: 'Inventaire',
    accounting: 'Comptabilité',
    haccp: 'HACCP',
    agenda: 'Agenda & Calendrier',
    reputation: 'Réputation',
    guests: 'Accès Clients',
    qrmenu: 'Menu QR',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    thisWeek: 'Cette semaine',
    thisMonth: 'Ce mois',
    total: 'Total',
    status: 'Statut',
    actions: 'Actions',
    export: 'Exporter',
    print: 'Imprimer',
    welcomeBack: 'Bonjour',
    revenue: "Chiffre d'affaires",
    orders: 'Commandes',
    tables: 'Tables',
    clients: 'Clients',
    waiter: 'Serveur',
    cook: 'Cuisinier',
    cleaner: 'Femme de ménage',
    manager: 'Manager',
  },
  de: {
    modules: 'Module',
    dashboard: 'Übersicht',
    notifications: 'Benachrichtigungen',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    profile: 'Mein Profil',
    back: 'Zurück',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    search: 'Suchen...',
    pos: 'Kasse POS',
    crm: 'CRM & Marketing',
    invoices: 'Rechnungen & Angebote',
    hr: 'Personalverwaltung',
    planning: 'Planung',
    inventory: 'Inventar',
    accounting: 'Buchhaltung',
    haccp: 'HACCP',
    agenda: 'Kalender',
    reputation: 'Bewertungen',
    guests: 'Gästezugang',
    qrmenu: 'QR-Menü',
    today: 'Heute',
    yesterday: 'Gestern',
    thisWeek: 'Diese Woche',
    thisMonth: 'Dieser Monat',
    total: 'Gesamt',
    status: 'Status',
    actions: 'Aktionen',
    export: 'Exportieren',
    print: 'Drucken',
    welcomeBack: 'Guten Tag',
    revenue: 'Umsatz',
    orders: 'Bestellungen',
    tables: 'Tische',
    clients: 'Kunden',
    waiter: 'Kellner',
    cook: 'Koch',
    cleaner: 'Reinigungskraft',
    manager: 'Manager',
  },
  en: {
    modules: 'Modules',
    dashboard: 'Dashboard',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Sign out',
    profile: 'My profile',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    edit: 'Edit',
    search: 'Search...',
    pos: 'POS Register',
    crm: 'CRM & Marketing',
    invoices: 'Invoices & Quotes',
    hr: 'HR Management',
    planning: 'Planning',
    inventory: 'Inventory',
    accounting: 'Accounting',
    haccp: 'HACCP',
    agenda: 'Calendar',
    reputation: 'Reviews',
    guests: 'Guest Portal',
    qrmenu: 'QR Menu',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This week',
    thisMonth: 'This month',
    total: 'Total',
    status: 'Status',
    actions: 'Actions',
    export: 'Export',
    print: 'Print',
    welcomeBack: 'Hello',
    revenue: 'Revenue',
    orders: 'Orders',
    tables: 'Tables',
    clients: 'Customers',
    waiter: 'Waiter',
    cook: 'Cook',
    cleaner: 'Cleaner',
    manager: 'Manager',
  },
  pt: {
    modules: 'Módulos',
    dashboard: 'Painel',
    notifications: 'Notificações',
    settings: 'Configurações',
    logout: 'Sair',
    profile: 'Meu perfil',
    back: 'Voltar',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    add: 'Adicionar',
    edit: 'Editar',
    search: 'Pesquisar...',
    pos: 'Caixa POS',
    crm: 'CRM & Marketing',
    invoices: 'Faturas & Orçamentos',
    hr: 'Gestão RH',
    planning: 'Planeamento',
    inventory: 'Inventário',
    accounting: 'Contabilidade',
    haccp: 'HACCP',
    agenda: 'Calendário',
    reputation: 'Reputação',
    guests: 'Acesso Clientes',
    qrmenu: 'Menu QR',
    today: 'Hoje',
    yesterday: 'Ontem',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mês',
    total: 'Total',
    status: 'Estado',
    actions: 'Ações',
    export: 'Exportar',
    print: 'Imprimir',
    welcomeBack: 'Olá',
    revenue: 'Receita',
    orders: 'Pedidos',
    tables: 'Mesas',
    clients: 'Clientes',
    waiter: 'Garçom',
    cook: 'Cozinheiro',
    cleaner: 'Limpeza',
    manager: 'Gerente',
  },
}

export const LOCALES = [
  { code: 'fr' as Locale, label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'de' as Locale, label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'en' as Locale, label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'pt' as Locale, label: 'Português', flag: '\u{1F1F5}\u{1F1F9}' },
]

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof TranslationKeys) => string
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'fr',
      setLocale: (locale: Locale) => set({ locale }),
      t: (key: keyof TranslationKeys) => {
        const { locale } = get()
        return translations[locale][key] ?? key
      },
    }),
    {
      name: 'creorga-locale',
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
)

/** Standalone translation helper — reads current locale from the store */
export const t = (key: keyof TranslationKeys): string => {
  return useI18n.getState().t(key)
}

/** Standalone setter */
export const setLocale = (locale: Locale) => {
  useI18n.getState().setLocale(locale)
}
