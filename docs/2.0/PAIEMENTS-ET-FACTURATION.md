# Paiements et calculs actuels

Le solde et la devise viennent de la commande serveur autorisée. La tentative et ses clés
sont enregistrées avant l'appel externe. Une tentative en cours ou inconnue réserve le
solde ; le prix du navigateur doit correspondre exactement, au centime.

Encaissement et mutations de commande partagent un verrou PostgreSQL. Vingt appels
concurrents sans référence commune produisent une seule réussite. Une déclaration
manuelle est identifiée comme telle. Une commande payée ne reçoit plus de modification
destructive de ligne. Le moteur travaille en fractions décimales et centimes entiers,
avec prix catalogue TTC, remises allouées par plus grands restes et ventilation par taux.
Le calcul HT est raccordé aux factures et aux aperçus ; la validation comptable des catégories
fiscales et des modèles avant production reste nécessaire.

PayPal : création Orders v2, capture, relecture serveur et contrôle du montant, de la devise,
du marchand et des références. Affectation unique et corps bancaire brut non transmis au
navigateur. Webhooks vérifiés via PayPal puis capture relue ; événements dédupliqués et
notifications vérifiées non encore rattachables conservées pour reprise. Les remboursements
et litiges sont signalés pour revue, sans comptabilisation automatique annoncée.

Références consultées le 8 octobre : [Orders v2](https://developer.paypal.com/api/orders/v2),
[idempotence](https://developer.paypal.com/api/rest/reference/idempotency/) et
[vérification des notifications](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post).

Les essais remplacent les échanges prestataire : **aucun essai dans le vrai sandbox PayPal
ni débit réel**. Configuration privée d'une société pilote : `PAYMENT_MERCHANT_COMPANY_ID`,
`PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`,
`PAYPAL_WEBHOOK_ID`. Aucun secret dans Git ou le front. Le live nécessite une activation
explicite ; le laboratoire bloque les connexions sortantes.

Stripe 23 utilise l'API 2026-09-30 et les clés commerçant distinctes `STRIPE_PAYMENT_KEY` et
`STRIPE_PAYMENT_WEBHOOK_SECRET`. La signature est vérifiée sur le corps brut, puis Checkout
et PaymentIntent sont relus : capture effective, marchand, montant, devise et références doivent
concorder. Les paiements d'additions QR partagent le journal serveur et ses affectations par commande.
Le QR statique n'est pas encore un QR de visite révocable ; ce parcours public reste non qualifié
pour un service réel. Le mode manuel d'un terminal autonome ne devient pas une preuve bancaire.

Les cartes cadeaux prépayées constituent désormais un règlement `GIFT_CARD` distinct des remises.
Exemple testé : 11,70 € TTC, dont 1,70 € de TVA, payés avec 10 € de crédit et 1,70 € d'espèces.
La vente conserve 11,70 € et le débit du crédit est transactionnel et idempotent. Les nouveaux
reçus POS figent l'émetteur, les taux et la ventilation. Les anciens restent signalés reconstitués.

Les nouvelles factures émises stockent contenu, date, PDF original et SHA-256 dans PostgreSQL.
Le format A4 original ne change pas après modification de société. La file `InvoiceDelivery`
conserve la référence, destinataire et empreinte du document ; acceptation SMTP ≠ distribution.
Les essais d'email sont limités au dialogue loopback et aux adresses fictives autorisées.

Restent : paiements partiels persistants, paiement en ligne de couverts POS natifs, remboursements,
commissions, conversion ticket vers facture unique, avoirs et onboarding multicommerçant.
La prise de commande POS ouverte doit encore figer ses prix côté serveur. L'émission du crédit
cadeau ne possède pas encore un livre comptable complet. Aucun historique n'est réécrit.
