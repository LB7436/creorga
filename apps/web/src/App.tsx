import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import InstallPrompt from '@/components/InstallPrompt'
import HelpChatbot from '@/components/HelpChatbot'
import AssistantPanel from '@/components/AssistantPanel'
import RobiOperator from '@/components/RobiOperator'
import FloatingHub from '@/components/FloatingHub'
import DailyBriefingPill from '@/components/DailyBriefingPill'
import BirthdayCelebrate from '@/components/BirthdayCelebrate'
import UniversalSearch from '@/components/UniversalSearch'
import OnboardingWizard from '@/components/OnboardingWizard'
import RequireAuth from '@/components/auth/RequireAuth'
import RequireRole from '@/components/auth/RequireRole'
import { useAuthStore } from '@/stores/authStore'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
const DemoLanding = lazy(() => import('@/pages/DemoLanding'))
const Welcome = lazy(() => import('@/pages/Welcome'))
import { useDemoMode } from '@/lib/demoMode'
import ModuleSelector from '@/pages/ModuleSelector'
import NotFound from '@/pages/NotFound'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Kitchen = lazy(() => import('@/pages/pos/Kitchen'))
import BackToStart from '@/components/BackToStart'
const RoomDesignerPage = lazy(() => import('@/pages/pos/RoomDesignerPage'))
const SettingsModules = lazy(() => import('@/pages/settings/SettingsModules'))
const SettingsEnvMode = lazy(() => import('@/pages/settings/SettingsEnvMode'))
const AIModulePage = lazy(() => import('@/pages/ai/AIModulePage'))
import EnvModeBanner from '@/components/EnvModeBanner'
const SettingsTheme = lazy(() => import('@/pages/settings/SettingsTheme'))
const SettingsLanguage = lazy(() => import('@/pages/settings/SettingsLanguage'))
const AdsAdminPage = lazy(() => import('@/pages/ads/AdsAdminPage'))
const TVDisplayPage = lazy(() => import('@/pages/ads/TVDisplayPage'))
const ProgrammationPage = lazy(() => import('@/pages/ads/ProgrammationPage'))
const MusicPage = lazy(() => import('@/pages/music/MusicPage'))
const SetupWizard = lazy(() => import('@/pages/onboarding/SetupWizard'))
const FloorVisionWizard = lazy(() => import('@/pages/setup/FloorVisionWizard'))
const AssistantPick = lazy(() => import('@/pages/setup/AssistantPick'))
const MobileLayout = lazy(() => import('@/pages/mobile/MobileLayout'))
const MobileLive = lazy(() => import('@/pages/mobile/MobileLive'))
const MobileRobi = lazy(() => import('@/pages/mobile/MobileRobi'))
const MobileAlerts = lazy(() => import('@/pages/mobile/MobileAlerts'))
const MobileWorld = lazy(() => import('@/pages/mobile/MobileWorld'))
const MobileSettings = lazy(() => import('@/pages/mobile/MobileSettings'))
const MobileCamera = lazy(() => import('@/pages/mobile/MobileCamera'))
const MobileDemoLogin = lazy(() => import('@/pages/mobile/MobileDemoLogin'))
const MobileBriefing = lazy(() => import('@/pages/mobile/MobileBriefing'))
const MobileMagicCam = lazy(() => import('@/pages/mobile/MobileMagicCam'))
const UnifiedFloorPlan = lazy(() => import('@/pages/pos/UnifiedFloorPlan'))
const GuestHome = lazy(() => import('@/pages/guest/GuestHome'))
const GuestPaidPage = lazy(() => import('@/pages/guest/GuestPaidPage'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminCompany = lazy(() => import('@/pages/admin/AdminCompany'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminCatalog = lazy(() => import('@/pages/admin/AdminCatalog'))
const AdminModules = lazy(() => import('@/pages/admin/AdminModules'))
const ClientsConfig = lazy(() => import('@/pages/clients/ClientsConfig'))

// Module Layouts
const PosLayout = lazy(() => import('@/pages/pos/PosLayout'))
const CrmLayout = lazy(() => import('@/pages/crm/CrmLayout'))
const InvoicesLayout = lazy(() => import('@/pages/invoices/InvoicesLayout'))
const InventoryLayout = lazy(() => import('@/pages/inventory/InventoryLayout'))
const HrLayout = lazy(() => import('@/pages/hr/HrLayout'))
const HaccpLayout = lazy(() => import('@/pages/haccp/HaccpLayout'))
const AccountingLayout = lazy(() => import('@/pages/accounting/AccountingLayout'))
// v4.1 — Layouts retirés (folded) : ReputationLayout (→ CrmLayout), AgendaLayout (obsolète)
// v4.1 — Nouveaux Layouts (3 fusions) :
const SalesLayout = lazy(() => import('@/pages/sales/SalesLayout'))
const AdsLayout = lazy(() => import('@/pages/ads/AdsLayout'))
const OwnerLayout = lazy(() => import('@/pages/owner/OwnerLayout'))
// (note : ReputationLayout, AgendaLayout, LicencesPage, AgendaPage imports retirés v4.1)

// QR Menu Page
const QrMenuPage = lazy(() => import('@/pages/qrmenu/QrMenuPage'))

// Formation Page
const FormationPage = lazy(() => import('@/pages/formation/FormationPage'))

// Admin module pages
const MaintenancePage = lazy(() => import('@/pages/maintenance/MaintenancePage'))
// v4.1 — LicencesPage retiré (URL /licences redirige /rgpd, page jamais affichée)
const RgpdPage = lazy(() => import('@/pages/rgpd/RgpdPage'))

// POS Pages
const FloorPlan = lazy(() => import('@/pages/pos/FloorPlan'))
const DashboardPage = lazy(() => import('@/pages/pos/DashboardPage'))

// CRM Pages
const ClientsPage = lazy(() => import('@/pages/crm/ClientsPage'))
const FidelitePage = lazy(() => import('@/pages/crm/FidelitePage'))
const PortefeuillePage = lazy(() => import('@/pages/crm/PortefeuillePage'))
const CartesPage = lazy(() => import('@/pages/crm/CartesPage'))

// Invoices Pages
const DevisPageInv = lazy(() => import('@/pages/invoices/DevisPage'))
const FacturesPage = lazy(() => import('@/pages/invoices/FacturesPage'))
const AvoirsPage = lazy(() => import('@/pages/invoices/AvoirsPage'))
const RelancesPage = lazy(() => import('@/pages/invoices/RelancesPage'))

// Reservations Pages (now under Agenda)
const CalendrierPage = lazy(() => import('@/pages/reservations/CalendrierPage'))

// Inventory Pages
const StockPage = lazy(() => import('@/pages/inventory/StockPage'))
const ReceiptOCR = lazy(() => import('@/pages/inventory/ReceiptOCR'))
const RecettesPage = lazy(() => import('@/pages/inventory/RecettesPage'))
const FournisseursPage = lazy(() => import('@/pages/inventory/FournisseursPage'))
const CommandesPage = lazy(() => import('@/pages/inventory/CommandesPage'))

// HR Pages
const PlanningPage = lazy(() => import('@/pages/hr/PlanningPage'))
const PointagesPage = lazy(() => import('@/pages/hr/PointagesPage'))
const CongesPage = lazy(() => import('@/pages/hr/CongesPage'))
const EquipePage = lazy(() => import('@/pages/hr/EquipePage'))
const HrParamsPage = lazy(() => import('@/pages/hr/ParamsPage'))

// HACCP Pages
const JourneePage = lazy(() => import('@/pages/haccp/JourneePage'))
const TemperaturesPage = lazy(() => import('@/pages/haccp/TemperaturesPage'))
const TachesPage = lazy(() => import('@/pages/haccp/TachesPage'))
const HaccpHistoriquePage = lazy(() => import('@/pages/haccp/HistoriquePage'))

// Accounting Pages
const CaissePage = lazy(() => import('@/pages/accounting/CaissePage'))
const CloturePage = lazy(() => import('@/pages/accounting/CloturePage'))
const DepensesPage = lazy(() => import('@/pages/accounting/DepensesPage'))
const TvaPage = lazy(() => import('@/pages/accounting/TvaPage'))
const RapportsPage = lazy(() => import('@/pages/accounting/RapportsPage'))

// Marketing Pages
const CampagnesPage = lazy(() => import('@/pages/marketing/CampagnesPage'))
const CodesPage = lazy(() => import('@/pages/marketing/CodesPage'))
const AudiencesPage = lazy(() => import('@/pages/marketing/AudiencesPage'))

// Reputation Pages
const AvisPage = lazy(() => import('@/pages/reputation/AvisPage'))
const ReponsesPage = lazy(() => import('@/pages/reputation/ReponsesPage'))
const ReputStatsPage = lazy(() => import('@/pages/reputation/StatsPage'))

// Sites & API Pages
const SitesPage = lazy(() => import('@/pages/sites/SitesPage'))
const ApiPage = lazy(() => import('@/pages/api/ApiPage'))
const MarketplacePage = lazy(() => import('@/pages/api/MarketplacePage'))

// New modules
const AiAssistantPage = lazy(() => import('@/pages/ai/AiAssistantPage'))
const BackupPage = lazy(() => import('@/pages/backup/BackupPage'))
const OwnerReportPage = lazy(() => import('@/pages/owner/OwnerReportPage'))
const ActiviteAuditPage = lazy(() => import('@/pages/owner/ActiviteAuditPage'))
const MacrosPage = lazy(() => import('@/pages/owner/MacrosPage'))
const DeliveryPage = lazy(() => import('@/pages/delivery/DeliveryPage'))
const ClickCollectPage = lazy(() => import('@/pages/clickcollect/ClickCollectPage'))
const CateringPage = lazy(() => import('@/pages/catering/CateringPage'))
const CentralKitchenPage = lazy(() => import('@/pages/centralkitchen/CentralKitchenPage'))
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'))
const AutoOrderPage = lazy(() => import('@/pages/autoorder/AutoOrderPage'))
const ChangelogPage = lazy(() => import('@/pages/changelog/ChangelogPage'))
const ReferralPage = lazy(() => import('@/pages/referral/ReferralPage'))
import OnboardingTour from '@/components/OnboardingTour'
import PosLockScreen from '@/components/PosLockScreen'
import { registerPush } from '@/lib/pushNotifications'

function RouteLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6',
        animation: 'creorga-route-spin 0.8s linear infinite',
      }} />
      <style>{'@keyframes creorga-route-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}

function App() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const demoActive = useDemoMode((s) => s.active)
  const demoExit = useDemoMode((s) => s.exitDemoMode)
  const demoExpiresAt = useDemoMode((s) => s.expiresAt)
  const [demoRemaining, setDemoRemaining] = useState<number>(0)
  const isGuestPortal = location.pathname === '/c' || location.pathname === '/c/paid'
  const isClientFacing = isGuestPortal || location.pathname === '/login'

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

  useEffect(() => {
    registerPush()
  }, [])

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
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/demo" element={<DemoLanding />} />
      <Route path="/c" element={<GuestHome />} />
      <Route path="/c/paid" element={<GuestPaidPage />} />

      {/* TV Display — fullscreen, no AppShell */}
      <Route path="/ads/tv" element={<TVDisplayPage />} />

      {/* Auth-only without AppShell */}
      <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
      <Route path="/setup" element={<RequireAuth><SetupWizard /></RequireAuth>} />
      <Route path="/setup/floor-vision" element={<RequireAuth><FloorVisionWizard /></RequireAuth>} />
      <Route path="/setup/assistant" element={<RequireAuth><AssistantPick /></RequireAuth>} />

      {/* Mobile demo auto-login (entry point of the APK) */}
      <Route path="/m/demo" element={<MobileDemoLogin />} />

      {/* v3.18 — Standalone module windows (no AppShell, no sidebar — just the page) */}
      {/* Used by "Nouvel onglet" buttons inside modules to open a clean fullscreen view */}
      <Route path="/standalone/planning" element={<RequireAuth><PlanningPage /></RequireAuth>} />
      <Route path="/standalone/floor" element={<RequireAuth><UnifiedFloorPlan /></RequireAuth>} />
      <Route path="/standalone/stock" element={<RequireAuth><StockPage /></RequireAuth>} />
      <Route path="/standalone/calendar" element={<RequireAuth><CalendrierPage /></RequireAuth>} />

      {/* Mobile / PWA — accessible without AppShell */}
      {/* La section mobile était la seule zone authentifiée sans garde :
          n'importe quel visiteur voyait /m (constat d'audit §2 bis). */}
      <Route path="/m" element={<RequireAuth><MobileLayout /></RequireAuth>}>
        <Route index element={<MobileLive />} />
        <Route path="briefing" element={<MobileBriefing />} />
        <Route path="magic" element={<MobileMagicCam />} />
        <Route path="robi" element={<MobileRobi />} />
        <Route path="alerts" element={<MobileAlerts />} />
        <Route path="world" element={<MobileWorld />} />
        <Route path="settings" element={<MobileSettings />} />
        <Route path="camera" element={<MobileCamera />} />
      </Route>
      <Route path="/modules" element={<RequireAuth><ModuleSelector /></RequireAuth>} />
      <Route path="/tour" element={<RequireAuth><ModuleSelector /></RequireAuth>} />
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
          {/* v4.8 — OrderPage (table « T4 » en dur, 20 produits et un panier
              inventés) et Checkout (« Sophie Keller » fictive) étaient des
              maquettes que RIEN dans l'application ne reliait : accessibles
              seulement en tapant l'URL. La prise de commande réelle est la
              caisse tactile (apps/pos) ; les URL sont conservées et menées au
              plan de salle, qui est vrai. */}
          <Route path="order/:tableId" element={<Navigate to="/pos/floor" replace />} />
          <Route path="checkout" element={<Navigate to="/pos/floor" replace />} />
          <Route path="checkout/:orderId" element={<Navigate to="/pos/floor" replace />} />
          {/* v3.18 — fusion : /pos/orders + /pos/config étaient des alias, redirige vers dashboard */}
          <Route path="orders" element={<Navigate to="/pos/dashboard" replace />} />
          <Route path="config" element={<Navigate to="/pos/dashboard" replace />} />
        </Route>

        {/* CRM, Marketing & Réputation Module — v4.1 ajout avis/reponses/reput-stats (ex /reputation) */}
        <Route path="/crm" element={<CrmLayout />}>
          <Route index element={<Navigate to="/crm/clients" replace />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="fidelite" element={<FidelitePage />} />
          <Route path="portefeuille" element={<PortefeuillePage />} />
          <Route path="cartes-cadeaux" element={<CartesPage />} />
          <Route path="campagnes" element={<CampagnesPage />} />
          <Route path="codes" element={<CodesPage />} />
          <Route path="audiences" element={<AudiencesPage />} />
          {/* v4.1 — réputation folded */}
          <Route path="avis" element={<AvisPage />} />
          <Route path="reponses" element={<ReponsesPage />} />
          <Route path="reput-stats" element={<ReputStatsPage />} />
        </Route>

        {/* Invoices Module */}
        <Route path="/invoices" element={<InvoicesLayout />}>
          <Route index element={<Navigate to="/invoices/devis" replace />} />
          <Route path="devis" element={<DevisPageInv />} />
          <Route path="factures" element={<FacturesPage />} />
          <Route path="avoirs" element={<AvoirsPage />} />
          <Route path="relances" element={<RelancesPage />} />
        </Route>

        {/* v3.18.5 — Module Agenda supprimé (fusionné dans RH planning + CRM events).
         * Anciennes URLs redirigent vers les modules pertinents. */}
        <Route path="/agenda" element={<Navigate to="/hr/planning" replace />} />
        <Route path="/agenda/*" element={<Navigate to="/hr/planning" replace />} />

        {/* Inventory Module — v3.18.5 Auto-Réappro folded + v4.1 Cuisine Centrale folded */}
        <Route path="/inventory" element={<InventoryLayout />}>
          <Route index element={<Navigate to="/inventory/stock" replace />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="recettes" element={<RecettesPage />} />
          <Route path="fournisseurs" element={<FournisseursPage />} />
          <Route path="commandes" element={<CommandesPage />} />
          <Route path="ocr" element={<ReceiptOCR />} />
          <Route path="autoorder" element={<AutoOrderPage />} />
          <Route path="cuisine-centrale" element={<CentralKitchenPage />} />
        </Route>

        {/* HR Module — v4.1 Formation folded as sub-route */}
        <Route path="/hr" element={<HrLayout />}>
          <Route index element={<Navigate to="/hr/planning" replace />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="pointages" element={<PointagesPage />} />
          <Route path="conges" element={<CongesPage />} />
          <Route path="equipe" element={<EquipePage />} />
          <Route path="parametres" element={<HrParamsPage />} />
          <Route path="formation" element={<FormationPage />} />
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

        {/* v4.1 — Formation folded dans /hr/formation, ancienne URL redirige */}
        <Route path="/formation" element={<Navigate to="/hr/formation" replace />} />

        {/* Maintenance Module — réservé propriétaire/manager (RequireRole :
            avant, le masquage n'était que visuel et l'URL directe passait) */}
        <Route path="/maintenance" element={<RequireRole roles={['owner', 'manager']}><MaintenancePage /></RequireRole>} />

        {/* v3.18.5 — Module Licences supprimé (URL legacy redirige vers RGPD) */}
        <Route path="/licences" element={<Navigate to="/rgpd" replace />} />

        {/* RGPD / Conformité Module */}
        <Route path="/rgpd" element={<RequireRole roles={['owner', 'manager']}><RgpdPage /></RequireRole>} />

        {/* Multi-établissements Module */}
        <Route path="/sites" element={<RequireRole roles={['owner', 'manager']}><SitesPage /></RequireRole>} />

        {/* API & Intégrations Module */}
        <Route path="/api" element={<RequireRole roles={['owner', 'manager']}><ApiPage /></RequireRole>} />
        {/* Hors de /api/ : le proxy Vite (vite.config.ts) capte tout /api/… et
            le renvoie au backend, qui repond 404 — la page n'etait jamais
            rendue. Cf. rapport de test §4.4, « ecran blanc ». */}
        <Route path="/integrations/marketplace" element={<MarketplacePage />} />

        {/* Assistant IA — v3.18 fusion : page unique avec sélecteur de provider local/cloud/auto */}
        {/* /ai/local et /ai/settings deviennent alias vers /ai */}
        <Route path="/ai" element={<AiAssistantPage />} />
        <Route path="/ai/local" element={<Navigate to="/ai" replace />} />
        <Route path="/ai/settings" element={<Navigate to="/ai" replace />} />

        {/* Settings — Configurateur de modules + Env modes */}
        <Route path="/settings/modules" element={<SettingsModules />} />
        <Route path="/settings/env-mode" element={<SettingsEnvMode />} />
        <Route path="/settings/theme" element={<SettingsTheme />} />
        <Route path="/settings/language" element={<SettingsLanguage />} />

        {/* v4.1 — Ads & Ambiance Module (Régie pub TV + Musique fusionnés) */}
        <Route path="/ads" element={<AdsLayout />}>
          <Route index element={<Navigate to="/ads/regie" replace />} />
          <Route path="regie" element={<AdsAdminPage />} />
          <Route path="programmation" element={<ProgrammationPage />} />
          <Route path="music" element={<MusicPage />} />
        </Route>

        {/* v4.1 — Music folded sous /ads/music, ancienne URL redirige */}
        <Route path="/music" element={<Navigate to="/ads/music" replace />} />

        {/* Sauvegarde & Sécurité Module */}
        <Route path="/backup" element={<RequireRole roles={['owner', 'manager']}><BackupPage /></RequireRole>} />

        {/* v4.1 — Owner Layout : Rapport + Abonnement + Parrainage fusionnés */}
        <Route path="/owner" element={<RequireRole roles={['owner', 'manager']}><OwnerLayout /></RequireRole>}>
          <Route index element={<Navigate to="/owner/rapport" replace />} />
          <Route path="rapport" element={<OwnerReportPage />} />
          <Route path="abonnement" element={<BillingPage />} />
          <Route path="parrainage" element={<ReferralPage />} />
          <Route path="activite" element={<ActiviteAuditPage />} />
          <Route path="macros" element={<MacrosPage />} />
        </Route>

        {/* v4.1 — Sales Layout : Livraison + Click&Collect + Traiteur fusionnés */}
        <Route path="/sales" element={<SalesLayout />}>
          <Route index element={<Navigate to="/sales/delivery" replace />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="clickcollect" element={<ClickCollectPage />} />
          <Route path="catering" element={<CateringPage />} />
        </Route>

        {/* v4.1 — Anciennes URLs standalone redirigent vers les nouveaux Layouts */}
        <Route path="/delivery" element={<Navigate to="/sales/delivery" replace />} />
        <Route path="/clickcollect" element={<Navigate to="/sales/clickcollect" replace />} />
        <Route path="/catering" element={<Navigate to="/sales/catering" replace />} />
        <Route path="/centralkitchen" element={<Navigate to="/inventory/cuisine-centrale" replace />} />
        <Route path="/billing" element={<Navigate to="/owner/abonnement" replace />} />

        {/* v3.18.5 — Auto-Réapprovisionnement fusionné dans Inventaire.
         * Ancienne URL redirige vers /inventory/autoorder. */}
        <Route path="/autoorder" element={<Navigate to="/inventory/autoorder" replace />} />

        {/* v3.18.5 — Modules Durabilité / Communauté / Status supprimés */}
        <Route path="/sustainability" element={<Navigate to="/" replace />} />
        <Route path="/community" element={<Navigate to="/" replace />} />
        <Route path="/status" element={<Navigate to="/" replace />} />

        {/* Changelog — accessible via URL mais hors moduleStore (v4.1) */}
        <Route path="/changelog" element={<ChangelogPage />} />

        {/* v4.1 — Referral folded sous /owner/parrainage, ancienne URL redirige */}
        <Route path="/referral" element={<Navigate to="/owner/parrainage" replace />} />

        {/* v4.1 — Reputation folded sous /crm/{avis,reponses,reput-stats}, redirects rétro-compat */}
        <Route path="/reputation" element={<Navigate to="/crm/avis" replace />} />
        <Route path="/reputation/avis" element={<Navigate to="/crm/avis" replace />} />
        <Route path="/reputation/reponses" element={<Navigate to="/crm/reponses" replace />} />
        <Route path="/reputation/statistiques" element={<Navigate to="/crm/reput-stats" replace />} />

      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>

    {/* Bannière MODE DÉMO */}
    {demoActive && !isClientFacing && location.pathname !== '/demo' && (
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
    {!isClientFacing && <BackToStart />}
    <InstallPrompt />
    {!isClientFacing && <HelpChatbot />}
    {!isClientFacing && <UniversalSearch />}
    {!isClientFacing && <OnboardingTour />}
    {!isClientFacing && <PosLockScreen active={location.pathname.startsWith('/pos')} />}
    {!isClientFacing && <DailyBriefingPill />}
    {/* Lanceur unique : assistant + centre d'aide + actions rapides */}
    {!isClientFacing && <FloatingHub />}
    {!isClientFacing && <AssistantPanel />}
    {!isClientFacing && <RobiOperator />}
    <BirthdayCelebrate />
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
