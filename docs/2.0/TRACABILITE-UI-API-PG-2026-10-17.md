# CréOrga 2.0 — traçabilité UI → HTTP → PostgreSQL

## Consolidation technique après la coupure UI de 21:30

**CAMPAGNE TOUJOURS PARTIELLE — NON LIVRÉE.** Les nouvelles [preuves finales v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json) confirment les validations ci-dessous. SHA-256 du fichier : `0a7b52ba69f28bb77d9b38bbfe0704a291d61641c5206c4aab7424dc1056674b`. Cette consolidation n'est pas un nouveau parcours UI ni une exécution de test/restauration par le rédacteur. Les versions antérieures restent conservées : v3 corrige uniquement la lecture de la clé `duplicateOpenByUser`, sans nouveau test, donnée ou restauration, et sans nier les deux pointages historiques.

| ID réévalué | Preuve effectivement lue | Verdict ciblé et limite |
| --- | --- | --- |
| X02 | Restauration réellement terminée à **19:31:36.908 UTC / 21:31:36.908 Luxembourg**, après arrêt normal du laboratoire : **81 tables, 10 083 lignes, 14 fichiers, 26 PDF**, zéro différence, PG `equal`. **15 PDF factures + 11 PDF avoirs**, mêmes empreintes source/copie ; trois compteurs d'anomalies PDF à zéro des deux côtés. | **PASS**, restauration de cette copie incluant les nouveaux rejoués/clôtures. Pas tous les scénarios de panne, un RTO garanti, ni campagne terminée. |

Le registre cumulatif reste à **32 identifiants distincts** : désormais **25 PASS ciblés / 2 FAIL historiques conservés / 5 BLOCKED**. B08/C04 et maintenant X02 utilisent leur dernière appréciation datée ; les anciens états ne sont pas supprimés. Les FAIL B07/C03 restent les preuves RED antérieures aux GREEN, pas deux défauts encore reproduits. CSV, capture PNG non attestée, droits fins, comparaisons navigateur/manutention physique gardent leurs limites. **T100 n'est pas promu.**

Restauration privée `RESTORATION-2.0-mission-maitre-fin-rejeux-20261017-2132-v1.json` : résultat SHA `f68122913050418e76ef78b70ddaa6a6f86c7951c86f2d317163e1d8657a6baa`, archive SHA **`372728371f2f262541e5bf3151555b1b2c3be62e3a13cf81db10f6be7fc92d48`**, copie chiffrée vérifiée, clé absente de l'archive. Les **5 342 ms** sont la durée observée sur ce laboratoire avec caches chauds, **pas un RTO**. Aucun contenu privé ou archive n'est publié.

Les relances finales sont maintenant effectivement achevées : **391 backend / 349 web / 121 POS = 861 unitaires**, tous réussis, et **295 PG**, même empreinte de source `6bc6f3ee36132f8e7dff03085d5d0df010f4aebfb1c017061690b814deaccf45`. Fins UTC backend **19:30:05.707**, web **19:30:06.882**, POS **19:29:57.103**, PG **19:10:25.484** ; les deux premières dépassent de quelques secondes la coupure UI et ne sont pas rétrodatées. Les **47/47 fixtures locales**, builds business/full **5 applications chacun** et anciens échecs conservés restent distincts des clics.

Le [journal public 21:32](preuves/intensive-journal-2026-10-17-2132.json), SHA `79e3c932a5e6a119fa0f292aa6ee5ddce6a36710e70d3b2fda4d005b52548d31`, rapporte selon ses conventions **1 119 tentatives UI, 1 096 retours, 23 erreurs, 731 clics d'outil retournés et 368 champs remplis**. Ces métriques ne sont pas additionnées aux comptes d'appels `operation = click` des relevés précédents ni déclarées équivalentes à des clics physiques/contrôles uniques. Temps d'outil et amplitude des dates **n'attestent pas cinq heures actives**.

**Reste à poursuivre :** inspection/réconciliation des CSV réellement téléchargés, fichiers Chrome et matériel autorisé, ACL fines et autres parcours/permissions, réponse métier Robi et recette exhaustive. Aucun rôle intégralement qualifié, pas de banque réelle ni certification juridique/comptable/sécurité. Les preuves techniques finales ne valent pas livraison complète.

## Complément de progression — 17 octobre 2026, 21:30 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Nouvelle coupure **19:30:00 UTC**, sans effacer les observations RED et BLOCKED du point de 21:00 conservé plus bas. Les rejoués sont de vrais parcours Chrome après reprise ; les lectures PG/HTTP sont complémentaires, pas leur substitut. Aucune nouvelle action, donnée ou exécution n'est produite pendant cette rédaction.

### Critères réévalués et nouveaux critères étroits

Les **B08 et C04 passent de BLOCKED à PASS** sur les preuves suivantes. B07 et C03 restent les **FAIL historiques** des anciens binaires/EML ; ils ne signifient pas que ces deux défauts sont encore reproduits après les GREEN ciblés. **B04 reste le remboursement déjà PASS**, pas le numéro du rejeu QR. Les identifiants ne sont pas renumérotés.

| ID | Action réellement rejouée / preuve HTTP | Comparaison UI et PostgreSQL / résultat observé | Verdict daté et limite |
| --- | --- | --- | --- |
| B08 | MANAGER solde les **6,50 EUR de commande RED conservée**, double clic, page 14 **POST checkout 43/200** ; ancien contexte QR page 6 : **GET bill 2721/403 puis POST guest/orders 2771/403**. | Une vente supplémentaire attendue pour cette commande ; **4 Sale / 5 Order**, aucune sixième commande après le POST refusé, plus de solde ouvert. L'ancienne preuve RED n'est ni effacée ni redéclarée deux fois. | **PASS**, rejet de lecture et écriture de l'ancien accès après paiement final. Pas tous les rejoués, groupes ou scénarios de banque. |
| C04 | OWNER republie le planning nocturne dans Chrome, page 7 **POST planning/publish 405/200**. | Nouveau MIME contrôlé : **03:00 (18/10/2026)** explicitement présent, société/destinataire/date/heures/rôle/section et Shift CONFIRMED concordants ; tous les checks vrais. | **PASS**, date de fin et contenu de cette capture locale. **Pas Zoho/réception Internet ; libellé de fuseau non imprimé**. C03 RED conservé. |
| B09 | Règlement fictif de la commande QR RED à 6,50, double clic UI 1714 puis fin de parcours, même POST checkout 43/200 que B08. | **84,50 TTC = 81,42 HT + 3,08 TVA**, 4 ventes/5 commandes payées ; cash **82,20**, carte déclarée **2,30**. Stocks **26 / 23 / 18 / 39 / 59 / 25**. Avoir/remboursement déclaré **6,10** inchangés. | **PASS**, vente/stock/règlement uniques de ce cas. Le même clic n'est pas compté une seconde fois comme couverture UI. |
| B10 | OWNER compte 276,05, tente sans motif (**PUT close 295/422**), justifie, confirme **299/200**, page 2 ; rechargement/historique. | Tiroir figé **276,10 attendu / 276,05 compté / −0,05 EUR motivé**, fermé à **19:26:13.944 UTC** ; rapport relu après rechargement. | **PASS**, clôture justifiée/persistée. Ni argent physique compté, ni CSV inspecté. |
| C12 | MANAGER, **5 EUR cash fictifs**, double clic, page 9 **POST pos/payments 580/200** ; client recharge son QR. | Paiement affecté **3,64 + 1,36 = 5,00**, restant **5,96 + 2,24 = 8,20** ; accès non révoqué, visite encore ouverte. Toujours une seule vente POS finalisée à cet instant, stock QR non débité. | **PASS**, acompte unique sans fermeture prématurée. Pas paiement bancaire vérifié. |
| C13 | MANAGER solde **8,20 EUR = 4 cash + 4,20 carte déclarée**, double clic, **POST pos/payments 598/200** ; ancien QR relu. | Deux commandes QR PAID/served, visite fermée, accès révoqué ; ancien bill **1097/403**. **3 Sale / 3 Order**, **38,04 TTC = 34,17 HT + 3,87 TVA** ; cash 19,00 + carte déclarée 19,04. Stocks **96 / 79 / 58 / 19**. | **PASS**, solde exact puis révocation ciblée. Plusieurs affectations/tenders ne sont pas des doubles ventes. |
| C14 | OWNER crée un groupe neuf via l'UI ; contexte QR neuf page 15 **GET bill 19/200** ; ancien contexte page 12 **1154/403**. | Deux visites en PG : ancienne fermée/révoquée, nouvelle ouverte avec addition visible **0**, sans réexposer les anciennes consommations. | **PASS**, séparation nouveau/ancien groupe dans ce cas. Aucun lien/capacité n'est publié. |
| C15 | OWNER approuve le congé unique : page 7 **PUT leave/status 419/200**, employé page 10 recharge. | **Une seule LeaveRequest APPROVED** ; même statut visible côté employé. | **PASS**, décision et persistance ciblées, pas toutes les permissions RH ou règles légales. |
| C16 | OWNER compte 118,90, motive −0,10 et confirme page 7 **PUT close 453/200** ; page rechargée. | **119,00 attendu / 118,90 compté / −0,10 EUR**, clôture à **19:26:35.752 UTC**, état durable. | **PASS**, clôture fictive justifiée. Pas de comptage matériel ou qualification d'export. |
| C17 | EMPLOYEE ouvre les suggestions Robi du profil métier dans Chrome, page 13 ; huit propositions affichées sans jeux. | Rendu UI observé ; aucun writer métier attendu et aucune réponse de modèle n'est sollicitée par ce contrôle de suggestions. | **PASS**, suggestions de cet écran uniquement. **Robi métier reste 503, non rejoué**, pas disponibilité du modèle ou toutes les interfaces sans jeux. |
| X03 | Boutons CSV des clôtures B/C cliqués en 1794/1796. | Les fichiers téléchargés **n'ont pas été inspectés**, ni parsés/réconciliés avec les clôtures. | **BLOCKED** pour CSV bout en bout ; un clic d'export n'est pas un fichier contrôlé. |
| X04 | Tentative d'instrumentation de capture Bar ; contrôle du fichier et note 1795. | Fichier non trouvé et journalisation initiale refusée par filtre lexical ; statut **INSTRUMENTATION_NOT_VERIFIED**. | **BLOCKED** pour la capture ; **aucun PNG réussi attesté**, aucun contournement et aucune preuve d'image inventée. |

Le registre contient désormais **32 identifiants distincts** : **24 PASS ciblés / 2 FAIL historiques conservés / 6 BLOCKED**. Ce total utilise la dernière appréciation datée de B08/C04, sans compter leurs anciennes valeurs une seconde fois. **Aucun PASS T100, rôle complet, certification juridique/comptable/sécurité ou qualification de production n'en est déduit. X02 reste BLOCKED** : la restauration de 21:00 précède ces nouveaux règlements/clôtures ; restauration finale encore à fournir à cette coupure.

### Réconciliation financière mise à jour

| Établissement | Vente / règlements persistés | Clôture et limites |
| --- | --- | --- |
| Café | Toujours **21,10 TTC / HT 20,03 / TVA 1,07**, quatre ventes ; avoirs/remboursements déclarés 10,25, inchangés. | Ancienne clôture 106,85 attendu / 106,80 compté. **Deux pointages ouverts historiques** restent conservés dans un groupe doublon, pas deux nouvelles entrées. |
| Restaurant | **84,50 TTC / HT 81,42 / TVA 3,08** ; cash 82,20 + carte déclarée 2,30. Facture 31,50, avoir et remboursement CASH 6,10 inchangés, pas de nouveau chiffre d'affaires documentaire. | **200 + 82,20 − 6,10 = 276,10 attendu**, 276,05 compté, −0,05 motivé. Net documentaire arithmétique 84,50 − 6,10 = 78,40, pas une écriture inventée. |
| Bar | **38,04 TTC / HT 34,17 / TVA 3,87**, trois ventes pour trois commandes ; **19,00 cash + 19,04 carte déclarée** ; stock 96/79/58/19. | **100 + 19,00 = 119,00 attendu**, 118,90 compté, −0,10 motivé. Préparation QR #2/#3 réellement commencée/prête/servie, `guestStatus = served` confirmé ; pas preuve de préparation matérielle. |

L'employé surnommé « sans finances », réellement EMPLOYEE, **voit 38,04 EUR de CA au dashboard POS**. Ses accès Caisse/Accounting sont refusés **GET 230/403 et 235/403**, page 13. Cela ne constitue **pas une ACL fine “aucune lecture financière”**, qui demeure absente ; X01 reste BLOCKED. Les rôles ne sont pas requalifiés depuis leur nom de test.

### Nouvelles preuves de données et de MIME

Chaque JSON PG reste `OBSERVATION_ONLY_NOT_UI_PASS` ; ses résultats sont rapprochés des actions et requêtes ci-dessus. Heures UTC, SHA-256 **des octets de fichier**, pas empreintes canoniques :

| Fichier privé contrôlé | Observation UTC | SHA-256 |
| --- | --- | --- |
| `restaurant-qr-fermeture-green-apres-reprise-1.json` | 19:18:54.730 | `9ac0ce0a8ce9ce073e476bbbf57eaa8c8c1d2dd8e42d0b359443c476d02f7c5c` |
| `restaurant-cloture-finale-1.json` | 19:28:23.359 | `e70ed37e583577a7a37b563951316aaa332d4421a3771c5f28aecfaf84286de8` |
| `bar-qr-acompte-500-apres-reprise-1.json` | 19:20:21.584 | `0fbebc0f0435653f2b7ddf224fdf44beaf0de763c9b5e2fce3b34c630a546606` |
| `bar-qr-solde-mixte-fermeture-green-1.json` | 19:21:31.551 | `2c7adea0232baa284214917ce60a26ffda0610582e677324ca077d2cf5bba3e2` |
| `bar-planning-nuit-green-apres-reprise-1.json` | 19:24:27.700 | `df85c1c4f6589b9a2283fdb60648ee2788d97ce70d2f8d08ec5fd61a07c01ef4` |
| `bar-cloture-conge-nuit-final-1.json` | 19:28:23.651 | `bd90cdccd5e5190191e0e51a5b70a151a383cd6c7e9169c303d51742b4252a83` |
| `cafe-relecture-finale-1.json` | 19:28:23.937 | `d8750eeca5485b26e06f091dcd2d6a389b01fdc580fa5e60112940a7dad178d4` |
| `bar-planning-local-mime-v2-green-date-fin-1.json` | 19:24:27.801 | `d6f6b2ff08a33a284f6e5bc981331ad511422e7e79d6d97f21e243852ff16022` |

Le nouveau MIME et le fichier EML local correspondent : **3 478 octets**, SHA-256 `d58aab9d52d30a8afcc63a1bc2243ad295268485fe4e268d1633e6f3ca1195ef`, tous les checks vrais, aucun écart de contenu. **ProviderDelivery/mailboxReception restent faux**, donc pas réception Zoho attestée. L'ancien EML sans date de fin n'est pas supprimé.

Source réseau publique : [rejoués HTTP réellement relus](preuves/intensive-http-rejeux-2026-10-17-2130.json), générée **19:29:46.722 UTC**, SHA-256 `d844095ccfd9f07e48615da8480d1862f8bfa8ab19da0cd6925f9ad50a709ae2`. Ses heures sont celles d'**observation**, pas d'émission. Les routes sont gabaritées dans ce document ; aucun ID de visite, QR, adresse ou contenu libre n'est recopié.

### Repères UI et absence de capture inventée

| Action | Position ; fin UTC ; opération ; page | Hash d'événement enregistré |
| --- | --- | --- |
| Double clic paiement QR restaurant | 1714 ; 19:17:52.368 ; click ; 14 | `56fd14427c0ed62fa1a1005640f3cb7b5ee2d2c504a066f958a68ab6a0368a77` |
| Double clic acompte Bar | 1734 ; 19:20:10.730 ; click ; 9 | `3471604487481f22f8670258f0ca007753ba6264f0cd830fe0e519ca82bffad1` |
| Double clic solde Bar | 1742 ; 19:21:00.705 ; click ; 9 | `34f6a6012d6d93a589022ccad4c994b5b9c45b958ed81f51437ce495ecc24660` |
| Republication nuit | 1766 ; 19:24:11.476 ; click ; 7 | `6362db356c6fc32c34e98220d4190b29322d7c257b0db98a2751c35cfc2e8208` |
| Approbation congé | 1772 ; 19:25:09.755 ; click ; 7 | `5b0df44df1a5665e56daec01a28a3c80c58da2d570b320a35f74e776a2ff66c7` |
| Confirmation clôture restaurant | 1784 ; 19:26:14.368 ; handle_dialog ; 2 | `ef4f3f4a2d2040301c72599c12ab3885b3a3455949f445f4ef1acaf86b64976f` |
| Confirmation clôture Bar | 1788 ; 19:26:36.189 ; handle_dialog ; 7 | `a2ed959c6add6f13a9cf8c1db14cd8875e0f50b0888cba520400805338da4d06` |
| Instrumentation non vérifiée | 1795 ; 19:28:18.661 ; evidence_note ; 7 | `c6192a43558112e073f09e2afd991d7598c6cc2ae5e1d7a1cdd7cd596ebcf8a6` |

### Validation technique et compteurs, sans durée inventée

Preuves relues : **295/295 PG** après annotations de type, dossier `validation-integration-1792264133827-QuxSOw`, fin **19:10:25.484 UTC**, **90 950 ms**, hash Vitest réel/enregistré concordant `4da2b81890414753a42c7a87cdc20c9e472d4359e7b7f4e1735f3b2d516744f9`. **47/47 fixtures locales**, dossier `validation-local-1792264499723-TK06dd`, fin **19:15:01.590**, 1 865 ms, résultat SHA `06d36dcc01bc8ccb3b835186539a4b43617e8d60166f9a0f6dd396c23c626ccd`.

Les deux builds finaux sont réellement réussis, cinq applications chacun, statut `COMPILATION_SUCCEEDED_NOT_UI_PASS` : **business 90 289 ms**, fin **19:10:38.380**, fichier de résultat SHA `997c812d52565f14cc06e1b36335d32bc263a5a5b868fe22b6f2ee65ca20f7ee` ; **full 79 006 ms**, fin **19:14:50.352**, SHA `950909098ce433eb760f4b162ca916fbc2b2ad4603d48fd5860a94d0421561d3`. Les anciens builds TS7006 échoués sont conservés. **861 unitaires est le dernier total confirmé antérieur ; leur relance finale après annotations est en cours au signalement, pas annoncée réussie par anticipation.** Ces processus ne sont pas du temps UI actif.

Journal arrêté à **19:30:00 UTC** : **1 807 lignes**, dernière fin 19:29:33.241. Café **785 lignes / 529 UI / 518 retours / 11 erreurs**, restaurant **591 / 352 / 347 / 5**, Bar **429 / 238 / 231 / 7** ; deux observations sans société. Appels click tous résultats/retournés : **337/328, 225/221, 149/143**. Les lectures réseau et notes d'instrumentation ne deviennent pas des clics ou captures réussies. Les anciens IDs en collision restent inchangés.

**Prochaine priorité : restauration finale incluant ces ventes/clôtures et comparaison des CSV téléchargés ; droits fins et réponse Robi encore non qualifiés. Cinq heures actives non attestées, T100 partiel, aucun rôle intégralement qualifié.**

## Point historique conservé — 21:00 Europe/Luxembourg

**POINT INTERMÉDIAIRE — CAMPAGNE NON LIVRÉE.** Coupure des actions métier : **17 octobre 2026, 21:00 Europe/Luxembourg / 19:00:00 UTC**. Dernier événement métier retenu : position 1677, fin 18:58:43.212 UTC. Les métadonnées réseau relues rétrospectivement à 19:04–19:08 UTC sont séparées : ce sont des lectures de requêtes déjà enregistrées, **pas de nouveaux clics ou envois ajoutés avant la coupure**.

Ce document consolide des preuves existantes. Il ne déclenche ni Chrome, API, SQL, test, service, paiement, nettoyage ou Git. Bases et comptes de laboratoire fictifs uniquement ; profil `CREORGA_BUSINESS_ONLY`. Aucun identifiant de connexion, QR/capacité, jeton, en-tête d'authentification, adresse de destinataire ou note libre n'est publié.

## 1. Portée des verdicts

- **PASS** : le critère étroit de la ligne est étayé par l'action UI et son résultat, la requête réellement enregistrée et la persistance pertinente. Pour un refus de lecture, aucune écriture métier n'est attendue ; le rôle réel et le refus HTTP sont les preuves pertinentes.
- **FAIL** : un résultat contraire à l'attendu est reproduit. Une correction source ou un test PG ultérieur ne transforme pas ce parcours RED en GREEN Chrome.
- **BLOCKED** : preuve nécessaire, matériel, décision, fonction ou rejeu final manquants. Cela ne signifie pas automatiquement que la fonction est absente ou défectueuse.

Ces verdicts qualifient **22 critères sélectionnés**, pas 22 écrans entiers, rôles, obligations fiscales ou scénarios T01–T100. **14 PASS / 2 FAIL / 6 BLOCKED** dans ce registre ne remplacent pas la matrice globale historique. Le relevé ancien « 55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN » reste historique ; son zéro FAIL ne nie pas les défauts nouvellement reproduits ici. Aucun nouveau statut global T100 n'est écrit par ce volet.

Les preuves PG portent `OBSERVATION_ONLY_NOT_UI_PASS` ; la preuve HTTP indique `noScenarioPassInferred`. **Aucun verdict n'est tiré de ces fichiers seuls** : les jointures de preuve ci-dessous sont nécessaires. Une requête est référencée par **page + reqid**, jamais par un numéro seul. Les URLs sont remplacées par des routes gabarits sans identifiants privés.

## 2. Sources et méthode de rapprochement

Sources UI : journal privé append-only, position physique, horodatage, opération, page et hash d'événement. Les anciens IDs numériques en collision ne sont ni corrigés, ni pris pour des actions distinctes supplémentaires. Le hash enregistré d'événement n'est pas le SHA des octets de sa ligne. Cette synthèse ne certifie pas toute la chaîne du journal.

Source HTTP complémentaire publique : [requêtes cibles réellement relues dans Chrome](preuves/intensive-http-cibles-2026-10-17-2108.json), créée à **19:08:09.262 UTC**, SHA-256 du fichier `cfa82392e00e8ac0f10dcaa120379336eefcdcb336b3f3cc029ae35643d483c1`. Elle couvre sept requêtes ciblées des pages 7/9/10/12/13 ; les autres requêtes proviennent des extraits réseau datés du journal. Aucun corps ou cookie n'est copié dans ce document.

Les alias F-B1 / A-B1 désignent la facture et l'avoir fictifs du restaurant ; ils ne sont pas des identifiants utilisables pour se connecter. Les relations sont vérifiées dans les relevés privés sans publier leurs valeurs techniques.

| Preuve privée / alias | Observation UTC | SHA-256 des octets du JSON |
| --- | --- | --- |
| P-A1 — `cafe-stock-reception-1.json` | 11:08:34.334 | `ae6b74679a4c5ecd0a23dfa53f23b6077c03982c6fbc9d7fa81bc008121a85a0` |
| P-B1 — `restaurant-facture-avoir-remboursement-1.json` | 18:56:06.066 | `fc09f1941077fd24d96a0409191aa1768117b711881d53569df5b5c1f62d4066` |
| P-B2 — `restaurant-qr-ancien-commande-apres-paiement-red-1.json` | 18:48:07.152 | `a6ea657d1c7b4d0114126e3bc5b0f0a97b75dc3a8401f69d952eb0bd447fc292` |
| P-C1 — `bar-qr-deux-tournees-haccp-avant-rejeu-1.json` | 18:59:42.599 | `a68cd7af41944c83c46b1df6af9c412bfd72d499873be71f62d78fa55f87cda3` |
| P-C2 — `bar-nuit-conge-doubleclic-1.json` | 18:43:09.551 | `f75b026a93323bf5390c2b767db46871b40b39943d4bf529f0ef22ac81da47c3` |
| P-C3 — `bar-planning-local-mime-v2-confirmed-reference-1.json` | 18:53:27.003 | `d69f72916867082e70dc12c9e9aa7a6d7167e49010f3731261c654629e39048d` |
| P-B3 — `restaurant-planning-local-mime-v2-confirmed-reference-1.json` | 18:53:27.024 | `09ba444f2ebfbdd1450f616774249ec3512ee86bec87a9c64922847c56a35471` |
| P-PDF — rapport technique d'extraction, commencé à 18:55:59.751 | fin 18:56:01.874 | `ceb3c57e38fc06e0f4c8f2ea71d6cc6315167357e90c6ce6193c82f6d48b1f17` |

Ces hashes de fichiers ne sont pas les empreintes canoniques compactes sorties par le collecteur. Les EML et références PG des deux rapports MIME confirmés existent et leurs empreintes concordent ; leur contenu et leurs chemins privés ne sont pas publiés.

### Ancrages d'événements privés, sans contenu d'accès

Les temps ci-dessous sont les **fins d'événement UTC**. Ils permettent de retrouver les actions et l'extrait HTTP dans le journal conservé, indépendamment des anciens compteurs non uniques.

| Critère / repère | Position ; fin UTC ; opération ; page | Hash d'événement enregistré |
| --- | --- | --- |
| A01 réception | 336 ; 11:08:13.757 ; click ; 2 | `079a0ea6801e03f78aca06e3f4851407708996b4fe37d3003b9ef27cb93a8914` |
| B01 facture depuis ticket | 1636 ; 18:47:49.324 ; click ; 11 | `66403209b43e38967e7cae98d7c63c8e683678e5e75b52981b3009b030640b89` |
| B03 avoir double clic | 1647 ; 18:50:26.681 ; click ; 11 | `8e090d022cdc0ae6e44f279922a4a5dc925baaa0b43fad6a61ea076ef8916839` |
| B04 remboursement déclaré | 1655 ; 18:51:36.802 ; click ; 11 | `349714bb9433bb4d5aefc9092c216edb67fcbaf05eb1d1e78152d7a719613de3` |
| B07 nouvel envoi ancien QR | 1608 ; 18:42:41.895 ; click ; 6 | `7454e6bfa1aa4820f320d37a615785602bfad992854909a4c9568e4edb937394` |
| C01 création nuit | 1543 ; 18:34:34.576 ; click ; 7 | `c56719ff8f62961678093a86fedd25087a595f58c8f745b8a6153b60bdeff36c` |
| C02 congé double clic | 1607 ; 18:42:35.056 ; click ; 10 | `43c05f0047dc2ee79f0647c7066392b44670d281b8842f18b4de355406f669a4` |
| C03 publication de nuit | 1550 ; 18:35:40.320 ; click ; 7 | `b330af059146fccc2ec12c83148514c53a6a4d3178395230193e1fad882e4d45` |
| C05 nettoyage manuel | 1667 ; 18:55:02.695 ; click ; 13 | `3e34e45f3c3fc9d82f8b42527149f0c6838e130bd5ec7fd06bd99723feb88afc` |
| C07 première tournée QR | 1645 ; 18:50:16.997 ; click ; 12 | `4f802fd42cbe491460ed6b51d5bcac33fee1c16718491bf80d37492cbaa8f378` |
| C08 deuxième tournée QR | 1675 ; 18:57:29.215 ; click ; 12 | `cdd0175db396e424e1b437c2f2b11dc14f812996cf4bc60823d8c40d721103c2` |
| C11 détail du refresh | 1670 ; 18:55:33.186 ; get_network_request ; 9 | `3ff46eafc55b0e89b382861e9be7994bd0261d5be18d4894df0ffb714fbf5971` |
| HTTP documentaire B01–B05 | 1664 ; 18:53:39.650 ; list_network_requests ; 11 | `3a6bcb26daa3685b778b1f7fe6db845be069f5147ef16ae0d848d5760bd3a1b1` |

## 3. Registre des critères exécutés et de leurs limites

### Café : reprise d'une preuve historique, pas nouvelle exécution

| ID | Action UI / rôle | HTTP réellement observé | PostgreSQL / attendu → observé | Verdict et portée |
| --- | --- | --- | --- | --- |
| A01 | OWNER, double clic réception de 3,5 kg ; stock initial compté 1,5 kg, rechargement. UI 336–337 ; réseau 339, page 2. | Création du bon req. 2084 **POST /api/inventory/purchase-orders 201** ; réception req. 2091 **PUT /api/inventory/purchase-orders/:id/receive 401**, refresh 2092 **200**, reprise 2093 **200**. | P-A1 : `PurchaseOrder`, `PurchaseOrderItem`, `Ingredient` de la même société ; une réception de 3,5 et `currentStock = 5 kg`, pas 8,5 kg. | **PASS**, réception/reprise ciblée à 11:08. Pas nouveau test sur le binaire de 21:00, pas consommation matière par recette ni inventaire physique. |

### Restaurant : documents, remboursement et frontière QR

| ID | Action UI / rôle | HTTP réellement observé | PostgreSQL / attendu → observé | Verdict et portée |
| --- | --- | --- | --- | --- |
| B01 | MANAGER, facture société depuis le ticket fusionné existant, UI 1636/page 11. | Réseau 1664 : req. 220 **POST /api/invoices/from-pos/:saleId 201**. | P-B1 : **1 Invoice**, `sourcePosSaleId` appartient aux **3 Sale** déjà présentes ; **3 150 TTC / 3 058 HT / 92 TVA cents**, pas une quatrième vente. | **PASS**, lien facture–vente et absence de vente supplémentaire dans ce cas. Pas conformité fiscale générale. |
| B02 | MANAGER, émission du document sélectionné, UI 1639 puis original ouvert en 1643/page 11. | Req. 225 **PUT /api/invoices/:invoiceId/status 200** ; lectures suivantes de la facture. | P-B1 : F-B1 **PAID**, PDF émis de **13 129 octets**, empreinte stockée = réelle. Le paiement est celui de la vente liée, pas un nouveau débit bancaire. | **PASS**, émission/persistance ciblée. La qualité légale des mentions reste séparée. |
| B03 | MANAGER, avoir partiel **6,10 EUR**, double clic, UI 1646–1648/page 11. | Req. 235 **POST /api/invoices/:invoiceId/credit-notes 401** → refresh 236 **200** → reprise 237 **201**. | P-B1 : **1 CreditNote**, liée à F-B1 ; **610 TTC / 592 HT / 18 TVA cents**, une pièce numérotée, toujours 3 ventes. | **PASS**, émission unique et lien/taux de ce cas malgré renouvellement. Ne pas présenter le 401 initial comme un second avoir. |
| B04 | MANAGER, remboursement espèces déclaré **6,10 EUR**, double clic, UI 1654–1655/page 11. | Req. 246 **POST /api/payments/manual-refunds 201**, puis lecture 247 **200**. | P-B1 : **1 ManualRefund**, lié à A-B1 et au tender CASH d'origine de **610 cents**, `cashMovementId` renseigné ; sortie caisse **610**, théorique **26 960 cents**. | **PASS**, une déclaration et son mouvement. Jamais preuve d'argent réellement remis ni remboursement prestataire. |
| B05 | MANAGER, original A4 ouvert, UI 1656/page 11 ; lien au PDF émis. | Req. 252 **GET /api/invoices/:invoiceId/pdf 200**. Relecture technique P-PDF : API A4 200 et binaire égal à `Invoice.issuedPdf`. | P-B1/P-PDF : **13 129 octets**, SHA identique API/PG `ed178cbb0dcb6886b8d7f3fa0ec46d474bfb41d67280f0b0165a84781aed6e74`. Mais `chromeDownloadCompared = false`. | **BLOCKED** pour comparaison du fichier réellement téléchargé par Chrome. Le vrai PDF et l'égalité API/PG sont prouvés, pas ce dernier contrôle navigateur. |
| B06 | MANAGER, rendus 58/80 mm demandés dans l'UI, 1672–1673/page 11. | P-PDF : relecture API complémentaire **200**, `application/pdf`, 58 mm **13 625 octets**, 80 mm **13 426**, une page chacun. | Même contenu documentaire figé ; aucun nouveau mouvement de caisse. Le coordinateur observe la lisibilité à l'écran ; P-PDF ne certifie pas cette inspection visuelle. | **BLOCKED** pour impression physique et qualification matérielle. Pas de papier, massicot, tiroir, fin de rouleau ou comparaison fichier Chrome prouvés. |
| B07 | Client QR, après solde final, panier puis nouvel envoi à **6,50 EUR**, UI 1573/1583/1608/page 6. | Écriture observée par le coordinateur ; l'extrait réseau 1611 est paginé et ne conserve pas son POST dans le segment relu. Ne pas inventer son reqid. | P-B2 puis P-B1 : nouvelle `Order GUEST OPEN` **650 cents**, non payée/non finalisée, alors que les quatre commandes antérieures sont PAID. L'envoi depuis l'ancien accès a donc persisté. | **FAIL**, frontière de visite après paiement. Le défaut n'est pas une double vente déjà encaissée ; la commande fictive de preuve n'est pas effacée. Lacune d'extrait HTTP explicitée. |
| B08 | Rejouer l'ancien QR après la correction de fermeture atomique des visites et paiement complet. | Pas de nouvelle action Chrome GREEN sur le binaire corrigé à la coupure. | **17 tests PG ciblés réussis**, puis 295 PG globaux ; cas de concurrence, rejeu et rollback testés en laboratoire. Ce n'est pas un nouveau résultat UI. | **BLOCKED**, build/rejeu Chrome final nécessaire. Ne pas convertir B07 en PASS depuis le code ou ces tests. |

### Bar : RH, QR, stock et rôle employé

| ID | Action UI / rôle | HTTP réellement observé | PostgreSQL / attendu → observé | Verdict et portée |
| --- | --- | --- | --- | --- |
| C01 | OWNER, créneau nuit **17/10 23:00 → 18/10 03:00**, section Bar, UI 1542–1543/page 7. | Page 7 req. 298 **POST /api/hr/shifts 201**, métadonnées conservées dans la preuve publique 21:08. | P-C2/P-C1 : **1 Shift CONFIRMED**, **17/10 21:00Z → 18/10 01:00Z**, quatre heures ; rôle et société attendus. | **PASS**, persistance d'un créneau traversant minuit. Pas changement d'heure saisonnier ni calcul de paie qualifié. |
| C02 | EMPLOYEE, congé du **24 octobre**, double clic 1607, reload 1610 et carte relue 1612/page 10. | Req. 163 **POST /api/hr/leave-requests 201**, un seul envoi ciblé enregistré, preuve publique 21:08. | P-C2/P-C1 : **1 LeaveRequest VACATION PENDING**, début/fin le 24/10, adhésion de la société ; pas deux demandes. | **PASS**, création unique/rechargement. Ni approbation, solde légal ni ACL fine qualifiés. |
| C03 | OWNER, publication planning vers capture SMTP locale, UI 1550/page 7. | Req. 306 **POST /api/hr/planning/publish 200**, puis EML local réellement capturé. | P-C3 : destinataire attendu, société, date de début, heures, rôle, section et Shift CONFIRMED concordants ; **date de fin de nuit non explicite**. | **FAIL** sur clarté du créneau nocturne dans le message. Le 200 ne prouve ni contenu correct à lui seul, ni réception Internet. |
| C04 | Rejouer publication/capture après correction du rendu de dates nocturnes. | Pas de nouvel envoi UI/MIME GREEN sur le binaire final à la coupure. | Source corrigée et tests existants ; l'EML de C03 reste la preuve RED originale. | **BLOCKED**, nouvelle publication en boîte locale et vérification MIME nécessaires. Aucun SMTP réel autorisé par ce statut. |
| C05 | Cinquième compte EMPLOYEE, contrôle de nettoyage manuel, UI 1666–1667, reload 1676/page 13. | Req. 55 **POST /api/haccp/logs 201**, preuve publique 21:08. | P-C1 : **1 HaccpLog CLEANING**, `source = MANUAL`, **value = null**, auteur membre de la bonne société ; carte conservée après reload. | **PASS**, saisie manuelle sans mesure inventée. Pas capteur, relevé de température ou certification HACCP. |
| C06 | OWNER crée une visite de Table 2, puis ouvre le lien réellement obtenu en contexte QR distinct, UI 1622–1623/1630. | Page 7 req. 346 **POST /api/guest-visits 201**, req. 347 **POST /api/guest-visits/:visitId/link 200**, capture rétrospective 1678. | P-C1 : **1 GuestVisit / 1 GuestVisitAccess**, rattachés au bar ; les commandes ci-dessous appartiennent à cette visite. | **PASS**, création et association ciblée ; QR/capacité non publiés. Pas preuve de toutes les frontières intergroupes. |
| C07 | Client QR, deux pils de 25 cl puis **double clic envoi**, UI 1645/page 12. | Req. 118 **POST /api/guest/orders 201**, preuve publique 21:08 ; événement client 119 **202** = télémétrie, pas deuxième commande. | P-C1 : une commande GUEST **960 cents**, ligne de quantité **2**, OPEN, paid 0 ; pas deux commandes à 960. | **PASS**, premier envoi unique dans ce double clic ciblé. |
| C08 | Même visite QR, deuxième tournée d'un tonic, UI 1671/1674–1675/page 12. | Req. 303 **POST /api/guest/orders 201** ; événement client 304 **202** distinct. | P-C1 : deuxième commande **360 cents**, OPEN, paid 0 ; **960 + 360 = 1 320 cents** restant dû dans cette visite, séparé de la vente POS. | **PASS**, seconde tournée conservée sans être une seconde vente finalisée. |
| C09 | Contrôler les conséquences des deux commandes QR encore impayées de C07/C08. | Mêmes envois HTTP de C07/C08, pas un nouveau clic ou paiement inventé. | P-C1 : deux `inventoryDebitedAt = null`, toujours **1 Sale POS de 2 484 cents** ; stocks **98 / 79 / 59 / 19**, pas de débit anticipé supplémentaire. | **PASS**, invariant de non-finalisation/non-débit à cet instant ; aucune disponibilité réelle de stock ni future concurrence qualifiée. |
| C10 | Autre EMPLOYEE ouvre Comptabilité, refus visible, UI 1461–1462/page 10. | Réseau 1463 : lecture de caisse **403**. | `UserCompany` donne bien le rôle EMPLOYEE ; aucun writer métier attendu pour ce GET. Les comptes existent, pas de rôle « limité » distinct. | **PASS**, refus ciblé. Pas audit exhaustif des documents ou de toutes les finances accessibles. |
| C11 | Session MANAGER POS continue naturellement ; renouvellement contrôlé en page 9, détail 1670. | Req. 294 **POST /api/auth/refresh 200** ; preuve publique 21:08. Le coordinateur observe Cookie présent et `sec-fetch-site = same-site`, protections Secure/HttpOnly/Lax conservées, sans valeurs publiées. | Lecture d'état de session, pas d'écriture financière attendue ; le logout ultérieur req. 439 **200** est distinct et correspond au reverrouillage d'inactivité. | **PASS**, renouvellement naturel de ce cas. Les flags sont un constat du coordinateur, pas des en-têtes publiés ; ni MFA, ni tous les changements de société/rôle qualifiés. |

### Contrôles restant explicitement bloqués

| ID | Action / attendu | Preuves disponibles | Verdict |
| --- | --- | --- | --- |
| X01 | Tester un ADMIN métier distinct et une véritable ACL « sans finances / accès limité ». | Modèle réel : **OWNER / MANAGER / EMPLOYEE**. Les trois identités EMPLOYEE sont distinctes, pas trois contrats d'autorisation. Décision utilisateur non obtenue. | **BLOCKED — NOT IMPLEMENTED** pour ces droits distincts. Les refus ciblés ne créent pas la fonctionnalité. |
| X02 | Restaurer une copie incluant les toutes dernières ventes, facture, avoir, remboursement, demandes RH et commandes QR. | Restauration **19:57 Luxembourg** prouvée mais trop ancienne. À **21:00:00**, nouvelle restauration en cours ; sa fin et la copie de code annoncées après cette coupure ne sont pas anticipées ici. | **BLOCKED à la coupure** pour cette comparaison finale ; aucune archive effacée ni rotation exécutée par ce volet. |

## 4. Rapprochement des montants, sans double chiffre d'affaires

| Établissement | Ventes finalisées | Documents / remboursements distincts | Ouvert / caisse |
| --- | --- | --- | --- |
| Café, historique rapproché | **21,10 TTC = 20,03 HT + 1,07 TVA**, 4 ventes | Facture 10,25 ; avoirs 10,25 ; remboursements déclarés 10,25. Ne pas ajouter les factures aux ventes. | Caisse théorique 106,85 / comptée 106,80 / écart −0,05 motivé, clôture historique ; aucun nouveau parcours café ici. |
| Restaurant à 18:56 | **78,00 TTC = 75,11 HT + 2,89 TVA**, 3 ventes / 4 commandes payées | Facture depuis ticket **31,50**, avoir **6,10 = 5,92 HT + 0,18 TVA**, remboursement CASH **6,10** lié. L'avoir et la sortie ne réécrivent pas les ventes originales. | Nouvelle commande QR de preuve **6,50 OPEN**, pas vente. Caisse PG **200 + 75,70 cash − 6,10 sortie = 269,60 EUR**, non comptée/non clôturée ; carte déclarée 2,30 séparée. |
| Bar à 18:59 | **24,84 TTC = 22,46 HT + 2,38 TVA**, 1 vente POS | CASH 10 + CARD 14,84, `manual_declaration`. Pas de facture/avoir/remboursement bar dans ce relevé. | QR **13,20 OPEN**, pas chiffre d'affaires finalisé supplémentaire ; caisse théorique **110 EUR**, pas comptage/clôture. |

Le calcul documentaire signé restaurant **78,00 − 6,10 = 71,90 EUR** n'est ni une nouvelle écriture réalisée par ce rapport, ni une certification d'export comptable. Les frais/versements bancaires, conformité fiscale et stock physique ne sont pas validés. La remise globale et l'offert du bar restent agrégés ; leur ventilation fiscale historique doit être qualifiée séparément, sans réallocation silencieuse depuis le catalogue actuel.

## 5. PDF et MIME : preuves complémentaires, limites séparées

P-PDF est une **relecture API complémentaire à des boutons réellement utilisés**, avec session technique de test distincte puis logout ; il porte `API_SQL_REREAD_VERIFIED_NOT_UI_PASS`, `documentUnchanged = true`, `chromeDownloadCompared = false`, `visualLayoutChecked = false`, `printingChecked = false`. L'A4 renvoyé et le binaire PG ont le même SHA ; les rendus 58/80 mm sont des PDF applicatifs, pas un faux substitut généré par l'audit. Le coordinateur a vu leur lisibilité à l'écran ; cela reste distinct du rapport technique et d'un tirage thermique physique.

MIME : **les références corrigées** P-C3/P-B3 sont utilisées, pas les premiers rapprochements de destinataire mal référencés. Les premières sorties restent conservées mais ne prouvent pas une fuite de documents. P-B3 restaurant n'a plus d'écart de contenu sur ses champs contrôlés ; P-C3 bar garde uniquement `OVERNIGHT_END_DATE_NOT_EXPLICIT`. Les deux indiquent **providerDeliveryProven = false / mailboxReceptionProven = false**. Une capture SMTP de laboratoire ne prouve pas une distribution Zoho, une lecture ou l'envoi à un vrai destinataire.

## 6. Tests techniques conservés, sans substitution aux clics

Les résultats suivants sont relus, **pas relancés pour cette synthèse** :

| Suite / dossier de preuve privé | Fin UTC | Résultat |
| --- | --- | --- |
| `validation-backend-unit-1792263473131-AoO9A1` | 18:58:30.271 | **391/391**, source stable, exit 0. |
| `validation-web-unit-1792263262245-wdaJhe` | 18:54:54.858 | **349/349**, source stable, exit 0. |
| `validation-pos-unit-1792263486406-ohbCyV` | 18:58:25.187 | **121/121**, source stable, exit 0. |
| `validation-integration-1792263274696-qJHwaU` | 18:56:50.192 | **295/295 PG**, source stable, exit 0. |

**861 unitaires + 295 PG**, pas 1 156 parcours Chrome. Les 17 tests PG de fermeture de visite sont inclus dans les 295, pas ajoutés encore une fois. Les tests des suggestions métier de Robi ne sont pas un rejeu Chrome de la correction.

Premières relances préservées : backend `validation-backend-unit-1792263262208-iktTkm`, **287/391**, 104 assertions échouées ; POS `validation-pos-unit-1792263262213-DWo7lb`, **119/121**, deux échecs. Parmi les 104 backend, **87 mentionnent EACCES, 6 EPERM, 11 aucun de ces codes** ; les deux POS mentionnent EACCES. Les relances gardées avec l'environnement autorisé réussissent ; aucune preuve n'est effacée et les onze autres messages ne sont pas rétrospectivement tous déclarés diagnostiqués. Ce constat ne signifie pas qu'il n'y avait jamais de défaut logiciel.

### Complément technique postérieur à la coupure des actions

Lors de la consolidation rétrospective, le coordinateur signale **deux builds échoués**, préservés : les quatre frontends compilent dans les deux profils, mais le backend rencontre **TS7006 dans quatre callbacks de nouveaux tests QR**. Quatre annotations de type de test sont ajoutées dans le lot source ; `tsc`, PG et rebuild sont en cours au moment de ce signalement. **Aucun succès de cinq applications, nouveau runtime ou GREEN Chrome n'est anticipé dans ce document.** Les compilations réussies de 20:06 restent historiques et ne valident pas ces fichiers ultérieurs. Revue indépendante des frontières d'accès encore en cours.

## 7. Journal, coverage et reprise

À la coupure des actions : **1 677 lignes** retenues, dont une observation initiale sans société. Ce sont des compteurs de journal, pas de clics physiques certains ou de contrôles uniques :

| Société | Lignes | Événements UI | Retours / erreurs UI | Appels `click` / retournés | Observations |
| --- | --- | --- | --- | --- | --- |
| Café | 785 | 529 | 518 / 11 | 337 / 328 | 256 |
| Restaurant | 547 | 326 | 321 / 5 | 208 / 204 | 221 |
| Bar | 344 | 189 | 182 / 7 | 118 / 112 | 155 |

Les captures HTTP conservées après 19:00 ne sont pas ajoutées à ces compteurs. Leurs horodatages de lecture ne sont pas l'heure d'émission des requêtes. L'inventaire des **3 697 contrôles source** n'est pas intégralement exécuté ; **cinq heures actives ne sont pas attestées** par l'amplitude des dates, les tests ou les attentes. Aucun rôle intégralement qualifié. Voir la [couverture par rôle actualisée](INTENSIVE-COUVERTURE-PAR-ROLE.md) et les rapports [café](RECETTE-CAFE-2026-10-17.md), [restaurant](RECETTE-RESTAURANT-2026-10-17.md), [bar](RECETTE-BAR-2026-10-17.md).

Reprise prioritaire : finir les contrôles de compilation et de restauration à leur date réelle ; rejouer ancien QR après fin de table sur le nouveau binaire ; republier le planning nocturne et recontrôler l'EML ; qualifier rôles/écrans/documents restants, téléchargements Chrome et matériel autorisé. Préserver les commandes RED et archives. **Aucun déploiement, banque réelle, changement de master ou déclaration de qualification de production.**
