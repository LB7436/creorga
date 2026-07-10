# PLAN D'ACTION — Creorga Games v6 « Arcade »

> Généré le 2026-07-10 à partir d'une revue multi-agents : 43 jeux lus intégralement (~23 600 lignes),
> 4 recherches web (game design TD, lane battlers, juice HTML5, hyper-casual 2023-2026),
> 2 audits programme (reste-à-faire intégral + infrastructure jeux).
> Détail bug-par-bug de chaque jeu : voir [REVUE-JEUX-DETAIL.md](REVUE-JEUX-DETAIL.md).

---

## 0. Résumé exécutif

| Constat | Chiffre |
|---|---|
| Jeux évalués | 43 (dans 34 fichiers) |
| Score moyen | **5,1 / 10** — aucun jeu au niveau commercial (8+) |
| Meilleurs | Tower Defense 6,5 · Snake 6,5 · Memory 6,5 · Puissance 4 6,5 · Réaction 6,5 · Mastermind 6,5 |
| Pires | Billard 3D **1,5** · Erreur 11 **2** · Run21/TriTours/Rami **3** · Poker/Rummikub/Farkle **3,5** |
| Bug transversal n°1 | `onBack` jamais passé aux jeux (GamesSection.tsx:1069) → boutons Retour morts dans 38 jeux |
| Bug transversal n°2 | Difficulté et mode choisis dans le dialog de lancement **jamais transmis** aux jeux |
| Score serveur | Seuls 5 jeux sur 38 envoient leur score ; leaderboard « Anonyme », spoofable, non normalisé |
| i18n | Hub FR/EN/DE/PT mais 100 % des jeux hardcodés en français |
| Son/vibration | 1 seul jeu sur 38 (Simon) a du son |

**Stratégie** : d'abord les fondations transverses (Phase A) qui améliorent les 38 jeux d'un coup,
puis la refonte Tower Defense (Phase B), puis 5 nouveaux « Creorga Originals » AAA (Phase C),
puis remise à niveau ciblée de l'existant (Phase D), et le durcissement programme (Phase E).

---

## PHASE A — Fondations transverses (~8-10 jours)
*Chaque élément profite aux 38 jeux existants ET aux 5 nouveaux.*

### A1. `GameShell` — contexte commun injecté dans chaque jeu (2 j) 🔴 priorité absolue
Un provider rendu par `ActiveGameView` qui passe à chaque jeu :
```
{ onBack, difficulty, playMode, profile, tableId, t, submitScore, feedback }
```
- Corrige le bug `onBack` (boutons Retour morts partout).
- La difficulté facile/moyen/difficile choisie au lancement arrive ENFIN dans les jeux.
- Point d'entrée unique pour i18n, scores, sons — zéro modification par-jeu ensuite.

### A2. Kit « juice » partagé (2 j)
Nouveau module `games/lib/juice.ts` (recettes validées par la recherche, zéro asset) :
- **Sons WebAudio synthétisés** : blip tap (880 Hz/40 ms), hit (sawtooth 200→50 Hz),
  coin (660→880 Hz), explosion (bruit blanc + lowpass), arpège victoire. Unlock au 1er geste, mute global persisté.
- **Haptique** : `haptic(10)` tap / `haptic(40)` impact / `haptic([50,30,50])` défaite (no-op iOS silencieux).
- **Particules poolées** (256 max, `fillRect` + `globalAlpha`), confettis, screen-shake (trauma², ≤8 px),
  hit-stop (≤80 ms), easings (`outBack`, `outElastic`), count-up de score.
- **`useGameLoop`** : rAF + dt clampé 50 ms + pause auto sur `visibilitychange` + DPR cap 2.
  → remplace les `setInterval` bugués repérés dans 12 jeux.

### A3. Scores & leaderboard réels (1,5 j)
- Généraliser `useGameScore` aux 38 jeux (migration des clés localStorage ad-hoc).
- `playerName` + `tableId` auto-remplis depuis le profil guest et `?table=`.
- Leaderboard **par jeu** + classement global **normalisé 0-1000**, socket temps réel au lieu du poll 30 s.
- Backend : validation de plage de score par jeu + rate-limit (aujourd'hui spoofable sans auth).

### A4. i18n des jeux (1,5 j)
- Étendre `i18n.ts` (namespace `games.*`, clés typées), traduire GameShell + GameOverModal +
  GamesSection + `catalog.ts` (noms/descriptions) + `timeAgo()` en EN/DE/PT.
- Le shell + modal couvrent ~80 % des chaînes vues en jeu.

### A5. Performance & découpage (1,5 j)
- Scinder `CreorgaOriginals.tsx` (54 Ko, 6 jeux → 6 chunks séparés).
- Factory `makeLazyGame(loader)` avec `.preload` → le préchargement au clic (déjà codé) marchera
  pour 38 jeux au lieu d'un seul.
- Mémoïser le thème face au poll `usePortalConfig(2500)` ; suspendre les polls si `document.hidden`.
- Scinder `GamesSection.tsx` (1 500 lignes) en GameCard / GameLaunchDialog / ActiveGameView.

### A6. Primitives UI partagées (1,5 j)
`GameButton`, `GameHUD` (score/record/chrono), `Dice3D`, `PlayingCard`, `useSwipe`, `useCountdown` —
élimine ~30 réimplémentations, homogénéise le rendu, supporte le thème light.

### A7. Progression / XP / badges (1 j)
- Progression rattachée au profil guest + sync serveur (aujourd'hui 100 % localStorage, perdue en changeant d'appareil).
- Succès **événementiels** (toast + confetti au déblocage) au lieu de dérivés silencieux ; XP/niveau simple.

---

## PHASE B — Refonte Tower Defense (~6-7 jours)
*Score actuel 6,5/10 — la meilleure base du catalogue, mais 9 bugs et un game design plat (recherche : Kingdom Rush / BTD6).*

### B1. Bugs critiques (1 j)
1. **Temps simulé unifié** (`simTime += rawDt × speed`) : corrige d'un coup le bouton 2x qui rend
   le jeu PLUS FACILE (spawns en temps réel vs déplacement en temps simulé), les slows cryo faussés,
   et la pause qui ne gèle pas les timers.
2. Shadow map activée pour rien (+20-30 % perf GPU mobile gratuite en la retirant).
3. Tours translucides forcées à chaque frame (`opacity 0.92` jamais restaurée).
4. Reliquat de cooldown perdu (tours plus lentes à bas FPS) ; lerp d'angle non normalisé (tourelles
   qui font un tour complet) ; confirmation avant Reset.

### B2. Mobile-first (1,5 j)
- **Caméra responsive** : FOV/distance adaptés à l'aspect ratio — aujourd'hui injouable en portrait
  (plateau coupé), alors que la cible est le téléphone du client.
- **Placement en 2 taps** : tap = préviz portée verte/rouge + coût, 2e tap = confirmer
  (le tap direct actuel coûte 45 % du prix en cas d'erreur de doigt).
- Cibles tactiles ≥ 44 px, barre de tours scrollable (déborde à 375 px actuellement).

### B3. Game design (recherche appliquée) (2,5 j)
- **Preview de la vague suivante** (icônes ennemis + quantités + mention volant/blindé) — levier n°1.
- **Vague anticipée = bonus d'or** (mécanique signature Kingdom Rush, rythme les parties).
- **Intérêts ~12 % sur l'or non dépensé** en fin de vague (plafonné) — dilemme épargne/dépense.
- **9 → 15 vagues**, boss à 7 et 15 avec mécanique spéciale (aura de soin, spawn à la mort) ;
  un nouveau type d'ennemi max toutes les 2-3 vagues.
- **Armure lisible** : icône bouclier + chiffres de dégâts flottants + tag « anti-blindage » sur la tour Rail.
- **Anti-air réel** : drones intouchables par le splash sol, +50 % dégâts pulse — sinon le flag volant ne pèse rien.
- **Upgrade niveau 4 à embranchement** (choix binaire par tour, ex. Rail → « Perce-blindage » / « Double rail »).
- **Priorité de ciblage** par tour (premier/dernier/plus fort) — grosse profondeur, coût minime.
- **Étoiles 1-3 par difficulté** + petit arbre d'upgrades permanents (localStorage) → rejouabilité.

### B4. Juice TD (1 j — s'appuie sur A2)
Hit-flash blanc 80 ms, particules d'impact colorées par type, or qui vole vers le compteur,
shake léger sur fuite/boss, sons tir/kill/vague, vibration sur perte de vie, best score par difficulté.

---

## PHASE C — 5 nouveaux « Creorga Originals » (~13-16 jours)
*Inventés à partir des mécaniques les plus performantes du marché 2023-2026 (recherche hyper-casual + lane battler). Tous : portrait, une main, sessions 2-6 min, pause auto, i18n via GameShell, juice via A2.*

### C1. 🏰 CASTLE RUSH — lane battler type Clash Royale (5-6 j) — LE titre phare
Duel de château solo vs CPU, arène verticale **1 lane tug-of-war** (lisible sur mobile, pathfinding trivial) :
- **Élixir** : départ 5, max 10, régén 1/2,8 s → x2 à 2:00 ; match 3:00 + mort subite 1:00.
- **Deck 8 cartes, main 4 + prochaine visible** : Chevalier (3), Géant (5, cible bâtiments),
  Squelettes ×3 (2), Archères (3, anti-air), Sorcier splash (5), Boule de feu (sort, 4),
  Gargouilles volantes (3), Canon défensif (3). Triangle tank→swarm→splash→tank + couche aérienne.
- **IA FSM 3 états** (DEFEND/ATTACK/SAVE) + table menace→counter ; difficulté = temps de réaction
  (2,5 s → 0,3 s) + précision des counters (40 % → 95 %) + régén élixir (0,8x → 1,2x).
- **Contrôles** : tap carte → tap terrain (zone valide surlignée), `touch-action: none`, gestion `pointercancel`.
- 2 tours latérales (1400 HP) + château (2600 HP) ; skins des unités thème brasserie
  (Serveur = chevalier, Chef = géant, Commis ×3 = squelettes…).

### C2. 🍔 MAXI BURGER — stack de précision (1,5-2 j) — le quick-win
Ingrédients en balancier, un tap pour lâcher ; mal aligné = tranche rognée, burger bancal.
« Perfect » ×3 = la tranche regrossit + effet sauce. **Mode duel à table** : même seed, deux téléphones,
comparaison de hauteur (asynchrone, zéro temps réel). Le plus simple des cinq — à livrer en premier.

### C3. 🫙 GLOUTON — merge physique type Suika Game (3-4 j)
Lâcher des ingrédients dans un bocal ; deux identiques fusionnent en mets supérieur
(olive → tomate → bruschetta → … → plat signature). Réactions en chaîne, physique Matter.js (cercles only).
**Twist** : le palier final = configurable par le restaurateur (son plat signature).
Mécanique virale n°1 de 2023-24, rejouabilité massive au highscore.

### C4. 🍽️ SERVICE ! — sort puzzle du serveur (2-3 j)
Trier commandes mélangées sur des plateaux (verres/entrées/desserts) en coups limités.
Niveaux 45 s générés procéduralement (algorithme de solvabilité garanti), mode zen infini.
**Twist** : « coup de feu » toutes les 5 grilles (chrono, rythme ×2) + win-streak « service parfait ».
Sous-genre au plus fort momentum du marché (×5,6 YoY).

### C5. 🍕 L'ADDITION — puzzle de découpe zen (2-3 j)
Pizza/tarte à découper pour servir chaque convive exactement sa part (appétits 2/8, 3/8…).
Géométrie pure (découpe de polygones + aires), niveaux 20-40 s, jouable en discutant.
**Twist** : « qui a la plus grosse part ? » → passer le téléphone (social à table) ;
niveaux thématisés sur le menu réel. Aucun concurrent direct identifié.

*Backlog C6 (bonus)* : 🍯 FILET DE SAUCE — draw-to-solve avec fluide granulaire (le titre « wow », 4-6 j).

**Ordre de dev conseillé** : C2 Maxi Burger → C4 Service ! → C3 Glouton → C5 L'Addition → C1 Castle Rush
(le plus simple d'abord pour roder GameShell + juice kit, le phare en dernier une fois l'outillage rôdé).

---

## PHASE D — Remise à niveau de l'existant (~10-14 jours en 3 lots)

### Lot D1 — Les catastrophes (score < 4) à refondre ou retirer (5-6 j)
| Jeu | Score | Décision recommandée |
|---|---|---|
| Billard Lounge 3D (Originals) | 1,5 | **Supprimer** — doublon du BilliardsGame 2D (4,5) qui devient LE billard après fix |
| Erreur 11 Terrasse | 2 | Refondre (scène SVG riche + 11 vraies différences) ou laisser `available:false` |
| Run 21 / Tri-Tours | 3 | Terminer les règles + brancher GameOverModal, sinon retirer du catalogue |
| Rami Salon 3D | 3 | Refonte règles (pioche/défausse incomplètes, comptage faux) — jeu à fort potentiel table |
| Rummikub 3D | 3,5 | Validation des poses incomplète + IA passive — refonte ciblée |
| Poker Hold'em | 3,5 | 11 bugs (side-pots faux, all-in cassé…) — refonte moteur de mise |
| Farkle | 3,5 | Scoring incomplet (straights/3 paires) + bug de banque |
| Basket Rooftop (×2 versions) | 4 | **Fusionner** les 2 versions (Originals + BasketballGame) en une seule avec fin de partie |
| Bingo | 4 | Tirage biaisé + pas de fin — fix court |
| Bataille / 421 | 4-4,5 | Fixes courts (règles + feedback) |

### Lot D2 — Le cœur du catalogue (score 4,5-6) : quick-wins par jeu (4-5 j)
Chaque jeu a 5-10 fixes listés dans [REVUE-JEUX-DETAIL.md](REVUE-JEUX-DETAIL.md). Les patterns récurrents :
- Remplacer `setInterval` → `useGameLoop` (A2) : Snake, 2048, Simon, Memory, Reaction, Motus…
- Cibles tactiles < 44 px : Échecs, Démineur, Taquin, Motus (clavier), Solitaire (colonnes).
- IA à corriger : Échecs (coups illégaux en fin de partie), Reversi (coins), Puissance 4 (profondeur).
- Règles fausses : Solitaire (re-pioche), Blackjack (split/assurance), Yahtzee (bonus 63), Scopa (Primiera).
- Brancher GameOverModal + useGameScore partout (via A1/A3).

### Lot D3 — Polish global (1-2 j)
Accents français manquants (« Demarrer », « Degats »…), thème light, orientation, states vides.

---

## PHASE E — Programme intégral (hors jeux) — reste à faire

### P0 — Bloquant production
1. **PostgreSQL de production** : le backend tourne en fallback sans DB → 13 modules ne persistent rien
   (`/api/invoices`, `/api/reservations`, `/api/modules` → 500). Provisionner + migrations + seed.
2. **Stripe** : 6 TODO dans les webhooks (abonnements jamais créés/mis à jour en base).
3. **Credentials en dur** : `admin@creorga.local`/`Admin1234!` dans le bundle (auto-login APK) —
   à conditionner à `NODE_ENV=development`.
4. **Hébergement éphémère** : tunnels trycloudflare morts au reboot ; exécuter le plan Vercel de
   DEPLOYMENT.md (creorga.lu / app / api, DNS, SSL).
5. **Secrets manquants** : RESEND_API_KEY, JWT/SESSION/STRIPE/VAPID non configurés en prod.
6. **APK release non signé** (seul un debug existe) : keystore + assembleRelease + R8.

### P1 — Important
7. **Tests : 0 fichier front pour 289 src** (backend : 5/60) — règle interne 80 %. Prioriser :
   moteurs de jeux (purs, faciles à tester), stores POS, routes backend critiques.
8. **~800 `any`** (550 backend / 258 web), hotspots : assistant.ts (189), agent.ts (127),
   requireCompany.ts (14 — middleware d'auth multi-tenant !).
9. **14 TODO fonctionnels** : push notifications (4), HACCP photo non envoyée, OCR planning,
   audit-log multi-société, fusion doublons CRM.
10. **OAuth factice** (Google/Apple/Microsoft = toast) : intégrer ou retirer.
11. **API à normaliser** : `/api/stats` 404, sous-chemins non documentés (le module « api » vend un accès public).
12. **Jeux `available:false`** : tetris (à faire), slots + roulette (**décision juridique Luxembourg requise**),
    erreur11/run21/tritowers (→ Lot D1).

### P2 — Nice-to-have
13. i18n back-office (289 fichiers FR-only), accessibilité (75 aria-* sur 289 fichiers),
    37 console.log résiduels (dont 12 dans stripe.ts), CI/CD GitHub Actions absent, Sentry/PostHog non branchés.

---

## Phasage & estimation globale

| Phase | Contenu | Effort | Dépend de |
|---|---|---|---|
| **A** | Fondations transverses (GameShell, juice, scores, i18n, perf) | 8-10 j | — |
| **B** | Refonte Tower Defense | 6-7 j | A2 (juice) |
| **C** | 5 nouveaux Creorga Originals | 13-16 j | A1, A2 |
| **D** | Remise à niveau existant (3 lots) | 10-14 j | A |
| **E** | Programme intégral P0 | 5-8 j | — (parallélisable) |
| | **Total jeux (A-D)** | **~37-47 j-dev** | |

**Ordre d'exécution recommandé** :
`A1+A2` (le socle) → `C2 Maxi Burger` (valide le socle sur un jeu neuf) → `B` (TD) →
`A3-A7` → `C4/C3/C5` → `C1 Castle Rush` (le phare) → `D1` → `D2/D3` → `E` en continu.

*Quick-wins immédiats si on veut un impact visible dès le jour 1* :
fix `onBack` (1 ligne, GamesSection.tsx:1069) · suppression shadow map TD (2 lignes, +25 % perf) ·
suppression du doublon Billard 3D · accents français.
