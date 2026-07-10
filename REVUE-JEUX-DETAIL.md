# REVUE DÉTAILLÉE — 43 jeux Creorga (annexe du PLAN-ACTION-JEUX.md)

> Revue multi-agents du 2026-07-10 — bugs, UX tactile et améliorations, jeu par jeu, avec références de lignes.


===== Defense 3D (Tower Defense Three.js) (score 6.5, effort 5.5j) =====
BUGS:
- Horloges incohérentes vitesse/spawn : stepSimulation (l.491-500) multiplie dt par gs.speed mais nextSpawnAt et le while de spawn utilisent le temps réel (now = nowMs/1000). En 2x, les ennemis avancent 2x plus vite mais spawnent aux gaps réels → les vagues sont étirées et le jeu devient PLUS FACILE en accéléré. Inverse de l'intention d'un bouton vitesse.
- slowUntil en temps réel (l.459 'now + 1.65' et l.504) : à vitesse 2x le ralentissement cryo dure 2x plus longtemps en temps de jeu ; à 1x après un slow posé en 2x, durée fausse. Toutes les durées de gameplay devraient être en temps simulé.
- La pause ne gèle pas les timers wall-clock : pendant une pause en pleine vague, nextSpawnAt et slowUntil continuent de courir. À la reprise, un ennemi spawn immédiatement et les slows actifs ont expiré. Idem lors d'un passage en arrière-plan de l'onglet (rAF suspendu).
- Shadow map activée pour rien : renderer.shadowMap.enabled = true + PCFSoftShadowMap + sun.castShadow avec mapSize 1024 (l.956-976), mais aucun mesh (tours, ennemis, tuiles) n'a castShadow = true. Coût GPU permanent (passe d'ombre à chaque frame) sans aucune ombre visible — critique sur GPU mobile.
- syncThree (l.781-788) force material.transparent = true et opacity 0.92 sur les MeshStandardMaterial de TOUTES les tours à chaque frame : rend les tours définitivement translucides (artefacts de tri de transparence possibles) et jamais remis à transparent=false.
- Perte de cadence de tir : l.544 tower.cooldown -= dt puis reset à stats.fireRate (l.562) sans reporter le reliquat négatif (cooldown = stats.fireRate + cooldown résiduel). À bas FPS les tours tirent mesurablement plus lentement que leur spec.
- Rotation des tours : group.rotation.y = lerp(rot, tower.yaw, 0.18) (l.778) sans normalisation d'angle — quand yaw traverse ±π, la tourelle fait un tour complet dans le mauvais sens.
- useRef<GameState>(createMenuState('normal')) (l.1071) : l'argument est évalué à chaque render, créant un GameState complet (Set, tableaux, performance.now) jeté immédiatement. Utiliser une init lazy via ref null + affectation dans un if.
- Après défaite, stepSimulation early-return (l.490) : les ennemis restants gèlent sur le plateau derrière l'overlay semi-transparent (rgba 0.45, l.1759) — état visuel incohérent visible.
UX:
- BLOQUANT téléphone portrait : caméra fixe (position 0,8.1,8.8, FOV vertical 48°, l.950) — avec un aspect < 1 le plateau de ~13 unités de large est coupé sur les bords gauche/droit. Aucune adaptation du FOV/distance à l'aspect ratio dans le ResizeObserver (l.1027-1033). Le jeu est conçu tablette paysage uniquement alors que la cible est le téléphone du client.
- towerBar (l.1613) : 4 boutons minWidth 78px + gaps + bouton vague (~130px) ≈ 470px sans flexWrap ni overflow scroll → écrasement/débordement sur écran 375px. Le bouton 'Vague active' chevauche les boutons de tours.
- Placement tactile sans confirmation : pointerdown place la tour instantanément (l.1208-1248). Sur mobile il n'y a pas de hover (pointermove ne précède pas le tap) donc aucun aperçu vert/rouge ni cercle de portée avant placement — un doigt imprécis coûte 45% du prix (SELL_RATIO 0.55). Il faut un flux tap-pour-prévisualiser puis tap-pour-confirmer.
- Cibles tactiles < 44px : compactButton 36px de haut (l.1601), panelClose 28px (l.1713), boutons upgrade/vendre ~36px. Les 4 boutons du topActions (vitesse, pause, reset, retour) sont serrés avec gap 6px en haut à droite.
- Reset (RotateCcw, l.1318) détruit la partie sans confirmation — un tap accidentel à côté du bouton pause efface toute la progression.
- Mécanique d'armure invisible : le warden (armor 14) réduit un tir cryo de 12 à 1 dégât (l.457) sans aucun indicateur UI, tooltip ou feedback de 'tir inefficace'. Le joueur ne peut pas comprendre pourquoi ses tours ne font rien.
- Métrique 'Vague' affiche 0/9 pendant la première prep (hud.wave initial = 0, l.1311) — confus au premier lancement.
- Aucun son, aucune vibration (navigator.vibrate), aucun retour haptique sur placement/kill/fuite d'ennemi — sur téléphone au restaurant (souvent muet) la vibration est le canal de feedback principal.
- Textes français sans accents partout : 'Demarrer', 'Degats', 'Protegez', 'economie', 'Equilibre' — rendu peu soigné pour un produit client.
AMELIORATIONS:
- IMPACT FORT — Unifier le temps simulé : maintenir gs.simTime += rawDt * gs.speed et exprimer nextSpawnAt, slowUntil, shot.born/ttl, spark.born/ttl en simTime. Corrige d'un coup le bug vitesse 2x, la pause et le retour d'onglet. ~0.5 jour.
- IMPACT FORT — Caméra responsive : dans le ResizeObserver, si aspect < 1 augmenter camera.fov (ou reculer la caméra : distance = base / Math.min(1, aspect)) pour cadrer les 13 unités de large ; envisager une rotation 90° du plateau en portrait. Sans ça le jeu est injouable sur la cible principale. ~0.5 jour.
- IMPACT FORT — Placement en 2 taps sur tactile : 1er tap sur cellule libre = afficher hoverRing + rangeRing + coût, 2e tap sur la même cellule = confirmer (détecter pointerType === 'touch' dans handlePointerDown, l.1208). Conserver le placement direct à la souris. ~0.5 jour.
- IMPACT FORT — Supprimer shadowMap (2 lignes l.956-957 + castShadow l.969) ou activer castShadow sur les tours : au choix +20-30% de perf mobile gratuite, ou de vraies ombres. ~0.1 jour.
- IMPACT MOYEN — Rendre l'armure lisible : icône bouclier + valeur sur la barre de HP des blindés, chiffres de dégâts flottants (réutiliser le système sparks avec des sprites texte), et mention 'anti-blindage' sur la carte de la tour Rail. ~1 jour.
- IMPACT MOYEN — Juice : Web Audio API (oscillateurs synthétisés, zéro asset) pour tir/kill/fuite/vague, navigator.vibrate(30) sur kill et vibrate([50,30,50]) sur perte de vie, shake caméra léger (offset aléatoire amorti sur runtime.camera) quand un ennemi passe. ~1 jour.
- IMPACT MOYEN — Aperçu de la vague suivante en phase prep : composer depuis WAVES[gs.wave] une rangée d'icônes colorées (couleurs ENEMY_DEFS) avec compte, à côté du bouton 'Vague X/9'. Transforme la prep en vraie phase stratégique. ~0.5 jour.
- IMPACT MOYEN — Profondeur anti-air : rendre les drones intouchables par storm (splash sol) et donner +50% dégâts de pulse contre volants ; sinon le flag flying (l.41) n'a aucun poids stratégique. ~0.25 jour.
- IMPACT FAIBLE — Persister le meilleur score par difficulté en localStorage et l'afficher sur le menu et l'écran de fin. ~0.25 jour.
- IMPACT FAIBLE — Corrections mineures : report du reliquat de cooldown (l.562 : cooldown += stats.fireRate au lieu de =), normalisation d'angle du lerp de yaw (l.778), retirer transparent/opacity forcés sur les tours (l.781-788), confirmation avant reset, accents français, partage des géométries des tuiles de chemin dans buildPath (l.909, une BoxGeometry réutilisée au lieu de ~30). ~0.5 jour.

===== Basket Rooftop 3D (BasketGame, l.182-265) (score 4, effort 1.5j) =====
BUGS:
- setDir appelé À L'INTÉRIEUR de l'updater setAim (l.192-203) : updater impur — en React 18 StrictMode l'updater est exécuté 2x en dev, et l'effet dépend de [dir] donc l'interval est détruit/recréé à chaque rebond, provoquant un micro-freeze du curseur aux extrémités.
- Aucune fin de partie : quand shots atteint 0 il n'y a ni GameOverModal ni useGameScore (contrairement à Mahjong/Rami/Rummikub) — le score n'est jamais soumis ni persisté, incohérence d'architecture dans le même fichier.
- Boucle à setInterval 120ms avec pas de 6% (l.191-204) : la précision du timing est quantifiée à ~8 positions possibles par traversée. Le 3 pts (distance<3) n'est atteignable que sur 1 tick précis — la difficulté vient de la fréquence d'échantillonnage, pas du skill. Devrait être requestAnimationFrame avec position continue basée sur le temps.
- Zone verte visuelle (left 46%, width 12% = 46-58%, l.1279-1285) ≠ hitbox logique (|aim-52|<8 = 44-60, l.210-212) : un tir à 44-46% ou 58-60% marque alors que l'aiguille est hors de la zone verte affichée.
UX:
- Le ballon ne bouge jamais verticalement lors d'un tir : `transform: translateY(${shots % 2 ? -4 : 0}px)` (l.255) déplace le ballon de 4px selon la PARITÉ du compteur de tirs — aucune animation d'arc, aucun feedback visuel panier/raté sur la scène, seulement du texte dans le panneau latéral.
- Le seul input (bouton Shooter) est dans le panneau latéral, loin de la scène : sur mobile l'œil doit suivre l'aiguille en haut et le pouce taper en bas du side-panel. Le tap devrait être sur toute la scène.
- Aucun son, aucune vibration (navigator.vibrate), aucune particule sur panier ; framer-motion est importé dans le projet mais inutilisé.
- Pas de compte à rebours ni de tension de fin de série ; message texte 'Tir manque, ajustez le timing' comme unique feedback d'échec.
AMELIORATIONS:
- IMPACT FORT — Passer la boucle en requestAnimationFrame avec aim = f(timestamp) (sinusoïde ou triangle), vitesse croissante tous les 3 tirs pour une difficulté progressive ; supprimer le useEffect [dir] et le setDir imbriqué.
- IMPACT FORT — Ajouter fin de partie : GameOverModal + useGameScore('basket') quand shots===0, comme MahjongGame l.292-302.
- IMPACT FORT — Rendre toute la Stage tappable (onPointerDown sur basketCourtStyle) au lieu du bouton latéral ; animer un vrai arc de tir (keyframes translateY + scale) vers le panier avec résultat visuel (filet qui ondule / ballon qui rebondit hors du cercle).
- IMPACT MOYEN — Aligner greenZoneStyle sur la hitbox (left 44%, width 16%) et rétrécir la zone à mesure que la série monte ; ajouter navigator.vibrate(30) sur panier.
- IMPACT FAIBLE — Afficher la série en flammes (x3 = 🔥) et un multiplicateur visible plutôt que le +1 caché de l.214.

===== Mahjong Bamboo 3D (MahjongGame, l.273-397) (score 6, effort 1j) =====
BUGS:
- restart() (l.335-344) ne remet pas `locked` à false : si le joueur clique 'Melanger' pendant la fenêtre de 900ms d'une paire ratée, le nouveau plateau reste verrouillé jusqu'à ce que le setTimeout orphelin (l.327-331) le déverrouille — et ce timeout n'est jamais stocké ni cleared, donc il s'exécute aussi après unmount (setState sur composant démonté).
- L'effet de victoire (l.296-302) dépend de `score` qui change chaque seconde (score dérive de seconds) : l'effet se ré-exécute inutilement à chaque tick — le guard gameOver protège mais c'est fragile ; si submit n'est pas mémoïsé dans useGameScore, ré-exécution garantie chaque seconde.
- Le setInterval du chrono continue quand l'onglet est en arrière-plan (throttlé par le navigateur) : le temps affiché dérive de la réalité, ce qui fausse le score temps-dépendant (l.288). Un calcul basé sur Date.now() de départ serait exact.
UX:
- Tuiles minmax(42px, 74px) (l.1298) : à la borne basse, 42px < 44px minimum tactile recommandé ; sur un écran 360px, 6 colonnes + gaps 10px + padding = tuiles à la limite.
- Aucune animation de flip : la tuile passe instantanément de '?' à la face (l.365-386) — c'est LE moment de juice d'un memory et il est absent ; pas de son ni vibration sur paire trouvée.
- Le glyphe des faces est du texte brut ('III', '*', 'C', l.399-415) doublé du nom anglais ('bam', 'lotus') en 10px — illisible et sans charme pour un jeu vitrine restaurant ; des emoji (🍵🥢🌙) seraient immédiats.
- Pas de pause : le chrono tourne même si le serveur apporte les plats.
AMELIORATIONS:
- IMPACT FORT — Animation de flip 3D CSS (transform rotateY sur .6s avec backface-visibility) sur mahjongTileStyle ; les tuiles matchées devraient s'envoler/scale-out au lieu de passer à opacity 0.22 (l.373).
- IMPACT FORT — Remplacer tileFace() par des emoji thématiques restaurant (🍜🍵🥟🍚🌸🌙) : lisibilité mobile x10, zéro coût.
- IMPACT MOYEN — Stocker le timeout de mismatch dans un ref, le clear dans restart() et dans un cleanup d'unmount ; ajouter setLocked(false) dans restart().
- IMPACT MOYEN — Chrono basé sur un startTime Date.now() plutôt qu'un compteur setInterval ; ajouter bouton pause qui masque les tuiles.
- IMPACT FAIBLE — Difficulté progressive : proposer 3 tailles de plateau (4x3 facile, 6x4 normal, 6x6 expert avec plus de faces).

===== Erreur 11 Terrasse (SpotErrorGame, l.431-508) (score 2, effort 2j) =====
BUGS:
- 2 des 11 'différences' n'existent pas visuellement : les hotspots 'window' (x:73,y:35) et 'path' (x:57,y:82) (l.426-427) n'ont AUCUN élément correspondant dans BistroScene (l.486-508) qui ne rend que ~9 variations (arbre boxShadow, tour, store, menu 10/11, table span left + span color, chaise, lampe, fleur). Le joueur doit taper à l'aveugle pour finir.
- Désalignement hotspots/visuels garanti : les différences visuelles sont positionnées en PIXELS absolus (sceneTowerStyle right:44, awningStyle left:152, chairShapeStyle right:40/56...) alors que les hotspots sont en POURCENTAGES (l.467-468) sur un panel fluide (minmax(260px,1fr), l.1329). Les cercles de validation ne coïncident avec les erreurs qu'à une seule largeur d'écran.
- Aucune pénalité pour tap raté : les taps hors hotspot ne font rien (aucun handler sur le panel), donc scrubber toute l'image du doigt garantit la victoire en ~5 secondes — le jeu est trivialement exploitable.
- Pas de fin de partie : ni chrono, ni score, ni useGameScore, ni GameOverModal — juste un message texte à 11/11.
UX:
- Hotspots de 26px (l.469-470) : très en dessous des 44px tactiles minimum — même en connaissant la différence, la toucher est frustrant.
- Grid `repeat(2, minmax(260px, 1fr))` (l.1329) = 520px+gap minimum : sur un téléphone 375px, les deux scènes débordent et forcent un scroll horizontal dans la Stage (overflow:auto l.1157) — comparer deux images côte à côte devient impossible, c'est rédhibitoire pour un spot-the-difference mobile.
- Aucun feedback de raté (shake, croix rouge), aucun indice après blocage, aucune loupe/zoom.
AMELIORATIONS:
- IMPACT FORT — Refondre la scène en SVG unique avec viewBox : les différences deviennent des éléments SVG avec coordonnées partagées entre visuel et hitbox — supprime définitivement le désalignement px/% ; ajouter les 2 différences manquantes ou passer à 9.
- IMPACT FORT — Layout mobile : empiler les deux scènes verticalement sous 640px, ou mode 'swap' (une seule scène, bouton pour basculer A/B) comme les jeux du genre.
- IMPACT FORT — Pénalité de tap raté (handler onClick sur le panel : -5s au chrono ou 3 vies) + chrono + score + GameOverModal/useGameScore('spot11') — sans cela il n'y a littéralement pas de jeu.
- IMPACT MOYEN — Hotspots 44px minimum, cercle animé (scale-in + checkmark) à la découverte, vibration.
- IMPACT MOYEN — Générer les différences aléatoirement parmi un pool de 20 à chaque partie pour la rejouabilité (actuellement une seule solution mémorisable en 1 partie).

===== Billard Lounge 3D (BilliardsGame, l.519-584) (score 1.5, effort 3j) =====
BUGS:
- Le gameplay est factice : shootBall (l.525-536) empoche la bille si `id === target.id && power >= 35` — aucun angle, aucune physique, aucune trajectoire. Le slider de puissance est un seuil binaire : 35 et 100 sont strictement identiques, 34 échoue toujours. Le joueur découvre vite que le jeu est un 'tape sur la bille qui brille' en 6 taps.
- pocketStyle (l.1440-1459) : `left: 50` et `top: 4` / `bottom: 4` sont des PIXELS, pas des % — les poches du milieu sont rendues à 50px du bord gauche au lieu du centre de la table ; visuellement les 2 poches centrales sont empilées près du coin gauche.
- La bille blanche (cueBallStyle) et la queue (cueStyle) sont purement décoratives et ne bougent jamais ; la longueur de la queue `${120 + power}px` (l.564) est le seul retour du slider.
- Aucune fin de partie, aucun score, aucun useGameScore : 'Table nettoyee.' en texte et c'est tout ; aucune faute réelle (taper la mauvaise bille affiche un message sans conséquence).
UX:
- Billes de 32px (l.1485-1486) < 44px tactile minimum, avec des billes espacées de 7% seulement (l.510-517) — taps adjacents fréquents.
- Aucun feedback d'empochage : la bille disparaît instantanément (rendu conditionnel l.565) — pas de roulement vers la poche, pas de son.
- Le slider de puissance dans le panneau latéral n'a aucun lien lisible avec l'action : rien n'indique que 35 est le seuil.
AMELIORATIONS:
- IMPACT FORT — Réécrire en vrai mini-billard canvas : drag depuis la bille blanche pour viser (vecteur direction+puissance), physique simple cercle-cercle (2 billes, frottement, réflexion sur bandes, détection poche) — ~250 lignes, c'est le standard minimal attendu du genre ; sinon retirer le jeu du catalogue car il dessert l'image de la marque.
- IMPACT FORT — Si la physique est hors budget : transformer en puzzle de visée (choisir un angle sur un arc, trajectoire prévisualisée en pointillés, la bille suit le chemin avec animation) — garde le fake mais ajoute une décision réelle par coup.
- IMPACT MOYEN — Corriger pocketStyle : `left: '50%'` pour les poches centrales et unités % partout.
- IMPACT MOYEN — Score (billes dans l'ordre = combo), chrono, GameOverModal + useGameScore('billard').
- IMPACT FAIBLE — Animation d'empochage (translate vers la poche la plus proche + scale 0) et vibration.

===== Run 21 Creorga (Run21Game, l.590-658) (score 3, effort 1.5j) =====
BUGS:
- Règle centrale manquante : quand une colonne atteint exactement 21, elle N'EST PAS vidée (place(), l.601-614 : seulement +25 de bonus). Dans tout Run-21/21-Blitz, faire 21 nettoie la colonne pour continuer. Ici chaque colonne à 21 devient définitivement morte (toute carte dépasserait), donc la partie DEADLOCK mathématiquement après quelques cartes — c'est le bug de gameplay le plus grave du fichier.
- Pas de fin de partie : quand `locked` devient true (l.599), seul le message change — pas de GameOverModal, pas de useGameScore, le score de la manche est perdu ; le deck de 52 cartes ne sera jamais épuisé à cause du deadlock.
- L'As vaut toujours 1 (clamp l.586-588) : la variante standard compte l'As 1 OU 11, ce qui est la principale décision stratégique du jeu — sans elle le jeu se réduit à de l'addition passive.
- Les colonnes n'affichent que les 5 dernières cartes (`column.slice(-5)`, l.649) sans indicateur du nombre total masqué.
UX:
- Grid `repeat(5, minmax(84px, 1fr))` (l.1513) = 420px+gaps minimum : déborde sur téléphone 375px, scroll horizontal dans la Stage pour un jeu qui exige de voir les 5 colonnes simultanément.
- Aucune animation de pose de carte (apparition instantanée), aucun feedback du bonus 21 hormis le texte et la bordure verte.
- Le highlight cyan 'canPlace' (runColumnStyle l.1517-1530) est bien, mais aucune indication de la prochaine carte de la pioche (peek) — standard du genre pour planifier.
AMELIORATIONS:
- IMPACT FORT — Vider la colonne quand nextSum === 21 (dans place(), remplacer la colonne par [] au lieu de la garder) + bonus 5 cartes sans bust ('5-card charlie') : rend le jeu jouable indéfiniment et fidèle au genre.
- IMPACT FORT — Fin de partie : GameOverModal + useGameScore('run21') quand locked===true ou deck vide ; le score doit être sauvé.
- IMPACT FORT — As = 1 ou 11 (valeur souple : la colonne compte l'As comme 11 si ça ne bust pas) — profondeur stratégique immédiate.
- IMPACT MOYEN — Mobile : passer à 4 colonnes sous 420px ou réduire minmax à 64px ; animation de slide de la carte depuis le slot courant vers la colonne (framer-motion layoutId).
- IMPACT FAIBLE — Afficher les 2 prochaines cartes de la pioche ; combo multiplier pour 21 consécutifs.

===== Tri-Tours Neon (TriTowersGame, l.671-729) (score 3, effort 2j) =====
BUGS:
- Bug d'adjacence As-2 : adjacent() (l.665-669) convertit l'As en 14 (`lowA`), donc A vs 2 donne |14-2|=12 ≠ 1, et le fallback `|a.value - b.value| === 12` donne |1-2|=1 ≠ 12 → l'As n'est adjacent qu'au Roi, jamais au 2. Dans tout Tri-Peaks l'As chaîne des deux côtés (K-A-2). Asymétrie de règle invisible mais réelle.
- Aucune structure de tours : les 18 cartes sont toutes retournées et jouables immédiatement (l.713-719, simple grid avec un translateY cosmétique) — pas de cartes couvertes à débloquer, ce qui est le cœur du genre 'Tri Towers'. Le jeu se réduit à chercher n'importe quelle carte adjacente.
- Aucune fin de partie ni redémarrage : victoire = message texte 'Tours nettoyees.' (l.687, calculé sur open.length AVANT mise à jour — correct par coïncidence) ; défaite (stock vide + aucune carte jouable) n'est jamais détectée ; il n'y a AUCUN bouton restart (side l.702-709 n'a que 'Tirer') — le joueur bloqué doit quitter le jeu.
- Pas de useGameScore/GameOverModal ; score plat +10 par carte (l.686) sans combo, alors que la mécanique de série est la raison d'être du Tri-Peaks.
UX:
- Cartes minmax(54px,76px) : acceptable, mais les cartes jouables sont marquées par `selected={adjacent(...)}` (l.717) — le style 'selected' de MiniCard sert à la fois de highlight de jouabilité ici et de sélection dans Rami, sémantique confuse.
- Tirer une carte du stock ne coûte rien et n'est jamais puni : aucune raison de réfléchir avant de tirer.
- Aucune animation de départ de carte vers la fondation, aucun son, la fondation change de valeur instantanément.
AMELIORATIONS:
- IMPACT FORT — Corriger adjacent() : `const d = Math.abs(a.value - b.value); return d === 1 || d === 12` suffit (1-13 wrap) — 1 ligne, supprime lowA/lowB.
- IMPACT FORT — Implémenter les 3 vraies pyramides : 3 tours de 6 cartes en 3 rangées (1/2/3), cartes des rangées supérieures face cachée tant que les 2 cartes qui les couvrent ne sont pas jouées — c'est ce qui crée les décisions.
- IMPACT FORT — Détection de défaite (stock vide && open.every(c => !adjacent(c, foundation))), bouton restart, GameOverModal + useGameScore('tritowers').
- IMPACT MOYEN — Scoring en combo croissant (+10, +20, +30... reset au tirage) affiché en gros sur la scène — la boucle dopaminergique du genre.
- IMPACT FAIBLE — Animation framer-motion de la carte qui vole vers la fondation.

===== Rami Salon 3D (RamiGame, l.771-929) (score 3, effort 3j) =====
BUGS:
- DUPLICATION DE CARTES par closure périmée : draw() (l.850-856) fait setDeck(slice(1)) puis planifie cpuTurn 800ms plus tard — mais ce cpuTurn est celui du rendu COURANT dont la closure `deck` (l.815-819) est le deck AVANT la pioche du joueur. Le CPU prend donc deck[0] = la carte que le joueur vient de piocher : la même carte existe dans les deux mains. Idem via meld().
- SCORE DE VICTOIRE FAUX : dans meld() (l.837-849), endGame('player') est appelé juste après setHand/setScore, donc endGame (l.802-809) lit `hand` et `score` périmés : s = score_avant + 50 - points_des_cartes_posées → le meld gagnant est SOUSTRAIT au lieu d'être ajouté. Le record soumis via submit() est faux (écart de 2x la valeur du meld), alors que le modal affiche finalScore (l.800) recalculé après commit — le score affiché et le record sauvegardé divergent.
- Timeouts empilés : cpuTurnTimeout.current est écrasé à chaque planification (l.848, l.855) sans clearTimeout du précédent — poser puis piocher rapidement planifie 2 cpuTurns qui s'exécutent tous les deux sur des états périmés (double pioche CPU, deck désynchronisé). Le cleanup l.858 ne clear que le dernier.
- Exploit de règles : les boutons Sortie 40/Normal (l.892-895) restent actifs en cours de partie — basculer en 'normal' contourne la contrainte des 40 points à tout moment ; le CPU n'a lui aucune contrainte d'ouverture.
- Ce n'est pas du Rami : le joueur ne défausse jamais (sa main grossit sans limite via draw), la défausse CPU (l.898-900) n'est pas ramassable, pas de structure de tour stricte (le joueur peut poser en boucle), pas de jokers ; le modal n'indique pas qui a gagné (winner l.790 est calculé mais jamais affiché).
UX:
- 14+ MiniCards en flex-wrap (ramiHandStyle l.1575) : sur mobile la main occupe 3 rangées, la sélection multi-cartes sans zone de drag est laborieuse ; aucune aide visuelle des combinaisons possibles dans la main.
- Le tour du CPU est invisible : 800ms plus tard un message texte change — aucune animation de la main CPU, on ne voit jamais ses melds (cpuMelds n'existe pas ici, ses poses partent dans cpuScore non affiché dans les stats l.883-888 !).
- Aucun feedback sonore/haptique ; la preview de meld (l.907-909) est bien mais ne dit pas POURQUOI une sélection est invalide (manque 1 carte ? mauvaise couleur ?).
AMELIORATIONS:
- IMPACT FORT — Refactorer l'état en useReducer unique {deck, hand, cpuHand, phase} : cpuTurn devient une action pure qui lit l'état courant — élimine structurellement les closures périmées et la duplication de cartes ; c'est le préalable à tout le reste.
- IMPACT FORT — Corriger endGame : calculer s à partir des valeurs POST-move passées en paramètres (endGame(who, finalHand, finalScore)) au lieu de lire l'état du closure.
- IMPACT FORT — Vraie structure de tour : piocher → (poser 0..n) → défausser obligatoire, main plafonnée à 14 ; permettre de ramasser la défausse CPU ; verrouiller le choix de mode après la 1re action.
- IMPACT MOYEN — Afficher cpuScore dans les stats et les melds CPU sur la table ; annoncer le vainqueur dans GameOverModal ('Vous avez gagné' / 'Le CPU a gagné').
- IMPACT MOYEN — clearTimeout avant chaque nouveau setTimeout ; désactiver les actions joueur pendant le tour CPU (state 'cpuThinking') avec animation de la main adverse.
- IMPACT FAIBLE — Tri de main par bouton (couleur/valeur), suggestion de meld via findMeld sur la main joueur (bouton 'Indice').

===== Rummi Kub 3D (RummikubGame, l.976-1122) (score 3.5, effort 3j) =====
BUGS:
- DUPLICATION DE TUILES (même famille de bug que Rami) : cpuTurn (l.1008-1027) capture `pool` du rendu où il a été planifié ; après draw() du joueur (l.1042-1048), le cpuTurn planifié lit le pool pré-pioche et prend pool[0] = la tuile que le joueur vient de prendre → tuile dupliquée entre rack joueur et rack CPU.
- SCORE DE VICTOIRE FAUX : place() (l.1029-1041) appelle endGame('player') après setMelds/setRack — endGame (l.997-1006) lit `melds` (sans le meld gagnant) et `rack` (contenant encore les tuiles posées) : s = anciens_melds + 50 - valeur_du_meld_gagnant. Le record submit() est faux tandis que le modal (l.1113) recalcule correctement après commit — divergence record/affichage.
- Timeouts cpuTurn empilés sans clearTimeout (l.1040, l.1047), cleanup l.1050 ne couvre que le dernier — mêmes désynchronisations d'état que Rami.
- Règles tronquées : pas de jokers (le vrai Rummikub en a 2 sur 106 tuiles — ici 104), aucune manipulation de la table (réarranger les melds existants est LE cœur du Rummikub), le CPU n'a pas de contrainte d'ouverture 30 pts, le joueur peut poser plusieurs fois par 'tour' ; winner jamais affiché dans le modal.
UX:
- Le calcul du score final est dupliqué inline dans le JSX du modal (l.1113, expression de 3 réductions imbriquées) — illisible et déjà désynchronisé de endGame ; devrait être une seule fonction.
- Tuiles rack 48x66px : bonne taille tactile (le meilleur du fichier) ; mais tuile noire #111827 (l.932) sur fond de rack brun sombre (l.1620) = contraste limite pour lire le chiffre.
- Tour CPU invisible (800ms puis message texte) ; cpuMelds est stocké (l.1020) mais JAMAIS rendu — le joueur ne voit pas ce que le CPU a posé, alors que la table (rummiMeldsStyle) n'affiche que les melds du joueur : information de jeu essentielle manquante.
- Stat 'Pose' `${selectedValue}/30` (l.1078) est un bon pattern d'affordance — à généraliser.
AMELIORATIONS:
- IMPACT FORT — Même refactor useReducer que Rami (états conjoints pool/racks/melds, actions atomiques) pour éliminer duplication de tuiles et scores faux ; factoriser le moteur CPU commun aux deux jeux (findMeld/findRummiMeld sont déjà des quasi-doublons, l.748-769 vs l.951-972 — DRY).
- IMPACT FORT — Rendre cpuMelds sur la table (deux zones : 'Vos poses' / 'Poses CPU') — actuellement le joueur joue à l'aveugle contre l'adversaire.
- IMPACT FORT — Ajouter les 2 jokers et l'extension de melds existants (tap sur un meld de la table avec 1 tuile sélectionnée compatible) — sans cela le jeu s'appelle Rummikub mais n'en a pas la profondeur.
- IMPACT MOYEN — Structure de tour stricte (1 pose OU 1 pioche par tour), contrainte d'ouverture 30 pour le CPU aussi, annonce du vainqueur dans le modal.
- IMPACT FAIBLE — Animation de pose (tuile qui glisse du rack vers la table via framer-motion layoutId), tri du rack par bouton couleur/valeur (sortTiles existe déjà l.974).

===== Blackjack (score 6, effort 2.5j) =====
BUGS:
- CRITIQUE — payout du Double faussé par closure périmée : doubleDown() fait setBet(b => b + extra) puis appelle revealAndSettle → dealerPlay → settle via setTimeout, mais settle() lit `bet` capturé au render AVANT le doublement (l.609-625). Un double gagnant paie bet*2 avec l'ancienne mise : le joueur perd la moitié de son gain, et le message RESULT_MESSAGES affiche aussi le mauvais montant. Passer bet en paramètre de revealAndSettle/settle ou utiliser un ref.
- CRITIQUE — aucun timer nettoyé : deal() (setTimeout 800ms l.509), revealAndSettle (400ms l.576), dealerPlay (boucle récursive setTimeout 600ms l.589), addChip (350ms l.481) ne sont ni stockés ni annulés. Si l'utilisateur tape '← Tables' (recharge) ou onBack pendant que Marcel joue, settle() se déclenche quand même : setBankroll sur une table déjà réinitialisée, ou setState après démontage → état incohérent / warning React.
- HAUT — double-tap sur 'Tirer' : hit() lit playerHand depuis la closure du render courant ; deux taps rapides avant re-render tirent 2 cartes du shoe mais le second setPlayerHand écrase le premier → une carte disparaît du jeu et le score est faux. Guarder avec un flag ou useReducer.
- HAUT — course entre le check blackjack et les actions : deal() planifie revealAndSettle après 800ms si 21 (l.509-513), mais phase='playing' est déjà actif : le joueur peut cliquer Tirer/Doubler pendant ces 800ms, puis le timeout écrase avec la main initiale [c3,c4] → double règlement / états contradictoires.
- MOYEN — règle fausse : après un split, une main 2-cartes valant 21 est comptée blackjack par settle() (isBlackjack(pHand), l.602) et payée 3:2 — un 21 après split doit payer 1:1.
- MOYEN — règle visuelle fausse : sur blackjack joueur, revealAndSettle → dealerPlay fait tirer le croupier jusqu'à 17 (l.585) alors qu'il devrait seulement révéler sa carte cachée.
- MINEUR — affichage résultat main 1 après split (l.947-951) : le montant montré est toujours ±bet même pour 'blackjack' (+bet au lieu de +1.5×bet) et la condition `result && splitResult` masque le résultat main 1 si splitResult est null.
UX:
- Feedback tactile inexistant : tous les retours visuels passent par onMouseEnter/onMouseLeave (ActionButton l.403-412, jetons l.1050-1059, boutons header) — sur mobile le hover 'colle' après le tap (sticky hover) et il n'y a aucun état :active/pressed. Aucune vibration (navigator.vibrate).
- Débordement horizontal en split sur mobile : deux mains côte à côte avec cartes fixes 80×120px et gap 32 (l.936-971), sans flexWrap ni réduction de taille — sur un écran 360-390px, 3+ cartes par main sortent de l'écran, aggravé par overflow:'hidden' sur le conteneur racine (l.811) qui coupe le contenu au lieu de scroller.
- minHeight:'100vh' (l.687/803) sur mobile : la barre d'URL du navigateur masque les contrôles du bas — utiliser 100dvh.
- Boutons Retour/Tables (~35px de haut, padding '8px 16px') et 'Effacer' sous les 44px recommandés.
- Aucun retrait de jeton possible : addChip empile mais on ne peut pas taper la mise pour retirer un jeton, seulement tout effacer.
- Bannière de résultat whiteSpace:'nowrap' fontSize 22 (l.1010) : '🎉 BLACKJACK ! +150€' déborde sur écrans <380px.
- Aucun son, pas de mode rapide pour accélérer le tour du croupier (600ms/carte non-skippable).
AMELIORATIONS:
- IMPACT MAX — corriger le payout du double : passer la mise effective en argument à travers revealAndSettle(dHand,pHand,sHand, effectiveBet) → dealerPlay → settle, au lieu de lire `bet` en closure (l.571-634).
- IMPACT MAX — centraliser les timers dans un useRef<number[]> + cleanup useEffect au démontage, et les annuler dans recharge()/nextRound() ; désactiver les ActionButtons pendant les 800ms post-deal (phase intermédiaire 'dealing').
- IMPACT FORT — cartes responsives : width: 'min(80px, 18vw)' avec ratio 2:3, et flexWrap + gap réduit sur les mains splittées pour tenir sur 360px.
- IMPACT FORT — remplacer onMouseEnter/Leave par des classes CSS :active + transform scale(0.96) au touch, et ajouter navigator.vibrate(10) sur addChip/hit et vibrate([30,50,30]) sur blackjack — le fichier injecte déjà ANIMATION_STYLES, y ajouter les règles.
- IMPACT MOYEN — persister le bankroll par table dans localStorage : actuellement recharge() (l.649) renvoie à la sélection et selectTable réinitialise à table.bankroll — un client qui quitte perd sa progression, ce qui tue la rejouabilité en restaurant.
- IMPACT MOYEN — règles : payer 1:1 un 21 post-split (flag wasSplit), et sur blackjack joueur ne révéler que la carte cachée sans faire tirer le croupier.
- IMPACT MOYEN — juice : sons WebAudio courts (carte glissée, jeton, victoire) avec toggle mute, compteur bankroll animé (tween) au lieu d'un saut sec.
- IMPACT FAIBLE — proposer 'Assurance' quand le croupier montre un As, et un historique des 5 dernières mains (W/L/P) pour la profondeur.

===== Bataille (War) (score 4.5, effort 2j) =====
BUGS:
- CRITIQUE — deux paquets différents à l'initialisation : useState(() => freshDeal()[0]) pour pDeck et useState(() => freshDeal()[1]) pour cDeck (l.134-135) appellent freshDeal() DEUX fois. Le joueur reçoit 26 cartes d'un mélange A, le CPU 26 cartes d'un mélange B : cartes dupliquées visibles (deux A♠ peuvent s'affronter) et cartes absentes, dès la première partie. Corrigé seulement si on clique 'Rejouer' (newGame utilise un seul freshDeal). Fix : const [p, c] = useMemo(freshDeal, []) ou initialiser les deux états depuis un même useState<[Card[],Card[]]>.
- HAUT — écran de victoire prématuré/faux : winner = pDeck.length === 0 ? 'cpu' : ... (l.220) est évalué pendant l'animation, alors que la dernière carte du joueur est dans pCard. Si le joueur joue sa dernière carte, 'Défaite 💀' s'affiche pendant ~1,9s (700+1200ms) même s'il GAGNE le pli et récupère les cartes ; le bouton d'action disparaît aussi (l.379). Le winner doit inclure pCard/cCard et les warCards, ou n'être calculé qu'en phase idle.
- HAUT — cartes de guerre perdues en fin de partie : dans la branche guerre (l.207-208), si remainP ou remainC tombe à 0, phase='victory' immédiatement — le pot warCards (jusqu'à 8+ cartes) n'est jamais attribué et le perdant est celui qui n'a plus de cartes, alors que la règle classique fait retourner la dernière carte. De plus si LES DEUX tombent à 0, winner='cpu' arbitrairement (pDeck testé en premier, l.220).
- MOYEN — bouton mort pendant 600ms : après une guerre, phase='war' pendant 600ms (l.211) ; le bouton affiche '⚔️ Résoudre la guerre !' et n'est PAS disabled (l.382 ne teste que 'animating'), mais drawBattle early-return car phase !== 'playing' (l.162) → le tap ne fait rien, l'utilisateur croit à un bug.
- MINEUR — la règle implémentée ne pose que les 3 cartes face cachée puis re-tire depuis le deck : variante acceptable, mais la 4e carte de guerre n'est pas retournée automatiquement, il faut re-taper — non expliqué à l'écran.
UX:
- Boutons header trop petits : retour ChevronLeft (l.232) et RotateCcw (l.244) font ~30×30px (padding 6px + icône 14-18px), sous les 44px tactiles minimum.
- 'Rejouer' (RotateCcw) réinitialise la partie sans confirmation — un tap accidentel en pleine partie de 80 plis détruit tout.
- Rythme trop lent pour un jeu sans décision : 700ms + 1200-1400ms par pli, non skippable ; une partie de bataille dure couramment 100-300 plis → 5-10 minutes de tap répétitif. Aucun mode auto ni vitesse ×2.
- Pendant les 1,2s de résolution, le bouton est grisé : la moitié du temps de jeu est de l'attente forcée.
- Aucun feedback tactile (:active, vibration) sur le bouton principal ; aucune animation sur les cartes qui rejoignent le deck gagnant (elles disparaissent sèchement).
- userSelect:'none' présent (bien), mais pas de touch-action: manipulation → double-tap zoom possible sur le bouton de tirage.
- Le WarPile en petites cartes 44×62 dans la bannière (l.301-308) peut faire sauter la mise en page quand 8+ cartes s'empilent (multi-guerres).
AMELIORATIONS:
- IMPACT MAX — corriger le double freshDeal : const initial = useRef(freshDeal()); useState(() => initial.current[0]) / [1], sinon le jeu est objectivement cassé (doublons visibles).
- IMPACT MAX — mode auto/rapide : un toggle 'Auto ▶' qui enchaîne les plis à 400ms et un multiplicateur de vitesse — la bataille n'a aucune décision, le seul gameplay est le rythme ; c'est LA feature qui rend le jeu jouable en attendant un plat.
- IMPACT FORT — calculer winner uniquement quand pCard/cCard sont null et inclure warCards dans la résolution de fin (attribuer le pot au gagnant du dernier pli, ou retourner la dernière carte de guerre).
- IMPACT FORT — limiter la durée : proposer 'Partie rapide' (13 cartes chacun) ou victoire aux points après N plis — une vraie bataille 52 cartes peut être quasi infinie (les parties peuvent boucler), rédhibitoire au restaurant.
- IMPACT MOYEN — pendant phase 'war' de 600ms : soit disabled le bouton avec le libellé, soit permettre le tap en supprimant le timeout intermédiaire (l.210-212) et en autorisant drawBattle en phase 'war'.
- IMPACT MOYEN — juice : faire glisser visuellement les cartes gagnées vers le deck du vainqueur (framer-motion est dispo), navigator.vibrate(15) au tirage et vibrate([40,60,40]) sur GUERRE, compteur de série de plis gagnés d'affilée.
- IMPACT FAIBLE — agrandir les cibles tactiles header à 44px et ajouter une confirmation (ou un undo 3s) sur Rejouer.

===== Petits Chevaux 3D (Mensch ärgere dich nicht) (score 5.5, effort 4j) =====
BUGS:
- Timers non nettoyés: dans roll() (l.225) et dans l'effet bot (l.290), le setTimeout interne de 380ms n'est jamais clear — le cleanup (l.306) ne clear que le timer externe. Si le composant est démonté ou si l'état change entre-temps, setState est appelé après unmount (fuite + warning React), et un dé obsolète peut être appliqué au mauvais joueur.
- Effet de bord dans un updater d'état: setTournament() est appelé À L'INTÉRIEUR du setState de move() (l.268-270). En React 18 StrictMode l'updater peut s'exécuter deux fois → les points de tournoi sont doublés. À sortir dans un useEffect sur state.winner.
- Règle de la colonne d'arrivée fausse: piece.finished n'est vrai que si target === FINISH_STEP (57, l.250), c.-à-d. la DERNIÈRE case de la colonne. Les 4 pions doivent chacun atterrir exactement sur la case 6 — dans le vrai jeu les pions remplissent la colonne depuis le fond (57 puis 56, 55...). Résultat: fin de partie interminable, et les 4 pions finis s'empilent visuellement sur la même case (pieceCell clamp Math.min(5,...) l.121).
- Saut autorisé dans la colonne d'arrivée: aucune vérification de passage au-dessus d'un pion dans HOME_PATHS — la règle classique interdit de sauter ses propres pions dans la colonne. Seule la case d'arrivée exacte est bloquée (hasOwnPieceAt l.145).
- Règle des 3 lancers manquante: quand tous les pions d'un joueur sont à la maison, la règle standard lui donne 3 tentatives pour faire un 6. Ici un seul lancer puis passe (l.228-232) — frustrant et non conforme.
- Règle non documentée: une capture donne un tour supplémentaire (l.271 `next.die === 6 || captured`) — ce n'est pas dans la liste RULES affichée au joueur (l.70-76) et ce n'est pas la règle standard. Incohérence règles affichées / règles codées.
- Chevauchement visuel de pions adverses: dans addPieces (l.874-879), l'index de pile (stack) n'est calculé que parmi les pions du MÊME joueur, mais crowded compte tous les joueurs. Deux pions de joueurs différents sur une case protégée reçoivent tous deux l'offset [-0.09,-0.09] et se superposent exactement.
- Mode 'individuel' est un no-op: sélectionnable dans le setup (l.505-514) mais isBot/le scoring ne le traitent jamais — aucune différence avec 'ensemble'. Fonctionnalité fantôme trompeuse.
- Tournoi sans fin ni reset: les scores de tournoi ne sont jamais remis à zéro quand on relance une partie (start() ne touche pas tournament), et il n'y a aucune condition de victoire du tournoi.
- Performance: le groupe THREE complet (plateau + tuiles + pions, ~100+ meshes/géométries/matériaux) est détruit et reconstruit à CHAQUE changement d'état (useEffect l.672-688), y compris à chaque lancer de dé. Pression GC forte sur mobiles d'entrée de gamme; il faudrait ne reconstruire que pions + hints.
- preserveDrawingBuffer: true (l.564) sans capture d'écran nulle part — coût mémoire GPU inutile sur mobile. Pas de gestion de perte de contexte WebGL (webglcontextlost).
UX:
- Cibles tactiles 3D trop petites: un pion fait ~0.44 unités monde de diamètre, soit ~25-35px à l'écran sur téléphone — sous les 44px recommandés. Le raycast sur pointerdown (l.619-628) n'a aucune tolérance (pas de sphère de hit élargie ni de InstancedMesh cliquable agrandi). Les anneaux de hint aident mais sont fins (torus 0.035).
- Aucun feedback tactile ni sonore: pas de navigator.vibrate() sur capture/6/victoire, aucun son, aucune animation de déplacement du pion (il se téléporte instantanément d'une case à l'autre puisque la scène est reconstruite).
- Sur mobile <680px le bouton 'Joueurs' est masqué (display:none l.1349-1351) — impossible de changer de mode/joueurs en cours de partie sans quitter le jeu.
- Le message d'état (l.378) est le seul retour sur les erreurs de coup; taper un pion non jouable ne produit AUCUN retour (le raycast ignore silencieusement).
- Pass-and-play sans transition: en mode ensemble à 2-4 joueurs sur un seul téléphone, rien n'indique physiquement de passer l'appareil à part le texte du badge.
- Les boutons cachés d'accessibilité (l.385-389) n'ont pas de gestion de focus et la zone est left:-10000 — inutilisables au clavier/lecteur d'écran en pratique.
AMELIORATIONS:
- IMPACT FORT — Corriger la règle d'arrivée: finir dès qu'un pion atteint une case libre de la colonne en remplissant depuis le fond (remplacer target === FINISH_STEP par target >= premier emplacement libre depuis 57), et interdire le saut dans HOME_PATHS dans canMove(). C'est ce qui rend actuellement les parties anormalement longues.
- IMPACT FORT — Animer le déplacement des pions (tween de case en case avec un petit arc, ~120ms/case) au lieu de reconstruire la scène: conserver les Group de pions dans un ref et ne mettre à jour que positions + hints. Règle aussi le problème de perf de reconstruction totale.
- IMPACT FORT — Extraire le code de lancer dupliqué (roll() l.221 et effet bot l.287-300 sont copiés-collés) en une fonction applyRoll(die) et stocker les deux timers dans des refs nettoyées au unmount.
- IMPACT FORT — Élargir les hit-targets: ajouter une sphère invisible (rayon ~0.45) par pion actif marquée pieceIndex, et navigator.vibrate(30) sur capture + vibrate([40,60,40]) sur victoire.
- IMPACT MOYEN — Implémenter la règle des 3 lancers (compteur rollAttempts dans MenschState) et retirer le tour bonus sur capture, ou l'ajouter à RULES pour cohérence.
- IMPACT MOYEN — Déplacer setTournament hors de l'updater (useEffect sur state.winner), remettre le tournoi à zéro dans start(), et afficher une cible ('premier à 9 pts').
- IMPACT MOYEN — Bot: chooseBotPiece (l.153-171) ignore le danger (fuir un pion menacé) et la sortie de base sur 6 n'est pas priorisée; ajouter 3 heuristiques: sortir sur 6 > capturer > fuir une case menacée > avancer le plus avancé.
- IMPACT FAIBLE — Supprimer le mode 'individuel' ou l'implémenter (classement par ordre d'arrivée des 4 pions); supprimer l'import BORDER inutilisé; retirer preserveDrawingBuffer.

===== Scoopa 3D (Scopa italienne) (score 6, effort 3j) =====
BUGS:
- Faux positif 'Scopa!': dans play() (ScopaGame l.106), madeScopa = chosenCapture.length > 0 && next.table.length === 0. Or quand la manche se termine (mains et pioche vides), playScopaCard balaie la table vers lastCapturePlayer (scopaRules l.214-217) → next.table.length === 0 alors qu'aucune scopa n'a été faite. Le message affiche 'Scopa! La table est nettoyee.' à tort à chaque fin de manche où le dernier joueur capture. Le SCORING est correct (scopas incrémenté avant le sweep), seul le message ment — mais c'est visible à chaque manche.
- Règle scopa du dernier pli manquante: scopaRules l.195 compte une scopa même sur la toute dernière carte jouée de la manche. La règle italienne standard exclut la scopa sur le dernier coup du dernier tour. Il faut vérifier hands.every(empty) && deck.length === 0 avant d'incrémenter.
- Égalité à 11 points: si deux joueurs atteignent 11 avec le même score, phase = 'gameEnd' et scopaWinner retourne null → 'Egalite' (ScopaGame l.137). La règle veut que le jeu CONTINUE avec une manche supplémentaire jusqu'à ce qu'un joueur soit seul en tête à ≥11.
- Le donneur ne tourne jamais: startScopaRound (scopaRules l.291) remet currentPlayerIndex à 0 à chaque manche — le joueur 1 commence toujours, avantage systématique (le dernier à jouer ramasse la table restante). Devrait tourner: (round % numPlayers).
- Aucun fallback sur les images: <img src={`/cards/scopa/${card.value}_${card.suit}.jpg`}> (ScopaGame l.66) sans onError — un asset manquant donne une carte blanche vide et injouable visuellement. Ajouter un rendu texte de secours (valeur + symbole via SUIT_SYMBOLS, qui est importé mais jamais utilisé).
- Perte de partie sans confirmation: le bouton 'Reglages' (l.154) ramène au setup, puis 'Demarrer' appelle initScopaGame et détruit la partie en cours sans aucun avertissement. Deux taps accidentels = partie perdue.
- Import mort: SUIT_SYMBOLS importé (l.14) et jamais utilisé — signe que le fallback texte prévu n'a jamais été branché.
UX:
- Fuite d'information en pass-and-play: quand un joueur joue, la main du joueur suivant s'affiche IMMÉDIATEMENT (currentHand l.83 suit currentPlayerIndex) — le joueur qui vient de jouer voit les cartes de l'adversaire. Il manque un écran intermédiaire 'Passez la tablette au Joueur N — Toucher pour révéler'. C'est rédhibitoire pour un jeu de cartes à information cachée.
- Aucun mode solo/IA: dans un restaurant, le cas d'usage dominant est un client seul sur SON téléphone (le sous-titre dit d'ailleurs 'pass-and-play'). Sans bot, le jeu est inutilisable pour la majorité des clients.
- Zéro animation de capture: les cartes disparaissent instantanément de la table (re-render sec). framer-motion est disponible dans le projet et n'est pas utilisé — pas de vol de carte vers la pile, pas de flash 'SCOPA', pas de vibration.
- Les cartes 58-78px de large sont correctes, mais les boutons de choix de capture ('Prendre 7 D + ...') en ghostButtonStyle peuvent se multiplier (jusqu'à 5-6 combos) et wrapper sur 3 lignes en portrait — hiérarchie visuelle faible entre 'Prendre X' et 'Jouer'.
- Le compte de cartes capturées et de scopas par joueur n'est visible nulle part pendant la manche (seuls les scores cumulés via PlayerBadge) — impossible de savoir qui mène en Denari/cartes, ce qui est le cœur stratégique de la Scopa.
- tableSceneStyle en overflow:auto (l.313): à 4 joueurs avec 9-10 cartes sur table en portrait, la main peut sortir de l'écran et le scroll entre en conflit avec les taps.
AMELIORATIONS:
- IMPACT FORT — Ajouter un écran 'passe la tablette' entre chaque tour (état interstitiel 'handoff' avec le nom du joueur suivant et un bouton plein écran 'Voir mes cartes'), sinon retirer le mot 'pass-and-play' du sous-titre.
- IMPACT FORT — Mode solo contre bot: le moteur pur de scopaRules.ts rend ça facile — une IA greedy correcte tient en ~40 lignes (priorité: capture qui fait scopa > settebello > max denari > max cartes > défausse de la carte la moins risquée, i.e. dont la valeur ne complète pas une somme facile).
- IMPACT FORT — Corriger le message 'Scopa!' fantôme et la scopa du dernier pli (2 lignes dans playScopaCard + 1 condition dans play()).
- IMPACT MOYEN — Animer avec framer-motion: layoutId par card.id pour que les cartes volent de la main vers la table et de la table vers un compteur de pile; overlay 'SCOPA!' animé + navigator.vibrate(50).
- IMPACT MOYEN — Afficher un mini-tableau live par joueur: cartes capturées / denari / scopas (les données sont déjà dans state.captures et state.scopas, il ne manque que l'affichage).
- IMPACT MOYEN — Continuer la partie en cas d'égalité à 11 (remplacer la condition l.224 de scopaRules par: gameEnd seulement si un unique joueur a le max ≥ 11) et faire tourner le premier joueur à chaque manche.
- IMPACT FAIBLE — Fallback onError sur les <img> avec rendu texte SUIT_SYMBOLS; dialogue de confirmation avant de relancer une partie depuis 'Reglages'; précharger les 40 images au setup pour éviter les pop-in.

===== Solitaire (Klondike, pioche 1 carte) (score 6, effort 3j) =====
BUGS:
- CRITIQUE mobile : aucun event tactile. Le drag & drop repose exclusivement sur onMouseDown + window 'mousemove'/'mouseup' (lignes 552-620). Sur téléphone, aucun onTouchStart/onPointerDown → le glisser-déposer annoncé dans les instructions (ligne 1170 « Glisser-déposer supporté ») ne fonctionne pas du tout au tactile. Seul le tap-pour-sélectionner marche (via les click synthétiques).
- CRITIQUE mobile : onDoubleClick (envoi auto à la fondation) ne se déclenche pas de façon fiable au double-tap sur iOS/Android, et sans touch-action:manipulation le double-tap déclenche le zoom navigateur à la place.
- Interférence sélection/double-clic desktop : un double-clic émet aussi 2 événements click → handleCardClick sélectionne puis désélectionne la carte avant que handleDoubleClick ne s'exécute ; flash visuel de sélection parasite et, si le 2e click atterrit sur une cible valide, la carte peut être déplacée au tableau au lieu de la fondation.
- Undo rembobine le chrono : cloneState inclut time (ligne 113) et undo() restaure l'état complet (ligne 626) → annuler un coup fait reculer le timer affiché de plusieurs secondes.
- clickStock incrémente moves et pousse l'historique même quand stock ET waste sont vides (lignes 386-396) : cliquer sur l'emplacement vide crée des « coups » fantômes et pollue l'undo.
- canAutoComplete (ligne 660) vérifie allFaceUp (tableau + stock vide) mais pas la waste : le bouton « Auto ✓ » peut apparaître avec des cartes enterrées dans la défausse et s'arrêter à mi-chemin sans finir la partie ni expliquer pourquoi.
- runAutoComplete (ligne 654) contourne pushHistory et son plafond de 50 entrées : setHistory(h => [...h, ...history.slice(0,-1)]) peut pousser ~40+ états d'un coup, historique non borné (shadowing de la variable d'état `history` par une locale du même nom en prime).
- Expression isDropTarget (lignes 1018-1024) : précédence cassée `drag?.active && drag.sourceType !== 'tableau' || drag?.sourceIndex !== colIdx ? ... : false` — le `||` s'évalue avant le ternaire ; ça fonctionne par accident (les cas dégénérés retombent sur falsy) mais l'intention d'exclure la colonne source n'est garantie que par le garde-fou de tryMove, code fragile.
- stateRef.current = state assigné pendant le rendu (ligne 335) : anti-pattern React (impureté de rendu), risque avec le mode concurrent ; devrait être dans un useEffect.
UX:
- Zones de tap trop petites : les cartes enterrées d'une colonne n'exposent que faceUpPeek = max(20, w*0.34) ≈ 20-24px de hauteur cliquable, et faceDownPeek ≈ 12px — bien sous les 44px recommandés ; sélectionner une carte au milieu d'une pile au doigt est très frustrant.
- cardWidth = max(44, w/7.5) : sur un téléphone 360px on tombe à 48px de large par carte, textes de rang à 9px — lisible mais limite ; aucune adaptation portrait (ex : réduire à draw-1 avec waste superposée, ou layout 2 rangées).
- Aucun feedback tactile/sonore : pas de navigator.vibrate() sur un coup valide/invalide, pas de son, pas d'animation de déplacement de carte (les cartes se téléportent, seule la transition top 0.15s existe).
- Pas de pause : le chrono tourne même si le client pose son téléphone ; pas de gestion visibilitychange.
- userSelect none est posé mais pas touch-action → scroll parasite de la page pendant une tentative de drag tactile, et zoom sur double-tap.
- Le tap sur le fond désélectionne (handleBgClick) mais aucune indication d'erreur quand on tape une cible invalide : la sélection disparaît silencieusement (tryMove → setSelection(null)), le joueur ne comprend pas pourquoi.
AMELIORATIONS:
- IMPACT 1 — Migrer tout le drag vers les Pointer Events : remplacer onMouseDown/mousemove/mouseup par onPointerDown + setPointerCapture + pointermove/pointerup, ajouter touchAction:'none' sur les cartes et touchAction:'manipulation' sur le conteneur. C'est LE correctif qui rend le jeu réellement jouable au restaurant sur téléphone.
- IMPACT 2 — Remplacer le double-clic par un tap simple intelligent : au tap sur une carte du dessus, si canPlaceOnFoundation est vrai, l'envoyer directement à la fondation (comportement Solitaire mobile standard), sinon sélectionner. Supprime le besoin de onDoubleClick.
- IMPACT 3 — Agrandir les hit-zones des cartes empilées : envelopper chaque CardView du tableau dans un div dont la hauteur cliquable = faceUpPeek mais avec un ::before étendu, ou passer faceUpPeek à max(32, w*0.42) et permettre le layout vertical scrollable ; viser ≥ 40px par carte sélectionnable.
- IMPACT 4 — Juice : navigator.vibrate(10) sur pose valide, vibrate([30,50,30]) sur victoire ; animer le vol des cartes vers la fondation pendant runAutoComplete avec un délai de 80ms entre coups (actuellement tout est appliqué en un seul setState, l'auto-complete est instantané et sans plaisir) ; framer-motion est dispo, utiliser layoutId par card.id pour des déplacements animés gratuits.
- IMPACT 5 — Corriger canAutoComplete pour exiger state.waste.length <= 1 ou vérifier qu'une solution complète existe (simulation autoMoveToFoundation jusqu'au bout avant d'afficher le bouton).
- IMPACT 6 — Exclure time du snapshot d'undo (restaurer tout sauf time) et ignorer le clic stock quand stock et waste sont vides.
- IMPACT 7 — Rejouabilité : ajouter un score Vegas ou standard (10 pts/fondation, -2/recyclage), un mode pioche-3, et persister meilleur temps/score en localStorage comme le fait HigherLower.
- IMPACT 8 — Pause auto : useEffect sur document.visibilitychange pour geler le timer quand l'onglet est masqué.

===== Plus ou Moins (Higher/Lower) (score 5.5, effort 1.5j) =====
BUGS:
- EXPLOIT majeur du toggle As : setAceHigh est modifiable entre deux tirages (seulement disabled pendant 'feedback', ligne 320). Quand la carte actuelle est un As, basculer sur « As bas (1) » donne cv = 0 → « Plus haut » est correct à 100% (nv >= 0 toujours vrai, ties incluses). Symétriquement As haut + « Plus bas » ≈ garanti. Un client peut faire un streak infini et truster le record.
- cardValue incohérent (lignes 13-16) : As bas retourne 0, mais RANKS.indexOf('2') = 0 aussi → A et 2 ont la même valeur en mode as-bas ; le label du bouton dit « As haut (14) » alors que le code retourne 13 (et K = 11), valeurs fictives.
- Les égalités comptent toujours comme correctes pour LES DEUX choix : correct = higher ? nv >= cv : nv <= cv (ligne 160). Tirer le même rang (~7,7% des tirages) est une victoire gratuite quel que soit le guess — règle molle, jamais annoncée au joueur.
- Tirage avec remise, pas de deck (randCard, lignes 18-23) : la même carte exacte (rang + couleur) peut sortir deux fois d'affilée (« 10♠ puis 10♠ »), ce qui paraît buggé aux yeux du client et rend tout raisonnement de comptage impossible.
- Le StreakBadge affiche « x1.5 / x2 / x3 / x4 » (ligne 115) mais il n'existe AUCUN score à multiplier — totalCorrect s'incrémente toujours de 1. Le multiplicateur est purement décoratif/mensonger.
- handleGuess capture streak/lives/bestStreak par closure dans le setTimeout de 1000ms (lignes 166-192) : sûr aujourd'hui uniquement parce que tout est disabled pendant 'feedback' ; toute évolution (skip du feedback, raccourci clavier) créera des états incohérents. Utiliser les updaters fonctionnels.
UX:
- Boutons de réponse corrects (padding 14px ≈ 48px de haut) mais le toggle As (~26px de haut, ligne 322) et le bouton retour (padding 6, ~30px) sont sous les 44px tactiles.
- Délai de feedback fixe de 1000ms non skippable : sur mobile le rythme est mou ; les joueurs rapides veulent taper pour passer.
- Aucun retour haptique/sonore (navigator.vibrate jamais utilisé) alors que c'est un jeu à feedback binaire, cas d'usage idéal.
- Aucune indication de probabilité : le cœur du genre Higher/Lower est « 8 cartes sur 12 sont plus hautes » ; sans ça le jeu est un pile-ou-face sans décision intéressante.
- Perte de vie peu lisible : le cœur passe en opacity 0.3 sans animation de casse ni shake de l'écran ; on peut rater qu'on a perdu une vie.
- Historique de points 10px de diamètre : purement décoratif, illisible, non interactif.
AMELIORATIONS:
- IMPACT 1 — Corriger l'exploit : verrouiller le choix As au lancement de la partie (le déplacer dans un écran de démarrage ou ne l'autoriser que quand streak === 0), et normaliser cardValue sur 2-14 (A bas = 1, A haut = 14) pour matcher les labels.
- IMPACT 2 — Tirer dans un vrai deck de 52 cartes mélangé (réutiliser createDeck/Fisher-Yates de SolitaireGame.tsx), re-mélanger quand il est vide : supprime les doublons immédiats et permet d'afficher les probabilités.
- IMPACT 3 — Trancher les égalités : soit « égalité = perdu » (règle arcade classique, à annoncer « Égalité ! »), soit ajouter un 3e bouton « Égal » à gros payout. Actuellement le >= / <= silencieux fausse le jeu.
- IMPACT 4 — Rendre le multiplicateur réel : introduire un score (score += 100 * multiplier) affiché en gros, persisté en localStorage à côté de bestStreak — sinon supprimer le badge x2/x3/x4.
- IMPACT 5 — Afficher les cotes sous la carte actuelle : « ▲ 62% · ▼ 30% · = 8% » calculées sur les cartes restantes du deck ; c'est ce qui transforme un coin-flip en décision et crée la rejouabilité.
- IMPACT 6 — Juice : navigator.vibrate(15) sur correct, vibrate([40,60,40]) sur perte de vie avec animation shake du cœur (framer-motion dispo), permettre le tap-pour-skip du feedback (réduire timeout à 600ms + clic n'importe où pour passer).
- IMPACT 7 — Difficulté progressive : réduire la fenêtre de décision (timer de 5s après 10 de streak) ou introduire des cartes bonus (joker = vie supplémentaire) pour donner une courbe.
- IMPACT 8 — Agrandir toggle As et bouton retour à minimum 44px de hauteur tactile.

===== Échecs (vs CPU) (score 5.5, effort 3j) =====
BUGS:
- HIGH — Undo cassé : `handleUndo` restaure `history[history.length - 2]` et fait `slice(0, -2)`, or un seul snapshot est poussé par coup joueur (ligne 595). Résultat : le bouton Annuler est grisé après le 1er coup (alors qu'un tour complet joueur+CPU existe déjà) et, quand il devient actif, il annule DEUX tours complets au lieu d'un. Correct : `history[history.length - 1]` + `slice(0, -1)`.
- HIGH — `getBestMove` (minimax profondeur 3 + quiescence 2) tourne en synchrone sur le main thread dans un `setTimeout(..., 50)`. En milieu de partie (30-40 coups légaux), ça bloque l'UI 1 à 5 s sur un téléphone milieu de gamme : aucun tap traité, page figée. Il faut un Web Worker ou au minimum un découpage.
- MEDIUM — `handleUndo` force `setStatus('playing')` sans recalculer : si la position restaurée est un échec, le bandeau « Échec au roi » et le halo rouge sur le roi disparaissent à tort. Appeler `checkGameStatus(snap.board, snap.turn, snap.castling, snap.lastMove)`.
- MEDIUM — Aucune détection de nulle par répétition, règle des 50 coups ou matériel insuffisant : en finale R vs R le CPU shuffle à l'infini, la partie ne se termine jamais (mauvaise expérience client au restaurant).
- MEDIUM — Quand `getBestMove` retourne null (branche else ligne 619-621), `setTurn('w')` est appelé alors que le statut est déjà checkmate/stalemate : derrière le modal le bandeau affiche « Votre tour ». Incohérence d'état bénigne mais visible.
- LOW — Le `setTimeout` de l'IA n'est pas nettoyé au démontage : setState sur composant démonté si le client quitte pendant la réflexion (closure périmée, pas de crash en React 18 mais pattern fragile).
- LOW — La quiescence appelle `getLegalMoves(..., null)` : l'en passant est invisible dans la recherche tactique (l'IA peut mal évaluer une prise en passant).
- LOW — Le champ `captured` du snapshot (ligne 595) est calculé (double scan 8x8) mais jamais lu ; `let bg` ligne 879 jamais réassigné ; `checkGameStatus` + `getBestMove` recalculent deux fois les coups légaux noirs — travail mort à chaque coup.
UX:
- Cases < 44 px sur téléphone : `cellSize = floor((largeur - 48) / 8)` donne ~39 px sur un écran 360 px — sous le minimum tactile Apple/Android pour un jeu de précision. Un tap raté sélectionne la mauvaise pièce.
- Zéro feedback tactile : le seul feedback est un `onMouseEnter` scale(1.1) qui n'existe pas au toucher. Aucun retour visuel/haptique au tap (`:active`, `navigator.vibrate`), aucune animation de déplacement — les pièces se téléportent, on perd le fil du coup CPU.
- Boutons « Retour » et « Annuler » font ~34 px de haut (padding 8px + font 14) — sous 44 px.
- Promotion forcée en dame sans UI de choix (`promotion: 'Q'` codé en dur lignes 184/199) — un joueur ne peut jamais sous-promouvoir (cas de pat évitable).
- Pendant le freeze de l'IA, « CPU réfléchit… » avec spinner CSS peut se figer aussi (main thread bloqué) : impression de crash.
- Pas de possibilité de jouer les Noirs, pas d'écran d'accueil ni de règles pour un public restaurant qui ne connaît pas forcément les échecs.
AMELIORATIONS:
- IMPACT FORT — Corriger l'undo (index -1 / slice(0,-1) + recalcul du statut) : fonctionnalité annoncée mais cassée.
- IMPACT FORT — Déporter `getBestMove` dans un Web Worker (le moteur lignes 145-513 est déjà pur, extraction triviale) ; garder le spinner réactif et permettre d'annuler la réflexion.
- IMPACT FORT — Ajouter 3 niveaux de difficulté (depth 1 / 2 / 3, ou coup aléatoire parmi les N meilleurs) : à depth 3 + quiescence, un client casual perd systématiquement — frustrant pour un jeu de restaurant.
- IMPACT FORT — Détection des nulles : répétition triple (hash simple du board sérialisé), 50 coups, matériel insuffisant.
- IMPACT MOYEN — Animation de glissement des pièces (framer-motion `layoutId` par pièce, déjà dispo dans le projet) + `navigator.vibrate(10)` à la capture + son discret : le coup CPU devient lisible.
- IMPACT MOYEN — UI de choix de promotion (mini-modal 4 pièces) au lieu de `promotion: 'Q'` en dur.
- IMPACT MOYEN — Sur mobile, réduire le padding container (24px 16px ligne 699) et le `-48` ligne 565 pour gagner ~4 px/case et repasser au-dessus de 44 px ; agrandir les boutons header à min-height 44.
- IMPACT FAIBLE — Supprimer le champ `captured` mort du snapshot, réutiliser les coups légaux calculés dans `checkGameStatus` pour `getBestMove`, remplacer le hover scale par un feedback `touchstart`.

===== Reversi (menu + 3 difficultés + stats) (score 6, effort 2j) =====
BUGS:
- CRITICAL — Soft-lock quand le joueur doit passer après un coup CPU : dans l'effet CPU (lignes 242-250), si le joueur n'a aucun coup mais le CPU en a, le code fait `setMessage('Vous passez votre tour !'); setTurn(2)`. Or `turn` vaut déjà 2 → React bail-out, pas de re-render, l'effet (deps `[turn, gameOver, difficulty, screen]`) ne se redéclenche JAMAIS → le CPU ne rejoue plus, partie gelée définitivement. Ce cas arrive réellement en fin de partie Reversi. Fix : déclencher le tour CPU sur un compteur de coups plutôt que sur la valeur de `turn`, ou appeler directement la logique CPU en chaîne.
- HIGH — Effets de bord massifs dans l'updater `setBoard(prev => {...})` (lignes 209-257) : `setTurn`, `setMessage`, `setMoveLog`, `setLastPlaced`, `setFlipping`, `endGame` (qui écrit localStorage via `setLS` dans l'updater de `setStats`, ligne 279) sont appelés DANS la fonction updater. En React 18 StrictMode l'updater est exécuté deux fois → move log dupliqué, stats comptées double (victoire = +2), double écriture localStorage. Sortir toute la logique de l'updater : lire `board` via ref ou passer par un état dérivé.
- MEDIUM — `cpuThinking.current` n'est pas remis à false dans le cleanup de l'effet : si les deps changent entre `cpuThinking.current = true` et le tir du timer (retour menu puis reprise, StrictMode double-mount), le flag reste true et `if (cpuThinking.current) return` bloque le CPU. `startNewGame` le réinitialise, mais le pattern est une bombe à retardement — reset dans le cleanup.
- LOW — `setTimeout(() => setFlipping([]), 600)` (lignes 232 et 290) jamais nettoyé au démontage : setState post-unmount si le client quitte pendant l'animation.
- LOW — Dans `minimax`, un passage de tour consomme un niveau de profondeur (`depth - 1`, ligne 137) : l'expert voit un demi-coup de moins dans les séquences avec pass — l'IA « Expert » est légèrement plus faible qu'annoncé dans ces positions.
UX:
- Cases de 33x33 px (ligne 590, `cellSize = 33` codé en dur) — nettement sous les 44 px tactiles. Sur un plateau 8x8 dense, les taps ratés sont fréquents, surtout pour viser un coin.
- Plateau figé à 288 px de large (ligne 569) : sur une tablette au restaurant il occupe un quart de l'écran, minuscule ; aucune adaptation à la largeur disponible.
- Aucun retour au tap sur case invalide : le tap est silencieusement ignoré (`if (!flips.length) return`, ligne 287) — un débutant ne comprend pas pourquoi « ça ne marche pas ». Un shake/flash de la case ou un toast « coup invalide » manque.
- Pas de vibration ni de son sur pose/retournement alors que l'animation flip existe déjà — la moitié du « juice » est là, l'autre manque.
- Bandeau de fin de partie discret (simple ligne colorée) : pas de modal de victoire, pas de bouton revanche mis en avant — faible récompense pour le joueur.
- Le passage de tour n'est annoncé que par un message texte fugace ; pendant les 400-700 ms du CPU rien n'indique où il va jouer (le halo `lastPlaced` arrive après, c'est bien, mais un surlignage du coup CPU 300 ms avant la pose serait plus lisible).
AMELIORATIONS:
- IMPACT FORT — Corriger le soft-lock du double `setTurn(2)` : remplacer le déclencheur d'effet par un `moveCount` incrémenté à chaque demi-coup (dep de l'effet), ou refactorer en machine à états où « CPU joue » est appelé explicitement, y compris après un pass joueur.
- IMPACT FORT — Extraire toute la logique du updater `setBoard` : calculer `move`, `flips`, `next` AVANT, puis appeler les setters au niveau du timeout. Corrige d'un coup StrictMode, stats doublées et lisibilité.
- IMPACT FORT — Rendre le plateau responsive : `width: min(100vw - 32px, 420px)` et cases en `flex-1 aspect-square` — passe les cibles tactiles au-dessus de 44 px sur quasi tous les appareils.
- IMPACT MOYEN — Feedback coup invalide (animation shake CSS sur la case + `navigator.vibrate([30])`) et vibration courte sur retournements (proportionnelle à `flips.length` — récompense les gros coups).
- IMPACT MOYEN — Modal de fin de partie avec confettis/emoji animé (framer-motion dispo), score final en grand, boutons « Revanche » / « Changer de difficulté » — la boucle de rejouabilité est déjà servie par les stats localStorage, il manque juste la célébration.
- IMPACT MOYEN — Corriger la profondeur minimax sur pass (`minimax(board, depth, !maximizing, ...)` sans décrémenter) et échelonner la profondeur expert en fin de partie (depth 6-8 quand < 12 cases vides, résolution exacte possible).
- IMPACT FAIBLE — Nettoyer les timeouts de `setFlipping` dans un ref + cleanup ; remettre `cpuThinking.current = false` dans le cleanup de l'effet ; aria-labels sur les cases (`A1`…`H8`) pour l'accessibilité.

===== Quiz Français (QuizGame) (score 5.5, effort 2j) =====
BUGS:
- CRITIQUE — Question injouable (l.140): a: "Saké" mais l'option est "Sake" (sans accent). `opt === current.a` n'est jamais vrai : aucune réponse n'est correcte, la bonne réponse n'est jamais surlignée en vert, et le 50/50 (`filter(o => o !== current.a)`) peut éliminer "Sake" lui-même. Le joueur perd une vie garantie sur cette question.
- Race condition avec 'Passer' pendant le feedback : `useSkip` ne vérifie que `chosen`, pas `feedback` (l.296). Après un timeout ou une mauvaise réponse (chosen reste null au timeout), le joueur peut cliquer 'Passer' pendant la fenêtre de 1200ms → `advanceQuestion` est appelé deux fois (une fois par le skip, une fois par le setTimeout en attente) → une question est sautée silencieusement, voire double `endGame`. Idem pour `use5050` utilisable pendant le feedback 'timeout'.
- Effet de bord dans un updater setState : `handleTimeout()` est appelé DANS le callback de `setTimeLeft` (l.199-203). En React 18 StrictMode les updaters peuvent être invoqués deux fois → double `setTimeout(advanceQuestion)`. C'est un anti-pattern hooks ; le décompte de vie/avance doit sortir de l'updater.
- Fuite de timers : les `setTimeout` de `pick`/`handleTimeout` (l.218, 273, 283) ne sont jamais nettoyés. Si le joueur appuie sur ← retour pendant le feedback, `advanceQuestion` s'exécute sur l'écran menu (setState après 'démontage' logique, idx incrémenté hors jeu). Aucun cleanup au unmount du composant non plus.
- Le timer expire à l'affichage de '1s' : `if (t <= 1)` déclenche le timeout quand il reste 1 seconde affichée → le joueur n'a réellement que 14s sur les 15 annoncées.
- Closure périmée dans le timer : `handleTimeout` capturé par l'interval lit `lives` du render où l'effet s'est monté ([screen, idx] en deps). Fonctionne aujourd'hui par coïncidence (lives ne change qu'avec idx) mais cassera au premier refactor.
- Données : "Gymnistique" (l.122, faute), "Quel pays a la plus longue frontière terrestre ? → Chine" est contestable (Russie a la plus longue frontière totale selon la plupart des sources), et "pays le plus de fuseau horaire" (l.24) a une faute de grammaire.
- `shuffle` via `sort(() => Math.random() - 0.5)` est statistiquement biaisé (l.161) — utiliser Fisher-Yates.
- Le pourcentage de fin (l.385) divise par `QUESTIONS_PER_GAME * 150` alors que le max réel par question est 300 pts ((100+50)×2) → les médailles 🏆/🥈 sont incohérentes avec la vraie performance.
UX:
- Zones de tap trop petites : bouton retour p-1.5 ≈ 30px, boutons lifelines py-2 ≈ 34px, options py-2.5 ≈ 41px — tous sous les 44px recommandés sur mobile.
- Aucun retour haptique (`navigator.vibrate`) ni sonore sur bonne/mauvaise réponse — critique pour un jeu de bar/restaurant bruyant où le feedback tactile compte.
- Pas de pause : si le serveur apporte les plats, le timer de 15s continue. Quitter = tout perdre sans confirmation (le ← retour abandonne la partie instantanément sans dialog).
- Les options éliminées par le 50/50 restent des `<button>` à opacity 0.3 dans le flux — risque de tap accidentel visuellement ambigu (le disabled est là mais rien ne l'annonce).
- Le timer `transition-all duration-1000` sur la barre donne un rendu saccadé seconde par seconde au lieu d'un écoulement fluide.
- Aucun `touch-action: manipulation` / gestion du double-tap zoom sur les boutons de réponse pressés rapidement.
AMELIORATIONS:
- IMPACT MAX — Corriger la question Saké/Sake (l.140) et ajouter un test/validation au chargement : `QUESTIONS.every(q => q.o.includes(q.a))` en dev pour empêcher toute future question cassée.
- IMPACT MAX — Centraliser l'avance de question : remplacer les 3 chemins (pick/timeout/skip) par un seul état `phase: 'answering' | 'revealing'` + garder feedback dans `useSkip`/`use5050`, et stocker les setTimeout dans un ref nettoyé au unmount et au changement d'écran.
- IMPACT FORT — Sortir `handleTimeout` de l'updater : décrémenter timeLeft normalement et déclencher le timeout dans un `useEffect(() => { if (timeLeft === 0 && !feedback) handleTimeout() }, [timeLeft])`.
- IMPACT FORT — Juice : `navigator.vibrate(30)` sur bonne réponse / `vibrate([50,30,50])` sur erreur, confettis sur streak ≥3 (le composant existe déjà dans WordScrambleGame — l'extraire dans un fichier partagé), et flash +XXX pts animé (framer-motion est dispo) au lieu du score qui change sec.
- IMPACT FORT — Difficulté progressive : taguer les questions easy/medium/hard et trier la partie du facile au difficile ; réduire le temps (15s→10s) sur les 3 dernières questions.
- IMPACT MOYEN — Passer les options à min-height 48px et le back-button à 44px ; ajouter une confirmation avant d'abandonner via ←.
- IMPACT MOYEN — Anti-répétition : persister les ids des questions vues en localStorage pour ne pas retomber sur les mêmes 10 questions à chaque partie (rejouabilité, banque de 120 questions sous-exploitée).
- IMPACT MOYEN — Remplacer le calcul de médaille par `correctCount / questionsAnswered` plutôt que le score brut arbitraire (l.385).
- IMPACT FAIBLE — Fisher-Yates pour `shuffle`, corriger 'Gymnistique' et la question frontière Chine/Russie.

===== Anagramme Pro (WordScrambleGame) (score 6, effort 1.5j) =====
BUGS:
- '🏆 Nouveau record !' s'affiche à CHAQUE partie (l.467) : `endGame` écrit `bestScore: max(old, score)` dans localStorage AVANT que l'écran de fin ne relise `getLS` (l.452), donc `score >= bestScore` est toujours vrai dès que score > 0. Il faut comparer au bestScore d'AVANT la partie (capturé au startGame).
- Indice gaspillé : `useHint` fait `setHintUsed(true)` (l.348) AVANT de vérifier `availTile` (l.353). Si la lettre cible est déjà placée ailleurs (tuile en double mal positionnée), l'indice est consommé sans rien révéler et le bouton passe définitivement à '(utilisé)'.
- Surbrillance d'indice fausse : `isHint = hintUsed && letter && i < slots.filter(s => s !== null).length` (l.568) colore les N premiers slots remplis, pas le slot réellement révélé — après un indice, des lettres placées manuellement s'affichent en cyan 'indice'.
- Race 'Passer' pendant feedback : `nextWord` n'est pas gardé par `feedback` (l.636). Cliquer 'Passer →' pendant l'animation 'correct' (1s) déclenche `nextWord` deux fois (bouton + setTimeout en attente) → un mot est sauté silencieusement, ou double `endGame` en fin de pool.
- endGame appelé dans l'updater de `setTimeLeft` (l.238) : effet de bord dans un setState updater (double invocation possible en StrictMode) + closure périmée : si le timer expire pendant la fenêtre de feedback 1s, `endGame` capture score/wordsScored/bestStreak du render au montage de l'effet → les stats sauvées en localStorage n'incluent pas le dernier mot résolu.
- Stats faussées : `endGame` ajoute `elapsed` du mot EN COURS (non résolu) à totalTime (l.273-276), gonflant le 'temps moyen' persisté ; et un double endGame (bug Passer) réécrit les stats en ajoutant elapsed deux fois.
- Fuites : les setTimeout de checkAnswer (l.325, 326, 330) ne sont jamais nettoyés — retour au menu pendant le feedback → `nextWord`/`buildTiles` s'exécutent sur l'écran menu ; aucun cleanup au unmount.
- Données : 'CHAMELEON' (l.18) n'est pas français (CAMÉLÉON) — mot injouable pour un francophone ; indice 'Champignon qu'on mange' pour CHAMPIGNON (l.50) contient la réponse ; 'KALÉIDOSCOPE' (l.149) contient un É accentué contrairement à tous les autres mots (incohérence, et É absent de LETTER_COLORS).
- 'Passer' illimité et gratuit : aucune limite ni pénalité de temps/points — un joueur peut enchaîner les mots courts en spammant Passer, cassant l'économie du score.
- `shuffle`/`scramble` par `sort(() => Math.random() - 0.5)` biaisé (l.177, 255).
UX:
- Slots minuscules sur mots longs : `Math.min(38, floor(280/len)-2)` (l.575) donne ~19px de large pour BIBLIOTHECAIRE (14 lettres) et ~22px pour HIPPOPOTAME — impossible à retirer au doigt de façon fiable (cible <44px, très en dessous).
- Tuiles 40×46px légèrement sous le seuil 44px, et `hover:scale-110` reste 'collé' après un tap sur mobile (pas de hover réel en tactile).
- Aucun retour haptique ni sonore ; le confetti n'existe que sur bonne réponse, rien ne 'punit' visuellement une erreur à part le shake.
- Pas de pause ; le ← retour tue la partie sans confirmation et sans sauver le score en cours.
- En cas d'erreur, `buildTiles` RE-MÉLANGE tout le mot (l.332) : le joueur perd tout son travail y compris les lettres bien placées — frustrant, surtout sur les mots de 10+ lettres.
- Aucune indication qu'un remplissage complet auto-valide : le joueur découvre la validation-sanction à la première erreur.
AMELIORATIONS:
- IMPACT MAX — Corriger le faux 'Nouveau record' : capturer `prevBest = stats.bestScore` au startGame et comparer `score > prevBest` à l'écran de fin.
- IMPACT MAX — Sur mauvaise réponse, ne renvoyer que les lettres mal placées (comparer slot par slot avec currentWord.w) au lieu de tout re-mélanger via buildTiles — transforme la frustration en apprentissage.
- IMPACT FORT — Garde-fous concurrence : early-return `if (feedback) return` dans nextWord, stocker les timeouts dans un ref nettoyé au unmount/changement d'écran, sortir endGame de l'updater setTimeLeft (useEffect sur timeLeft===0).
- IMPACT FORT — Slots tactiles : passer à un layout scrollable ou 2 lignes avec largeur min 40px au lieu de rétrécir sous 20px ; ajouter `active:scale-95` seul (retirer hover:scale sur tactile via media (hover:hover)).
- IMPACT FORT — Équilibrer 'Passer' : coûter 10s de temps ou limiter à 3 passes par partie (afficher le compteur sur le bouton), sinon le leaderboard n'a aucun sens.
- IMPACT MOYEN — Difficulté progressive : trier le pool par longueur croissante (5-6 lettres d'abord) et augmenter le multiplicateur sur les mots longs — actuellement un mot de 14 lettres peut tomber en premier avec 90s au compteur.
- IMPACT MOYEN — Juice : vibration sur pose de tuile (10ms) et sur validation, animation framer-motion de la tuile qui 'vole' vers le slot, +pts flottant ; fixer isHint pour ne colorer que le slot réellement révélé (mémoriser son index).
- IMPACT MOYEN — Déplacer setHintUsed(true) APRÈS la vérification availTile, et bonus : proposer un 2e indice payant (-30 pts).
- IMPACT FAIBLE — Nettoyer la banque : CHAMELEON→CAMELEON, indice CHAMPIGNON, normaliser KALÉIDOSCOPE→KALEIDOSCOPE ; extraire getLS/setLS/shuffle/Confetti dupliqués avec QuizGame dans un module partagé games/utils.

===== Texas Hold'em (3 joueurs vs 2 CPU) (score 3.5, effort 3j) =====
BUGS:
- CRITIQUE — évaluateur sans kickers : score5() ne code que la catégorie + la carte la plus haute des 5 cartes (topVal, l.95-106). Une paire de 2 avec un As kicker (1_000_000+12) est ÉGALE à une paire d'As (1_000_000+12) → mauvais gagnant ou fausses égalités au showdown. Idem Full House : 222-AA (topVal=12) bat KKK-22 (topVal=11), c'est l'inverse de la règle. Double paire, carré et brelan comparés uniquement sur la carte haute, pas sur le rang de la paire/brelan.
- CRITIQUE — la quinte A-2-3-4-5 (wheel) est détectée (l.90-91) mais scorée avec topVal=12 (As), donc classée comme quinte à l'As au lieu de quinte au 5 : elle bat à tort une quinte au roi.
- CRITIQUE — tour d'enchères post-flop terminé après UN seul check : checkBettingDone() (l.623-630) retourne true si tous les joueurs actifs ont bet===currentBet. Post-flop currentBet=0 et tous les bets=0, donc dès que le premier joueur check, active.every(p => p.bet === 0) est vrai → bettingDone, les autres joueurs ne jouent jamais leur tour sur cette street. Le flop/turn/river défilent sans que le joueur humain puisse agir s'il n'est pas premier à parler.
- CRITIQUE — la BB n'a jamais son option pré-flop : quand tout le monde a suivi 20, checkBettingDone voit tous les bets à 20 et clôt le tour — la big blind (potentiellement le joueur humain) ne peut ni checker ni relancer.
- GRAVE — une relance peut BAISSER currentBet : applyAction 'raise' (l.591-600) fait currentBet = raiseAmount sans valider raiseAmount > currentBet. gs.raiseAmount est initialisé à 40 et n'est pas re-clampé quand currentBet monte : si un CPU relance à 100 et que le joueur clique 'Relancer 40', currentBet passe de 100 à 40, les callAmount des autres deviennent négatifs → état corrompu. Même bug côté IA : le garde-fou l.737 (chips > callAmount) ne garantit pas raiseAmt ≥ currentBet, min(player.chips, ...) peut produire une 'relance' inférieure à la mise courante.
- GRAVE — p.bet = totalPut (l.598) même si extra a été plafonné par p.chips (l.593) : le bet affiché/comparé dépasse ce qui est réellement au pot → checkBettingDone raisonne sur des montants faux.
- GRAVE — aucun side pot : totalBet est calculé mais jamais utilisé. Un joueur all-in à 50 peut gagner l'intégralité d'un pot où les autres ont mis 500 (doShowdown l.689-691 distribue tout le pot aux meilleurs scores sans plafond de contribution).
- MOYEN — slider de relance cassé quand currentBet*2 > chips : min > max sur l'input range (l.501-502), alors que canRaise (chips > callAmount) laisse le bouton actif.
- MOYEN — jetons perdus sur pot partagé : Math.floor(pot/winners.length) (l.690), le reste disparaît du jeu.
- MINEUR — CardEl : animate=true permanent avec key={i}, les composants ne sont pas remontés à la nouvelle main → l'animation de flip ne rejoue jamais après la main #1.
- MINEUR — setGs(s => ({ ...s, raiseAmount: Math.min(gs.players[0].chips, ...) })) l.513 lit gs (closure) au lieu de s : valeur potentiellement périmée.
UX:
- Boutons d'action ~34px de haut (padding 9px + fontSize 12) : sous le minimum tactile de 44px pour l'action la plus fréquente du jeu.
- Cartes 44x60 et texte 9-11px : lisibilité limite sur téléphone, les cartes CPU 32x44 sont quasi illisibles.
- Aucun feedback tactile : pas de vibration (navigator.vibrate), pas de son, pas d'animation de jetons qui glissent vers le pot — les gains/pertes sont juste un banner texte.
- 'Se coucher' toujours actif même quand le check est gratuit : un client de restaurant va folder par erreur des mains gratuites ; il faudrait au minimum une confirmation ou griser fold quand callAmount===0.
- Pas de pause ni de vitesse : les tours CPU (800-1400ms chacun) + délais de phase s'enchaînent sans contrôle, et si l'utilisateur quitte l'onglet le jeu continue en fond.
- Aucune persistance des jetons (recrédit silencieux à 1000 au bust, mention en 11px) : la notion de bankroll, cœur de la rejouabilité, est vidée de sens sans célébration ni game over.
- L'input range natif est difficile à manipuler au pouce ; les presets 25/50/75% aident mais font 24px de haut.
AMELIORATIONS:
- IMPACT MAX — réécrire score5() avec encodage complet base-13 : catégorie*13^5 + tiebreakers ordonnés (rang du brelan/paire puis kickers), et wheel scorée à 3. C'est ~20 lignes et ça corrige 4 bugs de règles d'un coup.
- IMPACT MAX — remplacer checkBettingDone par un suivi 'actedThisRound' par joueur (Set réinitialisé à chaque street et à chaque relance) : le tour se termine seulement quand tous les joueurs actifs ont agi ET égalisé currentBet. Corrige le check-skip ET l'option de la BB.
- IMPACT ÉLEVÉ — clamper la relance : dans applyAction, raiseAmount = Math.max(raiseAmount, currentBet + BB) et le plafonner au stack réel (p.bet + p.chips) ; synchroniser gs.raiseAmount avec le min à chaque changement de currentBet (useEffect ou dans applyAction).
- IMPACT ÉLEVÉ — side pots simples : au showdown, calculer les pots par palier de totalBet (le champ existe déjà) et attribuer chaque palier au meilleur éligible.
- IMPACT MOYEN — juice : animation framer-motion des jetons volant vers le pot à chaque mise, navigator.vibrate(30) sur action, confetti/scale sur victoire humaine, compteur de chips animé (spring). framer-motion est déjà dans le projet et n'est pas utilisé ici.
- IMPACT MOYEN — passer les boutons fold/check/call/raise à minHeight 48, et griser 'Se coucher' quand canCheck.
- IMPACT MOYEN — persister les chips dans localStorage + écran 'Vous êtes ruiné, on vous recrédite' explicite avec stats de session (mains gagnées, plus gros pot) pour la rejouabilité en restaurant.
- IMPACT FAIBLE — remonter CardEl par key={`${gs.handNum}-${i}`} pour rejouer l'animation de distribution, et redistribuer le reste du pot partagé au premier gagnant après le dealer.

===== Jeu du 421 (dés, jetons, vs 1-3 CPU) (score 4, effort 2j) =====
BUGS:
- CRITIQUE — hiérarchie des rangs cassée : le rang 'carte haute' a*100+b*10+c (l.61) va jusqu'à 653 (6-5-3), ce qui dépasse les paires (500-566), le 4-2-x (300-306) et les suites (200-206). Concrètement, 6-5-3 bat 6-6-5 (653 > 565) : un joueur avec une paire perd contre du néant. Les plages de rangs se chevauchent massivement.
- GRAVE — mauvaise règle de distribution des jetons : tokensTaken = loser.combo.tokens (l.307), c'est-à-dire la valeur de la PROPRE combinaison du perdant. Au 421, le perdant reçoit des jetons selon la combinaison du GAGNANT (winnerResult.combo.tokens). Résultat absurde : plus votre main perdante est bonne, plus vous êtes pénalisé.
- GRAVE — les joueurs éliminés (≥15 jetons) continuent de jouer : finishRound détecte l'élimination (l.315) mais runCpuTurns itère sur tous les players et startRound redonne toujours la main au joueur 0. Un joueur à 15+ jetons peut encore perdre des manches et accumuler des jetons ; à 3-4 joueurs la partie ne se termine que quand il ne reste qu'un survivant, avec des 'morts-vivants' qui roulent des dés.
- GRAVE — fuite de timers : cpuRef et le setTimeout de rollDiceForHuman ne sont jamais nettoyés au démontage (aucun useEffect de cleanup dans tout le composant). Si l'utilisateur tape 'retour' pendant un tour CPU, la chaîne de setTimeout continue → setState sur composant démonté et enchaînement de manches en fond.
- GRAVE — effets de bord dans un updater setState : setGameOver/setWinner sont appelés À L'INTÉRIEUR du callback setPlayers (l.309-328). L'updater doit être pur ; en React 18 StrictMode il est invoqué deux fois, et ce pattern peut déclencher des états incohérents.
- MOYEN — label faux pour 4-2-x : avec [4,3,2], c=2 (l.53) donc le label affiché est '4-2-2' alors que les dés sont 4-3-2 ; en plus 2-3-4 devrait être une suite (rang 200+) mais la branche 4-2-x l'intercepte avant.
- MOYEN — règles 421 incomplètes : les combinaisons 'deux as + x' (1-1-x), fortes au 421 réel (valent x jetons), sont traitées comme paires banales de rang 510+x, plus faibles qu'une paire de 6. Pas de gestion des égalités non plus (reduce prend le premier, l.300-306) alors que la règle impose de relancer.
- MINEUR — couleur du scoreboard actif calculée par comparaison de chaînes (l.429) : le 3e CPU (couleur #f59e0b) retombe sur le rgba vert du joueur 3 — surbrillance de la mauvaise couleur.
- MINEUR — roundResults n'est jamais alimenté pour les CPU pendant la manche (résultats passés en closure), donc la ligne 'lastResult.combo.label' du scoreboard (l.423) n'affiche que le résultat humain.
UX:
- Un seul affichage de dés partagé : pendant cpu_playing, les dés du joueur sont écrasés par ceux du CPU sans transition claire — à 3 CPU, on ne sait plus à qui appartient ce qu'on voit malgré la couleur.
- Le bouton retour (ChevronLeft, ~30px de zone) est sous 44px ; les dés à 60px sont bien, les boutons d'action à ~46px OK.
- Aucun retour haptique/sonore sur le lancer de dés — c'est LE moment de juice d'un jeu de dés (vibration + son de dés sont quasi gratuits à ajouter).
- L'instruction 'Cliquez sur un dé' en 10px : dit 'cliquez' au lieu de 'touchez', et taille illisible ; la mécanique garder/libérer n'a aucun onboarding visuel (première partie confuse).
- Impossible de passer/accélérer les tours CPU : à 3 CPU, ~3-5s par CPU × 3, le joueur attend passivement 10-15s par manche sans aucun contrôle.
- Le message de fin de manche (l.334) condense gagnant+perdant en une ligne 12px ; aucun récap visuel des 3 jets de la manche — le joueur ne comprend pas pourquoi il a pris des jetons.
- La logique inversée '15 jetons = éliminé' n'est expliquée nulle part à l'écran (la référence de score liste les combos mais pas la condition de victoire).
AMELIORATIONS:
- IMPACT MAX — réencoder les rangs par paliers non chevauchants : 421=7000, 1-1-1=6900, brelans=6000+v, 1-1-x=5000+x, 4-4-1... paires=3000+paire*10+kicker, suites=2000+haut, carte haute=somme (max 654 < 2000). Une table de constantes de 15 lignes règle le bug critique.
- IMPACT MAX — corriger tokensTaken = winnerResult.combo.tokens et retirer les joueurs à ≥15 jetons du tour (filtrer dans runCpuTurns et sauter le tour humain si éliminé, avec badge 'Éliminé' sur sa carte scoreboard).
- IMPACT ÉLEVÉ — ajouter useEffect(() => () => { clearTimeout(cpuRef.current) }, []) + un ref pour le timeout humain ; sortir setGameOver/setWinner de l'updater setPlayers (calculer next avant, appeler setPlayers(next) puis les setters).
- IMPACT ÉLEVÉ — juice du lancer : navigator.vibrate([20,30,20]) au roll, framer-motion spring sur les dés (rotation aléatoire par dé au lieu du keyframe CSS uniforme), animation des jetons qui volent vers le perdant en fin de manche.
- IMPACT MOYEN — écran récap de manche : les 3 mains côte à côte (mini-dés SVG réutilisant Die size=28) avec gagnant/perdant surlignés, avant le bouton 'Manche suivante' — remplace le message texte l.334.
- IMPACT MOYEN — bouton 'Passer' pendant cpu_playing qui résout instantanément les tours CPU restants (les jets sont déjà calculés en closure, il suffit de court-circuiter les setTimeout).
- IMPACT FAIBLE — corriger le label 4-2-x (utiliser le dé restant réel), tester la suite AVANT 4-2-x, remplacer la comparaison de couleurs l.429 par une fonction hexToRgba(p.color), et agrandir le bouton retour à 44px.

===== Snake (score 6.5, effort 2j) =====
BUGS:
- Reversal 180° possible par double input rapide : changeDir (l.437-441) valide contre dirRef.current (direction du DERNIER tick), pas contre nextDirRef. Séquence 'haut' puis 'bas' dans le même tick pendant qu'on va à droite → nextDir='down' accepté → demi-tour instantané → mort injuste. Il faut valider contre nextDirRef.current ou implémenter une file d'inputs (2 entrées).
- Pas de pause automatique quand l'onglet passe en arrière-plan : les setTimeout sont throttlés (~1s) mais continuent → le serpent avance et meurt pendant que le client répond à un message. Ajouter un handler visibilitychange qui appelle togglePause.
- triggerGameOver (l.380-384) crée un setInterval non stocké dans un ref et jamais nettoyé au unmount : si l'utilisateur quitte le jeu pendant les 1,9s de flash, l'interval continue de tourner (leak mineur mais réel, mutations sur flashCountRef après unmount).
- randPos (l.17-22) est une boucle do-while infinie si la grille est pleine (serpent de 432 segments) : pas de condition de victoire, freeze garanti du navigateur en fin de partie parfaite (24×18). Improbable mais crash potentiel.
- Le meilleur score (bestRef) n'est jamais persisté en localStorage contrairement à Game2048 : le 'BEST' repart à 0 à chaque remontage du composant — incohérence entre les deux jeux et perte de la récompense principale.
- maybeSpawnBonus (l.93-105) garantit une étoile TOUS les 5 fruits (if !hasStar, sans probabilité) alors que la légende la présente comme un bonus : le +5 devient mécanique, et le spawn mute foodsRef.current directement au lieu de retourner un nouveau tableau (viole le pattern immutable du reste du fichier).
- Redimensionnement fenêtre pendant une partie (l.476-492) : canvas.width/height réassignés → le canvas est effacé et les particules gardent leurs coordonnées pixel de l'ancienne taille (positions fausses un instant). Mineur mais visible en rotation portrait/paysage.
UX:
- Scroll parasite critique : aucun touchAction:'none' sur le canvas ni preventDefault dans handleTouchStart/End (l.459-473). Un swipe vertical sur le canvas fait défiler la page pendant la partie — rédhibitoire sur téléphone dans une webview POS.
- Boutons de difficulté et toggle Walls à minHeight 32px (l.560, 575) au lieu de 44px, et la top bar (retour + 4 difficultés + Walls) déborde horizontalement sur un écran 375px : il faut un wrap ou un select.
- Grille 24×24 colonnes avec cellule min 16px → canvas de 384px minimum de large, plus large que la zone utile d'un iPhone SE avec le padding : grille trop dense pour du tactile, 16-18 colonnes seraient plus lisibles.
- Aucun retour haptique (navigator.vibrate) ni sonore en mangeant/mourant — sur mobile c'est le feedback le moins cher à ajouter.
- changeDir démarre la partie sur n'importe quel input (l.440) : un swipe accidentel pendant que l'overlay Start est affiché lance le jeu sans que le joueur soit prêt.
- Le tap sur le canvas ne fait rien (seuil 10px l.470) : un tap pour mettre en pause serait naturel sur mobile ; la pause n'est accessible que par un petit bouton sous le D-pad.
AMELIORATIONS:
- IMPACT FORT — Corriger le reversal 180° : dans changeDir, valider d contre nextDirRef.current en plus de dirRef.current, ou mieux, buffer de 2 directions consommées par tick.
- IMPACT FORT — Ajouter style={{ touchAction: 'none' }} sur le <canvas> (l.603) + persister bestRef dans localStorage('snake_best') comme le fait Game2048 (l.215-234 de Game2048).
- IMPACT FORT — Auto-pause sur document.visibilitychange et window.blur : un jeu de restaurant est constamment interrompu.
- IMPACT MOYEN — Vibration : navigator.vibrate?.(15) dans le bloc de collision nourriture (l.326-336) et vibrate([50,50,50]) dans triggerGameOver ; sons via WebAudio (2 oscillateurs suffisent).
- IMPACT MOYEN — Rendre l'étoile probabiliste (ex. 40% tous les 5 fruits) et afficher un compte à rebours visuel (arc autour du bonus) au lieu du simple clignotement à 75% (l.194).
- IMPACT MOYEN — Score par difficulté : multiplier les points par un facteur (Easy ×1, Insane ×3) sinon Easy est la stratégie dominante pour le high-score — tue la rejouabilité compétitive.
- IMPACT FAIBLE — Stocker le flashInterval de triggerGameOver dans un ref et le clear dans le cleanup de l'effet RAF (l.498-501) ; garde-fou dans randPos (retourner null si occupied.length >= COLS*ROWS et déclencher un écran Victoire).
- IMPACT FAIBLE — Interpolation visuelle du mouvement : dessiner la tête entre deux cellules selon le temps écoulé depuis le dernier tick (le RAF existe déjà l.276) pour un rendu fluide au lieu du déplacement saccadé case par case.

===== 2048 (score 6, effort 2.5j) =====
BUGS:
- Updater setTiles impur (l.256-286) : Math.random via addRandomTile, setPrevState/setScore/setBest/setPopups/setWon/setOver/setAnimating et un setTimeout sont appelés DANS le updater. Sous React 18 StrictMode (dev) le updater s'exécute deux fois → score compté double (setScore(s => s+gained) appelé 2×), popups dupliqués, deux tuiles aléatoires générées dont une fantôme, tileIdCounter incrémenté 2×. Même hors StrictMode c'est une violation des règles React : sortir moveBoard du updater (calculer à partir de tiles capturé, ou utiliser un reducer avec effets à l'extérieur).
- tileIdCounter est une variable mutable au niveau module (l.36) : partagée entre toutes les instances et jamais réinitialisée — pas de collision réelle mais anti-pattern qui aggrave le point précédent (double incrément StrictMode).
- handleUndo (l.291-298) ne restaure ni won ni continueAfterWin : si on annule le coup qui a créé la tuile 2048, la bannière de victoire reste affichée (won=true) alors que la tuile n'existe plus. Ajouter la capture de won/continueAfterWin dans prevState.
- Le setTimeout de addPopup (l.247) et celui de setAnimating (l.283) ne sont pas nettoyés au unmount → setState après démontage (silencieux en React 18 mais états zombies si le composant est remonté vite).
- Undo restaure des tuiles dont les ids ont été supprimés du DOM : elles reviennent comme nouveaux nœuds React avec leur flag isNew/merged d'origine → les animations tileAppear/tileMerge rejouent de façon incohérente au undo. Nettoyer les flags à la restauration.
- Les tuiles absorbées lors d'un merge disparaissent instantanément : moveBoard ne conserve que la tuile survivante, donc pas d'animation de glissement de la tuile mangée — le merge semble téléporté, contrairement au 2048 original qui fait glisser les deux tuiles avant fusion.
UX:
- Plateau non responsive : CELL_SIZE fixe 68px (l.33). En 5×5, boardPx = 372px + 16px de padding = 388px → déborde/clippe sur iPhone SE et tout écran ≤380px. Calculer CELL_SIZE depuis la largeur du conteneur.
- Scroll parasite : le div plateau (l.480-485) capte onTouchStart/onTouchEnd sans touchAction:'none' ni preventDefault → un swipe vertical (coup 'bas') fait défiler la page. Critique en contexte téléphone.
- D-pad w-10 h-10 = 40px (l.574 etc.) sous le minimum tactile de 44px ; boutons Annuler/Nouveau/grille encore plus petits (py-1.5, text-xs). Le bouton retour (l.376) fait ~30px.
- Aucun feedback haptique/sonore sur merge — le popup '+N' est bien mais insuffisant seul sur mobile.
- Le listener clavier global reste actif même quand la partie est finie et bloque preventDefault sur les flèches de toute la page hôte (l.327-331) ; à désactiver quand over=true ou hors focus.
- Pas de confirmation sur 'Nouveau' ni sur le changement de taille de grille : un tap accidentel détruit une partie en cours sans possibilité d'annulation (canUndo est réinitialisé).
AMELIORATIONS:
- IMPACT FORT — Refactorer applyMove : calculer moveBoard/addRandomTile HORS du updater (les tiles courants sont déjà dans le state ; utiliser un useReducer ou capturer tiles dans la closure avec animating comme verrou), et déplacer tous les setX en dehors. Corrige StrictMode + conformité hooks d'un coup.
- IMPACT FORT — Responsive : const cell = Math.floor((Math.min(containerWidth, 400) - (gridSize-1)*GAP - 2*GAP) / gridSize) via un ResizeObserver ou useLayoutEffect, à la place de CELL_SIZE=68.
- IMPACT FORT — touchAction: 'none' sur le div plateau + agrandir le D-pad à 48px et les boutons de contrôle à min-height 44px.
- IMPACT MOYEN — Persister aussi gridSize et la partie en cours (tiles+score) en localStorage : un client interrompu par l'arrivée de son plat retrouve sa partie — crucial pour le contexte restaurant.
- IMPACT MOYEN — Corriger handleUndo pour restaurer won/continueAfterWin et nettoyer isNew/merged, et vibrer sur merge : navigator.vibrate?.(10) dans addPopup, vibrate(30) quand une tuile ≥128 est créée.
- IMPACT MOYEN — Juice sur les gros merges : réutiliser framer-motion (dispo dans le projet) pour un shake du plateau à 512+, et faire glisser la tuile absorbée (conserver les deux tuiles pendant les 120ms de transition puis retirer la seconde).
- IMPACT FAIBLE — Undo multi-niveaux (pile de 3-5 états) au lieu d'un seul, et compteur de coups affiché pour la rejouabilité (battre son score en moins de coups).
- IMPACT FAIBLE — Nettoyer les setTimeout dans un useEffect cleanup (stocker les ids dans un ref) et remplacer le module-level tileIdCounter par un useRef.

===== Pendu (Hangman) (score 5.5, effort 1.5j) =====
BUGS:
- CRITIQUE — Mots imprenables : la banque contient des lettres accentuées et des tirets ('PANTHÈRE', 'PÂTES', 'PÉLICAN', 'IMPERMÉABLE', 'NOUVELLE-ZELANDE', 'LAVE-VAISSELLE') alors que le clavier AZERTY (const AZERTY, l.152) n'a que A-Z. La condition de victoire `word.split('').every(l => guessed.has(l))` (l.267) ne peut JAMAIS être vraie pour ces mots : partie perdue d'avance sauf si l'unique indice révèle par chance la lettre accentuée. 'NOUVELLE-ZELANDE' contient un '-' littéralement inguessable.
- CRITIQUE — L'indice ajoute une lettre fausse aléatoire dans `guessed` (useHint, l.319-327) : une lettre que le joueur n'a jamais tapée apparaît en rouge sur le clavier, et si wrong === maxLives-1 l'indice tue instantanément la partie (lost devient true dans le même render).
- HIGH — Reset des stats fragile : `useEffect(() => { statsUpdated.current = false }, [word])` (l.305). Si pickWord retire deux fois le même mot d'affilée (probable avec ~24 mots en pool 'easy'), `word` ne change pas, l'effet ne se relance pas et la partie suivante n'est pas comptée dans les stats.
- MEDIUM — Contenu erroné : 'SUBMARINE' (Transports) et 'METABOLISM' (Sciences) sont des mots anglais ; 'FOIEGRAS', 'COQAUVIN', 'BOEUFBOURGUIGNON' sont des concaténations sans espaces impossibles à deviner naturellement.
- MEDIUM — L'animation `drawPath` (keyframes l.402-405) part toujours de stroke-dashoffset:65 alors que le corps a strokeDasharray:30 et les membres 25 : les segments apparaissent déjà à moitié dessinés ou avec un saut visuel.
- LOW — Sur tactile, `onMouseEnter` (scale 1.1, l.510) reste collé après un tap (pas de onTouchEnd/onMouseLeave déclenché), laissant une touche zoomée en permanence.
UX:
- Touches du clavier 30×30px (l.497) — bien en dessous du minimum 44×44px Apple/Android ; sur un téléphone au restaurant, taux d'erreur de tap élevé.
- Aucun retour haptique (`navigator.vibrate`) ni sonore sur bonne/mauvaise lettre — le seul feedback erreur est le dessin du pendu, peu visible pendant qu'on regarde le clavier.
- La rangée de cœurs `'❤️'.repeat(maxLives - wrong)` (l.426) avec 8 vies en Facile déborde du header sur écrans 320-360px (8 emojis ≈ 130px + titre + badge catégorie).
- Feedback hover uniquement souris (`onMouseEnter` translateX sur les boutons de difficulté l.373) — invisible sur tactile, aucun état :active.
- Pas de bouton 'Nouveau mot' en cours de partie : si le joueur est bloqué, il doit perdre ou revenir au menu (le retour menu ne compte pas la partie — exploit anti-défaite pour la série).
AMELIORATIONS:
- IMPACT MAX — Normaliser la banque : `word.normalize('NFD').replace(/[̀-ͯ]/g,'')` au chargement pour supprimer les accents, et retirer/renommer les mots à tiret et les mots anglais. Corrige d'un coup tous les mots imprenables.
- IMPACT MAX — Remplacer le mécanisme d'indice : au lieu du dummy letter (l.319-321), stocker un `hintPenalty` séparé et calculer `wrong = wrongLetters.length + (hintUsed ? 1 : 0)` ; bloquer l'indice si wrong === maxLives-1 (`disabled={hintUsed || wrong >= maxLives - 1}`).
- IMPACT ÉLEVÉ — Passer les touches à 44px min : `width: 34, height: 46` tient encore en 375px (10×34 + 9×4 = 376... utiliser flex: 1 avec maxWidth), et ajouter `navigator.vibrate?.(correct ? 10 : [30,30,30])` dans guess().
- IMPACT ÉLEVÉ — Fixer le reset stats : remplacer le useEffect [word] par un reset direct `statsUpdated.current = false` dans startGame() (l.249) — plus simple et sans dépendance à l'identité du mot.
- IMPACT MOYEN — Juice de fin de partie : confetti CSS simple à la victoire (le state `celebrating` existe déjà l.238 mais ne déclenche que le bounce des lettres), secousse du gallows à la défaite, son court via WebAudio.
- IMPACT MOYEN — Éviter la répétition du même mot dans une session : garder un `usedWords` Set en ref et filtrer le pool dans pickWord (l.240-247).
- IMPACT FAIBLE — Corriger les dasharray des keyframes : paramétrer l'animation par segment (variable CSS --len) au lieu du 65 codé en dur.

===== Motus (Wordle FR) (score 4.5, effort 2.5j) =====
BUGS:
- CRITIQUE — Liste de mots corrompue : à partir de la ligne 44 (~250 entrées sur ~600), la liste contient des non-mots ('ABCDE', 'CENDR', 'ALCOO', 'BANQU', 'BEAUT', 'COMPT', 'LYRIQ', 'AMPUT', 'ACOOL'...), des mots anglais ('ALLOW', 'GRANT', 'SHAME', 'YOKEL', 'VIVID', 'DANCE') et des troncatures. Ces entrées servent AUSSI de mot cible via getDailyWord/getRandomWord (l.109-119) : un client peut recevoir 'ABCDE' ou 'CENDR' comme solution du jour. Injouable en l'état commercial.
- CRITIQUE — 'BOTTÉ' (l.74) contient un É : le handler clavier filtre `/^[A-Z]$/` (l.244) et le clavier virtuel n'a que A-Z, donc si BOTTÉ est tiré comme cible, la partie est imprenable.
- HIGH — Race condition sur reset : les deux setTimeout de handleSubmit (l.277-282 fin de flip, l.306-309 setGameOver) ne sont jamais annulés par resetGame (l.313-323). Séquence : soumettre la ligne gagnante puis cliquer '🎲 Aléatoire' pendant l'animation → 1,1 s plus tard `setGameOver('won')` s'applique à la NOUVELLE partie vierge (bannière 'Bravo' + stats panel sur grille vide).
- HIGH — Le mode quotidien est rejouable à l'infini : aucun état persisté (pas de clé localStorage 'motus_daily_2026-07-10'). Recliquer '📅 Quotidien' (resetGame l.417) redonne le même mot déjà connu → victoire garantie en 1 essai, stats et streak gonflables sans limite.
- MEDIUM — La même liste sert de dictionnaire de validation (`WORD_LIST.includes(current)`, l.256) : des mots français courants ('POINT', 'SALON', 'MAINS'...) sont rejetés 'Mot inconnu' alors que 'ABCDE' est accepté. Le dictionnaire de guesses doit être bien plus large que la liste de solutions.
- MEDIUM — Le useEffect clavier sans deps (l.237-248) capte les frappes globales sans vérifier `e.target` : si un input/champ existe ailleurs sur la page hôte (app POS), taper dedans remplit aussi la grille. Ajouter un guard `if (e.target instanceof HTMLInputElement) return` et `e.preventDefault()` sur Backspace (navigation arrière possible).
- LOW — setTimeout de handleShare (l.361) et les timers de handleSubmit peuvent déclencher setState après démontage du composant (retour via onBack pendant l'animation) — fuite bénigne mais réelle.
- LOW — buildShareText (l.147-153) affiche la date même en mode aléatoire, et 'empty'/'input' mappés sur ⬛ ne devraient jamais apparaître (rows = committed uniquement, ok, mais le mapping masque un bug futur).
UX:
- Touches lettres minWidth 32px (l.209) : sous les 44px recommandés en largeur ; acceptable pour un clavier Wordle mais serré à une main, et aucun feedback :active ni vibration au tap.
- Aucun retour haptique/sonore sur soumission (flip = bien, mais `navigator.vibrate` sur 'Mot inconnu' et sur victoire manque).
- Le message 'Mot inconnu' (l.475-481) apparaît AU-DESSUS de la grille et la décale verticalement de ~40px pendant 600ms : layout shift désagréable, le pouce rate la touche suivante. Le rendre en position absolute/overlay.
- Tuiles 52px fixes (l.179) : 5×52 + 4×6 = 284px, ok en 375px, mais avec le panel Stats ouvert + grille + clavier, la hauteur totale dépasse ~700px → le clavier passe sous le fold sur iPhone SE ; prévoir un layout 100dvh avec grille flexible.
- Contraste rouge correct/jaune present : conforme au Motus TV mais aucun mode daltonien (rouge/vert absent ici, mais rouge #dc2626 vs jaune #ca8a04 reste difficile pour certains) — ajouter un symbole dans la tuile en option.
- Pas d'indication des règles pour un client qui découvre : aucun onboarding/tooltip première partie.
AMELIORATIONS:
- IMPACT MAX — Purger la liste : supprimer les lignes 44-81 (tout le bloc corrompu) et remplacer par un vrai lexique FR 5 lettres (ex. liste ODS/Lexique.org filtrée, importée en JSON). Séparer SOLUTIONS (mots courants ~800) et DICTIONARY (validation ~7000).
- IMPACT MAX — Verrouiller le quotidien : persister `localStorage.setItem('motus_daily_' + dateKey, JSON.stringify({committed, gameOver}))`, restaurer au mount, et afficher un compte à rebours jusqu'au mot suivant au lieu de laisser rejouer.
- IMPACT ÉLEVÉ — Annuler les timers : stocker les IDs des setTimeout de handleSubmit dans des refs et les clearTimeout dans resetGame + dans un useEffect de cleanup au démontage. Corrige la race 'Bravo sur grille vide'.
- IMPACT ÉLEVÉ — Respecter la règle Motus : révéler la première lettre du mot dès le départ (le vrai Motus le fait toujours) — pré-remplir `current` avec word[0] ou afficher la 1re tuile en 'correct' sur la ligne d'input ; différencie du Wordle générique et aide les clients occasionnels.
- IMPACT MOYEN — Juice victoire : animation bounce séquentielle des tuiles gagnantes (le flip existe, mais rien ne distingue la ligne gagnante) + `navigator.vibrate([50,50,100])` + jingle court.
- IMPACT MOYEN — Utiliser `navigator.share` si dispo avant le fallback clipboard dans handleShare (l.357-363) — sur mobile c'est le geste attendu.
- IMPACT FAIBLE — Séparer les stats daily/random (actuellement le mode aléatoire gonfle la série du quotidien, l.288-304).

===== Memory (paires d'emojis) (score 6.5, effort 1.5j) =====
BUGS:
- Timeouts orphelins au restart : les setTimeout de 400ms (match) et 800ms (mismatch) dans flip() ne sont jamais annulés par startGame(). Si le joueur clique 'Nouvelle partie' (ou change de difficulté/thème) pendant la fenêtre de 400ms après un match, le callback s'exécute sur le NOUVEAU deck : `setCards(cs => cs.map(c => newFlipped.includes(c.id) ? {...c, matched: true}...))` marque 2 cartes du nouveau deck comme matchées d'office (les ids 0..N sont réutilisés). Idem pour le mismatch qui peut débloquer/reflipper des cartes du nouveau deck.
- Effets de bord dans un updater d'état (ligne 461-479) : setWon, setRunning, getBest/saveBest et setIsRecord sont appelés À L'INTÉRIEUR du callback de setCards. En StrictMode dev l'updater tourne deux fois → double écriture localStorage ; c'est un anti-pattern React qui casse avec le rendu concurrent.
- Temps enregistré potentiellement faux : `elapsed` est capturé dans la closure de flip() au moment du clic ; le record est sauvé 400ms plus tard avec cette valeur figée — le temps sauvegardé peut être inférieur d'1s au temps réellement affiché à l'écran de victoire.
- injectCSS('mem-styles', CSS) appelé dans le corps du render (ligne 372) : effet de bord pendant le rendu, devrait être dans un useEffect ou au niveau module.
- getBest(diffId, themeId) est appelé à chaque render (ligne 507) : lecture localStorage + JSON.parse à chaque tick du timer (1x/s pendant la partie).
UX:
- Plateau codé en dur à containerWidth=340 (ligne 510) : sur un iPhone SE / petits Android (320-360px de large), avec le padding 32px le grid déborde et est coupé par overflow:hidden — cartes de droite partiellement invisibles en mode Difficile (5 colonnes).
- Cartes en mode Difficile : (340-20)/5 = 64px, OK ; mais le gap de 5px rend les mis-taps fréquents sur petit écran — pas de marge d'erreur tactile.
- Aucun retour haptique (navigator.vibrate) ni sonore sur match/mismatch — sur un téléphone au restaurant, c'est le feedback le moins cher à ajouter.
- Pas de touch-action: manipulation ni de -webkit-tap-highlight-color sur les cartes : double-tap rapide (fréquent au Memory) peut déclencher le zoom double-tap sur iOS.
- Changer difficulté/thème en pleine partie reset instantanément sans confirmation : un mis-tap sur la rangée de boutons (juste au-dessus du plateau) détruit la partie en cours.
- Pas de bouton pause ; le timer continue si l'utilisateur passe l'app en arrière-plan (setInterval throttlé mais elapsed continue de compter au retour, incohérent).
AMELIORATIONS:
- IMPACT FORT — Corriger le restart : stocker les ids de timeout dans un ref (timeoutsRef: number[]) et les clearTimeout tous dans startGame(), ou incrémenter un gameIdRef vérifié dans chaque callback avant de toucher l'état.
- IMPACT FORT — Sortir la détection de victoire de l'updater : calculer `willAllMatch` avant setCards (on connaît déjà cards + newFlipped), puis appeler setWon/saveBest en dehors, avec le vrai elapsed lu depuis un ref (elapsedRef) au lieu de la closure.
- IMPACT FORT — Rendre le plateau responsive : `const containerWidth = Math.min(340, window.innerWidth - 32)` mesuré via un ref/ResizeObserver au lieu du 340 fixe.
- IMPACT MOYEN — Ajouter navigator.vibrate?.(30) sur match, vibrate([20,40,20]) sur mismatch, et un petit playTone (le module existe déjà dans SimonGame — l'extraire dans games/audio.ts partagé).
- IMPACT MOYEN — touch-action: 'manipulation' et WebkitTapHighlightColor: 'transparent' sur le <button> Card, plus un transform: scale(0.95) en :active pour le feedback de pression.
- IMPACT MOYEN — Confirmation (ou désactivation) du changement de difficulté/thème quand moves > 0 && !won.
- IMPACT FAIBLE — Mémoïser getBest avec useMemo([diffId, themeId, won]) ; afficher un aperçu de 2s des cartes au début (pédagogie) ; ajouter un mode 'contre-la-montre' pour la rejouabilité.

===== Mémoire des Chiffres (number memory) (score 6, effort 1j) =====
BUGS:
- Fausse bannière 'Nouveau record' (ligne 485) : la condition `stats.bestByDifficulty[difficulty] === level` est vraie aussi quand on ÉGALE un record existant. Ex : record=5, on réussit à nouveau le niveau 5 → le best n'est pas mis à jour (condition `level > newBest` fausse) mais la bannière '🏆 Nouveau record' s'affiche quand même. Il faut un flag isNewRecord calculé dans handleSubmit.
- Affichage des vies incohérent : en phase 'result' après un échec, la carte stats du header (ligne 293) affiche `'❤️'.repeat(lives)` (non décrémenté, ex. 3 cœurs) alors que le panneau de résultat (ligne 480) affiche lives-1 (2 cœurs). La vie n'est décrémentée que dans handleNext — deux vérités simultanées à l'écran.
- Logique de disabled du NumberPad morte/confuse (ligne 77) : `disabled={disabled && !isOk || isDisabledOk}` — disabled est toujours passé à false (ligne 437), donc seule la branche isDisabledOk sert ; la précédence && avant || rend l'intention illisible.
- useEffect clavier sans tableau de dépendances (ligne 166-176) : re-souscription window.addEventListener à CHAQUE render (y compris chaque frappe). Pas de fuite (cleanup ok) mais churn inutile ; un tableau [phase, input, target, level, ...] ou des handlers en ref serait correct.
- handlePress limite input à 25 chiffres (ligne 213) : au-delà du niveau 25 il devient impossible de saisir la réponse complète. Improbable mais c'est un mur silencieux.
- Branche morte dans handleNext (ligne 241) : le cas newLives <= 0 est inatteignable car le bouton 'Réessayer' n'est rendu que si lives > 1 — code trompeur à nettoyer.
UX:
- Temps d'affichage linéaire msPerDigit × level : en Facile (4s/chiffre), niveau 12 = 48s d'attente passive à fixer un nombre — injouable ; aucun bouton 'J'ai mémorisé' pour passer en saisie plus tôt.
- Pendant la phase 'show', aucun moyen d'abandonner le round autrement que le petit bouton reset 26px du header (< 44px de zone tactile, ligne 282).
- Le pavé numérique est bien (>44px), mais aucun feedback de pression (pas de :active/scale), aucun son ni vibration à la frappe — sensation 'morte' au toucher.
- Aucune comparaison chiffre-par-chiffre en cas d'échec : le joueur voit deux nombres de 10+ chiffres en rouge/vert et doit trouver lui-même où il s'est trompé.
- Pas de auto-submit quand input.length === level : le joueur doit taper OK alors que la longueur attendue est connue — friction inutile (à proposer en option).
- userSelect: none global bien, mais pas de touch-action: manipulation sur le pad → risque de double-tap zoom en tapant vite deux fois le même chiffre.
AMELIORATIONS:
- IMPACT FORT — Ajouter un bouton 'J'ai mémorisé →' pendant la phase 'show' qui clear les timers et passe en 'input' immédiatement ; c'est LE fix de gameplay (récompense la mémorisation rapide, supprime l'attente de 48s).
- IMPACT FORT — Corriger le record : dans handleSubmit, calculer `const isNewRecord = ok && level > prev.bestByDifficulty[difficulty]` dans un state, et l'utiliser à la place du `=== level` ligne 485.
- IMPACT FORT — Décrémenter lives dans handleSubmit (au moment de l'échec) et non dans handleNext, pour unifier l'affichage header/résultat.
- IMPACT MOYEN — Diff visuel de l'erreur : rendre target et input caractère par caractère avec les positions divergentes surlignées en rouge (map sur les chars, color conditionnelle) — transforme la frustration en apprentissage.
- IMPACT MOYEN — Feedback tactile : navigator.vibrate?.(10) par touche, vibrate(60) sur erreur, plus transform scale(0.93) en active sur les touches du pad.
- IMPACT MOYEN — Plafonner le temps d'affichage total (ex. min(msPerDigit*level, 15000)) même si on garde le bouton skip, pour préserver la pression du chrono.
- IMPACT FAIBLE — Nettoyer la prop disabled du NumberPad (dead code), corriger la limite des 25 chiffres (utiliser level), auto-submit optionnel à input.length === level.

===== Simon (séquences lumineuses) (score 5.5, effort 1.5j) =====
BUGS:
- Audio cassé sur iOS Safari : playTone() crée un NOUVEAU AudioContext à chaque note (ligne 8). Les notes de la séquence sont jouées depuis des setTimeout/await (hors geste utilisateur) → sur iOS le contexte naît 'suspended' et la séquence est MUETTE, alors que les taps du joueur (dans un geste) sonnent. Le cœur du jeu (association son/couleur) est perdu sur iPhone — précisément le device cible du restaurant. Il faut UN AudioContext partagé, créé/resumé au clic 'Démarrer'.
- Aucun cleanup à l'unmount : les setTimeout de flashButton/playSequence et les promesses en cours continuent après démontage (retour au menu pendant la séquence) → setState sur composant démonté et sons qui continuent de jouer. Aucun useEffect de cleanup, aucun flag cancelled.
- parseInt(stored, 10) sans garde NaN (ligne 82) : une valeur corrompue en localStorage affiche 'Record NaN' de façon permanente et Math.max(NaN, s) = NaN → le record ne se sauvegarde plus jamais.
- Créer + fermer un AudioContext par note est aussi une pression ressource : sur une longue séquence rapide (mode Speed), on ouvre ~20 contextes en quelques secondes ; certains navigateurs plafonnent le nombre de contextes simultanés et jettent.
- Indicateur incohérent après une séquence réussie : setSeq(next) + setInputIdx(0) sont appliqués immédiatement (lignes 153-155) mais phase reste 'input' pendant les 600ms d'attente → le centre affiche '0/9' (la NOUVELLE longueur) et le libellé '● TOI' alors que le joueur ne doit PAS jouer — invite au tap fantôme (bloqué par busy, mais visuellement faux).
UX:
- Pas de touch-action: manipulation sur les 4 arcs : Simon = taps rapides répétés, le double-tap zoom iOS peut se déclencher en plein rythme et casser la partie.
- Aucune vibration (navigator.vibrate) sur les flashs ni sur l'erreur — sur un jeu audio-dépendant dont l'audio est cassé sur iOS et souvent coupé au restaurant (téléphone en silencieux !), le retour haptique est indispensable.
- Pression joueur : flash de 250ms fixe même en mode Speed — OK, mais le feedback est uniquement setLit ; pas de scale/pressed state distinct entre 'flash Simon' et 'mon tap', le joueur ne distingue pas toujours si son tap a été pris.
- Zones de tap correctes (quadrants ~126×126px) mais le gap central en croix (8px) + bouton central 56px z-30 volent des taps près du centre sans feedback d'échec — le tap tombe dans le vide silencieusement.
- Après un ÉCHEC, la séquence correcte n'est pas rejouée : le joueur ne sait pas quel bouton était attendu — frustrant et non pédagogique.
- Fichier mélange classes Tailwind (space-y-4, flex...) et styles inline alors que les deux autres jeux sont 100% inline — incohérence de codebase.
AMELIORATIONS:
- IMPACT FORT — Refactor audio : module partagé avec un singleton `let ctx: AudioContext|null`, initialisé + resume() dans startGame (geste utilisateur), et playTone/playError qui réutilisent ce contexte avec un oscillateur par note. Corrige iOS ET la pression ressource. À extraire dans games/audio.ts et réutiliser dans Memory/NumberMemory.
- IMPACT FORT — Cleanup : gameIdRef incrémenté à chaque startGame/unmount, vérifié après chaque await dans playSequence ; useEffect(() => () => { gameIdRef.current++ }, []) pour stopper les séquences fantômes.
- IMPACT FORT — navigator.vibrate?.(40) sur chaque flash de séquence, vibrate?.(20) sur tap joueur, vibrate?.([80,50,80]) sur erreur : rend le jeu jouable téléphone en silencieux (cas majoritaire au restaurant).
- IMPACT MOYEN — Après un échec, rejouer la séquence complète en surlignant le bouton attendu (réutiliser playSequence avec le bon bouton en évidence), puis afficher 'Rejouer'.
- IMPACT MOYEN — Pendant les 600ms inter-séquences, passer phase à 'showing' (ou un état 'wait') immédiatement pour corriger l'indicateur '0/N — TOI' mensonger.
- IMPACT MOYEN — touch-action: 'manipulation' + WebkitTapHighlightColor: 'transparent' sur les arcs ; garde NaN : `const n = parseInt(stored,10); if (Number.isFinite(n)) setBestScore(n)`.
- IMPACT FAIBLE — Uniformiser le style (tout inline comme les autres jeux) ; célébration à chaque palier de 5 (confetti déjà écrit dans MemoryGame, à extraire) ; option 'daltonien' avec symboles sur les arcs (les labels G/R/Y/B existent dans BUTTONS mais ne sont jamais rendus).

===== Puissance 4 (ConnectFourGame) (score 6.5, effort 2.5j) =====
BUGS:
- Effets de bord dans un updater setState (l.351-364) : setLast, setDropAnims, setWinner, setScoreCpu et checkWin sont appelés À L'INTÉRIEUR de setGrid(prev => ...). En React 18 StrictMode (dev) les updaters sont invoqués deux fois → double incrément de score CPU possible et états incohérents. Il faut calculer le coup hors de l'updater puis faire des setState séparés.
- Freeze UI en mode Expert : aiMove lance minimax(depth 5) synchrone sur le main thread, et isTerminal() rescanne les 42 cases avec checkWin à CHAQUE nœud (~100k+ nœuds) → jank de plusieurs centaines de ms sur un téléphone milieu de gamme. isTerminal est en plus appelé deux fois au cas terminal (l.171-172). À déplacer dans un Web Worker ou mémoïser le dernier coup joué.
- Débordement horizontal sur petits écrans : boardW = 7 × 44 = 308px + padding 8 + padding conteneur 32 = 348px fixes. Sur iPhone SE / écrans 320px, overflow:hidden (l.417) COUPE les colonnes de droite → jeu injouable. cellPx devrait être calculé depuis la largeur du conteneur.
- Le disque gagnant posé en dernier ne pulse jamais : dans Disc (l.296-300) le ternaire teste dropFromRow > 0 AVANT isWin, or dropAnims n'est jamais nettoyé — le disque final de la ligne gagnante garde son animation c4-drop et n'a jamais c4-win-pulse.
- injectCSS appelé dans le corps du render (l.321) : effet de bord pendant le rendu (violation des règles React, même si idempotent). À mettre dans un useEffect ou au niveau module.
- hoverCol reste bloqué après un tap tactile : mobile émule mouseenter au tap, le ghost disc rouge reste affiché en permanence sur la dernière colonne touchée (aucun mouseleave sur touch).
- L'animation c4-score-pop du score (l.471) ne se rejoue jamais : sans key changeante sur le span, l'animation CSS ne s'exécute qu'au premier montage — le 'pop' promis à chaque victoire est mort.
UX:
- Boutons de colonne dédiés au tactile de seulement 28px de haut (l.591) — sous le minimum 44px Apple/Android ; heureusement les cellules 44px sont aussi cliquables, mais la rangée numérotée est quasi intapable.
- Aucun touchAction: 'manipulation' ni userSelect: 'none' ni WebkitTapHighlightColor : des taps rapides successifs déclenchent le double-tap-zoom et la sélection de texte sur les chiffres de colonnes.
- Le ghost disc de prévisualisation (l.497-522) repose sur le hover souris — inutile sur mobile où il n'apparaît qu'après un tap (donc après le coup, trop tard).
- Layout non responsive : plateau 308px fixe, minuscule sur tablette (beaucoup d'espace perdu), coupé sur petit téléphone.
- Aucun retour haptique (navigator.vibrate) ni sonore lors de la pose d'un pion, d'une victoire ou d'une défaite.
- Pas de confirmation sur 'Tout reset' : un tap accidentel efface les scores de la table sans undo.
AMELIORATIONS:
- IMPACT FORT — Rendre le plateau responsive : const cellPx = Math.min(48, Math.floor((containerWidth - 40) / 7)) via un ref + ResizeObserver, au lieu du cellPx = 44 en dur (l.404). Corrige le clipping iPhone SE et exploite les tablettes.
- IMPACT FORT — Sortir la logique CPU de l'updater : dans le setTimeout (l.350), lire grid via un ref ou capturer la valeur, calculer col/win, puis appeler setGrid/setWinner/setScoreCpu séparément. Élimine le double-score StrictMode.
- IMPACT FORT — Web Worker ou requestIdleCallback pour minimax expert + mémoïsation d'isTerminal (passer le dernier coup joué à checkWin au lieu de scanner 42 cases). Sinon réduire depth à 4 ce qui reste très fort avec le win/block immédiat déjà en place (l.220-231).
- IMPACT MOYEN — Corriger la priorité d'animation dans Disc : `animation: isWin ? win-pulse : dropFromRow > 0 ? c4-drop : undefined`, et purger dropAnims via onAnimationEnd pour que la ligne gagnante pulse entièrement.
- IMPACT MOYEN — Juice : navigator.vibrate(10) à la pose, vibrate([30,50,30]) à la victoire, confetti CSS sur 'Vous gagnez', son de jeton qui tombe (WebAudio, un simple oscillateur suffit). Actuellement zéro feedback sensoriel.
- IMPACT MOYEN — key={`${s.label}-${s.score}`} sur le span de score pour re-déclencher c4-score-pop à chaque changement.
- IMPACT FAIBLE — Alterner qui commence à chaque manche (le joueur commence toujours, gros avantage au Puissance 4 — le CPU ne joue jamais en premier, ce qui plafonne la difficulté réelle de l'Expert).
- IMPACT FAIBLE — touchAction:'manipulation' + userSelect:'none' sur le conteneur du plateau ; supprimer le ghost hover sur pointeurs coarse via matchMedia('(pointer: coarse)').

===== Morpion (TicTacToeGame) (score 6, effort 2j) =====
BUGS:
- Propriété CSS invalide `key: s.score` dans l'objet style (l.376-377) : l'auteur voulait re-déclencher ttt-score-pop en changeant la key React, mais l'a mise DANS le style (masquée par le cast `as React.CSSProperties`). Résultat : warning React en dev + l'animation de score ne se rejoue jamais. Il faut key={`${s.label}-${s.score}`} sur l'élément.
- Effets de bord dans l'updater setBoard (l.277-288) : setLast et setScoreCpu appelés à l'intérieur de setBoard(prev => ...) → en StrictMode l'updater tourne deux fois, risque de double incrément du score CPU.
- injectCSS appelé dans le corps du render (l.250) : effet de bord pendant le rendu, à déplacer hors composant ou dans useEffect.
- strokeDasharray fixe à 40 dans XMark (l.173) alors que la longueur réelle du trait dépend de size (≈34px à CELL*0.55) : fonctionne par chance aujourd'hui, casse silencieusement l'animation de tracé si la taille du plateau change (le trait apparaîtra partiellement pré-tracé).
- Condition redondante `!gameOver && playerTurn` (l.404-407) : playerTurn contient déjà !gameOver — sans conséquence mais signe de logique d'état dupliquée.
UX:
- Plateau 234px fixe (l.327) : cellules de ~70px (bon pour le tactile) mais plateau minuscule sur tablette — sur iPad le jeu flotte dans un océan de vide, alors que flex:1 est disponible.
- Aucun touchAction:'manipulation' / userSelect:'none' / WebkitTapHighlightColor sur les cellules : double-tap-zoom possible en enchaînant les coups, flash gris de tap highlight sur Android.
- Zéro feedback haptique ou sonore au placement, à la victoire, à la défaite.
- Le statut passe à chaîne vide pendant cpuThinking côté texte (l.323) — seuls les points animés dans le header l'indiquent, discret ; l'indicateur de tour en bas ne pulse pour le CPU que pendant les ~600ms du timer.
- Boutons de cellules sans aria-label (accessibilité nulle : un lecteur d'écran annonce des boutons vides).
AMELIORATIONS:
- IMPACT FORT — Alterner le premier joueur à chaque manche : le joueur commence TOUJOURS en X (l.269-273, détection xCount > oCount). Contre le minimax imbattable en 'Difficile', jouer toujours premier rend le jeu monotone ; alterner (et laisser le CPU ouvrir) change complètement la rejouabilité. Nécessite un state `starter` et adapter la détection de tour.
- IMPACT FORT — Rejouabilité : le morpion 3x3 est résolu — un adulte fait nul à l'infini en 'Difficile'. Ajouter un mode 'Best of 5' avec écran de victoire de série, ou une variante (morpion 3-pions glissants, plateau 4x4) pour donner une raison de rester. C'est LE plafond de qualité commerciale de ce jeu.
- IMPACT MOYEN — Corriger le re-trigger du score-pop : déplacer `key` hors du style vers key={`${s.label}-${s.score}`} sur le span (l.373).
- IMPACT MOYEN — Sortir bestMove/setScoreCpu de l'updater setBoard (l.277) : calculer le coup à partir d'une capture du board, puis setState séparés — supprime le risque StrictMode.
- IMPACT MOYEN — Juice victoire : les animations de tracé X/O et la win-line sont bien faites, mais aucune célébration — ajouter vibrate([30,50,30]), mini-confetti et un son court à la victoire ; shake léger du plateau à la défaite.
- IMPACT FAIBLE — BOARD_SIZE responsive : Math.min(320, containerWidth - 48) via ref, et calculer strokeDasharray de XMark à partir de la longueur réelle (Math.hypot).
- IMPACT FAIBLE — aria-label={`Case ${i+1}, ${v ?? 'vide'}`} sur chaque cellule + touchAction:'manipulation'.

===== Pig Dice (score 6, effort 1.5j) =====
BUGS:
- Bannière de victoire affiche un score faux : ligne 265 `setWinner(cpu)` et ligne 342 `setWinner(currentPlayer)` capturent l'objet joueur AVANT `setPlayers` — la bannière `{winner.total} points` (ligne 470) affiche le total SANS les points du tour gagnant (ex : gagne avec 105, affiche 87).
- Fuite de timers côté humain : les `setTimeout` de `humanRoll` (lignes 319, 329) et de `triggerFlash` (ligne 213) ne sont jamais stockés dans `cpuRef` ni nettoyés. Si l'utilisateur clique 'Paramètres'/reset ou démonte le composant pendant les 450ms/1400ms d'animation, `advanceTurn(players, currentIdx)` se déclenche sur une partie réinitialisée et peut lancer un tour CPU fantôme en phase 'setup'.
- `startCpuTurn` est appelé dans `advanceTurn` (ligne 229) avant sa déclaration hoistée via const — fonctionne uniquement car appelé de façon différée, mais le eslint-disable exhaustive-deps (ligne 233) masque des dépendances closure réelles : après un pig humain, `advanceTurn(players, ...)` ligne 332 utilise le `players` capturé au moment du clic, pas l'état courant.
- L'historique associe les lignes par `players.find(p => p.name === h.player)` (ligne 590) — matching par string fragile ; après 'Rejouer' l'historique est vidé mais un match par id serait plus sûr.
UX:
- Bouton retour ChevronLeft : padding 6 + icône 18 = ~30px de zone tactile, sous le minimum 44px (ligne 394).
- Les boutons Lancer/Banquer disparaissent complètement pendant `rolling` (condition `isHumanTurn && !rolling` ligne 513) → le layout saute et un double-tap rapide peut toucher l'élément qui remonte (historique). Mieux : les garder visibles mais disabled.
- Aucune vibration (`navigator.vibrate`) ni son au moment du Cochon — moment émotionnel clé du jeu non exploité sur mobile.
- Le joueur ne voit pas les dés du CPU rouler individuellement : un seul dé partagé, on peut rater qui a tiré quoi si on quitte l'écran des yeux ; le message texte 12px est la seule source d'info.
- Pas de confirmation ni undo : rien de bloquant ici, mais banquer 1 point est possible par mis-tap juste après un lancer.
AMELIORATIONS:
- IMPACT FORT — Corriger la bannière de victoire : calculer `const finalTotal = cpu.total + newAcc` et `setWinner({ ...cpu, total: finalTotal })` (idem côté humain ligne 342 avec `{ ...currentPlayer, total: currentPlayer.total + ns }`).
- IMPACT FORT — Centraliser tous les timers dans un tableau de refs et les clear dans `resetGame`/`startGame`/cleanup unmount ; ajouter un guard `phaseRef.current === 'playing'` dans les callbacks différés de `humanRoll`.
- IMPACT FORT — Ajouter `navigator.vibrate?.(roll === 1 ? [80,40,80] : 15)` sur chaque lancer + un son court (WebAudio oscillator, pas de fichier) : c'est le 'juice' le moins cher et le plus rentable pour un jeu de restaurant.
- IMPACT MOYEN — Garder les boutons Lancer/Banquer montés en permanence avec `disabled={rolling}` pour éliminer le layout shift.
- IMPACT MOYEN — Profondeur : ajouter une variante 'Two Dice Pig' ou un objectif configurable (50/100) sur l'écran setup — le jeu se termine vite et la rejouabilité est faible.
- IMPACT MOYEN — Difficulté progressive du CPU : `CPU_THRESHOLDS` fixes (ligne 174) ne s'adaptent pas ; un CPU intelligent banquerait selon l'écart au leader (ex : threshold = 21 + (leaderScore - cpu.total)/8).
- IMPACT FAIBLE — Utiliser framer-motion (dispo) pour l'apparition du dé et le compteur '+N ce tour' au lieu des keyframes inline dupliqués dans chaque render de Die (le <style> ligne 78 est re-monté à chaque render du dé).

===== Farkle (score 3.5, effort 3j) =====
BUGS:
- CRITIQUE — 'Hot Dice' est cassé : quand tous les dés sont gardés, le bouton affiche 'Hot Dice !' (ligne 518) mais `rollDice` calcule `numToRoll = dice.length - numKept = 0` et fait `return` (ligne 194). Le joueur ne peut JAMAIS relancer les 6 dés après avoir tout scoré — règle centrale du Farkle absente, alors que le CPU en bénéficie (ligne 314-316).
- CRITIQUE — Le CPU triche : dans `cpuRoll`, `cpuKept = cpuDecideKeep(cpuDice)` est recalculé sur TOUS les dés (y compris ceux gardés aux lancers précédents) et `cpuTurnScore += scoreDice(keptDice).total` (lignes 297-309) re-score les mêmes dés à chaque itération. Ex : garde un 1 (100), relance et obtient un 5 → +150 au lieu de +50, total 250 au lieu de 150. Sur 3 lancers le score CPU est ~2-3x gonflé.
- CRITIQUE — Le CPU ne peut quasiment jamais Farkle : la condition ligne 300 exige `keptDice.length === 0`, mais keptDice contient les dés gardés des lancers précédents, donc dès le 2e lancer le farkle est impossible même si les nouveaux dés ne scorent rien.
- Règle fausse côté joueur : les combos se cumulent entre lancers — garder un 1 au lancer 1 puis deux 1 au lancer 2 donne 'Brelan de 1 = 1000' via `scoreDice(keptDice)` dans `bank` (ligne 254) au lieu de 300 (en Farkle standard les combos doivent venir d'un même jet).
- `toggleKept` (ligne 240) permet de libérer un dé gardé lors d'un lancer PRÉCÉDENT : sa valeur périmée redevient 'libre' et sera relancée — état incohérent avec les règles (les dés mis de côté sont définitifs), le commentaire ligne 245 admet le problème sans le résoudre.
- `turnScore` est un état mort côté joueur : jamais incrémenté (uniquement setTurnScore(0) lignes 222/269/371), l'affichage ligne 442 `turnScore > 0 ? ...` ne montre donc jamais le cumul des lancers précédents — le joueur ne sait pas combien il a accumulé dans le tour.
- Off-by-one dans l'historique CPU : `setTurnNum(n => n+1)` (lignes 226/283) est async mais `startCpuTurn` capture l'ancien `turnNum` dans sa closure (ligne 329) — les entrées CPU ont un numéro de tour décalé.
- Fuite de timers : les `setTimeout` du joueur dans `rollDice` (lignes 202, 219) ne sont pas stockés dans `cpuTimerRef` → sur unmount pendant un farkle, `startCpuTurn` démarre sur un composant démonté (setState after unmount, timers CPU en chaîne qui continuent).
- Bug visuel pips : `r={9 / scale}` (ligne 69) avec scale=0.56 donne r≈16 dans un viewBox 100 — les 6 pips d'un dé de 6 se touchent presque ; le rayon devrait être constant en unités viewBox (~9).
UX:
- Dés de 56px : acceptable mais gap 8px entre 6 dés cliquables adjacents = risque de mis-tap élevé pour l'action la plus fréquente du jeu ; viser 60px+ avec gap 10-12.
- Le tour du CPU est une boîte noire : aucun dé affiché, juste des messages texte qui se remplacent toutes les 800ms — impossible de vérifier (et vu le bug de triche, le joueur sent que 'le CPU gagne trop vite').
- `title=` sur les dés (ligne 44) est inutile en tactile — aucun feedback au tap hormis le changement de bordure ; pas de haptique, pas de son.
- Aucune indication visuelle de QUELS dés scorent après un lancer — le débutant doit déduire des lignes de preview ; surligner les dés scorants (bordure verte) réduirait énormément la friction d'apprentissage.
- Objectif 10 000 points = partie de 10-20 minutes, beaucoup trop long pour un contexte restaurant (attente d'un plat ≈ 15 min) ; aucun réglage possible.
- Message d'erreur 'entrer en jeu 500 pts' (ligne 260) apparaît seulement APRÈS le tap sur Banquer — le bouton devrait être désactivé avec le seuil affiché en amont.
AMELIORATIONS:
- IMPACT FORT — Réécrire la boucle de tour avec un vrai modèle : `lockedDice: number[]` (définitifs, déjà scorés) + `accumulatedScore` + `activeDice` ; le CPU et le joueur partagent la même machine à états. Corrige d'un coup la triche CPU, le cumul inter-lancers, le toggleKept incohérent et le turnScore mort.
- IMPACT FORT — Implémenter Hot Dice : dans `rollDice`, si `numToRoll === 0 && keptScore > 0` alors accumuler `turnScore += keptScore`, vider dice/kept et relancer 6 dés au lieu de `return`.
- IMPACT FORT — Afficher les dés du CPU avec les mêmes composants Die (kept en cyan ACCENT2) et un délai lisible — transparence + spectacle, réutilise le code existant.
- IMPACT FORT — Réduire TARGET à 2000-4000 (ou sélecteur sur un écran setup comme PigGame) pour caler la durée de partie sur le contexte restaurant.
- IMPACT MOYEN — Surligner les dés scorants après chaque lancer (calculer quels index participent à `scoreDice`) et griser les non-scorants.
- IMPACT MOYEN — Corriger `r={9 / scale}` en `r={9}` et stocker/clear tous les timeouts joueur.
- IMPACT MOYEN — Ajouter vibration sur Farkle (`navigator.vibrate([100,50,100])`) et une animation framer-motion 'FARKLE' plein écran — c'est LE moment dramatique du jeu, actuellement un simple texte rouge.
- IMPACT FAIBLE — Le `<style>` keyframes est injecté dans CHAQUE Die (ligne 74) → 6 duplications par render ; le remonter au niveau du composant racine.

===== Yahtzee (score 6, effort 1.5j) =====
BUGS:
- Bonus Yahtzee = code mort : dans `lockScore` (ligne 165), `if (scores[cat] !== undefined || rolls === 0) return` s'exécute AVANT le check `cat === 'yahtzee' && scores.yahtzee !== undefined && s === 50` (ligne 169). Si yahtzee est déjà rempli, on return avant d'atteindre le bonus → le +100 (YAHTZEE_BONUS) ne peut jamais se déclencher. Il faut détecter le 2e yahtzee lors du scoring de N'IMPORTE QUELLE catégorie (règle joker), pas seulement 'yahtzee'.
- Même une fois rendu atteignable, la condition serait fausse : `scores.yahtzee !== undefined` accorderait le bonus après un yahtzee barré à 0 ; la règle exige `scores.yahtzee === 50`.
- `rollAnimRef` n'est pas nettoyé au démontage (aucun useEffect cleanup) → setState (`setDice`/`setRolls`) sur composant démonté si l'utilisateur quitte pendant les 480ms d'animation.
- `stats` chargé une seule fois via `useState(loadStats)` (ligne 121) : le 'Record' du header (ligne 276) reste périmé après avoir battu son record et cliqué Rejouer — il ne se met à jour qu'au remontage du composant.
- DieFace ligne 76 : `transform: rotate(${Math.random() * 720 - 360}deg)` génère une rotation aléatoire différente À CHAQUE render pendant `rolling`, en conflit avec l'animation `dieRoll` qui écrase transform — comportement visuel non déterministe (jitter) et re-render inutile.
UX:
- Dés de 54px avec `active:scale-90` : bon feedback tactile, taille OK.
- Aucune confirmation avant de verrouiller une catégorie : un mis-tap sur une case ScoreRow (~44px de haut, grille serrée gap-1) sacrifie définitivement une catégorie — c'est la pire erreur possible du jeu et elle est irréversible. Un double-tap de confirmation ou un bouton 'Valider' après sélection est indispensable.
- Après `lockScore`, les dés se réinitialisent visuellement à [1,2,3,4,5] (ligne 175) — affiche de faux dés trompeurs avant le lancer suivant ; mieux : les griser ou les vider.
- Bouton retour ~30px de zone tactile (p-1.5 + icône 18), sous les 44px.
- Pas de vibration ni son sur un Yahtzee (moment jackpot du jeu) — seul le preview violet signale l'événement.
- Le fichier utilise des classes Tailwind (className) alors que le contexte annonce styles inline — incohérence avec PigGame/FarkleGame ; si Tailwind n'est pas garanti sur cette route, toute la mise en page casse.
AMELIORATIONS:
- IMPACT FORT — Réparer le bonus Yahtzee : dans `lockScore`, avant le return early, tester `const isSecondYahtzee = scores.yahtzee === 50 && new Set(dice).size === 1` puis appliquer +100 quel que soit `cat` choisi (règle joker), et autoriser fullHouse/suites en joker.
- IMPACT FORT — Ajouter une étape de confirmation sur ScoreRow : premier tap = sélection surlignée + bouton 'Valider +N pts', second tap = lock. Élimine la perte de catégorie par mis-tap.
- IMPACT FORT — Célébration Yahtzee : détecter `new Set(dice).size === 1 && rolls > 0`, déclencher confettis (framer-motion), `navigator.vibrate([50,50,50,50,200])` et flash — le moment signature du jeu est actuellement muet.
- IMPACT MOYEN — Mettre à jour `stats` après chaque partie : remplacer `useState(loadStats)` par un state mis à jour dans le useEffect de sauvegarde (`setStats(s)` avec le retour de saveStats).
- IMPACT MOYEN — Ajouter le cleanup `useEffect(() => () => { if (rollAnimRef.current) clearTimeout(rollAnimRef.current) }, [])`.
- IMPACT MOYEN — Rotation de dés : générer l'angle une fois par lancer (stocké dans un state/ref au moment du roll) au lieu de Math.random() dans le render.
- IMPACT FAIBLE — Griser/masquer les dés après lockScore au lieu de reset [1,2,3,4,5] ; agrandir la zone du bouton retour à 44px.
- IMPACT FAIBLE — Rejouabilité : ajouter un tableau des 5 meilleurs scores (le localStorage n'en garde qu'un) et un mode 'défi du jour' avec seed partagée.

===== Réaction (ReactionTimeMode) (score 6.5, effort 0.5j) =====
BUGS:
- Mesure du temps faussée sur tactile : `onClick={handleTap}` (ligne 129) se déclenche au pointer-UP, pas au pointer-down. Sur mobile, la durée du contact du doigt (30-100ms) est ajoutée au score. Il faut `onPointerDown` pour un jeu de réaction — c'est le cœur du gameplay qui est biaisé.
- Utilisation de `Date.now()` (lignes 40, 51) au lieu de `performance.now()` : précision milliseconde non garantie et sensible aux ajustements d'horloge système.
- Faux positif « 🏆 Nouveau record ! » (ligne 151) : la condition `stats.best === time` est vraie aussi quand on ÉGALE son record (ou quand la première tentative devient mécaniquement le best), pas seulement quand on le bat. Il faut comparer avec le best AVANT mise à jour.
- Dans l'histogramme, `isBest = t === stats.best` (ligne 166) surligne PLUSIEURS barres si deux tentatives ont le même temps.
- Tap accidentel après un résultat : en phase 'result', n'importe quel tap sur le gros bouton relance immédiatement une manche (ligne 64-65) — un double-tap réflexe après le résultat démarre une partie non voulue. Ajouter un délai de grâce de ~500ms.
UX:
- Le bouton « Réinitialiser » (ligne 189) ne réinitialise que la phase, PAS les stats/records affichés juste au-dessus — le libellé est trompeur ; l'utilisateur s'attend à effacer l'historique.
- Aucune vibration (`navigator.vibrate`) au passage au vert ni au résultat — sur un jeu de réflexe mobile c'est le feedback le plus impactant et le moins coûteux.
- Le grand bouton (minHeight 220) est bien, mais le texte 16px blanc sur fond `#dc2626` pendant 'waiting' est correct ; en revanche en phase idle le fond SURFACE2 avec texte blanc peut manquer de contraste selon le thème.
- Pas de gestion du double-tap-zoom iOS : sans `touch-action: manipulation` sur le bouton, des taps rapides répétés peuvent déclencher un zoom parasite.
AMELIORATIONS:
- IMPACT FORT — Passer `onClick` en `onPointerDown` pour le gros bouton et enregistrer `performance.now()` : corrige le biais de mesure, différenciateur immédiat vs concurrents.
- IMPACT FORT — Ajouter `navigator.vibrate(30)` quand le fond passe au vert et `vibrate([20,30,20])` sur un record ; framer-motion est dispo : animer le résultat avec un spring scale.
- IMPACT MOYEN — Persister un classement local par table/session (le restaurant peut afficher « meilleur temps de la table ») : rejouabilité sociale, parfait pour le contexte resto.
- IMPACT MOYEN — Corriger la logique de record (comparer au best précédent) et n'illuminer qu'une seule barre best dans l'histogramme (comparer l'index, pas la valeur).
- IMPACT FAIBLE — Délai de grâce de 500ms en phase 'result' avant qu'un tap ne relance, et bouton séparé « Effacer les stats ».

===== Séquence (SequenceMode, type Simon) (score 6, effort 1j) =====
BUGS:
- `setTimeout(() => setActiveBtn(null), 200)` (ligne 256) n'est jamais nettoyé au démontage (seul `timerRef` l'est, ligne 225) → setState sur composant démonté possible si l'utilisateur change de mode pendant le flash.
- Flash de bouton écrasé en taps rapides : deux presses rapprochées partagent le même state `activeBtn` ; le timer du 1er press remet `null` 200ms après, coupant prématurément le flash du 2e press.
- Scoring discutable : en cas d'échec, `bestLevel = level` (ligne 263) alors que le niveau `level` n'a PAS été complété — le standard Simon compte les niveaux réussis (`level - 1`). Le message « Niveau N atteint » est donc gonflé de 1.
- Le dernier point de progression n'est jamais rempli visuellement : quand le joueur termine la séquence, la phase passe directement à 'success' sans mettre à jour `playerSeq` (lignes 267-275), donc les dots (ligne 345) montrent N-1/N rempli pendant le flash de succès.
- `bestLevel` n'est pas persisté en localStorage, contrairement au mode Réaction — incohérence : le record disparaît au refresh.
UX:
- Les 4 pads (height 90) utilisent `onClick` → latence de feedback perceptible ; sur un jeu de rythme/mémoire, le flash doit partir au `onPointerDown`.
- Aucun son : Simon est un jeu AUDIO-visuel par nature ; 4 tons (WebAudio, 4 oscillateurs, ~20 lignes) doubleraient la mémorisabilité et le fun.
- Vitesse fixe (600ms on / 250ms off) quel que soit le niveau : aucune montée de tension. Le jeu devient long et plat au-delà du niveau 8.
- Pas de vibration sur press ni sur échec.
- Pendant 'showing', rien n'empêche l'écran de paraître figé si l'utilisateur tape : un léger shake « attendez » aiderait.
AMELIORATIONS:
- IMPACT FORT — Ajouter 4 tons WebAudio (fréquences 329/392/440/523Hz comme le Simon original) joués pendant le replay ET au press du joueur : transforme complètement le jeu.
- IMPACT FORT — Accélérer le tempo avec le niveau : `const speed = Math.max(220, 600 - level * 30)` à la place du 600 fixe (ligne 240) — la difficulté progressive est le moteur de rejouabilité du genre.
- IMPACT MOYEN — Persister `bestLevel` en localStorage (clé 'sequence_best') et corriger le scoring à `level - 1` en cas d'échec.
- IMPACT MOYEN — Passer les pads en `onPointerDown`, gérer `activeBtn` avec un ref de timer annulable, et `navigator.vibrate(15)` par press.
- IMPACT FAIBLE — Compléter le dernier dot avant le flash success (`setPlayerSeq(next)` avant `setPhase('success')`).

===== 1→25 (NumberTapMode) (score 6.5, effort 0.5j) =====
BUGS:
- `bestTime` n'est pas persisté (useState(0) ligne 378) alors que le mode Réaction sauvegarde en localStorage — le record saute au refresh, incohérence flagrante entre modes du même fichier.
- Les `setTimeout` des flashes (lignes 409, 422) ne sont pas nettoyés au démontage → setState après unmount si on change de mode pendant un flash.
- `wrongFlash`/`correctFlash` mono-valeur : en spam de taps, le timeout d'un ancien flash efface le flash en cours (même pattern défectueux que SequenceMode).
- Le chrono re-render les 25 boutons toutes les 50ms (interval ligne 402) : sur téléphone bas de gamme le jeu peut ramer précisément pendant qu'on mesure la vitesse du joueur. Isoler l'affichage du temps dans un sous-composant.
UX:
- Cellules ~60px sur un écran 375px de large (5 colonnes, gap 6) : au-dessus des 44px requis, OK — mais `onClick` au lieu de `onPointerDown` ajoute encore de la latence sur un jeu de vitesse pure.
- Aucune pénalité sur mauvais tap : le spam aléatoire de l'écran est une stratégie viable. Ajouter +0,5s de pénalité rend le jeu honnête.
- Pas de vibration sur tap correct/incorrect.
- Pas de compte à rebours 3-2-1 avant le départ : le chrono démarre au clic sur « Commencer » alors que le joueur n'a pas encore repéré le « 1 ».
AMELIORATIONS:
- IMPACT FORT — Compte à rebours « 3, 2, 1, GO » avant d'afficher la grille (ou grille masquée jusqu'au GO) : actuellement le premier scan visuel du « 1 » est compté dans le temps, ce qui rend les scores peu comparables.
- IMPACT FORT — Pénalité de +500ms affichée en rouge flottant sur mauvais tap (ligne 420-423) + `navigator.vibrate(40)` : supprime l'exploit du spam.
- IMPACT MOYEN — Persister bestTime en localStorage et extraire le chrono dans un composant mémoïsé pour éviter 20 re-renders/s de la grille.
- IMPACT MOYEN — Variante difficulté : mode 1→36 (6×6) ou mode inversé 25→1 pour la rejouabilité.
- IMPACT FAIBLE — `onPointerDown` sur les cases + `touch-action: manipulation`.

===== Démineur (MinesweeperGame) (score 4.5, effort 2.5j) =====
BUGS:
- BLOQUANT MOBILE : poser un drapeau n'est possible que via `onContextMenu` (ligne 203). iOS Safari ne déclenche PAS l'événement contextmenu au long-press → le jeu est littéralement injouable sur iPhone au-delà des grilles triviales (impossible de flagger, donc impossible de chorder). Il faut un long-press custom (pointerdown + timer 350ms) ET/OU un bouton toggle 🚩/⛏ « mode drapeau ».
- Effets de bord dans les updaters `setGrid(prev => ...)` : `setGameState`, `saveStats`, `setStats`, écritures localStorage sont appelés DANS la fonction updater (lignes 276-296, 303-318, 356-390). En React 18 StrictMode dev, les updaters sont exécutés deux fois → stats `played`/`wins` double-incrémentées et double écriture localStorage. Les side effects doivent sortir de l'updater.
- SevenSegDisplay masque le sur-flaggage : `Math.abs(Math.floor(value))` (ligne 135) affiche « 002 » quand `mineCounter` vaut -2 — le joueur croit qu'il reste 2 mines alors qu'il a posé 2 drapeaux de trop. Le démineur classique affiche le signe négatif.
- handleChord (lignes 353-374) : après avoir touché une mine (défaite), la boucle `forEach` continue et appelle `floodReveal` sur les voisins restants du grid « perdu » ; et le check de victoire (ligne 377) s'exécute APRÈS la défaite — dans le cas limite où le flood révèle tout, `setGameState('won')` écrase `setGameState('lost')` dans la même passe.
- `floodReveal` saute les cases '❓' (ligne 111 `cell.flag !== 'none'`) : le démineur standard révèle les cases marquées « ? » lors d'un flood ; ici elles restent bloquées, déroutant pour les habitués.
- Taille de cellule non réactive : `window.innerWidth` est lu au render (ligne 398) sans listener resize/orientationchange → rotation de l'écran ne recalcule pas la grille.
UX:
- Cellules de 18px minimum en Expert (ligne 399) sur un écran de 375px : 30 colonnes → grille de 540px+ qui déborde du conteneur `inline-block` sans `overflow-x: auto` — grille coupée, et taps de 18px = taux de misclick fatal énorme dans un jeu où une erreur = défaite.
- Cibles tactiles : même en Débutant (~36px) on est sous les 44px recommandés ; en Intermédiaire (~22px) c'est très en dessous.
- `onMouseDown`/`onMouseUp` pour le smiley « scared » (lignes 204, 491-492) : événements souris uniquement, comportement erratique au tactile ; utiliser les pointer events.
- Aucune vibration à l'explosion ni à la victoire — l'explosion est LE moment à ponctuer (vibrate + shake framer-motion).
- L'astuce « Clic droit pour poser un drapeau » (ligne 562) est du vocabulaire desktop affiché à des clients au téléphone.
- Pas de zoom/pan sur les grandes grilles : Expert est inutilisable même avec scroll.
AMELIORATIONS:
- IMPACT CRITIQUE — Implémenter le flag mobile : toggle 🚩/⛏ persistant dans le header (à côté du smiley) + long-press 350ms via pointerdown/pointerup avec `navigator.vibrate(20)` de confirmation. Sans ça, le jeu ne doit pas être proposé aux clients.
- IMPACT FORT — Grille scrollable : envelopper la grille dans un div `overflow: auto; -webkit-overflow-scrolling: touch; max-width: 100%` et monter le cellSize minimum à 28-32px (accepter le scroll plutôt que des cellules de 18px).
- IMPACT FORT — Sortir tous les side effects des updaters setGrid : calculer le grid résultant, puis faire setGameState/stats dans le corps du handler (corrige le double-comptage StrictMode et rend le code testable).
- IMPACT MOYEN — Afficher le compteur négatif (retirer Math.abs, gérer le signe « - » dans SevenSegDisplay) et `return`/`break` immédiat dans handleChord dès qu'une mine est touchée.
- IMPACT MOYEN — Juice : shake de la grille à l'explosion (framer-motion), révélation des mines en cascade avec délai 30ms, vibrate([100,50,100]) à la défaite, confetti à la victoire (le composant existe déjà dans MastermindGame — le factoriser dans theme/shared).
- IMPACT FAIBLE — Listener resize/orientation pour recalculer cellSize ; révéler les cases '?' dans floodReveal.

===== Mastermind (MastermindGame) (score 6.5, effort 1.5j) =====
BUGS:
- Le premier essai exige de sélectionner un peg manuellement : `startGame` fait `setSelectedPeg(null)` (ligne 177) alors qu'après un submit non final on fait `setSelectedPeg(0)` (ligne 246). Résultat : au 1er tour, taper une couleur ne fait RIEN (garde `if selectedPeg === null` ligne 212) — friction majeure et incohérente ; beaucoup de joueurs croiront le jeu cassé.
- L'historique des essais (`maxHeight: 260, overflowY: auto`, ligne 419) ne scrolle jamais automatiquement vers le bas : à partir du ~7e essai, le dernier essai soumis (et ses indices !) est masqué hors de la zone visible — le joueur perd l'information la plus importante au moment le plus tendu de la partie.
- `pickColor` lit `current` périmé pour l'auto-avance (ligne 219) : il calcule `nextEmpty` sur l'état AVANT le setCurrent ; ça marche par chance car la recherche exclut le slot courant (`i > selectedPeg`), mais l'auto-avance ne revient jamais en arrière — si les slots 3-4 sont remplis et le 1 vide, après avoir rempli le 2 la sélection passe à null au lieu du slot 1.
- Confetti : `Math.random()` dans le render (lignes 144-149) → tout re-render du parent pendant les 2,8s (n'importe quel setState) re-tire les positions et fait « sauter » les confettis. Mémoïser les pièces avec useMemo.
- checkGuess est correcte (algorithme black/white standard, lignes 52-69) — bon point, c'est là où la plupart des implémentations se trompent.
UX:
- ColorPeg est un `div onClick` (lignes 93-94) de 22-30px : sous les 44px de cible tactile, pas de rôle bouton, pas de zone de padding tactile étendue — les pegs de la palette (30px) et les slots (28px) sont durs à viser à table.
- L'attribut `title={COLOR_NAMES[ci]}` (ligne 479) n'existe pas au tactile : les noms de couleurs ne sont jamais accessibles sur mobile (problème pour daltoniens — aucun symbole/lettre sur les pegs).
- `onMouseEnter/onMouseLeave` sur les boutons de difficulté (lignes 311-312) : sur tactile, le hover reste « collé » après le tap.
- Aucune vibration ni son au submit, à la victoire ou à la défaite ; le shake existe (bien) mais il se déclenche sur TOUT submit, même excellent (4 noirs) — le shake devrait signifier « raté ».
- Zone de guess figée en bas mais l'écran total peut dépasser la hauteur du viewport en fin de partie (banner + shield + 10 essais + palette) : la palette peut sortir de l'écran sur petit téléphone.
AMELIORATIONS:
- IMPACT FORT — `setSelectedPeg(0)` dans startGame (ligne 177) et auto-avance circulaire : `const order = [...indices après selectedPeg, ...indices avant]` pour trouver le premier vide où qu'il soit — supprime les deux frictions de saisie d'un coup.
- IMPACT FORT — Auto-scroll de l'historique : `ref` sur le conteneur + `useEffect(() => el.scrollTo({top: el.scrollHeight}), [guesses.length])` — corrige la perte d'information critique.
- IMPACT FORT — Accessibilité daltoniens : ajouter une lettre ou un petit symbole au centre de chaque ColorPeg (R, O, J, V, B, Vi, Ro, T) — dans un restaurant, ~8% des hommes ne distinguent pas rouge/vert, le jeu leur est actuellement fermé.
- IMPACT MOYEN — Convertir ColorPeg en <button> avec padding tactile (hit area 44px via padding invisible), vibrate(15) au placement, vibrate([30,40,30]) à la victoire ; ne shaker la ligne que si black+white est faible.
- IMPACT MOYEN — Mémoïser les pièces de Confetti (useMemo sur le tableau positions/durées) et le sortir dans un module partagé réutilisable par les autres jeux.
- IMPACT FAIBLE — Mode « duel » : un joueur compose le code, l'autre devine — parfait pour deux clients à la même table, quasi gratuit à implémenter (écran de saisie du code masqué).

===== Taquin (Sliding Puzzle) (score 5.5, effort 2.5j) =====
BUGS:
- Compteur de coups faux au tap : dans moveTile (l.196-212), setMoves(m => m+1) est appelé inconditionnellement APRÈS setTiles — un tap sur une tuile non adjacente au trou incrémente quand même 'Coups' et démarre le chrono (setRunning(true)) alors qu'aucune tuile n'a bougé. Le test d'adjacence est enfermé dans l'updater de setTiles et son résultat n'est pas visible dehors.
- Effets de bord dans les updaters d'état (l.246-249 clavier, l.280-283 swipe, l.207-210 moveTile) : setMoves/setRunning sont appelés À L'INTÉRIEUR de setTiles(prev => ...). En React 18 StrictMode les updaters sont exécutés deux fois → moves compté en double à chaque flèche/swipe. C'est un anti-pattern hooks documenté (updaters doivent être purs).
- Listener clavier global (l.253) : window.addEventListener('keydown') actif en permanence — les flèches sont capturées même quand l'utilisateur veut scroller la page ou qu'un autre élément a le focus. e.preventDefault() (l.245) est appelé depuis l'intérieur de l'updater, donc potentiellement après que React ait différé l'exécution.
- Victoire potentiellement détectée avec un temps périmé : l'effet de win (l.215-229) capture 'elapsed' de la render courante ; si la dernière tuile est posée juste avant le tick du timer, le score sauvegardé peut être décalé d'1s (mineur mais visible sur le record).
- Code mort : dx/dy calculés puis annulés avec 'void dx; void dy' dans Tile (l.118-120) — vestige d'une animation jamais implémentée, à supprimer.
- createShuffled récursif (l.41) : récursion non bornée théorique si le shuffle retombe sur l'état résolu (probabilité infime mais une boucle while serait plus propre).
UX:
- Conflit swipe/scroll : le board (l.410-424) écoute onTouchStart/onTouchEnd mais n'a pas touchAction:'none' ni preventDefault — un swipe vertical déplace une tuile ET scrolle la page en même temps. Sur mobile en restaurant c'est le défaut le plus gênant.
- Bouton retour trop petit : ChevronLeft 18px + padding 6 ≈ 30x30px, sous le minimum tactile de 44px (l.305-310).
- Aucune animation de glissement : les tuiles se téléportent (swap instantané dans la grille CSS, key=`${size}-${i}` liée à l'index). framer-motion est dispo mais inutilisé — un layout animation avec key=value rendrait le jeu immédiatement plus satisfaisant.
- Largeur fixe : boardSize (l.290) donne 328px en 5x5 — déborde sur iPhone SE/petits écrans avec le padding parent ; tileSize devrait être calculé depuis la largeur du conteneur.
- Hint inadapté : 'Cliquez ou utilisez les flèches directionnelles' (l.441) affiché sur mobile où il n'y a ni clic ni clavier.
- Aucun retour haptique ni sonore sur un déplacement, aucun feedback quand on tape une tuile non déplaçable (elle devrait secouer).
- Pas de pause : le chrono tourne même si le client pose son téléphone (visibilitychange non géré).
AMELIORATIONS:
- IMPACT FORT — Corriger le comptage : faire le test d'adjacence AVANT setTiles (calculer blank depuis 'tiles' courant) et n'appeler setMoves/setRunning que si le coup est valide ; sortir tous les setState des updaters (clavier l.235-251 et swipe l.268-285 inclus).
- IMPACT FORT — touchAction:'none' sur le board + overscroll-behavior, et déplacer la logique swipe hors de l'updater. Élimine le scroll parasite.
- IMPACT FORT — Animer les tuiles : rendre les tuiles en position absolue (translate calculé depuis l'index, le dx/dy mort l.118 était le début de ça) ou motion.div avec layout et key={value} — glissement fluide 150ms, c'est LE 'juice' manquant du taquin.
- IMPACT MOYEN — Slide multi-tuiles standard du taquin : taper n'importe quelle tuile de la même ligne/colonne que le trou pousse toutes les tuiles intermédiaires (réduit la frustration tactile, norme du genre).
- IMPACT MOYEN — navigator.vibrate(10) par coup valide, vibrate([30,50,30]) à la victoire, et animation 'shake' sur coup invalide.
- IMPACT MOYEN — tileSize responsive : const tileSize = Math.min(80, (containerWidth - 24 - (size-1)*6) / size) via un ref/ResizeObserver.
- IMPACT FAIBLE — Pause auto sur document.visibilitychange ; supprimer le code mort dx/dy ; remplacer la récursion de createShuffled par un while.
- IMPACT FAIBLE — Mode image (photo du plat du restaurant découpée en tuiles) : différenciateur fort pour le contexte restauration, réutilise toute la logique existante.

===== Bingo (score 4, effort 3.5j) =====
BUGS:
- callNumber (l.122-153) exécute TOUS ses effets de bord dans l'updater setCalled : setLastCall, setHistory, setBallAnim, setTimeout, setNewlyMarked, checkWin, saveStats (écriture localStorage !). En StrictMode l'updater tourne deux fois avec deux Math.random() différents → l'historique peut contenir un numéro jamais réellement ajouté à 'called' (le 2e run gagne pour called, mais setHistory du 1er run a déjà poussé son numéro). Historique incohérent avec la grille.
- saveStats (l.89) : localStorage.setItem SANS try/catch, appelé depuis l'intérieur de l'updater — en navigation privée iOS Safari (quota 0), ça throw et crashe le rendu au moment du bingo.
- L'effet auto (l.110-120) dépend de 'called' : l'interval est détruit/recréé à CHAQUE numéro appelé, donc le délai réel est 'temps de re-render + 2s' et le pattern est fragile ; la dépendance called ne sert qu'à contourner le fait que callNumber est stable — un setInterval unique avec callNumber en ref serait correct.
- setTimeout(setBallAnim, 500) et setTimeout(setNewlyMarked, 800) (l.132, l.139) jamais clear : setState après unmount si le joueur quitte pendant l'animation, et deux numéros marqués à <800ms d'écart en mode auto s'annulent mutuellement le highlight.
- shuffle par sort(() => Math.random()-0.5) (l.9-11) : shuffle biaisé notoire — certaines cartes sont statistiquement plus probables. Utiliser Fisher-Yates (déjà écrit dans SlidingPuzzleGame.tsx l.30-33 !).
- Confetti (l.226-234) : Math.random() dans le JSX → les positions des confettis changent à chaque re-render du composant après la victoire (les left sautent). Mémoïser les positions à la victoire.
- checkWin retourne le premier pattern trouvé dans un ordre fixe (row avant corners) : un '4 coins' complété en même temps qu'une ligne est toujours annoncé 'Ligne' — pas un crash mais règle d'annonce discutable, et surtout la partie s'arrête au premier win : impossible de continuer vers la carte complète.
UX:
- Zéro interaction de jeu : les cases sont auto-marquées (isMarked calcule depuis 'called', aucun onClick sur les cellules l.303-328). Le joueur appuie sur un seul bouton en boucle — c'est un économiseur d'écran, pas un jeu. Le cœur du bingo (repérer et 'dauber' son numéro soi-même) est absent.
- Le joueur gagne à 100% des parties : bingo solo auto-marqué → une ligne sort toujours. La stat 'Bingos' et le taux de réussite n'ont aucun sens, aucune tension.
- Les numéros marqués deviennent illisibles : la cellule remplace le numéro par '✓' (l.323-324) — impossible de vérifier sa carte, contraire à toute UX bingo (le numéro doit rester visible sous le marquage).
- Cellules 46px de haut mais largeur 20% : sur écran ≤360px la cellule fait ~64x46 — OK, mais si on ajoute le daubing manuel il faudra du feedback (actuellement transition-all sans état pressé).
- Mode auto sans indicateur de temps : aucun compte à rebours/progress ring vers le prochain tirage (2s), le joueur ne sait pas quand la boule tombe.
- Pas de pause du mode auto via visibilitychange : les numéros continuent de tomber téléphone verrouillé (interval throttlé par le navigateur → cadence imprévisible).
- Aucune vibration/son au tirage ni au bingo, alors que c'est le moment 'machine à sous' du jeu.
AMELIORATIONS:
- IMPACT FORT — Daubing manuel : onClick sur chaque cellule, marquage seulement si le numéro a été appelé (sinon shake + vibration), et checkWin sur les cases DAUBÉES et non sur 'called'. Ajoute la seule mécanique de skill du bingo : l'attention. Bonus : score 'rapidité de daub'.
- IMPACT FORT — Adversaires IA : 1-3 cartes fantômes qui se marquent automatiquement ; le joueur doit crier BINGO (bouton) avant eux. Crée enjeu, défaite possible, rejouabilité — actuellement victoire garantie.
- IMPACT FORT — Sortir tous les effets de bord de l'updater setCalled : tirer le numéro AVANT (const remaining = ... depuis l'état courant ou un ref), puis setCalled(next), setHistory, etc. au niveau du callback. Corrige l'incohérence historique/grille et le crash StrictMode.
- IMPACT MOYEN — try/catch autour de saveStats ; clear des timeouts via refs + cleanup d'unmount ; interval auto unique avec callNumber dans un ref au lieu de recréer l'interval sur chaque 'called'.
- IMPACT MOYEN — Garder le numéro visible dans les cases marquées (numéro + pastille/cercle superposé au lieu du '✓' seul).
- IMPACT MOYEN — Progress ring de 2s autour de la boule en mode auto + choix de cadence (1s/2s/4s) ; navigator.vibrate(15) au tirage, fanfare + vibrate long au bingo.
- IMPACT MOYEN — Continuer après le premier win : annoncer 'Ligne !' puis laisser jouer vers 4 coins / carte pleine avec récompenses échelonnées (progression de session pour un client qui attend son plat).
- IMPACT FAIBLE — Remplacer shuffle sort(random) par Fisher-Yates (factoriser dans un utils partagé avec SlidingPuzzleGame) ; mémoïser les positions des confettis ; pause auto sur visibilitychange.

===== Billard Lounge (9-ball simplifié) (score 4.5, effort 2.5j) =====
BUGS:
- Direction de tir inversée par rapport à la ligne de visée affichée : la ligne pointillée est tracée de startX/startY vers la position courante (setAimLine l.233), mais la vélocité appliquée est dx = startX - pos.x (l.239-249), donc la bille part dans le sens OPPOSÉ de la ligne dessinée. Le joueur vise à droite, la bille part à gauche. C'est le bug le plus grave du jeu.
- Aucune vérification que le drag démarre sur la bille blanche : onPointerDown (l.222-228) accepte un drag depuis n'importe où sur le canvas alors que le message dit 'Glissez depuis la bille blanche'. Incohérence règle/implémentation.
- pointercancel/pointerleave non gérés et pas de setPointerCapture : si le navigateur annule le geste (notification, swipe système fréquent sur mobile), dragRef.current reste actif avec active:true, l'aimLine reste figée à l'écran ET la condition `dragRef.current === null` (l.151) bloque définitivement la détection de faute et de fin de partie. Soft-lock réel.
- Score final calculé avec un état stale : si la blanche est empochée dans le même 'frame' que la dernière bille de couleur, setFouls((f)=>f+1) (l.154) est asynchrone et finalScore (l.165) utilise la valeur `fouls` de la closure — la dernière faute n'est pas comptée dans le score soumis via submit().
- L'effet RAF est détruit/recréé à CHAQUE pointermove : `aimLine` est dans les deps du useEffect (l.212), donc chaque frame de drag fait cancelAnimationFrame + réinitialisation complète de la boucle. Idem pour shots/fouls. Le rendu doit lire aimLine via un ref, pas via les deps.
- Message mensonger : 'la blanche est replacée (+2 coups pénalité)' (l.160) alors que le code incrémente `fouls` qui vaut -10 pts (l.76), pas +2 sur le compteur de coups affiché. Le joueur voit 'Coups' inchangé.
- Pas de vraies règles 9-ball : aucun ordre de billes imposé, pas de faute si aucune bille touchée, pas de règle sur la 9. Le sous-titre annonce '9-ball' mais c'est juste 'empochez tout'.
- Le score plancher est 10 (l.76) : impossible de perdre, aucun enjeu — même 50 coups et 20 fautes donnent 10 points enregistrés au leaderboard.
UX:
- Table de 380x220 affichée en width:100% : sur un téléphone en portrait (~350px), les billes font ~7px à l'écran — quasi impossible de distinguer les couleurs, et les poches (R=14 → ~13px) sont sous le minimum tactile de 44px pour la lecture visuelle. Le jeu devrait forcer/suggérer le paysage ou agrandir le canvas verticalement.
- Aucun indicateur de puissance : la longueur du drag donne la puissance (l.244) mais rien ne la visualise (pas de jauge, pas de couleur de ligne progressive). Le joueur ne peut pas calibrer.
- Aucune trajectoire prédite : pas de ghost line montrant où ira réellement la blanche (surtout critique vu que la direction est inversée par rapport à la ligne actuelle).
- Zéro feedback à l'empochage : la bille disparaît instantanément, sans animation, son, flash ni vibration (navigator.vibrate). Le moment le plus gratifiant du billard est muet.
- Pas de pause ; le timer n'existe pas ici mais la partie ne peut pas être quittée/reprise proprement.
- Le message d'état est dans le panneau latéral : sur mobile (media query 760px du shell), il passe SOUS le canvas — le joueur regarde la table et ne voit jamais 'Faute'.
AMELIORATIONS:
- [CRITIQUE] Corriger la visée : dessiner la ligne depuis la position de la bille blanche (cue.x, cue.y) dans la direction du tir réel (start - current), avec longueur proportionnelle à la puissance clampée à 14. Exiger que pointerDown soit à moins de ~30px de la blanche (hit-zone > BALL_R pour le tactile).
- [CRITIQUE] Gérer onPointerCancel/onPointerLeave (reset dragRef + aimLine) et appeler canvas.setPointerCapture(e.pointerId) dans onPointerDown pour que le drag survive à la sortie du canvas.
- [HAUTE] Sortir aimLine/shots/fouls des deps du useEffect : stocker aimLine dans un ref (aimLineRef) mis à jour dans onPointerMove, et lire shots/fouls via refs dans le check de fin de partie. Un seul RAF stable pour toute la vie du composant.
- [HAUTE] Juice à l'empochage : particules radiales de la couleur de la bille, scale-down animé (3-4 frames), navigator.vibrate(30), et son court (WebAudio oscillator suffit, pas d'asset).
- [MOYENNE] Jauge de puissance : cercle progressif autour de la blanche ou barre latérale colorée (vert→rouge) pendant le drag.
- [MOYENNE] Vraies mini-règles : bonus si plusieurs billes en un coup, faute si la blanche ne touche rien, ordre croissant optionnel en mode 'Pro' pour la rejouabilité.
- [BASSE] Numéroter les billes (drawText id au centre) pour la lisibilité et l'identité 9-ball.

===== Basket Rooftop (score 4, effort 3j) =====
BUGS:
- La physique ignore l'angle du drag : ball.vy = -power (l.204) utilise la LONGUEUR totale du drag comme puissance verticale, et ball.vx = dx/40 n'utilise que la composante horizontale divisée arbitrairement. Un drag horizontal pur envoie le ballon à pleine puissance vers le HAUT. La ligne de visée affichée ne correspond pas du tout à la trajectoire — le cœur du gameplay est cassé.
- Le commentaire promet un 'rebond léger sur le panneau' (l.11) mais AUCUNE collision panneau/arceau n'existe : le ballon traverse le panneau (fillRect l.95) et l'arceau. Le panier est un simple test de distance dist < radius*0.6 (l.148), on peut marquer en traversant le panneau.
- Fuite de setTimeout en rafale : quand le ballon sort de l'écran (l.159-162), la condition reste vraie à CHAQUE frame RAF pendant les 200ms du timeout → ~12 setTimeout empilés + setMessage('Raté !') appelé 12 fois par tir raté. Aucun de ces timers n'est nettoyé au unmount du composant.
- Le useEffect RAF est détruit/recréé à chaque pointermove ([aimLine] en dep, l.169) — même churn que le billard ; toute la boucle de dessin redémarre à chaque pixel de drag.
- pointercancel non géré + pas de setPointerCapture : geste système interrompu = dragRef.active reste true, aimLine figée, et le prochain pointerdown est absorbé bizarrement.
- On peut marquer par en-dessous : dist < radius*0.6 && vy > 0 se déclenche aussi si le ballon monte au-dessus puis redescend À CÔTÉ puis re-rentre dans le rayon — pas de vérification que le ballon vient d'au-dessus du plan de l'arceau (ball.y précédent < hoop.y).
- Imports morts : ActionButton et TEXT importés (l.2-3) jamais utilisés — échec lint strict.
- Le tir en cours continue après la fin du chrono : la boucle draw ne lit pas gameOver, un panier marqué après 0s incrémente encore setScore (le submit a déjà eu lieu avec l'ancien score → le leaderboard et l'écran final divergent).
UX:
- Aucune indication des positions de tir ni des points : SHOT_POSITIONS alterne 2pts/3pts (l.34-38, l.151) mais rien à l'écran ne montre la position suivante ni sa valeur avant de tirer — le joueur découvre '+3' sans comprendre.
- Le canvas 360x520 en width:100% sur le shell : sur tablette paysage, le playfield est immense mais le canvas reste bridé à maxWidth 360 et centré nulle part explicitement — grande zone morte.
- Zéro feedback de panier : pas d'animation de filet, pas de particules, pas de son, pas de vibration. Juste un texte dans le panneau latéral qui, sur mobile, est SOUS le canvas donc hors du champ de vision.
- Pas de pause : le chrono de 30s tourne même si le joueur reçoit un appel ; setTimeout continue tant que l'onglet est actif.
- La trajectoire n'a aucun ghost/preview en pointillés (arc balistique), pourtant trivial à calculer avec GRAVITY constant — c'est le standard du genre (cf. tous les jeux de basket mobiles).
- Le compte à rebours n'a aucune urgence visuelle : pas de rouge/pulse sous 5s, pas de bip.
AMELIORATIONS:
- [CRITIQUE] Physique de tir cohérente : vx = dx/8 et vy = dy/8 clampés (garder le vecteur du drag), ou convertir en angle+puissance : angle = atan2(dy,dx), vy = -power*sin, vx = power*cos. Ajouter le ghost arc en pointillés pendant le drag (simuler 30 steps de GRAVITY).
- [CRITIQUE] Collisions arceau + panneau : deux points de collision circulaires aux extrémités de l'arceau (hoop.x ± radius) qui repoussent le ballon, et rebond vx *= -0.6 sur le rectangle du panneau. Valider le panier seulement si prevY < hoop.y && ball.y >= hoop.y && |ball.x - hoop.x| < radius*0.6.
- [HAUTE] Remplacer les setTimeout en rafale par un flag : `if (!resetScheduledRef.current) { resetScheduledRef.current = true; setTimeout(...) }` et clear au unmount ; stocker aimLine dans un ref pour un RAF stable.
- [HAUTE] Juice : swish du filet (animer les 3 lignes l.104-108), particules orange au panier, navigator.vibrate([20,30,20]) pour un 3pts, flash '+2/+3' flottant sur le canvas au point d'impact (pas dans le panneau latéral).
- [MOYENNE] Difficulté progressive : après 5 paniers, hoop mobile (oscillation sinusoïdale en x), positions de tir plus lointaines ; multiplicateur de streak (x2 après 3 paniers consécutifs) pour la rejouabilité.
- [MOYENNE] Afficher un marqueur au sol de la prochaine position avec sa valeur ('3 PTS') avant le tir, chrono rouge pulsant sous 5s.
- [BASSE] Supprimer les imports ActionButton et TEXT ; figer la boucle quand gameOver est vrai.

===== arcade3d (shell + composants partagés — pas un jeu : Game3DShell, StatPill, PlayerBadge, ActionButton, MiniCard, CardBack, Die3D) (score 6, effort 1.5j) =====
BUGS:
- MiniCard rend les TRÈFLES en rouge : `const red = suit === '♦' || suit === '♥' || suit === 'D' || suit === 'C'` (l.137) — 'C' (clubs) est classé rouge au lieu de noir, et '♣' est correctement noir. Toute carte de trèfle passée en notation lettre s'affiche rouge dans les jeux de cartes qui consomment ce composant. Bug visuel réel de règle des cartes.
- Die3D affiche un chiffre au lieu de points de dé, et l'animation 'rolling' est un simple changement de transform statique (l.176) — aucune rotation continue, le 'lancer' est imperceptible.
- ActionButton déclare `transition: transform...` (l.263) mais aucun état :active/:hover n'existe (styles inline) — la transition ne se déclenche jamais, code mort.
- La balise <style> du Game3DShell (l.21-37) est ré-injectée dans le DOM par CHAQUE instance de shell montée ; avec la classe globale creorga-game3d-body, deux jeux montés simultanément dupliquent la règle (bénin mais sale).
UX:
- MiniCard small fait 54x78px : la largeur 54px est au-dessus des 44px mais la marge entre cartes n'est pas gérée ici — dans une main serrée les zones de tap se chevauchent ; l'état selected (translateY -10px) est le seul feedback, sans transition tactile immédiate au touchstart.
- Le breakpoint mobile à 760px empile le panneau latéral SOUS le playfield (min-height 620px/78vh) : toutes les stats, messages d'état et boutons des jeux sont hors écran pendant la partie — c'est la cause racine du problème de feedback invisible des deux jeux ci-dessus.
- Aucun composant de pause, de son on/off ni de tutoriel dans le shell, alors que tous les jeux en auraient besoin — chaque jeu devrait le réimplémenter.
- Le bouton Retour (ghostButtonStyle, minHeight 44 — bien) est le seul élément conforme tactile garanti ; StatPill minWidth 66 est purement informatif, OK.
AMELIORATIONS:
- [CRITIQUE] Corriger le rouge de MiniCard : `const red = suit === '♥' || suit === '♦' || suit === 'H' || suit === 'D'` — une ligne, impact sur tous les jeux de cartes.
- [HAUTE] Sur mobile, remplacer l'empilement panneau-sous-canvas par une barre de stats horizontale compacte AU-DESSUS du playfield (réordonner via order en grid dans la media query) pour que score/message restent visibles en jouant.
- [HAUTE] Ajouter au shell une infra de juice partagée : hook useHaptics (navigator.vibrate avec garde), petit synthé WebAudio (bip score/erreur), et un composant <FloatingText> pour les '+N pts' sur le canvas — mutualise ce qui manque à tous les jeux.
- [MOYENNE] Die3D : vraies faces à points (grille 3x3 de dots) + animation keyframes de rotation pendant rolling (injecter @keyframes dans la balise style existante).
- [MOYENNE] Dédupliquer l'injection <style> (module-level singleton ou fichier CSS) et donner à ActionButton un feedback pressé via onPointerDown/Up (scale 0.96).
- [BASSE] Renommer le fichier arcade3d.tsx en GameShell.tsx : il n'y a rien de 3D ni d'arcade dedans, et il héberge des composants transverses — la découverte du code en souffre.
