# Sauvegardes et reprise — mission maître du 17 octobre 2026

**Campagne NON LIVRÉE.** Revue documentaire et d'octets en lecture seule, réalisée
après la référence de reprise transmise `475f67a`. Aucun contrôle Git, démarrage,
arrêt, accès API/Chrome, connexion SQL ou restauration n'a été exécuté dans ce
sous-lot. Ce document n'établit ni le HEAD courant, ni une publication, ni une
qualification de production. Les modifications existantes restent préservées.

Les rapports antérieurs [sauvegardes](SAUVEGARDES-FIABILITE.md) et
[arrêt propre](ARRET-PROPRE-PROFIL-LOCAL.md) restent inchangés. Le présent contrôle
ne remplace pas leurs dates ou leurs limites par des résultats nouveaux supposés.
La règle de vérification avant déclaration de réussite a été appliquée : les
empreintes et présences ci-dessous ont été contrôlées ; les restaurations restent
des exécutions antérieures consignées dans leurs rapports privés.

## 1. Résultat de la vérification actuelle

Entre 18:01 et 18:03 UTC :

- **27/27 dumps récupérés** encore présents et vérifiés : signature `PGDMP`, taille,
  SHA-256, entrée du ZIP source et déclaration du manifeste concordantes.
- **27 ZIP sources** relus et empreintes vérifiées avant/après, sans extraction.
  L'index de récupération est inchangé.
- Les deux préservations du travail contiennent respectivement **80/80** et
  **100/100 fichiers**, plus trois artefacts de statut/patch par copie, conformes
  à leurs manifestes. Leur contenu n'est pas publié.
- Les deux archives des restaurations de cette mission existent, avec les SHA-256
  attendus. Les rapports privés indiquent **81 tables identiques et 24 PDF**
  (14 factures, 10 avoirs), sans différence ; **12 puis 14 fichiers** sont comparés.
  Ces rapports ont été relus, pas les bases interrogées de nouveau.
- Les mécanismes de rétention examinés restent gelés ; aucune purge exécutée,
  autorisée ou réactivée, aucun code modifié dans ce sous-lot.

Preuves publiques nouvelles et expurgées :

- [Registre exact des 27 copies et de leurs ZIP](preuves/sauvegardes-mission-maitre-inventaire-2026-10-17-v1.json).
- [Contrôles des préservations, archives, rapports et gel](preuves/sauvegardes-mission-maitre-verifications-2026-10-17-v1.json).

Le registre a été généré par l'outil existant après lecture de son code. Il lit
uniquement les dumps récupérés, l'index, les entrées `database/` concernées et les
manifestes ; il ne restaure pas les dumps et ne vérifie pas toutes les autres
pièces métier contenues dans ces 27 ZIP. Les rapports privés, fichiers de travail,
patchs, secrets et noms des bases restaurées restent hors des livrables publics.

## 2. 27 copies : couverture temporelle et incident non résolu

Total des dumps : **30 025 952 octets**. Somme des tailles logiques des 27 ZIP
distincts correspondants : **42 690 676 octets**. Ce ne sont pas des mesures de
l'espace physique total occupé par le laboratoire ou par toutes les sauvegardes.

| Source de la date | Premier état déclaré | Dernier état déclaré |
|---|---|---|
| Libellé local du nom, fuseau non encodé | 2026-10-16 16:34 | 2026-10-16 20:31 |
| Epoch numérique du nom, représenté en UTC | 2026-10-16T14:34:46.128Z | 2026-10-16T18:31:51.441Z |
| `startedAt` déclaré dans le manifeste | 2026-10-16T14:34:46.128Z | 2026-10-16T18:31:51.441Z |
| `completedAt` déclaré dans le manifeste | 2026-10-16T14:34:46.399Z | 2026-10-16T18:31:51.974Z |

Ces 27 points ne garantissent pas une couverture continue ni la récupération de
toute transaction entre deux points. Les heures viennent des noms et horloges
applicatives, pas d'un horodatage indépendant du contenu. Les libellés sont
compatibles avec l'heure Europe/Luxembourg à ces instants ; cela ne suffit pas à
prouver l'heure des données.

**Les deux suppressions de dumps observées lors de l'ancien incident restent sans
noms établis.** On ne peut pas attribuer avec certitude deux des 27 copies à ces
deux suppressions. Les 27 copies ne sont pas chacune restaurées ; aucune
« réparation définitive » de l'incident n'est revendiquée. Le gel ne reconstitue
pas un fichier disparu dont la provenance n'est pas connue.

Empreintes du contrôle actuel :

| Objet | Octets | SHA-256 |
|---|---:|---|
| Nouvel inventaire public des 27 copies | 31 212 | `7fee503353e4893e209aebc93a5123c91296168c0ef700ffb1d1f2a0e67c2ebc` |
| Index privé d'origine, conservé intact | non republié | `0a966a2baac58179529017d6d7af2344e9cb1e0aa4131ea09176e511805b1358` |

## 3. Préservation du travail non commité

Les identifiants ci-dessous désignent des copies privées, pas des commits Git ou
des archives publiées sur GitHub. La vérification compare les octets des copies à
leurs propres manifestes, y compris les trois artefacts `status`/patch ; elle ne
compare pas le worktree courant, susceptible d'évoluer pendant la mission.

| Copie privée | Fichiers vérifiés | Octets des fichiers | Octets du manifeste | SHA-256 du manifeste |
|---|---:|---:|---:|---|
| `worktree-preserved-2026-10-17T16-49-29-912Z-dfb2755a` | 80 | 3 624 699 | 18 153 | `18684279242af5b4bec50eb6960f35354981a2550bc78e26c79216aae08efee2` |
| `worktree-preserved-2026-10-17T17-56-18-112Z-b77920fe` | 100 | 4 070 551 | 22 390 | `c2307d06d622dbabef30f2e15577c3206a958e36dced978718920034a4fd0464` |

Les artefacts de statut/patch représentent respectivement 232 191 et 293 262
octets supplémentaires. Les manifestes portent `privateOnly: true` ; seuls les
comptages et empreintes sont reproduits ici. Cela ne prouve pas une restauration
Git complète, l'intégrité de fichiers non déclarés ou une synchronisation distante.

## 4. Restaurations existantes de la mission, vérifiées sur pièces

Les deux archives sources ont été retrouvées et hachées en lecture seule. Leur
identifiant relatif exact est consigné dans la preuve JSON, sans chemin personnel,
secret ou donnée client. Les rapports privés détaillés restent conservés dans le
laboratoire ; les voici identifiés sans publier leur contenu.

| Rapport privé | Exécution UTC consignée | Tables | Fichiers | PDF figés | Durée locale consignée |
|---|---|---:|---:|---:|---:|
| `RESTORATION-2.0-mission-maitre-avant-tests-20261017-1652.json` | 2026-10-17T16:50:50.285Z | 81 | 12 | 24 | 5 463 ms |
| `RESTORATION-2.0-mission-maitre-avant-build-20261017-1957.json` | 2026-10-17T17:57:26.591Z | 81 | 14 | 24 | 9 361 ms |

| Archive source, repère | Octets | SHA-256 |
|---|---:|---|
| Avant tests, nom contenant `1792255845416-85455` | 2 918 700 | `d840f77d28b9574cf002c31066d4860396f7e85f2baa8a6e23860a8dcfe14a37` |
| Avant build, nom contenant `1792259837936-60648` | 2 938 702 | `c6fedfe177d7ad3136981b360580ad96a2059ffac9caa3f41270b03815d4ac7d` |

Les rapports indiquent une comparaison PostgreSQL en lecture seule, loopback,
SHA-256 par ligne canonique puis multiensemble trié, avec **zéro différence** de
tables, colonnes et lignes. Les 14 PDF de factures et 10 PDF d'avoirs figés ont
des données identiques source/restauration, une signature `%PDF-` et aucune
incohérence d'empreinte stockée. Ce nombre de PDF n'est pas le nombre total de
factures : tous les brouillons n'ont pas un PDF émis.

Les deux preuves consignent chiffrement vérifié et clé absente de l'archive. La
nouvelle base restaurée ne remplace pas la source. `mediaStatus: absent` signifie
qu'aucune racine de médias présente n'est qualifiée par ces copies ; il ne faut pas
en déduire la couverture de caméras, vidéos ou d'un disque absent. Les fichiers et
documents présents dans le périmètre déclaré sont seuls couverts.

### Copie cohérente après arrêt versus tâche automatique active

Le coordinateur a consigné l'arrêt normal confirmé à **17:56:26 UTC**, en 685 ms,
avec disparition du processus possédé et libération des ports vérifiées, sans
arrêt forcé. Cette observation n'a pas été répétée dans ce sous-lot de lecture.
La copie avant build, effectuée ensuite, est le point de reprise cohérent retenu
par la mission ; le rapport compare effectivement sa base et ses fichiers.

Cela ne qualifie **pas** une sauvegarde automatique alors que des écrivains
continuent à modifier fichiers et PostgreSQL. Un dump transactionnel PostgreSQL et
un parcours de fichiers séparé ne garantissent pas, à eux seuls, le même instant
métier. Aucun test d'une vraie sauvegarde en vol lors de l'arrêt, panne électrique
ou reprise après coupure brutale n'est ajouté ici. L'arrêt après abandon HTTP
ancien et ses limites ne sont pas effacés par cette copie réussie.

## 5. Gel des rétentions confirmé à la lecture du code

La lecture des sources courantes confirme le verrou du lot précédent :

- `runtime-profile.ts` : `pruneBackups: false` et `creatorRetention: false`, quel
  que soit le profil ; repasser au profil complet n'autorise pas une purge.
- `prunePgDumps` : compatibilité sans effet, sans scan ni suppression.
- Rétention créateur : aucun minuteur et purge directe sans effet.
- Worker ZIP : publication exclusive, ancien ZIP non remplacé ; `.partial` et
  échecs conservés. Les dumps de travail ne sont pas effacés automatiquement.
- Vérification de restauration : extraction, nouvelle base et dump de contrôle
  conservés, réussite comme échec ; aucun `dropdb` ou nettoyage final automatique.

Les empreintes exactes des six sources lues sont dans la preuve JSON. Il s'agit
d'une inspection, **pas d'un nouveau passage des tests** ni d'un audit de tous les
logiciels Windows. Aucune variable d'environnement n'est présentée comme un moyen
de lever le gel. Les anciennes politiques restent des propositions historiques.

Toute levée future demande cumulativement une politique datée documentée et
approuvée, sa recette et une restauration vérifiée des générations conservées,
puis une autorisation humaine explicite des candidats exacts et de leurs
empreintes. Le mécanisme de levée n'est pas implémenté ; aucune purge n'est
autorisée dans cette mission, même pour libérer de l'espace de laboratoire.

## 6. Reprise, coût et décisions encore nécessaires

**RPO et RTO restent à convenir avec le propriétaire.** Les durées ci-dessus
correspondent à des copies locales sur environnement déjà disponible, avec cache
chaud. Elles ne comprennent pas nécessairement diagnostic, remplacement matériel,
récupération externe, installation, réimport et validation par le personnel.
Le calendrier de sauvegarde ne garantit pas le RPO en cas d'échec silencieux ou de
copie incohérente ; aucune durée opérationnelle n'est promise.

Les copies brutes, ZIP, dumps de travail, `.partial`, extractions, bases de contrôle
et préservations de code restent présents. Le coût disque augmente sans politique
de rétention exécutée. Sur NTFS, un ZIP publié et son lien `.partial` réussi
peuvent désigner les mêmes octets : leur somme logique n'est pas une mesure
d'espace physique. Il faut surveiller la capacité et signaler un risque avant
saturation, sans purge automatique de secours. Aucune projection de watts, kWh ou
coût énergétique n'est faite.

Prochaines étapes proposées, **non exécutées** dans ce sous-lot :

1. Conserver le point cohérent avant build et ses clés séparées ; reprendre, si
   nécessaire, dans une autre nouvelle base, jamais par remplacement de la source.
2. Faire définir perte maximale acceptable, délai de reprise et copie externe
   chiffrée ; mesurer une reprise opérationnelle selon ce périmètre accepté.
3. Qualifier séparément les sauvegardes en présence d'écritures et l'arrêt pendant
   une sauvegarde en vol, avec données fictives, sans toucher aux archives d'origine.
4. Documenter puis simuler les futurs candidats de rétention, sans suppression,
   et obtenir l'autorisation spécifique avant toute éventuelle implémentation.

## 7. Reproduction du seul contrôle exécuté ici

Depuis le dépôt ; choisir impérativement un **nouveau** nom de sortie. L'outil
refuse de remplacer un rapport et n'effectue ni extraction, ni SQL, ni purge :

```powershell
node scripts/local/backup-recovery-inventory.mjs ../local-2.0 recovered-rotation-dumps-C1dMfu docs/2.0/preuves/sauvegardes-mission-maitre-inventaire-2026-10-17-v1.json
```

Le fichier ci-dessus existe maintenant : ne pas le remplacer pour une nouvelle
mesure. Les autres vérifications ont consisté à lire/hacher les deux manifestes,
leurs fichiers déclarés et artefacts, les deux ZIP de restauration, les deux
rapports privés et les sources indiquées. Aucune suite applicative relancée,
aucune restauration créée, aucun test bancaire/matériel, commit ou purge exécuté.

## 8. Complément du 17 octobre, 21:03 Europe/Luxembourg — avant rejeu

**La campagne reste NON LIVRÉE.** Ce complément conserve les points précédents et
leurs preuves ; il ne transforme pas la lecture d'un rapport en nouvelle
restauration exécutée par cet agent. Aucun accès SQL, réseau, API, UI, runtime ou
Git n'a été fait. Aucune archive extraite ou modifiée, aucun code changé.

Le coordinateur a exécuté une nouvelle restauration, consignée dans le rapport
privé `RESTORATION-2.0-mission-maitre-avant-rejeu-20261017-2100.json`, à
**19:00:19.780 UTC, soit 21:00:19.780 Europe/Luxembourg**. La relecture de ce rapport
confirme **81 tables identiques, zéro différence, 14 fichiers et 26 PDF figés** :
**15 factures et 11 avoirs**, sans en-tête PDF invalide ni empreinte stockée
discordante. Les manifestes de tables source et restaurée concordent exactement.
Le rapport consigne la lecture seule, AES-GCM vérifié et une clé séparée de
l'archive. `mediaStatus: absent` conserve les limites de couverture des médias.

La durée consignée est **11 441 ms sur laboratoire chaud**, pas un RTO
opérationnel. Ni le RPO ni le RTO ne sont encore convenus. Le nouveau contrôle
indépendant s'est limité à relire ce rapport, vérifier les fichiers déclarés et
recalculer les empreintes de l'archive et de la préservation du travail :

| Objet vérifié en lecture seule | Octets | SHA-256 |
|---|---:|---|
| Rapport privé avant rejeu | 49 294 | `a61841db7f40153aefa726eaf9d1733b39345f69deba418f43d7a6473f0782f0` |
| ZIP avant rejeu, repère `1792263609213-1113` | 2 985 046 | `1e135e59de6299cdcd48a95fce551892670261bb64c28132c4af93ecc3bcf1c7` |
| Manifeste du ZIP | 3 468 | `d8ce93572212be76edadec7d00e45719ff6ee3ce6bbc14d4bdafab9e35226652` |
| Manifeste de la copie privée des 112 fichiers | 25 094 | `2466d436d0882c8929c61d9a3d97d28e74ac67b5058d9f7463a26ad54b13e685` |

Les **14 fichiers métier**, soit **22 994 110 octets non compressés**, concordent
avec leurs tailles et SHA-256 dans le manifeste, dans les entrées du ZIP et dans
l'entrée de sauvegarde préparée déjà présente. Les entrées ont été lues en flux,
sans extraction, sans publier leurs noms ou leur contenu. L'empreinte du ZIP est
toujours identique après ces lectures. Ce contrôle ne compare pas des données
vivantes ultérieures et ne restaure pas son dump PostgreSQL une seconde fois.

La préservation privée
`worktree-preserved-2026-10-17T19-00-20-256Z-9d7a7693`, créée à 19:00:21.740 UTC,
contient **112/112 fichiers vérifiés**, totalisant **4 955 856 octets**, plus les
trois artefacts de statut/patch (**309 592 octets**) conformes à leurs empreintes.
Elle ne prouve pas le statut Git courant ou une publication distante. Les copies
précédentes de 80 et 100 fichiers restent conservées.

L'arrêt normal de 18:59:49–50 UTC, en **778 ms**, avec identité du processus
possédé, disparition du processus et absence d'écoutes métier vérifiées, sans
arrêt forcé, est une observation consignée par le coordinateur, **non répétée**
dans ce contrôle documentaire. La copie fixe obtenue ensuite ne qualifie toujours
pas un job automatique avec écrivains actifs, une panne électrique ou une
restauration de catastrophe externe.

Les 27 dumps récupérés et leurs points antérieurs restent gelés : pas de nouvelle
rétention, pas de suppression et pas de réattribution des deux anciens dumps aux
noms inconnus. Ils n'ont pas été réinventoriés dans ce seul complément. **Les
écritures futures après reconstruction, redémarrage ou rejeu ne sont pas couvertes
par la copie de 21 h.** Le service continu de cinq heures et T100 ne sont pas
qualifiés par ces vérifications.

[Nouvelle preuve publique expurgée du point avant rejeu](preuves/sauvegardes-mission-maitre-avant-rejeu-2100-verifications-2026-10-17-v1.json).

## 9. Complément final de reprise — 17 octobre, 21:33 Europe/Luxembourg

Le point **après les rejeux** est consigné par le coordinateur à
**19:31:36.908 UTC (21:31:36.908 Europe/Luxembourg)**, dans le rapport privé
`RESTORATION-2.0-mission-maitre-fin-rejeux-20261017-2132-v1.json`. La campagne reste
**NON LIVRÉE** : « final » désigne ici ce point de reprise, pas une qualification
de production ou la fin de T100.

La relecture indépendante de la preuve donne exactement : **81 tables,
10 083 lignes, 14 fichiers et 26 PDF figés (15 factures, 11 avoirs)**.
Les 81 couples d'empreintes de colonnes et de multiensembles de lignes sont
présents et identiques entre source et restauration, avec **zéro différence**.
Les contrôles PDF consignés n'ont aucune empreinte stockée discordante, signature
invalide ou donnée binaire absente. Cela relit la comparaison exécutée par le
coordinateur, sans nouvelle connexion SQL ni lecture des données d'origine.

| Objet de la nouvelle preuve | Octets | SHA-256 |
|---|---:|---|
| Rapport privé après rejeux | 49 293 | `f68122913050418e76ef78b70ddaa6a6f86c7951c86f2d317163e1d8657a6baa` |
| ZIP de copie, repère `1792265492042-70485` | 2 992 945 | `372728371f2f262541e5bf3151555b1b2c3be62e3a13cf81db10f6be7fc92d48` |
| Manifeste du ZIP | 3 467 | `70fb5960121c76c7c1455631bd503546c86ad10f6782b2b2c5a94ffbb64263fa` |

Les **14 entrées métier** du ZIP et les fichiers déjà préparés dans sa copie
de sauvegarde concordent avec les tailles et SHA-256 déclarés : **22 985 550
octets non compressés**. Le ZIP est resté identique après les lectures. Aucun
fichier extrait, aucun runtime ou original d'exploitation lu, aucune archive
protégée modifiée ; ni arrêt, purge, accès API/réseau/UI ou commande Git exécuté
par ce contrôle. La copie chiffrée AES-GCM et la clé séparée sont vérifiées dans
le rapport privé, pas déchiffrées de nouveau ici. `mediaStatus: absent` conserve
la limite de couverture déjà décrite.

La durée de restauration consignée est **5 342 ms, cache chaud**, non un RTO.
Le coordinateur a également consigné l'arrêt normal, sans force : fenêtre de
constats **19:31:17.257–19:31:18.468 UTC**, compteur interne d'arrêt **406 ms**,
processus possédé absent et zéro écoute métier sur les cinq ports contrôlés.
Ces horodatages de constats couvrent 1 211 ms et ne sont pas le même compteur
que les 406 ms internes. Aucune de ces observations n'a été répétée ici et
aucune ne constitue un objectif de reprise opérationnel.

La dernière préservation de travail connue et vérifiée reste celle des **112
fichiers à 21 h**, dont le manifeste est
`2466d436d0882c8929c61d9a3d97d28e74ac67b5058d9f7463a26ad54b13e685`.
**Elle précède les derniers documents et annotations** : elle n'est pas une
preuve de conservation intégrale de l'état final ou de publication Git. Aucune
nouvelle préservation n'a été lancée pendant les écritures des agents ; les
anciens points de reprise restent conservés.

Le gel des suppressions n'est pas rouvert. L'incertitude sur les deux anciens
dumps supprimés sans noms établis reste visible. Le RPO/RTO, cinq heures de
service continu, T100 complet, les essais matériels et prestataires réels ne
sont pas qualifiés par ce point. Toute écriture postérieure restera hors de
cette copie fixe, même si elle est produite par un rejeu autorisé.

[Preuve finale expurgée, contrôle de copies et de rapport uniquement](preuves/sauvegardes-mission-maitre-final-2132-v1.json).
