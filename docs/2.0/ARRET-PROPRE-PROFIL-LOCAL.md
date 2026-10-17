# Arrêt propre des profils locaux — contrat backend

Lot de fiabilité du 17 octobre 2026. Ce document décrit le raccordement backend et
ses tests hermétiques ; le contrôle Windows et son essai sur l'installation sont
qualifiés séparément dans les preuves globales. Aucun endpoint HTTP d'arrêt ajouté.

## Périmètre et interface

`apps/backend/src/index.ts` exporte :

- `backendReady: Promise<void>` : écoute HTTP démarrée, ou échec de démarrage ;
- `shutdownBackend(): Promise<void>` : arrêt coordonné, idempotent pour une demande
  admise ; les appels simultanés attendent la même opération.

L'arrêt est qualifié pour `CREORGA_BUSINESS_ONLY=true` et pour le profil complet
**local avec** `CREORGA_BACKGROUND_MODE=essential`. Le lanceur local applique ce
dernier réglage aux deux profils. Le profil complet non-essential peut démarrer
des anciens workers stock/métriques/opportunités non suivis : la demande d'arrêt
est alors **refusée avant toute fermeture**. Une telle configuration ne doit pas
recevoir une confirmation « arrêté proprement ».

Le contrôleur privé du runtime appelle cette fonction. Aucun secret de contrôle
ne doit apparaître dans une URL, une API publique ou une commande publiée. Ce
contrat ne modifie pas le code des jeux ni la possibilité de relancer le profil
complet dans un **nouveau processus**.

## Ordre et garanties

1. Vérifier le profil avant d'agir ; poser l'état d'arrêt, geler les nouvelles
   tâches et arrêter les minuteurs email, notifications de paiement, sauvegarde
   et surveillance non destructive des salles.
2. Refuser les nouvelles entrées métier sur une ancienne connexion keep-alive
   (`503 BACKEND_STOPPING`, connexion close), fermer Socket.IO et cesser l'écoute
   HTTP. Une requête déjà admise n'est pas interrompue ; le serveur attend sa
   réponse. Cela ne prouve pas que le navigateur a effectivement lu cette réponse :
   les références idempotentes et la reprise restent nécessaires.
3. Attendre les tâches email et notifications déjà admises, et toutes les
   sauvegardes déjà commencées. Un envoi durablement enregistré mais pas encore
   commencé reste `QUEUED` pour le prochain démarrage ; il n'est ni envoyé de force
   ni déclaré reçu à l'arrêt. Une sauvegarde partielle est conservée, pas effacée.
4. Écrire le journal JSON et confirmer son `fsync`. Un échec garde l'état dirty
   réessayable et refuse un résultat d'arrêt réussi.
5. Attendre le `createMany` d'événements Prisma, y compris un vidage déjà en cours
   et les lignes ajoutées pendant ce vidage. Annuler son minuteur et refuser un
   succès si la base ne confirme pas le journal.
6. Déconnecter Prisma en dernier. Le runtime pourra ensuite fermer ses serveurs
   statiques et son contrôle privé, puis laisser le processus terminer naturellement.

Aucun `process.exit()` d'arrêt, délai suivi d'un kill, purge, reset ou nouveau
traitement métier n'est ajouté. Un traitement qui ne finit pas reste en cours :
ce n'est pas un arrêt confirmé. Une erreur de drainage, de fichier ou de base est
renvoyée, pas transformée en réussite. Le contrôleur ne doit pas utiliser la
disparition de la page comme preuve d'arrêt propre.

L'ancien branchement `SIGTERM`/`beforeExit` de l'event sink n'est plus utilisé dans
l'entrée serveur : il lançait un simple flush non attendu. Les signaux pris en
charge par Node appellent maintenant le même arrêt coordonné. Sous Windows,
TerminateProcess et une panne électrique ne deviennent pas un arrêt propre grâce
à un gestionnaire de signaux ; le contrôle privé et la reprise après incident
restent indispensables.

## Tests exécutés sur le backend

Tests RED observés puis GREEN :

- vrai serveur HTTP loopback et Socket.IO éphémères : requête fictive retenue avant
  commit/réponse, arrêt simultané, tâche de fond retenue, déconnexion uniquement après
  réponse, tâche et audit ;
- appel répété, refus préalable d'une configuration non qualifiée, erreur de flush
  qui interdit la déconnexion de base ;
- gel de tâches sans nouveau lancement, attente de toutes les anciennes même si
  une tâche échoue ;
- audit Prisma concurrent, arrivée de nouvelles lignes pendant le premier flush,
  erreur de base et annulation du minuteur ;
- journal JSON réel dans un nouveau répertoire factice, flush avant deux secondes,
  échec `fsync` injecté puis reprise ;
- file email déjà engagée (base/SMTP simulés) et sauvegarde de fichiers fictifs en
  vol (pg_dump simulé), sans nouvelle tâche après gel, conservation ZIP et partiel.

Le passage ciblé comporte **15 tests PASS** dans cinq fichiers ; la suite backend
complète après raccordement : **313 tests PASS dans 50 fichiers**. TypeScript
`--noEmit` et `git diff --check` sont passés. Ces résultats n'impliquent aucun envoi
email réel, paiement, essai matériel ou arrêt de l'installation principale.

```powershell
# Depuis apps/backend : aucun serveur ou base réelle du projet n'est démarré.
node ../../node_modules/vitest/vitest.mjs run src/lib/backend-lifecycle.test.ts src/lib/eventSink.test.ts src/middleware/audit-shutdown.test.ts src/lib/invoice-delivery.lifecycle.test.ts src/jobs/backup-worker.lifecycle.test.ts
node ../../node_modules/vitest/vitest.mjs run
# Depuis le dépôt : contrôle TypeScript sans compilation déployée.
node node_modules/typescript/bin/tsc -p apps/backend/tsconfig.json --noEmit
```

Le profil métier a ensuite réellement été arrêté via le contrôle privé, puis relancé
pendant les campagnes et la finalisation ; la fin du processus possédé a été attendue,
sans kill. Une première tentative dépassait le délai client : des réponses HTTP
abandonnées par Chrome restaient retenues dans le relais. Le runtime a fini naturellement
après leur timeout, sans fermeture manuelle de processus. Le cas est reproduit par un
test de réponse de 8 MiB abandonnée, puis corrigé en fermant seulement son relais amont.
Les essais suivants et les 34 autocontrôles finaux passent ; la reprise finale comporte
19 assertions de données/contraintes. [Preuve](preuves/finalisation-fiabilite-2026-10-17.json).

Restent non qualifiés : arrêt du profil complet sur cette installation, demande pendant
une vraie sauvegarde en vol, reprise après arrêt brutal ou panne électrique. Les tests
hermétiques correspondants ne deviennent pas des essais matériels.
Le contrôle visuel Windows est **BLOCKED** par computer-use (URL non vérifiable) ; aucune
protection n'a été contournée et aucun essai natif supplémentaire n'a été lancé.
La lecture des deux raccourcis n'est pas une preuve d'ouverture/fermeture visuelle.
