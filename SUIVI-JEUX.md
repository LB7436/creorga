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

## Étape 6 — CASTLE RUSH (C1, titre phare) ⬜

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
- [ ] Reste : polish (états vides, accents FR épars), Web Worker IA échecs (perf), complétude Rami/Rummikub (jokers, manipulation de table), + jeux « à décider » Erreur 11 / Run21 / TriTours (refondre ou retirer du catalogue — décision produit) — tous des enhancements/décisions, plus aucun bug bloquant
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
