# Runbook Contabo — Creorga

**Cible** : `creorga.n8nautomatisations.org`
**Serveur** : Contabo `156.67.25.115`
**Date du dernier relevé en lecture seule** : 27 août 2026

Ce document décrit la topologie réellement observée sur le VPS. Il remplace le guide Vercel générique pour le déploiement de cette instance, sans le supprimer de l'historique.

## 1. Topologie observée

| Élément | Configuration réelle |
|---|---|
| Proxy et TLS | Caddy, ports 80/443 |
| Back-office | Caddy sert `/srv/creorga` |
| Caisse | Caddy sert `/srv/caisse` |
| Console créateur | Caddy sert `/srv/console` |
| API | `creorga-api.service`, port 3002 |
| Code API | `/opt/creorga/src/apps/backend`, lancé par `tsx src/index.ts` |
| Secrets | `/etc/creorga/creorga.env`, droits `root:creorga` 0640 |
| Base | PostgreSQL dans le conteneur `creorga-db` |
| Dépôt | `/opt/creorga/src` |
| Révision relevée | `a4f9aad56fc59c0535432e2b71986dffe53af4e5` |

Le point de santé local répond actuellement `status: ok`, `baseDeDonnees: ok`. Le service est actif sans redémarrage automatique observé depuis le 13 août 2026.

## 2. Principes non négociables

1. Ne jamais copier un fichier `.env` depuis le dépôt vers `/etc/creorga/creorga.env`.
2. Ne jamais déployer un dossier de travail sale : la cible est toujours un SHA Git immuable et explicitement approuvé.
3. Ne jamais exécuter `prisma migrate reset`, un seed ou un `DROP` en production.
4. Ne jamais supprimer les comptes en même temps que la migration technique ; l'effacement est une opération séparée, transactionnelle et approuvée.
5. Refaire un dump PostgreSQL et les archives statiques immédiatement avant chaque bascule.
6. Vérifier les hashes avant de poursuivre.
7. Arrêter au premier échec ; ne pas marquer la livraison réussie si le mail ou un test critique échoue.

## 3. Portes d'autorisation

| Porte | Action | Confirmation requise |
|---|---|---|
| A | Créer le mot de passe d'application Zoho | Autorisation explicite du secret SMTP |
| B | Créer le commit et pousser GitHub | Autorisation explicite de livraison |
| C | Modifier le VPS, appliquer la migration et redémarrer | Autorisation explicite de déploiement du SHA annoncé |
| D | Effacer des utilisateurs/clients | Autorisation destructive séparée avec périmètre et nombres |

Une autorisation d'une porte ne vaut jamais pour les suivantes.

## 4. Préparation du lot local

Le lot applicatif comprend le backend, le web, les tests E2E, les nouvelles migrations, l'image de connexion et les verrous npm. Les captures de `tests-qa/screenshots/run-2026-07-27/` ont été régénérées par le balayage et doivent rester hors du commit de livraison, sauf décision contraire explicite.

Avant le commit :

```powershell
git diff --check -- apps/backend apps/web tests-e2e package-lock.json apps/marketing/package-lock.json
npm audit --omit=dev
npm run test --workspace=apps/backend
npm run test --workspace=apps/web
npm run test --workspace=apps/pos
npx playwright test
npm run build --workspace=apps/backend
npm run build --workspace=apps/web
npm run build --workspace=apps/pos
npm run build --workspace=apps/guest
npm run build --workspace=apps/superadmin
npm run build --workspace=apps/marketing
```

Critères de sortie : tous les tests verts, tous les builds verts, aucune erreur `diff --check`, et aucun secret suivi par Git.

## 5. Création de la version immuable

Après autorisation de la porte B :

1. Ajouter uniquement les sources, tests, migration, documentation et lockfiles validés.
2. Exclure les captures régénérées et `apps/guest/tsconfig.tsbuildinfo` du commit.
3. Créer un commit sur une branche `codex/creorga-refonte-2026-08-25`.
4. Rejouer les vérifications depuis le commit, puis pousser la branche.
5. Noter le SHA complet et demander l'autorisation de déployer **ce SHA précis**.

Le VPS étant 59 commits devant GitHub et la base locale descendant du VPS, la branche distante doit rester un avancement linéaire. Refuser tout historique divergent ou réécrit.

## 6. Préparation du VPS

À exécuter seulement après la porte C. Remplacer les marqueurs par des valeurs explicites vérifiées ; ne pas utiliser de SHA abrégé.

```bash
TARGET_SHA='<sha-complet-approuve>'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PREVIOUS_SHA="$(git -C /opt/creorga/src rev-parse HEAD)"
BACKUP_DIR="/opt/creorga/backups/${STAMP}-pre-deploy-${TARGET_SHA}"
```

Contrôles initiaux :

```bash
test -n "$TARGET_SHA"
test "${#TARGET_SHA}" -eq 40
systemctl is-active --quiet creorga-api.service
curl -fsS http://127.0.0.1:3002/api/health
df -h /opt/creorga /var/backups/creorga
git -C /opt/creorga/src status --porcelain
```

Le dernier contrôle doit être vide. Sinon, arrêter et examiner les changements au lieu de les écraser.

## 7. Sauvegarde immédiatement avant bascule

Créer un dossier horodaté, puis sauvegarder séparément :

- dump PostgreSQL au format custom ;
- dépôt Git et révision courante ;
- données persistantes du backend ;
- `/srv/creorga`, `/srv/caisse`, `/srv/console` ;
- Caddyfile et unité systemd ;
- fichier des secrets chiffré ou conservé uniquement dans un emplacement root sécurisé, jamais dans le bundle Git.

Après création :

```bash
sha256sum "$BACKUP_DIR"/* > "$BACKUP_DIR/SHA256SUMS"
cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS
```

Ne poursuivre que si chaque ligne est `OK`.

## 8. Préconstruction avant interruption

1. Récupérer la branche distante.
2. Vérifier que `TARGET_SHA` existe et descend de `PREVIOUS_SHA`.
3. Construire dans un répertoire de staging distinct.
4. Installer avec `npm ci`, jamais avec une résolution flottante.
5. Construire backend, web, caisse et console.

Contrôles attendus : fichiers `index.html` présents, bundles non vides, aucune variable secrète incorporée dans le frontend et `npm audit --omit=dev` sans vulnérabilité haute ou critique.

## 9. Migration et bascule

La migration `20260825190000_portal_config_by_company` crée `PortalConfiguration` avec une clé étrangère vers `Company`. Elle doit être répétée d'abord sur une copie restaurée de la production. Les préférences de modules et les plans de salle sont désormais isolés dans des fichiers par société ; ne renseigner `LEGACY_MODULE_CONFIG_COMPANY_ID` ou `LEGACY_FLOOR_COMPANY_ID` que si un ancien fichier global doit explicitement être attribué à une société conservée. Pour une remise à zéro complète des clients, ne définir aucune de ces variables.

Ordre de production :

1. Activer une page de maintenance ou annoncer la courte fenêtre.
2. Arrêter `creorga-api.service`.
3. Appliquer `prisma migrate deploy` avec le fichier de secrets de production.
4. Vérifier l'état Prisma et la présence de la nouvelle table/index.
5. Basculer les trois dossiers statiques préconstruits.
6. Positionner le dépôt sur le SHA approuvé sans réécriture forcée.
7. Redémarrer `creorga-api.service`.
8. Attendre le point de santé, puis retirer la maintenance.

Ne pas ajouter les variables SMTP à cette étape si le test local Zoho n'a pas déjà réussi.

## 10. Contrôles après déploiement

Contrôles techniques :

```bash
systemctl is-active creorga-api.service
systemctl show creorga-api.service -p MainPID -p NRestarts
curl -fsS http://127.0.0.1:3002/api/health
curl -fsSI https://creorga.n8nautomatisations.org/
curl -fsSI https://caisse.n8nautomatisations.org/
journalctl -u creorga-api.service --since '-10 minutes' --no-pager
```

Contrôles métier dans un navigateur privé :

1. Créer un compte neuf par e-mail.
2. Terminer l'onboarding.
3. Créer et renommer une salle.
4. Créer, modifier et supprimer une table vide.
5. Vérifier qu'une table impayée ne peut pas être fermée.
6. Publier un planning vers une adresse de test consentie.
7. Confirmer la réception et l'expéditeur `contact@n8nautomatisations.org`.
8. Vérifier le portail client et le catalogue limité.

Critère de succès : aucun échec critique, aucune hausse de redémarrage et aucun faux succès d'e-mail.

## 11. Retour arrière

Déclencheurs : santé API en échec, migration incohérente, création de compte impossible, données d'une autre société visibles, planning faussement confirmé ou erreurs serveur répétées.

Ordre :

1. Réactiver la maintenance.
2. Arrêter l'API.
3. Restaurer les trois archives statiques précédentes.
4. Revenir à `PREVIOUS_SHA` sans supprimer la copie du nouveau lot.
5. Si la migration n'est pas rétrocompatible, restaurer le dump PostgreSQL complet ; ne jamais improviser un SQL inverse sur les données actives.
6. Redémarrer, contrôler la santé et documenter l'incident.

La restauration de la base annule toutes les écritures faites après le dump. Pour cette raison, la fenêtre doit rester courte et sans trafic métier pendant la première migration.

## 12. Effacement des anciens comptes

Cette opération ne fait pas partie du déploiement technique. Avant toute suppression :

1. afficher de nouveau les nombres par table ;
2. demander si le compte créateur doit être conservé ; l'option recommandée supprime tous les comptes locataires mais préserve `CreatorAccount`, `CreatorRefreshToken` et la boîte Zoho ;
3. produire la liste exacte des tables et règles de cascade ;
4. refaire un dump dédié et vérifier son hash ;
5. exécuter une transaction avec un contrôle du nombre de lignes supprimées ;
6. archiver puis vider les fichiers métier de `apps/backend/data` afin qu'aucun plan de salle, score, appel client ou configuration historique ne réapparaisse ;
7. tester immédiatement une inscription entièrement neuve.

Sans confirmation destructive contenant le périmètre choisi, aucune ligne de production n'est supprimée.

### Périmètre recommandé relevé le 27 août 2026

- Vider toutes les tables du schéma public sauf `_prisma_migrations`, `CreatorAccount` et `CreatorRefreshToken` : **1 257 lignes actuelles** de données locataires, relations, documents métier et télémétrie.
- Préserver **1 compte créateur et ses 2 jetons de session**, la boîte Zoho `contact@n8nautomatisations.org`, les secrets d'infrastructure et toutes les sauvegardes.
- Archiver avec hash puis recréer vide le dossier métier de **5,9 Mo** sous `apps/backend/data`.
- Ne jamais utiliser `prisma migrate reset` ou un seed ; la purge se fait dans une transaction SQL explicite pendant l'arrêt du service.
- Après redémarrage, exiger zéro société et zéro utilisateur locataire, puis créer le premier compte neuf depuis `/login` et terminer son onboarding.
