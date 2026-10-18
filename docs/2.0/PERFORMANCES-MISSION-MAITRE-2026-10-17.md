# Performance — mission maître, 17 octobre 2026

## Observations nouvelles du18octobre, non benchmark causal

11échantillons au repos par phase : working sets moyens1438,43→1327,90MiB,
processus31→23, CPU normalisé arrondi0%, somme moteursGPU0, allocationGPU dédiée
118,24MiB. Profils/services+descendants+PG, Chrome non inclus ; nombre d'onglets
différent et redémarrage/cache chaud : **pas de gain attribué aux jeux ou à une
correction, aucune conversion en watts/euros**. Pages partagées potentiellement
comptées plusieurs fois.

Même table Café sauvegardée inchangée par UI avant/après :35,6et29,8ms HTTP,
**un échantillon chacune**, pasp95. Les35,6ms précèdent la compilation finale,
les29,8ms suivent son redémarrage. Ce n'est pas comparable à l'ancien lot2,42sp95.
Charge concurrente/profilSQL prolongé et latences exhaustives des modules NOTRUN.
Builds finaux métier103,514s/complet87,365s,5applications chacun ; le premier partage
une partie de sa fenêtre avec les intégrationsPG, donc pas de comparaison causale
avec les63,897s/64,297s antérieurs. Ce ne sont pas les temps d'ouverture des écrans.
Deux relances officielles finales cache chaud3,127s/3,404s, puis deux arrêts confirmés
avec trois onglets ouverts, PID absents et ports libres. Le2,335s antérieur reste
historique ; aucun RTO promis, abandon HTTP incertain toujours non qualifié.
[Preuves](preuves/droits-robi-validation-2026-10-18.json),
[rapport/Node portable/Rust-Go](DROITS-FINS-ROBI-RECETTE-2026-10-18.md).

Campagne **NON LIVRÉE**. Ce rapport sépare les séries historiques, observations
opérationnelles et mesures non exécutées. Pas de nouveau gain énergétique,
de débit garanti, de p99 inventé ou de benchmark de langage.

## 1. Comparaison historique conservée

Source : [preuve du lot fiabilité](preuves/performance-fiabilite-2026-10-17.json),
mesurée avant cette campagne. Jeu documenté : **737 produits, 275 tables,
645 couverts, 1 225 lignes** ; empreinte enregistrée dans l'artefact.

| Mesure | Avant | Après | Portée exacte |
| --- | --- | --- | --- |
| Sauvegarde de salle, p95 de série | 2 267,32 ms | 2 208,57 ms | Dix observations par série après échauffement ; échantillon court, pas une amélioration de latence démontrée à l'échelle d'un service |
| Requêtes SQL cumulées de série | 1 341 | 503 | Diminution mesurée sur ce jeu et ce code ; pas 503 requêtes par action, ni nouveau profil de la mission maître |
| Somme des working sets suivis | 1 956,38 MiB | 1 719,52 MiB | Onze échantillons ; mémoire partagée non dédupliquée et autres applications actives ; pas une mesure de RAM physique libérée |
| Démarrage indiqué | 2 190 ms | 2 142 ms | Conditions non causalement comparables selon l'artefact ; aucun gain revendiqué |

Ne pas fusionner ces chiffres avec ceux d'anciens lots « jeux retirés » ou avec
une observation du laboratoire différent. La réduction des requêtes ne justifie
pas le retrait de transactions, fsync, contrôles de version ou réservations.

## 2. Observations réellement obtenues pendant la reprise

- Le coordinateur a relevé séparément cinq échantillons de processus métier :
  somme de working sets **589,39 MiB / 17 processus suivis**. Navigateur exclu,
  mesure non appariée à une version précédente ; CPU arrondi à zéro peut être
  sous la résolution, pas « consommation nulle ». Le relevé est décrit dans le
  checkpoint de 20:48, pas transformé ici en nouvelle série avant/après.
- Démarrage normal du runtime 23808 : **3 261 ms** à 19:15:20 UTC, PostgreSQL
  déjà actif et caches chauds. Ce n'est pas un démarrage de Windows ou un SLA.
- Arrêt normal final : contrôle 19:31:17.257 → 19:31:18.468 UTC (environ 1 211 ms),
  dont **406 ms** au compteur interne du script. Cinq ports libres/PID absent,
  aucune terminaison forcée. Ne pas confondre le compteur et toute la fenêtre.
- Compilations réussies finales : profil métier **90 289 ms**, profil complet
  **79 006 ms**, exécutés successivement. Les compilations précédentes échouées
  restent conservées ; aucune comparaison de performance causale entre profils.
- Restauration finale : **5 342 ms** sur cache chaud, 81 tables/10 083 lignes,
  14 fichiers/26 PDF égaux ; inclut les vérifications de copie chiffrée. Ce n'est
  ni le RTO d'une panne électrique ni une mesure sur disque froid.

[Validation finale](preuves/intensive-validation-finale-2026-10-17-2135-v3.json),
[restauration contre-vérifiée](preuves/sauvegardes-mission-maitre-final-2132-v1.json).

## 3. Ce qui reste non mesuré / non qualifié

Pas de nouvelle campagne appariée de latence HTTP p50/p95/p99 sur le code final,
pas de service continu multiétablissements, test de saturation multi-processus,
profil d'allocation mémoire prolongé ou comparaison Go/Rust/Python exécutée.
Le journal mesure des durées d'outils : elles ne sont ni l'INP des écrans, ni le
temps actif du testeur, ni une baseline HTTP. Les écritures/sélections de salle
restent une cible de profilage, pas une optimisation déclarée acquise.

GPU/VRAM et consommation électrique : pas de série appariée qualifiée et pas
de wattmètre. Aucune conversion RAM/CPU → watts, kWh ou euros. Aucun logiciel
tiers Windows n'a été arrêté/désinstallé pour fabriquer une baisse de charge.

## 4. Prochain protocole sûr

1. Reprendre une copie distincte du dernier point de restauration, conserver les
   données et préciser versions Windows/Node/PostgreSQL, appareils et processus actifs.
2. Vérifier même empreinte de jeu et mêmes opérations ; séparer écriture durable,
   projection, transfert réseau et rendu UI dans les traces.
3. Faire échauffement puis séries suffisamment longues, alternées et répétées,
   incluant erreurs/conflits ; publier distributions et effectifs avant les percentiles.
4. Profiler requêtes/verrous/sérialisation et CPU/RAM/disque. Ne retirer une opération
   qu'après preuve de redondance, non-régression d'intégrité et nouvelle mesure appariée.
5. Conserver les préconditions, résultats bruts privés et empreintes des exports.
   Ne pas choisir une migration de langage pour un avantage purement théorique.
