# Paiements et calculs actuels

Le solde et la devise viennent de la commande serveur autorisée. La tentative et ses clés
sont enregistrées avant l'appel externe. Une tentative en cours ou inconnue réserve le
solde ; le prix du navigateur doit correspondre exactement, au centime.

Encaissement et mutations de commande partagent un verrou PostgreSQL. Vingt appels
concurrents sans référence commune produisent une seule réussite. Une déclaration
manuelle est identifiée comme telle. Une commande payée ne reçoit plus de modification
destructive de ligne. Le moteur travaille en fractions décimales et centimes entiers,
avec prix catalogue TTC, remises allouées par plus grands restes et ventilation par taux.
Le raccordement du calcul HT aux documents et sa validation comptable restent à terminer.

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

Restent : paiements partiels, paiement natif de groupes de couverts POS, remboursements,
commissions, cartes cadeaux comme règlement, parcours Stripe public QR, documents figés
et onboarding multicommerçant. Les abonnements SaaS Stripe restent séparés des recettes.
