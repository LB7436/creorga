# Fiabilité du profil professionnel — lot après f198c98

Branche `codex/creorga-2-0-2026-10-08`, base vérifiée
`f198c987933ff5fa7650a3f6894896974e680465`. Code et tests conservés puis commités
dans **`23316e37547c46bb03176a63e3c7b16a1f082d2e`** ; documentation et preuves
dans le commit documentaire suivant. Aucun développement recommencé à la reprise.

Périmètre de livraison : **logiciel et reprise locale**, après vérification de la
publication sur la branche dédiée. Le contrôle visuel Windows est **BLOCKED**,
T100 reste partiel et CréOrga n'est **pas qualifié pour la production**.
Les conditions indispensables de publication sont la cohérence des sources/livrables,
les suites documentées, une restauration effective et l'absence de secret/artefact privé.
Elles ne valent pas recette native Windows, matérielle, bancaire ou métier exhaustive.

## Garde-fous et périmètre

- Laboratoire privé loopback, sociétés et comptes fictifs ; aucun VPS, production, master,
  paiement réel, profil historique ou archive originale modifié.
- Profil métier conservé, jeux disponibles dans Git et retour au profil complet. Le buildinfo
  guest préexistant reste hors commit. Ne pas installer/désinstaller d'autre logiciel Windows.
- Aucune rétention/cleanup d'archives automatique autorisée ; politique à documenter,
  tests et validation humaine restent des conditions cumulatives non satisfaites.
- La recette ne promeut pas 3 680 contrôles source en PASS ; chaque action exécutée doit avoir
  ses paramètres de rôle/société, préconditions, effet observé et preuve horodatée.
- Tests de panne uniquement sur processus et données du laboratoire ; pas de coupure du PC.

## Lots de travail

| Lot | État et preuve |
|---|---|
| Gel des suppressions, rétentions et registre | Terminé : 27/27 copies reliées aux ZIP/manifeste/SHA, aucune suppression automatique autorisée dans les deux profils. Voir [sauvegardes](SAUVEGARDES-FIABILITE.md). |
| T100 : déconnexion, photos, stock et sociétés | Correctifs et dix parcours Chrome exécutés ; [preuves UI](T100-FIABILITE-UI.md). Pas une validation des 3 697 contrôles source. |
| Projections SQL et performance | Lectures groupées, ancien cliché non retransmis, validation avant mutation mutualisée ; quatre régressions PostgreSQL. [Mesures appariées](PERFORMANCE-FIABILITE.md). |
| T69 : liens temporaires de vrais PDF | Terminé/testé : expiration serveur, révocation, société/rôle, idempotence, audit expurgé. [Détails](LIENS-DOCUMENTAIRES.md). |
| Arrêt et reprise locaux | Canal privé sans endpoint HTTP, attente des tâches/audits, refus des arrêts ambigus sans kill. Redémarrage et 19 assertions de reprise exécutés. |
| Raccourcis et interface native Windows | Fichiers/cibles/arguments/empreintes vérifiés et conservés ; contrôle interactif BLOCKED, voir ci-dessous. |
| Restauration finale | Nouvelle base réelle : 81 tables, 8 fichiers, 21 PDF égaux ; clé AES-GCM séparée ; nouvelles tables de liens peuplées. |
| Publication | Code `23316e3`, preuves/checkpoint dans le commit documentaire suivant ; uniquement branche 2.0, SHA distant à confirmer dans le compte rendu de livraison. |

## Carte des effets de bord utilisée avant les audits de pages

- Auth web : `setAuth`/`logout` incrémentent la génération de session ; société/rôle/vue
  déterminent `authDataScope`. Le QueryClient et les formulaires remontent sur changement.
  `logout()` mémoire ne révoque pas à lui seul un cookie serveur : vérifier le bouton effectif.
- Modules/floor/portail : génération + révision et rejet des lectures périmées existent déjà.
  Ne pas réimplémenter ces protections ni les compter comme nouvelles fonctions.
- POS : store mémoire non persistant, autorité réseau via `floorBridge`/API/UUID durables/CAS.
  `openTable` remplace les couverts ; `transfer` vide la source ; `close` refuse l'impayé.
  Les anciens `processPayment`/`cloturerJournee` locaux ne sont pas les parcours UI actuels.
- Factures/devis : mutations serveur puis invalidation du QueryClient capturé, pas de succès
  financier optimiste. Vérifier les attentes asynchrones avant capture de la portée HTTP.
- Stock actif : `InventoryOperationsPage`, pas l'ancien écran OCR global. Création/réception
  puis reload ; contrôler les réponses concurrentes et le double clic avant de conclure.
- Planning : calcul Luxembourg déjà corrigé, pauses/minutes historiques conservées ; publication
  et OCR sont distincts, un nom ambigu ne doit pas choisir silencieusement un salarié.
- Portail effectif : GuestHome web dans l'iframe guest5178 ; panier attribué à visite/société.
  L'ancien store guest global n'est pas un parcours monté à qualifier artificiellement.
- Photos : cache global par module identifié comme candidat ; préserver l'ancien contenu en
  quarantaine si une correction est démontrée, jamais l'effacer pour masquer une fuite.

## Décision de conception T69

Capacité transférable au porteur, courte durée explicite 15 min par défaut ou 60 min maximum,
réutilisable et révocable ; création propriétaire/responsable seulement. Fragment côté page,
POST du secret sans journalisation, PDF original/empreinte et droits de l'auteur revérifiés.
Aucun envoi/copier-coller automatique, aucune promesse de lien nominatif ou de récupération
d'octets déjà téléchargés. Détails et résultats dans `LIENS-DOCUMENTAIRES.md`.

## Mesures et résultats

### Exécutions acquises avant l'interruption, contrôlées à la finalisation

Le 17 octobre 2026, **584 unités** (313 backend / 207 web / 64 POS), **201 intégrations
PostgreSQL** et **42 parcours Chrome dans 12 fichiers**, zéro échec/ignoré dans les
campagnes complètes finales. Dates UTC : intégrations 08:25:17, unités 08:27:32–43,
Chrome 08:27–08:34. Les premières tentatives RED et les calibrations de harnais restent
distinctes ; elles ne sont pas effacées ou transformées en PASS.

Ces campagnes **n'ont pas été relancées à la finalisation**. Leurs rapports complets,
compteurs, dates, cas déclarés et empreintes ont été contrôlés, sans les présenter comme
une nouvelle exécution. Les preuves indiquent `f198c98`/worktree dirty car le code n'était
pas encore commité à l'exécution ; le commit de code ci-dessus contient ce travail.
Voir [validation](preuves/validation-fiabilite-2026-10-17.json) et
[contrôle de finalisation](preuves/finalisation-fiabilite-2026-10-17.json).

### Contrôles réellement exécutés pendant la finalisation

- **34 tests natifs locaux réussis**, outils de preuves/inventaire, hôte/proxy, canal privé,
  refus des rapports anciens/incomplets/ignorés et absence de promotion automatique de T100.
- **Cinq compilations métier et cinq complètes** réussies, TypeScript inclus. Empreinte des
  sources courantes identique aux deux manifests ; avertissements de gros bundles conservés.
- Restauration à **08:51:26 UTC** : **81 tables**, **8 fichiers**, **13 PDF facture + 8 PDF avoir**,
  toutes empreintes égales, aucun écart, AES-GCM vérifié et clé séparée. Durée 3 703 ms sur
  cette copie, **pas un RTO**. Les tables documentaires restaurées contiennent 3 liens et 6 événements.
- Redémarrage métier à 08:57 UTC, **19 assertions de reprise** réussies : montants et provenances,
  stock, préparation, anciennes capacités QR, contraintes et tables peuplées. Pas une panne électrique.
- Migration de copie ancienne déjà exécutée à 08:34:28 UTC : **7 → 36 migrations**, **47 tables /
  341 lignes anciennes identiques**, cliché source inchangé ; pas une nouvelle exécution à 08:51.
- Lecture des deux raccourcis Bureau, sans `Save` ni lancement supplémentaire ; cibles,
  arguments, répertoire et SHA vérifiés. Jeux : **99 fichiers** récupérables depuis le
  [commit immuable f198c98](https://github.com/LB7436/creorga/tree/f198c987933ff5fa7650a3f6894896974e680465).
  Seules les fins de ligne CRLF/LF du checkout texte sont normalisées pour la comparaison,
  sans modifier de fichier ; les binaires sont comparés octet par octet.

[Restauration et reprise](preuves/restauration-fiabilite-2026-10-17.json),
[matrice fraîche](preuves/recette-metier-fiabilite-2026-10-17.json).
Les empreintes portent sur l'instant de copie, avant les nouvelles traces d'authentification
du redémarrage ; une comparaison ultérieure ne doit pas mélanger ces instants.

### Windows : BLOCKED, sans contournement

Lors du tour interrompu, l'association du raccourci a ouvert une fenêtre Chrome identifiée
par son titre. Cela ne prouve ni son URL, ni son contenu. Au contrôle suivant, le skill
`computer-use` a refusé de poursuivre : **URL courante non vérifiable avec une confiance
suffisante pour appliquer la protection**. Aucun état de page exploitable n'a été obtenu.

Pendant cette finalisation : aucune nouvelle commande computer-use, entrée native,
navigation alternative, désactivation de protection ou tentative de faire valider une
autre URL à sa place. La lecture des fichiers `.lnk` et les contrôles HTTP/SQL sont des
opérations indépendantes, pas une validation de cette fenêtre bloquée.

Restent **BLOCKED** : recette visuelle complète du raccourci, fermeture/reprise de la
fenêtre et incident de session Windows. Une validation manuelle par le propriétaire,
ou un outil officiellement capable de vérifier cette URL sans affaiblir les contrôles,
est nécessaire. Ne pas modifier la protection ou les réglages de sécurité pour la forcer.
Fermer Chrome ne ferme pas volontairement le serveur utilisé par les QR ; l'arrêt du
service passe par le raccourci distinct « Arrêter CréOrga 2.0 » et son canal privé.

## Matrice, limites et suite

**55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN** : T69 devient PASS sur preuve d'expiration
serveur et parcours documentaires. **T100 reste NOT RUN / partiel** : 402 fichiers,
3 697 contrôles, 157 routes et 828 gabarits inventoriés ; toutes les entrées statiques
restent non exécutées. Les 42 parcours ne sont pas 3 697 contrôles qualifiés.
Les [45 anciens blocages](BLOCAGES-FIABILITE.md) sont classés sans masquer les fonctions absentes.

Risques/limites conservés : sauvegarde de salle encore proche de 2,2 s au p95 ; certains
écrans ne s'accélèrent pas ; aucune économie énergétique démontrée. Droits de modification
de stock des employés inchangés, décision métier encore à prendre. Photos locales non
chiffrées, révocation globale JWT/multi-fenêtres non qualifiée. Le texte de connexion
« 16 jeux retenus » reste un défaut de libellé P2, pas une preuve de jeu chargé.
Matériel, PayPal officiel/banques, historique navigateur, cloud, langues exhaustives
et recette complète restent non qualifiés. Stripe Refunds et vidéo restent fermés.

Prochaine action : validation manuelle Windows, puis T100 par écran/rôle et optimisation
mesurée du snapshot global sans enlever transactions, CAS, audit ou durabilité. Ne pas
déployer ce lot comme un produit prêt pour exploitation réelle.

Reproduction sur ce PC, avec les configurations privées existantes :

```powershell
node --test tests/local/*.test.mjs
node scripts/build-local-profile.mjs business
node scripts/build-local-profile.mjs full
# Copie cohérente : arrêter les écrivains, conserver les archives, nouvelle base uniquement.
powershell.exe -NoProfile -File ../local-2.0/stop-profile.ps1
node --import ./node_modules/tsx/dist/loader.mjs ../local-2.0/restore-current-copy.mjs <nouveau-libelle>
node ../local-2.0/start-profile.mjs
# Le libellé fiabilite ci-dessous correspond à la preuve déjà créée, pas à écraser.
node ../local-2.0/verify-restart-business-recipe.mjs fiabilite
node scripts/render-reliability-matrix.mjs --reports=../local-2.0 --since=2026-10-17T07:00:00Z --dry-run
```

Un nouveau relevé doit porter un nouveau nom ; les rapports historiques, dumps, ZIP,
clés et fichiers d'environnement restent privés et ne sont jamais remplacés par une
commande de nettoyage. Les sources/test/procédures et preuves expurgées sont versionnées,
pas les bases, archives, bundles, logs bruts, profils Chrome ou buildinfo.
