# Reprise et retour arrière

## F18-L3 — procédure actuelle, après arrêt confirmé

Une seule nouvelle copie explicitement autorisée :
`local-2.0-recovery-20261018-YEEppm`, contexte fermé `f18-recovery`, base25450/
`creorga_f18_recovery`, origines23002/25174/25175/25177/25178. Tous les services
utilisent des artefacts distincts ; mélange avec default/L2 refusé. Profil
`CREORGA_BUSINESS_ONLY`, aucun changement global Node/Windows/DNS, aucune migration.

Trois STOPPED officiels, dont celui pendant abandon et celui final16:48:36UTC.
PID25524 disparu,0écoute applicative/0connexion PG ; PG38896/Chrome/anciennes
instances14676/35556 conservés. Aucune modification de ces processus bloqués en
mémoire, pas de seconde instance en écriture sur leurs bases, pas de forçage.

La restauration finale16:49:04–16:49:30UTC crée uniquement
`creorga_f18_recovery_verify_1792342145657` dans le cluster25450 et les fichiers
`final-restoration-z3u0xC/restored-files`.82tables/21466lignes/14fichiers/26PDF
identiques ; archivev2 SHA
`219ff8875eb9dfb2d81068dad6dff9a0ef038778a5af1397794a2f440bd456ad`.
AES-GCM déchiffré et comparé, clé séparée. Ne jamais restaurer par-dessus la source.
Les27copies récupérées et toutes les nouvelles archives restent conservées.

Reproduction privée, depuis la racine du dépôt, après revue des gardes :

```powershell
node ../local-2.0/observe-f18-database-activity.mjs recovery <libelle-neuf>
node ../local-2.0/stop-f18-recovery.mjs
node --import tsx ../local-2.0/restore-recovery-f18-final.mjs
```

Ces scripts privés contiennent des gardes fermés sur l'identité du laboratoire,
jamais des secrets à publier. L'arrêt déjà confirmé n'a pas à être redemandé
aveuglément. La restauration crée un nom neuf, sans clean/drop/purge. Si reprise
nécessaire, vérifier les derniers état/STOPPED/PID/ports, puis uniquement le
lanceur officiel privé `start-f18-recovery.mjs` de la **même** copie. Un marqueur de
nouveau refus interdit toute reprise et impose l'arrêt de la campagne, pas un
quatrième laboratoire. Ne pas contourner une protection d'origine navigateur.

Retour arrière logiciel : conserver ce lot et son diff, travailler sur une copie
vérifiée ; proposer un commit de revert ciblé si nécessaire, sans réécriture de
l'histoire partagée, sans reset du travail utilisateur et sans migration DOWN.
Le format métier n'a pas de nouvelle migration, mais un ancien binaire ne doit
pas être remis implicitement en écriture sur une base active. Le raccourci Windows
default est préservé ; il n'est pas redirigé clandestinement vers les ports L3.
[Compte rendu et limites](F18-REPRISE-INDEPENDANTE-2026-10-18.md).

## F18-L2 — laboratoire distinct réellement restauré,14:18UTC

Le choix explicite d'une copie séparée a été exécuté, nouveau cluster15450/base
`creorga_f18_local`, fichiers/secrets et origines13002/15174–15178 distincts.
Contexte officiel `CREORGA_LOCAL_CONTEXT=f18-isolated`, profil business uniquement,
artefacts séparés `dist-business-f18-isolated`. Les origines/bases/manifeste mélangés
sont refusés avant écoute. Contexte default, raccourci et jeux conservés.
Aucune nouvelle migration SQL ni modification d'une base/source d'exploitation.

Copie de départ égale13:23UTC :82tables/19602lignes/14fichiers/26PDF. Premier arrêt
officiel STOPPED, reprise prouvée ; **deuxième arrêt après abandon HTTP refusé**
14:01:45UTC avec `http/HTTP_WORK_UNTRACKED`. Source PID14676 et L2 PID35556 conservés,
pas de deuxième instance sur leurs bases. Le binaire nouvellement compilé ne les
répare pas en mémoire. Ne pas falsifier un fichier STOPPED ni supprimer les gardes.

Restauration finale des données L2 **effectivement exécutée**14:11UTC dans la nouvelle
base `creorga_f18_verify_1792332663965` :82tables/20012lignes/14fichiers/26PDF égaux,
archivev2 SHA `2db67b2322bcf83f889872c44ba53d6bdd942f771eff102dedc63998ef712052`.
Chiffrement/déchiffrement vérifiés, clé séparée, zéro purge. Limite : MVCC commis
et fichiers stables ; arrêt propre/vidange mémoire des journaux NON PROUVÉS.
Cette copie ne remplace jamais la source. Les archives et27dumps restent conservés.

Après reprise expressément choisie : vérifier PID/ports et manifestes, préserver
les mêmes identifiants financiers, refaire seulement les contre-essais ouverts.
Restaurant38,80€ réglés fictivement, caisse118,80€ théoriques non clôturée ; Café
10,05€ dus sur L2, contre8,80€ encore dus sur l'ancienne source (ne pas confondre).
Solde Restaurant retrouvé sous `329ddd46-858d-488a-a03e-eff50cfcfa35`, ne pas recréer.
Pas de décision de nouvelle copie active implicitement déduite du silence.
[Détails et contraintes de reprise](F18-LABORATOIRE-SEPARE-2026-10-18.md).

Retour arrière : conserver sources/diff, données et archives ; aucune migration
DOWN ou remise d'un ancien binaire en écriture sur ces bases. Les deux derniers
correctifs (suivi sync+gzip et notes POS) restent à contre-tester dans Chrome.

## F18 — état réel du 18 octobre, arrêt NON CONFIRMÉ

Base logicielle `ab0d735f60f01bbfd0c7f914a43c2b997f280e2e`, correctifs F18 encore
locaux. **Aucune nouvelle migration SQL**, aucun seed/reset ni transformation de
l'historique. Le suivi explicite des promesses HTTP/continuations et flux conserve
le refus pour travail opaque ; il ne remplace pas la preuve de fin par un timeout.

Après abandon de la réponse du règlement fictif 8,80 € : transaction expirée et
rollback prouvé ; l'acompte 3 € reste affecté et 8,80 € restent dus. Le contrôleur
officiel a refusé l'arrêt. Les interfaces sont indisponibles, mais le contrôle
Windows12:30–12:32UTC voit encore l'écoute3002, avec connexions rejetées. Processus
conservé, **pas de seconde instance sur la même base**, pas de kill ni d'inspecteur
pour libérer artificiellement ce garde. [Chronologie](F18-ABANDON-HTTP.md).

Préserver la référence `5b93c091-f841-4672-beb3-90c991a7023f` ; le rejeu et la reprise
de cette instance restent à qualifier. Ne pas créer un nouveau règlement, une
vente de remplacement ou une clôture pour cacher l'incident. Anciennes valeurs
financières comparées égales dans les trois sociétés ; cette comparaison ne
prouve pas une restauration finale ou la vidange de tous les journaux mémoire.

Une instrumentation privée bornée est maintenant compilée pour les prochains
processus : étape/raison uniquement, mêmes rejets/guards. Elle ne récupère pas le
motif déjà perdu de l'ancien runtime. Les tests isolés/PG passent, le refus réel
n'est pas reproduit sur la pile Socket.IO isolée ; ne pas l'annoncer corrigé.

Restauration initiale F18 vérifiée avant mutations : 82 tables/18997 lignes/
14 fichiers/26 PDF. Une nouvelle restauration finale reste **BLOCKED**. Une demande
de décision sûre a été présentée : copie de laboratoire entièrement séparée
(qui nécessiterait également des ports distincts validés), ou redémarrage du PC
par le propriétaire après préservation. Ne pas transformer
une absence de réponse ou une option présélectionnée en autorisation.

Retour arrière du code : conserver les sources/diff et les données. Aucune
commande automatique de reset/checkout/down ni ancien binaire sur la base en
écriture. La copie source 12:18:41 UTC et les archives antérieures sont conservées.

## Droits fins — 18 octobre 2026

Base source `976b21a500f58d09fdca33616a9c243a66ae5161`, branche2.0 exclusivement.
Migration additive `20261017220500_business_capabilities` : variantes JSON et version
sur UserCompany, journal BusinessPermissionEvent avec FK/index/contrôles. Appliquée
uniquement aux bases fictives creorga_local/creorga_tests127.0.0.1:5450. Aucun seed,
reset, changement de vente/document/règlement historique ou suppression de profil.

Copie cohérente finale après les deux cycles d'arrêt/reprise du18octobre : archivev2
avec dump natif,AES-GCM,clé séparée,restauration dans une nouvelle base ; **82tables/
18997lignes/14fichiers/26PDF/8événements de droits**, empreintes égales
à09:47:14.564UTC,23,954s cache chaud(nonRTO). Archive SHA
`f88bf3e0048876104b7575375d5d62f17b625d9dfd5a164538be6fcb2c91efee`.
[Preuves](preuves/droits-robi-validation-2026-10-18.json). Les copies précédentes,
27dumps récupérés et archives originales restent intactes. Pas27restaurations.

Reprise sûre : conserver la source et l'archive originales, vérifier leurs SHA,
restaurer base et fichiers d'un même instant dans **de nouvelles destinations**,
comparer tables/lignes/PDF puis les droits et journaux, utiliser le lanceur officiel
en profil métier, paiements et SMTP externes neutralisés. Le raccourci existant est
préservé. Les deux derniers arrêts sont confirmés avec les trois onglets ouverts,
PID absents et cinq ports libres. Ne jamais lancer aveuglément une deuxième instance
après un arrêt ambigu : vérifier propriété, PID et ports via les diagnostics officiels.
Le drain HTTP mémorise tout abandon prématuré horsEngineIO, même un GET antérieur
à l'arrêt : cette instance ne confirme alors pas sa fermeture et ne déconnecte pas
sa base. La levée de cette incertitude n'est pas qualifiée ; conserver les références
et journaux, réconcilier les effets métier et demander une décision de reprise.
Aucun arrêt forcé, délai augmenté, purge ou contournement Windows autorisé.

Le correctif de drain et les projections d'inventaire n'ajoutent pas de migration
ni ne transforment les ventes/ingrédients. Une connexion HTTP simultanément mixte
EngineIO/métier ou un upgrade concurrent peut être refusé503 avant admission ;
reprendre sur une connexion neuve en gardant la même référence idempotente pour
une opération financière, pas une nouvelle vente de remplacement.

Retour arrière logiciel : aucune migration DOWN/destruction implémentée ou exécutée.
Les colonnes/tables de droits doivent être conservées ; revenir à un binaire qui
ignore les capacités peut rouvrir le défaut CA EMPLOYEE. Préférer un correctif
en avant ou une copie isolée avec accès fermés plutôt que réinstaller silencieusement
l'ancienne version. Valider explicitement toute future transformation des droits.

En autorité fichiers historique, mutations HTTP refusées503FLOOR_AUTHORITY_REQUIRED
**avant** effet métier ; fichiers lisibles et préservés. Pas d'adoption automatique
ni de migration historique implicite pour contourner le refus. Toute reprise de ces
données demande inventaire, copie et qualification PG séparée.

## Fiabilité du profil métier — après f198c98

Code/test du lot `23316e37547c46bb03176a63e3c7b16a1f082d2e`. Finalisation le
17 octobre : nouvelle base restaurée, **81 tables / 8 fichiers / 21 PDF égaux**,
AES-GCM/clé séparée, puis **19 assertions de reprise** réussies. Liens documentaires
restaurés avec données (3 liens / 6 événements), pas schéma vide.
[Preuve](preuves/restauration-fiabilite-2026-10-17.json). Toutes les anciennes
archives et bases restaurées sont conservées ; aucun rollback destructif effectué.
Le contrôle visuel Windows reste BLOCKED pour URL non vérifiable par computer-use,
sans contournement ; cela ne remplace pas une procédure d'arrêt via le canal privé.

Deux migrations **additives** `20261019120000_invoice_document_links` et
`20261019121000_document_link_revocation_guard`, soit 36 au total, appliquées
uniquement à `creorga_local` et `creorga_tests` sur localhost:5450. Elles ajoutent
les capacités de téléchargement et leur journal avec relations société/facture,
puis une contrainte de révocation complète. Aucune vente, facture, paiement ou
ligne historique n'est réécrit. Les dates des identifiants sont des séquences de
migration, pas des attestations d'exécution à cette date.

Gel permanent dans le code de ce lot : **aucune suppression automatique** de ZIP,
dump, partiel ou extraction de restauration, en profil métier comme complet.
La politique future nécessite inventaire, recette puis validation humaine des
candidats précis ; aucune variable ne lève ce gel. Les originaux et les 27 dumps
récupérés sont conservés. [Registre vérifié](SAUVEGARDES-FIABILITE.md).
Le script privé de nettoyage de fixture échoue avant toute suppression ; il n'a
pas été exécuté comme nettoyage. Surveiller l'espace, ne pas réactiver une purge.

Le contrôle Windows utilise un canal nommé privé et un descripteur aléatoire
hors Git, conservé après arrêt. Aucun endpoint HTTP ni secret dans le navigateur.
`stop-profile.ps1` attend la fin des requêtes admises, tâches/sauvegardes en vol,
journaux puis Prisma ; un délai ou un échec reste **non confirmé**, sans kill.
Le démarrage refuse de remplacer un profil encore actif non arrêté proprement.
Une ancienne version sans canal privé exige une procédure séparée : ne pas la
terminer automatiquement ni transformer la disparition d'une fenêtre en preuve.
[Contrat et tests](ARRET-PROPRE-PROFIL-LOCAL.md).

Les photos et brouillons non attribuables restent en quarantaine navigateur.
La déconnexion conserve un verrou de révocation non confirmée ; ne pas l'effacer
avec une ancienne fonction Reset. Si la révocation échoue, garder l'écran verrouillé
et réessayer. Un ancien frontend ignore ces protections : correction en avant
recommandée, pas rollback aveugle sur le même profil navigateur.

Les liens PDF sont au porteur. La rotation du secret serveur les invalide ;
conserver les clés de restauration **séparément** des archives. Ne publier ni
descripteur de contrôle, ni capability, ni fichier d'environnement dans Git/support.
Un PDF déjà téléchargé ne peut pas être rappelé par révocation.

Retour arrière : arrêter les écrivains, préserver base/fichiers/configuration au
même instant, restaurer dans **une base neuve**, comparer puis décider. Aucun
`down`, reset, drop des nouvelles tables, suppression d'audit ou ancien POS en
écriture sur la base migrée. Aucun déploiement en production dans ce lot.

## Profil professionnel local — après 962c01b

Code `9e15b1a`, 16 octobre 2026. **Aucune migration SQL nouvelle**, 34 existantes conservées.
Le profil retire les jeux du livrable et du routage, pas du dépôt, de la base ou des historiques.
Mêmes ports/origines, PostgreSQL autorité et chemins privés explicites ; aucun seed/reset/install
au lancement. Le complet utilise le même code 2.0 récent, pas un ancien exécutable financier.

Depuis le dépôt, sur ce PC préparé :

```powershell
powershell.exe -NoProfile -File ../local-2.0/stop-profile.ps1
node ../local-2.0/start-profile.mjs --full
# Retour métier, après arrêt du profil courant :
powershell.exe -NoProfile -File ../local-2.0/stop-profile.ps1
node ../local-2.0/start-profile.mjs
```

PID validés par commande et chemin ; un PID réattribué à un autre logiciel reste intact.
Pas de démarrage Windows ajouté, de purge ni changement d'origine. Chrome dédié neuf,
profils historiques interdits/non ouverts. Préférences de jeu et données métier conservées.
Les caches modules non attribuables restent en quarantaine, jamais importés automatiquement.
Portail/reset/onboarding : verrou SQL commun et révision monotone, identité/création préservées
au reset. Préférer une correction en avant à un backend ancien réinitialisant ces révisions.
Aucun shift historique réécrit par la correction de planning.

Reprise testée à 19:32 UTC : sauvegarde cohérente à écrivains arrêtés, AES-GCM/clé séparée,
restauration dans **une nouvelle base**, 79 tables / 8 fichiers / 17 PDF égaux, 17 contrôles
après redémarrage. 3 721 ms sur cette copie, pas un RTO. Allocations peuplées 7/14/21,
[preuve](preuves/restauration-business-only-2026-10-16.json).

**Incident déclaré :** deux dumps de rotation du laboratoire supprimés par une rétention
autonome avant sa correction. Rétentions ZIP **et dump** désormais désactivées en mode
business/essential ; 27 dumps absents récupérés depuis 36 ZIP du jour dans un nouveau
répertoire privé, signature/size/SHA vérifiés. Correspondance exacte des deux noms non
démontrable faute de journalisation. Aucun ZIP ni archive originale hors laboratoire modifié.
[Preuve](preuves/rotation-laboratoire-2026-10-16.json). Surveiller l'espace et décider
explicitement des archives à retirer ; absence de purge n'est pas un stockage infini.

Incident : arrêter tous les écrivains, conserver état/réserves, restaurer dans une autre base
avec les fichiers du même instant et comparer avant reprise. Pas de down/reset/purge ni retour
en écriture à un ancien POS ignorant les allocations. Jeux seuls : récupération vérifiée depuis
[962c01b immuable](https://github.com/LB7436/creorga/tree/962c01b2767a06db510c6b0aa3e22d521da77534),
sans restaurer l'ancien backend. [Rapport](PROFIL-PROFESSIONNEL-SANS-JEUX.md).

## Lot T100 après c0ddd81 — 16 octobre 2026

Aucune migration SQL nouvelle. Conserver les 34 migrations et toutes les données financières,
réserves, journaux et fichiers existants. Les fixtures nouvelles sont uniquement fictives et ne
nécessitent aucun nettoyage. La sauvegarde de ce lot est créée depuis une copie cohérente arrêtée,
chiffrée avec clé séparée et restaurée dans une autre base ; preuve dédiée
[restauration T100](preuves/restauration-t100-2026-10-16.json). Les anciennes archives et preuves
ne sont pas utilisées comme répertoires de rétention ni écrasées.

L'éditeur de salle importe/exporte désormais uniquement la géométrie. Il refuse le retrait d'une
table active, fusionnée ou portant des données client ; l'historique ne restaure jamais d'anciennes
lignes ni d'anciens règlements. Ne pas revenir à l'ancien import destructeur pour contourner ce refus.

La clé navigateur `creorga-assistant` passe à v3. Les conversations non attribuables restent en
quarantaine ; celles attribuées sont séparées par utilisateur/société. Aucun profil historique n'a
été ouvert pour cette migration. **Ne pas lancer un ancien frontend sur un profil v3 pour faire
un rollback** : il ignore ces portées et pourrait réécrire le stockage. Conserver une copie privée
du stockage concerné avant toute reprise expressément autorisée, ou privilégier un correctif en
avant et un profil neuf de laboratoire. Ne pas exporter ces conversations vers Git/support public.

Les origines autorisées de l'API sont l'origine de l'application et le backend fixé à l'installation
(`VITE_BACKEND_URL`). Une URL tapée dans les paramètres n'ajoute aucune origine approuvée.
Ne pas réactiver l'ancien envoi de jeton vers une destination libre pour reconnecter un serveur :
reconfigurer l'installation approuvée et refaire sa recette dans le laboratoire.

Retour logiciel : commits séparés, pas de réécriture de branche partagée. Arrêter les écrivains,
préserver l'état puis tester un revert ciblé dans une copie/neuf profil ; ne jamais retirer les
contraintes SQL précédentes ni réutiliser un ancien POS en écriture sur des données migrées.
Aucun rollback en production effectué ou autorisé ici.

## Lot précédent — allocation financière, 16 octobre 2026

Base `7c08307`, même branche dédiée. Quatre migrations additives, appliquées seulement aux copies
de laboratoire ; **34 migrations** au total. Les identifiants 20261018 sont des séquences, pas
la date réelle d'exécution (16 octobre).

| Migration | Effet |
|---|---|
| `20261018140000_service_allocations` | Trois tables allocation/groupe/affectation, FK composites, unicités, gardes d'immutabilité et totaux différés |
| `20261018141000_allocation_item_guards` | Interdit ajout/effacement des lignes allouées ; préserve DELETE normal hors allocation |
| `20261018142000_allocation_settlement_guards` | Interdit annulation allouée / statut payé sans montant complet ; règlement d'origine non modifiable |
| `20261018150000_quote_haccp_provenance` | Lien nullable devis/facture et date, FK société ; source nullable des nouveaux relevés manuels |

Aucun backfill de document, montant ou provenance historique. Une acceptation ancienne sans
lien reste sans lien inventé ; anciennes mesures sans source restent NULL. Les gardes PostgreSQL
complètent Prisma : ne pas les supprimer avec un `db push` ou une resynchronisation automatique.

Procédure **copie isolée uniquement** : arrêter les écrivains, archiver base/fichiers du même
instant, restaurer dans une nouvelle base, `prisma migrate deploy`, générer Prisma backend
arrêté sous Windows, puis redémarrer en autorité PostgreSQL. Les envois et paiements réels restent
neutralisés ; aucune clé bancaire de production réutilisée. Ne jamais lancer seed/reset/migrate dev.

La restauration doit inclure `ServiceAllocation`, `ServiceShare`, `ServiceShareTender`, visites
et capacités révoquées, commande/tenders d'origine, sessions/couverts, journaux et réserves.
Le JSON miroir seul ne peut reconstruire ces liens. Ne pas recréer des lignes POS à partir
d'un écran QR ou d'une ancienne sauvegarde de navigateur.

Essais réellement exécutés :

- Cliché privé ancien lu seulement, dump vers une **nouvelle base**, 7 → 34 migrations ;
  47 tables / 341 lignes et colonnes historiques identiques, cliché source inchangé.
  Aucun fichier d'archive originale ni profil historique ouvert pour cet essai.
- Sauvegarde finale courante après arrêt des cinq applications : entrée de copie nouvelle hors
  des anciens dumps, archive v2 avec vrai pg_dump, AES-GCM/clé séparée, pg_restore transactionnel
  dans une autre base. **79 tables + 8 fichiers égaux**, PDF 9 factures / 8 avoirs identiques,
  allocations 5 / groupes 10 / affectations 15. 2 952 ms, pas un objectif RTO.
- Redémarrage des services locaux et 17 assertions : parts exactes, acompte d'origine, créance
  restant ouverte, stock non débité prématurément, ancien QR révoqué, lien devis et PDF retrouvés.

Retour arrière : arrêter **tous les écrivains**, conserver une nouvelle copie de l'état courant
et des preuves, restaurer **dans une autre base**, corriger en avant. Ne pas effacer une part,
un acompte, une réservation UNKNOWN/REVIEW ou un document pour rendre un ancien code compatible.
L'ancien binaire n'est **pas autorisé en écriture** sur les allocations : il ignorerait leurs
soldes/groupes et pourrait doubler l'encaissement. Aucun down destructif proposé.

Clés et dumps restent privés et séparés. Stripe Refunds / vidéo désactivés. Aucun déploiement
public, DNS, production ou essai de paiement réel. Preuves : [rapport courant](ALLOCATION-FINANCIERE-ET-RECETTE.md)
et [restauration expurgée](preuves/restauration-allocation-2026-10-16.json).

## Historique — lot recette métier avant 7c08307

Base Git `3b02765820e4f7f452cb812be88af608870c1937`, même branche dédiée. Une migration nouvelle,
`20261018130000_reservation_isolation`, appliquée **uniquement** à `creorga_local` et `creorga_tests`.
Le préfixe est un identifiant de séquence, pas une exécution future.

Deux index uniques `(companyId,id)` sur Table et Customer, deux FK composites sur Reservation
et un index de recherche sont ajoutés. FK **NOT VALID** : anciennes relations préservées sans
validation inventée ; nouvelles écritures contrôlées, même hors HTTP. Aucune vente, facture,
réservation ancienne ou règlement réécrit. Les FK SQL supplémentaires sont intentionnelles,
en complément des relations Prisma historiques ; ne pas les supprimer par une resynchronisation automatique.

Les séparations de groupes/lignes sont stockées dans TableMovement et FloorWorkspace avec les
provenances de portions et bases de demandes cuisine. Une restauration doit conserver ces champs,
les quotes, l'audit et les réserves. Ne pas reconstituer une séparation par copie de lignes dans un ancien JSON.
Les comptes/appareils, fichiers métier et pièces du même instant restent nécessaires.

Retour arrière : arrêter tous les écrivains, conserver un nouvel export de l'état courant,
restaurer dans une **autre base**, puis faire un correctif en avant. Ancien binaire interdit en
écriture sur des portions séparées : il pourrait relancer la préparation. Aucun reset/down/purge.
Un schéma conservé n'autorise pas un retour de code qui ignore les nouvelles projections.

Pour la nouvelle vérification de reprise, le lanceur privé prépare une nouvelle entrée de sauvegarde
par copie de travail, hors des anciens répertoires de dumps. La rétention ne touche ainsi ni les
dumps de travail précédents, ni les archives originales. Les clés AES-GCM restent séparées et hors Git.
Résultat effectivement exécuté et compteurs courants : voir CHECKPOINT et RECETTE-ET-PREUVES.

Les profils historiques restent fermés. Pas de production, banque réelle, DNS ou déploiement.

## Complément courant — QR, rapprochements et versements

16 octobre 2026, code `23bba568ec54c7c0acc3861f3ba639f155c1dd3d`, après `879155d`.
Seulement `creorga_local` / `creorga_tests`, PostgreSQL 16.15. Aucun seed/reset/purge ou migration
en production. Trois migrations de séquence 20261018, réellement exécutées le 16 octobre :

- `20261018100000_table_movements` : journal de mouvements et révocation nullable des capacités QR.
  **Retrait explicite de l'ancien index unique GuestVisit_one_open_table**, sans supprimer de données :
  plusieurs visites séparées peuvent désormais cohabiter à une table après fusion. Les ouvertures
  ordinaires restent sérialisées et refusent un doublon. Ne pas rétablir cet index sur ces données.
- `20261018110000_refund_reviews` : événements append-only et horodatage de libération nullable,
  état NOT_REFUNDED avec contrainte de cohérence. Aucun ancien remboursement libéré par migration.
- `20261018120000_bank_payouts` : quatre tables de relevés/versements/lignes/décisions, liens
  composites intersociétés interdits, unicités de références et UPDATE des décisions refusé.

Étapes sur **copie isolée uniquement** : arrêt de tous les écrivains, archive base/fichiers cohérente,
restauration dans une nouvelle base, `prisma migrate deploy`, génération Prisma avant redémarrage
(arrêter le processus Node sous Windows pour libérer la DLL). Puis recette avec les deux groupes QR,
les paiements en cours et les anciennes versions de brouillons. Ne pas lancer `db:migrate` qui utilise
`migrate dev`. L'import de relevés fictifs reste désactivé par défaut ; option locale explicite seulement.

Retour arrière : conserver la copie courante et les preuves, restaurer dans **une autre base**, ne
jamais effacer une visite ou réserve pour rendre compatible un ancien binaire. Ancien code en écriture
interdit sur les visites multiples et états NOT_REFUNDED ; correctif en avant recommandé. Les capacités
déjà révoquées ne doivent pas être réactivées en réimportant un JSON. Renouveler les QR par visite.
L'archive originale et les profils historiques restent hors périmètre.

Dernier essai réel, applications arrêtées : pg_dump puis archive v2, chiffrement/déchiffrement AES-GCM
avec clé séparée, pg_restore transactionnel vers nouvelle base. **76 tables et huit fichiers égaux**,
neuf PDF facture et huit d'avoir intègres. Six nouvelles tables peuplées : mouvements 3, événements de
remboursement 5, relevé 1, versement 1, lignes 5, décision 1. Deux remboursements et leurs deux
allocations fictives inclus. Comparaison SHA-256 de toutes les lignes et colonnes, pas seulement
contrôle d'existence des tables. 1 847 ms mesurées sur cette petite copie, pas un engagement RTO.
Neuf lectures de reprise après redémarrage réussies. Deux générations anciennes de dumps de travail
retirées par la rétention des deux essais ; archives originales/chiffrées et clés séparées préservées.

## État antérieur conservé

## Complément — migrations de sessions et remboursements, 16 octobre 2026

Code `6080a6a90fe864ad24f7b4565ee6988e56469fd4`, après `163d70d`. Appliqué seulement aux bases
de laboratoire `creorga_local` / `creorga_tests`. Ne pas copier ces commandes sur une production.

- `20261017090000_floor_workspace` : deux nouvelles tables, snapshot initial immuable côté API,
  empreinte, révision et journal des deltas.
- `20261017100000_service_sessions` : sessions/couverts, liens composites société/commande,
  référence nullable `OrderItem.sourceLineId`. Aucun backfill de documents historiques.
- `20261017110000_manual_refunds` : déclarations append-only, justificatif figé, liens avoir/tender
  et mouvement espèces ; dernière preuve/horodatage de rapprochement PayPal nullable.
- `20261017120000_refund_reconciliation_state` : élargit le contrôle d'états avec
  `REFUSED_RECONCILIATION`. Remplacement d'une contrainte, aucune ligne historique réécrite.

Le préfixe 20261017 est un identifiant de migration, pas la date d'exécution (16 octobre).
Seul `prisma migrate deploy` via le lanceur privé a été utilisé, aucun seed/reset/purge.

Avant activation sur une **autre copie isolée** : arrêter ses écrivains, inventorier/archiver
base + fichiers du même instant, restaurer dans une nouvelle base, appliquer les migrations,
générer Prisma, puis démarrer avec `CREORGA_FLOOR_AUTHORITY=postgres`. La première lecture adopte
la copie exacte du plan et conserve son `initialSnapshot`/empreinte ; elle ne récupère pas les
ventes enfouies dans un navigateur. Tester les lignes anciennes nécessitant une revue de prix.

Une fois adoptée, PostgreSQL est l'autorité : ne pas désactiver l'option, ne pas réimporter un
ancien JSON comme maître ni lancer deux versions indépendantes en écriture. Le fichier marqué
PostgreSQL refuse le mode ancien ; ce garde-fou ne remplace pas une procédure opérateur si un
miroir est lui-même perdu. En cas de panne, suspendre l'écriture et réparer/restaurer la copie.

Rollback : arrêter **tous** les écrivains, conserver l'archive courante et les références de
règlements incertains, restaurer dans une base différente. Garder sessions, provenances, tenders,
avoirs et réservations. L'ancien code ignore ces états : ne pas l'autoriser en écriture sur la
base migrée. Préférer un correctif en avant. Aucun down/reset ni suppression de réserve proposée.

Reprise exécutée : AES-GCM, clé séparée, nouvelle base, 70 tables et huit fichiers égaux,
huit PDF facture et sept d'avoirs intègres, 1 769 ms sur cette petite copie (pas un RTO).
Les nouvelles sessions et une déclaration contiennent des données ; les tables PayPal restent
vides dans l'archive, testées séparément en intégration. Originaux/profils préservés. La rétention
normale a supprimé d'anciens dumps de travail, pas les archives originales.

Les sections suivantes conservent la procédure et les observations des lots antérieurs.

## Historique des lots précédents

Les archives privées originales restent immuables. Le laboratoire crée une base snapshot,
une base locale modifiable et une base de tests vide, puis restaure fichiers et base du même instant.
La preuve de reprise et les configurations contenant des secrets restent hors dépôt.

Migrations appliquées : journal POS du 5 septembre puis `20261008130000_payment_attempts`.
Cette dernière crée uniquement une table, des contraintes et index. Elle ne renumérote ni
ne réécrit les commandes historiques. La contrainte composite empêche de rattacher une
tentative à une commande d'une autre société.

Migrations supplémentaires appliquées uniquement aux copies locale et fictive de tests :

- `20261008143000_payment_settlements` : confirmations et événements prestataire.
- `20261008153000_payment_allocations` : affectations par commande, réservation active unique,
  trace de débit de stock. Les anciennes ventes ne sont pas réinterprétées.
- `20261008163000_issued_documents` : profil légal, champs professionnels du client,
  contenu d'émission, PDF et empreinte. Aucun original historique n'est inventé.
- `20261008173000_invoice_delivery` : file transactionnelle et références d'envoi.
- `20261008190000_guest_visits` : visites, capacités hachées, rattachement nullable des nouvelles
  commandes et tentatives. Aucun ancien impayé n'est automatiquement rattaché.
- `20261016140000_hr_document_integrity` : empreinte nullable et suppression en attente des pièces RH.
  Les anciens fichiers ne reçoivent pas de preuve d'intégrité inventée. L'ancien code pourrait
  rouvrir une pièce retirée ; désactiver ses routes RH en cas de retour, garder les tombstones.
- `20261016150000_receipt_invoice_link` : facture unique par ticket, clé étrangère société/ticket,
  profil historique de provenance. Ne retirer aucun lien pour recréer un document. L'ancien code
  n'impose pas l'immutabilité financière de ces brouillons : ne pas le remettre en écriture dessus.
- `20261016160000_sale_origins` : provenances uniques des nouvelles ventes ; aucune réécriture
  ni attribution automatique aux anciens reçus sans identifiants fiables.
- `20261016170000_credit_notes` : avoirs distincts, numéros uniques, original/PDF/TVA conservés.
- `20261016180000_order_tenders` : affectations par commande, sources composées par société,
  consommations/pourboires/dons séparés. Aucun backfill des anciens états payés.
- `20261016190000_cash_ledger` : champs v2 nullable, mouvements, unicité des nouvelles sessions
  ouvertes, rapport de clôture figé. Les anciennes sessions ne sont pas converties implicitement.
- `20261016200000_refund_attempts` : réservations durables de remboursement, avoir/capture liés.
- `20261016210000_refund_allocations` : part de capture réservée par commande d'origine.
  Une réservation ancienne sans ventilation n'est pas reconstruite : rapprochement requis.

Ces évolutions sont additives. Le code précédent ne sait pas rapprocher toutes les nouvelles
affectations : revenir au vieux code avec des tentatives actives constitue un retour dangereux.
Conserver l'état courant et traiter les opérations ambiguës avant toute remise en service.
Le vérificateur en lecture seule `scripts/verify-restored-copy.mjs` compare les tables, colonnes,
empreintes et octets des PDF entre deux bases locales distinctes ; il ne restaure ni ne supprime rien.

Retour arrière : arrêter les applications du laboratoire, conserver un export de son état,
recréer une **nouvelle** base depuis l'archive originale et utiliser le code de l'instant voulu.
Ne pas supprimer une table de tentatives contenant des opérations non rapprochées.
Une tentative inconnue doit être rapprochée avant remise en service financière.

Les anciens profils de navigateur et leurs origines n'ont pas été effacés. L'export des ventes
qui n'existeraient que dans ces profils reste à exécuter dans chaque navigateur concerné.
Le travail local ne déclenche pas d'encaissement, remboursement, SMS ou email réel.

Le code antérieur au gel des prix et aux visites pourrait recalculer un ancien tarif et rouvrir
un QR permanent. Ne pas remettre ces endpoints en service avec l'ancien code. Conserver migration
et données ; préférer un correctif en avant. Tout retour impose arrêt, sauvegarde et recette des
prix/autorisations. Ne jamais appliquer les tests ou migrations au snapshot original.

Reprise native du 16 octobre : archive v2 chiffrée, déchiffrée, restaurée dans une base neuve ;
59 tables, six fichiers et deux PDF égaux. Ancien outil Docker durci : extraction en flux contrôlée,
UUID exclusifs, `pg_restore --exit-on-error --single-transaction`, erreurs expurgées, nettoyage des
seules ressources créées. Ses 18 tests simulent Docker ; ils ne prouvent pas une exécution Docker.

Dernière reprise native après lot ticket/facture : 59 tables, huit fichiers (dont RH) et trois
originaux PDF égaux. Chiffrement vérifié ; 1 529 ms sur cette copie, sans engagement de RTO.

Dernière reprise après lot financier `dfb708a` : **65 tables**, huit fichiers, sept PDF facture
et six PDF avoir intègres/identiques, AES-GCM vérifié, 1 646 ms (pas un RTO). Les tables
de provenances POS et de remboursements sont vides dans cette copie ; leurs lignes ont été
testées en intégration. Le vérificateur contrôle désormais aussi `CreditNote.pdf/pdfHash`.

Rollback de ce lot : arrêter les écrivains, conserver une nouvelle archive de l'état courant
et des réservations, puis restaurer dans une autre base. Ne pas retirer `SaleOrigin` pour revendre
une ligne, ni `OrderTender` pour réouvrir un solde, ni les avoirs/réserves pour libérer un plafond.
L'ancien code ignore les acomptes et les mouvements v2 : **ne pas le réactiver en écriture**
sur cette base migrée. Un correctif en avant est préférable. Aucun down/reset proposé.
La sauvegarde doit inclure les nouvelles références navigateur incertaines avant tout changement
d'origine ; T04 réel reste distinct et non exécuté (`T04-REPRISE-HISTORIQUE.md`).

## Complément mission maître — 17 octobre 2026

Ce lot n'ajoute **aucune migration Prisma ni modification de schéma**. Il corrige
des projections, verrouillages et contrats UI/API existants. Les visites désormais
fermées et accès révoqués sont des événements métier conservés, pas un nettoyage.
Les ventes/prix/TVA/tenders et documents émis antérieurement ne sont pas réécrits.

Dernier point de reprise réellement exécuté : `RESTORATION-2.0-mission-maitre-fin-rejeux-20261017-2132-v1.json`,
privé hors Git, terminé à **19:31:36.908 UTC** après arrêt normal du laboratoire.
81 tables/10 083 lignes/14 fichiers/26 PDF identiques, copie AES-GCM vérifiée,
clé séparée, aucune différence. Archive SHA
`372728371f2f262541e5bf3151555b1b2c3be62e3a13cf81db10f6be7fc92d48`.
[Contre-vérification expurgée](preuves/sauvegardes-mission-maitre-final-2132-v1.json).
La durée chaude de 5 342 ms ne définit pas un RTO ou une garantie d'atomicité sous
écritures concurrentes. Toutes les copies précédentes restent présentes.

Pour reprendre : vérifier la branche/diff, lire le checkpoint et les empreintes de
la dernière copie ; utiliser les comptes/sociétés fictifs déjà enregistrés. Ne pas
rejouer leurs anciennes demandes pour générer une deuxième vente, un deuxième
remboursement ou une deuxième demande de congé. Un redémarrage normal utilise le
lanceur privé et le profil métier. Ne pas réouvrir un ancien QR en modifiant SQL :
créer une nouvelle visite explicitement depuis l'interface si le service reprend.

Retour arrière du **code** uniquement : arrêter normalement le runtime, conserver
une nouvelle copie de l'état et restaurer une autre base ; ouvrir le code de
l'instant choisi dans une copie distincte. Ne pas remettre l'ancien writer en
service sur la base courante : il pourrait rouvrir une visite déjà soldée ou perdre
les protections de projection/admission. Préférer un correctif en avant. Aucun
reset/down/purge ni suppression de tables/réserves ne fait partie de cette procédure.

Les deux anciens pointages simultanément ouverts du Café restent inchangés : le
code refuse ce cas ambigu, il ne choisit pas silencieusement une heure rétroactive.
Les profils historiques, archives originales, banque réelle et production restent
hors de cette reprise ; T04 n'est pas présenté comme réalisé.
