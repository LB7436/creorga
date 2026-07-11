# PROMPT KICKOFF — Suite du plan Jeux Creorga v6 « Arcade »

> **Comment l'utiliser** : ouvre une session Claude Code dans
> `C:\Users\Bryan\OneDrive\Desktop\creorga`, règle le modèle/effort (voir tout en bas),
> puis copie-colle TOUT le bloc « ===== PROMPT À COLLER ===== » ci-dessous.
> Le prompt est **reprenable** : s'il s'interrompt, recolle-le, il repart via SUIVI-JEUX.md.

---

## ===== PROMPT À COLLER =====

ultracode

Tu poursuis le plan **PLAN-ACTION-JEUX.md** (jeux de l'espace client Creorga), en t'appuyant sur
**REVUE-JEUX-DETAIL.md** (bugs ligne par ligne des 43 jeux) et **SUIVI-JEUX.md** (avancement).
Objectif : **la meilleure qualité possible**, pas la rapidité. Travaille en autonomie, ne pose pas
de question, prends les décisions recommandées par le plan. Le budget est confortable : privilégie
l'exhaustivité et la vérification adverse.

### 0. Reprise (À FAIRE EN PREMIER)
1. Lis `SUIVI-JEUX.md` et reprends à la première case non cochée.
   Déjà FAIT (ne pas refaire) : étape 0 (quick-wins), étape 1 (GameShell + kit juice
   `games/lib/GameShell.tsx` et `games/lib/juice.ts`), étape 2 (Maxi Burger), étape 3 (refonte
   Tower Defense), et étape 4 partielle (préchargement `makeLazyGame`, backend `gameScores.ts`
   durci zod+rate-limit, découpage CreorgaOriginals en `originalsShared`+6 fichiers, identité auto
   sur `useGameScore`, i18n de GameOverModal FR/EN/DE/PT).
2. Relance l'environnement si besoin : `docker compose -f docker-compose.dev.yml up -d`,
   backend `npm run dev --workspace=apps/backend` (port 3002), web `npm run dev --workspace=apps/web`
   (il prend 5173 ou 5174 — vérifie les logs).

### ORDRE D'EXÉCUTION (une étape = au moins un commit + push)

**Étape 4 — FIN (les 3 gros restants)**
- **4a. Migration scores des ~28 jeux legacy** vers `useGameScore`. NON mécanique : pour CHAQUE jeu,
  identifie le vrai score et le moment de fin de partie, remplace la clé localStorage ad-hoc
  (`2048_best`, `simon_best`, `bingo_stats`…) par `const { best, submit } = useGameScore('<id>')`
  et appelle `submit(score)` à la fin. L'identité (nom+table) est déjà auto-remplie par le hook.
  Vérifie que le leaderboard `/api/game-scores/<id>/top` reçoit bien le score. Liste des jeux
  concernés : voir `grep -L useGameScore *Game.tsx Hangman.tsx Game2048.tsx Game421.tsx`.
- **4b. i18n du hub + catalogue**. `GamesSection.tsx` (1 500 lignes) n'a AUCUN accès à la langue :
  importe `useGuestLang`, étends `i18n.ts` (namespace `games.*`), rethread `t` dans les
  sous-composants (GameLaunchDialog, cartes, recherche, succès), traduis `catalog.ts`
  (noms + descriptions) et `progress.ts` (`timeAgo`). Cible FR/EN/DE/PT. Idéalement, découpe aussi
  GamesSection (>800 lignes) en GameCard / GameLaunchDialog / ActiveGameView.
- **4c. Primitives UI partagées + XP**. Crée `games/lib/ui.tsx` (GameButton, GameHUD score/record/
  chrono, Dice, PlayingCard, useCountdown, thème light) et migre-y les réimplémentations.
  Ajoute XP/niveau dérivé de `progress.ts` (totalPlays/totalSeconds) + succès événementiels
  (toast + confetti au déblocage) rattachés au profil guest.

**Étape 5 — 3 nouveaux Creorga Originals** (plan §C4, C3, C5), dans cet ordre :
- SERVICE ! (sort puzzle du serveur, niveaux solvables générés) ;
- GLOUTON (merge physique type Suika — `npm i matter-js -w apps/web` + `@types/matter-js`,
  cercles uniquement, palier final = plat signature configurable) ;
- L'ADDITION (découpe de parts exactes, géométrie de polygones).
Tous : portrait, une main, GameShell + juice + useGameScore, i18n via le namespace posé en 4b.

**Étape 6 — CASTLE RUSH** (plan §C1, le titre phare, vise 8/10). Lane battler solo vs CPU :
élixir 5/10 régén 2,8 s → x2 à 2:00, deck 8 cartes (main 4 + next), triangle tank/swarm/splash + air,
IA FSM DEFEND/ATTACK/SAVE (difficulté = réaction + précision counters + multiplicateur élixir),
1 lane tug-of-war, 2 tours + château, mort subite, skins brasserie. Simulation hors React
(useRef + rAF), rendu canvas, cartes en DOM, `touch-action:none`, gestion `pointercancel`.

**Étape 7 — Lot D1 (catastrophes)** : refontes Rami / Rummikub / Poker (side-pots) / Farkle / Bingo,
fusion des 2 Basket, Run21+TriTours terminer ou retirer. Détails dans REVUE-JEUX-DETAIL.md.

**Étape 8 — Lots D2+D3** : appliquer les fixes par jeu de REVUE-JEUX-DETAIL.md
(setInterval→useGameLoop, cibles 44 px, IA échecs/reversi/puissance4, règles solitaire/blackjack/
yahtzee/scopa), puis polish global (thème light, états vides, accents).

### QUALITÉ (budget confortable — sois exigeant)
- Pour les gros morceaux (Castle Rush, refontes de jeux, migration en masse), **utilise des Workflows
  multi-agents** : fan-out pour couvrir, puis **vérification adverse** de chaque changement avant commit.
- Après CHAQUE jeu touché : `npm run build --workspace=apps/web` doit passer, PUIS test navigateur
  réel via Playwright (`chromium.launch({ channel: 'msedge' })` — le channel chrome échoue headless
  sur ce PC), lancé depuis `/c?table=7`, mode « Solo » dans le dialog (le défaut « Ensemble » exige
  l'inscription ; pour les jeux hot/new/multi/casino, injecte un profil via
  `localStorage['creorga-guest-client-profile-v1']` comme dans tests-qa/smoke-*.mjs). Joue plusieurs
  interactions, exige **0 erreur console** (401/500/429 backend tolérés). Un jeu non testé = pas fini.
- Non-régression : si tu touches GameShell/GamesSection/juice/originalsShared, re-teste 3 jeux au hasard.
- Commits conventionnels FR (`feat(games):`, `fix(td):`…), un par étape/jeu, push sur origin/master.
- Fichiers < 800 lignes, pas de `console.log`, pas de nouveaux `any`, immutabilité, toute chaîne
  visible via i18n dès que 4b a posé le namespace.
- NE TOUCHE PAS : `apps/backend/prisma/migrations/`, `.env*`, la logique POS/CRM/factures.
  Backend : seulement `routes/gameScores.ts` si nécessaire.
- Le linter reformate à l'écriture : re-vérifie les numéros de ligne avant tout sed par plages.

### DÉFINITION DE « TERMINÉ »
SUIVI-JEUX.md entièrement coché · build vert · les 5 nouveaux jeux (Maxi Burger + 4) jouables sur `/c`
avec son/vibration/score serveur · TD refondu · leaderboard couvrant tout le catalogue · hub i18n
FR/EN/DE/PT · rapport final avant/après par jeu + liste des commits.

## ===== FIN DU PROMPT =====

---

## Quel modèle / quel effort — tu veux le meilleur résultat, budget OK

**Recommandation globale : Fable 5 + effort `max`, avec le mot-clé `ultracode`** (déjà en tête du
prompt) pour activer l'orchestration multi-agents. Fable 5 est le modèle le plus capable disponible ;
`max` donne le raisonnement le plus profond ; `ultracode` fait fan-out + vérification adverse pour
la meilleure qualité. C'est le trio « qualité maximale ».

Détail par étape si tu veux moduler :

| Étape | Modèle | Effort | Pourquoi |
|---|---|---|---|
| 4a migration scores | Fable 5 (ou Opus 4.8) | high | volume, mais chaque jeu demande un jugement sémantique |
| 4b i18n hub + découpe | Fable 5 | high | rewiring transverse, attention aux régressions |
| 4c primitives + XP | Fable 5 | high | refactor transverse |
| 5 (3 jeux casual) | **Fable 5** | **max** | génération de niveaux + physique Matter.js |
| 6 CASTLE RUSH | **Fable 5** | **max** | IA, équilibrage élixir/counters, qualité 8/10 exigée |
| 7 refontes D1 | Fable 5 | high | règles complexes (poker side-pots, rami) |
| 8 fixes D2/D3 | Opus 4.8 | medium-high | fixes listés, peu d'inconnues |

**En pratique** : règle `/model claude-fable-5`, effort `max`, laisse le mot `ultracode` en tête du
prompt, et colle. Le modèle montera lui-même des workflows multi-agents sur Castle Rush et les
refontes, et vérifiera chaque jeu au navigateur avant de committer.
