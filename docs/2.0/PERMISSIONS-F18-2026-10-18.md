# F18 — matrice des droits, 18 octobre 2026

## Complément L3 final

Les six profils Restaurant et Bar ont maintenant des contrôles Chrome réels,
sans qualification globale. ADMIN/EMPLOYEE : tableaux financiers refusés ;
ADMIN stock2,25L sans coût au Bar, EMPLOYEE lecture seule. Restaurant EMPLOYEE :
planning propre, entrée/sortie persistantes, société Café non attribuée refusée403.
MANAGER/ADMIN n'ont pas d'actions de gestion des droits, OWNER les conserve.
SERVER Bar garde son override cash.open/close de départ ; les autres SERVER ne
l'héritent pas. Robi financier refusé à l'employé sans droit, pas simplement caché.

Bar EMPLOYEE : retrait temporaire de `inventory.quantities.read` puis retour à
« Hérité du rôle », motif et deux audits conservés, version2→3→4. L'onglet déjà
ouvert devient refusé puis relit2,25L ; l'override financierfalse préexistant reste
exactement inchangé. Les6événements Bar finaux incluent2nouveaux L3, contre4avant.
Le refus UI après révocation n'est pas un403stock direct non observé. Comparaison
des15adhésions : mêmes rôles/activité/décisions finales, seules versions/audits
additifs autorisés. Aucune migration irréversible des permissions.

Ce tableau reste une politique, pas une couverture exhaustive des routes,
exports/fichiers/WS ni des révocations pendant chaque requête.
[Critères exécutés C30–C50](T100-F18-2026-10-18.md) ;
[rapport Robi final](ROBI-F18-2026-10-18.md).

Complément L2 : EMPLOYEE Café reconnecté dans deux origines/contexte distincts.
Bootstrap POS200 avec ventes/clôtures vides et huit capacités ; aucune tuile CA,
marge ou journal. Dans la gestion, accès direct tableau POS/admin refusé, stock
quantitatif5,25kg sans coût ni édition, seul planning personnel visible. Logout
et retour stock nécessitant connexion exécutés. SERVER Restaurant sans CA ni
réglages, service et règlement partiel/mixte fictif exécutés. Les autres profils
Restaurant et Bar ne sont pas promus par ces observations. Pas de modification
des rôles/droits dans L2. [Preuves bornées C22–C28](T100-F18-2026-10-18.md).

Source effective : `apps/backend/src/lib/business-permissions.ts`, complétée par
les adhésions fictives relues en READ ONLY : Café 12:21:14 UTC, Restaurant 12:25:16 UTC,
Bar 12:25:17 UTC. **Matrice de politique, pas preuve que chaque route/bouton a été
testé pour chaque case.** Les contre-essais réellement cliqués sont dans
[T100 F18](T100-F18-2026-10-18.md). Aucun droit par défaut n'est modifié par F18.

« Oui » = autorisé par le contrat interne d'un membre actif de ce rôle, hors
override explicite ; « Non » = refusé par défaut. Une politique invalide, un rôle
inconnu ou un membre inactif n'accorde pas de capacité. OWNER n'est pas un compte
de plateforme. Le client QR n'est pas un adhérent interne : il possède seulement
la portée de sa visite, sans les capacités du tableau.

| Capacité | OWNER | ADMIN métier | MANAGER | SERVER | EMPLOYEE |
|---|---|---|---|---|---|
| `finance.revenue.read` | Oui | Non | Oui | Non | Non |
| `finance.costs.read` | Oui | Non | Oui | Non | Non |
| `finance.manage` | Oui | Non | Oui | Non | Non |
| `inventory.quantities.read` | Oui | Oui | Oui | Oui | Oui |
| `inventory.adjust` | Oui | Oui | Oui | Non | Non |
| `catalog.read` | Oui | Oui | Oui | Oui | Oui |
| `catalog.prices.write` | Oui | Oui | Oui | Non | Non |
| `service.read` | Oui | Oui | Oui | Oui | Oui |
| `service.manage` | Oui | Non | Oui | Oui | Non |
| `payments.receive` | Oui | Non | Oui | Oui | Non |
| `discounts.grant` | Oui | Non | Oui | Non | Non |
| `complimentary.grant` | Oui | Non | Oui | Non | Non |
| `orders.cancel` | Oui | Non | Oui | Non | Non |
| `refunds.declare` | Oui | Non | Oui | Non | Non |
| `cash.open` | Oui | Non | Oui | Non | Non |
| `cash.close` | Oui | Non | Oui | Non | Non |
| `invoices.read` | Oui | Non | Oui | Non | Non |
| `invoices.write` | Oui | Non | Oui | Non | Non |
| `exports.read` | Oui | Non | Oui | Non | Non |
| `hr.manage` | Oui | Oui | Oui | Non | Non |
| `hr.self` | Oui | Oui | Oui | Oui | Oui |
| `hr.schedule.read` | Oui | Oui | Oui | Oui | Oui |
| `hr.schedule.manage` | Oui | Oui | Oui | Non | Non |
| `settings.manage` | Oui | Oui | Oui | Non | Non |
| `permissions.manage` | Oui | Non | Non | Non | Non |
| `assistant.use` | Oui | Oui | Oui | Oui | Oui |
| `assistant.business.read` | Oui | Oui | Oui | Oui | Oui |
| `haccp.record` | Oui | Oui | Oui | Oui | Oui |
| `haccp.manage` | Oui | Oui | Oui | Non | Non |
| `crm.customers.read` | Oui | Oui | Oui | Oui | Non |
| `marketing.read` | Oui | Non | Oui | Non | Non |
| `reputation.read` | Oui | Non | Oui | Non | Non |

`assistant.business.read` n'accorde pas le CA/coût/RH global : chaque lecture
locale vérifie aussi la capacité du domaine et la société. `service.read` n'accorde
pas les prix administrables, les remises, l'annulation, le Journal ou les exports.

## Configuration réelle des trois sociétés fictives

Les quinze comptes existants sont actifs à la dernière observation. Le compte
de registre nommé `cashier` a le rôle natif **SERVER**, pas CASHIER ; `limited`
a le rôle **ADMIN**, et `no-finance` le rôle **EMPLOYEE**. Aucun compte de plus
n'a été créé pour obtenir artificiellement six profils internes. CLIENT QR est
une visite indépendante sans compte salarié.

| Société | OWNER | MANAGER | SERVER | ADMIN | EMPLOYEE |
|---|---|---|---|---|---|
| Café | défaut, version0 | défaut rétabli, version2 | défaut, version1 | défaut, version1 | défaut rétabli/actif, version2 |
| Restaurant | défaut, version0 | défaut, version0 | défaut, version1 | défaut, version1 | défaut, version0 |
| Bar | défaut, version0 | défaut, version0 | `cash.open` et `cash.close` explicitement accordés, version1 | défaut, version1 | `finance.revenue.read=false` explicite, version4après rétablissement L3 |

Les overrides du Bar ne s'étendent pas au Café/Restaurant. MANAGER garde la
lecture du CA après retrait de son seul droit d'export au Café. La version2
confirme le rétablissement exact des décisions initiales, pas une remise à zéro
de l'audit. Journal additif final :6décisions Café,2Restaurant,6Bar. Les4décisions
nouvelles F18 initiales appartiennent au Café ;2nouvelles L3 au Bar ;8précédentes
restent historiques. Aucune ancienne décision supprimée.

Robi génératif, toutes les routes directes/fichiers/WS, révocations pendant
chaque action et les douze parcours **complets** Restaurant/Bar restent non qualifiés.
La présence de ce tableau ne vaut pas couverture exhaustive de sécurité.
