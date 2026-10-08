# Recette actuelle

Commandes du laboratoire depuis le dossier parent du dépôt :

```powershell
node local-2.0/run.mjs migrate
node local-2.0/run.mjs unit
node local-2.0/run.mjs integration
```

Le lanceur d'intégration impose la base fictive `creorga_tests`. Ne pas le configurer sur une
base contenant de vraies données. Le prestataire bancaire est remplacé, contrairement à la base,
aux autorisations et aux routes HTTP qui sont réelles.

Référence actuelle : 249 tests unitaires passent. Première recette de paiement : 10 tests passent,
après 9 échecs reproduits sur la version initiale. Les cas vérifient commande intersociétés,
montant, devise, retour arbitraire, commande déjà payée, clé absente, lecture arbitraire,
rejeu simultané, références concurrentes et anonymat.

Non prouvés par ces tests : paiement PayPal sandbox, débit bancaire réel, sortie de papier,
caméra, cent scénarios du cahier des charges, panne électrique, performance durant un service.
Les résultats à venir complètent ce fichier ; aucune donnée fictive ne sert de preuve matérielle.
