# T04 — étude de reprise sans ouvrir les profils historiques

16 octobre 2026. **Étudié/préparé, pas exécuté sur les données navigateur historiques.**
Interdiction respectée : aucun Chrome/Edge/Firefox historique lancé, profil ouvert, base
de profil lue, migrée, réécrite ou supprimée. Aucun changement de DNS ou retour de l'ancien VPS.

## Ce qui est disponible

L'outil autonome existant `recovery.html` est conservé. Sa logique partagée est dans
`shared/browser-recovery/`. Il ne charge pas le magasin métier, ne crée aucun service worker
et n'appelle aucune API de commande/paiement. Il exporte les valeurs brutes avec empreintes,
chiffre AES-256-GCM, sépare archive et clé, puis vérifie les fichiers téléchargés.

Périmètre lu dans le code, pas dans les profils :

- `creorga-pos-v2`, ventes imbriquées dans les clôtures, sièges/chaises et plans ;
- clés `creorga-pos-draft:`, `creorga-pos-pending:`, `creorga-pos-close:` et `creorga-floor-` ;
- nouvelles références `creorga-financial-v1:` : paiement, avoir, remboursement, mouvement, clôture ;
- IndexedDB `creorga-offline/queue` en transaction readonly ;
- caches CréOrga avec `/__queue__`, `/legacy-queue-*`, `/api/*`, corps et empreintes.

Des fichiers de recette `storageState` de septembre et les preuves du laboratoire existent
dans le workspace. Leur nom ou présence ne prouve pas un export complet d'un ancien poste
de service : cookies/login, localStorage, IndexedDB et caches ne sont pas interchangeables.
Ils ne sont pas importés comme ventes historiques. Aucun inventaire de profil système n'a été fait.

## Blocage réel

Pas d'export historique complet, de provenance commerciale et d'origine exacte validés
pour le périmètre à récupérer. L'autorisation courante interdit précisément l'ouverture des
profils nécessaires. Une page localhost neuve ne peut pas lire les données d'une ancienne
origine HTTPS ni celles d'un autre profil. Il n'y a donc pas de résultat T04 « zéro vente perdue ».

## Procédure sûre proposée pour une étape ultérieure autorisée

1. Faire inventorier par le propriétaire les appareils/navigateurs/profils/origines et périodes,
   sans supprimer ni réinstaller quoi que ce soit. Recenser aussi les anciennes caisses hors ligne.
2. Arrêter les saisies et la synchronisation. Avant toute ouverture susceptible de modifier un
   profil, conserver une copie privée immuable et cohérente à navigateur arrêté, avec manifeste
   (appareil, navigateur/version, origine, date, taille, SHA-256). Ne pas tenter de lire à chaud
   un LevelDB/SQLite ou de recopier seulement un de ses fichiers. Clés/DPAPI peuvent être liées
   au compte Windows : ne pas promettre qu'un simple dossier copié sera lisible ailleurs.
3. Conserver une archive originale en lecture seule et travailler seulement sur une copie.
   Toute autorisation d'ouvrir un profil ou sa copie doit être distincte de cette mission.
   Pas de lancement actuel de cette procédure par l'agent.
4. Utiliser ensuite l'exporteur sur l'origine exacte, après qualification sur copie sans
   activité métier, API distante ni seed. Une origine retirée demande une solution locale
   encadrée ; ne pas changer le DNS public ni contourner HTTPS/certificats.
5. Télécharger archive chiffrée et clé dans deux emplacements privés séparés. Vérifier
   déchiffrement/empreintes à partir des fichiers téléchargés. Un export vide ou partiel
   reste « non validé », pas « aucune donnée historique ».
6. Répéter pour chaque origine/profil/appareil. Garder les chaînes malformées originales et
   les paiements incertains. Au-delà des limites de taille/type de l'outil, arrêter la lecture
   et préparer un collecteur spécialisé sur copie ; ne pas ignorer les données refusées.
7. Avant tout import, établir une quarantaine : origine, IDs de vente/lignes/clôtures,
   société/site à justifier, dates/horloges, montants/TVA, état annoncé et référence prestataire.
   Rapprocher avec `Order`, `PosSale`, `SaleOrigin`, captures et documents serveur.
8. Dédupliquer par provenance vérifiable, pas uniquement date + montant. Même ID/contenu
   différent = conflit à examiner ; reçu absent du serveur ≠ argent bancaire confirmé.
   Ne jamais rejouer les anciennes requêtes réseau, débiter un stock ou créer un paiement
   automatiquement. Le futur import fera l'objet d'une migration additive séparée autorisée.
9. Produire contrôles avant/après : nombres, centimes, groupes TVA, références, empreintes et
   exceptions. Conserver les profils/archive même après un import accepté. Aucun nettoyage ici.

Limites actuelles : 32 Mio, 10 000 entrées de file ; pas de cookies HttpOnly ; aucune transaction
atomique entre localStorage, IndexedDB et caches. Quiescence et origine exacte nécessaires.
La lecture seule applicative n'équivaut pas à l'absence de toute écriture interne du navigateur.

## Preuves et état

17 tests unitaires d'export, dont conservation exacte des nouvelles références financières,
chiffrement/déchiffrement et absence d'import/rejeu. Les quinze observations Chrome précédentes
utilisaient des fixtures dans un contexte neuf, pas les profils historiques. Tests conservés.

Consulter `REPRISE-NAVIGATEUR.md` pour le mode d'emploi existant. Livrer un export privé
et sa provenance, ou autoriser expressément une reprise sur copie, sera nécessaire pour lever
le blocage. Aucun secret, PIN, jeton ou export navigateur ne doit être publié sur GitHub.
