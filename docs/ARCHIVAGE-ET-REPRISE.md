# Conservation de Creorga et reprise hors Contabo

Décision du 24 septembre 2026 : conserver Creorga sur le PC et GitHub, puis retirer
l'installation Creorga du VPS Contabo. Ce dépôt contient le code, pas la sauvegarde
des données d'exploitation.

## Versions à distinguer

- Ancienne production : `15a52bca39788d38362d1bfc4100e749fde2b86c`.
- Dernier lot de corrections de code : `95eaeda8e26de5f5d8e588edf821116a5af16e8b`.
- La version courante ajoute cette documentation de conservation.
- Les corrections ont obtenu 249 tests unitaires et 129 contrôles scénarisés locaux
  le 5 septembre. Ces résultats ne valident pas tous les boutons, une réception Zoho,
  un paiement bancaire réel ou toutes les options de caisse. Il ne s'agit pas d'une
  certification de sécurité ou comptable.

## Sauvegarde privée sur le PC

Le dossier `retirement-20260924/private`, à côté des copies de travail, contient :

- les archives du code récent, de l'historique Git et des copies de travail avec
  leurs modifications non commitées ;
- l'export logique PostgreSQL de production et les rôles, conservés séparément ;
- les fichiers du VPS : code, anciennes versions, documents, données, médias,
  environnement et configurations nécessaires à la reprise ;
- les volumes PostgreSQL/Redis arrêtés et les informations des conteneurs ;
- un manifeste SHA-256 permettant de contrôler les transferts.

Le dossier privé contient des secrets. Ne jamais le publier, le joindre à une issue,
ni l'ajouter à Git. Ses accès Windows sont limités. Les archives ne sont pas chiffrées :
utiliser une copie chiffrée si elles sont transférées sur un autre support.
Le fichier local `SAUVEGARDE-VERIFIEE.json` documente les vérifications effectivement
terminées ; son absence signifie qu'il ne faut pas considérer la sauvegarde validée.

## Reprendre sans risquer les données

1. Conserver l'archive originale et vérifier toutes les empreintes du manifeste.
2. Travailler sur une copie. Restaurer l'export PostgreSQL dans une **nouvelle base**,
   sans écraser une base existante. Restaurer les fichiers et la base du même snapshot.
3. Commencer avec la version de code qui correspond à l'ancienne production.
4. Adapter les chemins Linux, les ports et les URLs à la nouvelle machine. Ne pas
   recopier aveuglément une configuration Caddy partagée avec d'autres applications.
5. Créer un environnement local de test : écoute locale, nouveaux secrets de session,
   boîte email locale, paiements/IA et tâches automatiques externes désactivés.
   **Ne pas démarrer le serveur local avec les identifiants SMTP de production.**
6. Vérifier les comptes, documents et plan de salle avant toute migration. Ne jamais
   exécuter de seed, reset ou nettoyage sur la base restaurée contenant les vraies données.
7. Pour utiliser le code récent, appliquer ses migrations uniquement sur une copie de
   cette restauration, puis refaire la recette. La migration du journal de caisse est
   additive, mais les anciennes ventes uniquement stockées dans les navigateurs ne
   sont pas importées automatiquement.

Les archives `tar.gz` préservent des permissions et liens Linux. Pour une restauration
fidèle, privilégier une machine Linux ou WSL/Docker, sans extraire aveuglément des
chemins système au-dessus d'une installation existante. Les volumes physiques
PostgreSQL sont une copie de secours supplémentaire ; l'export logique est préférable
pour changer de plateforme.

## Ce que GitHub ne remplace pas

- Une copie privée des données et des documents.
- Les ventes anciennes restées dans le navigateur d'une caisse : ne pas effacer ce
  navigateur avant de les exporter.
- La sauvegarde des autres applications hébergées sur Contabo, notamment Clientbase.
- Les opérations chez le fournisseur : retirer Creorga ne résilie pas le VPS, ne
  supprime pas ses snapshots et ne modifie pas automatiquement les DNS.

Avant une remise en ligne, valider les fonctionnalités de caisse restantes, les
options simplifiées, les cartes cadeaux, les remboursements et les intégrations
externes. Ne pas présenter cette archive comme une nouvelle mise en production.
