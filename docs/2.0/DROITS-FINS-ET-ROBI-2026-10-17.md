# Droits fins et Robi — lot du 17 octobre 2026

## Consolidation du 18 octobre

Le relevé initial ci-dessous est conservé historiquement, pas l'état courant.
Voir le [rapport du 18 octobre](DROITS-FINS-ROBI-RECETTE-2026-10-18.md),
ses [preuves fraîches](preuves/droits-robi-validation-2026-10-18.json) et le
[complément T100](T100-DROITS-2026-10-18.md). Refus du CA EMPLOYEE et révocation
réellement rejoués, lectures Robi locales fonctionnelles, cinq profils internes
connectés par société mais parcours non exhaustifs. Fournisseur IA réel et octets
téléchargés non qualifiés. Arrêt runtime non confirmé : diagnostic en cours.
**Campagne NON LIVRÉE ; pilote NON QUALIFIÉ.**

**EN COURS — NON LIVRÉ — pilote NON QUALIFIÉ.** Ce document est un checkpoint de travail, pas une validation anticipée. Base publiée vérifiée : `976b21a500f58d09fdca33616a9c243a66ae5161`, branche `codex/creorga-2-0-2026-10-08`. Les ventes, documents et identités des trois établissements déjà prouvés ne sont pas recréés.

## Politique provisoire explicite

Les capacités sont portées par l’adhésion société, pas par le nom de l’utilisateur ni un rôle de plateforme. Une requête relit l’adhésion active. Un rôle inconnu ou une politique corrompue est refusé ; une panne de base ne confère aucun accès.

| Profil métier | Capacités initiales | Exclusions importantes |
| --- | --- | --- |
| OWNER | Toutes les capacités métier prévues | Aucun privilège de plateforme ; ce parcours ne transfère ni ne désactive le propriétaire. |
| ADMIN | Catalogue/prix, quantités et ajustements stock, paramètres, RH et planning équipe, service en lecture, dossier personnel, HACCP, clients et Robi autorisé | Pas de CA, coûts d’achat, encaissement, remboursement, clôture, export ou administration des droits par défaut. |
| MANAGER | Gestion quotidienne, finances et exploitation prévues | Pas d’administration des droits par défaut. |
| SERVER | Service et encaissement, catalogue, quantités, clients, planning/dossier personnels, HACCP et Robi autorisé | Pas de CA, coûts, remises, offerts, annulation, remboursement, ouverture/clôture ou export par défaut. |
| CASHIER | SERVER avec opérations d'ouverture/clôture de caisse autorisées pour sa société, pas une isolation individuelle de tiroir | Aucun droit de CA global ni de rapport Z implicite. |
| EMPLOYEE | Catalogue, quantités, service en lecture, planning/dossier personnels, HACCP manuel, Robi selon données autorisées | Pas de service en écriture, prix, encaissement, finance, remboursement, RH équipe ou paramétrage par défaut. |
| CLIENT QR | Contrat existant limité à sa visite et aux données publiques du menu | Aucune adhésion interne ni capacité métier ; accès ancien révoqué selon la visite. |

Les droits précis sont les 32 capacités de `apps/backend/src/lib/business-permissions.ts`. Les variantes explicites sont enregistrées dans `UserCompany.capabilities`, versionnées par `accessVersion`, avec événement avant/après et motif dans `BusinessPermissionEvent`. Aucun rôle existant n’est automatiquement transformé. Un changement de rôle avec des variantes existantes exige un choix explicite. La délégation ne peut dépasser les capacités de l’auteur, ni lui permettre de désactiver un compte supérieur.

La migration `20261017220500_business_capabilities` ajoute uniquement deux colonnes et une table de journal. Elle a été appliquée aux **deux bases fictives locales**, sans mutation des sept tables financières comparées. La génération Prisma a rencontré un verrou DLL tenu par son propre processus de contrôle ; après sortie normale de ce processus, une génération séparée a réussi. Le premier résultat incomplet est conservé, sans contournement Windows.

## Défauts reproduits et travaux

| Sujet | Preuve RED / constat | État à ce checkpoint |
| --- | --- | --- |
| CA visible à EMPLOYEE | Vrai clic Journal POS du Bar, puis 38,04 EUR et détails visibles | Projection serveur et gardes POS implémentées ; rejeu Chrome final attendu. |
| Révocation et cache ERP | Tests réels du store/transport : ancien scope et droits persistés réutilisés | Correction ciblée GREEN ; tests réseau et interface finaux attendus. |
| Conversations Robi | Ancienne réponse financière visible après retrait du droit | Historique conservé mais désormais isolé par révision ; GREEN ciblé, pas effacement de données. |
| Temps réel public | Job publiant table, durée et impayé sur un canal anonyme | Invalidation sans montants/détails privés implémentée et testée sous mocks ; aucune qualification complète WebSocket déduite. |
| Feedback d’aide global | Tests GET démontrant publication de commentaires historiques non cloisonnés | Collecte/lecture mises en quarantaine 503 ; fichiers historiques intacts. Migration sûre à concevoir. |
| Rappels Robi | Analyse initiale de handlers globaux | **Faux positif rectifié** : middleware les bloquait déjà ; suppression de code inaccessible, aucun ancien 200 prétendu. |
| Budget PDF | Pièce jointe attendait encore 180 s malgré budget serveur plus court | Budget utilisateur 25 s, taille 10 Mo ; GREEN composant, pas preuve fournisseur réel. |

## Robi : ne pas confondre les modes

Le contexte métier est chargé depuis les données PostgreSQL de la société et les capacités courantes, pas depuis un `userId` de corps HTTP ni le chemin affiché. Les réponses déterministes prévues portent **« Lecture métier locale (sans IA générative) »**. Elles ne sont pas une disponibilité attestée d’un grand modèle.

Les tests PostgreSQL ciblés Robi ont **12 assertions exécutées et réussies**, avec authentification, base et mémoire disque réelles ; **seul le fournisseur est simulé**. Ils couvrent trois sociétés fictives par exécution, scope, retrait des droits, caches, planning personnel/équipe, incohérences de règlements et journées de changement d’heure 23/25 h. Les deux exécutions créant six sociétés de fixtures restent dans `creorga_tests`, distinctes du Café/Restaurant/Bar de Chrome. Aucun contenu client n’est envoyé au cloud.

**Fournisseur génératif réel : BLOCKED / non qualifié à ce checkpoint.** Images, rappels globaux et fonctions restées en migration ne sont pas présentés comme opérationnels.

## Validations déjà réellement exécutées dans ce lot

- Décisions d’autorisations PostgreSQL : **9/9** à 20:26:34–20:26:43 UTC, preuve privée `validation-member-permissions-1792268794798-PbCWvK/result.json` ; concurrence 200/409, audit, retrait, désactivation, délégation et autre société.
- POS : **160/160** et TypeScript réussi sur le périmètre figé de l’agent, avant intégration finale. Ce ne sont pas 160 parcours Chrome.
- Robi PostgreSQL : **12/12**, fournisseur simulé. Aucun PASS du fournisseur réel ou UI déduit.
- Premières suites globales : **en cours / non qualifiées**. La première suite backend a révélé des fixtures historiques ne fournissant pas encore les capacités ; les assertions ne sont ni supprimées ni remplacées par un repli privilégié.

Les suites ciblées et leurs reprises ne s’additionnent pas aux futures suites globales. Les journaux bruts privés, échecs d’instrumentation et RED restent conservés. Les anciens 861 unitaires / 295 PG / 47 fixtures et la restauration de 21:31 sont des résultats **antérieurs au lot**, pas sa validation.

## Suite indispensable avant verdict

1. Finir et figer les projections de salle, gardes des exports et interfaces RH ; relancer les suites globales et compilations.
2. Rejouer les six profils dans Chrome pour chacun des trois établissements existants ; toute attribution fictive de rôle passe par l’interface avec motif et audit, sans recréer de vente ni document.
3. Vérifier les téléchargements en octets, les refus après révocation, la persistance et la réconciliation des totaux historiques.
4. Mesurer les performances comparables et qualifier un Node portable maintenu sans installation globale.
5. Arrêt normal, nouvelle sauvegarde/restauration avec table de droits et pièces/PDF, puis commit/push uniquement si les contrôles indispensables du code réussissent.

T100 reste partiel, sur **3 697 contrôles inventoriés statiquement** ; aucun contrôle non exécuté n’est promu. Aucune durée de cinq heures actives, qualification bancaire, impression physique, déploiement ou modification de `master` n’est annoncée.
