# Dossiers et pièces RH — recette du 16 octobre

Propriétaires et responsables gèrent les dossiers de leur société ; chaque salarié consulte
ses propres documents. L'annuaire `/hr/team` renvoyait encore les profils complets des collègues,
malgré les protections du dossier. Il filtre désormais les salariés sur eux-mêmes et ne joint
les profils que pour OWNER/MANAGER. Le défaut a été reproduit sur PostgreSQL de test.

Nouveaux fichiers : format validé, maximum 25 Mio, nom aléatoire, création exclusive, fsync avant
métadonnée SQL, SHA-256 conservé. Téléchargement authentifié sans cache : taille et empreinte
relues ; altération refusée. Les anciens fichiers restent `legacy-unverified` sans preuve inventée.
Les octets uploadés sont préservés, sans réencodage d'image ou PDF.

Suppression : `deletedAt` retire les accès salariés, puis fichier et métadonnée sont supprimés.
Un échec physique conserve la métadonnée, refuse un faux succès et affiche au responsable
« Suppression physique en attente » avec reprise. Pas encore de purge automatique : intervention
nécessaire. Chemins inattendus, liens symboliques et entrées non régulières refusés.

Bornes par processus : un upload et deux téléchargements simultanés ; 429 au-delà. L'upload est
borné avant lecture du corps. Cela limite la mémoire, sans prouver la performance durant service.
La résistance électrique et les droits Windows de chaque déploiement restent à qualifier.

Migration additive `20261016140000_hr_document_integrity` sur copies uniquement, sans réécrire les
anciens fichiers. L'ancien code pourrait rouvrir des pièces retirées ; ne pas remettre ses routes
RH en ligne sur une base contenant des suppressions en attente.

Preuves : huit intégrations PostgreSQL/fichiers, cinq tests durabilité/capacité. Chrome neuf a
créé une serveuse fictive dans Administration → Utilisateurs, uploadé une pièce avec nom accentué,
comparé son empreinte depuis l'onglet ouvert, rechargé puis connecté le salarié, vérifié sa lecture
sans gestion et supprimé la pièce par le responsable. Neuf observations réussies dans la preuve
privée `BROWSER-HR-DOCUMENTS.json`. Le contrôle réseau Chrome rendait un corps vide après Blob ;
la vérification porte sur le fichier réellement ouvert et le téléchargement API.

Stockage `data/rh-documents` couvert par la sauvegarde v2. Dernière reprise quiescente : 59 tables,
huit fichiers incluant deux pièces RH fictives, deux PDF de facturation comparés égaux après
chiffrement et restauration native. Les fixtures ne prouvent pas la présence de pièces d'exploitation.
