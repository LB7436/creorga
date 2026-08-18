# Refonte UX/UI — point d'avancement

**Mis à jour** : 18 août 2026, après la vague v4.8.
**Branche** : `qa/pc-2026-07-27` — 8 commits de mission depuis `dd238fa`. **Rien n'est poussé sur GitHub** (règle de la mission : pas de push avant validation complète).
**Fichiers protégés** : `apps/guest/*`, `routes/portalConfig.ts`, `routes/crm.ts`, `stores/moduleStore.ts` — jamais modifiés.
**Fichiers en vol de l'exploitant, non commités, à préserver** : `apps/backend/package.json`, `apps/backend/src/routes/backup.ts`, `apps/web/src/pages/guest/games/MenschGame.tsx`, `package-lock.json`. Note : la garde `portalConfigManagementGuard` de `apps/backend/src/index.ts` (travail en vol) a été **embarquée dans `e695d89`** avec le montage de la route stock — cohérent, elle rend le PATCH portail réservé au propriétaire.

## Vagues

| Vague | État | Commits |
|---|---|---|
| Phase 0 — audit | ✅ | `dd238fa` |
| v4.7 — modules & navigation | ✅ | `30c2b18`, `8f2c60c`, `ca188c7` |
| v4.8 — caisse & stock | ✅ | `66a251b`, `e695d89`, `eb70e66`, `77895d3` |
| v4.9 — catalogue jeux | ⏳ suivante | — |
| v5.0 — sécurité, paiements, sauvegardes, certification | ⏳ | — |

## État de référence (à la fin de la v4.8)

Builds 4/4 · backend **105** unit (95 + 10) · POS **31** (17 + 14) · web 5 · API 50 · **e2e 15/15**.

## Ce que chaque vague a réglé (constats de l'audit)

### v4.7
- `modulePreferencesStore.ts` (nouveau) : préférences de modules **serveur**, écriture optimiste annulée sur refus, reprise de l'ancien localStorage, sync focus + 60 s. Remplace `moduleConfigStore` + `useSharedModuleConfig` (supprimés).
- `config/espaces.ts` (nouveau) : les 6 espaces + `MODULES_PROPRIETAIRE`.
- `ModuleSelector` : 6 espaces, états Activé/Désactivé/Non disponible/Réservé au propriétaire/Bientôt, toast au lieu d'`alert()`, grille responsive par classe.
- `RequireRole` (nouveau) : /rgpd /backup /sites /api /maintenance /owner gardés ; `/m` sous RequireAuth.
- 13 fichiers morts supprimés (AppLayout/Sidebar/TopBar, 5 layouts, 4 pages Settings*), 7 imports lazy morts.
- Sous-menu POS ramené aux 3 écrans réels ; `viewMode` une seule persistance.
- BackupPage et ClientsPage : états d'erreur honnêtes avec Réessayer.

### v4.8
- `posStore` : `Vente` porte `brut`, `remises[]`, `arrondiCaritatif`, `reglements[]` ; TVA sur le net ; remises plafonnées ; règlement mixte incohérent **refusé** ; `setTableStatus` refuse dirty/available sur impayé ; migration v1→v2 ; ticket Z avec remises et arrondis. `PaymentPage.handleConfirm` transmet ce qu'il affiche ; `FloorPlanPage` garde la modale ouverte sur refus.
- `lib/stockStore` : cache unique, `mutate()`, `decrementerPourVente()` (idempotent, jamais < 0, alertes au franchissement, journal `inventory-mouvements.json`), `trouverEntree` (exact puis inclusion si candidat unique), chemins résolus à l'appel. `inventory-ai.ts` sans copie privée. `routes/stock-ventes.ts` (nouveau, `deviceOrUserAuth`) : `POST /vente`, `GET /mouvements`. `proactive-worker` : alerte stock réparée (`quantity`/`lowStockThreshold`), type `stock-out`, **critiques exemptées du plafond 5/jour**. Caisse : `startStockBridge` (file de rejeu localStorage).
- `pos/DashboardPage` (back-office) réécrit sur `/stats/*` ; `OrderPage` et `Checkout` (maquettes inaccessibles) supprimés, URL redirigées vers `/pos/floor`.
- Caisse : `lib/ecran.ts` (`useEcranEtroit`, seuil 900), OrderPage/PaymentPage/SeatPanel empilés en étroit (`minmax(0,1fr)` — `1fr` seul débordait à 1 152 px), 44 px via `@media (pointer: coarse)`, raccourcis N/P/K/T/Échap dans `App.tsx`.
- `StockPage` : `couleurCategorie()` — crashait sur toute catégorie inconnue (l'OCR met « Divers » par défaut).

## Reste à faire

### v4.9 — jeux (`apps/web/src/pages/guest/games/catalog.ts` = 43 entrées, `GamesSection.tsx`)
- Registre central enrichi (statut jouable/bêta, modes réellement supportés, miniature cohérente, description honnête, catégorie).
- Recommandés = famille uniquement (Petits Chevaux/Mensch, Scoopa, Mémoire, Dominos, Puissance 4).
- Retirer les promesses fausses : difficulté ignorée par 37/40 jeux, invitation duel/tournoi cosmétique (aucun socket), « 3D » abusif (seuls Mensch et TowerDefense en three.js), « Mahjong Bamboo 3D » = memory, notes 4,0–4,9 inventées, casino sans mention.
- Collisions d'emoji/miniatures, SpotError révèle la réponse au survol (`title=`).
- Casino séparé de la liste principale.

### v5.0 — sécurité et certification
- `guest.ts` : `POST /pay` et `POST /orders` recalculent depuis la base ; `PATCH /orders/:id/status` public.
- `stripe.ts` : IDOR inter-sociétés ; webhook (`express.raw` + signature + montage hors `authenticate`).
- `orders.ts:224` : rôle sur statut/encaissement. `requireCompany.ts:32` : jeton d'appareil ↔ société.
- Montants `Float` → centimes entiers (schéma Prisma, tous les modèles monétaires).
- Toggles restants (~68) → persistance serveur + rollback : `usePortalConfig.ts:39` (PATCH sans Authorization → 401 avalé, **le plus grave**), HACCP checklist, ParamsPage RH, AdminCompany horaires, KDS réglages, QrMenu, etc.
- Tests : produits (création/prix/masquage), toggles, paiement, **restauration de sauvegarde** (destructif, aucun test).
- `docs/audit/test-matrice.md`, `docs/audit/ux-refonte-finale.md`, captures desktop/mobile, liste des risques.

### Hors vagues, à mentionner au rapport final
- `KitchenDisplay` (simulateur) et `KioskPage` (allergènes fabriqués par hash — dangereux) : encore des maquettes.
- `apps/guest` : bug de port dev (5176 au lieu de 5178), replis `localhost` morts en prod — **protégé**, signalé seulement.
- Caddyfile absent du dépôt ; `CLAUDE.md` périmé sur les workspaces.

## Pièges opérationnels appris (à relire avant de relancer)

- **Backend `tsx` sur Windows** : `pkill` ne tue pas ; les relances s'empilent (6 zombies vus) et le nouveau meurt en `EADDRINUSE` pendant que l'ancien code répond. Tuer par PID : `Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'tsx' -and $_.CommandLine -match 'src[\\/]index\.ts' } | % { Stop-Process -Id $_.ProcessId -Force }`, puis vérifier `Get-NetTCPConnection -LocalPort 3002`.
- **`stockStore` a un cache mémoire** : réécrire `data/inventory-stock.json` à la main pendant que le serveur tourne ne sert à rien (le cache re-sauvegarde). Passer par l'API (`DELETE /api/inventory-ocr/stock`).
- **Docker Desktop** : moteur en 500 au démarrage → tuer les processus Docker, `wsl --shutdown`, relancer. Postgres tombe si Docker redémarre : `docker compose -f docker-compose.dev.yml up -d`, volume préservé.
- **e2e** : `waitForLoadState('networkidle')` est inatteignable (polling applicatif) — borné à 3 s dans `parcours-critiques.spec.ts`. Les tests e2e **régénèrent** `tests-qa/screenshots/run-2026-07-27/*` (≈180 PNG) : restaurer par `git checkout -- tests-qa/screenshots/` si besoin.
- **Python + Git Bash** : ne pas passer de chemins `/c/...` à Python ni écrire du JSON avec `é` via `curl -d` en shell (Latin-1). Écrire les corps depuis Python (`urllib`) avec `-X utf8`.
- Compte seed local : `bryan@cafe-rondpoint.lu` / `Demo1234!` — `RATE_LIMIT_DISABLED=true` obligatoire pour les tests API.
