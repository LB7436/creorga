# CréOrga 2.0 — installation locale professionnelle

Mission du 16 octobre 2026, base `962c01b2767a06db510c6b0aa3e22d521da77534`,
branche `codex/creorga-2-0-2026-10-08`. Aucun déploiement public ni modification de master.
Commit de code : `9e15b1a` ; le commit documentaire suivant contient les preuves de ce lot.
Ce lot allège **les fonctions professionnelles existantes** ; il n'implémente pas par magie
les fonctions historiquement BLOCKED. La qualification de production reste refusée.

## Inventaire et séparation

| Élément vérifié | Décision et justification |
|---|---|
| `apps/backend` | Conservé : PostgreSQL/Prisma, commandes, paiements, factures/PDF, stock, RH, planning, documents, droits, sauvegardes et API Robi |
| `apps/web` | Conservé : ERP, salle, administration société, RH, OCR métier existant, portail `/c`, QR et outils professionnels |
| `apps/pos` | Conservé : caisse, préparation, salle, paiements déclarés, documents, clôtures et reprise |
| `apps/superadmin` | Interface compilée conservée ; les secrets et droits créateur restent obligatoires, sans contournement |
| `apps/guest` | Conservé : enveloppe du portail et iframe vers la même installation ; ses anciennes pages de jeux ne constituent pas un service lancé |
| `apps/marketing` | Site vitrine hors workspaces actuels, source préservé et inclus dans l'inventaire statique ; pas de serveur de développement nécessaire au service local |
| Three.js / `@types/three` | Utilisés seulement par les jeux du dépôt ; conservés dans les dépendances pour réinstaller le profil complet, absents du graphe métier compilé |
| React, Motion, Zustand, Socket.IO, Lucide, QR, Tesseract, Recharts | Partagés ou professionnels : conservés, pas désinstallés sur la base d'un nom |
| Salle dite « 3D » | Rendu CSS/SVG professionnel, pas un moteur de jeu ; conservé |
| Quiz HACCP, affichage TV, publicité, images et mascotte Robi | Professionnels : conservés |
| `gods-eye-view-v0.1.1` adjacent | Autre projet géospatial/OSINT, pas CréOrga ni un jeu déduit de son nom ; sources et ZIP intacts |

Les jeux étaient paresseusement chargés dans le portail : aucun Unreal/Roblox/Unity n'était
lancé par CréOrga. Toutefois `ClientsConfig` importait le catalogue et donc ses imports
dynamiques. Masquer seulement l'onglet n'aurait pas retiré le code du livrable.

### Jeux conservés sur GitHub

Référence immuable : [arbre du commit 962c01b](https://github.com/LB7436/creorga/tree/962c01b2767a06db510c6b0aa3e22d521da77534).
La [preuve détaillée](preuves/jeux-conserves-2026-10-16.json) contient les 43 définitions,
leurs noms, chargeurs et états, ainsi que les **99 chemins exacts**, blobs Git et SHA-256.
Une extraction `git archive` dans un répertoire neuf a été comparée aux blobs ; le checkout
Windows est comparé selon son contenu Git canonique (CRLF pris en compte). Aucun original
n'est utilisé comme destination, aucune archive privée n'est publiée.

- Sélection existante, 16 composants : `mensch`, `scoopa`, `memory`, `connect4`, `rummikub`,
  `solitaire`, `run21`, `tritowers`, `bataille`, `chess`, `reversi`, `snake`, `towerdefense`,
  `maxiburger`, `blackjack`, `poker`.
- Autres 24 composants conservés : `ttt`, `simon`, `yahtzee`, `bingo`, `pig`, `farkle`, `421`,
  `hangman`, `sliding`, `mahjong3d`, `erreur11`, `higherlower`, `rami`, `mastermind`, `2048`,
  `minesweeper`, `motus`, `quizgen`, `numbermemory`, `wordscramble`, `castlerush`, `reaction`,
  `basket3d`, `billard`.
- `tetris`, `slots`, `roulette` sont des annonces sans composant, pas trois jeux fonctionnels.

Les 99 fichiers comprennent les 55 fichiers de `pages/guest/games`, le hub, les 41 JPEG Scopa,
l'ancienne page guest et la route de scores. Les sources, tests, worker d'échecs, règles,
progression, favoris, WebAudio et réglages stockés sont préservés. Rien n'est supprimé de GitHub.

### Windows : aucune désinstallation

Lecture des processus, clés de démarrage, registre de désinstallation et tâches pertinentes,
sans `Win32_Product`. Epic Games Launcher, Roblox Studio et Ollama apparaissent dans
l'inventaire pertinent. Visual Studio Community n'est pas classé comme jeu à cause du mot
« Unity » contenu dans « Community ». Aucun moteur tiers n'est attribué au profil CréOrga.

Les démarrages Windows Razer, Docker Desktop, Ollama, navigateurs, Claude, OneNote, AnyDesk,
Tailscale, sécurité et audio sont laissés en place. Aucun processus tiers, modèle IA,
pilote, service Windows ou tâche de démarrage n'est arrêté/désinstallé. L'inventaire des
tâches dont le nom correspond à CréOrga/Unreal/Roblox/Ollama n'en a pas relevé ; ce n'est
pas une preuve d'absence de tout logiciel ou de toute tâche sur le PC.

## Profil `CREORGA_BUSINESS_ONLY`

1. Le constructeur force les destinations API/Robi/POS/back-office vers le loopback,
   au-dessus des anciens `.env.production`. Démonstration automatique, société fixe et
   collecte analytics externe sont neutralisées. Aucun secret n'est ajouté au bundle.
2. Vite résout l'entrée divertissement vers un module vide **avant** compilation. Une garde
   du graphe refuse toute inclusion du dossier de jeux, du hub ou de Three.js. Les 41 cartes
   Scopa ne sont pas copiées dans `dist-business`, mais restent dans le source et `dist-full`.
3. Le portail s'ouvre sur le menu, sans onglet ni configuration de jeux. `embed=games`
   indique leur absence ; il ne charge pas un moteur caché. L'API scores répond 404 et les
   abonnements `games-*` sont refusés ; les signaux professionnels `floor-*` restent permis.
4. Un processus Node sert l'API et les quatre interfaces compilées, sans Vite, watcher ni
   serveur graphique. PostgreSQL reste séparé. Ports et origines 3002/5174/5175/5177/5178
   sont préservés ; aucune migration, réinitialisation ou seed au démarrage.
5. Le lanceur impose un répertoire métier explicite, une base locale, des sessions sans
   fallback administrateur, les envois de test et des manifestes de compilation locale.
   Il refuse les anciens livrables non vérifiés ; il ne choisit pas silencieusement `./data`.

| Tâche | Profil local essentiel (business et complet) |
|---|---|
| File d'e-mails et reprise de webhooks | Conservées, prestataires neutralisés dans le laboratoire |
| Surveillance non destructive des sessions anciennes | Conservée |
| Sauvegarde PostgreSQL + fichiers | Conservée ; aucun ancien dossier d'archives utilisé pour la recette |
| Purge des anciennes sauvegardes | Désactivée, pas une autorisation implicite d'effacer les archives |
| Ancienne réplication stock JSON global → première société | Désactivée ; ce n'est pas le stock Prisma transactionnel |
| Purge créateur, agrégations et opportunités automatiques | Non démarrées ; les API et accès autorisés restent présents |
| Proactif/planificateur/doublons anciens non isolés | Restent fermés comme avant ; pas réactivés |
| Modèle IA / moteur de jeu externe | Aucun lancement ni préchargement ajouté |

Le fichier privé de processus vérifie les PID et leurs commandes avant un arrêt. Un PID
réattribué à un autre logiciel n'est jamais tué. Le profil n'est pas ajouté au démarrage Windows.

## Utilisation sur ce PC et réversibilité

Le raccourci Bureau **« CréOrga 2.0 »**, créé et vérifié, vise `local-2.0/Launch-CreOrga.ps1`, hors Git avec
la configuration privée. Il lance le profil métier et Chrome avec un répertoire de profil
dédié `local-2.0/business-browser-profile`. Il n'ouvre pas les profils historiques.
L'API, la caisse et les portails ne démarrent pas automatiquement à l'ouverture de Windows.
Le lanceur a été exécuté avec `-NoBrowser` : démarrage/réutilisation de l'API et présence de
Chrome vérifiés. Les propriétés COM du raccourci sont relues après création. Le double-clic
physique n'a pas été exécuté ; les parcours applicatifs sont testés séparément dans Chrome neuf.

Commandes de cette installation privée, depuis le dépôt :

```powershell
node ../local-2.0/start-profile.mjs
powershell.exe -NoProfile -File ../local-2.0/stop-profile.ps1
node ../local-2.0/start-profile.mjs --full
```

Le dernier appel réactive les jeux avec **le code 2.0 actuel**, pas un ancien binaire financier.
Changer de profil n'efface ni base, documents, scores, jeux, paramètres, ni historique navigateur.
Ne pas revenir à un ancien POS pour écrire sur des allocations financières récentes.

Pour reconstruire depuis le dépôt, sans données ni services externes :

```powershell
npm run build:business
npm run build:full
npm run test:local-profile
```

Les entrées publiques `npm run start:business` / `start:full` nécessitent une configuration
privée préchargée : `DATABASE_URL` locale, `CREORGA_RUNTIME_DIR` absolu avec son `data`, secrets
de session robustes, origines locales, `EMAIL_TEST_ONLY=true` et le bac de test correspondant.
Le wrapper privé du PC ajoute les barrières réseau loopback. Aucun fichier de secrets ou
archive n'est publié ; cette procédure n'est pas un installateur pour données de production.

## Corrections T100 livrées

- Préférences modules : autorité serveur par utilisateur/société/session/droits, ancienne
  copie non attribuable gardée en quarantaine, écritures sérialisées, réponses tardives et
  retour A→B→A refusés. Synchronisation directe des paramètres et arrêt au logout/démontage.
  Brouillon conservé sur refus, libellé réellement effaçable, reset confirmé visible.
- Planning : 20→24 = 4 h et 22→6 = 8 h ; quantités de pause et minutes historiques conservées,
  calcul Europe/Luxembourg, refus clair des heures inexistantes/ambiguës, rendu nocturne
  sur deux jours sans doubler le shift, coûts/CSV et filtrage par `userId`, pas par homonyme.
  Cellules accessibles au clavier. Pas de certification de paie ni calendrier légal validé.
- Portail : réponses bornées à l'identité/révision, enregistrement unique et contrôles
  verrouillés, QR permanent sur cette installation, PATCH réduit aux réglages modifiés.
  Transactions et verrou commun pour configuration/reset/onboarding, révision monotone,
  reset sans effacer identité/création du réglage. Les modifications distinctes concurrentes
  ne se perdent plus ; aucune réécriture de vente, document fiscal ou règlement historique.
- Salle web : client GET/PATCH/IA commun, validation de forme, révision non décroissante,
  annulation des lectures périmées et conservation des erreurs/CAS ; aucun rejeu d'écriture.
  Défaut d'affichage corrigé, pas une perte financière prétendument démontrée.

La coûteuse sauvegarde globale de salle reste un chantier distinct. Ce lot ne retire pas
les garanties transactionnelles pour afficher artificiellement un temps inférieur.

## Mesures et preuves

Les séries avant/après, échantillons et limites figurent dans
[la preuve de ressources](preuves/business-only-ressources-2026-10-16.json). Même jeu :
733 produits, 266 tables, 1 239 lignes ; Chrome 155 neuf, fenêtre 1440×1100, 12 processeurs
logiques. Séries séquentielles au repos, sans build/test simultané ; autres logiciels conservés.

| Mesure observée | Développement complet | Compilé complet | Compilé métier |
|---|---:|---:|---:|
| Somme des working sets, MiB | 2 296,79 | 1 533,97 | 1 719,27 |
| Mémoire privée engagée, MiB | 1 889,37 | 1 063,89 | 1 224,25 |
| Processus du périmètre, min–max | 40–44 | 28–32 | 28 |
| CPU normalisé, moyenne courte | 0 % observé | 0 % observé | 0 % observé |
| GPU, somme des moteurs au repos | 0 % observé | 0 % observé | 0 % observé |
| Mémoire GPU dédiée, MiB | 153,38 | 160,21 | 136,08 |
| Mémoire GPU partagée, MiB | 7,73 | 6,62 | 1,49 |
| Une relance CLI jusqu'aux cinq ports prêts, ms | 4 278 | 3 096 | 3 040 |

Le périmètre inclut les descendants CréOrga, PostgreSQL et le Chrome neuf explicitement suivi.
Onze échantillons par série sur environ 16–17 s ; pages partagées PostgreSQL potentiellement
comptées plusieurs fois. Ce n'est pas une mesure de RAM physique unique du système. CPU/GPU
à zéro peut signifier sous la résolution de cet intervalle, pas une consommation nulle.
GPU : compteurs Windows par PID, pas un pourcentage global normalisé ; VRAM totale de la carte
non déduite de `AdapterRAM`. Ollama et son modèle partagé ne sont pas attribués à CréOrga.

Écart observé développement → métier : −577,52 MiB (−25,14 %) sur la somme des working sets.
Le profil compilé **avec** jeux est moins élevé que le métier dans cette série : il serait faux
d'attribuer ce gain RAM aux seuls jeux. Le principal changement est la suppression des serveurs
Vite/watchers ; heaps, pools et autres activités Windows restent variables. Une seule relance
par profil, PostgreSQL déjà actif et cache système chaud : pas un benchmark de démarrage Windows.
Pas de wattmètre : aucun watt, kWh, euro ou gain énergétique annoncé.

| Écran / action mesurée, p95 en ms | Développement | Complet compilé | Métier compilé |
|---|---:|---:|---:|
| Configuration portail | 369,86 | 111,59 | 108,51 |
| Modules | 490,64 | 856,48 | 868,40 |
| Planning | 340,12 | 82,26 | 78,97 |
| Menu QR, même clic Menu dans les deux profils | 298,14 | 156,18 | 123,14 |
| POS, écran de connexion après rechargement | 68,59 | 42,16 | 33,18 |

Deux échauffements, cinq valeurs par écran ; ce p95 est le maximum des cinq et non une
distribution de charge représentative. Aucun message JS non géré. **Modules se dégrade**
dans cette série ; pas de promesse d'accélération universelle. La connexion POS sécurisée
après reload ne vaut pas mesure d'un encaissement. Sauvegarde globale de salle toujours coûteuse,
dernier gain HTTP apparié documenté au lot précédent, non réattribué au profil sans jeux.

Une [mesure de recette supplémentaire](preuves/performance-business-only-2026-10-16.json),
à 19:26 UTC, utilise ensuite 734 produits / 267 tables / 1 240 lignes / 115 ventes de journal.
Dix sauvegardes de salle : médiane **1 738,82 ms**, p95 **2 325,22 ms**. Ce jeu a évolué pendant
les parcours fictifs : ce n'est pas la série appariée avant/après ressources et aucun nouveau
gain causal n'est annoncé. Le dialogue contrôlé mesure un contraste minimal 7,44:1 sur
802 nœuds texte échantillonnés ; ce n'est pas un audit WCAG de tout le produit.

### Validation exécutée

| Contrôle | Résultat |
|---|---|
| Unités backend / web / POS | **518** = 277 / 177 / 64, zéro échec/ignoré |
| Intégrations PostgreSQL | **178**, 19 fichiers, zéro échec/ignoré ; banques remplacées |
| Chrome neuf | **28 parcours**, 10 fichiers, zéro échec/ignoré ; données fictives |
| Compilations | Cinq applications en métier, cinq en complet ; avertissements de gros bundles conservés |
| Gardes des livrables / hôte local | **3 tests** : absence de jeux, origines locales, MIME/proxy et refus de configuration dangereuse |
| Outils inventaire/preuves/profilage | 12 tests ; comparateur restauration 23 ; générateur métier 100 identifiants et 8 contrôles |
| Jeux / récupération | 99 fichiers récupérés dans un nouveau dossier, empreintes Git et SHA-256 identiques |
| Sauvegarde/restauration courante | **79 tables, 8 fichiers, 9 PDF facture + 8 PDF avoir égaux**, AES-GCM/clé séparée |
| Reprise après redémarrage | **17 contrôles**, données financières allouées et PDF compris |

La restauration de 19:32 UTC dure 3 721 ms sur cette copie, **pas un RTO**. Les nouvelles tables
contiennent 7 allocations, 14 groupes et 21 affectations de règlement, donc pas seulement un
schéma vide. Toutes les tables sont comparées ; la preuve publique résume les tables cibles
et les empreintes, sans publier base, documents ni secrets. Aucun SQL nouveau : 34 migrations.

Les tests suivent des échecs reproduits puis corrigés : brouillon de reset perdu, lectures
tardives, révision de portail remise à zéro, clés concurrentes écrasées, changement onboarding
sans révision, heures nocturnes, cellules inaccessibles au clavier et boutons actifs pendant
l'enregistrement. API/sauvegardes/fichiers/SQL sont réels dans le laboratoire. Pannes réseau,
IA et prestataires sont remplacés lorsque le scénario le précise ; pas de preuve bancaire.
Un contrôle HTTP temporaire refusé par le bac à sable a été relancé avec accès loopback autorisé,
sans désactiver son assertion. Les valeurs de champs, profils et captures privées restent hors Git.

### Reproduction sur ce PC préparé

Depuis le dépôt, uniquement avec le laboratoire privé et son compte fictif `.invalid` :

```powershell
node ../local-2.0/run.mjs unit
node ../local-2.0/run.mjs integration
node ../local-2.0/run-business-browser.mjs
node scripts/render-business-profile-evidence.mjs ../local-2.0 2026-10-16T18:40:00Z
```

Le lanceur Chrome redémarre le processus privé entre fichiers, garde le limiteur normal et
rejette les connexions externes. Ne pas utiliser le lanceur e2e générique à fallback sans DB
comme substitut à ces tests PostgreSQL. Le compte, ses secrets et les rapports bruts restent privés.
Pour refaire la restauration : arrêter les écrivains, puis utiliser l'outil privé
`restore-current-copy.mjs` avec le chargeur tsx ; il refuse une base autre que la copie locale,
crée une autre base et ne remplace aucune archive. Relecture par `verify-restart-business-recipe.mjs`.

Les nouvelles exécutions figurent dans [la validation](preuves/business-only-validation-2026-10-16.json)
et la [restauration](preuves/restauration-business-only-2026-10-16.json). Le nouvel inventaire
[T100 source](preuves/business-only-inventaire-t100-2026-10-16.jsonl) conserve NOT RUN pour
chaque contrôle statique ; le graphe de compilation ne vaut pas recette métier.
Le scan actuel compte **399 fichiers, 3 680 contrôles, 157 routes et 826 gabarits**, zéro
diagnostic de parsing. Les contrôles ludiques sont marqués profil complet, pas supprimés.

### Incident de rétention dans la copie de travail

La purge ZIP était déjà neutralisée ; une seconde rétention propre à `pg-dump` ne l'était pas.
Deux suppressions de dumps de rotation du **laboratoire** apparaissent dans les journaux de ce
lot (20:56 et 21:22 locales). Les archives originales de conservation hors laboratoire sont
intactes. Cette rétention est désormais elle aussi désactivée en mode business/essential ;
deux tests RED→GREEN avec vingt dumps temporaires prouvent qu'aucun n'y est supprimé.

Lecture non destructive de 36 ZIP générés aujourd'hui dans la copie : **27 dumps absents du
dossier de rotation récupérés** dans un nouveau répertoire privé, signatures PGDMP, tailles et
SHA-256 vérifiés contre leur manifeste. Aucun ZIP ni ancien dossier n'est remplacé. Les journaux
n'identifient pas les deux fichiers supprimés : leur correspondance exacte avec ces récupérations
reste **non démontrable**. Ne pas présenter cette récupération comme une traçabilité exhaustive.
[Preuve et limite](preuves/rotation-laboratoire-2026-10-16.json).

Limites : tests bancaires simulés, aucune impression physique, pas de PayPal sandbox officiel
sans accès, pas de vraie conversation IA/voix qualifiée, pas de coupure électrique du PC,
pas de profil historique ni d'archives originales. Stripe Refunds et vidéo restent désactivés.
Robi est préservé et sa frontière de confirmation/société/PDF testée avec réponse IA remplacée ;
ni modèle réel, ni microphone, ni APK Android matériellement qualifiés par ce lot. L'APK historique
reste conservé ; il n'est pas déclaré synchronisé avec toutes les évolutions récentes.
L'OCR ancien global et les sauvegardes accessibles aux clients restent indisponibles tant que
leur isolation n'est pas livrée. « Sans jeux » ne transforme pas ces fonctions en PASS.

## Reprise et prochaines priorités

Aucune migration SQL nouvelle ; 34 migrations existantes préservées. Arrêter les écrivains,
sauvegarder base/fichiers du même instant, restaurer dans une autre base et vérifier les PDF,
puis redémarrer. Ne pas réécrire un historique pour rendre un ancien exécutable compatible.
Les anciens caches non attribuables restent conservés ; ne pas les importer automatiquement.

Continuer T100 par écran/rôle et variantes réseau ; qualifier les modules incomplets et les
flux de restauration/accès avant le pilote, puis matériel et prestataires séparément.
Priorité immédiate : écran Modules et sa latence observée, extension de la recette par rôles,
configuration planning/calendriers et profilage du snapshot de salle à jeu/processus figés.
La matrice métier globale reste **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN** tant que les
preuves ne permettent pas de changer chaque statut individuellement.
