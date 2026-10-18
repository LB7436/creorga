# F18-L3 — reprise indépendante autorisée le 18 octobre 2026

État final : contre-essais Chrome notes/drainage GREEN, trois arrêts normaux,
restauration82tables/21466lignes/14fichiers/26PDF égaux. Correctifs validés,
campagne **NON LIVRÉE**, pilote **NON QUALIFIÉ**. Le complément final et le registre
en fin de document priment sur le point15:55UTC conservé ci-dessous.

## Point intermédiaire vérifié à 15:55 UTC

**Campagne NON LIVRÉE — pilote NON QUALIFIÉ.** Correctifs encore locaux sur
`codex/creorga-2-0-2026-10-08`, base `ab0d735f60f01bbfd0c7f914a43c2b997f280e2e`.
Ne pas confondre les contre-essais ciblés ci-dessous et les dix-huit parcours.
Les preuves antérieures L2 et leurs échecs sont conservés.

## Copie, limites et préservation

L'autorisation explicite d'une nouvelle copie a été exécutée une seule fois :
répertoire privé `local-2.0-recovery-20261018-YEEppm`, cluster PostgreSQL distinct
sur25450, base `creorga_f18_recovery`, API23002 et interfaces25174/25175/25177/25178.
Contexte fermé `f18-recovery`, profil `CREORGA_BUSINESS_ONLY`, artefacts distincts
`dist-business-f18-recovery`. Aucun secret repris dans Git ou ce rapport.

Le lanceur vérifie la base, les fichiers, les ports, les manifestes de compilation
et le contexte. Les clés bancaires/cloud sont vides et SMTP non configuré. Les
sorties TCP/TLS JavaScript sont limitées aux ports locaux de cette copie ; cette
garde n'est pas présentée comme un pare-feu système. Prisma est contrôlé séparément
par l'identité de sa base. Ni PostgreSQL, ni Chrome, ni les anciennes instances
bloquées ne sont arrêtés. Aucun profil historique, archive ou donnée source modifié.

Avant travail :704fichiers locaux préservés et comparés, manifeste SHA-256
`2b81a1e2f6613f7458d8399a8b7c96e3596fee8218c54168487159201f7328b2`.
Les deux exclusions utilisateur restent `apps/guest/tsconfig.tsbuildinfo` et
`.tmp-permissions-surface/`. Aucun changement de master ni déploiement.

La copie de départ est restaurée et comparée à15:21:57UTC : **82tables,
20012lignes,14fichiers,26PDF identiques**. Archive source préservée SHA-256
`2db67b2322bcf83f889872c44ba53d6bdd942f771eff102dedc63998ef712052` ;
preuve privée de copie SHA
`69e1c948dd29ceff7cb585525348c2544a5b2b82be72a5f1aaf0e2670c55e950`.
Cette restauration initiale ne remplace pas la restauration finale après recette.
Les anciens runtimes n'ayant pas été arrêtés, leur vidange mémoire n'est pas déduite.

## Deux contre-essais Chrome RED→GREEN désormais exécutés

### Suivi HTTP comprimé, puis arrêt normal

Le défaut sync+gzip reproduit dans L2 a été corrigé sans retirer le refus des vrais
callbacks opaques. À15:28:42UTC, après un vrai GET Chrome `floor-state`200 comprimé
**Brotli**, le canal officiel répond **STOPPED**. PID absent et ports libres ensuite,
PostgreSQL et anciennes instances toujours présents. Les compteurs avant/après
prouvent la fermeture du WebSocket, le gel des tâches et zéro travail restant.
Ce premier contrôle ne concernait pas encore un abandon pendant une transaction.

### Notes F2/F3 de la caisse

Une nouvelle commande fictive Restaurant Table2, un couvert, Eau3,20 +Soupe6,50,
sert de scénario distinct. Au clavier : note ticket puis consigne cuisine différente,
réouvertures préremplies, brouillon annulé, changement de modale, rechargement et
reconnexion. Le ticket retrouve sa note ; les deux textes distincts sont présents
dans `FloorWorkspace.snapshot`, HTTP PUT draft200. Les prix/TVA/lignes et les
ventes antérieures ne sont pas réécrits. Les notes du ticket précédent L2 demeurent.

## Abandon d'une réponse avec transaction active : GREEN borné

Nouvel acompte fictif2€ puis solde7,70€ :2,70espèces +5carte déclarée. La référence
de solde `8e119328-ec6a-44c3-a5d5-3270814252df` est créée une seule fois par l'UI.
Une barrière temporaire en lecture seule retient uniquement le verrou métier de
la nouvelle base ; aucun enregistrement modifié par la barrière.

Chronologie UTC observée :

-15:41:08.719 : attente PostgreSQL `Lock/advisory` de la requête prouvée.
-Chrome recharge avant la réponse ; POST388 reste sans réponse exploitable.
-15:41:16.763 : arrêt officiel,1travail applicatif actif,1réponse abandonnée,
  **0callback opaque**,1WebSocket vivant, tâches de fond sans opération active.
-15:41:16.764 : barrière libérée sur l'événement réel d'arrêt officiel.
-15:41:16.901 : **STOPPED**, tous les compteurs à0 et minuteries suspendues.
-15:41:27 :0connexion applicative PostgreSQL, ancien PID14676/35556 préservés.
-Redémarrage de la même copie puis reconnexion SERVER : GET397/200 sur la même
  référence, **aucun deuxième POST d'encaissement** ; Table2 À nettoyer.

SQL : **une commande/vente de970centimes**, acompte200 et solde770,470espèces +
500carte déclarée, une unité d'Eau et de Soupe débitées chacune. Les autres produits,
facture/avoir/remboursement et les anciennes opérations sont conservés. Restaurant
133€ cumulés à cet instant, chaque source financière rapprochée séparément. Café
et Bar ne subissent pas d'écriture financière ou de stock de ce scénario.

Ce test prouve le commit sans réponse et l'arrêt avec travail actif. Il ne prouve
pas toutes les pannes possibles, un arrêt électrique, une banque ou un pilote.
En cas de nouveau refus d'arrêt : marqueur privé permanent interdisant la reprise,
campagne arrêtée sur cette copie, aucune nouvelle multiplication de laboratoires.

## Restaurant QR, cuisine et transfert : contrôles ciblés

Nouvelle visite distincte Table1 : commande9 Soupe6,50 au double clic → une seule
commande, puis commande10 Eau3,20 → addition privée9,70. Ticket9 passé réellement
Commencer → Prêt → Servi, trois PATCH200, sans paiement/stock supplémentaire.
Paiement en ligne explicitement non configuré, jamais annoncé encaissé.

Mobile375 réellement capturé et inspecté ;375/390/768/1440 sans débordement global
dans les vues contrôlées et sans jeu. Ce n'est pas un audit visuel complet de
chaque écran. Photos/variantes/consignes détaillées non proposées par ces données
ne sont pas inventées.

Transfert Table1→Table3 confirmé après avertissement explicite ; anciens QR
révoqués, GET bill227/403. Nouveau lien obtenu par la vraie UI de gestion, même
visite et addition9,70 retrouvées ; aucune vente ou débit au transfert. Double clic
sur le solde espèces fictif : une tentative, deux commandes finalisées, deux
provenances,9,70encaissés et0,30à rendre pour10reçus. Ensuite ancien lien : GET302/403
et tentative réelle POST330/403, message visible ; aucun nouvel ordre admis.

Défauts ergonomiques observés, non corrigés à ce point : référence technique de
table visible dans le portail, durée d'occupation héritée26h sur la nouvelle visite,
boutons de quantité sans libellé accessible, ancien QR encore affiché dans le
panneau de gestion après Actualiser tant que la table n'est pas resélectionnée.
Ils ne sont pas transformés en succès ni en défaut bancaire supposé.

## Validations techniques fraîches et travaux restant ouverts

-618tests backend,513Web,175POS réussis, zéro ignoré :1306unitaires distincts.
-354intégrations PostgreSQL,33fichiers, exécution15:43–15:44UTC, zéro échec/ignoré.
-79fixtures locales réussies ; RED de l'ajout du contexte conservé (11échecs).
-Cinq applications du profil métier compilées15:24–15:25UTC, graphe jeux0.

Ces résultats ne sont pas additionnés aux précédents1305/354/68. Répertoires et
rapports privés horodatés conservés ; une preuve consolidée finale sera produite
après les derniers contrôles. Une restauration finale et la qualification des
parcours de rôle restent à faire. Aucun nouveau SHA de publication à ce point.

## Complément final — rôles, montants, fermeture et restauration

Les informations précédentes sont le point15:55UTC, pas l'état final. Les six
profils Restaurant et les six Bar ont maintenant de vraies actions Chrome dans
des contextes distincts. Au Café, OWNER/SERVER reprennent le service existant ;
les autres profils gardent les preuves F18/L2 sans être recomptés comme L3.
**Aucun des18parcours complets n'est qualifié.**

Restaurant : ADMIN crée uniquement le nouveau créneau personnel23h–03h du18au19,
rechargé puis retrouvé en PG21h–01hUTC ; EMPLOYEE voit ce seul créneau et son
pointage, double entrée201/409 sans doublon, sortie200 et rechargement conservés.
ADMIN/EMPLOYEE refusés sur tableau CA ; tentative avec société Café non attribuée
403 puis retour Restaurant après retrait de l'en-tête. MANAGER voit58,20€du jour,
5commandes ; Robi local55,89€HT+2,31€TVA, sans confondre acompte et vente.
Les actions de gestion des droits sont désactivées pour ADMIN/MANAGER.

Bar : une caisse25€ouverte, service POS13,20€(2Pils25+1Tonic), acompte3€cash puis
solde10,20€(2,20cash+8carte déclarée). QR indépendant4,80€ puis3,60€, facture privée
8,40€ sans les13,20€de l'autre groupe. Paiement cash8,40€,10reçus/1,60rendus,
un seul POST au double clic. Cuisine réelle Commencer→Prêt→Servi, y compris pour
un ticket réglé avant sa préparation : pas d'annulation implicite ni second stock.

La fusion POS→QR à consignes globales différentes est **refusée409**, pas exécutée.
Le fichier privé `bar-merged-l3.json` est une observation après ce refus, non une
preuve de fusion. Aucun mouvement de table, montant ni lien QR modifié par ce refus.
Ne pas retirer les consignes ou affaiblir le garde pour obtenir un succès artificiel.
Après paiement, QR expiré GET857/403 et vrai POST891/403, panier non accepté.

Stock Bar : OWNER crée un ingrédient fictif distinct2L ; ADMIN ajuste à2,25L,
rechargement confirmé, sans coûts ; EMPLOYEE ne voit que la quantité. OWNER retire
temporairement sa lecture de quantité : ancien onglet refusé, puis droit initial
exact rétabli. Version2→3→4, deux décisions conservées, refus financier explicite
initial inchangé. Le refus UI après révocation n'est pas présenté comme un403
direct de l'API stock qui n'a pas été observé pour ce sous-cas.

Café : pas de nouvelle commande. Base relue, toutes les tentatives existantes
DECLARED, ancienne référence880c absente/rollback prouvé, solde courant10,05€ après
3€d'acompte. L'UI affiche13,05€total et10,05€restant ; règlement courant405cash+
600carte déclarée, demande `8c50f48a-e897-4492-b418-aeaa55871cd1`, POST69/200unique.
Rechargement/reconnexion : Table1 À nettoyer,0reste. Ce n'est **pas** un rejeu de
l'ancienne demande880c sous une autre clé ; la source initiale n'est pas modifiée.

| Société | Ventes finalisées ajoutées en L3 | TVA correspondante | Total cumulatif ventes/tenders (sources séparées) | Clôture espèces |
|---|---:|---:|---:|---|
| Café |13,05€ de5commandes préexistantes finalisées |0,85€ |34,15€ |50fond+7,05cash=57,05comptés,0écart |
| Restaurant |19,40€ de3nouvelles commandes |0,56€ |142,70€ |100fond+33,20cash=133,20comptés,0écart |
| Bar |21,60€ de3commandes/2ventes |2,29€ |59,64€ |25fond+13,60cash=38,60attendus,38,50comptés,−0,10motivé |

Les factures, avoirs, anciens remboursements, anciens tiroirs clôturés, anciennes
ventes réglées et acomptes monétaires sont comparés aux références de la copie.
Chaque diminution de stock produit correspond aux quantités des seules commandes
nouvellement réglées. L'ingrédient Bar n'est pas une recette automatique de Pils.

Dernier arrêt officiel16:48:36.664→16:48:36.748UTC : STOPPED sans forçage. PID25524
disparu, cinq ports libérés,0connexion PG ; HTTP/travaux/WS à0, files gelées et
minuteries arrêtées. Chrome reste actif ; seuls16onglets de cette recette ont été
fermés normalement. Anciennes instances14676/35556 et PostgreSQL38896 préservés.

Restauration finale dans **une nouvelle base** du cluster25450, pas une nouvelle
application active : `creorga_f18_recovery_verify_1792342145657`, répertoire
`final-restoration-z3u0xC`,82tables/21466lignes/14fichiers/26PDF, zéro différence.
Archivev2 `219ff8875eb9dfb2d81068dad6dff9a0ef038778a5af1397794a2f440bd456ad`,
preuve `6e3f52e3142f5861204b9a0658f1f6fc6d22f5c22ad6d230c2e10d572b903ea6`.
Chiffrement/déchiffrement AES-GCM, clé séparée, pas de purge/écrasement.

27copies récupérées vérifiées une nouvelle fois,30025952octets ;99blobs des jeux
vérifiés à962c01b, conservés dans l'histoire.98fichiers courants identiques ; le
seul changement du99e est l'import de façade HTTP de `gameScores.ts`, sa logique
étant égale au code original. Aucune désinstallation Windows ni modification du
raccourci. Son double-clic natif n'a pas été rejoué par un outil non autorisé.

## Comptage réel et limites de qualification

Préfixe du journal privé chaîné :3090événements toutes campagnes,486pour L3,
dont341tentatives d'interaction UI,338retours d'outil et3erreurs ;214appels de clic,
47remplissages,36navigations,17créations d'onglet,16fermetures normales,9saisies
texte et2touches. Une demande de double clic n'est ni deux transactions ni une
preuve de deux clics physiques. Observations HTTP/DOM et tentatives invalides
ne deviennent pas des actions métier PASS. Aucun pourcentage des3697contrôles.

Début de cette reprise15:13:43UTC ; fin des interactions vers16:48UTC. C'est une
fenêtre murale, pas cinq heures de tests actifs ; temps de tests, outils, lecture,
attente et documentation ne sont pas artificiellement additionnés.

Mesure ponctuelle du seul runtime16:45:32–16:45:47UTC :3fenêtres d'environ5s,
RAM192,05/192,05/192,06MiB, privée196,33MiB ; CPU normalisé machine0,182/0,103/0,052%.
Chrome/PG/anciennes instances exclus de cette attribution. Ni baseline comparable,
gain avant/après, GPU/VRAM, énergie, économie financière ou p95produit démontré.
Aucune optimisation transactionnelle supplémentaire sans profil comparable.

Restent ouverts : réservations/variantes depuis la caisse, remises/offerts et
séparations avancées par rôle, fusion à consignes différentes, intégralité des
permissions/exports/WS, anciens pointages Café ambigus, octets des téléchargements
non inspectables officiellement, matériel, prestataires bancaires et Robi génératif.
Le fond du reçu dynamique Bar derrière la confirmation affiche0après clôture,
alors que la confirmation8,40/1,60et le reçu canonique sont distincts : anomalie
UIà revoir, pas preuve d'une mauvaise écriture fiscale ou de papier imprimé.

Les limites de portail citées plus haut restent non corrigées. Prochaine action :
reprendre les sous-critères ouverts de la matrice sur la même copie arrêtée après
vérification officielle du dernier STOPPED, sans recréer les opérations prouvées.
[Preuve consolidée vérifiée](preuves/f18-l3-validation-2026-10-18.json).

## Registre de fin de lot, sans qualification de production

| Priorité | Constat et état | Prochaine action sûre |
|---|---|---|
| P0 reprise, historique | Anciennes instances14676/35556 bloquées, conservées ; nouvelle copie GREEN, pas réparation en mémoire des anciennes | Ne jamais forcer ni multiplier les copies ; toute intervention sur ces instances demande un cadre distinct |
| P1 corrigé | Drain HTTP permanent après abandon/compression, vrais callbacks/travaux suivis ; Chrome/PG GREEN bornés | Garder garde des callbacks opaques, tests et diagnostics ; étendre incidents sans banque |
| P1 corrigé | Ancienne cuisine web maquette remplacée par vrais tickets/permissions/CAS ; Café L2 et Restaurant/Bar L3 GREEN | Poursuivre conflits multi-serveurs et routage distinct sans préparation doublée |
| P1 parcours manquant | Fusion avec consignes différentes refusée sûrement mais parcours positif non livré | Décision explicite de routage/groupes, puis test RED et implémentation contrôlée ; ne pas effacer les consignes |
| P1 qualification |18parcours partiels, sous-critères argent/droits/exports non tous exécutés | Suivre les critères restants par rôle dans la matrice, ne pas conclure prêt au service |
| P2 corrigé | Notes POS perdues visuellement à réouverture ; F2/F3 préremplis et distincts | Non-régression14tests et contre-essai Chrome conservés |
| P2 ouvert | Ancien lien QR visible après Actualiser, référence technique table, durée héritée, boutons quantité non nommés, fond de reçu dynamique0après clôture | Reproduire chacun comme scénario distinct, test RED et correction UI sans nouvelle vente historique |
| P2 BLOCKED données | Deux pointages Café historiques ouverts | Revue humaine des données, aucune fermeture/nettoyage automatique |
| P2 couverture/outils | Octets téléchargés, détails de réservations/variantes, cas Robi étendus non qualifiés | Accès officiel aux preuves et parcours réellement disponibles ; pas de contournement |
| P3 / hors lot | Mesures comparables, mise à niveau Node, matériel, IA réelle | Études séparées ; aucun portage général ni changement global implicite |

Les refus sûrs ne sont pas des encaissements ratés, et les contrôles non exécutés
ne sont pas des anomalies reproduites. Aucun nouveau défaut de perte/double argent
n'est conclu dans les opérations rapprochées ; cela n'exclut pas un défaut ailleurs.

Raccourcis lus sans les activer par une méthode non autorisée : lancement SHA
`5c62aea646c4cef22305808d827b2c51165e7d8c9f72b7b17d2e205be27e0371`, arrêt SHA
`f05ab7a522148d5fd723e8a53ec02ee32896281644ab9a2830178568f1490511`.
Ils restent sur le profil default et n'ont pas été réécrits. Le raccourci ne
constitue pas une preuve que les anciennes instances bloquées sont réparées.
