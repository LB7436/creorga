# Validation intégrale Creorga — 25 août 2026, revalidée le 27 août

## Verdict

La refonte et la validation ont été réalisées dans l'environnement local isolé. Aucun déploiement, push GitHub ou effacement de données de production n'a été exécuté.

- Backend : **122/122** tests unitaires réussis.
- Web : **30/30** tests unitaires réussis.
- Caisse : **31/31** tests unitaires réussis.
- Parcours Playwright : **31/31** réussis lors de la revalidation finale en 6 min 12 s.
- Balayage interface : **177 combinaisons route × format**, 0 écran blanc, 0 exception navigateur, 0 libellé cassé et 0 réponse HTTP 4xx/5xx.
- Builds : backend, web, caisse, portail client, super-administration et marketing réussis.
- Connexion mobile locale : LCP **275 ms**, TTFB **8 ms**, CLS **0,00**.
- Lighthouse connexion : accessibilité **100**, bonnes pratiques **100**, SEO **100**. Le score Agentic Browsing de 67 provient uniquement de l'absence de `llms.txt`, non nécessaire au fonctionnement de ce back-office privé.

## État fonctionnel validé

- Inscription par e-mail, connexion et onboarding d'une société neuve.
- Isolation des données par société sur les fonctions auditées.
- Démarrage sans faux restaurant préchargé : une salle principale vide est créée.
- Création, modification, déplacement, renommage et suppression persistante des salles et tables.
- Une table ou chaise avec des éléments impayés ne peut pas être fermée ou supprimée.
- Configuration du portail, carte, produits, commandes, affichage TV et publicités isolés par société.
- Planning envoyé uniquement aux membres actifs ayant des horaires.
- En cas d'échec partiel d'envoi, seules les personnes réellement livrées sont confirmées ; l'interface distingue succès et échecs.
- Les actions incomplètes ne simulent plus de succès : elles affichent un état indisponible ou l'erreur réelle.
- Catalogue réduit à **16 jeux**, avec au maximum **5 jeux par catégorie**.
- Interface de connexion, navigation, états vides, mobile, accessibilité et retours d'erreur modernisés.
- Un terminal POS authentifié par son propre `X-Device-Token` accède aux commandes sans exiger à tort un JWT utilisateur.
- La visibilité, le libellé et l'épinglage des modules sont désormais persistés dans un fichier distinct par société ; le test A/B confirme qu'un réglage du client A reste invisible chez le client B.

## Revalidation finale du 27 août 2026

La porte de livraison mécanique a été rejouée après la revue du diff. Résultats : **183/183 tests unitaires**, **31/31 scénarios Playwright**, **177/177 variantes de pages**, tous les builds applicatifs réussis et aucune erreur `git diff --check`. `npm audit --omit=dev` reste à 0 vulnérabilité haute ou critique et 2 avis modérés React Router nécessitant une migration majeure.

Le site de production répond en HTTPS avec un statut 200 et le titre « Creorga OS - Gestion de restaurant au Luxembourg ». Le point `/api/health` répond 200, `status: ok`, `baseDeDonnees: ok`, et annonce la sauvegarde automatique `creorga-full-2026-08-27-2132.zip`.

Deux bloqueurs détectés pendant la revue locale ont été corrigés avant cette revalidation : la double authentification qui refusait les terminaux POS et le fichier global de préférences de modules qui mélangeait les sociétés. CodeRabbit n'étant pas installé, aucun code ni diff n'a été transmis à un service externe.

## E-mail professionnel

La boîte gratuite `contact@n8nautomatisations.org` est opérationnelle dans Zoho Mail. Les enregistrements MX, SPF et DKIM ont été vérifiés et la réponse automatique a été testée. Un enregistrement DMARC de surveillance a ensuite été publié et vérifié : `p=none`, rapports vers la boîte professionnelle, alignements DKIM/SPF souples. Google OAuth est volontairement reporté.

Un mot de passe d'application Zoho unique a été créé après confirmation explicite. L'ancien identifiant inutilisable a été révoqué. La configuration locale utilise `smtp.zoho.eu` sur le port 465 avec TLS, l'expéditeur et l'adresse de réponse `contact@n8nautomatisations.org`. Le secret est stocké uniquement dans `apps/backend/.env`, fichier confirmé comme ignoré par Git ; sa valeur n'est ni documentée ni commitée. Il n'est pas encore installé sur le VPS.

Le test réel du 25 août 2026 a exercé le véritable endpoint de publication du planning avec une session OWNER et une donnée locale temporaire isolée. Résultat : HTTP 200, **1 destinataire livré sur 1**, **0 échec**, **1 shift confirmé**, fournisseur `zoho-smtp`. Le message est apparu dans la boîte Zoho `contact@n8nautomatisations.org` à 21:58, avec l'expéditeur `Creorga <contact@n8nautomatisations.org>`, le sujet « Votre planning Café um Rond-Point · 31/12/2099 – 01/01/2100 » et le détail du shift de test. Après l'envoi, l'adresse du compte de démonstration a été restaurée et le shift temporaire supprimé ; aucun utilisateur ni horaire de test ne subsiste dans la base locale.

## Comparaison PC, GitHub et VPS

| Environnement | Révision | Situation |
|---|---|---|
| GitHub `LB7436/creorga` | `20f19ab29cedc7e054c67fbdb3c9938ff04f6356` | Référence distante la plus ancienne |
| VPS `/opt/creorga/src` | `a4f9aad56fc59c0535432e2b71986dffe53af4e5` | 59 commits devant GitHub |
| Base locale | `c57c32b812fd29df8aebeec5e55d7db113dd192d` | 11 commits devant le VPS, 70 devant GitHub, puis refonte locale non commitée |

Le VPS et GitHub ne correspondent donc pas. Le PC contient la version la plus avancée, mais son lot de refonte doit être nettoyé, révisé et commit avant tout déploiement contrôlé.

## Production : inventaire en lecture seule

| Donnée | Nombre |
|---|---:|
| Société | 1 |
| Utilisateurs | 9 |
| Adhésions utilisateur-société | 9 |
| Clients | 51 |
| Profils employés | 1 |
| Horaires | 30 |
| Catégories | 8 |
| Produits | 141 |
| Tables | 12 |
| Commandes | 100 |
| Factures | 22 |
| Devis | 16 |
| Réservations | 10 |
| Compte créateur séparé | 1 |
| Événements d'activité | 57 |
| Événements de connexion | 29 |
| Mesures quotidiennes locataires | 15 |
| Opportunités créateur | 1 |

Le comptage exhaustif représente **1 257 lignes locataires et de télémétrie** à remettre à zéro. Il existe séparément **1 `CreatorAccount` et 2 `CreatorRefreshToken`**, soit 3 lignes créateur à préserver selon l'option recommandée. Le dossier métier `apps/backend/data` occupe **5,9 Mo** ; il sera archivé dans la sauvegarde pré-purge puis recréé vide, afin qu'aucun ancien plan, score, appel client ou réglage ne réapparaisse.

Une sauvegarde pré-refonte est présente dans `/opt/creorga/backups/2026-08-25-pre-refonte`. Le dump PostgreSQL, les données backend, le bundle Git et l'archive complète ont tous passé `sha256sum -c SHA256SUMS`.

## Dépendances et risques résiduels

`npm audit fix` a supprimé 14 des 16 vulnérabilités de production initiales. Il reste 2 avis modérés React Router dont la correction impose une migration majeure vers React Router 7 ; cette migration n'est pas mélangée à la validation actuelle.

Les builds de la caisse et de la super-administration signalent encore un gros chunk JavaScript. Cela n'empêche pas le fonctionnement ; le découpage de bundle peut être traité après stabilisation fonctionnelle.

Le paiement Stripe réel reste bloqué faute de clés de test. La logique concernée est couverte par les tests, mais un paiement fournisseur de bout en bout ne doit pas être déclaré validé tant qu'il n'a pas été exécuté.

## Ordre de mise en production proposé

1. **Fait** — Créer le mot de passe d'application Zoho après confirmation explicite et le conserver comme secret, jamais dans Git.
2. **Fait** — Tester en local un vrai e-mail de planning et vérifier sa réception dans Zoho Mail.
3. **Fait** — Réviser le diff, corriger les deux bloqueurs POS/modules et identifier les artefacts générés à exclure du commit.
4. Créer un commit de livraison et une branche distante après autorisation de push.
5. Préparer une version de staging et rejouer les tests critiques sur une copie de production.
6. Obtenir une confirmation séparée du périmètre d'effacement : conserver le compte créateur ou supprimer absolument tous les comptes.
7. Passer le service en maintenance, refaire un dump horodaté, vérifier son hash, puis effacer transactionnellement le périmètre confirmé.
8. Déployer la révision immuable autorisée, appliquer les migrations et secrets, puis effectuer les contrôles de santé.
9. Créer un nouveau compte depuis l'interface publique, terminer l'onboarding, créer une salle et une table, publier un planning et confirmer la réception du mail.
10. Surveiller journaux, erreurs et ressources, avec restauration immédiate du dump en cas d'échec d'un critère de sortie.

## Autorisations encore requises

Deux validations restent volontairement indépendantes :

1. **Effacement production** : choisir explicitement entre conserver le compte créateur et supprimer absolument tous les utilisateurs, puis confirmer les nombres ci-dessus. Option recommandée : vider toutes les tables applicatives sauf `_prisma_migrations`, `CreatorAccount` et `CreatorRefreshToken`, soit 1 257 lignes actuelles supprimées et 3 lignes créateur préservées ; la boîte Zoho et les sauvegardes sont également conservées.
2. **Livraison** : autoriser séparément commit, push GitHub et déploiement VPS de la révision exacte, y compris l'installation du secret SMTP dans l'environnement protégé du service.

Sans ces confirmations distinctes, la production reste inchangée.
