# Dark Mode Migration Report

**2026-04-26T15:02:37.856Z**

## Résumé

- Stratégie : **CSS Overlay** (zéro modification de composant)
- Fichier généré : `apps/web/src/styles/dark-overlay.css`
- Activation : `document.documentElement.setAttribute('data-theme-mode', 'dark')`

## Fichiers contenant des fonds blancs (102/180)

| Fichier | Occurrences |
|---|---|
| `apps\web\src\pages\crm\CartesPage.tsx` | 34 |
| `apps\web\src\pages\marketing\AudiencesPage.tsx` | 29 |
| `apps\web\src\pages\crm\ClientsPage.tsx` | 28 |
| `apps\web\src\pages\reputation\ReponsesPage.tsx` | 25 |
| `apps\web\src\pages\api\ApiPage.tsx` | 23 |
| `apps\web\src\pages\crm\PortefeuillePage.tsx` | 23 |
| `apps\web\src\pages\sites\SitesPage.tsx` | 21 |
| `apps\web\src\pages\marketing\CampagnesPage.tsx` | 19 |
| `apps\web\src\pages\events\AgendaPage.tsx` | 16 |
| `apps\web\src\pages\events\DevisPage.tsx` | 15 |
| `apps\web\src\pages\qrmenu\QrMenuPage.tsx` | 15 |
| `apps\web\src\pages\delivery\DeliveryPage.tsx` | 14 |
| `apps\web\src\pages\clickcollect\ClickCollectPage.tsx` | 13 |
| `apps\web\src\pages\reputation\StatsPage.tsx` | 13 |
| `apps\web\src\pages\crm\FidelitePage.tsx` | 12 |
| `apps\web\src\pages\events\ClientsB2BPage.tsx` | 12 |
| `apps\web\src\pages\hr\CongesPage.tsx` | 12 |
| `apps\web\src\pages\hr\PointagesPage.tsx` | 12 |
| `apps\web\src\pages\invoices\DevisPage.tsx` | 12 |
| `apps\web\src\pages\invoices\FacturesPage.tsx` | 11 |
| `apps\web\src\pages\accounting\DepensesPage.tsx` | 10 |
| `apps\web\src\pages\haccp\TachesPage.tsx` | 10 |
| `apps\web\src\pages\inventory\StockPage.tsx` | 10 |
| `apps\web\src\pages\pos\Checkout.tsx` | 10 |
| `apps\web\src\pages\reputation\AvisPage.tsx` | 10 |
| `apps\web\src\pages\admin\AdminCatalog.tsx` | 9 |
| `apps\web\src\pages\marketing\CodesPage.tsx` | 9 |
| `apps\web\src\pages\pos\OrderPage.tsx` | 9 |
| `apps\web\src\pages\billing\BillingPage.tsx` | 8 |
| `apps\web\src\pages\haccp\HistoriquePage.tsx` | 8 |
| `apps\web\src\pages\haccp\TemperaturesPage.tsx` | 8 |
| `apps\web\src\pages\hr\EquipePage.tsx` | 8 |
| `apps\web\src\components\OnboardingWizard.tsx` | 7 |
| `apps\web\src\pages\accounting\CaissePage.tsx` | 6 |
| `apps\web\src\pages\accounting\RapportsPage.tsx` | 6 |
| `apps\web\src\pages\ads\AdsAdminPage.tsx` | 6 |
| `apps\web\src\pages\invoices\RelancesPage.tsx` | 6 |
| `apps\web\src\pages\pos\Kitchen.tsx` | 6 |
| `apps\web\src\pages\settings\SettingsTables.tsx` | 6 |
| `apps\web\src\pages\admin\AdminModules.tsx` | 5 |
| `apps\web\src\pages\admin\AdminUsers.tsx` | 5 |
| `apps\web\src\pages\ai\AiAssistantPage.tsx` | 5 |
| `apps\web\src\pages\Dashboard.tsx` | 5 |
| `apps\web\src\pages\inventory\CommandesPage.tsx` | 5 |
| `apps\web\src\pages\inventory\FournisseursPage.tsx` | 5 |
| `apps\web\src\pages\inventory\ReceiptOCR.tsx` | 5 |
| `apps\web\src\pages\invoices\AvoirsPage.tsx` | 5 |
| `apps\web\src\components\ChairsOverlay.tsx` | 5 |
| `apps\web\src\pages\ai\AIModulePage.tsx` | 4 |
| `apps\web\src\pages\clients\ClientsConfig.tsx` | 4 |
| `apps\web\src\pages\inventory\RecettesPage.tsx` | 4 |
| `apps\web\src\pages\owner\OwnerReportPage.tsx` | 4 |
| `apps\web\src\pages\settings\SettingsUsers.tsx` | 4 |
| `apps\web\src\components\AIActionMenu.tsx` | 4 |
| `apps\web\src\components\PlanningAssistant.tsx` | 4 |
| `apps\web\src\components\TransferSplitModal.tsx` | 4 |
| `apps\web\src\components\TransferWizard.tsx` | 4 |
| `apps\web\src\pages\accounting\CloturePage.tsx` | 3 |
| `apps\web\src\pages\accounting\TvaPage.tsx` | 3 |
| `apps\web\src\pages\backup\BackupPage.tsx` | 3 |
| `apps\web\src\pages\centralkitchen\CentralKitchenPage.tsx` | 3 |
| `apps\web\src\pages\community\CommunityPage.tsx` | 3 |
| `apps\web\src\pages\DemoLanding.tsx` | 3 |
| `apps\web\src\pages\pos\DashboardPage.tsx` | 3 |
| `apps\web\src\pages\pos\FloorPlan.tsx` | 3 |
| `apps\web\src\pages\settings\SettingsCatalog.tsx` | 3 |
| `apps\web\src\components\ChairCountPicker.tsx` | 3 |
| `apps\web\src\components\CommandPalette.tsx` | 3 |
| `apps\web\src\components\ErrorBoundary.tsx` | 3 |
| `apps\web\src\components\FloorPresets.tsx` | 3 |
| `apps\web\src\components\RoomManager.tsx` | 3 |
| `apps\web\src\pages\admin\AdminCompany.tsx` | 2 |
| `apps\web\src\pages\autoorder\AutoOrderPage.tsx` | 2 |
| `apps\web\src\pages\catering\CateringPage.tsx` | 2 |
| `apps\web\src\pages\formation\FormationPage.tsx` | 2 |
| `apps\web\src\pages\haccp\JourneePage.tsx` | 2 |
| `apps\web\src\pages\hr\ParamsPage.tsx` | 2 |
| `apps\web\src\pages\NotFound.tsx` | 2 |
| `apps\web\src\pages\settings\SettingsEnvMode.tsx` | 2 |
| `apps\web\src\pages\settings\SettingsLayout.tsx` | 2 |
| `apps\web\src\pages\settings\SettingsModules.tsx` | 2 |
| `apps\web\src\components\layout\Sidebar.tsx` | 2 |
| `apps\web\src\pages\accounting\AccountingLayout.tsx` | 1 |
| `apps\web\src\pages\events\EventsLayout.tsx` | 1 |
| `apps\web\src\pages\guest\games\BlackjackGame.tsx` | 1 |
| `apps\web\src\pages\guest\games\HigherLowerGame.tsx` | 1 |
| `apps\web\src\pages\guest\games\SolitaireGame.tsx` | 1 |
| `apps\web\src\pages\guest\games\WarGame.tsx` | 1 |
| `apps\web\src\pages\guest\GuestHome.tsx` | 1 |
| `apps\web\src\pages\LoadingScreen.tsx` | 1 |
| `apps\web\src\pages\music\MusicPage.tsx` | 1 |
| `apps\web\src\pages\pos\RoomDesignerPage.tsx` | 1 |
| `apps\web\src\pages\referral\ReferralPage.tsx` | 1 |
| `apps\web\src\pages\reservations\ListePage.tsx` | 1 |
| `apps\web\src\pages\settings\SettingsCompany.tsx` | 1 |
| `apps\web\src\pages\settings\SettingsLanguage.tsx` | 1 |
| `apps\web\src\pages\settings\SettingsTheme.tsx` | 1 |
| `apps\web\src\pages\sustainability\SustainabilityPage.tsx` | 1 |
| `apps\web\src\components\AdminQuickMenu.tsx` | 1 |
| `apps\web\src\components\MobileOptimized.tsx` | 1 |
| `apps\web\src\components\NotificationCenter.tsx` | 1 |
| `apps\web\src\components\PhotoWall.tsx` | 1 |

## Activation côté UI

1. Importer `dark-overlay.css` dans `main.tsx`
2. Étendre `themeStore` avec un toggle `darkMode: boolean`
3. Lier au `data-theme-mode` de `<html>`
