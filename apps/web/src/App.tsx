import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import InstallPrompt from '@/components/InstallPrompt'
import HelpChatbot from '@/components/HelpChatbot'
import AssistantPanel from '@/components/AssistantPanel'
import FloatingHub from '@/components/FloatingHub'
import DailyBriefingPill from '@/components/DailyBriefingPill'
import UniversalSearch from '@/components/UniversalSearch'
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
import FeatureUnavailable from '@/pages/FeatureUnavailable'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Kitchen = lazy(() => import('@/pages/pos/Kitchen'))
import BackToStart from '@/components/BackToStart'
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
const MobileDemoLogin = lazy(() => import('@/pages/mobile/MobileDemoLogin'))
const MobileBriefing = lazy(() => import('@/pages/mobile/MobileBriefing'))
const UnifiedFloorPlan = lazy(() => import('@/pages/pos/UnifiedFloorPlan'))
const GuestHome = lazy(() => import('@/pages/guest/GuestHome'))
const GuestPaidPage = lazy(() => import('@/pages/guest/GuestPaidPage'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminCompany = lazy(() => import('@/pages/admin/AdminCompany'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminCatalog = lazy(() => import('@/pages/admin/AdminCatalog'))
const ClientsConfig = lazy(() => import('@/pages/clients/ClientsConfig'))

// Module Layouts
const PosLayout = lazy(() => import('@/pages/pos/PosLayout'))
const CrmLayout = lazy(() => import('@/pages/crm/CrmLayout'))
const InvoicesLayout = lazy(() => import('@/pages/invoices/InvoicesLayout'))
const HrLayout = lazy(() => import('@/pages/hr/HrLayout'))
const InventoryLayout = lazy(() => import('@/pages/inventory/InventoryLayout'))
const HaccpLayout = lazy(() => import('@/pages/haccp/HaccpLayout'))
const AccountingLayout = lazy(() => import('@/pages/accounting/AccountingLayout'))
// v4.1 — Layouts retirés (folded) : ReputationLayout (→ CrmLayout), AgendaLayout (obsolète)
const AdsLayout = lazy(() => import('@/pages/ads/AdsLayout'))
const OwnerLayout = lazy(() => import('@/pages/owner/OwnerLayout'))
// (note : ReputationLayout, AgendaLayout, LicencesPage, AgendaPage imports retirés v4.1)

// QR Menu Page
const QrMenuPage = lazy(() => import('@/pages/qrmenu/QrMenuPage'))

// POS Pages
const DashboardPage = lazy(() => import('@/pages/pos/DashboardPage'))

// CRM Pages
const ClientsPage = lazy(() => import('@/pages/crm/ClientsPage'))
const GiftCardsPage = lazy(() => import('@/pages/crm/GiftCardsPage'))
const MarketingDataPage = lazy(() => import('@/pages/crm/MarketingDataPage'))
const ReputationDataPage = lazy(() => import('@/pages/crm/ReputationDataPage'))

// Invoices Pages
const DevisPageInv = lazy(() => import('@/pages/invoices/DevisPage'))
const FacturesPage = lazy(() => import('@/pages/invoices/FacturesPage'))

// HR Pages
const PlanningPage = lazy(() => import('@/pages/hr/PlanningPage'))
const EquipePage = lazy(() => import('@/pages/hr/EquipePage'))
const HrTimePage = lazy(() => import('@/pages/hr/HrTimePage'))

// Inventory & HACCP Pages — vues reliées aux API Prisma.
const InventoryOperationsPage = lazy(() => import('@/pages/inventory/InventoryOperationsPage'))
const HaccpOperationsPage = lazy(() => import('@/pages/haccp/HaccpOperationsPage'))

// Accounting Pages
const CaissePage = lazy(() => import('@/pages/accounting/CaissePage'))
const CloturePage = lazy(() => import('@/pages/accounting/CloturePage'))
const DepensesPage = lazy(() => import('@/pages/accounting/DepensesPage'))
const TvaPage = lazy(() => import('@/pages/accounting/TvaPage'))
const RapportsPage = lazy(() => import('@/pages/accounting/RapportsPage'))

// New modules
const AiAssistantPage = lazy(() => import('@/pages/ai/AiAssistantPage'))
const ActiviteAuditPage = lazy(() => import('@/pages/owner/ActiviteAuditPage'))
const MacrosPage = lazy(() => import('@/pages/owner/MacrosPage'))
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'))
const ChangelogPage = lazy(() => import('@/pages/changelog/ChangelogPage'))
import OnboardingTour from '@/components/OnboardingTour'
import PosLockScreen from '@/components/PosLockScreen'
import { registerPush } from '@/lib/pushNotifications'
import { isOnboardingComplete } from '@/lib/onboarding'

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
  const companyId = useAuthStore((s) => s.companyId)
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
      const done = isOnboardingComplete(companyId)
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
  }, [user, companyId, location.pathname])

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
      <Route path="/standalone/stock" element={<RequireAuth><InventoryOperationsPage view="stock" /></RequireAuth>} />
      <Route path="/standalone/calendar" element={<RequireAuth><FeatureUnavailable title="Calendrier des réservations" availableNow="le planning de l'équipe." backPath="/hr/planning" backLabel="Ouvrir le planning" /></RequireAuth>} />

      {/* Mobile / PWA — accessible without AppShell */}
      {/* La section mobile était la seule zone authentifiée sans garde :
          n'importe quel visiteur voyait /m (constat d'audit §2 bis). */}
      <Route path="/m" element={<RequireAuth><MobileLayout /></RequireAuth>}>
        <Route index element={<MobileLive />} />
        <Route path="briefing" element={<MobileBriefing />} />
        <Route path="magic" element={<FeatureUnavailable title="Photo magique et inventaire" availableNow="le tableau de bord mobile, le planning et l'assistant." backPath="/m" backLabel="Retour au tableau de bord mobile" />} />
        <Route path="robi" element={<MobileRobi />} />
        <Route path="alerts" element={<MobileAlerts />} />
        <Route path="world" element={<MobileWorld />} />
        <Route path="settings" element={<MobileSettings />} />
        <Route path="camera" element={<FeatureUnavailable title="Scanner de tickets" availableNow="le tableau de bord mobile, le planning et l'assistant." backPath="/m" backLabel="Retour au tableau de bord mobile" />} />
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
        <Route path="modules" element={<Navigate to="/settings/modules" replace />} />
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
          {/* Les anciennes vues floor-classic/design persistaient uniquement dans
              localStorage et pouvaient diverger du plan partagé. Toutes les entrées
              convergent désormais vers le plan de salle serveur. */}
          <Route path="floor-classic" element={<Navigate to="/pos/floor" replace />} />
          <Route path="design" element={<Navigate to="/pos/floor" replace />} />
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
          <Route path="fidelite" element={<Navigate to="/crm/clients" replace />} />
          <Route path="portefeuille" element={<Navigate to="/crm/clients" replace />} />
          <Route path="cartes-cadeaux" element={<GiftCardsPage />} />
          <Route path="campagnes" element={<MarketingDataPage view="campaigns" />} />
          <Route path="codes" element={<MarketingDataPage view="codes" />} />
          <Route path="audiences" element={<FeatureUnavailable title="Audiences marketing" availableNow="le fichier clients et ses informations enregistrées." backPath="/crm/clients" backLabel="Retour aux clients" />} />
          <Route path="avis" element={<ReputationDataPage view="reviews" />} />
          <Route path="reponses" element={<ReputationDataPage view="replies" />} />
          <Route path="reput-stats" element={<ReputationDataPage view="stats" />} />
        </Route>

        {/* Invoices Module */}
        <Route path="/invoices" element={<InvoicesLayout />}>
          <Route index element={<Navigate to="/invoices/devis" replace />} />
          <Route path="devis" element={<DevisPageInv />} />
          <Route path="factures" element={<FacturesPage />} />
          <Route path="avoirs" element={<FeatureUnavailable title="Avoirs" availableNow="la création de devis et de factures sauvegardés." backPath="/invoices/factures" backLabel="Retour aux factures" />} />
          <Route path="relances" element={<FeatureUnavailable title="Relances automatiques" availableNow="la création de devis et de factures sauvegardés." backPath="/invoices/factures" backLabel="Retour aux factures" />} />
        </Route>

        {/* v3.18.5 — Module Agenda supprimé (fusionné dans RH planning + CRM events).
         * Anciennes URLs redirigent vers les modules pertinents. */}
        <Route path="/agenda" element={<Navigate to="/hr/planning" replace />} />
        <Route path="/agenda/*" element={<Navigate to="/hr/planning" replace />} />

        <Route path="/inventory" element={<InventoryLayout />}>
          <Route index element={<Navigate to="/inventory/stock" replace />} />
          <Route path="stock" element={<InventoryOperationsPage view="stock" />} />
          <Route path="fournisseurs" element={<InventoryOperationsPage view="suppliers" />} />
          <Route path="commandes" element={<InventoryOperationsPage view="orders" />} />
        </Route>

        {/* HR Module — v4.1 Formation folded as sub-route */}
        <Route path="/hr" element={<HrLayout />}>
          <Route index element={<Navigate to="/hr/planning" replace />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="equipe" element={<EquipePage />} />
          <Route path="pointages" element={<HrTimePage view="punches" />} />
          <Route path="conges" element={<HrTimePage view="leaves" />} />
          <Route path="parametres" element={<FeatureUnavailable title="Paramètres RH avancés" availableNow="le planning et la gestion de l'équipe." backPath="/hr/planning" backLabel="Retour au planning" />} />
          <Route path="formation" element={<FeatureUnavailable title="Formation de l'équipe" availableNow="le planning et la gestion de l'équipe." backPath="/hr/planning" backLabel="Retour au planning" />} />
        </Route>

        <Route path="/haccp" element={<HaccpLayout />}>
          <Route index element={<Navigate to="/haccp/journee" replace />} />
          <Route path="journee" element={<HaccpOperationsPage view="journee" />} />
          <Route path="temperatures" element={<HaccpOperationsPage view="temperatures" />} />
          <Route path="taches" element={<HaccpOperationsPage view="taches" />} />
          <Route path="historique" element={<HaccpOperationsPage view="historique" />} />
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

        <Route path="/maintenance/*" element={<RequireRole roles={['owner', 'manager']}><FeatureUnavailable title="Maintenance" /></RequireRole>} />

        {/* v3.18.5 — Module Licences supprimé (URL legacy redirige vers RGPD) */}
        <Route path="/licences" element={<Navigate to="/rgpd" replace />} />

        <Route path="/rgpd/*" element={<RequireRole roles={['owner', 'manager']}><FeatureUnavailable title="RGPD et conformité" /></RequireRole>} />

        <Route path="/sites/*" element={<RequireRole roles={['owner', 'manager']}><FeatureUnavailable title="Multi-établissements" /></RequireRole>} />

        <Route path="/api" element={<RequireRole roles={['owner', 'manager']}><FeatureUnavailable title="API et intégrations" /></RequireRole>} />
        <Route path="/integrations/marketplace" element={<FeatureUnavailable title="Marché des intégrations" />} />

        {/* Assistant réel : /ai ouvre Robi ; /ai/local configure Ollama local. */}
        <Route path="/ai" element={<AiAssistantPage />} />
        <Route path="/ai/local" element={<AIModulePage />} />
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
        <Route path="/backup" element={<RequireRole roles={['owner', 'manager']}><FeatureUnavailable title="Sauvegardes et restauration" availableNow="les données opérationnelles enregistrées dans votre entreprise." backPath="/modules" backLabel="Retour aux modules" /></RequireRole>} />

        <Route path="/owner" element={<RequireRole roles={['owner', 'manager']}><OwnerLayout /></RequireRole>}>
          <Route index element={<Navigate to="/owner/abonnement" replace />} />
          <Route path="abonnement" element={<BillingPage />} />
          <Route path="activite" element={<ActiviteAuditPage />} />
          <Route path="macros" element={<MacrosPage />} />
          <Route path="rapport" element={<FeatureUnavailable title="Rapport stratégique" availableNow="l'abonnement, l'activité d'audit et les macros sauvegardées." backPath="/owner/activite" backLabel="Voir l'activité" />} />
          <Route path="parrainage" element={<FeatureUnavailable title="Programme de parrainage" availableNow="l'abonnement, l'activité d'audit et les macros sauvegardées." backPath="/owner/abonnement" backLabel="Voir l'abonnement" />} />
        </Route>

        <Route path="/sales/*" element={<FeatureUnavailable title="Ventes externes" />} />

        {/* v4.1 — Anciennes URLs standalone redirigent vers les nouveaux Layouts */}
        <Route path="/delivery" element={<Navigate to="/sales/delivery" replace />} />
        <Route path="/clickcollect" element={<Navigate to="/sales/clickcollect" replace />} />
        <Route path="/catering" element={<Navigate to="/sales/catering" replace />} />
        <Route path="/centralkitchen" element={<Navigate to="/inventory/cuisine-centrale" replace />} />
        <Route path="/billing" element={<Navigate to="/owner/abonnement" replace />} />
        <Route path="/billing/success" element={<Navigate to="/owner/abonnement" replace />} />

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
    </>
  )
}

export default App
