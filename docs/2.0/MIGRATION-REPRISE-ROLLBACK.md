# Reprise et retour arrière

Les archives privées originales restent immuables. Le laboratoire crée une base snapshot,
une base locale modifiable et une base de tests vide, puis restaure fichiers et base du même instant.
La preuve de reprise et les configurations contenant des secrets restent hors dépôt.

Migrations appliquées : journal POS du 5 septembre puis `20261008130000_payment_attempts`.
Cette dernière crée uniquement une table, des contraintes et index. Elle ne renumérote ni
ne réécrit les commandes historiques. La contrainte composite empêche de rattacher une
tentative à une commande d'une autre société.

Migrations supplémentaires appliquées uniquement aux copies locale et fictive de tests :

- `20261008143000_payment_settlements` : confirmations et événements prestataire.
- `20261008153000_payment_allocations` : affectations par commande, réservation active unique,
  trace de débit de stock. Les anciennes ventes ne sont pas réinterprétées.
- `20261008163000_issued_documents` : profil légal, champs professionnels du client,
  contenu d'émission, PDF et empreinte. Aucun original historique n'est inventé.
- `20261008173000_invoice_delivery` : file transactionnelle et références d'envoi.
- `20261008190000_guest_visits` : visites, capacités hachées, rattachement nullable des nouvelles
  commandes et tentatives. Aucun ancien impayé n'est automatiquement rattaché.
- `20261016140000_hr_document_integrity` : empreinte nullable et suppression en attente des pièces RH.
  Les anciens fichiers ne reçoivent pas de preuve d'intégrité inventée. L'ancien code pourrait
  rouvrir une pièce retirée ; désactiver ses routes RH en cas de retour, garder les tombstones.
- `20261016150000_receipt_invoice_link` : facture unique par ticket, clé étrangère société/ticket,
  profil historique de provenance. Ne retirer aucun lien pour recréer un document. L'ancien code
  n'impose pas l'immutabilité financière de ces brouillons : ne pas le remettre en écriture dessus.
- `20261016160000_sale_origins` : provenances uniques des nouvelles ventes ; aucune réécriture
  ni attribution automatique aux anciens reçus sans identifiants fiables.
- `20261016170000_credit_notes` : avoirs distincts, numéros uniques, original/PDF/TVA conservés.
- `20261016180000_order_tenders` : affectations par commande, sources composées par société,
  consommations/pourboires/dons séparés. Aucun backfill des anciens états payés.
- `20261016190000_cash_ledger` : champs v2 nullable, mouvements, unicité des nouvelles sessions
  ouvertes, rapport de clôture figé. Les anciennes sessions ne sont pas converties implicitement.
- `20261016200000_refund_attempts` : réservations durables de remboursement, avoir/capture liés.
- `20261016210000_refund_allocations` : part de capture réservée par commande d'origine.
  Une réservation ancienne sans ventilation n'est pas reconstruite : rapprochement requis.

Ces évolutions sont additives. Le code précédent ne sait pas rapprocher toutes les nouvelles
affectations : revenir au vieux code avec des tentatives actives constitue un retour dangereux.
Conserver l'état courant et traiter les opérations ambiguës avant toute remise en service.
Le vérificateur en lecture seule `scripts/verify-restored-copy.mjs` compare les tables, colonnes,
empreintes et octets des PDF entre deux bases locales distinctes ; il ne restaure ni ne supprime rien.

Retour arrière : arrêter les applications du laboratoire, conserver un export de son état,
recréer une **nouvelle** base depuis l'archive originale et utiliser le code de l'instant voulu.
Ne pas supprimer une table de tentatives contenant des opérations non rapprochées.
Une tentative inconnue doit être rapprochée avant remise en service financière.

Les anciens profils de navigateur et leurs origines n'ont pas été effacés. L'export des ventes
qui n'existeraient que dans ces profils reste à exécuter dans chaque navigateur concerné.
Le travail local ne déclenche pas d'encaissement, remboursement, SMS ou email réel.

Le code antérieur au gel des prix et aux visites pourrait recalculer un ancien tarif et rouvrir
un QR permanent. Ne pas remettre ces endpoints en service avec l'ancien code. Conserver migration
et données ; préférer un correctif en avant. Tout retour impose arrêt, sauvegarde et recette des
prix/autorisations. Ne jamais appliquer les tests ou migrations au snapshot original.

Reprise native du 16 octobre : archive v2 chiffrée, déchiffrée, restaurée dans une base neuve ;
59 tables, six fichiers et deux PDF égaux. Ancien outil Docker durci : extraction en flux contrôlée,
UUID exclusifs, `pg_restore --exit-on-error --single-transaction`, erreurs expurgées, nettoyage des
seules ressources créées. Ses 18 tests simulent Docker ; ils ne prouvent pas une exécution Docker.

Dernière reprise native après lot ticket/facture : 59 tables, huit fichiers (dont RH) et trois
originaux PDF égaux. Chiffrement vérifié ; 1 529 ms sur cette copie, sans engagement de RTO.

Dernière reprise après lot financier `dfb708a` : **65 tables**, huit fichiers, sept PDF facture
et six PDF avoir intègres/identiques, AES-GCM vérifié, 1 646 ms (pas un RTO). Les tables
de provenances POS et de remboursements sont vides dans cette copie ; leurs lignes ont été
testées en intégration. Le vérificateur contrôle désormais aussi `CreditNote.pdf/pdfHash`.

Rollback de ce lot : arrêter les écrivains, conserver une nouvelle archive de l'état courant
et des réservations, puis restaurer dans une autre base. Ne pas retirer `SaleOrigin` pour revendre
une ligne, ni `OrderTender` pour réouvrir un solde, ni les avoirs/réserves pour libérer un plafond.
L'ancien code ignore les acomptes et les mouvements v2 : **ne pas le réactiver en écriture**
sur cette base migrée. Un correctif en avant est préférable. Aucun down/reset proposé.
La sauvegarde doit inclure les nouvelles références navigateur incertaines avant tout changement
d'origine ; T04 réel reste distinct et non exécuté (`T04-REPRISE-HISTORIQUE.md`).
