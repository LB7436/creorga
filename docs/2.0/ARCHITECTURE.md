# Architecture de reprise

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

Prochaines décisions : allocation des paiements partiels, conversion ticket/facture unique,
revocation des QR de session et file d'impression durable. Ne pas multiplier les services :
impression et vidéo seront isolées uniquement lorsque leurs connexions réelles seront qualifiées.
La vidéo ne possède aucun droit d'écriture sur paiements, ventes ou comptabilité.
