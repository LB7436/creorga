# Reprise et retour arrière

Les archives privées originales restent immuables. Le laboratoire crée une base snapshot,
une base locale modifiable et une base de tests vide, puis restaure fichiers et base du même instant.
La preuve de reprise et les configurations contenant des secrets restent hors dépôt.

Migrations appliquées : journal POS du 5 septembre puis `20261008130000_payment_attempts`.
Cette dernière crée uniquement une table, des contraintes et index. Elle ne renumérote ni
ne réécrit les commandes historiques. La contrainte composite empêche de rattacher une
tentative à une commande d'une autre société.

Retour arrière : arrêter les applications du laboratoire, conserver un export de son état,
recréer une **nouvelle** base depuis l'archive originale et utiliser le code de l'instant voulu.
Ne pas supprimer une table de tentatives contenant des opérations non rapprochées.
Une tentative inconnue doit être rapprochée avant remise en service financière.

Les anciens profils de navigateur et leurs origines n'ont pas été effacés. L'export des ventes
qui n'existeraient que dans ces profils reste à exécuter dans chaque navigateur concerné.
Le travail local ne déclenche pas d'encaissement, remboursement, SMS ou email réel.
