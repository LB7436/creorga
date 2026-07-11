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
- [ ] A2 suite : brancher sfx/buzz dans GameOverModal (feedback victoire/défaite global)

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

## Étape 4 — Phase A3→A7 ⬜
Scores serveur généralisés · i18n jeux · découpage CreorgaOriginals en 6 fichiers + makeLazyGame ·
primitives UI · progression/XP.

## Étape 5 — SERVICE !, GLOUTON, L'ADDITION (C4, C3, C5) ⬜

## Étape 6 — CASTLE RUSH (C1, titre phare) ⬜

## Étape 7 — Lot D1 catastrophes ⬜
Rami, Rummikub, Poker (side-pots), Farkle, Bingo, fusion Basket, Run21/TriTours terminer ou retirer.

## Étape 8 — Lots D2+D3 ⬜
Fixes par jeu de REVUE-JEUX-DETAIL.md (setInterval→useGameLoop, cibles 44 px, IA, règles) + polish.

---
### Notes techniques pour la reprise
- Serveurs : `docker compose -f docker-compose.dev.yml up -d` puis backend (`npm run dev --workspace=apps/backend`, port 3002) et web (`npm run dev --workspace=apps/web`, port 5173/5174).
- Test navigateur sans extension : Playwright avec `chromium.launch({ channel: 'msedge' })` (le channel 'chrome' échoue en headless sur ce PC).
- Dans le dialog de lancement, le mode par défaut est « Ensemble » → choisir « Solo » pour tester sans inscription ; les jeux hot/new/multi/casino exigent un profil.
- Le linter reformate les fichiers à l'écriture : toujours re-vérifier les numéros de ligne avant un sed par plages.
