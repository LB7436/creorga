# Droits fins, Robi et recette multi-établissements — 18 octobre 2026

**Campagne NON LIVRÉE ; pilote NON QUALIFIÉ.** Le code correctif validé est publié sur la seule branche `codex/creorga-2-0-2026-10-08` ; cette publication n'est pas la fin de la recette. Base vérifiée : `976b21a500f58d09fdca33616a9c243a66ae5161`. Aucun déploiement, changement de master, encaissement bancaire, purge ou ouverture de profil historique.

**Publication vérifiée :** code
[`f136bdd72c32405e955f1dbdf9655162a9d5aa34`](https://github.com/LB7436/creorga/commit/f136bdd72c32405e955f1dbdf9655162a9d5aa34),
PC et branche distante identiques au relevé après push. Le complément de checkpoint
est documentaire ; ces références distinguent le code testé de son compte rendu.
Master distant reste `350b35120f44d2508d863a3a73f644eb0aa6b141`. Pas de qualification
GitHub Actions déduite du push, le workflow ne cible pas la branche2.0.

**Code correctif validé, campagne partielle.** Les suites finales ci-dessous incluent
le drain HTTP et les derniers correctifs d'inventaire. Les preuves de08:38 restent
dans l'[instantané antérieur au drain](preuves/droits-robi-avant-drain-2026-10-18.json).
Après disparition de l'ancien PID13784, constatée après l'annonce de fermeture de Chrome,
deux nouveaux cycles officiels ont confirmé STOPPED avec trois onglets ouverts,
PID disparus et ports libres. Aucun processus n'a été coupé par l'agent.
La publication du code ne qualifie pas les parcours encore non exécutés.
Le geste Windows du propriétaire et la causalité exacte de cette disparition
n'ont pas été observés ; le navigateur a signalé une reconnexion/un redémarrage.

## 1. Ce qui a été implémenté

Les décisions d'accès portent sur **32 capacités d'une adhésion société active**, pas sur un nom de rôle supposé suffisant. Le calcul est commun aux middlewares, aux gardes des opérations et au contrat envoyé aux interfaces. Une panne PostgreSQL, une adhésion inactive, un rôle inconnu ou des variantes invalides échouent sans attribution d'un rôle propriétaire.

| Capacité par défaut | OWNER | ADMIN métier | MANAGER | SERVER | CASHIER | EMPLOYEE |
| --- | --- | --- | --- | --- | --- | --- |
| CA, coûts, gestion financière | Oui | Non | Oui | Non | Non | Non |
| Lire quantités et catalogue | Oui | Oui | Oui | Oui | Oui | Oui |
| Ajuster stock / modifier prix | Oui | Oui | Oui | Non | Non | Non |
| Consulter service | Oui | Oui | Oui | Oui | Oui | Oui |
| Modifier commandes / encaisser | Oui | Non | Oui | Oui | Oui | Non |
| Remises / offerts / annuler / rembourser | Oui | Non | Oui | Non | Non | Non |
| Ouvrir et clôturer caisse | Oui | Non | Oui | Non | Oui | Non |
| Factures / exports | Oui | Non | Oui | Non | Non | Non |
| RH équipe / gérer et publier planning | Oui | Oui | Oui | Non | Non | Non |
| RH personnel / planning personnel | Oui | Oui | Oui | Oui | Oui | Oui |
| Paramètres société | Oui | Oui | Oui | Non | Non | Non |
| Administrer les droits | Oui | Non | Non | Non | Non | Non |
| Robi | Données autorisées uniquement pour chaque profil, même si le panneau est visible. | idem | idem | idem | idem | idem |

Ce tableau regroupe des capacités distinctes : par exemple voir les quantités ne donne pas accès aux coûts ; voir une facture ne suffit pas à exporter les finances. `CASHIER` donne les opérations de caisse autorisées au niveau société : **ce n'est pas un cloisonnement individuel « son tiroir »**. L'alias historique WAITER conserve le contrat SERVER. OWNER ne confère aucun privilège de plateforme. Le client QR n'a aucune adhésion interne : son contrat reste limité au menu public et à sa visite.

Les noms exacts sont dans `apps/backend/src/lib/business-permissions.ts`. Les variantes explicites sont enregistrées dans `UserCompany.capabilities`, avec `accessVersion`. La révision SHA inclut société, utilisateur, rôle, version et capacités. `BusinessPermissionEvent` conserve auteur, motif et avant/après. La délégation est plafonnée aux droits de l'auteur ; concurrence et versions périmées donnent un conflit au lieu d'écraser une décision. Propriétaire courant et dernier propriétaire actif sont protégés. Aucun salarié historique n'a été automatiquement promu.

L'API relit l'adhésion à l'admission ; les transactions critiques et retours Robi
ont les révalidations décrites ci-dessous. L'interface surveille les droits toutes
les cinq secondes et au retour de focus ; le refus403 invalide immédiatement son
scope sans rejouer l'action. Ce n'est pas une promesse de retrait visuel instantané
de toute donnée déjà affichée : le contre-essai Bar observe le retrait après
quelques secondes. Aucun système ne peut faire oublier une donnée déjà lue.

Migration **additive** `20261017220500_business_capabilities`, appliquée uniquement aux deux bases du laboratoire : deux colonnes et journal avec contraintes/relations. Les erreurs initiales de génération Prisma et d'instrumentation ont été conservées ; elles ne deviennent pas des PASS.

## 2. Défauts corrigés et contre-essais

| Priorité / défaut reproduit | Correction | Preuve et limite |
| --- | --- | --- |
| P0 : EMPLOYEE voyait le CA POS du Bar malgré le refus de caisse | Projection serveur limitée, gardes pages/actions, caches par identité/société/révision | Chrome : autorisation financière temporaire explicite puis retrait audité ; ancien Journal masqué, nouvelle connexion sans Journal ni CA. Événements 1968–1969 ; PG version 2 et 4 décisions Bar. |
| P0 : sauvegarde salle admise avant révocation mais en attente du verrou | Relecture de l'adhésion après verrou financier, verrou partagé conservé jusqu'au commit | 19 intégrations salle, dont révocation concurrente réellement en PG. Aucun statut d'UI déduit du test. |
| P0 : import de plan pouvait injecter/remettre des remises ou offerts | Comparaison des droits sur ancien et nouveau contenu, lignes actives, provenance et appareil | RED puis GREEN, 54 tests salle ; documents et ventes historiques non réécrits. |
| P0 : Robi pouvait retourner/mettre en mémoire une réponse après révocation pendant une attente | Révalidation après PG et fournisseur, avant mémoire/cache/réponse ; révision d'admission immuable | 102 ciblés et 16 PG, dont révocation, réattribution, désactivation et changement de société. Fournisseur simulé seulement. |
| P1 : planning EMPLOYEE/ADMIN en boucle 403, démontage et remontage | Hooks conditionnés aux droits vivants, résultats tardifs masqués, refetch manuel gardé et annulable ; palette chargée seulement ouverte | RED réel : milliers de requêtes et interface refusée. GREEN Chrome : planning personnel limité, équipe ADMIN sans coûts, pas de requêtes factures/clients interdites en fond lors des observations. Pas un test de charge prolongée. |
| P1 : refus Robi disparaissait lors de l'invalidation de session métier | Notification globale générique sans contenu serveur privé, aucune répétition automatique | Chrome 2033 : message visible ; POST agent 18945/403 observé. Tests transport 16/16. |
| P1 : « journée en cours » affichait aussi les ventes anciennes non archivées Z | Périmètre explicite, dates complètes Europe/Luxembourg, distinction journal/CA civil/tiroir | Chrome 2095 : Café 21,10 / 1,07 / 4 ventes du 17 octobre visibles le 18. Aucune clôture ni vente créée pour le test. |
| P2 : suggestion Robi disparaissait sans action métier avérée | Navigation interne et droits validés, alerte conservée ; intent opaque désactivé, motif visible ; seul Ignorer masque | 37 ciblés et typecheck ; revue indépendante lecture seule. **Pas de rejeu Chrome de chaque variante de CTA.** |
| P0 : données de feedback globales et publication live trop détaillée | Feedback historique en quarantaine 503 ; canal public limité aux invalidations ; tâches globales dangereuses désactivées | Fichiers conservés. Tests ciblés ; WebSocket exhaustif et migration du feedback non qualifiés. |
| P0 : lecture des quantités exposait aussi le fournisseur imbriqué malgré le refus de sa route | Sélection PostgreSQL et projection retirent la relation sans lecture des coûts ; identifiant technique conservé | RED82/83 puis GREEN83/83 ciblés ;9PG. Aucune modification des ingrédients existants. |
| P1 : inventaire chargeait fournisseurs/commandes sans droits et pouvait afficher un coût absent comme zéro | Lectures par vue/capacité ; stock limité en consultation, coûts inconnus explicites, écritures et réponses bornées au scope courant | Composant réel/intercepteurs : RED12échecs attendus puis13/13GREEN ; TypeScript0. Chrome ADMIN/EMPLOYEE Café :5kg sans coût ni fournisseur ; OWNER :18/unité et90 estimés ; aucune donnée créée. |
| P2 : lien Commandes visible mais mauvaise garde pour un droit coûts seul | Route réelle /inventory/commandes associée à finance.costs.read, pas au fallback quantités | Deux RED par RequireAuth réel, puis16/16GREEN ciblés. Chrome EMPLOYEE refusé, OWNER voit le bon reçu63,00 ; profil coûts-seuls testé techniquement, pas connecté spécialement. |

**Compatibilité restrictive assumée :** en autorité fichiers historique, les mutations HTTP sont refusées `503 FLOOR_AUTHORITY_REQUIRED` avant les effets métier ; les fichiers restent lisibles et intacts. Pas de migration automatique, seed ou adoption silencieuse. La sauvegarde de salle du laboratoire utilise PostgreSQL et a été rejouée par vrai clic, PATCH 1993/200, notification puis rechargement. Les contrôles de rôle ne sont pas tous révalidés sous verrou dans chaque ancien service du produit : ne pas extrapoler la couverture aux parcours non exécutés.

### Arrêt HTTP : correctif borné et limite conservatrice

Les tests isolés ont reproduit les préconnexions TCP vides, les en-têtes incomplets,
les longpolls, les pipelines mélangeant HTTP métier/Engine.IO dans les deux ordres,
les refus503 en file et l'upgrade concurrent. Les pipelines simultanés mixtes sont
refusés avant admission de la seconde requête ; le keepalive successif et les
pipelines métier restent acceptés. Le drainage ferme d'abord les transports Engine.IO,
attend les réponses admises, puis ferme Socket.IO/HTTP. Aucun délai augmenté,
aucun patch des internes Express, aucun arrêt forcé d'un processus.

**19/19 tests ciblés** passent sur Node22.19 et22.23.3 portable, après RED conservés,
avec compilation TypeScript portable0. Deux cycles du runtime réel avec trois
onglets ouverts ont ensuite réussi ; cela ne qualifie pas toutes les pannes.
**Limite explicite :** tout abandon prématuré d'une réponse HTTP hors
Engine.IO, même un GET et même avant la demande d'arrêt, mémorise une incertitude
pour cette instance. L'arrêt ne peut alors être annoncé confirmé ; aucun audit de
fin ni déconnexion de base ne sont exécutés. Une fin tardive de réponse ne lève pas
cette incertitude. La reprise après ce cas reste à qualifier, sans kill ni abandon
de travail métier admis. Ce comportement fail-closed n'est pas une garantie de
fermeture réussie après toute panne réseau.

## 3. Robi : fonctionnel localement, fournisseur réel non qualifié

Le mode **« Lecture métier locale (sans IA générative) »** interroge PostgreSQL dans la société et selon les permissions admises. Ce n'est pas un modèle cloud simulé présenté comme réel.

| Question / profil | Résultat réellement observé |
| --- | --- |
| Bar OWNER, CA du jour le 18 octobre | Lecture locale 0 EUR / 0 commande du jour, cohérente avec les ventes conservées du 17 octobre. |
| Bar EMPLOYEE sans finances, même question | HTTP 403 et notification générique visible, pas de montant retourné. |
| Bar EMPLOYEE, produits en rupture | Chrome 2050 : aucun produit actif à stock suivi en rupture ; lecture locale explicitement annoncée. Le stock ingrédients est distinct. |
| Bar EMPLOYEE, qui travaille ce soir | Chrome 2068 : seulement ses propres créneaux, aucun ce 18 octobre 18:00–00:00 ; pas d'affirmation de présence réelle. |
| Retrait de permissions pendant attente PG/fournisseur | Tests PG et fournisseur simulé : rejet, pas d'écriture mémoire ni de réponse privée tardive. Pas une coupure réseau bancaire. |
| Fournisseur génératif réel, synthèse libre des ventes Restaurant | **BLOCKED** : aucun fournisseur autorisé et opérationnel configuré. Contrats/isolation simulés testés ; aucun contenu client envoyé au cloud. |

Le contexte ne fait plus dépendre toute lecture de factures/dépenses du droit CA ; les questions génériques d'une page comptable restent volontairement plus restrictives. `/workflow` reste en quarantaine 503, non annoncé comme action accomplie. PDF : budget utilisateur 25 s, limite 10 Mo ; le chemin photo ancien conserve son délai historique et n'est pas qualifié par extrapolation. L'ancien historique est conservé mais inaccessible quand sa révision n'est plus admise. Ni OCR réel, analyse d'image par fournisseur, ni voix/microphone ne sont qualifiés par ce lot.

## 4. Trois établissements existants, aucun doublon créé

Les cinq identités existantes de chaque société ont été conservées. Des changements **explicites par UI**, avec motif, ont attribué SERVER au compte service et ADMIN au compte limité (deux décisions Café, deux Restaurant ; quatre Bar avec essai d'autorisation/retrait CA). Les cinq profils internes ont été connectés et ont des observations ciblées dans chaque établissement. Cela **ne constitue pas cinq recettes de rôle intégrales**. Le client QR n'a pas été rejoué de bout en bout dans ce lot ; les anciens tests et visites révoquées restent historiques, non recréés pour gonfler la couverture.

| Société | Observations UI nouvelles | Réconciliation finale inchangée |
| --- | --- | --- |
| Café | OWNER droits/salle ; ADMIN planning sans coûts + factures refusées ; MANAGER planning et Journal daté ; SERVER POS sans CA ; EMPLOYEE planning personnel | 4 ventes : 21,10 TTC = 20,03 HT + 1,07 TVA. 10,25 d'avoir et remboursement déclaré restent distincts ; clôture 106,85 attendu / 106,80 compté. |
| Restaurant | OWNER facture existante 31,50 + demande PDF ; ADMIN planning sans coûts et rôles non modifiables ; MANAGER planning/coûts autorisés ; SERVER POS ; EMPLOYEE planning personnel | 4 ventes / 5 commandes payées : 84,50 = 81,42 + 3,08. Avoir/remboursement 6,10 conservés ; caisse 276,10 / 276,05. |
| Bar | OWNER autorisations/révocation et Robi ; ADMIN planning nuit sans coûts ; MANAGER droits en lecture ; SERVER POS ; EMPLOYEE refus CA, stock/Robi/planning et mobile 390 px | 3 ventes : 38,04 = 34,17 + 3,87. Espèces 19,00 / carte déclarée 19,04 ; caisse 119,00 / 118,90. |

Relectures finales strictement read-only : les **six empreintes** documents, devis, lignes, commandes, stocks et règlements restent identiques à l'avant. Aucun remboursement/vente/facture/compte/société recréé. Le groupe des **deux pointages ouverts historiques Café** est conservé ; ce défaut ancien n'est ni réparé en supprimant, ni ignoré.

## 5. Validation du code figé

[Agrégat et empreintes](preuves/droits-robi-validation-2026-10-18.json). Les quatre suites finales ont la même empreinte source Windows `127fa535ef8844e11c549ac5a3bf719393b0763028305c3c285ea67175002211` (791 fichiers), source stable, 0 échec, 0 ignoré :

| Exécution fraîche du 18 octobre UTC | Résultat |
| --- | --- |
| backend 09:32:49–09:33:26, 66 fichiers | 587/587 unitaires |
| web 09:32:47–09:33:33, 49 fichiers | 435/435 unitaires |
| POS 09:32:48–09:33:04, 14 fichiers | 161/161 unitaires |
| PostgreSQL 09:32:49–09:35:06, 32 fichiers | 348/348 intégrations sur creorga_tests |
| Fixtures locales, 09:37:57–09:37:59 | 47/47, lanceur/origines/fixtures de sauvegarde ; pas un double clic Windows |
| Profil métier, 09:33:44–09:35:28 | 5 applications compilées,103,514s, zéro module jeu dans le manifeste métier |
| Profil complet, 09:36:16–09:37:43 | 5 applications compilées,87,365s ; non démarré |

Total unitaire **1 183**, pas additionné aux anciennes suites ciblées ni aux47fixtures locales. Les essais sandbox EACCES/EPERM et la fixture POS historique en autorité fichiers ont réellement échoué ; sorties conservées. La fixture POS a ensuite été migrée vers une autorité PG fictive explicite, avec assertions financières inchangées et sans accepter artificiellement 503. Un essai web 420/420 pendant une édition de typage est marqué SOURCE_CHANGED_DURING_RUN et **n'est pas la preuve finale**. Les suites587/433/161+348 précédant le dernier mapping de route sont aussi conservées, sans être ajoutées au total final.

Les tests techniques ne sont pas des parcours Chrome. Le journal privé chaîné est vérifié : **341 événements de ce lot,223 tentatives UI/221 retours/2 erreurs ;80 opérations clic/79 retours/1 erreur**. Ce ne sont ni223contrôles uniques ni79parcours qualifiés. Les contrôles de stock/reprise postérieurs au build sont repérés2116–2151 ; les observations précédentes restent datées à leur exécution. Les autres erreurs incluent le refus PDF2102 et la capture fichier2144. SHA du journal `276ebe4fd92bc00806e383f81e9f016975d432f303565266cd04b75d18cd5984`. La somme des durées d'appels d'outil(1102319ms) **ne mesure pas le temps actif de recette** ; aucune durée de cinq heures ni couverture unique de3697 déduite.

Reproduction sur le laboratoire privé configuré : `node ../local-2.0/intensive-20261017/validate.mjs backend-unit`, `web-unit`, `pos-unit`, puis `integration --integration-reviewed`. Ce wrapper neutralise clés et services externes, restreint le réseau loopback et exige creorga_tests. Il est privé, non livré comme script utilisable sur une base inconnue. Reproduction standard du dépôt : scripts de test des manifestes backend/web/POS, uniquement après configuration d'une base fictive et des services neutralisés.

## 6. Sauvegardes, ressources et exploitation Windows

Nouvelle copie finale après le second arrêt confirmé : **18 octobre09:47:14.564UTC**, archivev2 avec dump natif, AES-GCM déchiffré/contrôlé, clé séparée. Nouvelle base créée, **82 tables /18 997 lignes /14 fichiers /26 PDF /8 événements de droits**, mêmes empreintes, zéro écart. Durée mesurée23,954s, cache chaud, **pas un engagement RTO**. Archive SHA `f88bf3e0048876104b7575375d5d62f17b625d9dfd5a164538be6fcb2c91efee`. Les copies finales v1 et v2 du même jour sont aussi conservées. Les48lignes supplémentaires depuis v2 ne sont pas48ventes : les six empreintes financières/stock restent identiques.

Les **27 dumps récupérés** ont encore leurs tailles et SHA attendus, index SHA `0a966a2baac58179529017d6d7af2344e9cb1e0aa4131ea09176e511805b1358`. Ce contrôle n'est pas 27 restaurations. Les deux noms de dumps anciennement supprimés restent non identifiés. Gel de toute suppression automatique inchangé, aucune archive supprimée.

Raccourci Bureau existant vérifié en lecture seule : cible PowerShell et lanceur officiel métier, SHA `5c62aea646c4cef22305808d827b2c51165e7d8c9f72b7b17d2e205be27e0371`. Pas de double clic natif attesté. Après les deux échecs historiques et la disparition observée de l'ancien processus après l'annonce de fermeture de Chrome, nouveaux démarrages officiels09:38:15(3,127s) et09:44:51(3,404s), PG/cache chauds. **Deux arrêts propres confirmés**, PID31284 puis1644 absents et cinq ports libres aux contrôles09:44:32 et09:45:59UTC, les trois onglets de recette étant restés ouverts. Le stock5kg, le refus EMPLOYEE et le bon reçu63,00 ont été rechargés après reprise. Le code ne garantit pas l'arrêt après un abandon HTTP incertain décrit plus haut. Aucun kill ; seules les trois pages isolées de recette ont ensuite été fermées par l'outil officiel. Profil arrêté en fin de contrôle, PostgreSQL conservé.

Repos : 11 échantillons avant et après, services du profil + descendants + PG, navigateur non inclus : working sets moyens **1 438,43 → 1 327,90 MiB**, maximum de processus **31 → 23**, CPU normalisé arrondi **0 %** et somme des moteurs GPU **0**, allocation GPU dédiée exposée **118,24 MiB** aux deux relevés. **Nombre d'onglets différent, redémarrage et cache chaud : aucune causalité ni gain énergétique démontré**. Pages partagées potentiellement comptées deux fois. Deux sauvegardes UI inchangées de la même table : **35,6 et 29,8 ms, un échantillon chacune**, ni p95 ni comparaison valable avec l'ancien lot à 2,42 s. Charge et profil SQL prolongés NOT RUN.

Les jeux sont intacts : 43 définitions / 40 chargeurs / 16 sélectionnés / **99 fichiers, 2 555 081 octets**, récupérables dans le commit immuable `962c01b2767a06db510c6b0aa3e22d521da77534`. Le retour au profil complet n'autorise aucune purge ni migration. Aucune désinstallation Windows.

Node global reste22.19.0. Node officiel **22.23.3 portable** : ZIP et exécutable contrôlés par SHA, essais isolés, dont102ciblés Robi puis19ciblés drain HTTP et typecheck serveur ; pas d'adoption globale ni de validation exhaustive. [Version officielle](https://nodejs.org/en/blog/release/v22.23.3) ; des correctifs HIGH sont [annoncés pour le21octobre](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), pas déclarés disponibles ou qualifiés le18. Aucun portage Rust/Go : aucun profil CPU ne démontre un bénéfice nécessaire.

## 7. Registre restant et prochaine action

| Priorité | État / action |
| --- | --- |
| P0 sécurité des droits corrigés ci-dessus | Non-régressions ciblées et PG réussies ; continuer le tour complet des routes/fichiers/WS et révocations par rôle, sans généralisation. |
| P1 exploitation | Deux nouveaux arrêts/reprise contrôlés réussis, après correctif. Reprise d'une instance ayant mémorisé un abandon HTTP incertain non qualifiée ; pannes prolongées/électricité restent à tester, pas de kill de secours. |
| P1 recette | Six profils × trois sociétés pas intégralement parcourus. QR, réservations, variantes, stock avancé, exports et panne réseau complète restent à exécuter sur l'existant. |
| P1 téléchargements | Clic PDF A4 Restaurant et HTTP 200 observés ; outil officiel a refusé l'inspection détaillée pour risque inacceptable. **BLOCKED : aucun contournement, aucun fichier téléchargé déclaré vérifié.** Les 26 PDF en PG/restauration ne prouvent pas les octets du téléchargement Chrome. CSV reste non inspecté. Revalider l'origine/les capacités autorisées dans l'outil officiel avant reprise ; ne jamais désactiver la protection. |
| P2 preuve graphique | Capture de stock refusée2144 : chemin hors racines configurées par l'outil officiel. Aucun fichier PNG attesté, aucune tentative de chemin alternatif pour contourner ; snapshots textuels conservés. |
| P1 fournisseur/matériel | IA réelle, banque, PayPal réel/sandbox autorisé, imprimantes, tiroirs et coupures physiques BLOCKED faute de qualification ; Stripe Refunds et vidéo désactivés. |
| P2 migration | Feedback, sauvegardes client intersociétés, tâches proactives historiques et workflow non qualifiés/en quarantaine. |
| P2 données historiques | Deux pointages ouverts Café conservés ; correction métier explicite à instruire, pas nettoyage. T04 profils anciens non ouverts. |
| P2 validation distante | Le workflow CI présent ne cible que master/qa et les pull requests. Ce push de branche2.0 n'est donc pas une exécution GitHub Actions attestée ; les chiffres de tests sont locaux, pas un feu vert CI distant. Aucun déploiement présent dans ce workflow ni déclenché par cette mission. |
| P3 ergonomie constatée | Le guide du profil neuf contient encore « Skip tour ». Le « €850 » de la carte Factures est un texte d'illustration SVG, pas une donnée du Café ni une fuite de CA ; son aspect peut prêter à confusion. Non corrigés dans ce lot figé. |

[Matrice complémentaire T100](T100-DROITS-2026-10-18.md), rapports Café/Restaurant/Bar et checkpoint mis à jour. Référence globale inchangée **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN** ; les FAIL historiques étroits et leurs GREEN ultérieurs restent dans les preuves, pas effacés. Les skills d'audit des parcours, de diagnostic RED→GREEN, de revue indépendante et de vérification avant publication ont servi à isoler les corrections, conserver les échecs et ne pas confondre simulation, code testé et usage réel qualifié.
