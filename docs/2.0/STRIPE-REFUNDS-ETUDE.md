# Stripe Refunds : étude, pas activation

Consultation des sources primaires le 16 octobre 2026. Le CLI Stripe n'est pas installé
sur cet environnement ; consultation des pages officielles publiques en repli. Aucun secret,
login Stripe, création de carte, appel API bancaire ou remboursement sandbox/réel exécuté.

L'API permet un remboursement sur une Charge ou un PaymentIntent, montant partiel en unité
mineure. La somme remboursée est limitée au restant de l'opération d'origine.
[Référence de création](https://docs.stripe.com/api/refunds/create).

L'objet Refund distingue notamment pending, requires_action, succeeded, failed et canceled,
avec références du paiement et, selon le cas, motif d'échec et opération de solde inverse.
Ces états ne doivent pas être réduits à « demande acceptée = client remboursé ».
[Référence Refund](https://docs.stripe.com/api/refunds/object).

La clé d'idempotence est conservée lors d'une reprise réseau, avec journal interne durable.
Les réponses API v1 mémorisées peuvent inclure des erreurs ; changer la clé n'est pas une
preuve d'absence de débit. [Idempotence Stripe](https://docs.stripe.com/api/idempotent_requests).

Les remboursements peuvent attendre un solde disponible ; certaines restitutions échouent.
Les schémas Connect impliquent des responsabilités différentes sur les transferts/frais.
[Guide remboursements](https://docs.stripe.com/refunds).

## Conception proposée (non implémentée)

Réutiliser les réservations avoir/capture/commande, le verrou société et les plafonds communs
avec les déclarations manuelles. Le compte d'encaissement doit rester séparé des abonnements
SaaS et correspondre au marchand de la capture. Relire le PaymentIntent/Charge, puis le Refund
dans le même périmètre marchand ; vérifier ID, origine, devise et montant exact. Aucun retour
navigateur ne constitue une preuve. Intégrer notifications signées, déduplication et relecture
des événements tardifs/désordonnés, sans relâcher une réservation sur timeout.

Avant activation : qualifier la version API du SDK réellement installée et la configuration
Connect éventuelle ; tests simulés des cinq états et doublons, puis sandbox explicitement
configurée. Tester timeout après création, incohérence marchand, remboursement partiel,
erreur tardive, litige et séparation des frais/versements. Aucun bouton de remboursement
Stripe n'est annoncé opérationnel dans ce lot. La libération des réserves exige une preuve
appropriée et une procédure distincte, pas un simple bouton d'annulation locale.
