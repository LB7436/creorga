# Refonte UX/UI — point d'avancement

**Mis à jour** : 18 août 2026, après la vague v4.9.
**Branche** : `qa/pc-2026-07-27` — 10 commits de mission depuis `dd238fa`. **Rien n'est poussé sur GitHub** (règle de la mission : pas de push avant validation complète).
**Fichiers protégés** : `apps/guest/*`, `routes/portalConfig.ts`, `routes/crm.ts`, `stores/moduleStore.ts` — jamais modifiés.
**Fichiers en vol de l'exploitant, non commités, à préserver** : `apps/backend/package.json`, `apps/backend/src/routes/backup.ts`, `apps/web/src/pages/guest/games/MenschGame.tsx`, `package-lock.json`. Note : la garde `portalConfigManagementGuard` de `apps/backend/src/index.ts` (travail en vol) a été **embarquée dans `e695d89`** avec le montage de la route stock — cohérent, elle rend le PATCH portail réservé au propriétaire.

## Vagues

| Vague | État | Commits |
|---|---|---|
| Phase 0 — audit | ✅ | `dd238fa` |
| v4.7 — modules & navigation | ✅ | `30c2b18`, `8f2c60c`, `ca188c7` |
| v4.8 — caisse & stock | ✅ | `66a251b`, `e695d89`, `eb70e66`, `77895d3` |
| v4.9 — catalogue jeux | ✅ | (commit v4.9, voir `git log`) |
| v5.0 — sécurité, paiements, sauvegardes, certification | ⏳ suivante | — |

## État de référence (à la fin de la v4.9)

Builds 4/4 · backend **105** unit · POS **31** · web **24** (5 + 19 registre des jeux) · API 50 · **e2e 17/17** (15 + GST-8/GST-9).

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

### v4.9
- `games/catalog.ts` réécrit = **registre central** (43 entrées, 40 proposées) : `statut` jouable/bêta/bientôt (+ `raisonBeta`), `modes` réels (`solo`/`cpu`/`local`/`tournoi`), `joueurs {min,max}`, `niveau` (`lanceur` si le jeu lit `useGameShell`, `en-jeu`, `fixe`), `ageMin`, `rendu` (`3d` = three.js seulement), `regles`, `miniature`, `connexion`, `mobile`, `recommande`, **`chargeur`** (import paresseux). `GAME_COMPONENTS` de `GamesSection` est dérivé du registre. Notes ★ inventées et badges NEW/HOT supprimés. Emojis uniques (🐴 Petits Chevaux, 🪙 Scoopa, 🐷 Pig, 💥 Farkle, 🎫 Bingo, ♣️ Run 21, ♦️ Rami, 🀄 Rummi Kub, 🎋 Mémo Bambou, 🧮 Mémoire Chiffres).
- Vérité rétablie, vérifiée dans le code des jeux : Puissance 4, Morpion, Bataille = **contre l'ordinateur** (étaient « 2 joueurs ») ; Scoopa = 2–4 joueurs locaux (était « vs CPU ») ; Bingo = solo (était « duo ») ; seuls Petits Chevaux (1–4, tournoi), Scoopa (2–4) et Maxi Burger (1–4, chacun son tour) sont multijoueurs ; seuls Échecs, Castle Rush et Maxi Burger lisent la difficulté du lanceur → le sélecteur « Difficulté » n'apparaît que pour eux, « Qui joue ? » n'apparaît que si le jeu propose plusieurs modes ; « Mahjong Bamboo 3D » → « Mémo Bambou » ; « Scoopa 3D / Rami Salon 3D / Rummi Kub 3D » perdent leur « 3D » (scènes CSS) dans le registre **et** dans les titres en jeu ; **Bêta** : Rami Salon (défausse adverse non prenable), Billard Lounge (9-ball simplifié, solo).
- Catégories : Famille / Cartes / Réflexion / Arcade / Multijoueur (2, vraiment à plusieurs sur la tablette) / Tournois (1) ; **casino séparé** dans sa propre section « mises fictives, réservé aux adultes », hors de « Tous » (38) et jamais recommandé ; mention casino dans le lanceur.
- **Recommandé** = `JEUX_RECOMMANDES` dérivé du registre (famille, jouable, hors casino : Petits Chevaux, Scoopa, Memory, Puissance 4, Morpion, Rummi Kub, Simon, Yahtzee) ; plus de repli sur `visibleGames[0]` (le blackjack pouvait être « recommandé »). **« Dominos » demandé par la mission n'existe pas dans le code : non inventé, à créer si souhaité.**
- Panneau « Invitation de table » (codes DUEL/TOUR-XXXX que rien ne consommait, bouton Robi ouvrant un assistant absent du portail) → **« Jouer à plusieurs »** listant les jeux locaux réels. `PlayModePanel` (jamais rendu) supprimé.
- Lanceur : règles, joueurs, âge, durée, 3D, `libelleModes`, mention Bêta/casino ; mode mémorisé rabattu sur ce que le jeu propose (`modePourJeu`).
- `SpotErrorGame` : `title={diff.label}` retiré (le survol révélait la réponse) ; `progress.ts` : succès « 3 jeux casino » (inatteignable, 2 visibles) → 3 jeux de cartes.
- `ClientsConfig` (back-office) lit le même registre : sous-titre joueurs, tag BÊTA, « Casino · mises fictives · 18+ », libellé coché lisible en sombre.
- Tests : `catalog.test.ts` (**19** invariants : ids/emojis uniques, alias valides, `niveau: 'lanceur'` ⇔ le fichier du jeu lit `useGameShell().difficulty`, `rendu: '3d'` ⇔ import `three`, multi ⇔ mode local et ≥ 2 joueurs, recommandés famille/jouables/hors casino, casino 18+, famille ≤ 12 ans, bêta motivé) ; e2e **GST-8** (portail : recommandé famille, casino séparé, compteur 38, lanceur Puissance 4 sans tournoi/difficulté, Petits Chevaux 1–4 + 3D + tournoi, Échecs avec difficulté, Rami bêta) et **GST-9** (back-office : 40 jeux, plus de « 3D » abusif, BÊTA, casino signalé). Captures : `docs/audit/captures/v4.9/`.

## Reste à faire

### v5.0 — sécurité et certification
- `guest.ts` : `POST /pay` et `POST /orders` recalculent depuis la base ; `PATCH /orders/:id/status` public.
- `stripe.ts` : IDOR inter-sociétés ; webhook (`express.raw` + signature + montage hors `authenticate`).
- `orders.ts:224` : rôle sur statut/encaissement. `requireCompany.ts:32` : jeton d'appareil ↔ société.
- Montants `Float` → centimes entiers (schéma Prisma, tous les modèles monétaires).
- Toggles restants (~68) → persistance serveur + rollback : `usePortalConfig.ts:39` (PATCH sans Authorization → 401 avalé, **le plus grave**), HACCP checklist, ParamsPage RH, AdminCompany horaires, KDS réglages, QrMenu, etc.
- Tests : produits (création/prix/masquage), toggles, paiement, **restauration de sauvegarde** (destructif, aucun test).
- `docs/audit/test-matrice.md`, `docs/audit/ux-refonte-finale.md`, captures desktop/mobile, liste des risques.

### Hors vagues, à mentionner au rapport final
- Jeux : aucun jeu n'est **en ligne** (pas de socket de partie) — le multijoueur est toujours « sur la même tablette » ; le registre porte `connexion: 'local'` partout, prêt pour un futur `'en-ligne'`. Marques déposées dans les noms (Yahtzee, Mastermind, Simon, Puissance 4, Rummikub, Motus, Tetris) : risque juridique à arbitrer par l'exploitant, non renommées (hors périmètre, e2e GST-7 dépend de « Petits Chevaux 3D »). Jeux « bientôt » (Tetris, machine à sous, roulette) : jamais affichés.
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
