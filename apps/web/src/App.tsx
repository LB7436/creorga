import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import InstallPrompt from '@/components/InstallPrompt'
import OnboardingWizard from '@/components/OnboardingWizard'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuthStore } from '@/stores/authStore'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Welcome from '@/pages/Welcome'
import ModuleSelector from '@/pages/ModuleSelector'
import NotFound from '@/pages/NotFound'
import Dashboard from '@/pages/Dashboard'
import Kitchen from '@/pages/pos/Kitchen'
import GuestHome from '@/pages/guest/GuestHome'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminCompany from '@/pages/admin/AdminCompany'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminCatalog from '@/pages/admin/AdminCatalog'
import AdminModules from '@/pages/admin/AdminModules'
import ClientsConfig from '@/pages/clients/ClientsConfig'

// Module Layouts
import PosLayout from '@/pages/pos/PosLayout'
import CrmLayout from '@/pages/crm/CrmLayout'
import InvoicesLayout from '@/pages/invoices/InvoicesLayout'
import InventoryLayout from '@/pages/inventory/InventoryLayout'
import HrLayout from '@/pages/hr/HrLayout'
import HaccpLayout from '@/pages/haccp/HaccpLayout'
import AccountingLayout from '@/pages/accounting/AccountingLayout'
import ReputationLayout from '@/pages/reputation/ReputationLayout'
import AgendaLayout from '@/pages/agenda/AgendaLayout'

// QR Menu Page
import QrMenuPage from '@/pages/qrmenu/QrMenuPage'

// Formation Page
import FormationPage from '@/pages/formation/FormationPage'

// Admin module pages
import MaintenancePage from '@/pages/maintenance/MaintenancePage'
import LicencesPage from '@/pages/licences/LicencesPage'
import RgpdPage from '@/pages/rgpd/RgpdPage'

// POS Pages
import FloorPlan from '@/pages/pos/FloorPlan'
import OrderPage from '@/pages/pos/OrderPage'
import Checkout from '@/pages/pos/Checkout'
import DashboardPage from '@/pages/pos/DashboardPage'

// CRM Pages
import ClientsPage from '@/pages/crm/ClientsPage'
import FidelitePage from '@/pages/crm/FidelitePage'
import PortefeuillePage from '@/pages/crm/PortefeuillePage'
import CartesPage from '@/pages/crm/CartesPage'

// Invoices Pages
import DevisPageInv from '@/pages/invoices/DevisPage'
import FacturesPage from '@/pages/invoices/FacturesPage'
import AvoirsPage from '@/pages/invoices/AvoirsPage'
import RelancesPage from '@/pages/invoices/RelancesPage'

// Reservations Pages (now under Agenda)
import CalendrierPage from '@/pages/reservations/CalendrierPage'
import ReservListePage from '@/pages/reservations/ListePage'
import ReservConfigPage from '@/pages/reservations/ConfigPage'

// Inventory Pages
import StockPage from '@/pages/inventory/StockPage'
import RecettesPage from '@/pages/inventory/RecettesPage'
import FournisseursPage from '@/pages/inventory/FournisseursPage'
import CommandesPage from '@/pages/inventory/CommandesPage'

// HR Pages
import PlanningPage from '@/pages/hr/PlanningPage'
import PointagesPage from '@/pages/hr/PointagesPage'
import CongesPage from '@/pages/hr/CongesPage'
import EquipePage from '@/pages/hr/EquipePage'
import HrParamsPage from '@/pages/hr/ParamsPage'

// HACCP Pages
import JourneePage from '@/pages/haccp/JourneePage'
import TemperaturesPage from '@/pages/haccp/TemperaturesPage'
import TachesPage from '@/pages/haccp/TachesPage'
import HaccpHistoriquePage from '@/pages/haccp/HistoriquePage'

// Accounting Pages
import CaissePage from '@/pages/accounting/CaissePage'
import CloturePage from '@/pages/accounting/CloturePage'
import DepensesPage from '@/pages/accounting/DepensesPage'
import TvaPage from '@/pages/accounting/TvaPage'
import RapportsPage from '@/pages/accounting/RapportsPage'

// Marketing Pages
import CampagnesPage from '@/pages/marketing/CampagnesPage'
import CodesPage from '@/pages/marketing/CodesPage'
import AudiencesPage from '@/pages/marketing/AudiencesPage'

// Reputation Pages
import AvisPage from '@/pages/reputation/AvisPage'
import ReponsesPage from '@/pages/reputation/ReponsesPage'
import ReputStatsPage from '@/pages/reputation/StatsPage'

// Events Pages
import EventsDevisPage from '@/pages/events/DevisPage'
import AgendaPage from '@/pages/events/AgendaPage'
import ClientsB2BPage from '@/pages/events/ClientsB2BPage'

// Sites & API Pages
import SitesPage from '@/pages/sites/SitesPage'
import ApiPage from '@/pages/api/ApiPage'

// New modules
import AiAssistantPage from '@/pages/ai/AiAssistantPage'
import BackupPage from '@/pages/backup/BackupPage'
import OwnerReportPage from '@/pages/owner/OwnerReportPage'
import DeliveryPage from '@/pages/delivery/DeliveryPage'
import ClickCollectPage from '@/pages/clickcollect/ClickCollectPage'
import CateringPage from '@/pages/catering/CateringPage'
import CentralKitchenPage from '@/pages/centralkitchen/CentralKitchenPage'

function App() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && location.pathname !== '/login') {
      const done = localStorage.getItem('creorga-onboarded')
      if (!done) setShowOnboarding(true)
    }
  }, [user, location.pathname])

  return (
    <>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/c" element={<GuestHome />} />

      {/* Auth-only without AppShell */}
      <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
      <Route path="/modules" element={<RequireAuth><ModuleSelector /></RequireAuth>} />
      <Route path="/pos/kitchen" element={<RequireAuth><Kitchen /></RequireAuth>} />
      <Route path="/qrmenu" element={<RequireAuth><QrMenuPage /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/admin/company" replace />} />
        <Route path="company" element={<AdminCompany />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="catalog" element={<AdminCatalog />} />
        <Route path="modules" element={<AdminModules />} />
      </Route>

      {/* Clients */}
      <Route path="/clients" element={<RequireAuth><ClientsConfig /></RequireAuth>} />

      {/* Dashboard — standalone (not inside AppShell) */}
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />

      {/* AppShell wraps all module routes */}
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>

        {/* POS Module */}
        <Route path="/pos" element={<PosLayout />}>
          <Route index element={<Navigate to="/pos/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="floor" element={<FloorPlan />} />
          <Route path="order/:tableId" element={<OrderPage />} />
          <Route path="checkout/:orderId" element={<Checkout />} />
          <Route path="orders" element={<DashboardPage />} />
          <Route path="config" element={<DashboardPage />} />
        </Route>

        {/* CRM & Marketing Module */}
        <Route path="/crm" element={<CrmLayout />}>
          <Route index element={<Navigate to="/crm/clients" replace />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="fidelite" element={<FidelitePage />} />
          <Route path="portefeuille" element={<PortefeuillePage />} />
          <Route path="cartes-cadeaux" element={<CartesPage />} />
          <Route path="campagnes" element={<CampagnesPage />} />
          <Route path="codes" element={<CodesPage />} />
          <Route path="audiences" element={<AudiencesPage />} />
        </Route>

        {/* Invoices Module */}
        <Route path="/invoices" element={<InvoicesLayout />}>
          <Route index element={<Navigate to="/invoices/devis" replace />} />
          <Route path="devis" element={<DevisPageInv />} />
          <Route path="factures" element={<FacturesPage />} />
          <Route path="avoirs" element={<AvoirsPage />} />
          <Route path="relances" element={<RelancesPage />} />
        </Route>

        {/* Agenda & Calendrier Module (merged Events + Reservations) */}
        <Route path="/agenda" element={<AgendaLayout />}>
          <Route index element={<Navigate to="/agenda/calendrier" replace />} />
          <Route path="calendrier" element={<CalendrierPage />} />
          <Route path="planning" element={<AgendaPage />} />
          <Route path="devis" element={<EventsDevisPage />} />
          <Route path="clients" element={<ClientsB2BPage />} />
          <Route path="liste" element={<ReservListePage />} />
          <Route path="config" element={<ReservConfigPage />} />
        </Route>

        {/* Inventory Module */}
        <Route path="/inventory" element={<InventoryLayout />}>
          <Route index element={<Navigate to="/inventory/stock" replace />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="recettes" element={<RecettesPage />} />
          <Route path="fournisseurs" element={<FournisseursPage />} />
          <Route path="commandes" element={<CommandesPage />} />
        </Route>

        {/* HR Module */}
        <Route path="/hr" element={<HrLayout />}>
          <Route index element={<Navigate to="/hr/planning" replace />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="pointages" element={<PointagesPage />} />
          <Route path="conges" element={<CongesPage />} />
          <Route path="equipe" element={<EquipePage />} />
          <Route path="parametres" element={<HrParamsPage />} />
        </Route>

        {/* HACCP Module */}
        <Route path="/haccp" element={<HaccpLayout />}>
          <Route index element={<Navigate to="/haccp/journee" replace />} />
          <Route path="journee" element={<JourneePage />} />
          <Route path="temperatures" element={<TemperaturesPage />} />
          <Route path="taches" element={<TachesPage />} />
          <Route path="historique" element={<HaccpHistoriquePage />} />
        </Route>

        {/* Accounting Module */}
        <Route path="/accounting" element={<AccountingLayout />}>
          <Route index element={<Navigate to="/accounting/caisse" replace />} />
          <Route path="caisse" element={<CaissePage />} />
          <Route path="cloture" element={<CloturePage />} />
          <Route path="depenses" element={<DepensesPage />} />
          <Route path="tva" element={<TvaPage />} />
          <Route path="rapports" element={<RapportsPage />} />
        </Route>

        {/* Formation Module */}
        <Route path="/formation" element={<FormationPage />} />

        {/* Maintenance Module */}
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* Licences & Assurances Module */}
        <Route path="/licences" element={<LicencesPage />} />

        {/* RGPD / Conformité Module */}
        <Route path="/rgpd" element={<RgpdPage />} />

        {/* Multi-établissements Module */}
        <Route path="/sites" element={<SitesPage />} />

        {/* API & Intégrations Module */}
        <Route path="/api" element={<ApiPage />} />

        {/* Assistant IA Module */}
        <Route path="/ai" element={<AiAssistantPage />} />

        {/* Sauvegarde & Sécurité Module */}
        <Route path="/backup" element={<BackupPage />} />

        {/* Rapport Patron Module */}
        <Route path="/owner" element={<OwnerReportPage />} />

        {/* Livraison & Delivery Module */}
        <Route path="/delivery" element={<DeliveryPage />} />

        {/* Click & Collect Module */}
        <Route path="/clickcollect" element={<ClickCollectPage />} />

        {/* Traiteur Module */}
        <Route path="/catering" element={<CateringPage />} />

        {/* Cuisine Centrale Module */}
        <Route path="/centralkitchen" element={<CentralKitchenPage />} />

        {/* Reputation Module */}
        <Route path="/reputation" element={<ReputationLayout />}>
          <Route index element={<Navigate to="/reputation/avis" replace />} />
          <Route path="avis" element={<AvisPage />} />
          <Route path="reponses" element={<ReponsesPage />} />
          <Route path="statistiques" element={<ReputStatsPage />} />
        </Route>

      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    <InstallPrompt />
    {showOnboarding && (
      <OnboardingWizard
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    )}
    </>
  )
}

export default App
