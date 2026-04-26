# Creorga Comprehensive QA Report

**2026-04-23T18:03:48.331Z**

## Score : 128/128 (0 échecs)

### Par catégorie

| Catégorie | Score |
|---|---|
| Files | 41/41 |
| Wiring | 22/22 |
| Menu | 7/7 |
| Payments | 6/6 |
| Theme | 7/7 |
| Live | 7/7 |
| Auth | 3/3 |
| FloorState | 5/5 |
| Portal | 2/2 |
| AI | 3/3 |
| Unicode | 1/1 |
| Routes | 20/20 |
| CORS | 4/4 |

### Détails

| Catégorie | Test | Résultat | Notes |
|---|---|---|---|
| Files | apps/backend/src/lib/payments/gateway.ts | ✅ |  |
| Files | apps/backend/src/routes/payments.ts | ✅ |  |
| Files | apps/backend/src/routes/portalConfig.ts | ✅ |  |
| Files | apps/backend/src/routes/floorState.ts | ✅ |  |
| Files | apps/backend/.env.example | ✅ |  |
| Files | apps/backend/src/middleware/requireCompany.ts | ✅ |  |
| Files | apps/pos/src/components/LoyaltyScanner.tsx | ✅ |  |
| Files | apps/pos/src/components/RoomsPager.tsx | ✅ |  |
| Files | apps/pos/src/components/TableSummary.tsx | ✅ |  |
| Files | apps/pos/src/lib/payments.ts | ✅ |  |
| Files | apps/pos/src/lib/floorBridge.ts | ✅ |  |
| Files | apps/web/src/stores/envModeStore.ts | ✅ |  |
| Files | apps/web/src/stores/themeStore.ts | ✅ |  |
| Files | apps/web/src/stores/chairStore.ts | ✅ |  |
| Files | apps/web/src/stores/brandStore.ts | ✅ |  |
| Files | apps/web/src/stores/photoWallStore.ts | ✅ |  |
| Files | apps/web/src/stores/moduleConfigStore.ts | ✅ |  |
| Files | apps/web/src/stores/roomDesignerStore.ts | ✅ |  |
| Files | apps/web/src/components/EnvModeBanner.tsx | ✅ |  |
| Files | apps/web/src/components/AdminQuickMenu.tsx | ✅ |  |
| Files | apps/web/src/components/BackToStart.tsx | ✅ |  |
| Files | apps/web/src/components/QRCodeCanvas.tsx | ✅ |  |
| Files | apps/web/src/components/LogoUploader.tsx | ✅ |  |
| Files | apps/web/src/components/PhotoWall.tsx | ✅ |  |
| Files | apps/web/src/components/ChairsOverlay.tsx | ✅ |  |
| Files | apps/web/src/components/TransferSplitModal.tsx | ✅ |  |
| Files | apps/web/src/hooks/usePortalConfig.ts | ✅ |  |
| Files | apps/web/src/hooks/useFloorState.ts | ✅ |  |
| Files | apps/web/src/pages/ai/AIModulePage.tsx | ✅ |  |
| Files | apps/web/src/pages/pos/RoomDesignerPage.tsx | ✅ |  |
| Files | apps/web/src/pages/pos/UnifiedFloorPlan.tsx | ✅ |  |
| Files | apps/web/src/pages/settings/SettingsModules.tsx | ✅ |  |
| Files | apps/web/src/pages/settings/SettingsEnvMode.tsx | ✅ |  |
| Files | apps/web/src/pages/settings/SettingsTheme.tsx | ✅ |  |
| Files | apps/web/src/pages/onboarding/SetupWizard.tsx | ✅ |  |
| Files | apps/guest/src/usePortalConfig.ts | ✅ |  |
| Files | scripts/fix-unicode.mjs | ✅ |  |
| Files | scripts/qa-audit.mjs | ✅ |  |
| Files | scripts/test-sync.mjs | ✅ |  |
| Files | scripts/test-floor-sync.mjs | ✅ |  |
| Files | QA-REPORT.md | ✅ |  |
| Wiring | App.tsx imports UnifiedFloorPlan | ✅ |  |
| Wiring | App.tsx imports SetupWizard | ✅ |  |
| Wiring | App.tsx imports AIModulePage | ✅ |  |
| Wiring | App.tsx imports SettingsTheme | ✅ |  |
| Wiring | App.tsx imports SettingsModules | ✅ |  |
| Wiring | App.tsx imports EnvModeBanner | ✅ |  |
| Wiring | App.tsx imports BackToStart | ✅ |  |
| Wiring | App.tsx route /pos/floor → UnifiedFloorPlan | ✅ |  |
| Wiring | App.tsx route /setup | ✅ |  |
| Wiring | App.tsx route /ai/local | ✅ |  |
| Wiring | AppShell imports AdminQuickMenu | ✅ |  |
| Wiring | ModuleSelector imports AdminQuickMenu | ✅ |  |
| Wiring | ClientsConfig uses usePortalConfig | ✅ |  |
| Wiring | ClientsConfig uses LogoUploader | ✅ |  |
| Wiring | ClientsConfig uses QRCodeCanvas | ✅ |  |
| Wiring | ClientsConfig uses PhotoWall | ✅ |  |
| Wiring | Guest App uses usePortalConfig | ✅ |  |
| Wiring | POS main.tsx starts floorBridge | ✅ |  |
| Wiring | Backend mounts payments route | ✅ |  |
| Wiring | Backend mounts portal-config route | ✅ |  |
| Wiring | Backend mounts floor-state route | ✅ |  |
| Wiring | Backend auto-bootstrap .env | ✅ |  |
| Menu | Expresso 2.50 € | ✅ |  |
| Menu | Café 2.80 € | ✅ |  |
| Menu | Bofferding Flute 3.20€ | ✅ |  |
| Menu | Cordon Bleu 26.50 € | ✅ |  |
| Menu | Plancha Mixte 25.50€ | ✅ |  |
| Menu | Briquet 1.50 € | ✅ |  |
| Menu | Gin Hendrix 14.50 € | ✅ |  |
| Payments | gateway stripe | ✅ |  |
| Payments | gateway sumup | ✅ |  |
| Payments | gateway mypos | ✅ |  |
| Payments | gateway viva | ✅ |  |
| Payments | gateway worldline | ✅ |  |
| Payments | gateway servipay | ✅ |  |
| Theme | theme mauve | ✅ |  |
| Theme | theme indigo | ✅ |  |
| Theme | theme slate | ✅ |  |
| Theme | theme gold | ✅ |  |
| Theme | theme emerald | ✅ |  |
| Theme | theme rose | ✅ |  |
| Theme | Mauve original restauré | ✅ |  |
| Live | backend health | ✅ |  |
| Live | web :5174 | ✅ |  |
| Live | pos :5175 | ✅ |  |
| Live | marketing :5176 | ✅ |  |
| Live | superadmin :5177 | ✅ |  |
| Live | guest :5178 | ✅ |  |
| Live | ollama :11434 | ✅ |  |
| Auth | login OK sans DB | ✅ |  |
| Auth | fallback admin activé | ✅ |  |
| Auth | company fallback retournée | ✅ |  |
| FloorState | GET 12 tables | ✅ |  |
| FloorState | POST /chairs crée une chaise | ✅ |  |
| FloorState | POST /chairs/:id/items | ✅ |  |
| FloorState | transfer chair t2→t5 | ✅ |  |
| FloorState | transfer items ch→ch | ✅ |  |
| Portal | PATCH depuis admin | ✅ |  |
| Portal | GET depuis guest confirme | ✅ |  |
| AI | ollama up | ✅ |  |
| AI | gemma2:2b installé | ✅ |  |
| AI | inférence répond | ✅ | OK 👍 |
| Unicode | aucun \uXXXX dans src | ✅ | 0 séquences |
| Routes | / | ✅ | 200 |
| Routes | /login | ✅ | 200 |
| Routes | /modules | ✅ | 200 |
| Routes | /setup | ✅ | 200 |
| Routes | /pos/floor | ✅ | 200 |
| Routes | /pos/design | ✅ | 200 |
| Routes | /pos/dashboard | ✅ | 200 |
| Routes | /clients | ✅ | 200 |
| Routes | /crm/clients | ✅ | 200 |
| Routes | /invoices/devis | ✅ | 200 |
| Routes | /inventory/stock | ✅ | 200 |
| Routes | /hr/planning | ✅ | 200 |
| Routes | /haccp/journee | ✅ | 200 |
| Routes | /accounting/caisse | ✅ | 200 |
| Routes | /reputation/avis | ✅ | 200 |
| Routes | /ai | ✅ | 200 |
| Routes | /ai/local | ✅ | 200 |
| Routes | /settings/modules | ✅ | 200 |
| Routes | /settings/env-mode | ✅ | 200 |
| Routes | /settings/theme | ✅ | 200 |
| CORS | http://localhost:5174 | ✅ | allow=http://localhost:5174 |
| CORS | http://localhost:5175 | ✅ | allow=http://localhost:5175 |
| CORS | http://localhost:5178 | ✅ | allow=http://localhost:5178 |
| CORS | http://localhost:5177 | ✅ | allow=http://localhost:5177 |