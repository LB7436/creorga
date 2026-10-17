# Recette établissement A — CAFÉ DU CENTRE

## Consolidation technique postérieure au relevé de 21:30

Les [preuves finales v3](preuves/intensive-validation-finale-2026-10-17-2135-v3.json) confirment **861 unitaires / 295 PG / 47 fixtures**, deux builds finaux et la restauration de **21:31:36.908 Luxembourg : 81 tables, 10 083 lignes, 14 fichiers, 26 PDF, zéro écart**. Cette nouvelle preuve permet X02 PASS ciblé ; elle ne rejoue pas les rôles du café. La correction de clé de diagnostic dans v3 ne change pas les données : les **deux pointages ouverts historiques** restent conservés. Aucun contrôle non exécuté n'est promu ; CSV/matériel/banque/droits fins restent distincts. **Campagne PARTIELLE — NON LIVRÉE**, cinq heures actives non attestées.

## Complément — 17 octobre 2026, 21:30 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Relecture PG `cafe-relecture-finale-1.json`, **19:28:23.937 UTC**, SHA des octets `d8750eeca5485b26e06f091dcd2d6a389b01fdc580fa5e60112940a7dad178d4` : toujours **4 ventes, 21,10 TTC / 20,03 HT / 1,07 TVA**, documents/remboursements et clôture inchangés. Deux pointages ouverts du même groupe doublon **historique** restent conservés ; ce ne sont pas deux nouvelles entrées et aucun nettoyage n'est effectué.

Cette relecture n'est pas un nouveau parcours café ni un PASS de rôle. Les nouveaux GREEN restaurant/Bar, builds et preuves sont dans le [registre complété](TRACABILITE-UI-API-PG-2026-10-17.md). Restauration finale encore attendue à ce point ; T100 partiel, cinq heures actives non attestées, aucun rôle complet ni déploiement.

## Point documentaire — 17 octobre 2026, 21:00 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Coupure des actions **19:00:00 UTC** ; aucun nouveau service café n'est exécuté pour cette rédaction. Le [registre UI → HTTP → PG](TRACABILITE-UI-API-PG-2026-10-17.md), critère **A01**, rapproche la réception historique par double clic : UI 336–337/page 2, réception HTTP 401 → refresh 200 → reprise 200, puis **1,5 + 3,5 = 5 kg** dans PostgreSQL. Son **PASS ciblé est historique à 11:08**, pas un rejeu sur le dernier code ni une couverture complète du stock.

Le bilan financier/clôture et les lacunes par rôle ci-dessous sont conservés. Les nouveaux résultats **861 unitaires / 295 PG** sont des exécutions techniques datées, pas une nouvelle campagne café ; les premiers échecs et les blocages de compilation ultérieurs restent documentés dans le registre. À la coupure, la restauration actualisée est en cours : l'ancienne copie de 19:57 ne valide pas les nouvelles écritures B/C. Pas de qualification de production, de T100 intégral, de cinq heures actives attestées ou de rôle complet.

## Point de reprise — 17 octobre 2026, 20:29:27 Europe/Luxembourg

**POINT INTERMÉDIAIRE — PARTIEL — NON LIVRÉ.** Nouvelle coupure : **18:29:27 UTC**. Les relevés de 19:57 et 19:30 conservés ci-dessous ne sont pas réécrits. Aucun parcours café supplémentaire n'est retenu : les quatre ventes à 21,10 EUR, documents, remboursements déclarés et clôture restent les constats antérieurs, pas un nouveau rejeu sur le binaire actuel.

Depuis le précédent point, le coordinateur rapporte **deux profils compilés, cinq applications chacun**, puis un démarrage normal du profil métier, PID 43260 vers **20:06 Luxembourg**. La preuve `validation-local-1792260327936-pzpr8V/result.json`, achevée à **18:05:29.754 UTC**, confirme **47/47 tests de fixtures locales**, zéro échec, exit 0. Ce sont des tests d'artefacts, de politique d'origine, de runtime et de sauvegarde, **pas 47 parcours café**. Les **838 unitaires + 278 PG de 19:47–19:49** restent datés **avant la dernière modification de politique d'origine** ; ils ne sont pas présentés comme relancés sur tout le code final. La restauration **81 tables / 9 609 lignes / 14 fichiers / 24 PDF** reste celle de **19:57:26**, pas une nouvelle restauration après les derniers encaissements du bar.

Le [registre des anomalies, prolongé au même instant](ANOMALIES-MISSION-MAITRE-2026-10-17.md) distingue les nouveaux essais du bar et les limites du refresh, de Robi et de l'allocation des gestes commerciaux. Les succès du bar ne deviennent pas une qualification des comptes et documents du café. Aucun rôle intégralement qualifié, aucun nouveau PASS T100, aucune durée de cinq heures actives établie ; **campagne toujours en cours**.

## Actualisation — 17 octobre 2026, 19:57 Europe/Luxembourg

**PARTIEL — NON LIVRÉ.** Coupure des parcours UI : **17:57:00 UTC**. Les relevés précédents sont conservés plus bas avec leur propre coupure ; ils ne sont pas des parcours rejoués sur le nouveau code.

Le noyau financier fictif du café reste celui rapproché à **13:11:44.594 UTC** : **4 ventes, 21,10 EUR TTC / 20,03 HT / 1,07 TVA**, une facture de 10,25 EUR, deux avoirs totalisant 10,25 EUR et quatre remboursements **déclarés** totalisant 10,25 EUR (6,25 espèces + 4,00 carte). La caisse est clôturée avec 106,85 EUR théoriques, 106,80 comptés et −0,05 EUR justifié. Aucun nouvel encaissement, avoir, remboursement ou comptage café n'est déduit des travaux ultérieurs sur le restaurant et le bar.

Les nouvelles validations techniques collectées à **17:47–17:48 UTC** rapportent **838 tests unitaires** (370 backend + 347 web + 121 POS) et **278 intégrations PostgreSQL**, sans échec. Les fichiers de résultat portent `CONFIRMED_FRESH`, `countsMatch`, `fresh` et `sourceStable` vrais. Ce sont des exécutions du coordinateur relues pour ce document, **pas des tests relancés ici**, ni un nouveau passage des rôles du café dans Chrome. Les cas ciblés déjà inclus ne sont pas ajoutés une seconde fois à ces totaux. Voir le [registre des anomalies et preuves techniques](ANOMALIES-MISSION-MAITRE-2026-10-17.md).

Preuve complémentaire de reprise, **achevée après la coupure UI**, à **17:57:26.591 UTC / 19:57:26.591 Luxembourg** : `RESTORATION-2.0-mission-maitre-avant-build-20261017-1957.json`. La comparaison porte sur **81 tables, 9 609 lignes et 14 fichiers** ; PostgreSQL est égal, sans différence déclarée. Les PDF figés sont contrôlés dans les sous-champs `issuedPdf` : **14 factures + 10 avoirs = 24 PDF**, mêmes empreintes avant/après, zéro binaire manquant, en-tête non-PDF ou empreinte stockée incohérente. Les 9 361 ms mesurent cette exécution technique, pas un RTO métier validé. Aucune restauration nouvelle n'est exécutée pendant la rédaction.

Le journal reste inchangé pour le café : **785 lignes**, dont **529 événements UI** (518 retours / 11 erreurs d'outil) et 256 observations. Le nombre d'opérations retournées ne prouve ni clic physique unique, ni couverture T100, ni cinq heures de tests actifs. Les rôles OWNER/MANAGER/EMPLOYEE demeurent partiellement parcourus ; les ACL distinctes « limité » et « sans finances » restent **NOT IMPLEMENTED**.

À cette coupure, les corrections de concurrence des avoirs, du sélecteur de couverts, de l'origine API locale et des délais Robi ne sont **pas qualifiées par un rejeu Chrome complet du café**. Le build métier est encore en cours à la coupure : aucun succès de compilation ultérieur n'est anticipé ici. Le profil métier sans jeux est conservé ; aucun paiement bancaire réel, déploiement ou certification de production.

## Relevé historique conservé — coupure du 17 octobre à 19:30:03 Luxembourg

Tout le relevé ci-dessous décrit son instant historique ; les mentions de tests/reprise antérieurs ne remplacent pas l'actualisation ci-dessus.

**PARTIEL — NON LIVRÉ. Aucun rôle intégralement qualifié ; aucune qualification de production.**

Coupure documentaire : **17 octobre 2026 à 17:30:03 UTC / 19:30:03 Europe/Luxembourg**. Le journal inclus s'arrête au dernier événement achevé à 17:30:00.251 UTC. Les faits du café ci-dessous sont principalement ceux des parcours Chrome antérieurs à l'interruption et du relevé PostgreSQL de **13:11:44.594 UTC** ; ce rapport n'est pas un nouveau rejeu après les corrections ultérieures.

Profil `CREORGA_BUSINESS_ONLY`, laboratoire fictif. Consolidation en lecture seule des preuves existantes : **aucun clic, appel API/SQL, test, paiement, nettoyage, changement de rôle ou relance de service n'est exécuté pour ce rapport**. Aucun nouveau PASS n'est attribué à partir d'un relevé SQL ou du code.

Sources publiques : [rapport intensif daté](RECETTE-INTENSIVE-2026-10-17.md), [couverture par rôle](INTENSIVE-COUVERTURE-PAR-ROLE.md), [résultats intermédiaires](preuves/intensive-resultats-2026-10-17-1150.json), [journal expurgé 14:05](preuves/intensive-journal-2026-10-17-1405.json). Les anciennes formulations « café en cours » restent valables à leur date, pas comme négation d'une clôture ultérieure.

## 1. Périmètre et utilisateurs

Les relevés privés du café contiennent cinq adhésions internes : **un OWNER, un MANAGER et trois EMPLOYEE**, ainsi que les visites QR anonymes. Les identités fictives restent distinctes de celles du restaurant ; aucun identifiant d'accès ou lien QR n'est publié.

| Identité de recette / rôle réel | Parcours observés dans Chrome | Limite |
| --- | --- | --- |
| Patron / OWNER | Installation, société, tables/chaises, membres, produits/catégories, clients société, fournisseur/achat/réception, devis, facture depuis ticket, PDF/e-mail de test, avoirs, remboursements déclarés, rapports et comptage de clôture | Pas tous les menus ni tous les paramètres ; aucun essai bancaire ou comptage physique. |
| Administrateur d'établissement distinct | Aucun compte/contrat de permission distinct qualifié | **NOT IMPLEMENTED** comme nouveau rôle séparé ; ne pas présenter OWNER ou la console créateur comme un administrateur métier différent. |
| Responsable / MANAGER | Connexion indépendante, tarif catalogue et rechargement, équipe, planning, congés/approbation, publication locale | Pas qualification complète des annulations, remises, incidents et rapports. |
| Serveur / caissier / EMPLOYEE | POS, tables/couverts, articles/quantités/notes, transfert, préparation ciblée, acompte et solde mixte, reprise d'une réponse perdue, fermeture de table et journal | Déclarations d'argent fictif ; une table soldée ne vaut pas clôture de caisse autorisée au salarié. |
| Employé « limité » / EMPLOYEE | Refus de configuration, accès directs ciblés, congés, auto-approbation refusée, décision responsable relue, révocation/réactivation et pointage | ACL fine distincte **NOT IMPLEMENTED** ; ces refus ne prouvent pas tous les droits. |
| Employé « sans finances » / EMPLOYEE | Accès financiers ciblés, création de devis refusée, dossier personnel, pointages et conflit historique explicite | Lecture de documents financiers possible selon le modèle observé : ne pas annoncer une ACL « sans finances ». |
| Client QR anonyme | Contextes indépendants, menu/panier, deux commandes, addition, autre convive, langue, révocation/renouvellement, transfert, séparation ciblée ; vues 375/390/768/1440 et clavier ciblés | Paiement en ligne non configuré ; toutes les variantes, notes, fusions et exceptions ne sont pas couvertes. |

Les chiffres et détails par rôle sont développés dans la [couverture datée](INTENSIVE-COUVERTURE-PAR-ROLE.md). Un rôle observé sur plusieurs écrans reste **partiel**.

## 2. Rapprochement financier à 13:11:44.594 UTC

Preuve privée principale : `cafe-cloture-comptage-ui-1.json`, statut interne `OBSERVATION_ONLY_NOT_UI_PASS`. Il s'agit d'une lecture de persistance complémentaire aux parcours Chrome, pas d'un verdict UI autonome.

| Commande | Origine | TTC / HT / TVA en centimes | Payé / restant | État au relevé |
| --- | --- | --- | --- | --- |
| 1 | POS natif | 1 025 / 950 / 75 | 1 025 / 0 | Finalisée, débit produit enregistré une fois dans le parcours contrôlé. |
| 2 | QR | 260 / 252 / 8 | 260 / 0 | Finalisée. |
| 3 | QR | 700 / 680 / 20 | 700 / 0 | Finalisée. |
| 4 | QR | 125 / 121 / 4 | 125 / 0 | Finalisée. |
| **Total** | **4 ventes** | **2 110 / 2 003 / 107** | **2 110 / 0** | **Aucune commande ouverte ni solde restant dans ce relevé.** |

Soit **21,10 EUR de ventes brutes**, **20,03 EUR HT** et **1,07 EUR de TVA**. Ce total ne doit pas être augmenté d'une facture issue du même ticket.

| Objet distinct | Valeur persistée | Ce que cela ne signifie pas |
| --- | --- | --- |
| Facture émise liée au reçu | 1 document ; **1 025 c** | Pas une deuxième vente ou un deuxième encaissement. |
| Avoirs | 2 documents ; **1 025 c** au total | Pas un remboursement automatique ni une réécriture du reçu original. |
| Remboursements manuels déclarés | 4 ; **1 025 c** au total, dont **625 c espèces / 400 c carte déclarée** | Aucun remboursement bancaire vérifié ; pas de remise d'argent réel. |
| Prestataires | Zéro capture et zéro remboursement prestataire confirmés dans les totaux | Les tentatives stockées ne deviennent pas une attestation bancaire. |

Le rapport garde ventes, documents, encaissements et remboursements séparés ; il ne certifie pas un chiffre d'affaires net fiscal ou un export comptable.

### Clôture propriétaire

La clôture a été effectuée dans l'interface puis relue après rechargement ; le relevé conserve l'instant **13:11:37.673 UTC** :

| Élément | Centimes | EUR |
| --- | --- | --- |
| Fond initial fictif | 10 000 | 100,00 |
| Encaissements espèces déclarés | +1 310 | +13,10 |
| Sorties espèces liées aux remboursements | −625 | −6,25 |
| **Espèces théoriques** | **10 685** | **106,85** |
| Comptage fictif déclaré | 10 680 | 106,80 |
| **Écart compté − théorique** | **−5** | **−0,05** |

L'écart est justifié et le snapshot de clôture figé. Deux refus 422 sans motif ont précédé une saisie clavier prise en compte et le succès 200 rapportés. Le remplissage initial de l'outil n'avait pas alimenté l'état du textarea : cela n'est pas présenté comme une perte de données applicative démontrée. Le CSV a été cliqué, mais son fichier téléchargé n'est pas encore rapproché. Aucun comptage physique réel n'est attesté.

## 3. Stock et achats

Le catalogue initial à 10:20:41.385 UTC (`cafe-catalogue-1.json`) est rapproché au relevé final par les identités internes, non par une ressemblance de nom ; ces identifiants ne sont pas publiés.

| Produit fictif | Stock initial | Stock au relevé final | Variation |
| --- | --- | --- | --- |
| Espresso centre | 100 | 97 | −3 |
| Bière centre 25 cl | 60 | 59 | −1 |
| Eau plate centre | 50 | 46 | −4 |
| Sandwich centre | 20 | 19 | −1 |
| Gobelet centre | 100 | 100 | 0 |

La réception fournisseur et son rejeu ont été contrôlés dans le parcours documenté : **1,5 kg + 3,5 kg = 5 kg**. Le bon fictif de 63 EUR n'est pas une facture fournisseur payée. Les ingrédients et stocks produits restent deux chaînes : aucune consommation automatique de grains par recette ni inventaire physique n'est inventé.

## 4. Parcours, refus et anomalies conservés

| Parcours | Faits documentés | Statut limité / lacune |
| --- | --- | --- |
| Acompte puis mixte | Réponse perdue/reprise avec même référence, solde serveur, reçu final et stock rapprochés dans les preuves historiques | Observations ciblées, pas toutes les pannes ou tous les moyens de paiement. |
| Avoir dépassant le solde | Refus initial sans avoir ; même demande rejouée pour obtenir la preuve typée, choix explicite de modification puis deux avoirs valides | Ne pas effacer un pending incertain ; historique local d'échec ≠ audit serveur infalsifiable. |
| Remboursement déclaré trop élevé | Première demande refusée sur le tender réellement sélectionné ; choix de correction explicite puis déclarations valides | `NOT_RECORDED` ne prouve jamais qu'aucun argent n'a été remis hors logiciel. |
| Pointage double | Deux entrées historiques fautives conservées ; conflit explicite après correction, pas de clôture automatique | Les deux lignes ne sont pas nettoyées. Tous les cas de nuit et révocation restent à qualifier. |
| Clôture par EMPLOYEE | Refus serveur séparément étayé ; ancien dialogue natif de Chrome resté bloqué | **BLOCKED** pour cet ancien contrôle navigateur, sans contournement. La clôture OWNER ne le transforme pas en succès. |
| QR / groupes | Commandes, soldes, révocation et transferts/séparation ciblés reliés aux preuves de persistance | Pas couverture exhaustive des groupes, variantes et corrections après préparation. |
| PDF / e-mail | Original documentaire et capture SMTP locale contrôlés pour les cas rapportés | Pas réception Internet/Zoho, lecture du destinataire ou impression thermique physique. |

Principales preuves privées complémentaires : `cafe-acompte-ui-1.json`, `cafe-reglement-mixte-ui-1.json`, `cafe-facture-depuis-ticket-ui-1.json`, `cafe-avoirs-complement-ui-1.json`, `cafe-remboursements-declares-ui-1.json`, `cafe-pointage-double-readonly-2.json`, `cafe-closure-refusal-readonly-1.json`, `cafe-qr-solde-mixte-2.json`, `cafe-stock-reception-1.json`. Leur présence n'ajoute pas de scénario PASS.

## 5. Repères UI et volume réellement journalisé

Le journal privé est référencé par **position de ligne + hash d'événement enregistré + date/opération/page** ; les anciens compteurs numériques présentent des collisions. Les hashes ci-dessous ne sont pas des empreintes des octets complets des lignes. Le contenu brut, les identifiants de connexion et les capacités QR restent privés.

| Repère | Position ; début UTC ; opération ; page | Hash d'événement |
| --- | --- | --- |
| Solde mixte natif | 479 ; 11:39:10.943 ; click ; 3 | `f61d63e19c5a2d75cb097c4f193e5eaec39a172e7e9d7258d8971ab65439338b` |
| Commande QR | 569 ; 12:21:17.408 ; click ; 8 | `f0026c8fb0796f5afe1e58c85e78d283fe833e57d034985a3714dcc2dedbbc0a` |
| Ancien QR contrôlé | 605 ; 12:27:01.704 ; navigate_page ; 9 | `573d908ceb23476cc777cc41503ef14e74160ce845ab44f0a8b6fb1b099f4ddb` |
| Comptage propriétaire | 770 ; 13:11:30.278 ; click ; 7 | `07678dd031e02a4b0a340c68f4ea8d3b0629cd9d01c8eafd5a4f4a1a3ee720db` |

Au cutoff, **785 lignes de journal étiquetées café** : **529 événements UI** (518 retours d'outil et 11 erreurs d'outil), dont **328 opérations `click` retournées**, et 256 observations. Ce ne sont ni 328 clics physiques déduits — un double clic a sa propre sémantique — ni des contrôles T100 uniques ni des PASS. Ces chiffres incluent les fermetures de pages ; ils ne mesurent pas cinq heures actives et ne constituent pas une vérification intégrale de la chaîne de journal.

SHA-256 **des octets du fichier JSON privé** de clôture, recalculé en lecture seule : `563b45cfd260b3e866753f213f22d7c74d65882ad59c75a095406cd0365e9bd4`. Une empreinte canonique publiée ailleurs peut différer sans changement des données sémantiques ; les méthodes ne sont pas confondues.

## 6. Reprise et contrôles restants

La [validation historique 14:05](preuves/intensive-validation-2026-10-17-1405.json) rapporte une restauration globale de 81 tables/12 fichiers/24 PDF égaux, incluant l'état du café. Elle ne vaut pas rejeu de chaque rôle ni nouvelle restauration réalisée pour ce rapport.

À poursuivre : validations du code final sur A après les corrections ultérieures, droits complets par écran et accès direct, exports réellement téléchargés, incidents PG/réseau et reprise, stock/recettes et fonctions manquantes, matériels et prestataires autorisés. Les tests unitaires/PG déjà rapportés gardent leurs dates ; aucun total n'est relancé ou augmenté ici.

**Bilan : noyau financier ciblé du café rapproché et clôturé sur données fictives ; recette générale partielle. T100 inchangé, aucun rôle intégralement qualifié, campagne NON LIVRÉE.**
