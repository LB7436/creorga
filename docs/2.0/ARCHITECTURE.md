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

Prochaines décisions : allocation des paiements partiels, moteur monétaire exact partagé,
documents d'émission immuables et file d'impression durable. Ne pas multiplier les services :
impression et vidéo seront isolées uniquement lorsque leurs connexions réelles seront qualifiées.
La vidéo ne possède aucun droit d'écriture sur paiements, ventes ou comptabilité.
