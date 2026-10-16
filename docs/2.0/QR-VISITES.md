# Accès clients par visite

Dans `/qrmenu` ou la section QR de `/clients`, choisir une table réelle puis « Ouvrir la visite
et afficher son QR ». Un autre lien peut être émis pour la même visite, sans invalider les
téléphones présents. Les liens autorisent commandes, suivi, addition et paiement de cette visite.
Le menu et les jeux restent accessibles par QR permanent, sans accès financier.

« Terminer la visite » exige un motif. Pour une addition impayée ou un paiement en cours, le
personnel confirme sa conservation avant révocation. La fermeture ne règle et n'efface rien.
Les anciennes commandes sans visite restent au personnel ; le groupe suivant ne voit pas leur créance.

Expiration serveur : huit heures, borne en base de 24 heures. Auteur, fermeture et motif conservés.
Seule l'empreinte SHA-256 du secret aléatoire de 256 bits est en base. Le fragment du lien passe
dans sessionStorage cloisonné, puis en en-tête API ; jamais au prestataire bancaire. Partager ce
lien partage l'accès à l'addition pendant sa validité. Aucune fiche CRM n'est exigée pour acheter.

Retour bancaire : cookie signé HttpOnly, par tentative, douze heures, SameSite=Lax et Secure en
production. Il autorise une vérification tardive, jamais un succès sans preuve prestataire. Des
cookies distincts préservent plusieurs retours. Suivi client par requêtes autorisées ; canaux
WebSocket publics de table retirés.

Périmètre : additions des commandes QR. Paiement en ligne des lignes POS natives, transfert de
visite entre tables et partages persistants encore à construire. Cette visite n'est pas une
session de service universelle. OWNER/MANAGER/EMPLOYEE/WAITER/CASHIER peuvent gérer les visites ;
cuisine et terminaux sans utilisateur ne peuvent pas émettre les liens.

Migration additive `20261008190000_guest_visits`, sans reprise automatique des anciens impayés.
Recette partageable : `guest-visits.integration.test.ts` sur base isolée.
