# CréOrga 2.0 — profil professionnel sans jeux

Mission du 16 octobre 2026, base `962c01b2767a06db510c6b0aa3e22d521da77534`,
branche `codex/creorga-2-0-2026-10-08`. Commit de code **`9e15b1a`** ; les preuves et ce
checkpoint sont dans le commit documentaire suivant. Pas de qualification de production.

## Contraintes et décisions

- Travail sur le PC Windows, copie privée `local-2.0` et sociétés fictives. Aucun accès VPS,
  production, carte réelle, profil historique ou modification d'archive originale.
- Le fichier utilisateur `apps/guest/tsconfig.tsbuildinfo`, déjà modifié, reste hors commit.
- Les jeux demeurent dans Git, leurs sources et dépendances installées sont conservées.
  Seul le livrable professionnel généré est privé d'entrées/assets ludiques.
- Les vues de salle SVG/CSS, Robi, OCR, graphiques métier et écrans TV ne sont pas des jeux.
- Ne pas toucher aux démarrages, processus, logiciels ou modèles tiers Windows. Ollama est
  partagé et ne sera ni arrêté ni désinstallé. Le profil ne précharge aucun modèle IA.
- Mesurer des ressources, jamais extrapoler en watts, kWh ou euros sans mesure adaptée.
- La « version complète » désigne tous les modules professionnels existants ; elle ne transforme
  pas les fonctionnalités historiquement absentes/BLOCKED en fonctions livrées.

## Lots et interfaces

1. Inventaire et mesure de référence : Git, processus appartenant au laboratoire, dépendances,
   ressources de repos et parcours locaux sur un navigateur neuf. **Exécutés, limites documentées.**
2. Profil `CREORGA_BUSINESS_ONLY` : séparation au build des jeux et portail/menu, API de scores
   fermée sans purge ; interfaces compilées, ports/origines conservés ; lancement réversible,
   raccourci Windows dédié à un profil navigateur neuf. **Implémentés et testés ; lanceur sans UI.**
3. Poursuite T100 : caches multi-sociétés et planning nocturne, puis courses de portail/salle
   selon preuves. Tests RED→GREEN, aucune réimplémentation financière. **Corrections ciblées livrées.**
4. Mesures comparables, tests unités/PostgreSQL/Chrome/builds, restauration d'une nouvelle
   copie et reprise. **Exécutés, résultats ci-dessous.**
5. Revue, documentation et commit de code réalisés ; publication sur cette branche seulement.

Interfaces à préserver : les ports 3002/5174/5175/5177/5178, les origines et stockages navigateur,
les révisions/CAS de salle, les sessions et droits, les réglages de jeux conservés en base,
le répertoire métier et les clés de sauvegarde privées. Un changement de profil ne migre,
ne réinitialise et ne purge aucune base.

## Constats vérifiés en lecture seule

- HEAD local et GitHub identiques à `962c01b` ; seul le buildinfo guest est modifié au départ.
- Cinq processus Node appartiennent au laboratoire (API + quatre serveurs Vite).
- Jeux : 43 définitions, 40 composants chargeables, 16 sélectionnés ; Three.js uniquement
  sous le code ludique. Le catalogue importé par la configuration du portail entraîne aussi
  les imports dynamiques des jeux : masquer seulement l'onglet ne suffit pas.
- Les modes « 3D » de salle sont CSS/SVG et doivent rester disponibles.
- Aucun moteur Unreal/Roblox/Unity identifié comme processus CréOrga. Présence de logiciels
  tiers Windows inventoriée séparément, sans désinstallation ni changement de démarrage.
- Les compteurs GPU Windows par processus sont accessibles ; disponibilité et limites
  enregistrées dans les mesures, sans extrapolation énergétique.
- Ancienne réplication du stock JSON global vers une première société : désormais neutralisée
  dans le profil essentiel, sans confondre cette tâche et les ventes/stock Prisma.

## Résultats nouveaux et données

- **518 unités** (277 backend / 177 web / 64 POS), **178 intégrations PostgreSQL**,
  **28 parcours Chrome** dans dix fichiers ; zéro échec/ignoré. Banques et IA remplacées.
- Cinq applications compilées en métier et en complet, trois tests de garde/hôte/livrables,
  12 tests d'outils, 23 du comparateur ; 100 identifiants et huit contrôles du générateur métier.
- Restauration 19:32 UTC : **79 tables, 8 fichiers et 17 PDF égaux**, AES-GCM et clé séparée,
  17 contrôles après redémarrage. 3 721 ms sur cette copie, pas un RTO. 34 migrations inchangées.
- Données restaurées peuplées : 7 allocations, 14 groupes, 21 affectations de règlement.
- 99 fichiers de jeux récupérés et vérifiés depuis le commit immuable de base. Aucune
  suppression GitHub. Raccourci Bureau vérifié, lanceur `-NoBrowser` exécuté, pas de clic physique.
- Windows / Node 22.19 / PostgreSQL 16.15 loopback:5450 ; copies `creorga_local` et `creorga_tests`,
  ports 3002/5174/5175/5177/5178. Profil métier laissé actif, configurations et clés hors Git.

**Incident déclaré :** deux dumps de rotation du laboratoire ont été supprimés par une seconde
rétention avant sa correction. 27 dumps absents retrouvés dans 36 ZIP du jour sont récupérés
séparément avec empreintes vérifiées. Les noms des deux suppressions n'étaient pas journalisés :
correspondance exacte non démontrable. Archives originales hors laboratoire intactes. Rétentions
ZIP et dump désormais désactivées en mode essentiel, avec deux non-régressions supplémentaires.

## Ressources, limites et reprise

Périmètre CréOrga + PostgreSQL + Chrome neuf : somme des working sets 2 296,79 → 1 719,27 MiB
(−25,14 %), processus 40–44 → 28, relance CLI chaude 4 278 → 3 040 ms. Le complet compilé est à
1 533,97 MiB : aucun gain causal de RAM attribué aux seuls jeux. CPU/GPU observés à zéro sur
courte fenêtre ne prouvent pas une consommation nulle. Pas de wattmètre. Modules se dégrade
sur les cinq valeurs p95 : 490,64 → 868,40 ms ; pas d'accélération universelle revendiquée.

Matrice **54 PASS / 0 FAIL / 45 BLOCKED / 1 NOT RUN** inchangée. T100 reste partiel :
3 680 contrôles source ne sont pas autant de clics/rôles testés. Pas de matériel thermique,
banque officielle, PayPal sandbox officiel, paie/calendrier légal, voix réelle, Android qualifié,
installation vierge ou restauration cloud. OCR global ancien et sauvegardes clients restent
fermés ; Stripe Refunds et vidéo désactivés. **CréOrga n'est pas qualifié pour production.**

Retour au complet : arrêter uniquement les PID validés, puis
`node ../local-2.0/start-profile.mjs --full` (même code récent). Aucune purge ni migration.
Incident : arrêter les écrivains, conserver l'état, restaurer dans une nouvelle base et comparer
tables/fichiers/PDF avant reprise. Ne pas remettre un ancien POS en écriture sur la base migrée.

**Prochaine action :** poursuivre T100 par écran/rôle, profiler Modules et le snapshot de salle
sur jeu figé, qualifier les réglages/calendriers planning et les blocages logiciels restants.
[Rapport et preuves](PROFIL-PROFESSIONNEL-SANS-JEUX.md), [rollback](MIGRATION-REPRISE-ROLLBACK.md).
