# TESTPLAN — Creorga OS

Matrice de test par module. Chaque ligne a un **critère de succès observable**.
Colonne « Auto » : `✔` = couvert par un test automatisé (`apps/backend/src/routes/*.audit.test.ts`
ou `tests-e2e/`), `manuel` = à vérifier à la main, `sandbox ✗` = non testable en cloud
(clés externes, matériel, cron VPS).

Référence TVA : **taux normal luxembourgeois 17 %**, réduits 14 % / 8 % / 3 %.
Convention du code : `taxRate` est un **pourcentage** (`17`), pas une fraction.

---

## 1. Authentification et accès

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| AUTH-1 | Login identifiants valides | 200 + `accessToken` + `refreshToken` | ✔ |
| AUTH-2 | Login mot de passe faux | 401, aucun token émis | ✔ |
| AUTH-3 | Login email inexistant | 401 (message identique à AUTH-2, pas d'énumération de comptes) | ✔ |
| AUTH-4 | Route protégée sans token | 401 | ✔ |
| AUTH-5 | Route protégée token malformé | 401, pas de 500 | ✔ |
| AUTH-6 | Refresh token valide | 200 + nouvel access token | ✔ |
| AUTH-7 | Rate limit `/api/auth` | 429 après le seuil | manuel |
| AUTH-8 | Isolation multi-société | Un utilisateur de la société A ne lit pas les données de B (403/liste vide) | ✔ |
| AUTH-9 | Rôles (`OWNER`/`ADMIN`/`MANAGER`/`EMPLOYEE`) | Un `EMPLOYEE` ne peut pas supprimer une société ni changer les rôles | ✔ |

## 2. POS / Caisse

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| POS-1 | Créer une commande avec 2 lignes | 201, `orderNumber` séquentiel, `total = subtotal + taxAmount` | ✔ |
| POS-2 | Calcul TVA 17 % | Pour 100 € HT : `taxAmount = 17.00`, `total = 117.00` (± 0,01) | ✔ |
| POS-3 | Produits à taux mixtes (17 % et 3 %) | TVA calculée **ligne par ligne**, pas au taux global | ✔ |
| POS-4 | Commande sans ligne | 400, pas de commande créée | ✔ |
| POS-5 | Quantité négative | 400 (refus), aucun total négatif en base | ✔ |
| POS-6 | Quantité zéro | 400 | ✔ |
| POS-7 | Produit inexistant | 400/404, pas de 500 | ✔ |
| POS-8 | Ajout de ligne sur commande existante | Totaux recalculés | ✔ |
| POS-9 | Suppression de ligne | Totaux recalculés à la baisse | ✔ |
| POS-10 | Encaissement (`/checkout`) | Statut `PAID`, `paidAt` renseigné, moyen de paiement stocké | ✔ |
| POS-11 | Encaissement espèces avec rendu | `cashChange = cashReceived - total`, jamais négatif | ✔ |
| POS-12 | Double encaissement | 2ᵉ appel refusé (409/400), pas de double comptabilisation | ✔ |
| POS-13 | Numérotation concurrente | 10 commandes simultanées → 10 `orderNumber` distincts | ✔ |
| POS-14 | Plan de salle : ouverture/fermeture de table | État reflété dans `/api/floor-state` | manuel |
| POS-15 | Verrou PIN après 5 min | Écran de verrouillage, PIN hashé SHA-256, jamais en clair | manuel |
| POS-16 | Impression ticket / tiroir-caisse | — | sandbox ✗ |

## 3. Facturation et devis

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| FAC-1 | Créer une facture | 201, numéro unique, statut `DRAFT` | ✔ |
| FAC-2 | Cohérence des montants | `total = subtotal + taxAmount` (± 0,01) | ✔ |
| FAC-3 | Montant négatif | 400 (refus) | ✔ |
| FAC-4 | Numéro de facture dupliqué | Refus ou incrément automatique — jamais deux factures au même numéro | ✔ |
| FAC-5 | Transition de statut `DRAFT → SENT → PAID` | Statut persisté, transitions illégales refusées | ✔ |
| FAC-6 | Export PDF facture | Fichier produit, en-tête PDF valide (`%PDF`), montants présents | ✔ |
| FAC-7 | Créer un devis | 201, statut `DRAFT`, `validUntil` future | ✔ |
| FAC-8 | Convertir devis → facture | Facture créée, lignes reprises, devis passé `ACCEPTED` | ✔ |
| FAC-9 | Convertir deux fois le même devis | 2ᵉ conversion refusée (pas de doublon de facture) | ✔ |
| FAC-10 | Supprimer un devis converti | Refus ou conservation de la facture liée | ✔ |
| FAC-11 | Mentions légales LU (n° TVA, IBAN) | Présentes sur le PDF | manuel |

## 4. Menus, produits, catégories

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| MENU-1 | Créer une catégorie | 201, rattachée à la société | ✔ |
| MENU-2 | Créer un produit | 201, `taxRate` par défaut 17 | ✔ |
| MENU-3 | Prix négatif | 400 | ✔ |
| MENU-4 | Nom vide | 400 | ✔ |
| MENU-5 | `taxRate` hors bornes (< 0 ou > 100) | 400 | ✔ |
| MENU-6 | Supprimer une catégorie contenant des produits | Refus explicite **ou** produits réaffectés — jamais d'orphelins | ✔ |
| MENU-7 | Supprimer un produit présent dans une commande passée | Refus **ou** archivage — la commande historique reste lisible | ✔ |
| MENU-8 | Menu QR public | Accessible sans token, n'expose ni coûts ni marges | ✔ |

## 5. CRM, fidélité, cartes cadeaux

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| CRM-1 | Créer un client | 201, `points = 0`, `walletBalance = 0` | ✔ |
| CRM-2 | Email invalide | 400 | ✔ |
| CRM-3 | Créditer des points | `points` incrémentés, `LoyaltyTransaction` tracée | ✔ |
| CRM-4 | Débiter plus de points que le solde | 400, solde inchangé, jamais négatif | ✔ |
| CRM-5 | Créditer le portefeuille | `walletBalance` augmenté du montant exact (pas d'arrondi flottant visible) | ✔ |
| CRM-6 | Débiter le portefeuille au-delà du solde | 400, solde inchangé | ✔ |
| CRM-7 | Créer une carte cadeau | Code unique, montant initial correct | ✔ |
| CRM-8 | Utiliser une carte cadeau deux fois | 2ᵉ usage refusé si solde épuisé | ✔ |
| CRM-9 | Carte cadeau inexistante | 404 | ✔ |
| CRM-10 | Supprimer un client ayant des factures | Refus **ou** anonymisation — les factures restent (obligation comptable) | ✔ |
| CRM-11 | Export RGPD des données d'un client | Fichier contenant ses données, rien d'un autre client | manuel |

## 6. Réservations

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| RES-1 | Créer une réservation | 201, `guestName` obligatoire, statut `PENDING`/`CONFIRMED` | ✔ |
| RES-2 | `partySize` = 0 ou négatif | 400 | ✔ |
| RES-3 | Date dans le passé | 400 ou avertissement explicite | ✔ |
| RES-4 | `guestName` vide | 400 | ✔ |
| RES-5 | Réservation > capacité de la table | Refus ou alerte | ✔ |
| RES-6 | Annulation | Statut `CANCELLED`, table libérée | ✔ |

## 7. Inventaire / stock

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| STK-1 | Créer un ingrédient | 201, `currentStock` et `minStockLevel` cohérents | ✔ |
| STK-2 | Stock négatif à la création | 400 | ✔ |
| STK-3 | Alerte sous le seuil | Ingrédient sous `minStockLevel` remonté par l'API d'alertes | ✔ |
| STK-4 | Commande fournisseur | 201, liée à un fournisseur existant | ✔ |
| STK-5 | Réception d'une commande | Stock incrémenté des quantités reçues | ✔ |
| STK-6 | Supprimer un fournisseur lié à des commandes | Refus ou détachement propre | ✔ |
| STK-7 | Persistance `data/inventory-stock.json` | Écriture atomique, fichier relisible après redémarrage | ✔ |
| STK-8 | OCR facture fournisseur | — | sandbox ✗ |

## 8. RH

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| RH-1 | Créer un shift | 201, `startTime < endTime` | ✔ |
| RH-2 | Shift avec fin avant début | 400 | ✔ |
| RH-3 | Shifts qui se chevauchent pour un même employé | Refus ou alerte explicite | ✔ |
| RH-4 | Pointage entrée | `TimePunch` créé | ✔ |
| RH-5 | Double pointage entrée sans sortie | Refus | ✔ |
| RH-6 | Pointage sortie sans entrée | 400 | ✔ |
| RH-7 | Demande de congé | 201, statut `PENDING` | ✔ |
| RH-8 | Congé avec `endDate < startDate` | 400 | ✔ |
| RH-9 | Approbation de congé | Statut `APPROVED`, visible au planning | ✔ |
| RH-10 | Conformité droit luxembourgeois (repos 11 h, 48 h/semaine) | Alerte si dépassement | manuel |

## 9. HACCP

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| HAC-1 | Relevé de température | 201, `loggedBy` renseigné | ✔ |
| HAC-2 | Température hors plage | `isCompliant = false` | ✔ |
| HAC-3 | Relevé sans `loggedBy` | 400 | ✔ |
| HAC-4 | Historique filtré par période | Ne renvoie que la période demandée | ✔ |
| HAC-5 | Export contrôle ITM | Document produit, relevés et non-conformités présents | manuel |

## 10. Comptabilité

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| CPT-1 | Ouvrir la caisse | `CashDrawer` ouvert, fond de caisse enregistré | ✔ |
| CPT-2 | Ouvrir une caisse déjà ouverte | Refus | ✔ |
| CPT-3 | Clôture avec écart | Écart calculé = compté − théorique, signé correctement | ✔ |
| CPT-4 | Entrée/sortie d'argent | Solde théorique mis à jour | ✔ |
| CPT-5 | Dépense avec TVA | `amount` et `taxRate` stockés, TVA déductible calculable | ✔ |
| CPT-6 | Dépense montant négatif | 400 | ✔ |
| CPT-7 | Déclaration TVA sur période | Somme des TVA collectées − déductibles cohérente avec les commandes | ✔ |

## 11. Marketing / réputation

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| MKT-1 | Créer une campagne | 201, `type` ∈ {SMS, EMAIL, PUSH}, `content` obligatoire | ✔ |
| MKT-2 | Campagne sans contenu | 400 | ✔ |
| MKT-3 | Code promo unique | Code dupliqué refusé | ✔ |
| MKT-4 | Code promo expiré | Refusé à l'application | ✔ |
| MKT-5 | Remise > 100 % | 400 | ✔ |
| MKT-6 | Envoi réel SMS/email | — | sandbox ✗ |
| MKT-7 | Créer un avis | 201, `rating` entre 1 et 5 | ✔ |
| MKT-8 | `rating` hors bornes (0 ou 6) | 400 | ✔ |

## 12. Portail invité (public)

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| GST-1 | Menu accessible sans authentification | 200 | ✔ |
| GST-2 | Suivi de commande par identifiant | 200 pour la bonne commande, 404 sinon | ✔ |
| GST-3 | Fuite de données inter-tables | Un invité de la table T4 n'accède pas à la commande de T7 | ✔ |
| GST-4 | Scores de jeux | Enregistrés, classement cohérent | ✔ |
| GST-5 | Rate limit public | 429 au-delà du seuil | manuel |
| GST-6 | Les 4 pages (Jeux, Menu, Chat, Avis) | Rendues sans erreur console | ✔ (Playwright) |
| GST-7 | Petits Chevaux 3D sur tablette (dPR 2) | Plateau centré et entièrement visible | ✔ (Playwright) |

## 13. Thème et interface

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| UI-1 | Aucune surface claire en thème sombre | 0 fond clair calculé sur les 22 modules | ✔ (Playwright) |
| UI-2 | Pas de flash clair au chargement | `data-theme-mode` posé avant hydratation | ✔ |
| UI-3 | Bascule clair/sombre | Les deux modes restent lisibles | manuel |
| UI-4 | Toutes les routes rendent sans erreur | Aucune erreur console bloquante | ✔ (Playwright) |

## 14. Sauvegarde et restauration

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| BAK-1 | Déclencher une sauvegarde | ZIP créé dans `data/backups/full/`, taille > 0 | ✔ |
| BAK-2 | Contenu de l'archive | Contient les JSON de `data/`, **exclut** `data/backups/` | ✔ |
| BAK-3 | Lister les sauvegardes | Renvoie les archives présentes | ✔ |
| BAK-4 | Nom de fichier invalide (path traversal) | 400, aucun accès hors du dossier | ✔ |
| BAK-5 | **Restauration réelle** | Après purge de `data/`, la restauration remet les fichiers identiques (comparaison octet à octet) | ✔ |
| BAK-6 | Rétention | 30 dernières + 1 par mois conservées | ✔ |
| BAK-7 | Sauvegarde de la base PostgreSQL | *(Aucun `pg_dump` : voir rapport, seul `data/` est sauvegardé)* | ✗ absent |
| BAK-8 | Cron 6 h et volumes VPS | — | sandbox ✗ |

## 15. Robustesse transverse

| # | Cas | Critère de succès | Auto |
|---|---|---|---|
| ROB-1 | JSON malformé en entrée | 400, pas de 500 | ✔ |
| ROB-2 | Champ obligatoire manquant | 400 avec message exploitable | ✔ |
| ROB-3 | Chaîne très longue (10 000 caractères) | 400 ou troncature — pas de 500 | ✔ |
| ROB-4 | Injection SQL dans un filtre | Traitée comme littéral (Prisma paramétré) | ✔ |
| ROB-5 | XSS stocké dans un champ texte | Échappé au rendu | manuel |
| ROB-6 | Base indisponible | Erreur claire — **et pas d'élévation de privilèges** (cf. rapport, `requireCompany` accorde `OWNER` en cas d'échec DB) | ✔ |
| ROB-7 | ID inexistant sur toutes les routes `:id` | 404, jamais 500 | ✔ |
