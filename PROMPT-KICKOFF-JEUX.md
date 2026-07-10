# PROMPT KICKOFF — Suite du plan Jeux Creorga v6 « Arcade »

> Copier-coller TOUT ce qui suit dans une session Claude Code ouverte dans
> `C:\Users\Bryan\OneDrive\Desktop\creorga`.
> Modèle conseillé : voir tableau en bas de fichier. Le prompt est **reprenable** :
> si la session s'arrête, relancer le même prompt — il reprend via SUIVI-JEUX.md.

---

## MISSION

Poursuis l'exécution du plan **PLAN-ACTION-JEUX.md** en t'appuyant sur **REVUE-JEUX-DETAIL.md**
(bugs ligne par ligne des 43 jeux) et **SUIVI-JEUX.md** (état d'avancement).
Travaille en autonomie : ne pose aucune question, prends les décisions recommandées par le plan.

## ÉTAT & REPRISE (à faire EN PREMIER)

1. Lis `SUIVI-JEUX.md` → reprends à la première étape non cochée (les étapes 0 et 1 sont déjà faites :
   GameShell + kit juice existent dans `apps/web/src/pages/guest/games/lib/`).
2. Relance l'environnement si besoin : `docker compose -f docker-compose.dev.yml up -d`,
   backend `npm run dev --workspace=apps/backend` (port 3002), web `npm run dev --workspace=apps/web`.
3. Après CHAQUE étape terminée : coche-la dans SUIVI-JEUX.md, commit, continue.

## ORDRE D'EXÉCUTION (une étape = au moins un commit)

- **Étape 2 — MAXI BURGER** (plan §C2) : stack de précision, balancier, tranches rognées, combo
  perfect, duel même-seed. Utilise `useGameShell()`, `useShellScore('maxiburger')`, `sfx`/`buzz`/
  `createParticles`/`useGameLoop` de `games/lib/juice.ts`. Entrée catalogue + lazy map GamesSection.
- **Étape 3 — Refonte Tower Defense** (plan §B1→B4) : temps simulé unifié D'ABORD (le bug 2x),
  reliquat de cooldown, caméra portrait responsive, placement 2 taps, preview de vague, bonus vague
  anticipée, intérêts d'or, 15 vagues + boss, armure lisible, anti-air réel, priorité de ciblage,
  branche d'upgrade niv.4, étoiles/meta, juice complet.
- **Étape 4 — Phase A3→A7** (plan §A3-A7) : useShellScore dans les 38 jeux (migration clés localStorage),
  leaderboard par jeu + socket, validation backend gameScores.ts, i18n jeux (FR/EN/DE/PT),
  découpage CreorgaOriginals en 6 fichiers + factory makeLazyGame avec .preload,
  primitives UI partagées, progression/XP rattachée au profil.
- **Étape 5 — SERVICE ! puis GLOUTON puis L'ADDITION** (plan §C4/C3/C5). Matter.js pour Glouton
  (`npm i matter-js -w apps/web` + types). Générateur de niveaux solvables pour Service !.
- **Étape 6 — CASTLE RUSH** (plan §C1, le titre phare — vise 8/10) : élixir 5/10 régén 2,8 s → x2 à 2:00,
  deck 8 cartes main 4 + next, triangle tank/swarm/splash + air, IA FSM DEFEND/ATTACK/SAVE avec
  difficulté = réaction + précision counters + multiplicateur élixir, 1 lane tug-of-war, 2 tours + château,
  mort subite, skins brasserie. Simulation hors React (useRef + rAF), rendu canvas, cartes en DOM.
- **Étape 7 — Lot D1** (plan §D1) : refontes Rami / Rummikub / Poker (side-pots) / Farkle / Bingo,
  fusion des 2 Basket, Run21+TriTours : terminer ou retirer.
- **Étape 8 — Lots D2+D3** : appliquer les fixes par jeu de REVUE-JEUX-DETAIL.md
  (setInterval→useGameLoop, cibles 44 px, IA échecs/reversi/puissance4, règles solitaire/blackjack/
  yahtzee/scopa), puis polish global (thème light, états vides).

## RÈGLES NON NÉGOCIABLES

1. **Vérification par jeu** : `npm run build --workspace=apps/web` doit passer, puis test navigateur
   réel via Playwright (`chromium.launch({ channel: 'msedge' })` — le channel chrome échoue headless
   sur ce PC) : lancer le jeu depuis `/c?table=7`, jouer plusieurs interactions, 0 erreur console.
   Dans le dialog de lancement choisir « Solo » (le mode par défaut « Ensemble » exige l'inscription).
   Un jeu non testé = étape non finie.
2. **Non-régression** : si tu touches GameShell/GamesSection/juice, re-teste 3 jeux existants au hasard.
3. **Commits** : conventional commits français (`feat(games): …`, `fix(td): …`), un par étape minimum ;
   push sur origin/master en fin de chaque étape majeure.
4. Fichiers < 800 lignes, pas de `console.log`, pas de nouveaux `any`, immutabilité,
   toute nouvelle chaîne visible passe par i18n (dès que l'étape 4 a posé le namespace `games.*`).
5. **Ne touche PAS** : `apps/backend/prisma/migrations/`, `.env*`, la logique POS/CRM/factures.
   Backend : seulement `routes/gameScores.ts` (validation + rate-limit).
6. Le linter reformate à l'écriture : re-vérifier les numéros de ligne avant tout sed par plages.

## DÉFINITION DE « TERMINÉ »

- SUIVI-JEUX.md tout coché · build vert · les 5 nouveaux jeux jouables sur `/c` avec son, vibration,
  score serveur · TD refondu (9 bugs + 8 mécaniques) · rapport final avant/après par jeu + liste des commits.

---

## Quel modèle / quel effort par étape

| Étape | Modèle conseillé | Effort | Pourquoi |
|---|---|---|---|
| 2 (Maxi Burger) | Fable 5 (ou Opus 4.8) | high | jeu simple, rode le socle |
| 3 (refonte TD) | **Fable 5** | **max** | moteur temps simulé + équilibrage = le plus piégeux |
| 4 (transverse) | Opus 4.8 suffit | high | mécanique répétitive, gros volume |
| 5 (3 jeux casual) | Fable 5 | high | génération de niveaux + physique |
| 6 (Castle Rush) | **Fable 5** | **max** | IA, équilibrage élixir/counters, qualité 8/10 exigée |
| 7-8 (lots D) | Opus 4.8 (fast ok) | medium-high | fixes listés, peu d'inconnues |
