# Recette métier T01–T100

Mise à jour du lot T100 après `c0ddd81` : [validation ciblée](preuves/t100-validation-2026-10-16.json)
et [rapport](T100-CONTROLES-ET-PERFORMANCE.md). Les statuts globaux restent inchangés ; les preuves
historiques ci-dessous conservent leur date, notamment T03 (ancienne copie non remigrée pour ce lot
sans nouvelle migration). Les suites unitaires/PostgreSQL et les cinq anciens parcours Chrome ont
été relancés, avec seize parcours Chrome nouveaux. Le scénario T100 entier reste non validé.

Générée le 2026-10-16T17:22:34.577Z. Laboratoire loopback privé ; sociétés fictives ; banque remplacée ; jamais production.

**54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN.**

Numérotation conservée de l’annexe du prompt maître, y compris vidéo désactivée. PASS ne couvre que le scénario logiciel décrit. Un test d’API n’est pas un clic Chrome ; une banque remplacée n’est pas le sandbox officiel. Aucune certification ou mise en production. Les scénarios non exécutés ne sont jamais déduits de l’existence du code. Détails horodatés : [preuve JSON](preuves/recette-metier-2026-10-16.json).

## T01 — Installation neuve complète — BLOCKED

Préconditions et données : Machine vierge et base neuve.

Actions utilisateur / API : Installer, migrer puis ouvrir les cinq applications.

Attendu : Premier démarrage sans données historiques ni manipulation manuelle cachée.

Observé : Aucune machine Windows vierge / VM de recette disponible. Les cinq builds et la base migrée ne prouvent pas une installation complète sur machine vierge.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T02 — Restauration avec pièces jointes — PASS

Préconditions et données : Copie privée cohérente arrêtée, fichiers et base du même instant.

Actions utilisateur / API : Sauvegarder, chiffrer, restaurer dans une nouvelle base et comparer.

Attendu : Toutes tables, colonnes, lignes, fichiers et PDF égaux.

Observé : 79 tables, 8 fichiers, données et PDF comparés égaux ; AES-GCM vérifié, clé séparée. 2952 ms sur cette copie, pas un RTO.

Preuves : [verify-restored-copy.mjs](../../scripts/verify-restored-copy.mjs) — « restauration native chiffrée et comparaison exhaustive », passed, 2026-10-16T17:22:29.988Z

## T03 — Migration de copie ancienne — PASS

Préconditions et données : Archive ancienne immuable et nouvelle base dédiée.

Actions utilisateur / API : Restaurer une copie de la version ancienne puis appliquer toutes les migrations.

Attendu : Historique inchangé, parcours anciens encore lisibles.

Observé : 7 → 34 migrations, 47 tables / 341 lignes anciennes conservées à l’identique. Cliché lu seulement, pas archive originale ni profil historique.

Preuves : [migration-ancienne-copie-2026-10-16.json](../../docs/2.0/preuves/migration-ancienne-copie-2026-10-16.json) — « migration réelle d’un cliché privé ancien vers une nouvelle base », passed, 2026-10-16T16:54:22.170Z

## T04 — Export des anciennes ventes navigateur — BLOCKED

Préconditions et données : Copie des profils historiques autorisée séparément.

Actions utilisateur / API : Exporter les ventes de chaque origine sans effacement ni rejeu.

Attendu : Inventaire et empreintes conservés, aucune vente perdue.

Observé : Profils historiques hors autorisation ; aucun profil ouvert. Procédure T04 conservée.

Catégorie du blocage : HISTORY_AUTHORIZATION (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T05 — Isolation intersociétés — PASS

Préconditions et données : Deux sociétés fictives, propriétaire et salarié.

Actions utilisateur / API : Demander des documents, paiements et relations de réservation étrangers.

Attendu : Refus avant fuite ou mutation ; contraintes SQL incluses.

Observé : Assertions exécutées et réussies : refuse une commande appartenant à une autre société ; refuse le client étranger, le ticket étranger et le rôle salarié ; refuse une table ou un client d’une autre société, y compris à la modification ; la base refuse les relations intersociétés même sans passer par HTTP. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « refuse une commande appartenant à une autre société », passed, 2026-10-16T17:19:08.745Z ; [receipt-invoices.integration.test.ts](../../apps/backend/src/routes/receipt-invoices.integration.test.ts) — « refuse le client étranger, le ticket étranger et le rôle salarié », passed, 2026-10-16T17:19:08.745Z ; [reservations.integration.test.ts](../../apps/backend/src/routes/reservations.integration.test.ts) — « refuse une table ou un client d’une autre société, y compris à la modification », passed, 2026-10-16T17:19:08.745Z ; [reservations.integration.test.ts](../../apps/backend/src/routes/reservations.integration.test.ts) — « la base refuse les relations intersociétés même sans passer par HTTP », passed, 2026-10-16T17:19:08.745Z

## T06 — Isolation intersites — BLOCKED

Préconditions et données : Deux établissements et rôles affectés par site.

Actions utilisateur / API : Lire et modifier la session d’un autre site.

Attendu : Droits de site appliqués, pas seulement société.

Observé : Modèle de sites et adhésions par établissement non implémenté dans le schéma actuel. Le contrôle société ne remplace pas un contrôle intersites.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T07 — Panne de base sans promotion — PASS

Préconditions et données : Membre ordinaire, panne de lecture d’adhésion simulée.

Actions utilisateur / API : Ouvrir une route protégée pendant la panne.

Attendu : 503, aucun rôle propriétaire de repli.

Observé : Assertions exécutées et réussies : en PRODUCTION : refuse en 503 et n'accorde AUCUN rôle. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [requireCompany.test.ts](../../apps/backend/src/middleware/requireCompany.test.ts) — « en PRODUCTION : refuse en 503 et n'accorde AUCUN rôle », passed, 2026-10-16T17:18:59.484Z

## T08 — Révocation d’un appareil de caisse — PASS

Préconditions et données : Appareil enregistré et révocable.

Actions utilisateur / API : Révoquer puis rejouer son ancien accès.

Attendu : Ancien appareil refusé sans affecter les autres.

Observé : Assertions exécutées et réussies : révoquer un jeton de caisse dans la configuration bloque immédiatement son ancien accès sans révoquer l’autre. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [business-extended.integration.test.ts](../../apps/backend/src/routes/business-extended.integration.test.ts) — « révoquer un jeton de caisse dans la configuration bloque immédiatement son ancien accès sans révoquer l’autre », passed, 2026-10-16T17:19:08.745Z

## T09 — Restauration chiffrée externe — BLOCKED

Préconditions et données : Copie hors du PC, archive AES-GCM et clé séparée.

Actions utilisateur / API : Récupérer depuis le stockage externe puis restaurer.

Attendu : Copie externe effectivement récupérable et état complet égal.

Observé : Restauration chiffrée locale exécutée en T02 ; aucun stockage externe/cloud de recette raccordé.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T10 — Rapprochement avant et après restauration — PASS

Préconditions et données : Copie avec documents, règlements, réserves et séparations fictifs.

Actions utilisateur / API : Comparer toutes les lignes et les PDF des deux bases.

Attendu : Aucun total, lien, pièce ou état changé.

Observé : 79 tables, 8 fichiers, données et PDF comparés égaux ; AES-GCM vérifié, clé séparée. 2952 ms sur cette copie, pas un RTO.

Preuves : [verify-restored-copy.mjs](../../scripts/verify-restored-copy.mjs) — « restauration native chiffrée et comparaison exhaustive », passed, 2026-10-16T17:22:29.988Z

## T11 — Vente café et ouverture de caisse — PASS

Préconditions et données : Base fictive, produit TTC, propriétaire.

Actions utilisateur / API : Ouvrir la caisse, enregistrer un acompte puis régler le solde.

Attendu : Une vente, un débit de stock, espèces comptabilisées.

Observé : Assertions exécutées et réussies : compte un acompte espèces même si la commande n’est pas encore payée entièrement ; un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [cash-drawers.integration.test.ts](../../apps/backend/src/routes/cash-drawers.integration.test.ts) — « compte un acompte espèces même si la commande n’est pas encore payée entièrement », passed, 2026-10-16T17:19:08.745Z ; [service-sessions.integration.test.ts](../../apps/backend/src/routes/service-sessions.integration.test.ts) — « un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock », passed, 2026-10-16T17:19:08.745Z

## T12 — Table à plusieurs tournées QR — PASS

Préconditions et données : Visite fictive, plusieurs commandes.

Actions utilisateur / API : Commander, demander le règlement puis rejouer.

Attendu : Même solde réservé et aucune deuxième capture.

Observé : Assertions exécutées et réussies : réserve et rapproche plusieurs tournées QR sans nouveau débit sur rejeu. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « réserve et rapproche plusieurs tournées QR sans nouveau débit sur rejeu », passed, 2026-10-16T17:19:08.745Z

## T13 — Transfert de table — PASS

Préconditions et données : Groupes fictifs avec acompte et tentative UNKNOWN.

Actions utilisateur / API : Transférer puis payer uniquement le solde après preuve d’annulation simulée.

Attendu : Identités, réserve et acompte inchangés ; une vente.

Observé : Assertions exécutées et réussies : conserve acompte, tentative en cours et affectations pendant un transfert puis un solde. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [table-movements.integration.test.ts](../../apps/backend/src/routes/table-movements.integration.test.ts) — « conserve acompte, tentative en cours et affectations pendant un transfert puis un solde », passed, 2026-10-16T17:19:08.745Z

## T14 — Fusion puis séparation des groupes — PASS

Préconditions et données : Deux visites QR, acompte sur une seule.

Actions utilisateur / API : Fusionner, séparer la visite puis renouveler ses liens.

Attendu : Groupes, soldes et accès indépendants, anciens liens refusés.

Observé : Assertions exécutées et réussies : sépare un groupe QR après fusion, sans déplacer l’acompte de l’autre groupe ni rouvrir les anciens QR. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [table-movements.integration.test.ts](../../apps/backend/src/routes/table-movements.integration.test.ts) — « sépare un groupe QR après fusion, sans déplacer l’acompte de l’autre groupe ni rouvrir les anciens QR », passed, 2026-10-16T17:19:08.745Z

## T15 — Partage par article ou quantité — PASS

Préconditions et données : Ligne native de trois articles avant commande financière.

Actions utilisateur / API : Déplacer un article, recharger et régler les deux groupes.

Attendu : TVA/prix historiques ; total 35,10 €, stock diminué de trois, sans doublon.

Observé : Assertions exécutées et réussies : déplace une partie de ligne native à son prix historique sans nouvelle préparation ni débit de stock ; séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [table-movements.integration.test.ts](../../apps/backend/src/routes/table-movements.integration.test.ts) — « déplace une partie de ligne native à son prix historique sans nouvelle préparation ni débit de stock », passed, 2026-10-16T17:19:08.745Z ; [service-separations.spec.ts](../../tests/browser-lab/service-separations.spec.ts) — « séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement », passed, 2026-10-16T17:21:43.635Z

## T16 — Partage par montant et centimes résiduels — PASS

Préconditions et données : Plusieurs groupes et montants non divisibles au centime.

Actions utilisateur / API : Répartir une addition entre groupes et moyens puis payer chaque solde.

Attendu : Somme exacte et répartition des centimes explicitement conservée.

Observé : Assertions exécutées et réussies : trois groupes partagent remise et acompte, règlent séparément sans nouvelle vente ni préparation et restent privés ; un nouvel acompte invalide l’aperçu, puis les paiements mixtes et concurrents conservent les parts exactes ; la vente finale conserve les centimes de TVA historiques même si PostgreSQL retourne les lignes dans un autre ordre ; refuse un ancien original entièrement couvert par ses règlements mais sans clôture, sans inventer de vente ; un ancien miroir JSON fictif ne réintroduit pas la commande répartie dans l’addition du personnel ; allocation QR : décision responsable, acomptes explicites, panne réseau, QR privés et paiement du groupe dans Chrome. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [financial-allocations.integration.test.ts](../../apps/backend/src/routes/financial-allocations.integration.test.ts) — « trois groupes partagent remise et acompte, règlent séparément sans nouvelle vente ni préparation et restent privés », passed, 2026-10-16T17:19:08.745Z ; [financial-allocations.integration.test.ts](../../apps/backend/src/routes/financial-allocations.integration.test.ts) — « un nouvel acompte invalide l’aperçu, puis les paiements mixtes et concurrents conservent les parts exactes », passed, 2026-10-16T17:19:08.745Z ; [financial-allocations.integration.test.ts](../../apps/backend/src/routes/financial-allocations.integration.test.ts) — « la vente finale conserve les centimes de TVA historiques même si PostgreSQL retourne les lignes dans un autre ordre », passed, 2026-10-16T17:19:08.745Z ; [financial-allocations.integration.test.ts](../../apps/backend/src/routes/financial-allocations.integration.test.ts) — « refuse un ancien original entièrement couvert par ses règlements mais sans clôture, sans inventer de vente », passed, 2026-10-16T17:19:08.745Z ; [financial-allocations.integration.test.ts](../../apps/backend/src/routes/financial-allocations.integration.test.ts) — « un ancien miroir JSON fictif ne réintroduit pas la commande répartie dans l’addition du personnel », passed, 2026-10-16T17:19:08.745Z ; [financial-allocation.spec.ts](../../tests/browser-lab/financial-allocation.spec.ts) — « allocation QR : décision responsable, acomptes explicites, panne réseau, QR privés et paiement du groupe dans Chrome », passed, 2026-10-16T17:20:14.536Z

## T17 — Offert avec droit et motif — PASS

Préconditions et données : Responsable puis serveur, article offert.

Actions utilisateur / API : Offrir, encaisser et contrôler le justificatif et le journal.

Attendu : Autorisation, motif, ventilation et stock traçables.

Observé : Assertions exécutées et réussies : un offert exige un motif responsable, conserve son auteur, son ticket et un seul débit de stock. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [pos.integration.test.ts](../../apps/backend/src/routes/pos.integration.test.ts) — « un offert exige un motif responsable, conserve son auteur, son ticket et un seul débit de stock », passed, 2026-10-16T17:19:08.745Z

## T18 — Annulation après envoi bar — BLOCKED

Préconditions et données : Commande déjà transmise à la préparation.

Actions utilisateur / API : Annuler une ligne et traiter la correction.

Attendu : Correction visible sans suppression silencieuse de vente ou préparation.

Observé : Parcours de correction signé après préparation non implémenté. Le risque d’annulation/effacement silencieux a été reproduit puis bloqué par 409, avec test orders ; cela ne livre pas la correction métier complète.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : [orders.integration.test.ts](../../apps/backend/src/routes/orders.integration.test.ts) — « refuse l’effacement ou l’annulation destructive d’un QR déjà en préparation et garde le prix et la quantité », passed, 2026-10-16T17:19:08.745Z

## T19 — Retour après vente — PASS

Préconditions et données : Facture émise et règlement fictif.

Actions utilisateur / API : Créer un avoir puis déclarer le remboursement espèces.

Attendu : Vente et facture originales inchangées, sortie unique et plafonnée.

Observé : Assertions exécutées et réussies : un avoir intégral ne modifie pas la facture, son PDF, sa vente ou son règlement ; un remboursement espèces déclaré garde le justificatif et une seule sortie de caisse. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « un avoir intégral ne modifie pas la facture, son PDF, sa vente ou son règlement », passed, 2026-10-16T17:19:08.745Z ; [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « un remboursement espèces déclaré garde le justificatif et une seule sortie de caisse », passed, 2026-10-16T17:19:08.745Z

## T20 — Deux terminaux sur une session — PASS

Préconditions et données : Deux révisions concurrentes d’une même salle fictive.

Actions utilisateur / API : Confirmer simultanément deux changements.

Attendu : Une seule version gagne ; aucune ligne écrasée.

Observé : Assertions exécutées et réussies : deux versions concurrentes ne perdent pas la modification confirmée ; une séparation concurrente gagne une fois, reste rejouable et n’est pas lisible dans une autre société. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [service-sessions.integration.test.ts](../../apps/backend/src/routes/service-sessions.integration.test.ts) — « deux versions concurrentes ne perdent pas la modification confirmée », passed, 2026-10-16T17:19:08.745Z ; [table-movements.integration.test.ts](../../apps/backend/src/routes/table-movements.integration.test.ts) — « une séparation concurrente gagne une fois, reste rejouable et n’est pas lisible dans une autre société », passed, 2026-10-16T17:19:08.745Z

## T21 — Double clic sur validation — PASS

Préconditions et données : Même commande et référence stable.

Actions utilisateur / API : Envoyer vingt validations concurrentes.

Attendu : Un seul encaissement et même réponse au rejeu.

Observé : Assertions exécutées et réussies : un seul encaissement gagne parmi vingt demandes simultanées ; un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [orders.integration.test.ts](../../apps/backend/src/routes/orders.integration.test.ts) — « un seul encaissement gagne parmi vingt demandes simultanées », passed, 2026-10-16T17:19:08.745Z ; [service-sessions.integration.test.ts](../../apps/backend/src/routes/service-sessions.integration.test.ts) — « un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock », passed, 2026-10-16T17:19:08.745Z

## T22 — Réponse réseau perdue après commit local — PASS

Préconditions et données : Serveur PostgreSQL local, Chrome neuf.

Actions utilisateur / API : Perdre la réponse POST puis relire l’opération par sa référence.

Attendu : Opération retrouvée, pas de nouvelle identité ni succès local inventé.

Observé : Assertions exécutées et réussies : fusion POS/QR, acompte, réponse perdue et addition privée renouvelée ; séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [qr-movements.spec.ts](../../tests/browser-lab/qr-movements.spec.ts) — « fusion POS/QR, acompte, réponse perdue et addition privée renouvelée », passed, 2026-10-16T17:21:22.913Z ; [service-separations.spec.ts](../../tests/browser-lab/service-separations.spec.ts) — « séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement », passed, 2026-10-16T17:21:43.635Z

## T23 — Reprise sans double préparation — PASS

Préconditions et données : Ticket prêt, ligne native déplacée ou divisée.

Actions utilisateur / API : Séparer, sauvegarder, recharger et relire la cuisine.

Attendu : Un ticket initial inchangé et routage des portions, pas de nouveau lot.

Observé : Assertions exécutées et réussies : déplace une partie de ligne native à son prix historique sans nouvelle préparation ni débit de stock ; séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [table-movements.integration.test.ts](../../apps/backend/src/routes/table-movements.integration.test.ts) — « déplace une partie de ligne native à son prix historique sans nouvelle préparation ni débit de stock », passed, 2026-10-16T17:19:08.745Z ; [service-separations.spec.ts](../../tests/browser-lab/service-separations.spec.ts) — « séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement », passed, 2026-10-16T17:21:43.635Z

## T24 — Variantes et suppléments — BLOCKED

Préconditions et données : Catalogue avec variantes tarifées serveur.

Actions utilisateur / API : Commander deux tailles et un supplément depuis la caisse.

Attendu : Tarif persistant et ticket cuisine correct.

Observé : Pas de variantes/suppléments tarifés par le serveur ; les modificateurs de note ne sont pas une preuve de cette fonction.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T25 — Produit indisponible — PASS

Préconditions et données : Produit indisponible dans le catalogue du site.

Actions utilisateur / API : Tenter de le commander via POS et QR.

Attendu : Refus serveur cohérent avec l’affichage.

Observé : Assertions exécutées et réussies : un produit inactif ne peut être ajouté depuis un brouillon POS ni une commande QR. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [business-extended.integration.test.ts](../../apps/backend/src/routes/business-extended.integration.test.ts) — « un produit inactif ne peut être ajouté depuis un brouillon POS ni une commande QR », passed, 2026-10-16T17:19:08.745Z

## T26 — Clôture avec écart déclaré — PASS

Préconditions et données : Caisse ouverte et encaissements fictifs.

Actions utilisateur / API : Compter un montant différent, justifier puis rejouer la clôture.

Attendu : Écart motivé, rapport figé et aucune réécriture.

Observé : Assertions exécutées et réussies : exige une justification de l’écart et ne réécrit pas une clôture ; vingt reprises de clôture rendent exactement le même rapport sans réécriture. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [cash-drawers.integration.test.ts](../../apps/backend/src/routes/cash-drawers.integration.test.ts) — « exige une justification de l’écart et ne réécrit pas une clôture », passed, 2026-10-16T17:19:08.745Z ; [cash-drawers.integration.test.ts](../../apps/backend/src/routes/cash-drawers.integration.test.ts) — « vingt reprises de clôture rendent exactement le même rapport sans réécriture », passed, 2026-10-16T17:19:08.745Z

## T27 — Prix catalogue TTC — PASS

Préconditions et données : Produit 3,50 € TTC avec taux historique.

Actions utilisateur / API : Créer la ligne puis changer le catalogue avant règlement.

Attendu : Ancien TTC et ancienne TVA conservés.

Observé : Assertions exécutées et réussies : fige réellement un nouveau brouillon et encaisse son tarif malgré une modification de catalogue ; calcule TTC et TVA côté serveur et rejoue sans modifier la commande émise. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [pos.integration.test.ts](../../apps/backend/src/routes/pos.integration.test.ts) — « fige réellement un nouveau brouillon et encaisse son tarif malgré une modification de catalogue », passed, 2026-10-16T17:19:08.745Z ; [guest-visits.integration.test.ts](../../apps/backend/src/routes/guest-visits.integration.test.ts) — « calcule TTC et TVA côté serveur et rejoue sans modifier la commande émise », passed, 2026-10-16T17:19:08.745Z

## T28 — Facture à prix HT — PASS

Préconditions et données : Lignes HT à deux taux et centimes limites.

Actions utilisateur / API : Créer la facture depuis des montants HT.

Attendu : Calcul et arrondis par taux côté serveur.

Observé : Assertions exécutées et réussies : arrondit par taux sans inventer un centime entre deux groupes. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoices.integration.test.ts](../../apps/backend/src/routes/invoices.integration.test.ts) — « arrondit par taux sans inventer un centime entre deux groupes », passed, 2026-10-16T17:19:08.745Z

## T29 — Plusieurs taux — PASS

Préconditions et données : Facture et avoir fictifs avec plusieurs groupes fiscaux.

Actions utilisateur / API : Émettre puis créditer partiellement.

Attendu : Groupes fiscaux historiques reconstitués au centime.

Observé : Assertions exécutées et réussies : un avoir partiel puis le solde reconstituent exactement chaque groupe fiscal historique. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « un avoir partiel puis le solde reconstituent exactement chaque groupe fiscal historique », passed, 2026-10-16T17:19:08.745Z

## T30 — Remise répartie — PASS

Préconditions et données : Ticket remisé et facture société issue de ce ticket.

Actions utilisateur / API : Convertir puis contrôler les bases fiscales et les pourboires.

Attendu : Remise conservée ; pas de TVA sur pourboire ni deuxième vente.

Observé : Assertions exécutées et réussies : conserve TTC, remise et TVA, sans facturer à nouveau pourboire ou don. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [receipt-invoices.integration.test.ts](../../apps/backend/src/routes/receipt-invoices.integration.test.ts) — « conserve TTC, remise et TVA, sans facturer à nouveau pourboire ou don », passed, 2026-10-16T17:19:08.745Z

## T31 — Avoir partiel — PASS

Préconditions et données : Facture originale émise.

Actions utilisateur / API : Créer un avoir partiel puis le complément.

Attendu : Plafonds, numérotation et TVA d’origine conservés.

Observé : Assertions exécutées et réussies : un avoir partiel puis le solde reconstituent exactement chaque groupe fiscal historique ; vingt demandes différentes ne dépassent jamais le montant original. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « un avoir partiel puis le solde reconstituent exactement chaque groupe fiscal historique », passed, 2026-10-16T17:19:08.745Z ; [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « vingt demandes différentes ne dépassent jamais le montant original », passed, 2026-10-16T17:19:08.745Z

## T32 — Acompte puis solde — PASS

Préconditions et données : Couvert natif ouvert.

Actions utilisateur / API : Déclarer un acompte espèces puis un solde mixte.

Attendu : Une seule commande, une vente et un débit de stock.

Observé : Assertions exécutées et réussies : un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [service-sessions.integration.test.ts](../../apps/backend/src/routes/service-sessions.integration.test.ts) — « un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock », passed, 2026-10-16T17:19:08.745Z

## T33 — Facture depuis ticket sans double vente — PASS

Préconditions et données : Ticket réglé fictif.

Actions utilisateur / API : Demander vingt fois la facture puis l’émettre.

Attendu : Un document et aucun revenu supplémentaire.

Observé : Assertions exécutées et réussies : vingt demandes simultanées retrouvent une seule facture et un seul numéro ; émet un PDF avec l’émetteur historique et le règlement déclaré, sans nouvelle écriture. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [receipt-invoices.integration.test.ts](../../apps/backend/src/routes/receipt-invoices.integration.test.ts) — « vingt demandes simultanées retrouvent une seule facture et un seul numéro », passed, 2026-10-16T17:19:08.745Z ; [receipt-invoices.integration.test.ts](../../apps/backend/src/routes/receipt-invoices.integration.test.ts) — « émet un PDF avec l’émetteur historique et le règlement déclaré, sans nouvelle écriture », passed, 2026-10-16T17:19:08.745Z

## T34 — Identité légale historique — PASS

Préconditions et données : Facture émise et son PDF original.

Actions utilisateur / API : Changer les coordonnées de société puis télécharger à nouveau.

Attendu : Octets et empreinte identiques.

Observé : Assertions exécutées et réussies : un PDF émis ne change pas après la modification de la société. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoices.integration.test.ts](../../apps/backend/src/routes/invoices.integration.test.ts) — « un PDF émis ne change pas après la modification de la société », passed, 2026-10-16T17:19:08.745Z

## T35 — Numérotation concurrente — PASS

Préconditions et données : Société fictive, vingt créations distinctes.

Actions utilisateur / API : Créer vingt factures simultanément.

Attendu : Vingt numéros uniques, aucun document perdu.

Observé : Assertions exécutées et réussies : vingt créations concurrentes obtiennent vingt numéros différents. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoices.integration.test.ts](../../apps/backend/src/routes/invoices.integration.test.ts) — « vingt créations concurrentes obtiennent vingt numéros différents », passed, 2026-10-16T17:19:08.745Z

## T36 — Seuils 99,99 / 100 / 100,01 € — PASS

Préconditions et données : Profil légal et clients professionnels fictifs.

Actions utilisateur / API : Émettre les trois montants et examiner leurs mentions.

Attendu : Montants exacts et document complet sur demande, sans promesse légale.

Observé : Assertions exécutées et réussies : émet les seuils 99,99, 100 et 100,01 avec document complet et PDF historique exact. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoices.integration.test.ts](../../apps/backend/src/routes/invoices.integration.test.ts) — « émet les seuils 99,99, 100 et 100,01 avec document complet et PDF historique exact », passed, 2026-10-16T17:19:08.745Z

## T37 — Document multipage — PASS

Préconditions et données : Quarante lignes accentuées fictives.

Actions utilisateur / API : Générer et ouvrir le PDF produit.

Attendu : Vrai PDF paginé et métadonnées cohérentes.

Observé : Assertions exécutées et réussies : produit un PDF ouvrable, paginé, avec noms accentués. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoice-pdf.test.ts](../../apps/backend/src/lib/invoice-pdf.test.ts) — « produit un PDF ouvrable, paginé, avec noms accentués », passed, 2026-10-16T17:18:59.484Z

## T38 — Export fiscal réconcilié — PASS

Préconditions et données : Vente, ticket, facture, avoir et remboursement fictifs.

Actions utilisateur / API : Exporter les écritures puis comparer les catégories.

Attendu : Ventes, documents, encaissements et trésorerie séparés.

Observé : Assertions exécutées et réussies : exporte les pièces signées séparément, sans créer une deuxième vente ; la facture depuis ticket ne rajoute pas une vente ; avoir et remboursement restent distincts. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « exporte les pièces signées séparément, sans créer une deuxième vente », passed, 2026-10-16T17:19:08.745Z ; [financial-reconciliation.test.ts](../../apps/backend/src/lib/financial-reconciliation.test.ts) — « la facture depuis ticket ne rajoute pas une vente ; avoir et remboursement restent distincts », passed, 2026-10-16T17:18:59.484Z

## T39 — Acceptation de devis et conversion unique — PASS

Préconditions et données : Devis fictif accepté.

Actions utilisateur / API : Convertir deux fois concurremment.

Attendu : Une seule facture et lien de provenance.

Observé : Assertions exécutées et réussies : convertit un devis concurremment une seule fois, conserve son lien et retrouve la facture après réponse perdue ; gestion Chrome : température manuelle, erreur visible, persistance et conversion du devis. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoices.integration.test.ts](../../apps/backend/src/routes/invoices.integration.test.ts) — « convertit un devis concurremment une seule fois, conserve son lien et retrouve la facture après réponse perdue », passed, 2026-10-16T17:19:08.745Z ; [business-extended.spec.ts](../../tests/browser-lab/business-extended.spec.ts) — « gestion Chrome : température manuelle, erreur visible, persistance et conversion du devis », passed, 2026-10-16T17:20:05.787Z

## T40 — Facturation électronique XML — BLOCKED

Préconditions et données : Validateur structuré et canal de test habilité.

Actions utilisateur / API : Valider XML correct puis incorrect et transmettre en test.

Attendu : Rejet clair et statut de canal distinct de génération.

Observé : Format/canal Peppol ou MyGuichet non qualifié ; aucun accès de recette disponible.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T41 — PayPal sandbox payé — BLOCKED

Préconditions et données : Compte marchand et acheteur sandbox séparés, clés privées.

Actions utilisateur / API : Créer et capturer une transaction dans le sandbox officiel.

Attendu : Capture exacte vérifiée et affectée une seule fois.

Observé : Aucune clé sandbox fournie au laboratoire ; aucun appel PayPal distant effectué.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T42 — Paiement refusé par le prestataire — PASS

Préconditions et données : Prestataire et tentative de paiement fictifs.

Actions utilisateur / API : Refuser l’autorisation/capture et revenir à la caisse.

Attendu : Refus explicite et aucun paiement confirmé.

Observé : Assertions exécutées et réussies : un refus bancaire simulé est visible à rapprocher sans fausse capture ni libération de réserve. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « un refus bancaire simulé est visible à rapprocher sans fausse capture ni libération de réserve », passed, 2026-10-16T17:19:08.745Z

## T43 — Abandon de paiement — PASS

Préconditions et données : Tentative en attente créée par un prestataire.

Actions utilisateur / API : Abandonner l’approbation puis revenir tardivement.

Attendu : Pas de fausse capture ; réserve libérée seulement sur preuve applicable.

Observé : Assertions exécutées et réussies : un abandon acheteur puis son retour tardif ne vaut jamais annulation bancaire ou paiement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « un abandon acheteur puis son retour tardif ne vaut jamais annulation bancaire ou paiement », passed, 2026-10-16T17:19:08.745Z

## T44 — Timeout après débit ambigu — PASS

Préconditions et données : Prestataire simulé et tentative durable.

Actions utilisateur / API : Perdre la réponse puis tenter une autre référence.

Attendu : Deuxième débit refusé, résultat incertain conservé.

Observé : Assertions exécutées et réussies : après timeout une nouvelle référence ne déclenche pas un autre débit ; un timeout conserve la réservation et n’émet jamais un deuxième remboursement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « après timeout une nouvelle référence ne déclenche pas un autre débit », passed, 2026-10-16T17:19:08.745Z ; [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « un timeout conserve la réservation et n’émet jamais un deuxième remboursement », passed, 2026-10-16T17:19:08.745Z

## T45 — Webhook dupliqué — PASS

Préconditions et données : Notification vérifiée simulée.

Actions utilisateur / API : Recevoir deux fois le même événement.

Attendu : Une seule affectation et un seul débit de stock.

Observé : Assertions exécutées et réussies : deux notifications vérifiées du même événement produisent une seule affectation. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « deux notifications vérifiées du même événement produisent une seule affectation », passed, 2026-10-16T17:19:08.745Z

## T46 — Webhook avant retour navigateur — PASS

Préconditions et données : Tentative, webhook vérifié et parcours de retour ouverts.

Actions utilisateur / API : Recevoir le webhook avant le retour, puis revenir et rejouer.

Attendu : Écriture unique, navigateur non source de vérité.

Observé : Assertions exécutées et réussies : un webhook vérifié avant le retour puis deux retours navigateur ne créent qu’un seul règlement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « un webhook vérifié avant le retour puis deux retours navigateur ne créent qu’un seul règlement », passed, 2026-10-16T17:19:08.745Z

## T47 — Signature falsifiée — PASS

Préconditions et données : Webhook non signé ou signature Stripe erronée.

Actions utilisateur / API : Envoyer le corps falsifié.

Attendu : Rejet sans marquer payé.

Observé : Assertions exécutées et réussies : rejette un webhook non vérifié sans marquer payé ; vérifie la signature Stripe sur le corps brut et déduplique l’événement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « rejette un webhook non vérifié sans marquer payé », passed, 2026-10-16T17:19:08.745Z ; [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « vérifie la signature Stripe sur le corps brut et déduplique l’événement », passed, 2026-10-16T17:19:08.745Z

## T48 — Montant, devise ou marchand incohérent — PASS

Préconditions et données : Commande et identité marchand fictifs.

Actions utilisateur / API : Soumettre montant/devise incohérents puis preuve incomplète.

Attendu : Aucune confirmation de paiement.

Observé : Assertions exécutées et réussies : refuse un prix navigateur différent du solde serveur ; refuse la devise différente de la société ; une capture sans montant ou marchand vérifié ne marque jamais payé. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « refuse un prix navigateur différent du solde serveur », passed, 2026-10-16T17:19:08.745Z ; [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « refuse la devise différente de la société », passed, 2026-10-16T17:19:08.745Z ; [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « une capture sans montant ou marchand vérifié ne marque jamais payé », passed, 2026-10-16T17:19:08.745Z

## T49 — Événements désordonnés — PASS

Préconditions et données : Remboursement simulé rapproché avant fin de création.

Actions utilisateur / API : Recevoir ensuite un timeout de création tardif.

Attendu : SUCCEEDED ne redescend jamais en UNKNOWN.

Observé : Assertions exécutées et réussies : un timeout de création tardif ne rétrograde pas une preuve déjà confirmée par rapprochement. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « un timeout de création tardif ne rétrograde pas une preuve déjà confirmée par rapprochement », passed, 2026-10-16T17:19:08.745Z

## T50 — Remboursement partiel — PASS

Préconditions et données : Avoir et capture fictifs, adaptateur remplacé.

Actions utilisateur / API : Demander un remboursement puis fournir sa preuve exacte.

Attendu : Demande distincte du remboursement confirmé, aucune double réserve.

Observé : Assertions exécutées et réussies : une demande ne signifie pas remboursé ; une preuve exacte confirme une seule fois ; deux références concurrentes ne réservent pas plus que l’avoir. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « une demande ne signifie pas remboursé ; une preuve exacte confirme une seule fois », passed, 2026-10-16T17:19:08.745Z ; [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « deux références concurrentes ne réservent pas plus que l’avoir », passed, 2026-10-16T17:19:08.745Z

## T51 — Deux paiements du même solde — PASS

Préconditions et données : Deux références simultanées et même commande.

Actions utilisateur / API : Demander deux captures.

Attendu : Une seule réserve active autorisée.

Observé : Assertions exécutées et réussies : réserve le solde contre deux références concurrentes. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [payments.integration.test.ts](../../apps/backend/src/routes/payments.integration.test.ts) — « réserve le solde contre deux références concurrentes », passed, 2026-10-16T17:19:08.745Z

## T52 — Espèces et carte — PASS

Préconditions et données : Commande fictive ouverte.

Actions utilisateur / API : Déclarer les deux moyens puis consulter le solde.

Attendu : Moyens conservés, somme exacte, carte explicitement déclarée.

Observé : Assertions exécutées et réussies : un paiement mixte partiel conserve espèces et carte sans payer le reste. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [orders.integration.test.ts](../../apps/backend/src/routes/orders.integration.test.ts) — « un paiement mixte partiel conserve espèces et carte sans payer le reste », passed, 2026-10-16T17:19:08.745Z

## T53 — Terminal autonome déclaré — PASS

Préconditions et données : Avoir et tender carte fictifs.

Actions utilisateur / API : Déclarer une correction carte avec référence et motif.

Attendu : Déclaration auditée, pas de fausse sortie espèces ni vérification bancaire.

Observé : Assertions exécutées et réussies : une carte déclarée ne crée aucune sortie espèces, reste auditée et plafonnée. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « une carte déclarée ne crée aucune sortie espèces, reste auditée et plafonnée », passed, 2026-10-16T17:19:08.745Z

## T54 — Paiement en attente — PASS

Préconditions et données : Capture en cours ou UNKNOWN.

Actions utilisateur / API : Tenter un encaissement manuel concurrent.

Attendu : Solde non annoncé payé et nouveau règlement refusé.

Observé : Assertions exécutées et réussies : une tentative incertaine empêche un second encaissement manuel ; une capture PayPal en cours empêche le règlement à une autre caisse. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [orders.integration.test.ts](../../apps/backend/src/routes/orders.integration.test.ts) — « une tentative incertaine empêche un second encaissement manuel », passed, 2026-10-16T17:19:08.745Z ; [pos.integration.test.ts](../../apps/backend/src/routes/pos.integration.test.ts) — « une capture PayPal en cours empêche le règlement à une autre caisse », passed, 2026-10-16T17:19:08.745Z

## T55 — Frais, net, brut et versements — PASS

Préconditions et données : Relevé fictif, capture et remboursement simulés.

Actions utilisateur / API : Importer, rejouer et rapprocher manuellement.

Attendu : Frais/retenues/net distincts des ventes et des encaissements.

Observé : Assertions exécutées et réussies : importe et rapproche manuellement une capture, ses frais et son net sans ajouter une vente ; rapproche capture, remboursement confirmé, frais, retenue et libération sans modifier la vente. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [bank-payouts.integration.test.ts](../../apps/backend/src/routes/bank-payouts.integration.test.ts) — « importe et rapproche manuellement une capture, ses frais et son net sans ajouter une vente », passed, 2026-10-16T17:19:08.745Z ; [refunds.integration.test.ts](../../apps/backend/src/routes/refunds.integration.test.ts) — « rapproche capture, remboursement confirmé, frais, retenue et libération sans modifier la vente », passed, 2026-10-16T17:19:08.745Z

## T56 — Abonnement SaaS séparé des recettes — BLOCKED

Préconditions et données : Compte CréOrga et comptes marchands par société.

Actions utilisateur / API : Tester onboarding et flux de règlement indépendants.

Attendu : Aucune recette client vers le marchand SaaS.

Observé : Onboarding multicommerçant officiel et comptes prestataires de recette non disponibles.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T57 — Ticket physique 58 mm — BLOCKED

Préconditions et données : Modèle, pilote et papier qualifiés.

Actions utilisateur / API : Imprimer un ticket de vente et comparer au document.

Attendu : Lisible, complet et largeur réelle correcte.

Observé : Aucune imprimante thermique 58 mm raccordée et qualifiée.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T58 — Ticket physique 80 mm — BLOCKED

Préconditions et données : Modèle, pilote et papier qualifiés.

Actions utilisateur / API : Imprimer un ticket de vente et comparer au document.

Attendu : Lisible, complet et massicot correct.

Observé : Aucune imprimante thermique 80 mm raccordée et qualifiée.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T59 — Accents et euro imprimés — BLOCKED

Préconditions et données : Thermique et codepage réellement choisis.

Actions utilisateur / API : Imprimer FR/DE/LU/EN/PT et symbole euro.

Attendu : Aucun caractère manquant.

Observé : PDF logiciel seul insuffisant ; imprimante/codepage absents.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T60 — QR imprimé lisible — BLOCKED

Préconditions et données : Thermique et lecteur optique.

Actions utilisateur / API : Imprimer puis scanner à plusieurs résolutions.

Attendu : QR résolu vers la bonne session et aucun accès permanent.

Observé : Aucun couple imprimante/lecteur disponible pour cet essai.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T61 — Fin de papier — BLOCKED

Préconditions et données : Thermique et retour d’état qualifiés.

Actions utilisateur / API : Retirer le papier pendant une tâche.

Attendu : Erreur ou résultat inconnu honnête, tâche conservée.

Observé : Matériel et agent d’impression persistante non qualifiés.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T62 — Imprimante déconnectée puis reconnectée — BLOCKED

Préconditions et données : Imprimante et agent local.

Actions utilisateur / API : Débrancher puis rebrancher pendant l’envoi.

Attendu : Reprise explicite sans fausse preuve papier.

Observé : Aucun appareil pour cet essai physique.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T63 — Accusé perdu à l’impression — BLOCKED

Préconditions et données : Agent local et transport d’impression contrôlable.

Actions utilisateur / API : Perdre l’accusé après envoi.

Attendu : Statut inconnu, vérification ou duplicata explicite.

Observé : File persistante et imprimante à qualifier ; pas assimilé à une perte de réponse HTTP métier.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T64 — Duplicata sans nouvelle vente — BLOCKED

Préconditions et données : Reçu déjà réglé et service d’impression.

Actions utilisateur / API : Réimprimer et comparer ventes/règlements.

Attendu : Même référence, aucune nouvelle écriture.

Observé : Réimpression thermique de duplicata non qualifiée : matériel et commande persistante absents. Les relectures HTML seules ne prouvent pas ce parcours physique.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T65 — Tiroir fermé à la réimpression — BLOCKED

Préconditions et données : Tiroir et profil ESC/POS exacts.

Actions utilisateur / API : Réimprimer sans droit d’ouverture du tiroir.

Attendu : Aucune impulsion tiroir.

Observé : Aucun tiroir raccordé ; aucune impulsion déclenchée.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T66 — Cent lignes sur ticket — BLOCKED

Préconditions et données : Thermique 58/80 avec grandes commandes.

Actions utilisateur / API : Imprimer cent lignes et examiner coupe et totaux.

Attendu : Pas de troncature.

Observé : Multipage A4 testé ; ticket thermique de cent lignes non testé physiquement.

Catégorie du blocage : EXTERNAL (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T67 — Facture reçue avec vrai PDF — PASS

Préconditions et données : Serveur SMTP loopback et destinataire .invalid.

Actions utilisateur / API : Émettre et envoyer, puis lire le message reçu.

Attendu : Une pièce jointe PDF identique à l’original, une seule réception locale.

Observé : Assertions exécutées et réussies : reçoit le même PDF original dans la boîte locale, une fois malgré le rejeu. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoice-email.integration.test.ts](../../apps/backend/src/routes/invoice-email.integration.test.ts) — « reçoit le même PDF original dans la boîte locale, une fois malgré le rejeu », passed, 2026-10-16T17:19:08.745Z

## T68 — Accusé email perdu — PASS

Préconditions et données : SMTP loopback accepté après DATA puis réponse perdue.

Actions utilisateur / API : Relancer la demande d’envoi.

Attendu : Pas de deuxième message ; état incertain honnête.

Observé : Assertions exécutées et réussies : ne réexpédie pas après perte de l’accusé, même si le serveur a reçu le message. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [invoice-email.integration.test.ts](../../apps/backend/src/routes/invoice-email.integration.test.ts) — « ne réexpédie pas après perte de l’accusé, même si le serveur a reçu le message », passed, 2026-10-16T17:19:08.745Z

## T69 — Lien documentaire expiré — BLOCKED

Préconditions et données : Lien temporaire de document actif puis expiré.

Actions utilisateur / API : Télécharger après échéance.

Attendu : Refus sans octets divulgués.

Observé : Pas de lien documentaire signé temporaire implémenté. Les documents restent soumis à authentification et société ; l’expiration d’un QR n’est pas celle d’un document.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T70 — Pièce étrangère inaccessible — PASS

Préconditions et données : Deux sociétés fictives et dossiers de salariés.

Actions utilisateur / API : Lire/télécharger une pièce d’un autre dossier ou société.

Attendu : 403/404 sans contenu.

Observé : Assertions exécutées et réussies : refuse lecture, téléchargement et écriture hors de son propre dossier ; télécharge un vrai PDF original figé de l’avoir et refuse le document étranger. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [hr-documents.integration.test.ts](../../apps/backend/src/routes/hr-documents.integration.test.ts) — « refuse lecture, téléchargement et écriture hors de son propre dossier », passed, 2026-10-16T17:19:08.745Z ; [credit-notes.integration.test.ts](../../apps/backend/src/routes/credit-notes.integration.test.ts) — « télécharge un vrai PDF original figé de l’avoir et refuse le document étranger », passed, 2026-10-16T17:19:08.745Z

## T71 — Table 3 addition ouverte après départ — BLOCKED

Préconditions et données : Moteur d’alerte déterministe sans caméra.

Actions utilisateur / API : Déclarer un départ avec 24 € ouverts.

Attendu : Alerte prudente avec faits, délai et action humaine.

Observé : Moteur d’alertes déterministe de départ déclaré non implémenté. Aucun événement de départ fictif ne peut traverser ce parcours inexistant ; vidéo non activée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T72 — Client revenu — BLOCKED

Préconditions et données : Alerte de départ active.

Actions utilisateur / API : Déclarer le retour du groupe.

Attendu : Alerte temporisée/clôturée sans action financière.

Observé : Consommateur de retour humain lié aux alertes T71 non implémenté.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T73 — Personne encore à table — BLOCKED

Préconditions et données : Source d’occupation licite et groupe présent.

Actions utilisateur / API : Signaler une personne restante.

Attendu : Pas d’accusation ni de débit automatique.

Observé : Source d’occupation non qualifiée ; vidéo désactivée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T74 — Paiement au comptoir et alerte — BLOCKED

Préconditions et données : Alerte et paiement sur une autre caisse.

Actions utilisateur / API : Régler puis rafraîchir l’alerte.

Attendu : Alerte ne confond pas solde payé et départ.

Observé : Raccordement paiement / résolution des alertes T71 non implémenté ; le paiement serveur est testé séparément.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T75 — Table transférée et alerte — BLOCKED

Préconditions et données : Alerte rattachée à une session, transfert en cours.

Actions utilisateur / API : Déplacer la session.

Attendu : Alerte suit la bonne identité sans doublon.

Observé : Identité et suivi des alertes lors des transferts non implémentés ; aucun transfert financier n’est présenté comme un test du moteur absent.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T76 — Compte entreprise autorisé — BLOCKED

Préconditions et données : Crédit société approuvé avec échéance.

Actions utilisateur / API : Déclarer le départ sans encaissement immédiat.

Attendu : Créance explicite et non incident de départ.

Observé : Autorisation de crédit société et exemption d’alerte non modélisées / non implémentées ; une fiche client société seule ne vaut pas crédit approuvé.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T77 — Caméra perdue — BLOCKED

Préconditions et données : Installation et finalité licites, caméra qualifiée.

Actions utilisateur / API : Couper le flux.

Attendu : État inconnu, caisse indépendante.

Observé : Vidéo désactivée ; aucune caméra ni finalité validée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T78 — Image ancienne — BLOCKED

Préconditions et données : Flux de test horodaté et autorisé.

Actions utilisateur / API : Rejouer une image en retard.

Attendu : Rapprochement suspendu.

Observé : Pipeline vidéo non activé ni testé.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T79 — Décalage d’horloge vidéo — BLOCKED

Préconditions et données : Équipement vidéo et référence de temps.

Actions utilisateur / API : Introduire une dérive connue.

Attendu : Incertitude visible et association refusée.

Observé : Aucun équipement/pipeline vidéo qualifié.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T80 — Caméra déplacée — BLOCKED

Préconditions et données : Calibration initiale autorisée.

Actions utilisateur / API : Modifier le cadrage.

Attendu : Invalidation sans inventer une nouvelle association.

Observé : Vidéo désactivée et calibration inexistante.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T81 — Objet compté une fois — BLOCKED

Préconditions et données : Scène jouée annotée et droits appropriés.

Actions utilisateur / API : Suivre le même contenant sur plusieurs images.

Attendu : Pas de double comptage ni vente supposée.

Observé : Recherche séparée, pas de modèle ou de scène qualifiés.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T82 — Événement porte sans table — BLOCKED

Préconditions et données : Source porte autorisée, aucune association vérifiable.

Actions utilisateur / API : Produire un événement de sortie.

Attendu : Événement général uniquement.

Observé : Module vidéo non raccordé ; aucune association personnelle créée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T83 — Séquence manquante — BLOCKED

Préconditions et données : Extrait demandé hors disponibilité.

Actions utilisateur / API : Consulter l’extrait absent.

Attendu : Absence explicite, aucun contenu fabriqué.

Observé : Aucun stockage vidéo ni connecteur qualifié.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T84 — Masque de confidentialité effectif — BLOCKED

Préconditions et données : Flux direct, clips, miniature et export.

Actions utilisateur / API : Vérifier l’occultation avant traitement dans chaque sortie.

Attendu : Pixels privés réellement absents.

Observé : Aucun pipeline vidéo activé ; masques non prouvés.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T85 — Absence de son — BLOCKED

Préconditions et données : Caméra et flux multimédia de test.

Actions utilisateur / API : Examiner chaque piste et chaque sortie.

Attendu : Aucune piste audio collectée ou conservée.

Observé : Aucun flux multimédia utilisé ; absence de traitement ne vaut pas qualification technique.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T86 — Purge des clips — BLOCKED

Préconditions et données : Stockage vidéo autorisé et durée configurée.

Actions utilisateur / API : Dépasser l’échéance puis inspecter tous les dérivés.

Attendu : Clips et dérivés purgés selon politique.

Observé : Vidéo désactivée, aucune durée validée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T87 — Droits vidéo — BLOCKED

Préconditions et données : Rôles vidéo explicitement habilités.

Actions utilisateur / API : Ouvrir un extrait en salarié non habilité.

Attendu : Refus et journal de consultation.

Observé : Routes vidéo non déployées ; contrôle complet non exécuté.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T88 — Disque vidéo plein — BLOCKED

Préconditions et données : Volume vidéo séparé, caisse et quotas.

Actions utilisateur / API : Remplir le volume de test.

Attendu : Vidéo suspendue avant impact sur la caisse.

Observé : Volumes vidéo et matériel de test absents ; pas de remplissage du disque du PC.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T89 — URL caméra malveillante — BLOCKED

Préconditions et données : Connecteur réseau isolé et allowlist.

Actions utilisateur / API : Proposer une URL de métadonnées ou un rebond.

Attendu : Rejet sans connexion interdite.

Observé : Connecteur caméra non implémenté/qualifié ; pas de scan réseau.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T90 — Vidéo corrompue isolée — BLOCKED

Préconditions et données : Décodeur cloisonné et fichier de test.

Actions utilisateur / API : Importer un média corrompu.

Attendu : Échec borné sans compromettre la caisse.

Observé : Aucun décodeur vidéo isolé en service.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T91 — Facture fournisseur en double — BLOCKED

Préconditions et données : Import fournisseurs et document fictif.

Actions utilisateur / API : Importer deux fois la même pièce.

Attendu : Doublon détecté sans double stock/écriture.

Observé : Connecteur d’import de factures fournisseurs, pièce source et déduplication non raccordés. inventory-ai ancien n’est pas monté dans index.ts ; aucun OCR distant lancé.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T92 — Réception partielle distincte de facture — BLOCKED

Préconditions et données : Commande fournisseur fictive.

Actions utilisateur / API : Recevoir une partie puis joindre la facture.

Attendu : Stock augmenté seulement pour les quantités réellement reçues.

Observé : Réception partielle et lien de facture non implémentés. Une requête partielle créditait tout le stock ; elle est maintenant refusée sans écriture. Ce garde-fou ne remplace pas la réception partielle.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : [business-extended.integration.test.ts](../../apps/backend/src/routes/business-extended.integration.test.ts) — « une demande de réception partielle non prise en charge ne crédite jamais toute la commande fournisseur », passed, 2026-10-16T17:19:08.745Z

## T93 — Recettes et conversions stock — BLOCKED

Préconditions et données : Ingrédients et unités configurés.

Actions utilisateur / API : Vendre une recette avec conversions.

Attendu : Débit exact et réversible avec provenance.

Observé : Recette enregistrable mais unités / conversions et journal de consommation d’ingrédients non unifiés avec debitOrderInventory (produits uniquement). Ne pas présenter cette chaîne comme livrée.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T94 — Inventaire et pertes — BLOCKED

Préconditions et données : Comptage physique fictif indépendant.

Actions utilisateur / API : Déclarer une perte puis réaliser un inventaire.

Attendu : Écart explicite et historique de mouvements cohérent.

Observé : Comptage/pertes avec pièces, mouvements durables cloisonnés et rapprochement unifiés non livrés ; éditer Ingredient.currentStock ne constitue pas un inventaire traçable.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T95 — Réservation concurrente — PASS

Préconditions et données : Table et groupes fictifs, vingt clients API.

Actions utilisateur / API : Réserver simultanément puis tenter modification et réactivation conflictuelles.

Attendu : Une réservation au créneau, dix-neuf conflits, pas de contournement.

Observé : Assertions exécutées et réussies : une seule réservation gagne lors de vingt créations concurrentes sur le même créneau ; une modification ou réactivation ne peut pas contourner le conflit de table ; le filtre journalier suit Luxembourg, même lors du passage à l’heure d’été. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [reservations.integration.test.ts](../../apps/backend/src/routes/reservations.integration.test.ts) — « une seule réservation gagne lors de vingt créations concurrentes sur le même créneau », passed, 2026-10-16T17:19:08.745Z ; [reservations.integration.test.ts](../../apps/backend/src/routes/reservations.integration.test.ts) — « une modification ou réactivation ne peut pas contourner le conflit de table », passed, 2026-10-16T17:19:08.745Z ; [reservations.integration.test.ts](../../apps/backend/src/routes/reservations.integration.test.ts) — « le filtre journalier suit Luxembourg, même lors du passage à l’heure d’été », passed, 2026-10-16T17:19:08.745Z

## T96 — QR d’ancienne session — PASS

Préconditions et données : Ancienne visite fermée, expirée ou révoquée après fusion.

Actions utilisateur / API : Relire addition et suivi, puis ouvrir la nouvelle visite.

Attendu : Ancienne capacité refusée, nouveau groupe isolé.

Observé : Assertions exécutées et réussies : refuse un lien expiré et permet une nouvelle visite sans réutiliser l’ancien lien ; ferme les accès sans effacer une créance, puis isole la nouvelle visite ; fusion POS/QR, acompte, réponse perdue et addition privée renouvelée. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [guest-visits.integration.test.ts](../../apps/backend/src/routes/guest-visits.integration.test.ts) — « refuse un lien expiré et permet une nouvelle visite sans réutiliser l’ancien lien », passed, 2026-10-16T17:19:08.745Z ; [guest-visits.integration.test.ts](../../apps/backend/src/routes/guest-visits.integration.test.ts) — « ferme les accès sans effacer une créance, puis isole la nouvelle visite », passed, 2026-10-16T17:19:08.745Z ; [qr-movements.spec.ts](../../tests/browser-lab/qr-movements.spec.ts) — « fusion POS/QR, acompte, réponse perdue et addition privée renouvelée », passed, 2026-10-16T17:21:22.913Z

## T97 — Congé selon rôle — PASS

Préconditions et données : Propriétaire et deux salariés fictifs.

Actions utilisateur / API : Déposer, approuver et relire une demande avec chaque rôle.

Attendu : Salarié limité à sa demande, responsable habilité.

Observé : Assertions exécutées et réussies : un congé ne fuit pas vers le collègue ; seul le responsable approuve et l’état persiste. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [business-extended.integration.test.ts](../../apps/backend/src/routes/business-extended.integration.test.ts) — « un congé ne fuit pas vers le collègue ; seul le responsable approuve et l’état persiste », passed, 2026-10-16T17:19:08.745Z

## T98 — HACCP sans mesure inventée — PASS

Préconditions et données : Tâche de relevé et capteur absent.

Actions utilisateur / API : Ouvrir une tâche sans mesure puis valider manuellement.

Attendu : Valeur manquante explicite, auteur et source manuels.

Observé : Assertions exécutées et réussies : une température manquante ne devient ni zéro ni conforme ; la mesure saisie est identifiée manuelle ; gestion Chrome : température manuelle, erreur visible, persistance et conversion du devis. Portée : laboratoire logiciel, banque simulée lorsqu’impliquée, aucune preuve matérielle.

Preuves : [business-extended.integration.test.ts](../../apps/backend/src/routes/business-extended.integration.test.ts) — « une température manquante ne devient ni zéro ni conforme ; la mesure saisie est identifiée manuelle », passed, 2026-10-16T17:19:08.745Z ; [business-extended.spec.ts](../../tests/browser-lab/business-extended.spec.ts) — « gestion Chrome : température manuelle, erreur visible, persistance et conversion du devis », passed, 2026-10-16T17:20:05.787Z

## T99 — Langues et responsive — BLOCKED

Préconditions et données : Chrome neuf 375/768/1440 et langues proposées.

Actions utilisateur / API : Utiliser clavier, zoom, tactile et chaque langue du périmètre.

Attendu : Pas de débordement, focus visible et texte traduit.

Observé : Traductions complètes des écrans métier non implémentées (textes français codés dans les pages, sélecteur global partiel). Les fenêtres testées à 375/768/1440 et au clavier ne valident pas toutes les langues / le zoom global.

Catégorie du blocage : UNIMPLEMENTED (voir ALLOCATION-FINANCIERE-ET-RECETTE.md).

Preuves : Aucune exécution complète du scénario revendiquée.

## T100 — Tous les boutons et modes dégradés — NOT RUN

Préconditions et données : Inventaire exhaustif des écrans livrés et scénarios erreur/hors ligne.

Actions utilisateur / API : Cliquer chaque contrôle et vérifier sa persistance.

Attendu : Aucune action fantôme, erreurs honnêtes et droits respectés.

Observé : Inventaire JSX/handlers/routes reproductible réalisé dans cinq applications et parcours Chrome critiques étendus exécutés ; voir [T100-CONTROLES-ET-PERFORMANCE.md](T100-CONTROLES-ET-PERFORMANCE.md) et [les preuves ciblées](preuves/t100-validation-2026-10-16.json). Les instances rendues, tous les rôles et variantes erreur/persistance restent à terminer. Aucun PASS global n'est déduit du scan, et ce travail restant n'est pas caché en BLOCKED.

Preuves : Aucune exécution complète du scénario revendiquée.
