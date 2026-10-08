# Recette actuelle

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
