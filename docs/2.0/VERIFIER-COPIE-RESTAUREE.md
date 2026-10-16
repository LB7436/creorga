# Vérifier une copie PostgreSQL restaurée

`scripts/verify-restored-copy.mjs` compare deux bases existantes. Il ne crée pas de base, ne restaure rien et ne modifie ni fichiers ni données. Les deux lectures utilisent des transactions PostgreSQL `REPEATABLE READ` et `READ ONLY`. Le contrôle exige des connexions loopback et deux bases distinctes ; il refuse les options d’URL permettant de changer de destination.

Préparer la copie avec les procédures de reprise, conserver l’original et arrêter les écrivains pendant le dump et la comparaison. Un snapshot cohérent dans chaque base ne garantit pas que les deux snapshots correspondent au même instant lorsque l’application continue d’écrire.

Injecter les URL privées par le gestionnaire de secrets ou le lanceur local dans `CREORGA_VERIFY_SOURCE_URL` et `CREORGA_VERIFY_RESTORED_URL`. Ne pas les écrire dans la ligne de commande, dans Git ou dans le rapport. Depuis la racine du dépôt :

```powershell
node scripts/verify-restored-copy.mjs --self-test
node scripts/verify-restored-copy.mjs
```

Le rapport JSON contient uniquement les noms de schémas/tables, nombres de lignes, empreintes SHA-256, compteurs d’intégrité PDF et différences. Il n’inclut aucune URL, valeur de ligne, pièce jointe, adresse e-mail ou identifiant de connexion. Le code de sortie vaut `0` pour égalité, `1` pour différence ou PDF incohérent, `2` pour contrôle incomplet ou refus de configuration. Conserver le rapport dans un emplacement de preuve privé : les noms de tables et empreintes restent des informations techniques internes.

Chaque ligne est normalisée par PostgreSQL JSONB, avec heure UTC, dates ISO, intervalles ISO et octets hexadécimaux. Son empreinte SHA-256 entre dans un multiensemble trié : l’ordre physique des lignes et leurs `ctid` ne comptent pas, les doublons comptent. Les métadonnées des colonnes sont comparées par empreinte. Les versions majeures PostgreSQL doivent correspondre. Les tables sont parcourues par pages de 25 lignes, avec une limite de 1 000 000 de lignes par table. `CREORGA_VERIFY_MAX_ROWS` permet une limite explicite jusqu’à 10 000 000, au prix de mémoire supplémentaire pour les empreintes.

Pour `Invoice.issuedPdf/issuedPdfHash` et désormais `CreditNote.pdf/pdfHash`, le script calcule SHA-256 sur les octets de chaque PDF, compare l’empreinte enregistrée et contrôle l’en-tête `%PDF-`. Deux copies identiques d’un PDF dont l’empreinte est fausse échouent quand même. Le compteur JSON `issuedPdf` s'applique aux deux types de pièces. Les 23 auto-contrôles incluent le choix de colonnes et un original incomplet. Cet examen d'octets ne prouve pas la lisibilité de chaque page, la conformité fiscale ou l’impression physique.

Périmètre : tables, colonnes et PDF stockés dans PostgreSQL. L’inventaire `information_schema` est rapproché du catalogue : une table inaccessible ou des lignes filtrées par RLS font échouer le contrôle. Utiliser un compte de lecture couvrant toutes les tables attendues et rapprocher l’inventaire du manifeste d’archive. Le script ne valide pas les fichiers externes, profils navigateur, séquences, rôles, extensions, index, contraintes, droits, ni le chiffrement d’une archive. Les identifiants SQL atypiques sont refusés explicitement. Un échec de lecture donne un contrôle incomplet, sans exposer le détail d’erreur pouvant contenir des données privées.
