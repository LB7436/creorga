# Architecture de reprise

## Relevé actuel — droits et autorité locale,18octobre2026

Le laboratoire utilise `CREORGA_BUSINESS_ONLY` et une seule autorité de salle
PostgreSQL : FloorWorkspace et les sessions/lignes/affectations transactionnelles.
Les anciens fichiers restent conservés, pas promus automatiquement en source SQL ;
leurs mutations HTTP sont refusées503avant effet métier quand l'autorité requise
manque. Des configurations/pièces et brouillons navigateur restent séparés ;
ne pas lire le paragraphe historique ci-dessous comme une nouvelle autorité fichiers.
Les droits vivent dans l'adhésion active UserCompany, révisionnée et auditée.
Robi lit localement les données autorisées ; son provider génératif et les anciens
workflows ne sont pas qualifiés. Le drain coordonné reste fail-closed en cas
d'abandon de réponse HTTP, sans déconnecter une base potentiellement utilisée.
[Détails, tests et limites](DROITS-FINS-ROBI-RECETTE-2026-10-18.md).

## Décisions initiales conservées

Décision : conserver Express, Prisma/PostgreSQL et les applications React/Vite existantes.
Le backend local constitue l'autorité d'écriture du laboratoire ; aucun second serveur central
ne reçoit de ventes et aucune synchronisation « double maître » n'est activée.

Sources de vérité actuelles : commandes et journal comptable PostgreSQL ; brouillons de salle,
configuration et pièces sur disque ; préférences et brouillons de clients dans leurs navigateurs.
La copie navigateur seule n'est jamais présentée comme un règlement confirmé.

La première évolution ajoute une tentative de paiement durable avant l'appel au prestataire.
La transaction PostgreSQL réserve la commande ; l'appel HTTP reste hors transaction.
Une réponse inconnue conserve la réservation et la clé d'opération, permettant une enquête
sans initier automatiquement un nouveau débit. Les clés marchandes historiques doivent être
explicitement rattachées à une seule société ; elles ne sont pas partagées implicitement entre clients.

Le moteur monétaire en centimes exacts est partagé avec les aperçus de facture. Les factures
émises conservent un snapshot et leur PDF A4 original en PostgreSQL (`Invoice.issuedPdf`) ;
les rendus thermiques utilisent le contenu figé. `InvoiceDelivery` réserve durablement un envoi
et distingue acceptation SMTP, échec connu et résultat incertain. Une réponse perdue après DATA
n'est pas rejouée automatiquement.

`PaymentAllocation` lie chaque commande d'une addition multi-tournées à son règlement ;
`PaymentSettlement.orderId` reste une ancre, pas le montant imputé à chaque commande.
Les clés Stripe commerçant et abonnement SaaS sont séparées. Un connecteur non vérifiable
ne devient pas un paiement bancaire confirmé par simple retour de navigateur.

Les visites QR sont distinctes du plan : `GuestVisit`/`GuestVisitAccess`, capacités révocables et
FK société/visite. Les anciens impayés ne passent pas au groupe suivant. Un même verrou de table
sérialise ouverture, fermeture, commande et réservation de paiement. La capture tardive reste affectée.

Les prix POS ouverts sont gelés dans un registre réservé au serveur. Le catalogue courant sert
aux nouvelles lignes ; l'historique incomplet exige une revue OWNER/MANAGER motivée. Ce registre
JSON reste à unifier avec une autorité transactionnelle de sessions natives.

Lot financier `dfb708a` : `SaleOrigin` empêche qu'une provenance consommée alimente un nouveau
reçu. Les `OrderItem` ne deviennent pas des lignes natives indépendantes. `OrderTender` conserve
les affectations partielles et sépare consommations/pourboires/dons. `CreditNote` est une pièce
distincte ; `RefundAttempt`/`RefundAllocation` réservent le remboursement par avoir/capture/commande.
`CashMovement` et les champs v2 nullable de `CashDrawer` produisent un comptage figé. Le verrou
de société précède table/commande. L'appel réseau reste hors transaction ; absence de preuve ≠ succès.

Les historiques ne sont pas réécrits. La session transactionnelle complète, préparation et
transferts restent à unifier ; une source manquante n'est pas reconstruite arbitrairement.
Journal documentaire ≠ nouvelle vente ; CSV opérationnel ≠ grand livre qualifié.
Voir `COEUR-FINANCIER-P0.md`.

Prochaines décisions : unification POS/visites, remboursements manuels, rapprochement comptable
et file d'impression durable. Ne pas multiplier les services :
impression et vidéo seront isolées uniquement lorsque leurs connexions réelles seront qualifiées.
La vidéo ne possède aucun droit d'écriture sur paiements, ventes ou comptabilité.
