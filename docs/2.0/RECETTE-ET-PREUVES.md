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

Seconde vérification : 255 unités (178 backend, 46 web, 31 POS), 25 intégrations
(19 paiement, 6 commande), puis cinq observations de navigateur réussies : inscription,
société reçue, nom sauvegardé, salle vide, aucune exception JavaScript.
Preuve privée : `BROWSER-SMOKE.json`.

Un test de concurrence de salle dépendait de délais 30/100 ms. Il utilise maintenant
des barrières explicites : la première requête entre, la seconde confirme son écriture,
puis la première reprend et doit obtenir 409. La protection n'a pas été affaiblie.
