# Recette établissement C — BAR DES AMIS

## Suite ciblée du 18 octobre — PARTIELLE, NON LIVRÉE

Le défaut CA visible à EMPLOYEE ci-dessous a son contre-essai actuel : autorisation
temporaire explicite puis révocation UI/audit, ancien Journal masqué et nouvelle
connexion POS sans CA ni Journal. Aucun montant historique effacé. OWNER, ADMIN,
MANAGER, SERVER et EMPLOYEE existants connectés ; pas tous les parcours des rôles.
ADMIN voit le planning nuit sans coûts, EMPLOYEE seulement ses créneaux. Le cycle
global403/remontage du planning a été reproduit puis corrigé et rejoué. Mobile390px
observé, pas qualification tactile/contraste intégrale.

Robi : OWNER CA du18octobre0 cohérent avec ventes du17 ; EMPLOYEE CA403 avec
message visible, stock et planning personnel en lecture locale explicitement
sans IA générative. Fournisseur réel **BLOCKED**, pas de contenu envoyé au cloud.
CLIENT QR non rejoué intégralement dans ce lot ; anciennes visites préservées.

PG final : **3 ventes/38,04TTC =34,17HT +3,87TVA**, espèces19 et carte déclarée19,04,
stocks96/79/58/19 et clôture119/118,90 inchangés. Six empreintes égales. Quatre
événements de droits conservés, aucun compte/vente/remboursement recréé.
[Preuves](preuves/droits-robi-validation-2026-10-18.json),
[rapport](DROITS-FINS-ROBI-RECETTE-2026-10-18.md). Arrêt runtime et campagne restent
non qualifiés, aucun paiement bancaire ou essai matériel réel.

## Consolidation technique postérieure aux rejoués de 21:30

Les [preuves finales v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json) confirment **861 unitaires / 295 PG / 47 fixtures locales** et les deux builds finaux, cinq applications chacun. La restauration réalisée à **21:31:36.908 Luxembourg** inclut la copie postérieure à ces ventes/clôtures : **81 tables, 10 083 lignes, 14 fichiers et 26 PDF**, mêmes empreintes, zéro différence. **X02 devient PASS ciblé**, sans effacer les états précédents ni transformer l'audit en qualification de production.

Le GREEN QR/MIME et les clôtures fictives ci-dessous ne valident toujours **ni CSV téléchargés non inspectés, ni capture PNG non attestée, ni droits fins absents, ni Robi métier 503, ni banque/terminal/imprimante réels**. Le CA visible à l'EMPLOYEE reste une limite du contrat « sans finances ». Cinq heures actives non attestées ; **recette partielle, campagne NON LIVRÉE**.

## Complément GREEN ciblé — 17 octobre 2026, 21:30 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** MANAGER rejoue réellement les tickets QR #2/#3 en KDS **Commencer → Prêt → Servi**, puis un acompte cash fictif **5 EUR** au double clic : **POST pos/payments 580/200**, accès QR encore actif, **8,20 EUR restant**. PG affecte **3,64 + 1,36 = 5,00**, sans créer de vente finalisée ou débiter le stock QR prématurément.

Le solde **8,20 = 4 cash + 4,20 carte déclarée** est validé au double clic, **POST pos/payments 598/200**. Les deux commandes deviennent PAID/served, visite fermée et accès révoqué : ancien QR **1097/403**, puis encore **1154/403** après création via UI d'un groupe neuf. Le nouveau contexte client obtient **GET bill 19/200**, addition visible **0** ; aucune capacité n'est publiée.

Le relevé `bar-cloture-conge-nuit-final-1.json`, **19:28:23.651 UTC**, confirme **3 Sale / 3 Order**, **38,04 TTC = 34,17 HT + 3,87 TVA**, cash **19,00** + carte déclarée **19,04**, stock **96 / 79 / 58 / 19**. OWNER compte et clôture avec justification (**PUT close 453/200**) : **119,00 attendu / 118,90 compté / −0,10 motivé**, clôture à **19:26:35.752 UTC**, retrouvée après reload. Le CSV est demandé mais **non inspecté**. SHA des octets du relevé : `bd90cdccd5e5190191e0e51a5b70a151a383cd6c7e9169c303d51742b4252a83`.

La nuit est **réellement republiée dans Chrome**, page 7 **POST publish 405/200** ; nouveau MIME de **3 478 octets**, SHA `d58aab9d52d30a8afcc63a1bc2243ad295268485fe4e268d1633e6f3ca1195ef`, tous checks vrais, fin **03:00 (18/10/2026)** explicite. **C04 devient PASS ciblé**, ancien C03 RED conservé. Pas de réception Zoho ni de libellé de fuseau imprimé attestés. OWNER approuve le congé unique (**PUT status 419/200**) ; même statut APPROVED après reload employé.

Huit suggestions Robi métier sans jeux sont réellement vues en page 13 ; **cela ne qualifie pas Robi métier, toujours 503 et non rejoué**. Le compte surnommé « sans finances » reste EMPLOYEE : **CA 38,04 visible au POS dashboard**, malgré les refus caisse **GET 230/403 et 235/403**. L'ACL fine demandée demeure absente, pas de PASS « aucune finance ».

Une tentative de capture a été notée **INSTRUMENTATION_NOT_VERIFIED** après refus lexical de journalisation et fichier non trouvé : **aucun PNG réussi attesté**. Les [preuves de traçabilité](TRACABILITE-UI-API-PG-2026-10-17.md) ne substituent pas cette capture aux vrais clics/HTTP/PG. Restauration finale encore attendue, CSV/matériel/banque/droits fins non qualifiés ; T100 et tous les rôles restent partiels, campagne NON LIVRÉE.

## Point de progression — 17 octobre 2026, 21:00 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Coupure des actions **19:00:00 UTC**. Les preuves HTTP relues ensuite, sans nouveau clic, complètent les requêtes déjà enregistrées : [métadonnées publiques expurgées](preuves/intensive-http-cibles-2026-10-17-2108.json). Elles ne déplacent pas la coupure et ne sont pas des envois supplémentaires.

- OWNER : nuit **17 octobre 23:00 → 18 octobre 03:00 Luxembourg**, quatre heures, section Bar, **1 Shift CONFIRMED** ; **POST shifts 298/201**, **publish 306/200**, page 7. La capture MIME confirme société/destinataire/rôle/section/heures mais **n'explicite pas la date de fin de la nuit**. L'EML original reste RED ; correction source, mais **nouvelle publication UI/MIME GREEN non qualifiée** à la coupure.
- EMPLOYEE dit « limité » : demande de congé du **24 octobre**, double clic puis reload ; **un POST leave-requests 163/201**, page 10, **un VACATION PENDING** en base. Aucun rôle fin distinct ni approbation n'en est déduit.
- Cinquième EMPLOYEE dit « sans finances » : connexion indépendante, **HACCP CLEANING / MANUAL / value NULL**, **POST haccp/logs 55/201**, page 13 ; rechargement effectué, auteur membre de la bonne société. Aucun capteur ni mesure inventés, aucune ACL financière fine créée.
- Client QR de Table 2 : nouvelle visite/lien, contexte mobile distinct ; double clic première commande **2 pils 25 cl = 9,60 EUR**, puis tonic **3,60 EUR**. **POST guest/orders 118/201 et 303/201**, page 12 ; les événements client **119/202 et 304/202 sont de la télémétrie**, pas des commandes.

`bar-qr-deux-tournees-haccp-avant-rejeu-1.json` à **18:59:42.599 UTC** confirme **deux commandes GUEST OPEN pour 13,20 EUR**, paid 0, aucune finalisation ni marque de débit stock pour elles. La vente POS antérieure reste unique, **24,84 TTC / 22,46 HT / 2,38 TVA** ; stocks **98 / 79 / 59 / 19**, caisse théorique **110 EUR**, non clôturée. Pas de nouvelle vente, facture, avoir ou remboursement bar dans ce relevé.

Le renouvellement naturel MANAGER POS est désormais étayé : **req. 294/page 9, POST auth/refresh 200**, détail journal 1670 ; Cookie présent et site cohérent observés par le coordinateur, valeurs non publiées et protections Secure/HttpOnly/Lax conservées. Le logout **439/200** d'inactivité reste un autre événement, pas un échec refresh. Cela ne qualifie pas toutes les sessions/changements de société. Robi métier reste **BLOCKED / 503** ; suggestions métier corrigées sous test, sans nouveau rejeu final retenu ici.

Voir les critères **C01–C11** et limites dans le [registre UI → HTTP → PG](TRACABILITE-UI-API-PG-2026-10-17.md). Les cinq identités internes ont des parcours observés, **aucune n'a son rôle intégralement qualifié**. ADMIN métier et ACL fines restent non implémentés. À la coupure, la nouvelle restauration est en cours ; aucun succès futur, build final, impression, paiement bancaire ou qualification de production n'est anticipé. T100 partiel et cinq heures actives non attestées.

## Complément limité — 17 octobre 2026, 20:33:54 Europe/Luxembourg

**Point intermédiaire, campagne NON LIVRÉE.** Depuis la coupure 20:29:27 conservée ci-dessous, les preuves confirment le résultat Robi : message de limite visible à **18:31:12.109 UTC**, puis réseau page 7 à **18:31:15.373**, **POST agent/super-ask, requête 262, HTTP 503**. Le message n'invente pas une réponse métier ; la fonction métier reste **BLOCKED** dans ce contexte. Ancrage réseau : position **1527**, `list_network_requests`, page **7**, hash `7b555360ef1564ebb0d7ae2b0470924de295d97e1531060b392ce64b9230dd48`. Les corrections de suggestions ludiques restent non qualifiées dans ce complément.

L'ouverture du planning et la préparation d'un cas nocturne sont journalisées avant **18:33:54 UTC**, mais **aucun shift créé, publié ou validé n'est conclu de ces seuls clics**. Le bilan bar reste celui du relevé 18:26:06 : **une vente 24,84 EUR**, stock 98 / 79 / 59 / 19 et caisse théorique 110,00 EUR non comptée/non clôturée. Aucun nouveau test, build ou paiement bar n'est exécuté pour cette rédaction ; aucun nouveau PASS ni rôle complet.

## Point de reprise — 17 octobre 2026, 20:29:27 Europe/Luxembourg

**SERVICE CIBLÉ EXÉCUTÉ — RECETTE PARTIELLE — NON LIVRÉ.** Coupure **18:29:27 UTC** ; point de progression, pas fin de campagne. Le précédent relevé « aucune vente » décrit uniquement son instant de 19:57 et reste conservé plus bas. Les actions décrites ici ont été effectuées par le coordinateur dans Chrome ; aucune action, API ou SQL n'est exécuté pour rédiger ce document.

### Reprise métier et rôles réellement parcourus

Après les **deux profils / cinq compilations chacun**, le profil métier démarre normalement vers **20:06 Luxembourg** selon le constat du coordinateur. Le caissier EMPLOYEE se reconnecte en page 8. Le sélecteur de couverts corrigé est rejoué dans Chrome : moins, navigation clavier/plus puis retour à un couvert, focus observé et ouverture avec la valeur conservée. La preuve de persistance compte **un couvert**, pas la capacité de la table. Ce cas ciblé ne requalifie pas toutes les tables du restaurant ni les contrôles tactiles possibles.

Le caissier saisit deux pils 25 cl, un tonic, une planche, puis une pils 50 cl lors d'une deuxième tournée ; il enregistre une note. Le MANAGER se connecte dans une deuxième session, reprend la même commande et sa note, applique une remise globale de **10 %** et un offert. Le propriétaire ouvre une caisse avec **100 EUR de fond fictif**. Une autre identité EMPLOYEE se connecte indépendamment, tente Comptabilité et rencontre le refus visible ; les requêtes montrent le **HTTP 403 de lecture de caisse**. Ce contrôle ne démontre pas une ACL fine « sans finances », ni le refus de toute route financière.

| Identité | Nouveaux parcours observés | Limite |
| --- | --- | --- |
| OWNER | Reconnexion ERP, caisse/fond initial, rechargement après vente ; question Robi en lecture seule | Pas tous les menus, documents, rapports ou clôture ; Robi sans réponse métier vérifiée. |
| MANAGER | Deuxième caisse, relecture de la commande, remise/offert, motif exigé au paiement, mixte déclaré et justificatif numérique | Pas de confirmation bancaire ou impression physique ; fiscalité des gestes non qualifiée par un comptable. |
| EMPLOYEE caissier | Connexion POS, couverts par clic/clavier, deux tournées et note ; lecture de la remise depuis une autre session | Reverrouillage après inactivité ; pas clôture autorisée ni recette exhaustive des annulations. |
| EMPLOYEE dit « limité » | Connexion ERP, tutoriel, tentative Comptabilité et refus de caisse HTTP 403 | Reste un EMPLOYEE ; ACL fine distincte **NOT IMPLEMENTED**. |
| Troisième EMPLOYEE dit « sans finances » | Compte créé précédemment | Parcours de ce compte **NOT RUN** à cette coupure ; droit fin distinct non implémenté. |
| Client QR bar | Aucun nouveau contexte ni commande QR bar | **NOT RUN**. Le QR restaurant n'est pas un test du bar. |

### Paiement mixte : refus préalable, double clic et persistance

Le brut affiché des articles est **31,60 EUR**. Le parcours observé applique **3,16 EUR de remise (10 % du brut)**, puis **3,60 EUR d'offert**, soit **24,84 EUR**. Un motif présent dans la note de service **ne remplace pas** la justification requise dans la modale de paiement. L'essai avec justification vide est refusé visiblement ; une première tentative d'outil en délai/erreur n'est pas comptée comme preuve de ce refus. Le responsable renseigne ensuite le motif commercial explicite dans le champ de paiement.

Il ajoute **10,00 EUR espèces fictives + 14,84 EUR carte déclarée**, puis effectue un **double clic réel** sur la validation. La lecture réseau de fin de parcours montre **un seul POST checkout**, **200**, requête locale **237**, page 9. Le relevé PostgreSQL `bar-encaissement-mixte-doubleclic-1.json` à **18:26:06.736 UTC** confirme :

| Contrôle | Attendu / observé dans ce cas |
| --- | --- |
| Vente et commande | **1 Sale, 1 Order POS PAID**, total **2 484 cents** ; aucune deuxième vente déduite du double clic. |
| Base et taxe persistées | **2 246 HT + 238 TVA = 2 484 TTC cents**. |
| Règlements | **2 tenders : CASH 1 000 + CARD 1 484 cents**, tous deux `manual_declaration` ; solde 0. |
| Provenances | **4 origines LINE + 1 origine ORDER** pour la même vente ; cinq origines ne sont pas cinq ventes. |
| Stock théorique | Pils 25 cl **98**, Pils 50 cl **79**, Tonic **59**, Planche **19** ; départ 100 / 80 / 60 / 20. |
| Caisse | Fond **10 000 + espèces 1 000 = 11 000 cents** théoriques ; **110,00 EUR encore visibles après rechargement OWNER**. Pas de comptage ni clôture. |
| Documents / autres mouvements | Aucune facture, avoir, remboursement, virement ou versement bancaire bar dans ce relevé. |

Le ticket numérique est réellement ouvert, sans impression ou envoi. La carte demeure une **déclaration**, jamais un encaissement vérifié par une banque. La somme exacte et la trace d'origine ne qualifient pas la conformité fiscale : la provenance détaillée remise/offert est agrégée et la ventilation de TVA au prorata reste à examiner/valider comptablement. Ne pas inventer une affectation historique par article depuis le seul total ou depuis les prix catalogue actuels.

### Sessions, Robi et limites

La caisse EMPLOYEE laissée sans interaction revient à la connexion avec un **logout 200**. Ce cas correspond au **reverrouillage après dix minutes d'inactivité** codé dans [App.tsx](../../apps/pos/src/App.tsx) ; il n'est pas reclassé en erreur de refresh. En revanche, le succès naturel d'un **refresh 200 avec le cookie attendu** n'est pas encore prouvé ; la correction d'origine ne peut pas être déclarée totalement qualifiée sur la seule reconnexion.

En page propriétaire, Robi est réellement sollicité après correction des délais. L'interface annonce le contexte autorisé indisponible et **aucune réponse métier vérifiée**, plutôt que des chiffres inventés ; aucune opération financière n'est effectuée par cet essai. Les suggestions ludiques encore visibles dans le profil métier sont un défaut UI reproduit, pris en charge séparément ; leur présence ne prouve pas le chargement d'un moteur de jeu. Voir le [registre d'anomalies](ANOMALIES-MISSION-MAITRE-2026-10-17.md). La question sur de nouveaux rôles/droits fins reste sans décision utilisateur ; aucun ADMIN métier ou droit « sans finances » n'est ajouté par hypothèse.

### Preuves datées, sans accès publiés

| Repère | Position ; fin UTC ; opération ; page | Hash d'événement |
| --- | --- | --- |
| Rejeu moins du couvert | 1376 ; 18:09:10.058 ; click ; 8 | `0eedcc43fc66eab38868640c195e0df4331964a6ec1995bcfecae0fd82d3acce` |
| Ouverture à un couvert | 1384 ; 18:10:13.169 ; click ; 8 | `38f53844f02adb06b58d0cdacb55502184e2133d3f2427bcd1d6417cff3c42ad` |
| Refus caisse EMPLOYEE, réseau | 1463 ; 18:20:51.606 ; list_network_requests ; 10 | `65c52a05ad445c80624af93d9f94750dfe25fc4580214d6bdf5c6ded4e966cf4` |
| Justification vide refusée visiblement | 1479 ; 18:24:56.891 ; click ; 9 | `9957fad1e0ed2a91329fa293bb1872799058b115207063eacebf57945799aadb` |
| Double clic mixte | 1488 ; 18:25:51.638 ; click ; 9 | `b804af74559ddce0d372139757a0eaf656a19cb57852b2a1226f27505b12ebb8` |
| POST checkout unique, requête 237 | 1495 ; 18:26:31.901 ; list_network_requests ; 9 | `5b520ad06756b087a57eb8bdba5435afd393571a03c09819e22c289a72b76848` |
| Caisse à 110 EUR après rechargement | 1497 ; 18:26:51.007 ; take_snapshot ; 7 | `12bdb6410f9ba40440f0e76e34b1fee4d455aadf375faf9b8abf36ef673a98a8` |
| Requête Robi réelle, résultat limité visible | 1514 ; 18:28:54.644 ; click ; 7 | `7ed1c509d5e29fb1362c02a379426a118579f1a41ff7d4e831b5de054d21ea60` |

JSON d'encaissement : SHA-256 **des octets du fichier** `26be7ae01f7c68d7d7b4ba145d601062cde91e3ac40a2d5c1264a4b207443f83`. La sortie du collecteur donne séparément l'empreinte **canonique compacte** `ea855e0e6c6d0b44f3e37101e3426304d7d0ae7cbac1835cc2f9025214507643` ; le coordinateur confirme la méthode `JSON.stringify(canonical(report))`, différente du fichier indenté avec fin de ligne. Les deux méthodes ne sont pas confondues. Le collecteur reste `OBSERVATION_ONLY_NOT_UI_PASS`.

La preuve `validation-local-1792260327936-pzpr8V` confirme **47/47 fixtures locales**, pas des parcours métier. Les **838 unitaires + 278 PG** sont antérieurs au dernier changement de politique d'origine. La restauration **19:57:26**, 81 tables / 9 609 lignes / 14 fichiers / 24 PDF sans écart, **précède cette vente de 20:25** : elle ne restaure donc pas encore cette vente bar. Une sauvegarde/restauration ultérieure devra l'inclure et en comparer vente, tenders, stock et justificatif.

**À poursuivre : compte EMPLOYEE restant, QR du bar, annulations/remises interdites, documents, clôture, incidents et restauration du nouvel état.** Aucun rôle intégralement qualifié, aucun nouveau PASS T100 accordé par ce rapport, cinq heures actives non démontrées. La campagne continue ; aucune qualification de production.

## Actualisation — 17 octobre 2026, 19:57 Europe/Luxembourg

**ÉTABLISSEMENT CRÉÉ — RECETTE PARTIELLE — NON LIVRÉ.** Coupure UI : **17:57:00 UTC**. Le relevé « non créé » conservé plus bas est historique, arrêté à 19:30:03 Luxembourg ; il ne décrit plus l'état courant. Aucun clic, appel API/SQL, création ou test n'est exécuté pour rédiger cette actualisation.

### Installation réellement observée

L'inscription du **BAR DES AMIS** est validée dans une session propriétaire indépendante, à **17:42:35.422 UTC**. Le propriétaire configure l'identité visuelle, crée trois tables et termine l'onboarding sans activer de service externe ni modifier Ollama. Les données de la boulangerie restent intactes, séparées et hors recette C ; aucune réutilisation de ses identités ou de son stock n'est comptabilisée ici.

Le relevé `bar-cinq-comptes-catalogue-avant-rebuild-1.json`, à **17:56:14.779 UTC**, corrobore **5 adhésions : 1 OWNER, 1 MANAGER, 3 EMPLOYEE**, trois catégories et quatre produits. Les trois tables du workspace sont libres, avec douze places configurées ; aucune table SQL historique n'est créée pour les dupliquer. La capacité n'est pas un nombre de clients présents.

| Produit fictif | Prix TTC EUR | Taux saisi | Stock initial observé |
| --- | --- | --- | --- |
| Pils Amis 25 cl | 4,80 | 17 % | 100 |
| Pils Amis 50 cl | 8,50 | 17 % | 80 |
| Tonic Amis | 3,60 | 3 % | 60 |
| Planche Amis | 9,90 | 3 % | 20 |

Ces taux sont les données fictives effectivement saisies ; ce tableau ne valide ni leur régime fiscal, ni leur usage commercial. Aucun stock physique, recette matière ou taux historique de vente n'est inventé.

Le collecteur constate **0 commande, vente, règlement, caisse ouverte, visite QR, facture, avoir, remboursement, fournisseur, achat, réservation, shift, congé et mesure HACCP** pour ce bar à l'instant observé. Ce sont des zéros de tables ciblées dans ce relevé, **pas des parcours utilisateur réussis ni une preuve de couverture de tous les mécanismes**.

### Comptes créés ≠ rôles parcourus

| Rôle / identité demandée | Ce qui est observé | Parcours restant |
| --- | --- | --- |
| Patron / OWNER | Inscription, identité, onboarding, tables, équipe, catégories et quatre produits via Chrome ; persistance collecteur | Reconnexion indépendante, stock/achats, planning, documents, rapports, permissions, caisse et clôture. |
| Responsable / MANAGER | Compte réellement créé depuis le formulaire du propriétaire | Connexion, service, validations, refus et limites : **NOT RUN**. |
| Serveur / caissier / EMPLOYEE | Identité distincte réellement créée | Connexion, ouverture de caisse, tournées, paiement fictif, reprise : **NOT RUN**. |
| Employé dit « limité » / EMPLOYEE | Deuxième identité EMPLOYEE créée | ACL fine distincte **NOT IMPLEMENTED** ; parcours bar et refus directs **NOT RUN**. |
| Employé dit « sans finances » / EMPLOYEE | Troisième identité EMPLOYEE créée | Contrat « sans finances » **NOT IMPLEMENTED** ; ne pas inventer un retrait de droits. Parcours bar **NOT RUN**. |
| Client QR anonyme | Pas de visite ni de contexte QR du bar créé dans les preuves retenues | Menu, panier, commande, confidentialité, révocation et mobile : **NOT RUN**. |

Un administrateur métier distinct n'a pas été ajouté au modèle réel. Aucun rôle n'est intégralement qualifié. La création des comptes ne prouve pas leur connexion, leurs refus HTTP ou leur isolement à travers toutes les routes.

### Chaîne UI → persistance et repères

| Action observée dans Chrome | Rôle | Contrôle de persistance | Résultat limité |
| --- | --- | --- | --- |
| Inscription puis onboarding | OWNER | Société/adhésion et workspace propres au bar dans le collecteur | Établissement distinct créé ; aucun identifiant de connexion publié. |
| Trois ajouts de table | OWNER | `FloorWorkspace` : 3 tables, 12 places, toutes libres | Pas de double écriture vers les tables historiques. |
| Quatre créations de membre | OWNER | `UserCompany` : 1 OWNER existant + 1 MANAGER + 3 EMPLOYEE | Pas de validation de connexion des quatre comptes créés. |
| Trois catégories, quatre produits | OWNER | `Category` / `Product` : mêmes prix, TVA et stocks fictifs | Pas encore de vente ou mouvement de stock. |

Le rapport ne reconstruit pas des URL d'API ou corps de requête non lus. Les correspondances sont des constatations ciblées UI/collecteur, pas des PASS nouveaux de la matrice T01–T100.

| Repère | Position ; fin UTC ; opération ; page | Hash d'événement |
| --- | --- | --- |
| Inscription du bar | 1266 ; 17:42:35.422 ; click ; 7 | `8e19457bc27ed1fbf817ee815811ad7973967f2ed1bd82c325dd651b5d37e82a` |
| Fin de l'onboarding | 1285 ; 17:44:32.401 ; click ; 7 | `e3033e144aa0d04b66783b63f5afcaf1613d1b391595ea0ab1c753d7351c265b` |
| Compte responsable | 1301 ; 17:47:56.238 ; click ; 7 | `9d6cd633e4ba92e190833611cb62cfdc367dc38b50972fe7288fdc1ad9d3d084` |
| Dernier compte employé | 1321 ; 17:50:33.952 ; click ; 7 | `adad9fad7763406aaabe7f3d380da73f0f27744d93ec5d9cf4f45f086a25c9b0` |
| Dernier produit enregistré | 1361 ; 17:55:13.935 ; click ; 7 | `a6b334e8394acb09dde8948f47eeba4372c52f90469b68633c5e304aae5647b9` |

La coupure retient **96 lignes bar : 49 événements UI retournés, dont 35 appels `click`, et 47 observations**. Ce ne sont ni des clics physiques reconstitués, ni 49 contrôles T100 distincts ni des PASS. Les empreintes d'événement référencent la position du journal ; les anciens IDs numériques en collision ne sont pas utilisés comme clé. Aucun journal brut, accès ou QR n'est publié.

Empreinte SHA-256 des **octets du JSON privé** `bar-cinq-comptes-catalogue-avant-rebuild-1.json` : `047dfc91373871773984c86600c2a3bb600c9b0a09790a6ddba0892813c762c4`. Le statut du relevé est `OBSERVATION_ONLY_NOT_UI_PASS`.

### Reprise et limites

La restauration complémentaire achevée à **17:57:26.591 UTC**, après la coupure UI, compare globalement **81 tables / 9 609 lignes / 14 fichiers / 24 PDF** avec égalité. Le bar nouvellement créé est dans la base de laboratoire prise en compte ; cette égalité globale ne remplace pas une reconnexion et un service du bar après redémarrage. Les 24 PDF appartiennent au périmètre global, **pas à des factures bar inexistantes**.

À la coupure, le runtime est arrêté normalement pour le build ; aucun rejeu Chrome des dernières corrections n'est acquis. Aucun succès de build ultérieur n'est anticipé ici. Reprendre avec le même établissement, relire ses données, tester chaque compte et un service complet. Conserver le profil métier et les jeux récupérables, sans production, banque réelle ni suppression d'archives. Voir le [registre des anomalies](ANOMALIES-MISSION-MAITRE-2026-10-17.md). **Pas de durée active de cinq heures ni de T100 intégral démontré ; campagne NON LIVRÉE.**

## Relevé historique conservé — coupure du 17 octobre à 19:30:03 Luxembourg

Tout le bloc ci-dessous décrit uniquement la situation antérieure à la création de C ; ses statuts NOT RUN ne sont pas les nouveaux statuts d'installation ci-dessus.

**NOT RUN — ÉTABLISSEMENT NON CRÉÉ À LA COUPURE — NON LIVRÉ.**

Coupure documentaire : **17 octobre 2026 à 17:30:03 UTC / 19:30:03 Europe/Luxembourg**. Le journal privé consulté inclut les événements achevés jusqu'à 17:30:00.251 UTC ; aucune création ni action de campagne BAR DES AMIS n'est retenue avant cette coupure. Le coordinateur confirme que ce troisième établissement n'est pas encore créé. Les événements ultérieurs ne sont pas anticipés.

La nouvelle mission remplace la boulangerie par **BAR DES AMIS** comme client C. Les données/préparatifs boulangerie de l'ancien cadrage restent préservés à part : ils ne sont ni supprimés, réattribués au bar, ni comptés comme recette de ce nouvel établissement. Ce rapport n'accède à aucun profil historique et ne modifie aucune donnée.

## 1. État réel, sans faux zéros

| Élément | État à la coupure |
| --- | --- |
| Société bar, site, comptes et sessions | **NOT RUN / non créés pour cette campagne**. |
| Catalogue, TVA, stocks, fournisseurs | Non renseignés ; ne pas utiliser ceux du café/restaurant. |
| Tables, couverts et visites QR | Non créés ni observés. |
| Vente, encaissement, facture, avoir, remboursement, clôture | Aucun parcours exécuté pour C ; montants **non observés**, pas « société vérifiée à zéro ». |
| UI / réseau / PostgreSQL | Aucune chaîne d'action et persistance qualifiée pour C. |
| Rapports, PDF, exports, sauvegarde/restauration bar | **NOT RUN** ; une restauration d'A/B n'est pas une restauration du bar. |
| Compteurs de journal étiquetés bar avant coupure | **0 événement retenu** ; cela ne vaut pas une requête SQL prouvant l'absence de toute donnée. |

Le profil cible reste `CREORGA_BUSINESS_ONLY`. Aucun clic, API/SQL, test, build, démarrage, création de compte ou paiement n'est exécuté lors de la rédaction. Aucun scénario n'est promu à PASS.

## 2. Utilisateurs à préparer sans inventer de rôles

| Catégorie demandée | Préparation / statut |
| --- | --- |
| Propriétaire | Identité fictive distincte à créer dans le rôle OWNER ; **NOT RUN**. |
| Administrateur métier | Contrat distinct non implémenté dans le modèle de création observé ; **NOT IMPLEMENTED**, pas un OWNER renommé. |
| Responsable | Identité fictive MANAGER à préparer ; **NOT RUN**. |
| Serveur / caissier | Identité fictive EMPLOYEE selon droits réels ; **NOT RUN**. |
| Employé à accès limité | Identité distincte à préparer ; ACL fine distincte **NOT IMPLEMENTED** ; **NOT RUN** pour ses parcours bar. |
| Client QR | Visite anonyme propre au groupe/table et contexte navigateur indépendant ; **NOT RUN**. |

Ces intitulés sont une préparation, pas des comptes déjà créés ou des permissions accordées. La décision sur un administrateur métier et les droits fins doit rester explicite ; ne pas confondre avec la superadministration technique.

## 3. Prochain parcours proposé — non exécuté

| Bloc | Actions à réellement exécuter ensuite | Preuves à produire | État |
| --- | --- | --- | --- |
| Installation isolée | Société/identités/catalogue/stock/tables propres au bar, puis rechargement et reconnexion | UI → requête → tables de la bonne société → valeurs initiales | NOT RUN |
| Nuit / changement de date | Service tardif et passage de minuit, planning, pauses et affichage Europe/Luxembourg | Instants UTC et locaux, durée exacte, droits salarié/responsable | NOT RUN |
| Tournées et deux caisses | Comptoir/table, plusieurs tournées, notes et changements rapides de produits, conflit concurrent | Lignes et provenance stables, aucun ajout perdu ou double vente | NOT RUN |
| Remise / offert | Tentative interdite du salarié, action autorisée et motif ; happy hour uniquement si réellement pris en charge | UI et refus/acceptation serveur, montants/TVA historiques | NOT RUN ; capacité happy hour à vérifier |
| QR / groupes | Menu, panier, notes, envoi/deuxième tournée, addition, révocation/expiration, confidentialité | Contexte indépendant, mêmes commandes après reload, aucun accès intergroupe | NOT RUN |
| Règlements fictifs | Acompte, partiel/mixte/solde, double clic, réponse perdue, reprise du même identifiant | Tenders/solde/vente/stock réconciliés, déclaration carte clairement non bancaire | NOT RUN |
| Documents | Reçu, facture société, avoir et remboursement déclarés, PDF et e-mail local si capture active | Originaux/numéros/hashes/relations société, aucune double vente | NOT RUN |
| Clôture | Fond, mouvements, théorique/compté/écart motivé, rapport/export | Snapshot figé, refus salarié et fichier réellement comparé | NOT RUN |
| Incident et reprise | Réseau/serveur/copie PG selon autorisations, puis sauvegarde/restauration neuve | Données et fichiers du bar comparés avant/après, archives conservées | NOT RUN |
| Interface et droits | 375/390/768/1024/1440, clavier, focus, erreurs, accès directs, révocation et changements de société | Captures/événements datés, réponse serveur et persistance | NOT RUN |

Ce plan n'invente ni endpoint observé, ni identifiant de société, ni montant, ni résultat. Les essais matériels ou prestataires réels resteront BLOCKED sans matériel/configuration et autorisation appropriés ; leur simulation éventuelle devra être nommée comme telle.

## 4. Registre de preuve à compléter

| Action UI | Rôle / société | Requête observée | Table / écriture | Attendu | Observé | Preuve | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aucune action bar retenue à la coupure | Non créé | Non observée | Non vérifiée | Démarrer un établissement fictif indépendant | Non exécuté | Aucune preuve UI de C | NOT RUN |

Les futurs événements devront être identifiés par date/opération/page et position/hash de journal, sans publier identifiants de connexion, capacités QR, jetons ou preuves brutes. Les collisions des anciens IDs numériques de campagne ne doivent pas être recyclées comme preuve.

Sources de contexte : [rapport intensif historique](RECETTE-INTENSIVE-2026-10-17.md), [couverture par rôle arrêtée à ses dates](INTENSIVE-COUVERTURE-PAR-ROLE.md), [audit architectural de la nouvelle mission](ARCHITECTURE-AUDIT-2026-10-17.md), [rapport café](RECETTE-CAFE-2026-10-17.md), [rapport restaurant](RECETTE-RESTAURANT-2026-10-17.md). Les anciennes mentions « C Boulangerie » ne sont pas reprises comme état du bar.

**Bilan : BAR DES AMIS non commencé à cette coupure. Aucun rôle, écran, règlement, stock ou scénario C qualifié ; aucune durée active ou couverture T100 supplémentaire ; campagne NON LIVRÉE.**
