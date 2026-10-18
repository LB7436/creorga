# F18-L2 — laboratoire séparé et poursuite réelle de la recette

État au 18 octobre 2026, 14:18 UTC. **Campagne NON LIVRÉE, pilote NON QUALIFIÉ.**
Branche `codex/creorga-2-0-2026-10-08`, HEAD local/distant revérifié
`ab0d735f60f01bbfd0c7f914a43c2b997f280e2e`. Correctifs ci-dessous encore locaux.
Master distant `350b35120f44d2508d863a3a73f644eb0aa6b141` inchangé.

## Autorisation, copie et isolation

Le propriétaire a choisi explicitement « Préparer une copie de laboratoire
séparée ». L'ancien runtime n'a pas été forcé, modifié en mémoire ou remplacé.
Ni ses profils Chrome ni ses données n'ont servi de nouvelle destination.

La copie privée `local-2.0-isolated-20261018-QLK3Mh` dispose d'un **nouveau cluster
PostgreSQL**, datadir et identifiants propres, port15450/base `creorga_f18_local`,
fichiers métier distincts et secrets de session neufs. Les clés prestataires sont
vides, SMTP local non configuré, IA générative indisponible. Les sorties réseau
JavaScript du runtime sont limitées aux nouveaux ports loopback ; ce n'est pas
une attestation de pare-feu OS. La destination du moteur Prisma natif est gardée.

| Service | Nouveau contexte seulement | Source conservée |
|---|---|---|
| API | `http://127.0.0.1:13002` | ancien3002, jamais réutilisé |
| Gestion | `http://127.0.0.1:15174` | ancien5174 |
| Caisse | `http://127.0.0.1:15175` | ancien5175 |
| Administration / portail dédié |15177 /15178 |5177 /5178 |
| PostgreSQL |15450, base et cluster distincts |5450, `creorga_local` inchangée par L2 |

Le QR testé est la route `/c` de la gestion, pas nécessairement l'app guest
distincte. Les contextes Chrome sont nouveaux et propres aux profils. Aucun
prestataire bancaire, e-mail reçu, IA cloud ou impression physique n'est qualifié.

La sauvegarde de départ a réellement été restaurée et comparée : **82tables,
19602lignes,14fichiers,26PDF**, zéro différence, achevée13:23:50UTC.
Archivev2 SHA `351b2e282802c3335526db31d8024a2f51dd514ad00a0c52d82efc0a4c45dd38`,
preuve privée SHA `cfb25592a74b33e8a00c861ec2ff42f20db8cf46776ae79e5eaed99087f77283`.
AES-256-GCM déchiffré/vérifié, clé à part. C'est une copie MVCC des données
commises avec fichiers stables, **pas** une preuve d'arrêt/vidange mémoire de la source.

Incidents d'orchestration conservés : deux répertoires de staging avant refus
réseau du bac à sable ; handle de sortie hérité de pg_ctl ayant retenu le wrapper
alors que le nouveau moteur était prêt ; garde attendant initialement `PASS` au
lieu du résultat réel `equal`. Identité du nouveau datadir/port vérifiée, puis
seule la comparaison/finition reprise. Aucun deuxième import, reset ou nettoyage.

## Profil et démarrage réversibles

Le contexte explicite `CREORGA_LOCAL_CONTEXT=f18-isolated` utilise les artefacts
`dist-business-f18-isolated` des cinq apps et leurs manifestes stricts. Le contexte
par défaut garde ses chemins et origines antérieurs. Le lanceur refuse contexte
inconnu, profil complet dans ce contexte, manifeste mélangé et autre base/port.
Le proxy utilise explicitement le port de cette seule API. Aucun jeu supprimé.

Premier lancement officiel :13:26:04UTC, PID28028, prêt en2850ms. Arrêt officiel
13:34:50UTC : **STOPPED**, puis disparition du processus vérifiée avant reprise.
Deuxième lancement officiel :13:35:40UTC, PID35556, prêt en2340ms. Rechargement
cuisine/QR et SQL concordants. Ces temps cache chaud ne constituent pas un RTO,
une comparaison de performance ou un gain énergétique.

Après le nouvel incident HTTP, l'arrêt14:01:45UTC est **NON CONFIRMÉ** :
`stage=http`, `reason=HTTP_WORK_UNTRACKED`. Au contrôle hôte autorisé14:17:53UTC,
les PID14676/35556 existent,3002/13002 restent LISTEN, les interfaces L2 sont
fermées. Une lecture sans droits suffisants retournait une liste vide : elle
n'est pas retenue comme preuve de disparition. Aucun kill ou relancement forcé.

## Vrais parcours Chrome supplémentaires

Ces résultats sont des critères bornés, **pas** des combinaisons complètes PASS.
Les numéros de requête sont locaux à la page. Les identifiants d'accès QR ne
sont pas publiés. Les lectures SQL sont complémentaires aux actions graphiques.

### Café OWNER — cuisine réelle

La cuisine web charge maintenant les vrais tickets. Le nouveau ticket F18 QRn°5,
déjà créé au lot précédent, est passé de reçu à préparation par double clic :
**un seul PATCH82/200**, message de confirmation, état visible puis rechargé.
Passages Prêt puis Servi réellement cliqués. Les anciens tickets non concernés
restent intacts ; aucune commande n'est recréée pour rejouer ce contrôle.
Comparaison SQL : seuls statut de préparation/date du ticket concerné changent,
pas ses montants, encaissements ou stock. Après reprise, ce ticket n'est plus
présent parmi les tickets à préparer. F18-C19 possède donc son contre-essai
graphique borné ; cela ne qualifie pas toutes les fonctions de préparation.

### Café client QR — nouveau panier, sans duplication

La visite F18 existante est réutilisée dans un contexte client indépendant.
Une **nouvelle commande distincte** d'une eau1,25€ est envoyée au double clic :
**un POST43/201**, commande n°9,125centimesTTC/121HT/4TVA. Le POST d'événement
client202 n'est pas une deuxième commande. Addition de cette visite :3,40€ ;
les9,30€ du groupe POS restent masqués. Après Nouvelle commande, le premier
Ajouter eau fonctionne ; ce panier temporaire n'est pas envoyé. Rechargement et
reprise du serveur ne créent pas de dixième commande. F18-C20 rejoué sur le binaire
corrigé. Paiement en ligne explicitement indisponible, aucun succès simulé en banque.

### Café EMPLOYEE — données quantitatives, pas de finances

Connexion POS réelle : huit capacités effectives, DTO bootstrap avec ventes et
clôtures vides, pas de CA ni de marges ni boutons financiers. Connexion gestion
distincte : URL directe tableau POS refusée, stock5,25kg visible sans coût ni
édition, planning personnel d'un seul salarié/créneau, administration utilisateurs
refusée. Déconnexion puis retour stock : redirection de connexion observée.
Les HTTP403 directs historiques restent distincts des gardes UI de ce passage.
Les deux pointages anciens ambigus n'ont pas été modifiés.

### Restaurant OWNER — ouverture de caisse

Après lecture de l'ancienne clôture conservée, ouverture d'une nouvelle caisse
fictive de100€. Double clic : POST182/201 puis183/200, **une seule CashDrawer**,
identifiant `9e8dca29-18cb-430c-8464-f9fc1689a67f`, ouverte13:42:03UTC.
Le texte saisi avec fill_form dans le textarea n'a pas atteint l'état React :
`notes=null` en SQL. Le fond est prouvé ; **la note n'est pas déclarée sauvegardée**.

### Restaurant SERVER — cinq lignes, acompte et solde interrompu

Table3 nettoyée puis ouverte pour deux couverts par vraies actions POS. Premier
groupe : soupe6,50 +plat18,90 +supplément2,00 =27,40€. Deuxième : vin5,30 +dessert6,10
=11,40€. Total38,80€. Après rechargement, la caisse exige une réauthentification
par conception ; les mêmes cinq lignes/deux couverts sont retrouvés.

Une note saisie par vrai clavier produit PUT291/200 et `FloorChange` en base.
Réouvrir NoteF2 montre pourtant un champ vide : défaut produit reproduit. Les
deux tentatives antérieures fill_form avaient changé le DOM sans déclencher
l'état React ; elles ne prouvent ni une sauvegarde réussie ni un défaut serveur.

Dans le mode « acompte/paiement partiel/solde », les cartes sont **déclarées
manuellement**, sans débit bancaire. Acompte10€ espèces au double clic : un
POST416/200,1000centimes affectés,28,80€dus, pas encore de nouvelle vente finalisée.
Puis solde28,80€ =8,80espèces +20carte déclarée. Le client recharge pendant
l'attente SQL réelle, avant réponse ; détails ci-dessous.

Reconnexion du même SERVER : **GET495/200** retrouve la même référence, sans
nouveau POST de paiement ; Table3 est « À nettoyer ». SQL avant/après récupération
identique pour ventes, affectations et stocks. Le toast transitoire et le corps
du GET n'ont pas été conservés dans une preuve abrégée exploitable ; ne pas les
inventer. Une lecture ultérieure a échoué après reconnexion de l'outil Chrome :
pas de réutilisation d'un ancien pageId ni de contournement.

## Abandon HTTP : preuve nouvelle, défaut encore bloquant

Référence `329ddd46-858d-488a-a03e-eff50cfcfa35` ; acompte antérieur
`5abdcd86-f105-47c2-851c-c6adaf26f70f`. Ne pas les remplacer par de nouvelles clés.

- Verrou de laboratoire acquis13:56:12.837UTC ; attente du POST réelle observée
  dans PostgreSQL13:56:34.050UTC.
- Rechargement Chrome avant réponse. Le verrou est automatiquement libéré8s
  après constat du waiter, à13:56:42.051UTC, avant expiration transactionnelle.
- Commit effectivement observé, puis récupération GET200 avec la même identité.
  Le libellé `pending` du transport abandonné n'est pas l'autorité comptable.
- Arrêt officiel14:01:45.123UTC refusé avec le diagnostic privé borné ci-dessus.

Cause logicielle **reproduite séparément** : un handler synchrone termine du JSON
compressé, mais le `end` natif est différé. `writableEnded=false` au retour faisait
marquer la requête opaque sur finish, durablement. GET floor-state synchrone est
un chemin réel correspondant ; les anciens tests utilisaient un GET async.
La requête exacte ayant empoisonné ce processus reste inconnue : le POST abandonné
n'est **pas** incriminé automatiquement par le diagnostic sticky.

RED exécuté :616/617 tests backend réussis, seul le nouveau cas sync+gzip échoue
avec HTTP_WORK_UNTRACKED. Correctif minimal dans `http-work.ts` : observer l'appel
synchrone à la méthode publique res.end pendant la pile du handler, puis restaurer
notre proxy sans écraser celui d'un middleware. Aucun finish/close tardif ne
prouve un callback opaque ; les tests de refus des callbacks opaques restent verts.
Pas de timeout plus permissif ni de retrait de transaction/CAS/durabilité.

Nouveau cas PostgreSQL : lecture de salle gzip, acompte60c, solde mixte200c
interrompu, arrêt coordonné, reprise/GET et rejeu de la même référence. Une commande,
une vente, un débit de stock, trois tenders50/60/150c, deux tentatives déclarées ;
nouvelle clé sur un solde réglé refusée409. Prestataires simulés, pas banque réelle.
Ce test est GREEN ; le **contre-essai du dernier correctif dans Chrome reste BLOCKED**.
Un fichier recompilé ne répare pas un processus déjà chargé/arrêté partiellement.

## Notes POS : autre correction RED→GREEN, Chrome encore requis

Note ticket et message cuisine sont désormais préremplis par la valeur existante.
Annuler abandonne une saisie même pendant l'animation de sortie ; les deux fenêtres
ont des clés distinctes par table/type pour éviter un mélange F2→F3 rapide.
Tests comportementaux réels React/Zustand/garde/bridge, seule frontière HTTP
simulée :14/14 ciblés, inclus dans175/175POS. Ce n'est pas une preuve Chrome/SQL
du nouveau binaire. Ne pas rouvrir ou recréer la vente Restaurant finalisée pour
ce contre-essai ; utiliser une nouvelle scène fictive identifiée si nécessaire.

## Rapprochement des nouvelles opérations

Restaurant : les anciennes lignes des douze modèles vérifiés (ventes, commandes,
tenders, tentatives, provenances, factures, avoirs, remboursement manuel, caisses,
mouvements et changements de salle) sont inchangées par identifiant/contenu.
Nouvelles opérations : deux commandes POS payées27,40/11,40, deux tickets de vente,
six tenders répartis entre deux tentatives, sept provenances, une caisse ouverte.

-38,80TTC =37,05HT +1,75TVA ; anciens84,50TTC conservés. Totaux bruts distincts
  commandes/tenders/tickets :123,30€, pas369,90€ de CA.
-18,80€ espèces déclarées et20€ carte déclarée ; fond100 → espèces théoriques118,80€.
  Comptage et clôture de cette nouvelle caisse **pas encore exécutés**.
-Stocks : soupe26→25, plat23→22, dessert18→17, vin39→38, supplément25→24 ; eau59
  inchangée. L'acompte n'avait rien débité, le solde n'a débité qu'une fois.
-Ancienne facture/avoir/remboursement et clôture inchangés, aucun document recréé.

Café : une nouvelle QR125c, aucune nouvelle vente finalisée, acompte3€ conservé,
**10,05€ dus** pour toute la table dont3,40€ pour la visite QR ; caisse53€ attendus,
non clôturée. Bar : baseline SQL uniquement dans L2, aucune nouvelle mutation ni
nouveau parcours graphique. Le total historique du Bar38,04€ reste une référence.

## Restauration finale réellement exécutée

13:23 est la restauration de départ, pas celle des nouvelles actions. Une autre
archivev2 est créée14:11:02–14:11:24UTC depuis la **copie L2 seulement**, chiffrée,
déchiffrée puis restaurée dans `creorga_f18_verify_1792332663965`, nouvelle base
du cluster15450. Aucun clean/drop/reset, aucune destination existante remplacée.

**82tables/20012lignes/14fichiers/26PDF égaux**, colonnes/lignes/empreintes comparées,
15factures+11avoirs, zéro PDF corrompu/empreinte incohérente, zéro différence.
Archive SHA `2db67b2322bcf83f889872c44ba53d6bdd942f771eff102dedc63998ef712052` ;
preuve SHA `9f9231860e6012362d1026a78d9ab9b211a9e2e470755b6f0682d9e06e3fcfa8`.
Durée22,429s cache chaud, **pas** RTO. Fichiers source stables avant/après ; SQL
MVCC commis égal. L'arrêt étant non confirmé, vidange des journaux mémoire **non
prouvée** : statut `RESTORED_EQUAL_NOT_GRACEFUL_SHUTDOWN`, pas « arrêt réussi ».

Les27dumps récupérés ont à nouveau leurs tailles/SHA vérifiés à14:17:26UTC :
30025952octets égaux, zéro suppression. Ce n'est pas27restaurations ni une
nouvelle récupération. Les deux anciens noms supprimés restent non identifiés.

## Validations finales et couverture

Sur806sources stables, empreinte
`5f921d057c03d93f0afad2b3fac043533f49e8ee153a47e4a0bce2911f37018e` :
**1305unitaires =617backend+513web+175POS**, **354PG**, aucun échec/ignoré.
Les68fixtures de lanceur sont séparées et ne sont pas additionnées aux unitaires.
Cinq apps métier isolées compilées14:14:10–14:15:50UTC, gameModuleCount=0.
[Preuve machine expurgée](preuves/f18-l2-validation-2026-10-18.json).
Rapprochement final14:27:16UTC : onze contrôles en lecture seule de cette preuve
avec rapports frais, octets/SHA, restauration, journal et27copies récupérées,
tous concordants. Une coquille de transcription d'un caractère du SHA du rapport
PG avait fait refuser ce rapprochement ; corrigée avant validation, aucun fichier
source de preuve altéré pour obtenir un succès.

Journal L2 chaîné vérifié à14:13:31UTC :157événements, **84interactions UI retournées
dont50appels de clic**,70observations dont68retournées/2erreurs. Quatre appels
demandent un double clic ; pas de décompte garanti des clics physiques. Les
157événements ne sont ni157fonctions PASS ni157contrôles T100 uniques. Le temps
d'outil309662ms et l'intervalle mural ne sont pas cinq heures actives.

Matrice F18 cumulée : **0PASS/8BLOCKED partiellement exécutés/10NOT RUN**.
Les deux profils Restaurant OWNER/SERVER ont progressé ; les quatre autres et
six profils Bar restent non exécutés dans ce lot. T01–T100 demeure55PASS/0FAIL/
44BLOCKED/1NOT RUN, T100 partiel,3697contrôles statiques inchangés.

## Blocages et reprise exacte

1. P0 recette : contre-essai Chrome du suivi sync+gzip, arrêt/reprise après abandon,
   puis restauration après arrêt réellement confirmé. Deux runtimes bloqués
   conservés ; nouvelle décision humaine demandée, pas de deuxième instance sur
   leur base ni de nouvelle copie active implicitement autorisée.
2. P1 notes : contre-essai du nouveau binaire, sauvegarde/annulation/réouverture
   ticket et cuisine, sans toucher à la vente finalisée.
3. Finir caisse Restaurant118,80€ théoriques et solde Café10,05€ **sur la copie
   choisie pour reprise uniquement**, mêmes références des paiements incertains.
4. Terminer les18combinaisons, QR Restaurant/Bar, permissions/managers/admin,
   exports d'octets, variantes, réservations, Robi et incidents restants.
5. IA générative, banque, matériel et captures/téléchargements officiellement
   inaccessibles restent BLOCKED. Les boutons Apple/GooglePay de l'ancien écran
   classique ont seulement été observés, pas qualifiés comme intégrations.

Le raccourci et le profil par défaut n'ont pas été modifiés ; leur nouveau double
clic natif n'est pas testé. Les jeux restent récupérables au commit immuable962c01b,
ancêtre du HEAD. Aucun nouveau commit/push F18, aucune modification de master,
production, profil historique ou opération réelle. Publication des correctifs et
livraison de la campagne restent deux décisions distinctes.
