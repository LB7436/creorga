# Performance du profil métier — mesures du lot fiabilité

Actualisation18octobre L3 en fin de document : trois mesures CPU/RAM du seul
runtime, pas un nouveau benchmark avant/après ni une optimisation du p95salle.
Les séries du17octobre ci-dessous restent historiques.

Mesures du 17 octobre 2026, avant à 10:02 et après à 10:21, heure Europe/Luxembourg.
Ce sont des séries courtes de laboratoire, **pas** une qualification de service
multiclient ni une promesse de consommation. Les sources primaires privées sont
conservées ; le [rendu expurgé](preuves/performance-fiabilite-2026-10-17.json)
contient les unités, dates, protocole et limites des deux séries.

## Salle : même jeu, mêmes instruments

Le jeu de projection est identique : **737 produits, 275 tables, 645 couverts,
1 225 lignes**, avec la même empreinte de données
`dca4233b7de0fe5a934ff4440343106b2ac436aabf95439e87e347277be8828a`.
Machine : Windows 10.0.26200, Ryzen 5 7600X, Node 22.19.0, réseau loopback.
Quatre échauffements puis dix sauvegardes graphiques confirmées de toute la salle.
Instrumentation active dans les deux séries : événements SQL Prisma, profileur CPU
à 1 ms et durées des opérations de fichiers. Les jobs essentiels restent actifs.

| Mesure sur la fenêtre instrumentée | Avant | Après |
|---|---:|---:|
| Requêtes SQL observées, total | 1 341 | 503 |
| Lectures `OrderTender`, total | 720 | 20 |
| p95 HTTP + JSON, ms | 2 267,32 | 2 208,57 |
| Temps SQL cumulé observé, ms | 2 318 | 2 438 |
| Lectures `FloorWorkspace`, total | 10 | 10 |
| Écritures `FloorWorkspace`, total | 10 | 10 |
| Écritures `FloorChange`, total | 10 | 10 |
| Appels `fsyncSync`, total | 40 | 40 |

Les lectures redondantes ont été réduites, mais **le temps mural reste voisin de
2,2 secondes**. La différence de p95 observée est seulement 58,75 ms sur dix essais ;
elle ne démontre pas un gain stable en exploitation. Le temps SQL cumulé n'a pas
baissé. Le p95 sur un échantillon de dix points reste un indicateur très grossier.
Les compteurs incluent les opérations essentielles visibles pendant cette fenêtre,
pas une mesure isolée de charge CPU de PostgreSQL par requête.

Changements limités et vérifiés par les tests du lot :

- lecture groupée des affectations, avec calculs historiques et provenance conservés ;
- lecture chaude du plan sans retransporter `initialSnapshot`, toujours conservé en base ;
- une projection avant mutation partagée par les validations d'une même requête,
  puis une projection fraîche après la mutation, sans cache global entre sociétés.

Ni transaction, ni verrou, contrôle de révision, journal financier ou `fsync` n'ont
été retirés pour obtenir ces mesures. Les profils CPU montrent encore du temps
dans le JSON, les empreintes canoniques, les copies mémoire, `safeWriteJson` et la
projection/réponse de salle. Cela indique une prochaine investigation, pas une
autorisation de supprimer les garanties de durabilité ou le cliché historique.

## Ouverture des écrans

Chrome neuf 155.0.8059.80, même jeu fictif, deux échauffements et cinq navigations par
écran. Mesure jusqu'à un titre/contrôle visible, **pas** jusqu'à validation de toutes
les données. Le p95 de ces cinq points correspond ici au maximum observé.

| Écran | Médiane avant, ms | Médiane après, ms | p95 avant, ms | p95 après, ms |
|---|---:|---:|---:|---:|
| Configuration portail | 109,02 | 102,31 | 111,24 | 110,80 |
| Modules | 109,71 | 85,75 | 1 227,61 | 1 243,48 |
| Planning | 84,82 | 84,91 | 89,78 | 437,33 |
| Menu QR | 107,54 | 108,34 | 108,47 | 122,50 |
| Connexion POS | 33,94 | 32,79 | 37,49 | 37,57 |

Aucune erreur JavaScript collectée dans ces deux séries. Les p95 modules, planning,
QR et connexion POS ne s'améliorent pas tous ; le point planning élevé ne doit pas
être caché derrière les médianes. Ce protocole ne qualifie ni une connexion caisse
complète, ni une requête métier, ni toutes les combinaisons de rôle et de société.

## Ressources observées au repos

Onze échantillons par série ; cohorte des services possédés par le profil, leurs
descendants, PostgreSQL local et le Chrome neuf explicitement suivi. Les autres
logiciels Windows n'ont pas été arrêtés.

| Mesure | Avant | Après |
|---|---:|---:|
| Somme des working sets, MiB | 1 956,38 | 1 719,52 |
| Mémoire privée engagée, MiB | 1 563,02 | 1 365,18 |
| Processus suivis, min–max | 28–28 | 25–29 |
| CPU normalisé, moyenne observée, % | 0 | 0 |
| Somme des moteurs GPU suivis, moyenne observée, % | 0 | 0 |
| VRAM dédiée exposée, MiB | 137,55 | 135,97 |
| Mémoire GPU partagée, MiB | 6,51 | 6,96 |

La somme des working sets compte potentiellement plusieurs fois les pages partagées.
La mémoire privée engagée n'est pas la RAM physique résidente. Les pools, le GC,
Chrome et le cache système varient : ces deux observations ne prouvent pas une
réduction causale et reproductible de mémoire imputable au code du lot. CPU/GPU à
zéro peut être sous la résolution de l'échantillonnage ; cela ne signifie pas absence
de travail ou consommation électrique nulle. La somme GPU n'est pas un pourcentage
global normalisé. Aucun wattmètre, aucune conversion en watts, kWh ou euros.

## Démarrage : observations non causales

Le relevé primaire avant présent sur disque indique **2 190 ms**, API et base prêtes,
PostgreSQL déjà démarré et cache chaud, à 10:06:06. Le relevé après conservé indique
**2 142 ms** à 10:24:41, également avec PostgreSQL déjà démarré et cache chaud.
L'instrumentation et le contrôle privé ne sont
pas identiques ; une seule relance par série n'est pas une comparaison contrôlée.
**Aucun gain de démarrage n'est annoncé.** Aucun temps de démarrage à froid confirmé
ne doit être reconstruit depuis une estimation ou un compte rendu ancien.

## Poursuite recommandée

Maintenir le même jeu et protocole, étendre le nombre de répétitions et isoler le
coût des projections/empreintes/réponses volumineuses. Ajouter ensuite une charge
multi-postes documentée et des conflits réalistes. Toute nouvelle optimisation doit
garder ses tests de concurrence, isolation, montants et reprise, et comparer les
résultats sur données identiques. Ni ce tableau ni un nombre de tests unitaires ne
permettent d'annoncer CréOrga prêt pour la production.
## Mesure complémentaire F18-L3 —18octobre, pas un avant/après

Copie25450, profil métier, runtime seul PID25524, fin de recette avec onglets de
test encore ouverts :16:45:32–16:45:47UTC, trois fenêtres5,019/5,041/5,015secondes.
Working set192,05/192,05/192,06MiB, mémoire privée196,33MiB. CPU équivalent cœur
2,179/1,240/0,623%, normalisé machine0,182/0,103/0,052%. PostgreSQL, Chrome et les
anciennes instances préservées ne sont pas inclus dans cette attribution.

Ce prélèvement court n'est pas une baseline de charge ni une preuve d'économie.
Aucun gain avant/après, p95salle/POS/QR, GPU/VRAM, watt ou euro n'en est déduit.
Les anciens p95 restent historiques, pas remesurés par cette fenêtre. Aucune
nouvelle optimisation des transactions, projections ou contrôles CAS n'est livrée
sur cette seule base. Le démarrage/redémarrage et les trois arrêts de la même
copie sont horodatés séparément dans le journal, sans durée active artificielle.

Compatibilité d'un Node corrigé et portage Rust/Go : non étudiés dans ce lot,
aucun changement global Windows. Garder ces travaux derrière un profil comparable
et la qualification des18parcours. [Rapport L3](F18-REPRISE-INDEPENDANTE-2026-10-18.md).
