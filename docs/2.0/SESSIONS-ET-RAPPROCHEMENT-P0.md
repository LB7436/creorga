# Lot P0 suivant : sessions, acomptes POS et rapprochement

Mise à jour après ce lot : `23bba568ec54c7c0acc3861f3ba639f155c1dd3d` livre les déplacements
POS/QR avec révocation et renouvellement par groupe, une procédure de rapprochement des remboursements
et les relevés de versements **fictifs**. Voir `FUSIONS-QR-P0.md`, `REMBOURSEMENTS-RAPPROCHEMENT.md`,
`VERSEMENTS-BANCAIRES.md` et le checkpoint. Les états « restant » ci-dessous sont historiques ;
ils ne doivent pas conduire à réimplémenter les fonctions désormais livrées.

État du 16 octobre 2026, sur Windows, après `163d70dd7544dc4cf608da508cc849092ee87cba`.
Branche : `codex/creorga-2-0-2026-10-08`, dépôt `LB7436/creorga`.
Ce lot est progressif, **pas une unification achevée de tous les parcours ni une autorisation de production**.

## État réellement livré

| Périmètre | Implémenté | Vérification / limite |
|---|---|---|
| Salle PostgreSQL | `FloorWorkspace`, empreinte canonique, révision CAS, copie initiale préservée, journal des deltas/auteur | PostgreSQL réel : cache périmé, deux versions concurrentes, isolation et refus salarié |
| Sessions natives | `ServiceSession` / `ServiceCover`, identité stable lors d'un transfert complet de couvert | Transfert avec acompte sans nouvelle commande ; fusion destructive d'un couvert payé partiellement refusée |
| Acompte natif | Une commande créée au premier acompte, montant/TVA gelés serveur, affectations durables | Acompte puis solde mixte : une vente, un débit de stock, vingt rejeux identiques |
| Caisse POS | Panneau acompte/partiel/mixte/solde, reste dû, monnaie, référence locale par société/utilisateur | Chrome neuf : réponse perdue après commit, reconnexion et reprise, aucun faux « payé » |
| QR en caisse | Réutilise la commande QR, encaisse seulement son reliquat | Intégration SQL : acompte et solde sans nouvelle commande ni double stock |
| Verrous QR | Ordre société puis table puis numérotation, partagé avec la finance | Test déterministe réel : une commande attendant la société ne retient plus la table |
| Cuisine | Lots différentiels durables : ajout/correction distinct, ancien statut conservé | Unités : quantité 1 déjà servie puis quantité 3 = seulement 2 à préparer, rejeu sans lot supplémentaire |
| Remboursement déclaré | Espèces/carte autonome, avoir et tender d'origine, plafonds communs, motif, auteur, référence justificative | SQL : vingt rejeux, une sortie espèces, pas de sortie espèces pour carte, droits et origine étrangère |
| Refus PayPal | `REFUSED_RECONCILIATION`, dernière preuve horodatée, réserve conservée | Prestataire simulé ; aucun déblocage de réserve ni appel bancaire réel |
| Rapprochement | Références ventes/documents/tenders/captures/remboursements/clôtures et CSV v1 | Unités + HTTP/SQL + téléchargement navigateur ; versements bancaires non intégrés |
| Stripe Refunds | Étude documentaire uniquement | Aucun adaptateur de remboursement activé, aucune transaction, voir `STRIPE-REFUNDS-ETUDE.md` |

## Autorité et garanties

L'option `CREORGA_FLOOR_AUTHORITY=postgres` est activée **uniquement dans le lanceur privé
du laboratoire**. Elle n'est pas une activation ni une migration de production. La première
lecture adopte le plan existant dans une transaction protégée ; `initialSnapshot` et son
empreinte gardent l'original. Elle ne réinterprète pas les anciennes ventes navigateur.
Les nouveaux objets de session sont des projections, pas une seconde écriture de vente.

Chaque écriture de salle compare révision et empreinte originales. Un conflit retourne 409,
sans écraser le plan confirmé. La base indisponible/incohérente retourne 503 sans ancien
fichier de repli. Le fichier par société devient un miroir de compatibilité ; une panne
du miroir après commit SQL est signalée, sans annoncer un échec bancaire fictif.
Ne jamais désactiver l'option ou relancer un ancien écrivain pour contourner une panne.
Un miroir marqué PostgreSQL est refusé comme nouvelle autorité fichier.

L'encaissement POS PostgreSQL confirme le règlement, le reçu final et le retrait des lignes
dans **la même transaction**. Un conflit de salle annule aussi la commande nouvellement
créée, les affectations et le stock. Le solde est dérivé des `OrderTender`, pas du navigateur.
Le premier acompte ne débite pas le stock ; le solde final le débite une fois. Le reçu final
regroupe les affectations existantes sans les recréer. Les autres endpoints d'encaissement
refusent une commande native matérialisée pour ne pas contourner cette transaction.

Les prix/quantités d'un couvert avec acompte ne sont pas modifiables destructivement :
ajouter une autre tournée dans un nouveau couvert. Le transfert conserve le couvert,
sa commande et l'audit des positions. Les gestes commerciaux, cartes cadeaux, pourboires et
dons restent dans le parcours complet existant ; ils ne sont pas recalculés après acompte.
Il n'y a **pas de caisse autonome hors connexion au serveur** : le navigateur conserve
la demande incertaine, pas une confirmation locale de paiement.

Les QR restent rattachés à leur visite sécurisée existante. Le brouillon POS refuse
explicitement de déplacer ou réécrire un couvert QR, au lieu d'afficher un faux transfert.
L'unification des transferts/fusions de visites QR reste à implémenter, avec tests de
non-divulgation entre groupes successifs. Préparation QR et préparation native gardent des
représentations distinctes. Aucun routage matériel bar/cuisine ni exactement-une-fois physique
n'est qualifié par les lots différentiels.

## Remboursements : portée exacte

La déclaration manuelle est limitée aux affectations `manual_declaration` espèces/carte,
sans capture prestataire. Une preuve bancaire doit passer par son connecteur. La référence
de justificatif est obligatoire ; le reçu HTML conserve l'origine et ne se présente pas
comme un avoir fiscal ou une attestation bancaire. Aucun nouveau PDF de remboursement
n'est revendiqué. Une sortie espèces nécessite une session v2 ouverte ; le mouvement OUT
et la déclaration sont créés atomiquement et une seule fois.

Les réservations PayPal, y compris UNKNOWN/REVIEW/refus, consomment toujours le plafond
de l'avoir. Un refus est visible et sa preuve conservée, **mais aucune procédure de
libération définitive n'est livrée**. Cette prudence ne dispense pas du rapprochement
opérateur/prestataire à concevoir. Un statut PayPal non reconnu n'est pas un refus libératoire.
Ni l'avoir, ni le remboursement ne modifient la vente historique ni le stock.

## Recette du lot

- **401 unités** : backend 264, web 89, POS 48, toutes réussies.
- **123 intégrations PostgreSQL dans 13 fichiers**, toutes réussies ; vrais middlewares et
  transactions, prestataires bancaires simulés. Sept scénarios sessions, douze remboursements,
  onze visites QR inclus dans ce total, pas à additionner une seconde fois.
- Cinq applications compilées ; avertissements de gros bundles préexistants, pas de qualification
  de performance en service. Comparateur de restauration : 23 autocontrôles réussis.
- Chrome local neuf : **15 observations** enregistrées, acompte 1 € puis solde 2,50 €
  (0,50 espèces + 2 carte), perte des réponses, une seule commande et un reçu final,
  remboursement motivé, justificatif HTML et CSV téléchargés, PDF d'avoir réel.
- Captures 375/768/1440 px ; panneau POS sans débordement horizontal. PDF A4 rendu avec
  Poppler et inspecté : références, accents, taux historique 3 %, total et pied lisibles.
  Baseline absente : régression visuelle **INCONCLUSIVE**. Axe/lecteur d'écran/clavier complet
  et Core Web Vitals non qualifiés. Badge « NaN » de navigation préexistant, non corrigé ici.
- Restauration, écrivains arrêtés : archive v2, AES-GCM, clé séparée, base neuve ; **70 tables
  identiques, huit fichiers, huit PDF facture et sept PDF avoir intègres**, 1 769 ms sur cette
  petite copie, pas un RTO. Contient 1 workspace, 20 changements, 6 sessions/couverts,
  18 tenders, 6 provenances et 1 remboursement déclaré. Les tables de remboursements PayPal
  restent vides dans cette archive ; leurs données sont éprouvées en intégration, pas dans
  cette restauration. Médias absents explicitement signalés.

Preuves privées : `BROWSER-P0-SUIVANT.json`, `p0-suivant-*`, journaux `*-p0-suivant-final.log`,
`RESTORATION-2.0.json`. Aucun identifiant de connexion, archive ni clé dans Git.
Les essais interrompus ont laissé des commandes/salles **fictives** dans le laboratoire ;
aucun nettoyage des anciennes données n'a été effectué pour rendre le résultat artificiellement propre.
La rétention normale a retiré d'anciens dumps de travail ; les archives originales sont conservées.

## Reproduction et suite prioritaire

Depuis la racine du dépôt, lanceur privé déjà configuré :

```powershell
node ../local-2.0/run.mjs unit
node ../local-2.0/run.mjs integration
npm run build
node scripts/verify-restored-copy.mjs --self-test
node ../local-2.0/browser-p0-suivant.mjs
```

Le script Chrome crée uniquement des écritures fictives sur loopback, aucun profil historique.
Pour une reproduction partageable, les suites `*.integration.test.ts` exigent explicitement
`CREORGA_TEST_DATABASE=creorga_tests` et une URL de cette base. Ne pas réutiliser une base réelle.
La recette navigateur requiert l'autorité PostgreSQL activée dans le laboratoire.

Suite : transferts/fusions QR conservant les visites et leur confidentialité ; découpage/édition
non destructrice après acompte ; convergence préparation native/QR et qualification bar ; résolution
probante des remboursements refusés/inconnus ; import de relevés de versements et format comptable
convenu ; qualification sandbox réelle puis matériel distinctement autorisés. T04 réel reste non exécuté
et les profils historiques intacts (`T04-REPRISE-HISTORIQUE.md`). Aucun de ces points n'est présenté terminé.
