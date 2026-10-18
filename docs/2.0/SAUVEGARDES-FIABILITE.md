# Fiabilité des sauvegardes — gel de suppression et inventaire de reprise

## Contrôle supplémentaire du18octobre2026

Les27copies récupérées ont été relues : tailles et SHA identiques à l'index original
`0a966a2baac58179529017d6d7af2344e9cb1e0aa4131ea09176e511805b1358`.
Il ne s'agit ni d'une nouvelle récupération ni de27restaurations. Les deux noms
des anciens dumps supprimés restent non identifiés. **Gel des suppressions inchangé**.

Trois nouvelles copies finales v1/v2/v3 ont été restaurées dans de nouvelles bases,
sans purge. La dernière après le second arrêt confirmé est égale : **82tables/
18997lignes/14fichiers/26PDF**,8événements de droits inclus,09:47:14.564UTC,
23,954s mesurées cache chaud(nonRTO). ArchiveSHA
`f88bf3e0048876104b7575375d5d62f17b625d9dfd5a164538be6fcb2c91efee`.
[Preuve expurgée](preuves/droits-robi-validation-2026-10-18.json),
[procédure et limite d'arrêt](MIGRATION-REPRISE-ROLLBACK.md). Aucune ancienne archive
ou base restaurée supprimée. Aucune conclusion RPO/RTO de production ou essai
Windows d'arrêt réussi déduite de la seule restauration. Les deux arrêts contrôlés
avec Chrome ouvert ont des preuves séparées PID/ports/UI ; ils ne qualifient ni
coupure électrique, ni abandon HTTP incertain, ni double clic natif du raccourci.

Lot du 17 octobre 2026, branche `codex/creorga-2-0-2026-10-08`, base `f198c98`.
Ce document distingue les garanties logicielles, l'inventaire des octets et une
restauration effective. Aucun de ces éléments n'est une qualification de production.

Finalisation du même lot : restauration effective à 08:51 UTC le 17 octobre, dans
une **nouvelle base locale** : **81 tables, 8 fichiers et 21 PDF égaux**, zéro écart,
AES-GCM/clé séparée ; 19 contrôles de reprise après redémarrage.
[Preuve](preuves/restauration-fiabilite-2026-10-17.json). Cela ne signifie pas que
les 27 dumps récupérés ont chacun été restaurés. Aucune ancienne archive supprimée.

## Décision applicable immédiatement

Toutes les suppressions automatiques de sauvegardes sont gelées dans les profils
métier **et complet**. Revenir au profil complet n'autorise pas une purge. Aucune
variable d'environnement, y compris une variable nommée « approved » ou « enabled »,
ne remplace une décision explicite du propriétaire. Aucun chemin de suppression
ZIP/dump n'est conservé derrière une simple case d'activation.

La levée du gel n'est **pas implémentée**. Elle nécessitera cumulativement :

1. Une politique datée approuvée : périmètre, objectifs RPO/RTO, générations,
   exceptions, coût disque, durée, chiffrement et gardien des clés.
2. Une recette de cette politique et une restauration des générations conservées,
   avec un manifeste de candidats précis et des empreintes, sans supprimer.
3. Une autorisation humaine explicite portant sur ces candidats et cette version
   de la politique. Une autorisation ancienne, une configuration ou la signature
   d'un simple formulaire ne vaut pas autorisation générique de supprimer.

Une future implémentation devra revérifier les empreintes et destinations au moment
de l'action, refuser tout changement depuis la simulation, garder une piste d'audit
et privilégier une quarantaine récupérable. **Aucune suppression n'est proposée à
l'exécution dans ce lot.**

## Mécanismes audités et changements

| Mécanisme | État avant ce lot | État de ce lot |
|---|---|---|
| ZIP, `backup-worker.ts` | Métier/essential sans purge, complet : au-delà de 30 ZIP complets, exception jour 1 | Suppression retirée ; création et vérification maintenues |
| Dumps, `pg-dump.ts` | Métier/essential sans purge, complet : 7 récents + 4 hebdomadaires | `prunePgDumps` sans effet pour les anciens appelants ; aucun scan/purge |
| ZIP `.partial` en échec | Effacement automatique de la copie partielle du worker | Partiel conservé, non listé comme sauvegarde complète, avertissement sans chemin privé |
| Dump intermédiaire Docker | `docker exec ... rm -f` après copie | Copie conservée dans un répertoire réservé exclusivement ; référence rendue à l'opérateur privé |
| Collision de nom de dump | `pg_dump -f` / `docker cp` pouvaient remplacer la même sortie | Réservation `wx` exclusive avant toute commande d'écriture ; échec sans retry destructif |
| Collision de nom de ZIP | `rename` pouvait remplacer une destination existante | Publication par lien physique exclusif ; destination existante préservée |
| Vérification Docker de restauration | `dropdb` et `rm` en `finally` | Répertoire de contrôle réservé exclusivement, base et dump conservés, réussite comme échec |
| Extraction de vérification | Suppression récursive du répertoire temporaire | Extraction conservée ; rapport privé avec emplacement |
| Rétention créateur | Purge quotidienne de logs/événements/tokens en profil complet | Aucun minuteur ni suppression, même par appel direct |
| Script privé `restore-current-copy.mjs` | Nouvelle entrée, chiffrement et nouvelle base, sans nettoyage | Audité en lecture ; aucune archive source modifiée |
| Script privé `cleanup-failed-refund-fixture.mjs` | `deleteMany` sur une fixture identifiée | Neutralisé : refus immédiat avant les anciens appels ; aucun nettoyage exécuté |

Les autres scripts privés `.mjs` et `.ps1` à la racine du laboratoire ont été
examinés pour `unlink`, `rmSync`, `Remove-Item`, `dropdb`, `DROP DATABASE`, `deleteMany`
et les mécanismes de rétention. Ce relevé n'est pas un audit de tous les logiciels
Windows. Les commandes historiques `db:reset`, les migrations destructives anciennes
et les seeds du dépôt ne sont pas autorisés : ils ne font pas partie du lancement.

Les suites d'intégration isolées peuvent contenir un nettoyage de leurs propres
identifiants factices dans `creorga_tests` : cela ne constitue **ni** un mécanisme
de rétention de sauvegardes **ni** une autorisation de nettoyer le laboratoire.
Les nouvelles fixtures des tests de rétention et restauration sont conservées.

## 27 copies récupérées : preuves et limites

L'index de récupération du lot précédent reste intact. Le nouvel inventaire doit
relier chaque fichier récupéré à son ZIP source, son entrée `database/`, le manifeste,
sa taille et son empreinte SHA-256. Il ne doit lire ni publier les lignes métier,
comptes, secrets, pièces jointes ou le contenu des dumps.

Les dates apparaissant dans les noms ne prouvent pas l'heure des données contenues.
L'inventaire distingue le libellé horaire local sans fuseau, le timestamp numérique
du nom, les déclarations `startedAt`/`completedAt` du manifeste et la date du contrôle.
Ces sources viennent du logiciel et de son horloge ; elles ne sont pas des horodatages
qualifiés indépendants. Un dump PostgreSQL est un instantané distinct du scan des
fichiers : arrêter les écrivains est nécessaire pour une copie commune cohérente.

Deux suppressions de rotation avaient été observées dans les journaux du 16 octobre,
sans noms de fichiers. Retrouver 27 dumps absents dans des ZIP ne permet pas d'attribuer
avec certitude deux de ces fichiers à ces deux événements. Cette incertitude ne doit
pas être effacée par la disponibilité d'autres copies. Les archives originales hors
laboratoire ne sont pas concernées par ces événements.

Nouveau contrôle exécuté : **27/27 fichiers vérifiés**, **30 025 952 octets**.
Le registre public exact relatif (fichier, taille, SHA-256, ZIP source, empreinte du
ZIP, empreinte de l'entrée et du manifeste) est dans
[`preuves/sauvegardes-inventaire-recupere-2026-10-17.json`](preuves/sauvegardes-inventaire-recupere-2026-10-17.json).
L'index d'origine n'a été ni réécrit ni remplacé. Les dumps et ZIP sources restent
intacts. Aucune extraction ni connexion à une base n'est effectuée par cet outil.

| Origine de la période | Premier | Dernier |
|---|---|---|
| Libellé de nom, fuseau absent du libellé | 16 octobre 2026, 16:34 | 16 octobre 2026, 20:31 |
| Epoch numérique du nom, représenté en UTC | 2026-10-16T14:34:46.128Z | 2026-10-16T18:31:51.441Z |
| `startedAt` déclaré par le manifeste, UTC | 2026-10-16T14:34:46.128Z | 2026-10-16T18:31:51.441Z |
| `completedAt` déclaré par le manifeste, UTC | 2026-10-16T14:34:46.399Z | 2026-10-16T18:31:51.974Z |

Les libellés sont cohérents avec Europe/Luxembourg à ces instants, mais ils ne sont
pas promus en preuve d'heure du contenu. Les 27 états de base n'ont **pas** chacun
été restaurés ; seules leurs signatures/empreintes et leur provenance sont validées.

## Reprise et coût de conservation

Ne pas restaurer sur la base source. Utiliser une nouvelle base et une nouvelle
extraction exclusive ; vérifier JSON, manifeste, signatures, SHA-256, lignes, totaux,
relations et PDF. Conserver les copies originales et les clés séparées. Les rapports
détaillés de restauration contiennent les emplacements privés des extractions et
ressources conservées : seuls leurs résultats expurgés peuvent être publiés.

Le gel augmente la consommation disque : dumps bruts, ZIP, partiels en échec, copies
Docker, extractions et bases restaurées s'additionnent. Il ne faut ni en déduire une
taille stable ni supposer un nombre maximum de générations. Surveiller l'espace,
alerter et faire examiner les coûts avant épuisement ; ne jamais déclencher une
purge de secours pour permettre un encaissement. Le calendrier reste un premier
snapshot après 60 secondes puis toutes les 6 heures ; cela ne prouve ni un RPO de
6 heures en présence d'échecs, ni un RTO opérationnel.

La publication exclusive garde également le lien `.partial` d'un ZIP **réussi** :
sur NTFS il pointe sur le même fichier que le `.zip`, sans seconde copie des octets.
Il peut donc apparaître deux fois dans un inventaire de tailles logiques ; ne pas
additionner ces tailles comme une consommation physique indépendante. Un `.partial`
seul n'est jamais annoncé complet. Si le système de fichiers ne supporte pas les
liens physiques, la publication échoue honnêtement et garde le partiel. Cette
capacité doit être qualifiée pour tout autre support de sauvegarde. Les sorties
vides de `pg_dump` échoué restent aussi conservées et ne passent pas les contrôles
de taille/signature : leur présence n'est pas une sauvegarde validée.

Les lectures d'intégrité utilisent des flux, mais un gros ZIP comporte aussi un
manifeste en mémoire (limité à 16 Mio dans le worker). L'outil d'inventaire limité
aux 27 dumps doit borner ses lectures et traiter les archives séquentiellement.
Le gel n'augmente pas délibérément la fréquence des tâches de sauvegarde.

## Recette du lot

Tests RED observés avant correction : conservation des anciens ZIP et dumps en
profil complet, refus d'opt-in par environnement, partiels conservés, copie Docker,
conservation base/extraction de restauration et gel créateur. Les appels Docker
sont simulés ; aucune commande Docker réelle ni purge de données privées exécutée.
Les répertoires des tests sont nouveaux, exclusifs et ne ciblent pas les archives.

Commandes de reproduction non destructives :

```powershell
# Depuis le dépôt, vers un NOUVEAU rapport (refus de remplacer un fichier).
node scripts/local/backup-recovery-inventory.mjs ../local-2.0 recovered-rotation-dumps-C1dMfu ../local-2.0/nouvel-inventaire-recupere.json
node --test tests/local/backup-recovery-inventory.test.mjs
# Depuis apps/backend : fixtures factices, aucun Docker réel.
node ../../node_modules/vitest/vitest.mjs run src/jobs/pg-dump.test.ts src/jobs/backup-worker.retention.test.ts src/jobs/pg-dump-preservation.test.ts src/jobs/verifier-restauration.test.ts src/jobs/creator-retention.test.ts src/lib/runtime-profile.test.ts
```

Les quatre tests de l'outil d'inventaire sont passés après quatre RED effectifs :
provenance complète, dump altéré refusé, manifeste incohérent refusé, traversée et
doublon refusés. Les tests de collisions ont reproduit deux remplacements possibles
dans des fixtures, puis passent après publication exclusive. Les commandes de
prestataire Docker restent simulées ; aucune commande Docker réelle de purge lancée.
Le dernier passage ciblé comprend **38 tests PASS dans six fichiers**. Une quatrième
garde anti-écrasement réserve aussi le répertoire distant d'une vérification de
restauration avant `docker cp` : un ancien dump de contrôle ne peut pas être remplacé
avant que `createdb` ait l'occasion de détecter un nom déjà pris.

La suite backend générale a également été lancée pendant les corrections parallèles
du lot ; son résultat final et la restauration réelle sur nouvelle base sont
consignés dans les preuves globales. Une simulation ne vaut pas une restauration
PostgreSQL, ni une validation des 27 états de données historiques.
