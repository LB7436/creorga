# PROMPT KICKOFF FINAL — Terminer le plan Jeux Creorga v6 en une session

> **Mode d'emploi** : nouvelle session Claude Code dans `C:\Users\Bryan\OneDrive\Desktop\creorga`,
> `/model claude-fable-5`, effort **max**, puis copie-colle TOUT le bloc ci-dessous
> (de `===== DÉBUT =====` à `===== FIN =====`). Reprenable : si la session s'arrête,
> recolle le même bloc — il repart de SUIVI-JEUX.md.
> *(Version durcie après revue adverse : 16 corrections intégrées — ports, plan B Docker/git,
> boucles bornées, ids de score, hooks locaux.)*

## ===== DÉBUT DU PROMPT =====

ultracode

# MISSION
Terminer INTÉGRALEMENT le plan des jeux de l'espace client Creorga (`PLAN-ACTION-JEUX.md`),
étapes 4a → 8, en une seule session autonome. Objectif : qualité commerciale (8/10+ par jeu),
pas la vitesse. Ne t'arrête JAMAIS entre les étapes : coche `SUIVI-JEUX.md`, commit, push,
enchaîne. Ne pose aucune question — toutes les décisions sont déjà dans les 3 documents :
`PLAN-ACTION-JEUX.md` (le plan), `REVUE-JEUX-DETAIL.md` (bugs ligne par ligne des 43 jeux),
`SUIVI-JEUX.md` (état d'avancement — fais-lui confiance, ne refais pas ce qui est coché).

# ÉTAT ACTUEL (validé, poussé sur origin/master — NE PAS REFAIRE)
- Socle : `games/lib/GameShell.tsx` (contexte onBack/difficulté/mode/profil/table injecté par le hub),
  `games/lib/juice.ts` (sfx synthétisés, buzz haptique, particules poolées, shake, hit-stop, easings,
  setupCanvas DPR, useGameLoop avec pause auto).
- `useGameScore(gameId)` : record localStorage + POST serveur avec nom+table AUTO-remplis.
- Nouveaux jeux : Maxi Burger (étape 2) livré ; Tower Defense refondu (étape 3, 15 vagues, boss,
  branches, méta-étoiles).
- Étape 4 partielle : makeLazyGame (préchargement des 39 jeux), backend gameScores.ts durci
  (zod + rate-limit 30/min), CreorgaOriginals découpé (originalsShared + 6 fichiers),
  GameOverModal i18n FR/EN/DE/PT (clés `gameover_*` dans `i18n.ts`).
- Tests existants : `tests-qa/smoke-*.mjs` (modèles à réutiliser — ils hardcodent le port 5174).

# DÉMARRAGE
1. `git pull` ; lis `SUIVI-JEUX.md` en entier ; reprends à la première case ⬜.
2. Docker : `docker compose -f docker-compose.dev.yml up -d` (timeout 300000 ms — Docker Desktop
   à froid met 3-4 min). Readiness bornée : boucle `docker compose -f docker-compose.dev.yml ps`
   toutes les 15 s, max 20 tentatives.
3. Backend et web : lance-les en ARRIÈRE-PLAN (`run_in_background`), JAMAIS en foreground.
   - backend : `npm run dev --workspace=apps/backend` (port 3002).
   - web : libère d'abord le port 5174 s'il est occupé (`netstat -ano | findstr :5174` puis kill),
     puis `npm run dev --workspace=apps/web -- --port 5174 --strictPort`. Les smoke tests de
     tests-qa/ hardcodent `http://localhost:5174` : le serveur web DOIT tourner sur 5174,
     n'utilise jamais 5173.
   - Readiness : `curl -s http://localhost:5174` et `curl -s http://localhost:3002/api/portal-config`
     avant tout test Playwright.
4. **PLAN B Docker** : si Docker n'est pas prêt après 20 tentatives, continue SANS Docker
   (le backend tourne en mode fallback sans Postgres — les 500 sur `/api/portal-config/client`
   sont connus et tolérés) et note-le dans SUIVI-JEUX.md.
5. Sanity : `npm run build --workspace=apps/web` doit être vert avant de commencer.

# MÉTHODE ULTRACODE (qualité max, budget OK)
- Étapes 4a, 7 et 8 (volume par-jeu) : orchestre des **Workflows** — fan-out d'agents (un par jeu ou
  par lot de 2-3 jeux) qui produisent le diff, puis **vérification adverse** (agent sceptique qui
  relit chaque diff : régression ? score au bon moment ? règles respectées ?) avant d'appliquer.
- Étapes 5 et 6 (nouveaux jeux) : conçois d'abord (spec courte : états, boucle, scoring, difficulté),
  fais critiquer la spec par un panel d'agents (gameplay/mobile/perf), puis implémente, puis
  vérifie au navigateur.
- Après CHAQUE étape : coche SUIVI-JEUX.md + commit conventionnel FR + push. Jamais de gros commit
  fourre-tout.

# ÉTAPES (dans cet ordre strict)

## 4a — Migration scores des 29 jeux legacy → useGameScore
Liste (exécute via l'outil **Bash/Git Bash**, PAS PowerShell) :
`grep -L "useGameScore" apps/web/src/pages/guest/games/*Game.tsx apps/web/src/pages/guest/games/Hangman.tsx apps/web/src/pages/guest/games/Game2048.tsx apps/web/src/pages/guest/games/Game421.tsx`
Pour CHAQUE jeu (ce n'est PAS mécanique) : identifie le vrai score (points, streak, temps inversé,
victoires…), le moment exact de fin de partie, remplace la clé localStorage ad-hoc par
`const { best, submit } = useGameScore('<id du catalog>')` et `submit(score)` en fin de partie
(l'id est celui de `catalog.ts`, PAS le nom du fichier). Jeux sans score naturel (morpion, bataille) :
score = victoires cumulées de la session. Conserve la MIGRATION de l'ancien record : si l'ancienne
clé existe et > nouveau best, reprends-la.
Vérifie AUSSI les jeux qui utilisent DÉJÀ useGameScore avec un id hors catalog (connus :
BasketballGame `'basketball'` → `'basket3d'`, BilliardsGame `'billiards'` → `'billard'`) :
corrige l'id + migre l'ancien record (`creorga.game.best.<ancien-id>`).
SORTIE : chaque jeu poste au leaderboard — vérifie 3 jeux au hasard via
`curl http://localhost:3002/api/game-scores/<id>/top`. Si le leaderboard reste vide à cause du
fallback DB ou du rate-limit 429 : le critère devient « observer via Playwright
(`page.on('request')`) que le POST `/api/game-scores` part avec le bon gameId et un score cohérent » —
la persistance DB n'est pas exigée.

## 4b — i18n hub + catalogue (FR/EN/DE/PT)
`GamesSection.tsx` (~1 434 lignes, > limite 800) n'a AUCUN accès à la langue. Fais :
1. Étends `i18n.ts` : namespace `games_*` (recherche, "Jouer maintenant", "Lancer la partie",
   "S'inscrire et jouer", modes Qui joue?/Solo/Ensemble/Individuel/Tournoi + descriptions,
   difficultés, succès, historique, "Session lancée", "Ce jeu arrive bientôt", timeAgo…).
2. `catalog.ts` : noms et descriptions traduits. DÉCISION : structure `Record<GuestLang, string>`
   directement dans catalog.ts — pas de clés i18n pour les noms/descriptions ; tous les agents
   suivent cette convention.
3. Importe `useGuestLang` dans GamesSection et rethread `t` partout (GameLaunchDialog, cartes,
   ActiveGameView, panneaux succès/historique/leaderboard).
4. Profites-en pour DÉCOUPER GamesSection : extrais GameCard, GameLaunchDialog, ActiveGameView
   dans `games/hub/`.
SORTIE : Playwright avec `localStorage['creorga.guest.lang']='en'` → hub entièrement anglais
(recherche, dialog, badges) ; spot-check 'de'.

## 4c — Primitives UI + XP/progression
1. `games/lib/ui.tsx` : GameButton, GameHUD (score/record/chrono), Dice, PlayingCard, useCountdown —
   migre au moins 6 jeux dessus pour prouver l'API (les autres au fil des étapes 7-8).
2. XP : niveau dérivé de `progress.ts` (ex. xp = totalPlays*10 + totalSeconds/6 ; niveau = palier),
   affiché dans le hub ; succès ÉVÉNEMENTIELS : au déblocage, toast + confetti (réutilise juice.ts).
SORTIE : build vert + hub affiche niveau/XP + un succès se déclenche en jouant.

## 5 — Trois nouveaux Creorga Originals (specs complètes : PLAN-ACTION-JEUX.md §C4/C3/C5)
Ordre : SERVICE ! (sort puzzle, générateur de niveaux SOLVABLES — génère la solution puis mélange
à rebours) → GLOUTON (merge Suika : `npm i matter-js -w apps/web` + `npm i -D @types/matter-js -w apps/web`,
cercles uniquement, 11 paliers d'ingrédients, palier final configurable) → L'ADDITION (découpe de
pizza en parts exactes : géométrie polaire, aires par secteur, tolérance par difficulté).
Tous : portrait une main, GameShell (difficulté!), juice (sons/vibrations/particules), useGameScore,
i18n via 4b, entrée `catalog.ts` + `makeLazyGame` dans GAME_COMPONENTS, GameOverModal.
SORTIE par jeu : test Playwright complet type tests-qa/smoke-maxiburger.mjs (lancer, jouer
plusieurs actions réelles, fin de partie, replay, retour, 0 erreur console).

## 6 — CASTLE RUSH (titre phare — vise 8/10, prends le temps)
Lane battler solo vs CPU (spec : PLAN-ACTION-JEUX.md §C1) : élixir départ 5 / max 10 / régén 1 par
2,8 s → x2 à 2:00 ; match 3:00 + mort subite 1:00 ; deck 8 cartes (main 4 + prochaine visible) :
Serveur(3, mini-tank), Chef(5, tank cible-bâtiments), Commis×3(2, swarm), Serveuses(3, ranged anti-air),
Sommelier(5, splash), Flambée(4, sort AoE), Mouettes(3, air swarm), Four(3, bâtiment défensif) ;
triangle tank→swarm→splash + couche aérienne (hard-counter coûte 1-2 de moins) ; 1 lane tug-of-war,
2 tours latérales (1400 PV) + château (2600 PV, s'active quand une tour tombe) ; IA FSM
DEFEND/ATTACK/SAVE avec table menace→counter, difficulté GameShell = temps de réaction (2,5s→0,3s)
+ précision counter (40%→95%) + régén élixir (0,8x→1,2x). Simulation hors React (useRef + rAF,
useGameLoop), rendu canvas (setupCanvas DPR), cartes de la main en DOM, tap-carte puis tap-terrain,
`touch-action:none`, gère `pointercancel`. Juice complet (impacts, morts, tours qui tombent = shake
+ explosion).
SORTIE : partie complète jouable et GAGNABLE en facile via Playwright (script qui joue des cartes
et vérifie l'évolution des PV) ; un agent adverse qui joue mal doit PERDRE en difficile.
**Équilibrage borné : maximum 3 itérations de tuning.** Si après 3 passes un critère n'est pas
atteint, ajuste directement les leviers IA (temps de réaction, régén élixir) pour le satisfaire,
note l'écart dans SUIVI-JEUX.md et passe à la suite.

## 7 — Lot D1 : refontes des jeux cassés (détails : REVUE-JEUX-DETAIL.md, section par jeu)
- Rami (règles pioche/défausse/comptage), Rummikub (validation poses + IA), Poker (moteur de mise :
  side-pots, all-in), Farkle (scoring complet : suites, 3 paires), Bingo (tirage équitable + fin).
- Basket Rooftop (`BasketballGame.tsx`, id catalog `basket3d` — le doublon 3D a DÉJÀ été supprimé
  à l'étape 0, n'en cherche pas un deuxième) : l'id de score a été corrigé en 4a ; applique les
  fixes REVUE (fin de partie complète, stage tappable, trajectoire).
- Erreur 11 Terrasse : refondre (11 vraies différences) OU confirmer `available:false` — décide
  selon l'état du code.
- Run21 + TriTours : terminer les règles et passer `available:true` OU retirer du catalogue.
- Bataille et 421 : fixes courts de règles/feedback listés dans REVUE-JEUX-DETAIL.md.
SORTIE par jeu : les bugs listés dans REVUE-JEUX-DETAIL.md pour ce jeu sont corrigés + test Playwright.

## 8 — Lots D2+D3 : fixes en série sur le reste du catalogue
Applique les fixes de REVUE-JEUX-DETAIL.md par jeu : setInterval→useGameLoop (Snake, 2048, Simon,
Memory, Reaction, Motus…), cibles tactiles ≥44px (Échecs, Démineur, Taquin, Motus, Solitaire),
IA (échecs fins de partie, reversi coins, puissance 4 profondeur), règles (solitaire re-pioche,
blackjack split/assurance, yahtzee bonus 63, scopa primiera), puis polish : accents FR restants,
états vides. Workflow fan-out par lots de 3 jeux + vérif adverse.
SORTIE : REVUE-JEUX-DETAIL.md traité (note en tête de fichier ce qui a été appliqué/écarté).

# RÈGLES NON NÉGOCIABLES
1. **Vérif navigateur OBLIGATOIRE par jeu touché** : build vert PUIS Playwright réel —
   `chromium.launch({ channel: 'msedge' })` (le channel chrome ÉCHOUE en headless sur ce PC),
   viewport 414×896, depuis `http://localhost:5174/c?table=7`, choisir « Solo » dans le dialog
   (défaut « Ensemble » = inscription), et pour les jeux hot/new/multi/casino injecter AVANT
   navigation : `localStorage['creorga-guest-client-profile-v1']` (voir tests-qa/smoke-maxiburger.mjs).
   Clics sur canvas : `{ force: true }` (overlays HUD). Exige 0 erreur console (401/500/429 backend
   tolérés). Un jeu non testé = étape non finie (voir règle 7 pour l'exception outillage).
2. Non-régression : après tout changement de GameShell/GamesSection/juice/originalsShared/i18n,
   rejoue 2 des smoke-tests existants (tests-qa/).
3. Git : commits conventionnels FR, un par jeu ou par sous-étape ; push après chaque étape ;
   `git config user.name "LB7436"` / `user.email "bryanl1994.bl@gmail.com"` si absent.
   **Plan B git** : si `git pull` échoue (divergence/auth), NE fais ni `reset --hard` ni rebase
   interactif ; travaille sur l'état local et note-le dans SUIVI-JEUX.md. Si `git push` échoue,
   réessaie UNE fois après `git pull --rebase` non interactif ; en cas de nouvel échec, continue
   en local et signale-le dans le rapport final.
4. Fichiers < 800 lignes (les nouveaux), pas de console.log, pas de nouveaux `any`, immutabilité.
5. NE TOUCHE PAS : `apps/backend/prisma/migrations/`, `.env*`, POS/CRM/factures/superadmin.
   Backend : uniquement `routes/gameScores.ts` si strictement nécessaire.
6. Le formateur/linter reformate les fichiers à l'écriture : re-vérifie les numéros de ligne avant
   tout sed par plages ; préfère les remplacements par chaîne exacte.
7. **Boucles bornées (prime sur la règle 1)** : si TOUTE vérification navigateur (smoke test OU test
   par jeu des étapes 4-8) échoue 3 fois pour une raison d'outillage (timeout Playwright, port,
   msedge, sélecteur…) et non un bug produit : marque le jeu « ✅ (vérif navigateur partielle —
   outillage) » dans SUIVI-JEUX.md, l'étape COMPTE comme finie, continue. Maximum 3 tentatives par
   test, jamais plus.
8. **Hooks locaux (ECC/GateGuard)** : le premier Bash/Edit d'une session peut être bloqué par un
   hook demandant de « présenter des facts ». Ce n'est PAS une erreur produit : présente les facts
   demandés dans ta réponse puis relance la MÊME commande. Si les blocages sont systématiques,
   lance les commandes avec `ECC_GATEGUARD=off`.

# FIN DE SESSION
Quand SUIVI-JEUX.md est tout coché (ou budget/contexte épuisé) : mets à jour SUIVI + QA-REPORT.md,
commit + push final, puis rapport : **tableau par jeu — score de REVUE-JEUX-DETAIL.md → statut
(corrigé / partiel / écarté), une ligne par jeu, sans re-noter les jeux** ; liste des commits ;
ce qui reste le cas échéant ; recommandation pour la suite (déploiement Vercel, P0 backend).

## ===== FIN DU PROMPT =====
