# Archive opérateur version 2

Le worker inclut maintenant les fichiers du dossier `data/`, le dossier voisin `medias/` et un dump PostgreSQL custom. Les anciens ZIP plaçaient les fichiers de `data/` directement à la racine et omettaient les médias TV ; leur couverture est désormais indiquée `legacy-unknown`. Les vidéos TV de cette médiathèque sont des documents de l’établissement. Ce mécanisme n’inclut pas un futur stockage de vidéosurveillance ou un autre répertoire externe.

Structure du ZIP v2 :

```text
backup-manifest.json
data/**
medias/**                 # seulement si le dossier existe
database/<nom>.dump       # exactement un dump au format PGDMP
```

Le manifeste `version: 2` contient les tailles et SHA-256 de tous les fichiers, ainsi que deux racines : `data` (`included`) et `medias` (`included` ou `absent`). L’absence est enregistrée explicitement, sans fabriquer un dossier ni prétendre que des médias référencés ailleurs existent. `data/backups/` est exclu pour éviter les copies récursives. Les variables d’environnement, secrets conservés hors de ces deux racines, profils navigateur et autres dossiers extérieurs nécessitent leur procédure séparée. Aucun filtrage du contenu privé des fichiers métier n’est annoncé : protéger l’archive globale comme les données de toutes les sociétés.

Les fichiers sont lus en flux, un à la fois ; le lecteur de contrôle ne charge pas le ZIP complet en mémoire. Un changement de taille, date ou identité du fichier pendant sa lecture, une modification d’arborescence, un lien symbolique ou un fichier spécial font échouer l’archive. Le dump et le scan des fichiers restent deux opérations : pour une restauration à un même point métier, arrêter les écrivains avant l’archive et les reprendre après. Le worker automatique en ligne ne constitue pas une preuve de cohérence transactionnelle entre PostgreSQL et JSON.

`await inspectArchive(chemin)` retourne `{ valid, version, mediaStatus, files }` sans extraire. Il accepte les manifestes v1 et v2 et identifie les anciennes archives sans manifeste comme version 0. Il vérifie les octets du dump, les empreintes déclarées, les doublons et les chemins : traversées, chemins absolus, liens, collisions de casse Windows, noms de périphériques et chemins ambigus sont refusés. Limites explicites : 100 000 entrées, 32 Gio décompressés au total, manifeste de 16 Mio maximum. Les archives historiques sans manifeste ont une intégrité moins démontrable et ne sont pas annoncées complètes au sens v2.

`listFullBackups()` conserve son interface synchrone. Au premier inventaire, `verifying: true` indique le contrôle en arrière-plan ; `complete` devient vrai uniquement après validation d’une archive v2. Une nouvelle archive créée par le worker est déjà contrôlée avant publication. La console créateur conserve son accès opérateur global ; les routes d’export/restauration client restent fermées.

Pour restaurer v2, vérifier d’abord toute l’archive, puis travailler dans un dossier neuf : `data/**` vers le nouveau `data/`, `medias/**` vers le nouveau `medias/`, dump vers une nouvelle base. Revérifier chaque cible résolue avant écriture et les empreintes après copie. Pour v1, les entrées hors `database/` et manifeste appartiennent à l’ancien `data/` ; ne pas les interpréter comme une structure v2. Le vérificateur Docker historique ne constitue pas un restaurateur de fichiers métier et ne prouve pas leur récupération : utiliser aussi la comparaison PostgreSQL et le manifeste de fichiers.

Le renommage final intervient après contrôle puis flush du ZIP. La tenue réelle à une coupure électrique et le point commun base/fichiers restent à qualifier sur le matériel d’exploitation. Les copies externes doivent être chiffrées par la procédure d’exploitation ; ce ZIP local n’est pas chiffré automatiquement.
