# SUIVI — Exécution du plan Jeux v6 « Arcade »

> Fichier de reprise : chaque session coche ici ce qui est terminé et reprend à la première case vide.
> Référence : [PLAN-ACTION-JEUX.md](PLAN-ACTION-JEUX.md) + [REVUE-JEUX-DETAIL.md](REVUE-JEUX-DETAIL.md).

## Étape 0 — Quick-wins ✅ (2026-07-10, session Fable)
- [x] Fix `onBack` jamais passé aux jeux (ActiveGameView → GameShellProvider + prop)
- [x] TD : suppression shadow map inutile (+20-30 % perf GPU mobile)
- [x] TD : fix transparence forcée des tours (opacité 1 par défaut, estompe seulement les non-sélectionnées)
- [x] TD : lerp d'angle normalisé (tourelles ne font plus de tour complet)
- [x] Suppression code mort : BasketGame + BilliardsGame 3D de CreorgaOriginals (−300 lignes, jamais câblés)
- [x] Accents français TD (Démarrer, Dégâts, Portée, Défense, Équilibre, Améliorer…)
- [x] Vérifié : build vert + test Playwright (lancement Snake, bouton ← interne fonctionnel, 0 erreur console)

## Étape 1 — Socle (Phase A1+A2) ✅ partiel (2026-07-10)
- [x] `games/lib/GameShell.tsx` : contexte { onBack, difficulty, playMode, profile, tableId } + useShellScore
- [x] `games/lib/juice.ts` : sons WebAudio synthétisés (sfx.*), haptique (buzz.*), particules poolées,
      screen-shake, hit-stop, easings, damp, setupCanvas DPR, useGameLoop (pause auto visibilitychange)
- [x] Câblage : ActiveGameView passe onBack + difficulté + profil + table à tous les jeux
- [x] A2 suite : GameOverModal branché sur sfx/buzz (fait avec l'étape 2)

## Étape 2 — MAXI BURGER (Phase C2) ✅ (2026-07-11)
- [x] MaxiBurgerGame.tsx (balancier, découpe, PARFAIT/combos, défi de table à graine quotidienne)
- [x] Catalogue + lazy map + test Playwright complet (tests-qa/smoke-maxiburger.mjs)
- [x] GameOverModal branché sur sfx/buzz (reliquat étape 1)

## Étape 3 — Refonte Tower Defense (Phase B) ✅ (2026-07-11)
- [x] B1 : temps simulé unifié (fix bug 2x/pause), reliquat cooldown
- [x] B2 : caméra portrait, placement 2 taps tactile, cibles 44px, barre scrollable, reset confirmé
- [x] B3 : 15 vagues, boss Overlord (aura soin + spawn à la mort), preview vague, countdown 18s + bonus anticipé, intérêts 12%, anti-air, priorités de ciblage, 8 branches niv.4, étoiles + méta-boutique, records/difficulté
- [x] B4 : dégâts flottants, flash hits, sons/vibrations, shake, vignette fuite, score serveur
- [x] Test Playwright (tests-qa/smoke-td.mjs) : 7/7 verts

## Étape 4 — Phase A3→A7 🔶 partiel (2026-07-11)
- [x] `makeLazyGame` : les 39 entrées de GAME_COMPONENTS ont `.preload` -> préchargement au clic actif partout (avant : 1 seul jeu)
- [x] Backend gameScores.ts durci : zod (plages/longueurs/gameId), sanitization anti-balises, rate-limit 30/min (vérifié : 400/429 live)
- [x] onBack aligné optionnel (Blackjack, Solitaire, Chess)
- [x] `useGameScore` auto-remplit nom+table (profil guest + ?table=) -> tout jeu sur ce hook envoie un score identifié (vérifié : leaderboard maxiburger montre « Testeur »/table 7)
- [x] Découpage CreorgaOriginals -> originalsShared + 6 fichiers-jeux (7 chunks distincts, vérifié Playwright)
- [x] Migration des 31 jeux vers useGameScore (id catalogue + legacyKey pour migration record) + fix ids basket3d/billard — build vert tsc+vite, commit d9e35d4
- [x] i18n : GameOverModal (écran de fin de CHAQUE jeu) traduit FR/EN/DE/PT (vérifié Playwright lang=en)
- [x] i18n 4b-1 : 97 clés `games_*` (FR/EN/DE/PT) ajoutées dans i18n.ts, tsc strict vert, commit cf6cc5f (rewiring de GamesSection = 4b-2, pas encore fait)
- [ ] i18n 4b-2 : rewiring GamesSection (rethread `t`, split en games/hub/) + catalog `Record<GuestLang,string>`
- [ ] Primitives UI partagées · progression/XP profil

**Reste étape 4** : migration scores des jeux legacy + i18n + primitives/XP (gros volume, à faire en Opus high sur une session dédiée).

## Étape 5 — SERVICE !, GLOUTON, L'ADDITION (C4, C3, C5) ⬜

## Étape 6 — CASTLE RUSH (C1, titre phare) ✅ (2026-07-14)
- [x] **Castle Rush** (`castlerush`) — nouveau jeu canvas, **distinct du Tower Defense** (aucune tour, tout au TAP) : 3 couloirs d'assaillants → tape-les (soldats 1 coup / brutes 3 / boss toutes les 5 vagues), huile bouillante (5 or) balaie l'écran, PV de château, vagues croissantes, difficulté via `useGameShell`. Kit `juice` (canvas DPR, `useGameLoop` pause-onglet-caché, particules, shake, sons), `useGameScore('castlerush')`, `GameOverModal`. Enregistré catalog (available:true/new) + GAME_COMPONENTS. `tsc -b` vert ; monté + carte + lancement OK (rendu en pause quand l'onglet est en arrière-plan = voulu). Commit `a71f0cd`.

## Étape 7 — Lot D1 catastrophes 🔶 partiel (2026-07-12, session Opus)
- [x] Farkle : Hot Dice joueur (relance après tout scoré), triche CPU (re-score des dés gardés), CPU-jamais-Farkle — commit c76a998
- [x] Blackjack : double gagnant payé à mise simple (closure périmée → betAmount en paramètre), timers non nettoyés (helper later + cleanup) — commit b98be28
- [x] 421 : hiérarchie des rangs (carte haute chevauchait paires → −1000), distribution jetons (perdant recevait SA combinaison au lieu de celle du gagnant) — commit 95c3490
- [x] Poker COMPLET : évaluateur (kickers + rang des groupes + quinte au 5) + tours d'enchères (flag hasActed) + side-pots all-in (répartition par paliers) — commits d3b1698, 00f119d
- [x] Motus : liste de mots nettoyée (720 vrais mots FR 5 lettres, fin des mots-poubelle type « ABCDE ») — commit a6e2fa1
- [x] Reversi : gel de partie (soft-lock du passage de tour) + double-comptage StrictMode — commit c4e56fd
- [x] Basket : visée latérale (vx dx/40→dx/8) + validation du panier (traversée du plan de l'anneau) — commit e645e79
- [x] Bingo : effets hors updater setCalled (StrictMode), Fisher-Yates, timers nettoyés, confetti mémoïsé, numéro visible sous marquage, saveStats try/catch — commit 6896cdc
- [x] Rummikub : duplication de tuiles + score de victoire faux + timeouts (refs synchrones) — commit 2c6a051
- [x] Rami : duplication de cartes + score de victoire faux + timeouts (refs synchrones) — commit 29ecdc7
- [x] Billard : déjà réécrit (v4.9, vraie physique 2D canvas, collisions/fautes/score) — bug « factice » de la revue obsolète, aucun changement nécessaire
- [x] Lot 5 jeux en parallèle (agents) : **2048** (updater impur/StrictMode, undo victoire, timers, score abandon — 3f297d7), **Snake** (file de virages, pause visibilitychange, timers, touch-action, 44px — 50a8faf), **Échecs** (undo décalé, statut à l'undo, modal victoire/défaite, timer IA, cases+touch — ab41d95), **Simon** (timers/jeton, séquences fantômes, audio iOS singleton — a080533), **Réaction** (effet dans le rendu, faux record, pointer-down, horloge monotone, fuites timers — 3b618c5)
- [x] **WordScramble** : mot anglais + mot accentué + indice qui révèle la réponse — 731374e
- [x] Lot 2 de 5 jeux en parallèle (agents) : **Mastermind** (friction 1er tour, auto-scroll, pickColor, confetti, timer ; indices audités OK — 2cd58eb), **Memory** (timeouts orphelins, post-unmount, effets updater, injectCSS — 7457412), **Taquin** (compteur de coups/StrictMode, swipe post-victoire, 44px ; solvabilité auditée OK — 3dcda81), **Higher/Lower** (égalité, exploit As, valeurs cartes, doublon, UI — 3ace0f4), **Mensch/Ludo** (colonne d'arrivée→victoire, timers CPU, tour bonus, captures — 65676cd)
- [x] **QuizGame** vérifié : 120 questions, 0 injouable (aucune réponse absente des options) — sain, aucun changement
- [x] **Run 21** COMPLÉTÉ et PUBLIÉ (available:true) : mécanique « colonne à 21 se vide » + fin de partie + GameOverModal + useGameScore — commit 3844a19 — ✅ smoke-testé navigateur (11 coups → fin de partie, modal score+record, rejouer/retour OK)
- [x] **Tri-Tours** COMPLÉTÉ et PUBLIÉ (available:true) : victoire/blocage + combos + GameOverModal + useGameScore — commit 68e94fc — ✅ smoke-testé navigateur (victoire tours vidées → modal, rejouer/retour OK) + fix bonus +200 affiché
- [x] **Erreur 11** COMPLÉTÉ et PUBLIÉ (available:true) : les 11 différences visuelles existaient déjà dans BistroScene (jeu pas factice) ; ajout score de précision (trouvées − ratés) + GameOverModal + useGameScore — commit faafa55 — ✅ smoke-testé navigateur (11 trouvées + ratés, score précision 305, modal/rejouer/retour OK)
- [x] **Les 3 jeux cachés « à décider » sont désormais tous publiés et complets** (Run21, Tri-Tours, Erreur 11) → tout ce qui doit être jouable l'est
- ⛔ **NE PAS publier** les 3 jeux encore `available:false` : **Machine à sous** + **Roulette** = cachés pour raison LÉGALE (réglementation jeux d'argent, à valider juridiquement) ; **Tetris** = placeholder roadmap (+ marque). Décisions métier/juridiques — ne pas les forcer à available:true.
- [x] **Smoke-tests navigateur des 3 jeux publiés FAITS** (2026-07-12, session Opus) — les 3 lancent, se jouent jusqu'à la fin (Erreur 11 : 11/11 ; Run 21 : plus de placement ; Tri-Tours : victoire tours vidées), GameOverModal + rejouer + retour OK, 0 exception JS. **2 bugs trouvés & corrigés** : (a) `MiniCard` imbriquait `<button>` dans `<button>` sur Run 21 → rendu `<div>` quand pas d'`onClick` (arcade3d.tsx, corrige TOUS les jeux de cartes) ; (b) Tri-Tours n'affichait pas le bonus +200 de victoire dans le score final (record devenait > score) → `setScore(winScore)`. Build vert tsc+vite.
- [x] **Balayage non-régression navigateur de TOUT le catalogue jouable** (2026-07-12, ~38 jeux, harnais `tests-qa/smoke-sweep.mjs`) — chaque jeu lance + s'interagit (taps canvas, flèches, clics boutons) : **0 crash, 0 exception JS, 0 erreur console, 0 imbrication `<button>`**. Les correctifs code de la session précédente tiennent au runtime. (Interactions génériques — pas une re-validation complète des règles de chaque jeu.)
- [x] **Validation runtime APPROFONDIE des jeux à risque** (2026-07-12) : **Blackjack** (revue money-logic + main réelle jouée — mise déduite au deal, égalité rembourse la mise → net 0 ✓ ; double-down passe `bet+extra` explicitement à `settle`) et **Reversi** (revue du fix soft-lock `cpuNudge` + **partie complète jouée 4→64/64**, alternance des tours sans gel, victoire 34–30). Aucun bug trouvé. + revue de code ciblée **421** (hiérarchie des combinaisons : carte-haute `a*100+b*10+c−1000` bien sous toutes les autres bandes ✓ ; jetons donnés = combo du GAGNANT ✓) et **2048** (`handleUndo` restaure `won`/`continueAfterWin` → annuler le coup gagnant retire la bannière de victoire ✓). Tous corrects.
- [x] **Jokers Rami + Rummikub** (2026-07-12, feature) : 2 jokers par deck ; validation **joker-aware** (wildcard groupe/suite via `runWithJokersOK`, testé node **15/15**) ; joker = 10 pts (score/ouverture/pénalité, via value/number=10 ignoré par la validation) ; rendu **★** (`MiniCard` + `RummiTile`) ; l'IA Rami ne défausse jamais un joker. Testé navigateur : combinaison `[A♠, joker(=2♠), 3♠]` posée en Rami (14 pts) ; joker affiché en Rummikub. Build vert, 0 nouvelle erreur console, `nested:0`.
- [x] **Manipulation de table Rummikub** (2026-07-12, feature) : ajouter des tuiles du chevalet à une combinaison déjà posée (prolonger une suite / compléter un groupe), autorisé après l'ouverture ; combinaison cliquable (wrapper `pointerEvents:none` pour cliquer à travers les tuiles-boutons), validation via `isRummiMeld` (jokers inclus). Testé navigateur : combinaison **3→4 tuiles**, chevalet **11→10**, message OK. Build vert, `nested:0`, 0 erreur. (v1 = ajout ; le réarrangement libre split/recombine reste à faire.)
- [x] **Bingo — pointage manuel (daubing)** (2026-07-12, feature) : le joueur pointe lui-même ses numéros (mode **Manuel** par défaut) au lieu du marquage auto ; cases « à pointer » mises en évidence (pulsation), tap pour valider, compteur de **Ratés** (tap d'un n° non tiré), bascule **Auto** conservée (rattrapage des cases déjà tirées). Modèle de marquage : numéro → case (clé `r,c`), validation `checkWin` inchangée. Polish : ligne d'instruction / état vide, toggles **Pointage** + **Tirage** étiquetés, rôles ARIA sur les cases. Testé navigateur : 16 tirés → 0 auto-marqué en Manuel, tap→pointé, misdaub→Ratés+1, bascule Auto rattrape 5 cases, victoire « Ligne complète », restart→manuel, **0 erreur console, `nested:0`**. Commit `51daf82`, `tsc -b` vert.
- [x] **Rummikub — manipulation LIBRE de la table** (2026-07-12, feature) : scinder/recombiner ses combinaisons posées — sélection de tuiles du chevalet OU des combis, « Nouvelle combi. » / « + ici », modèle **transactionnel** (table temporairement invalide → contour rouge ; « Valider le tour » commit si tout valide + ≥30 à l'ouverture + ≥1 tuile jouée du chevalet ; « Annuler » restaure le snapshot de début de tour). IA : le CPU prolonge désormais ses propres combinaisons avec ses tuiles (exploite la table). Testé navigateur : formation combi (table 0→1, chevalet 14→11), **scission d'une tuile hors d'une combi posée** (table 1→2, chevalet inchangé), garde de validité (« Combinaison 1 invalide » bloque le commit), Annuler restaure (table→0, chevalet→14), **0 erreur console, `nested:0`**. Commit `4857667`, `tsc -b` vert. (Commit valide + CPU-extension : vérifiés par tsc + revue — le rack RNG de ce run n'avait aucune combi ouvrable à 30 pts pour un commit runtime complet.)
- [x] **Échecs — IA dans un Web Worker** (2026-07-12, perf/qualité) : le minimax (profondeur 3 + quiescence 2) tournait en **synchrone** sur le thread principal → l'onglet **gelait** pendant la réflexion du CPU. Moteur PUR extrait dans `chessEngine.ts` (types, génération de coups, apply, éval, minimax/quiescence, getBestMove, computeCaptured), partagé par le composant (validation + rendu) et `chess.worker.ts` qui calcule **hors du thread UI**. Composant : `postMessage` la position → applique la réponse dans `onmessage` ; `pendingRef` invalide un résultat périmé après « nouvelle partie » ; **fallback synchrone** si le worker ne démarre pas. Testé navigateur : worker chargé (`chess.worker.ts?worker_file&type=module` — pas le fallback), 2 cycles joueur→IA (e2e4, Nf3) avec réponse CPU + retour du tour, **0 erreur console, `nested:0`**. Commit `7a068e5`, `tsc -b` vert.
- [x] **Polish accents FR** (2026-07-12) : messages/labels correctement accentués sur **Rummikub, Rami, Mahjong, Run 21, Erreur 11** (label « fenêtre »). Balayage grep de TOUT le dossier `games/` → **plus aucune chaîne UI non accentuée** ; les « gagne »/« parfait »/« sortie »/« prochaine » restants sont du français correct (non touchés), les autres occurrences sont des commentaires de code. Commits `b141599`, `8129873`, `7281fed`, `tsc -b` vert.
- [x] **Échecs — difficulté IA réglable** (2026-07-12, feature) : la difficulté choisie au lancement pilote la **profondeur minimax** (facile=1 / moyen=2 / difficile=3, défaut 3), transmise via le Web Worker ; badge « IA · <niveau> » dans l'entête. `getBestMove(..., depth=3)` ; consomme `useGameShell().difficulty` (aiDepthRef). Testé navigateur : lancement « difficile » → badge « IA · Difficile » + coup CPU calculé en worker (UI non bloquée), `nested:0`. Commit `319700f`.
- [x] **Hub état vide + polish parallèle** (2026-07-12) : état vide du catalogue amélioré (message contextuel nommant la recherche + bouton « Réinitialiser les filtres », commit `12bd177`) ; accents FR **ChatSection + GuestHome** (12 corrections, agent parallèle, commit `e471337`) ; passe micro-polish sur 6 jeux (Simon/Snake/2048/Memory/Mastermind/Hangman) via agent → **déjà propres, 0 édition** (catalogue confirmé sain).
- [x] **Rummikub — table PARTAGÉE joueur/CPU** (2026-07-12, feature — la vraie règle) : fin des melds joueur/CPU séparés (ceux du CPU étaient invisibles). Une seule table **commune et visible** : le CPU pose/prolonge dessus, le joueur peut réarranger **n'importe quelle** combinaison (la sienne ou celle du CPU) via le moteur de manipulation libre. Score repensé (melds sans propriétaire) : `playerScore` = cumul des points meldés depuis le chevalet + 50 si victoire − main restante. Testé navigateur : subtitle « table PARTAGÉE » + stat Score ; le CPU pose sur la table visible (rack 14→12) ; sélection d'une tuile CPU → « + ici »/« Nouvelle combi. » actifs ; `nested:0`, 0 erreur. Commit `ed7176d`.
- [ ] Reste : **plus rien** côté jeux (le dernier chantier — table partagée — est fait). Prochain vrai chantier = **backend (P0 Postgres/Stripe)**, hors périmètre jeux.
- [ ] Run21 / TriTours : terminer règles → available:true OU retirer ; Erreur 11 : refondre OU available:false
- Note : Basket `basket3d` + Billard `billard` — ids de score déjà corrigés en 4a (commit d9e35d4) ; reste fixes gameplay REVUE

## Étape 8 — Lots D2+D3 🔶 partiel (2026-07-12, session Opus)
- [x] MiniCard (arcade3d) : trèfle rouge / cœur 'H' noir → couleur correcte dans TOUS les jeux de cartes — commit c3a44bf
- [x] Bataille (WarGame) : freshDeal() appelé 2× → 2 paquets différents (cartes dupliquées) → un seul mélange — commit c3a44bf
- [x] Quiz : réponse « Saké » accentuée introuvable dans les options → question injouable — commit c3a44bf
- [x] Hangman : mots imprenables (accents/tirets) + indice tueur (fausse lettre / instakill) — commit cef779b
- [x] Puissance 4 : plateau responsive (overflow 320px, colonnes coupées) — commit 518e03c
- [x] Mémoire des nombres : bouton « J'ai mémorisé » (fin des 48s d'attente passive) — commit 2b176f0
- [x] Démineur : pose de drapeau au tactile (mode drapeau + appui long 350ms + vibration) — bloquant mobile levé — commit c9398bf
- [x] Solitaire : glisser-déposer tactile (pointer events + touch-action) — commit 60d3e56
- [ ] Reste REVUE-JEUX-DETAIL.md : setInterval→useGameLoop (Snake/2048/Simon/Memory/Reaction/Motus), cibles 44px (Échecs/Taquin), Motus (liste de mots corrompue ~250 entrées), IA (reversi coins, P4 profondeur), règles (solitaire re-pioche, scopa primiera) + polish accents. (Note : Yahtzee bonus 63 déjà correct ; Scopa images présentes)

---
### Notes techniques pour la reprise
- Serveurs : `docker compose -f docker-compose.dev.yml up -d` puis backend (`npm run dev --workspace=apps/backend`, port 3002) et web (`npm run dev --workspace=apps/web`, port 5173/5174).
- Test navigateur sans extension : Playwright avec `chromium.launch({ channel: 'msedge' })` (le channel 'chrome' échoue en headless sur ce PC).
- Dans le dialog de lancement, le mode par défaut est « Ensemble » → choisir « Solo » pour tester sans inscription ; les jeux hot/new/multi/casino exigent un profil.
- Le linter reformate les fichiers à l'écriture : toujours re-vérifier les numéros de ligne avant un sed par plages.
