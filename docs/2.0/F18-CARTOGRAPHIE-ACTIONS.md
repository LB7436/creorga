# F18 — cartographie préalable des actions

Cette carte prépare la recette du 18 octobre ; **elle n'atteste aucune exécution**.
Les identifiants sont combinés avec A/B/C et le profil, par exemple
`A-EMPLOYEE/STOCK-READ`. Les captures, retours HTTP et observations SQL sont
consignés séparément. Les preuves historiques sont conservées sans être recomptées.

| Contrôle | Vraie entrée utilisateur | Effet et autorité | Vérification prévue |
|---|---|---|---|
| AUTH | Connexion, société active, déconnexion | Auth/session navigateur ; UserCompany et révocation serveur | Identité/capacités, contexte neuf, reload et verrouillage après sortie ; aucune valeur de jeton dans preuve |
| RIGHTS | `/admin/users`, formulaire motivé/versionné | PATCH membre ; UserCompany + BusinessPermissionEvent | Pas de privilège plateforme ; permission actuelle et ancien onglet ; audit et refus intersociétés |
| CASH | ERP caisse / POS caisse | Ouverture, mouvements, clôture ; CashDrawer/CashMovement | Montants en centimes, permissions, état après reload ; une nouvelle journée distincte, jamais réouvrir la clôture ancienne |
| SERVICE | POS table/commande | Brouillon PostgreSQL : FloorWorkspace, ServiceSession/Cover et révision | Prix/TVA figés, lignes/groupes, rechargement et concurrence ; pas d'import de vieux brouillon |
| PREPARE | POS bar/cuisine | Ticket et transition de préparation via routes réelles | Identité des lignes, transition unique ; ne pas marquer servies les anciennes ventes pour remplir le test |
| PAYMENT | POS acompte/solde/règlement | Transactions Order/PosSale/OrderTender, réservations prestataire | ID stable, centimes, restant dû, stock une fois ; carte déclarée ≠ banque vérifiée |
| MOVE | POS transfert/fusion/séparation | TableMovement, ServiceAllocation/Share, GuestVisitAccess | Provenance, réserves et droits QR conservés ou révoqués explicitement ; ambiguïté refusée |
| DOCUMENT | Facture existante et nouvelles pièces si scénario distinct | Invoice/CreditNote + PDF historique | Pas de nouvelle vente depuis une facture ; prix/TVA historiques et octets téléchargés distincts du PDF en base |
| EXPORT | Clôture/rapports/rapprochement/planning selon droit | CSV local ou endpoint selon contrôle ; exports.read séparé | Clic, contrôle frais des droits, type/taille/octets si outils autorisés ; refus de protection = BLOCKED sans autre chemin |
| STOCK-READ | `/inventory/stock` | Product.stock et Ingredient.currentStock sont distincts | Quantité permise sans coût ; pas de coût inconnu affiché comme zéro ; vérification réponse serveur |
| STOCK-WRITE | Catalogue/stock/fournisseurs/achats | Prix/quantités et réception contrôlée, relations société | Écriture permise et refus ; anciens prix fiscaux inchangés ; réception partielle/recette avancée non présumées disponibles |
| HR | Planning, congés, pointages | Shift/LeaveRequest/TimePunch + permissions propres/équipe | Nuit Europe/Luxembourg, date de fin, refus collègue ; anciens pointages ambigus conservés |
| ROBI | Panneau/écran Robi | Lecture locale autorisée via agent et données société | CA propriétaire/refus employé, stock sans coût, planning, révocation ; IA générative externe séparée BLOCKED sans fournisseur autorisé |
| QR | URL obtenue via le panneau de visite, puis `/c` isolé | Visite/accès, panier de visite, Order/OrderItem, addition | Deux commandes distinctes, UUID conservé en réponse incertaine, ancien lien refusé ; aucune association arbitraire de groupes |
| RECOVERY | Rechargement/fermeture d'un onglet de laboratoire ; arrêt officiel | SQL durable, références idempotentes et suivi des callbacks/tâches | Non reçu / rollback / commit sans réponse / rejeu distincts ; aucune réserve libérée par socket fermé |
| BACKUP | Lanceur/arrêt, copie cohérente et nouvelle base | PostgreSQL + fichiers du même instant, archive chiffrée | Tables/lignes/PDF/SHA et événements de droits ; aucune purge ni écrasement source |

## Limites connues à revalider

La page de réservations opérationnelles et les variantes tarifées ne sont pas
présumées disponibles parce qu'une route API ou un champ de note existe. Les
accès directs sont testés en plus des menus. Les prévisualisations 58/80 mm ne
prouvent ni papier sorti ni tiroir ouvert. Une mise en page lue dans l'arbre
d'accessibilité ne prouve pas le contraste visuel ou la lisibilité sur chaque
largeur ; ces verdicts exigent des observations appropriées et autorisées.
