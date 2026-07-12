# PROMPT DE REPRISE — Restant Jeux Creorga (après la grosse session de corrections)

> **Mode d'emploi** : nouvelle session Claude Code dans `C:\Users\Bryan\OneDrive\Desktop\creorga`,
> puis copie-colle TOUT le bloc entre `===== DÉBUT =====` et `===== FIN =====`.
> Reprenable : si la session s'arrête, recolle le même bloc — il repart de SUIVI-JEUX.md.

## ===== DÉBUT DU PROMPT =====

# CONTEXTE — CE QUI EST DÉJÀ FAIT (NE PAS REFAIRE)
La grosse session de corrections est terminée : **55+ commits poussés sur origin/master**
(LB7436/creorga, dernier = `51daf82`). État :
> **MàJ 2026-07-12 (session suite) :** smoke-tests navigateur des 3 jeux publiés FAITS ;
> validation runtime approfondie (Blackjack money-logic, Reversi soft-lock, Rami, + revue 421/2048) ;
> **balayage non-régression de TOUT le catalogue** (~38 jeux, 0 crash/exception/erreur/imbrication,
> harnais `tests-qa/smoke-sweep.mjs`) ; **2 bugs corrigés** (imbrication `<button>` dans MiniCard,
> bonus +200 victoire Tri-Tours non affiché) ; **3 features livrées** : jokers Rami/Rummikub +
> manipulation de table Rummikub (ajout de tuiles à une combinaison posée) + pointage manuel Bingo
> (daubing, commit `51daf82`). **Détail complet et à
> jour dans `SUIVI-JEUX.md`** — le lire en premier. Le « restant » P3 ci-dessous est actualisé.
- **~30 jeux corrigés (~65 bugs)** : Poker (évaluateur+enchères+side-pots), Rami, Rummikub,
  Reversi (soft-lock), Blackjack (double payout), 421, Farkle, Motus (720 mots), Hangman,
  Bingo, WordScramble, Basket, cartes (arcade3d), Bataille, Quiz, + **10 jeux via agents
  parallèles** (2048, Snake, Échecs, Simon, Réaction, Mastermind, Memory, Taquin, Higher/Lower,
  Mensch), + Démineur/Puissance 4/Solitaire (fixes tactiles), Mémoire des nombres.
- **3 jeux passés de cachés à LIVE et complétés** : `run21`, `tritowers`, `erreur11`
  (mécanique de jeu + fin de partie + useGameScore + GameOverModal ajoutés, available:true).
- Migration 4a (31 jeux → `useGameScore`) + i18n (97 clés `games_*`) + GameOverModal FR/EN/DE/PT.
- **Vérifiés déjà-sains, NE PAS RETOUCHER** : Billard (physique 2D canvas OK), Yahtzee (bonus 63 OK),
  Scopa (images OK), QuizGame (120 questions, 0 injouable).
- Tout est **build-vert** (`tsc -b` + `vite build`). **Aucun bug bloquant connu.**
Détail complet dans `SUIVI-JEUX.md` et `REVUE-JEUX-DETAIL.md`.

# INTERDICTIONS ABSOLUES
- **NE PAS publier** (garder `available: false`) : `slots` (Machine à sous) et `roulette` —
  cachés pour **raison LÉGALE** (réglementation jeux d'argent, décision juridique) ; `tetris` —
  placeholder roadmap. Ne jamais forcer leur `available:true`.
- NE PAS toucher : `apps/backend/prisma/migrations/`, `.env*`, POS/CRM/factures/superadmin.
- NE PAS re-corriger les jeux déjà traités sans preuve d'un nouveau bug.

# MISSION (par priorité)
## P1 — Smoke-tests navigateur des 3 jeux publiés — ✅ FAIT (2026-07-12)
> Les 3 jeux ont été smoke-testés au navigateur : lancement, jeu réel jusqu'à la fin, GameOverModal, rejouer, retour — tous OK, 0 exception JS. 2 bugs trouvés & corrigés : (a) MiniCard imbriquait `<button>` dans `<button>` sur Run 21 (rendu `<div>` sans onClick) ; (b) Tri-Tours n'affichait pas le bonus +200 de victoire. Détail dans SUIVI-JEUX.md. **Ne pas refaire.** (Section d'origine conservée ci-dessous pour référence.)
Pour `run21`, `tritowers`, `erreur11` : confirmer au navigateur qu'ils **se lancent**, se **jouent**
(plusieurs actions réelles), atteignent la **fin de partie** (GameOverModal s'affiche), **rejouent**,
avec **0 erreur console**. Ce sont des jeux qui passent maintenant devant les clients — c'est la
vérif runtime que la session précédente a différée par budget. Si un bug runtime apparaît, corrige-le.
- Points à valider spécifiquement :
  - **run21** : poser des cartes, une colonne à 21 pile se vide (+25), fin de partie quand plus
    aucun placement / pioche vide → GameOverModal + score.
  - **tritowers** : jouer une carte adjacente (±1), combo qui monte, victoire (tours vidées) OU
    blocage (aucune carte jouable + stock vide) → GameOverModal.
  - **erreur11** : cliquer les 11 différences (elles sont réelles dans BistroScene variant=right),
    un clic hors-cible incrémente « Ratés », les 11 trouvées → GameOverModal + score de précision.

## P2 — (optionnel) Smoke-tests des autres jeux modifiés cette session + polish
Rejouer 2-3 smoke-tests existants (`tests-qa/smoke-*.mjs`) pour non-régression. Polish léger :
états vides, accents FR épars. Pas de refonte.

## P3 — (enhancements, seulement si explicitement demandé — ce ne sont PAS des bugs)
✅ **FAIT (2026-07-12)** : jokers Rami/Rummikub ; manipulation de table Rummikub (ajout de tuiles) ;
pointage manuel Bingo (daubing : le joueur pointe ses numéros, mode Manuel par défaut + bascule Auto,
compteur de Ratés, cases « à pointer » — commit `51daf82`, vérifié navigateur).
**RESTE** : réarrangement LIBRE de la table Rummikub (scinder/recombiner les combinaisons, + IA qui
l'exploite) ; Web Worker pour l'IA d'échecs (extraire le moteur pur de `ChessGame.tsx` dans un module
worker) ; polish (états vides, accents FR épars).
Note technique jokers/table (déjà en place) : joker = `value`/`number` **10** (ignoré par la
validation via le flag `joker`) ; validateurs joker-aware `isRamiMeld`/`isRummiMeld` + helper
`runWithJokersOK` dans `originalsShared.tsx` ; `addToMeld` dans `RummikubGame.tsx`.

# DÉMARRAGE
1. `git pull` ; lis `SUIVI-JEUX.md` en entier.
2. Docker : `docker compose -f docker-compose.dev.yml up -d` (timeout 300000 ms, à froid 3-4 min).
   Readiness bornée : `docker compose -f docker-compose.dev.yml ps` toutes les 15 s, max 20 essais.
3. Serveurs en ARRIÈRE-PLAN (`run_in_background`, jamais foreground) :
   - backend : `npm run dev --workspace=apps/backend` (port 3002).
   - web : libère le port 5174 si occupé (`netstat -ano | findstr :5174` puis kill), puis
     `npm run dev --workspace=apps/web -- --port 5174 --strictPort`. **Les smoke-tests hardcodent
     `http://localhost:5174`** : n'utilise jamais 5173.
   - Readiness : `curl -s http://localhost:5174` et `curl -s http://localhost:3002/api/portal-config`.
4. **PLAN B Docker** : si pas prêt après 20 essais, continue SANS Docker (backend en mode fallback,
   les 500 sur `/api/portal-config/client` sont connus/tolérés) ; note-le dans SUIVI.
5. Sanity avant de commencer : `npm run build --workspace=apps/web` doit être vert.

# RECETTE DE TEST NAVIGATEUR (critique — testée et éprouvée)
- Playwright depuis le dossier `creorga` (node_modules y sont) : `chromium.launch({ channel: 'msedge' })`.
  **Le channel 'chrome' ÉCHOUE en headless sur ce PC.** Viewport **414×896**.
- URL : `http://localhost:5174/c?table=7`. Dans le dialog de lancement, cliquer **« Solo »**
  (défaut « Ensemble » = inscription requise).
- Jeux `hot`/`new`/`multi`/`casino` : injecter AVANT navigation
  `localStorage['creorga-guest-client-profile-v1']` (voir `tests-qa/smoke-maxiburger.mjs`).
- Clics sur canvas : `{ force: true }` (overlays HUD). Exiger **0 erreur console** (401/500/429
  backend tolérés).
- **Boucle bornée** : max 3 tentatives par test ; si échec pour raison d'OUTILLAGE (timeout,
  port, msedge, sélecteur) et non un bug produit → marque « vérif partielle — outillage » dans
  SUIVI et continue. Jamais plus de 3 essais.

# RÈGLES
1. Commits conventionnels FR, un par jeu/sous-étape ; push après chaque lot ;
   `git config user.name "LB7436"` / `user.email "bryanl1994.bl@gmail.com"` si absent.
   Plan B git : si `git pull`/`push` échoue, PAS de `reset --hard` ni rebase interactif ;
   travaille en local, réessaie le push UNE fois après `git pull --rebase` non interactif, sinon
   continue en local et signale-le.
2. Fichiers < 800 lignes (nouveaux), pas de console.log, pas de nouveaux `any`, immutabilité.
3. **Hook GateGuard** : le 1er Bash/Edit d'un TOUR peut être bloqué (demande de « facts ») —
   présente les 2 facts (1: la requête en une phrase, 2: ce que produit la commande) puis relance
   la MÊME commande. Si systématique, préfixe les commandes par `ECC_GATEGUARD=off`.
4. `tsc -b` et `vite build` : ne PAS les lancer si des agents parallèles tournent (conflit sur
   tsbuildinfo) ; utilise `tsc --noEmit` pendant le parallélisme, `tsc -b` + `vite build` une fois
   seul. Après CHAQUE jeu touché : build vert avant commit.

# FIN DE SESSION
Mets à jour `SUIVI-JEUX.md`, commit + push, puis rapport court : ce qui a été testé/corrigé,
ce qui reste, recommandation (déploiement Vercel, P0 backend Postgres/Stripe).

## ===== FIN DU PROMPT =====
