# Liens temporaires vers les PDF de facture

## Décision et périmètre

Lot de fiabilité du profil métier ; conception validée pour le laboratoire.
La capacité de téléchargement est **au porteur, transférable, réutilisable et
révocable**. Ce n'est ni un compte client ni un lien nominatif. Le choix explicite
est de 15 minutes (défaut) ou 60 minutes ; aucune durée supérieure n'est acceptée.
Le serveur, et non l'horloge du navigateur, décide de l'expiration.

Seuls les propriétaires et responsables actifs peuvent créer, lister et révoquer
ces liens dans leur société. La création ne transmet rien et ne copie rien dans
le presse-papiers. La facture doit déjà avoir son PDF A4 original figé et vérifié.
Un brouillon, un ancien document reconstruit ou une facture annulée est refusé.
Le lien ne permet pas de choisir un autre format, une autre facture ou une autre
société. Il ne crée ni vente, ni encaissement, ni document fiscal supplémentaire.
La signature du jeton protège cette capacité de téléchargement ; elle n'est pas
une signature électronique du PDF ni une validation juridique du document.
Dans l'installation loopback de laboratoire, le lien n'est accessible que depuis
ce PC : aucune publication réseau ou exposition Internet n'est effectuée.

## Frontières implémentées

- Jeton non-JWT, versionné, audience de téléchargement distincte de la connexion.
  Signature HMAC-SHA256 avec clé dérivée sous domaine distinct du secret serveur.
  La rotation de ce secret invalide les capacités déjà émises.
- Identifiant aléatoire, société/facture par relation composite, empreinte du PDF,
  auteur, dates et révocation persistés en PostgreSQL. Aucun jeton clair en base.
- Page minimale servie par l'API, sans script tiers ni chargement de l'ERP. Le
  secret arrive dans le fragment, jamais dans la query ou le chemin HTTP, puis
  est retiré de l'adresse affichée et gardé seulement en mémoire de cette page.
- Bouton explicite de téléchargement ; POST du jeton avec `credentials: omit`.
  Aucune tentative d'utiliser les cookies ou jetons de connexion de l'utilisateur.
- Masquage strict du corps et de la query du seul point de téléchargement dans
  l'audit général, sans désactiver les audits métier. Événements dédiés sans secret.
- Vérification à chaque téléchargement de la signature, de l'expiration, de la
  révocation, de l'auteur/adhésion/rôle actif, de la facture et des octets originaux.
  Refus fermé si la base ou la vérification échoue, sans octets PDF retournés.
- Admission du téléchargement et révocation sérialisées. Une requête déjà admise
  ou un fichier déjà reçu ne peuvent pas être effacés à distance ; aucune promesse
  de rappel des copies ou d'accès « exactement une fois ».

Dans le journal technique, l'action `DOWNLOADED` désigne l'admission serveur de
la remise du PDF, pas une preuve de sauvegarde physique, de lecture ou de réception
sur un appareil distant. Une coupure après admission peut laisser un événement
sans fichier effectivement enregistré ; le même lien peut être rejoué tant qu'il
reste autorisé. Le parcours Chrome lit réellement les octets et les compare,
mais ne qualifie pas tous les disques, téléchargements externes ou imprimantes.

## Recette et limites de preuve

La présence de ce document ou des nouveaux boutons ne vaut pas preuve d'exécution.
Les tests automatisés sont :

- `document-link-token.test.ts` : signature, audience distincte, liaison
  société/document/empreinte/expiration, falsification et échéance serveur exacte.
- `audit-document-download.test.ts` : statut conservé mais corps et query masqués,
  autres audits métier préservés. Le test a réellement reproduit une fuite dans
  `path`, puis une seconde dans `module`, avant correction.
- `invoice-email-reference.test.ts` : changements de portée pendant le digest
  (société, déconnexion, reconnexion et rôle, avec allers-retours), référence non
  écrite dans la nouvelle portée. Quatre puis deux autres assertions ont échoué
  avant leurs correctifs respectifs puis réussi.
- `document-link-list.test.ts` : lectures retardées après une liste plus récente,
  invalidation dès mutation, retrait du composant et erreur courante visible.
  Trois assertions ont réellement échoué avant le compteur monotone.
- `invoice-document-links.integration.test.ts` : vrai PostgreSQL `creorga_tests`,
  PDF issu du générateur réel, droits, société, contraintes SQL, original identique,
  rejeu et création concurrente, expiration sous horloge serveur contrôlée,
  révocation et concurrence, auteur désactivé/déclassé, capacité refusée en Bearer.
- `reliability-documents.spec.ts` : parcours Chrome préparés pour clic/clavier,
  PDF, rejeu, rechargement/révocation, réponse perdue et changement de société
  A→B→A pendant le calcul de référence email, ainsi qu'une lecture HTTP ancienne
  retardée après création. **Les quatre parcours ont été exécutés et réussis**
  sur le build métier courant à 08:27:23 UTC le 17 octobre 2026 (10:27 Luxembourg).
  Banque/IA ne sont pas sollicitées ; les fautes réseau sont explicitement
  injectées autour de vraies actions API. Aucun profil historique n'a été ouvert.

Résultats ciblés frais après la dernière contrainte SQL : **14 unités backend,
19 cas PostgreSQL réussis** à partir de 08:17:35 UTC le 17 octobre 2026
(10:17 heure Luxembourg). Les **11 unités web** de portée/lectures ont ensuite
réussi après reproduction des cinq derniers cas de réponse/contexte tardifs.
Zéro échec/ignoré dans les suites ciblées complètes finales.
La suite PostgreSQL avait auparavant réellement reproduit l'acceptation
indésirable d'un motif `NULL` en SQL direct : 17 réussis, un échec attendu avant
la migration corrective. Un UUID majuscule accepté produisait également une
capacité inutilisable : création 201 puis téléchargement 404 avant normalisation.
Le bilan global frais et les résultats Chrome sont consignés dans les preuves du
lot principal, sans remplacer ces étapes RED par de faux succès historiques.
Les envois email restent neutralisés et aucun paiement réel n'est impliqué.

L'expiration est contrôlée en PostgreSQL avec l'horloge Date du serveur de test,
pas en avançant seulement l'horloge de Chrome. Cela ne qualifie pas la dérive
réelle de l'horloge Windows, le déploiement public, un réseau externe ni la
réception d'un email par un destinataire réel.

[Preuve ciblée expurgée](preuves/liens-documentaires-2026-10-17.json) : dates,
empreinte du build, suites et frontières simulées/réelles. Les compteurs sont
ceux de ce sous-lot et ne remplacent pas les suites globales de livraison.

Reproduction sur une base dédiée dont l'URL et les secrets sont injectés hors
Git : `CREORGA_TEST_DATABASE=creorga_tests` est obligatoire pour la suite SQL.
Depuis `apps/backend`, exécuter
`node ../../node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts src/routes/invoice-document-links.integration.test.ts`,
puis les deux suites unitaires `src/lib/document-link-token.test.ts` et
`src/middleware/audit-document-download.test.ts` avec la configuration unitaire.
Depuis `apps/web`, les suites unitaires sont `src/lib/invoice-email-reference.test.ts`
et `src/lib/document-link-list.test.ts`. Ne pas remplacer ces gardes par une URL
de production. Les parcours Chrome requièrent un compte `.invalid`, une société A
OWNER et une société B EMPLOYEE toutes deux fictives, sélectionnées explicitement
par `CREORGA_E2E_COMPANY_ID` / `CREORGA_E2E_OTHER_COMPANY_ID`, et le flag laboratoire.

## Routes et utilisation

Dans Factures → détail d'une facture émise : choisir 15 ou 60 minutes, puis
« Créer un lien temporaire ». Ouvrir ou copier reste une seconde action explicite.
Le rechargement retire le secret de l'interface, mais conserve la liste des 100
derniers liens et leurs actions de révocation avec motif. Une réponse perdue
est rejouée par le même UUID et n'allonge pas la durée initiale.

- Création/liste : `/api/invoices/:invoiceId/document-links` (POST/GET).
- Révocation : `/api/invoices/:invoiceId/document-links/:linkId/revoke` (POST).
- Page publique minimale : `/api/document-download#capacité` (GET sans fragment
  côté HTTP), puis POST sur ce même chemin avec le seul jeton dans le corps.
- Le chemin public n'accepte ni query, ni sélection de facture/société/format.

Le fournisseur de contexte est capturé avant le premier `await` des actions
documentaires. L'envoi email conserve cette portée pour la création et le suivi
de sa tâche ; une identité changée ne récupère pas silencieusement le brouillon.

## Reprise

Les tables de liens et leur journal doivent être incluses dans le dump PostgreSQL.
Les migrations `20261019120000_invoice_document_links` et
`20261019121000_document_link_revocation_guard` sont additives et ne réécrivent
aucun document existant. La seconde ajoute une contrainte explicite : SQL `NULL`
ne doit jamais valider une révocation partielle. PK, FK et sources historiques
existantes sont inchangées. Pour désactiver
la fonction, fermer son point public et ses actions de création ; conserver les
tables et les factures. Un ancien serveur ne doit pas être autorisé à contourner
la révocation ou interpréter la capacité comme un jeton de connexion.
