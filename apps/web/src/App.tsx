import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import InstallPrompt from '@/components/InstallPrompt'
import OnboardingWizard from '@/components/OnboardingWizard'
import RequireAuth from '@/components/auth/RequireAuth'
import { useAuthStore } from '@/stores/authStore'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import DemoLanding from '@/pages/DemoLanding'
import Welcome from '@/pages/Welcome'
import { useDemoMode } from '@/lib/demoMode'
import ModuleSelector from '@/pages/ModuleSelector'
import NotFound from '@/pages/NotFound'
import Dashboard from '@/pages/Dashboard'
import Kitchen from '@/pages/pos/Kitchen'
import BackToStart from '@/components/BackToStart'
import RoomDesignerPage from '@/pages/pos/RoomDesignerPage'
import SettingsModules from '@/pages/settings/SettingsModules'
import SettingsEnvMode from '@/pages/settings/SettingsEnvMode'
import AIModulePage from '@/pages/ai/AIModulePage'
import EnvModeBanner from '@/components/EnvModeBanner'
import SettingsTheme from '@/pages/settings/SettingsTheme'
import SettingsLanguage from '@/pages/settings/SettingsLanguage'
import AdsAdminPage from '@/pages/ads/AdsAdminPage'
import TVDisplayPage from '@/pages/ads/TVDisplayPage'
import MusicPage from '@/pages/music/MusicPage'
import SetupWizard from '@/pages/onboarding/SetupWizard'
import UnifiedFloorPlan from '@/pages/pos/UnifiedFloorPlan'
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
import ReceiptOCR from '@/pages/inventory/ReceiptOCR'
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
import BillingPage from '@/pages/billing/BillingPage'
import AutoOrderPage from '@/pages/autoorder/AutoOrderPage'
import SustainabilityPage from '@/pages/sustainability/SustainabilityPage'
import CommunityPage from '@/pages/community/CommunityPage'
import StatusPage from '@/pages/status/StatusPage'
import ChangelogPage from '@/pages/changelog/ChangelogPage'
import ReferralPage from '@/pages/referral/ReferralPage'

function App() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const demoActive = useDemoMode((s) => s.active)
  const demoExit = useDemoMode((s) => s.exitDemoMode)
  const demoExpiresAt = useDemoMode((s) => s.expiresAt)
  const [demoRemaining, setDemoRemaining] = useState<number>(0)

  useEffect(() => {
    if (!demoActive || !demoExpiresAt) return
    const tick = () => {
      const left = Math.max(0, demoExpiresAt - Date.now())
      setDemoRemaining(left)
      if (left <= 0) demoExit()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [demoActive, demoExpiresAt, demoExit])

  const demoMinutes = Math.floor(demoRemaining / 60000)
  const demoSeconds = Math.floor((demoRemaining % 60000) / 1000)

  useEffect(() => {
    if (user && location.pathname !== '/login' && location.pathname !== '/setup' && location.pathname !== '/demo') {
      const done = localStorage.getItem('creorga-onboarded')
      if (!done) {
        // Full setup wizard on first boot — has floor plan editor + Ollama step
        if (location.pathname === '/' || location.pathname === '/modules') {
          // Nav via window to avoid loops; the Routes will pick up
          if (!window.location.pathname.startsWith('/setup')) {
            window.location.href = '/setup'
          }
        }
      }
    }
  }, [user, location.pathname])

  return (
    <>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/demo" element={<DemoLanding />} />
      <Route path="/c" element={<GuestHome />} />

      {/* TV Display — fullscreen, no AppShell */}
      <Route path="/ads/tv" element={<TVDisplayPage />} />

      {/* Auth-only without AppShell */}
      <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
      <Route path="/setup" element={<RequireAuth><SetupWizard /></RequireAuth>} />
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
          <Route path="floor" element={<UnifiedFloorPlan />} />
          <Route path="floor-classic" element={<FloorPlan />} />
          <Route path="design" element={<RoomDesignerPage />} />
          <Route path="order/:tableId" element={<OrderPage />} />
          <Route path="checkout" element={<Navigate to="/pos/floor" replace />} />
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
          <Route path="ocr" element={<ReceiptOCR />} />
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

        {/* Assistant IA Module (cloud) */}
        <Route path="/ai" element={<AiAssistantPage />} />
        {/* Assistant IA Local (Gemma/Ollama pour Raspberry Pi 5) */}
        <Route path="/ai/local" element={<AIModulePage />} />

        {/* Settings — Configurateur de modules + Env modes */}
        <Route path="/settings/modules" element={<SettingsModules />} />
        <Route path="/settings/env-mode" element={<SettingsEnvMode />} />
        <Route path="/settings/theme" element={<SettingsTheme />} />
        <Route path="/settings/language" element={<SettingsLanguage />} />

        {/* Régie publicitaire TV (admin) */}
        <Route path="/ads" element={<AdsAdminPage />} />

        {/* Music & Radio module */}
        <Route path="/music" element={<MusicPage />} />

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

        {/* Billing & Subscription Module */}
        <Route path="/billing" element={<BillingPage />} />

        {/* Auto-Réapprovisionnement IA Module */}
        <Route path="/autoorder" element={<AutoOrderPage />} />

        {/* Durabilité & Impact Environnemental Module */}
        <Route path="/sustainability" element={<SustainabilityPage />} />

        {/* Communauté Creorga Module */}
        <Route path="/community" element={<CommunityPage />} />

        {/* Status Page */}
        <Route path="/status" element={<StatusPage />} />

        {/* Changelog */}
        <Route path="/changelog" element={<ChangelogPage />} />

        {/* Referral Program */}
        <Route path="/referral" element={<ReferralPage />} />

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

    {/* Bannière MODE DÉMO */}
    {demoActive && location.pathname !== '/demo' && (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #F59E0B 0%, #F97316 100%)',
            color: '#fff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span>🎬 MODE DÉMO · Les données se réinitialisent toutes les 24h</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              ⏱ Expire dans {demoMinutes}:{String(demoSeconds).padStart(2, '0')}
            </span>
            <a
              href="/login"
              style={{
                background: '#fff',
                color: '#B45309',
                padding: '4px 12px',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Créer un vrai compte
            </a>
            <button
              onClick={() => demoExit()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Quitter
            </button>
          </span>
        </div>
        {/* Watermark DÉMO subtil */}
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 9998,
            padding: '6px 12px',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#B45309',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1px',
            pointerEvents: 'none',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          DÉMO
        </div>
      </>
    )}

    <EnvModeBanner />
    <BackToStart />
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
