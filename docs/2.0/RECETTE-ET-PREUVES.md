# Recette actuelle

## Dernière recette — sessions et rapprochement P0, 16 octobre 2026

Code : `6080a6a90fe864ad24f7b4565ee6988e56469fd4`, branche dédiée publiée, sans production.

- `run.mjs unit` : **401 / 401**, 264 backend, 89 web, 48 POS.
- `run.mjs integration` : **123 / 123**, treize fichiers, PostgreSQL réel et banques simulées.
  `service-sessions.integration.test.ts` (7) vérifie autorité, cache, concurrence, droits,
  acompte natif, transfert avec acompte, solde mixte, vingt rejeux, rollback salle/stock/tenders
  et QR réglé depuis sa commande. Les tests de remboursements passent de 9 à 12 ; les visites
  passent à 11 avec un test de verrous fondé sur `pg_locks` et une barrière, pas un délai supposé.
- `npm run build` : cinq applications compilées ; gros bundles existants non qualifiés en charge.
- Comparateur de reprise `--self-test` : 23 / 23, lecture seule.
- `BROWSER-P0-SUIVANT.json` : **15 observations**, Chrome neuf, loopback, comptes `.invalid`.
  Acompte 1 € puis 2,50 € mixtes, pertes de réponses après commit, reconnexion, trois affectations
  pour une commande et un reçu, monnaie exacte, remboursement motivé, HTML/CSV téléchargés,
  PDF d'avoir réel, aucune exception JavaScript. Trois largeurs, aucun débordement du panneau POS.
- PDF A4 d'avoir rendu avec Poppler et inspecté ; historique 3 %, références et montants lisibles.
  Pas d'imprimante/terminal. Baseline visuelle absente : **INCONCLUSIVE** ; pas de verdict de
  conformité d'accessibilité, aucune mesure Core Web Vitals complète ni de charge d'un service.
- `RESTORATION-2.0.json` : écrivains arrêtés, archive v2 + AES-GCM puis base neuve, **70 tables
  égales**, huit fichiers, huit PDF facture et sept d'avoirs valides. Avec données nouvelles :
  workspace 1, changements 20, sessions/couverts 6, tenders 18, provenances 6, déclaration 1.
  1 769 ms sur cette petite copie, pas un RTO ; médias absents, réserves PayPal vides dans l'archive.
- Après redémarrage des cinq services locaux, six vérifications de lecture réussies : autorité
  PostgreSQL, reçu retrouvé, couvert soldé absent, trois affectations exactes, remboursement
  et rapprochement retrouvés. Preuve privée distincte `RESTART-P0-SUIVANT.json`.

Échecs effectivement reproduits puis corrigés : autorité mémoire ancienne, sauvegarde concurrente
écrasante, endpoint d'acompte absent, rejouabilité parallèle, modification après acompte,
réinitialisation de préparation, nouvelle voie d'encaissement contournant le reçu POS, refus PayPal
non distingué, absence de déclaration de remboursement, cycle de verrous société/table QR.
Le parcours navigateur a révélé un couvert vide inclus dans la demande : il est désormais exclu.
Des corrections du script de recette (route CRM, reconnexion obligatoire, émission au statut déjà
réglé) ne sont pas présentées comme des corrections produit. Le limiteur de connexions a été observé,
pas désactivé en production pour faciliter la recette.

Non testé : sandbox PayPal/Stripe réel, banque, imprimante, panne électrique, charge en service,
profils historiques T04, transferts de visites QR non implémentés et rapprochement des versements.
La recette passée ne suffit pas à autoriser la mise en production. Détail et commandes :
`SESSIONS-ET-RAPPROCHEMENT-P0.md`. Les sections qui suivent conservent les preuves des lots antérieurs.

## Historique des lots précédents

## Référence du 16 octobre 2026

Référence actuelle du lot financier `dfb708a` : **395 unités** (260 backend, 89 web, 46 POS),
**112 intégrations PostgreSQL** dans douze fichiers, cinq compilations et 23 auto-contrôles du
vérificateur de restauration réussis. Les résultats ci-dessous sont les étapes historiques,
pas des tests supplémentaires à additionner. Aucun prestataire bancaire réel utilisé.

Suites concernées : POS 15, commandes 9, paiements 26, avoirs 8, remboursements 9, caisses 5.
Échecs reproduits avant correctifs : revente d'une ligne déplacée, copie QR/native,
plusieurs ouvertures concurrentes, remboursement sur la part d'une autre commande et
rapport fiscal ignorant les avoirs. Vingt appels concurrents et droits/sociétés testés.
Les huit tests de références UI préservent une demande incertaine ou corrompue ; l'export
navigateur possède désormais dix-sept tests, dont ces nouvelles références chiffrées.

`BROWSER-FINANCIAL-P0.json` : **17 observations** dans Chrome neuf, localhost, données fictives.
Acompte espèces puis solde carte déclaré, perte volontaire des deux réponses après commit,
rechargement et rejeu sans doublon, mouvement motivé, clôture 101 €, relecture figée,
CSV de caisse, avoir 3 € puis solde 8,70 €, vrai PDF, CSV documentaire et refus du faux net fiscal.
Captures 375/768/1440 ; PDF d'avoir rendu/inspecté. Zéro exception JS sur ce parcours.
Comparaison visuelle **INCONCLUSIVE** sans baseline ; axe, clavier complet, lecteur d'écran et
Core Web Vitals non qualifiés. Aucun test d'impression physique ou paiement bancaire.

Restauration du lot financier, applications arrêtées : **65 tables**, huit fichiers, sept PDF
de factures et six d'avoirs identiques/intègres après AES-GCM et restauration native dans une
base neuve ; 1 646 ms sur cette petite copie, pas un RTO. Huit affectations, quatre caisses,
trois mouvements. Les tables de provenances POS/remboursements sont vides dans cette archive,
leur persistance non vide étant éprouvée en intégration. Médias absents explicitement.
La rétention a retiré un ancien dump du laboratoire seulement ; originaux conservés.

Reproduction : `node ../local-2.0/run.mjs unit`, `node ../local-2.0/run.mjs integration`,
`node scripts/verify-restored-copy.mjs --self-test`, puis script privé
`node ../local-2.0/browser-financial-p0.mjs` avec fixtures `.invalid`.
Voir `COEUR-FINANCIER-P0.md`, `T04-REPRISE-HISTORIQUE.md` et le checkpoint pour les limites.

### Étape ticket/facture précédente

Lot précédent : **384 unités et 82 intégrations PostgreSQL**, tous réussis. Backend, web et POS
compilés ; avertissement de taille de bundle POS conservé. Neuf intégrations ticket/facture,
dont vingt demandes concurrentes et contraintes SQL. Chrome neuf : **douze observations**,
journal → connexion → ticket conservé, facture unique, TTC correctement affiché, trois PDF,
rechargement, journal/clôtures inchangés. Première émission puis relecture effectuées.
Nouvelle restauration : **59 tables, huit fichiers et trois PDF** identiques, AES-GCM vérifié,
1 529 ms sur cette petite copie (pas un RTO). Voir `FACTURE-DEPUIS-TICKET.md`.

Les références suivantes décrivent les étapes précédentes, pas des résultats supplémentaires à additionner.

Complément RH : **384 unités** (258 backend, 80 web, 46 POS) et **73 intégrations**, tous réussis.
Backend et web recompilés après ce complément ; les trois autres fronts sont inchangés depuis
leur compilation réussie ci-dessous. Huit intégrations RH : fuite d'annuaire reproduite puis
corrigée, cloisonnement, octets originaux, corruption et suppression reprenable. Cinq nouveaux
tests unitaires : écrasement, fsync échoué, chemins et bornes de charge.

`BROWSER-HR-DOCUMENTS.json` : neuf observations réussies via les contrôles de création de salarié,
upload, ouverture, rechargement, connexion salariée, suppression et refus ultérieur. Fixtures seulement.
Dernière restauration : **59 tables, huit fichiers dont deux pièces RH, deux PDF**, égaux après
AES-GCM. Durée de cette petite copie : 1 503 ms, sans promesse RTO. Voir `DOCUMENTS-RH.md`.

**379 tests unitaires** (253 backend, 80 web, 46 POS), **65 intégrations PostgreSQL** et
compilation des cinq applications réussis. Les échanges bancaires restent simulés ; aucun
paiement PayPal sandbox réel ni essai physique d'imprimante n'est inclus.

- `guest-visits.integration.test.ts` : dix cas, ancien QR refusé, révocation, isolation entre
  groupes et sociétés, prix serveur, référence liée au contenu, visite concurrente, expiration,
  retour bancaire tardif après fermeture. Le dialogue bancaire est remplacé.
- `server.test.ts` et `floorBridge.scope.test.ts` POS : dix cas de réponses tardives, changement de
  compte, cookie d'un autre utilisateur, adhésion retirée, renouvellement concurrent, règlement
  et clôture terminés après déconnexion. Aucune contamination de la société suivante.
- `browser-recovery.test.ts` : seize contrôles de copie chiffrée, empreintes, données malformées
  conservées, types non sérialisables refusés, IndexedDB et caches historiques. Aucun rejeu.
- `verifier-restauration.test.ts` : dix-huit contrôles hermétiques ; Docker simulé.

Recette Chrome neuf, données fictives, preuves privées :

- `BROWSER-VISITS.json` : dix observations, QR ouvert et fermé par clics, commande à 3,50 € sans
  inscription CRM, ancien lien refusé, seconde visite avec solde nul, aucune exception JavaScript.
- `BROWSER-POS-PRICING.json` : six observations, catalogue passé de 3,50 € à 6 € et de 3 % à 17 %,
  reconnexion, commande conservée à 3,50 € avec sa TVA historique de 0,10 €, espèces reçues 5 €,
  rendu 1,50 €, vente retrouvée dans le journal.
- `BROWSER-RECOVERY.json` : quinze observations, téléchargements archive/clé puis relecture,
  IndexedDB et cache inchangés, mauvais fichier invalidant le succès, mauvaise clé refusée,
  deux origines séparées, aucune requête API ni exception. **Profils historiques réels non exportés.**

Nouvelle sauvegarde applications arrêtées, déchiffrement AES-GCM et restauration native :
**59 tables égales, six fichiers et deux originaux PDF intègres**. Médias absents explicitement.
Durée observée sur cette petite copie : 1 671 ms, sans promesse RTO. La rétention a supprimé un
ancien dump de la copie de travail ; archives initiales préservées. Preuve `RESTORATION-2.0.json`.

Reproduction depuis le parent : `node local-2.0/run.mjs unit`, `node local-2.0/run.mjs integration`,
`node local-2.0/browser-visits.mjs`, `node local-2.0/browser-pos-pricing.mjs`,
`node local-2.0/browser-recovery.mjs`. Les scripts privés exigent le compte fictif `.invalid` et
créent des données de recette. Les suites partageables sont dans les workspaces du dépôt.

## Avancement du 8 octobre — vérifications distinctes

Dernier passage global après réunion des lots : **326 tests unitaires** (227 backend, 64 web,
35 POS) et **52 intégrations PostgreSQL**, tous réussis sous Vitest 4.1.11. Les preuves externes
restent limitées comme précisé ci-dessous. La correction de type JSON du snapshot POS ne change
pas ses valeurs. Les cinq applications compilent ; deux erreurs de typage des adaptateurs
dans les tests web ont été corrigées, puis dix tests ciblés et le build web repassés.
Les treize observations navigateur du parcours facture ont été reproduites après les derniers
changements de dépendances et de cache, toujours sans exception JavaScript.

La restauration v2 a été exécutée avec les applications arrêtées : **57 tables égales**, six
fichiers de données et un original PDF émis intègres, après chiffrement/déchiffrement AES-GCM.
Durée observée de cette petite copie : 1 698 ms, incluant archivage et comparaison. Cette mesure
ne permet pas d'annoncer un temps de reprise d'un établissement chargé. Médias absents dans cette
copie, inclusion éprouvée en tests distincts. Preuve privée : `RESTORATION-2.0.json`.

Les nombres ci-dessous décrivent leurs exécutions ciblées, ils ne s'additionnent pas tous :
certains fichiers sont communs à plusieurs passages. La suite complète est celle indiquée en tête.

- 41 intégrations avant les derniers lots : PostgreSQL réel, routes HTTP et autorisations ;
  échanges bancaires simulés. Deux cas utilisent un vrai dialogue SMTP loopback avec destinataire
  `.invalid` : pièce PDF identique et réponse perdue après DATA sans renvoi automatique.
- 31 tests paiement/factures repassés après les contrôles de rôle cuisine et la sauvegarde du
  profil légal. Ils incluent vingt numéros concurrents, original A4 immuable, accès intersociétés.
- 23 tests stockage/salles : fichier synchronisé avant succès, corruption bloquée explicitement,
  sauvegarde précédente préservée, pas de salle vide inventée en cas d'erreur.
- 40 tests middlewares/sauvegardes, puis 13 tests disponibilité/rotation d'authentification :
  panne sans promotion, jeton démo refusé en production, routeur global de sauvegarde fermé aux clients.
- 8 tests comptabilité et 5 intégrations CRM : TVA extraite du TTC, historiques incohérents
  rejetés, carte cadeau protégée par rôle, débits de portefeuille concurrents sérialisés.
- 13 observations navigateur dans des contextes Chrome neufs : fiche légale enregistrée puis
  relue, client société, facture HT à deux taux, émission, PDF A4/58/80 effectivement téléchargés,
  autre session et empreinte A4 identique ; aucune exception JavaScript sur ce parcours.
  Preuve privée : `BROWSER-DOCUMENTS.json`. Le compte et les documents sont fictifs.
- Aperçus A4/58/80 rendus en PNG puis inspectés : accents, montants, groupes de TVA et pieds
  visibles. Ces aperçus sont des **factures**, pas une qualification d'imprimante thermique.

Les premiers échecs ont produit des corrections réelles : profil légal validé mais absent de
l'écriture SQL, réponse de changement de statut sans lignes, libellé Client ambigu pour
l'accessibilité, rendu PDF trop lent. Un échec de script dû au bouton Enregistrer déjà désactivé
a été corrigé en changeant réellement la donnée fictive ; il n'est pas compté comme défaut métier.

Les sections suivantes conservent les repères historiques de cette même mission.

Commandes du laboratoire depuis le dossier parent du dépôt :

```powershell
node local-2.0/run.mjs migrate
node local-2.0/run.mjs unit
node local-2.0/run.mjs integration
```

Le lanceur d'intégration impose la base fictive `creorga_tests`. Ne pas le configurer sur une
base contenant de vraies données. Le prestataire bancaire est remplacé, contrairement à la base,
aux autorisations et aux routes HTTP qui sont réelles.

Référence initiale de cette mission : 249 tests unitaires passent. Première recette de paiement : 10 tests passent,
après 9 échecs reproduits sur la version initiale. Les cas vérifient commande intersociétés,
montant, devise, retour arbitraire, commande déjà payée, clé absente, lecture arbitraire,
rejeu simultané, références concurrentes et anonymat.

Non prouvés par ces tests : paiement PayPal sandbox, débit bancaire réel, sortie de papier,
caméra, cent scénarios du cahier des charges, panne électrique, performance durant un service.
Les résultats à venir complètent ce fichier ; aucune donnée fictive ne sert de preuve matérielle.

Seconde vérification : 255 unités (178 backend, 46 web, 31 POS), 25 intégrations
(19 paiement, 6 commande), puis cinq observations de navigateur réussies : inscription,
société reçue, nom sauvegardé, salle vide, aucune exception JavaScript.
Preuve privée : `BROWSER-SMOKE.json`.

Un test de concurrence de salle dépendait de délais 30/100 ms. Il utilise maintenant
des barrières explicites : la première requête entre, la seconde confirme son écriture,
puis la première reprend et doit obtenir 409. La protection n'a pas été affaiblie.
