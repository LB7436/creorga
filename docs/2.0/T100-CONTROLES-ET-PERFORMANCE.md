# T100 — contrôles, erreurs visibles et sauvegarde de salle

Complément ultérieur du même jour après `962c01b` :
[profil métier et corrections](PROFIL-PROFESSIONNEL-SANS-JEUX.md), code `9e15b1a`.
**518 unités / 178 PostgreSQL / 28 Chrome**, nouveau scan 399 fichiers / 3 680 contrôles /
157 routes / 826 gabarits dans [la preuve courante](preuves/business-only-validation-2026-10-16.json).
Les entrées [du nouvel inventaire](preuves/business-only-inventaire-t100-2026-10-16.jsonl) restent
NOT RUN ; jeux classés profil complet. La série HTTP ci-dessous conserve sa date et son jeu,
elle n'est pas réattribuée à l'absence de jeux. T100 global demeure NOT RUN / partiellement exécuté.

16 octobre 2026. Base de reprise vérifiée : `c0ddd81eba5ea006af023ec4748d961d44337470`,
`LB7436/creorga`, branche `codex/creorga-2-0-2026-10-08`.
Ce lot améliore des parcours existants ; il ne réimplémente pas les avoirs, paiements ou clôtures.
**Laboratoire seulement. T100 global reste NOT RUN, partiellement exécuté. Pas de qualification de production.**

Commits de code :

- [`245731f`](https://github.com/LB7436/creorga/commit/245731f81f64b4acf481875d576f0e206d6fdaac) — indexation cuisine.
- [`de37329`](https://github.com/LB7436/creorga/commit/de3732982eb571d44903a3c92fec33acbceff6fc) — intégrité et gestes POS.
- [`959ffec`](https://github.com/LB7436/creorga/commit/959ffec50889dd7734d504c6799a1ab71bb935fa) — cloisonnement, destinations API et erreurs web.

Le commit documentaire suivant contient les outils d'inventaire, les preuves et ce rapport.

## Inventaire reproductible, pas un verdict déduit du code

`scripts/audit-ui-controls.mjs` analyse le JSX par AST TypeScript dans web, POS, guest,
superadmin et marketing, y compris les contrôles imbriqués, handlers, gabarits répétés et routes.
L'inventaire initial relevait 3 666 contrôles ; après corrections : **3 676 contrôles, 157 routes
JSX, 393 fichiers et 826 gabarits répétés**, aucun diagnostic de parsing ; détails dans
[la preuve de validation](preuves/t100-validation-2026-10-16.json).
Chaque entrée possède un identifiant, fichier/ligne, libellé réduit, fonctions appelées,
attributs dynamiques et raisons de vérification manuelle. Valeurs de champs, arguments des handlers,
adresses email et paramètres sensibles des liens sont exclus/expurgés.

[Inventaire source JSONL](preuves/t100-inventaire-source-2026-10-16.jsonl) : première ligne de
métadonnées, puis routes et contrôles. **Toutes les entrées statiques restent NOT RUN** ; les preuves
des parcours exécutés sont séparées. Un gabarit `map` n'est pas une liste d'instances testées.
Le scan inclut aussi du code conditionnel/inactif : il ne prouve ni l'accessibilité réelle ni
l'exhaustivité des menus produits selon chaque rôle. Les routes dynamiques, props propagées,
dialogues et variantes nécessitent encore une recette navigateur.

## Corrections livrées

| Référence | Défaut / correction | Preuve et portée |
|---|---|---|
| PERF-01 | Recherche quadratique dans le journal cuisine pour chaque groupe ; index en une passe, état et horloges de préparation conservés | Unitaire 300 préparations, PostgreSQL et comparaison HTTP appariée |
| POS-01 | Import malformé retirant les tables avant validation ; validation intégrale puis publication atomique | RED puis GREEN Chrome ; PUT intercepté pour ne jamais sauvegarder le plan vidé |
| POS-02 | Historique prémutation et copie financière périmée ; snapshots géométriques, lecture après mutation, préservation des commandes courantes | Unités et Chrome avec réponse serveur fictive ; géométrie + acompte conservés |
| POS-03 | Ancien drag non opérant dans le rendu observé, handler reconstruisant une seule unité au prix catalogue ; nouvel accès explicite réutilisant la séparation serveur | Chrome + PostgreSQL réels du laboratoire : 3 unités à 3,30 € / TVA 3 malgré catalogue 9,90 € / TVA 17 ; refus 503 sans perte. Aucune ancienne perte d'argent en exploitation n'est revendiquée |
| POS-04 | Transfert de plan annonçant un succès sans action ; API existante raccordée, confirmation et geste consommé une fois | Chrome à frontière simulée : annulation, refus, reprise avec même identifiant ; pas preuve bancaire |
| POS-05 | Polling réarmant l'inactivité ; dépendances et callback stables | Chrome avec horloge accélérée et véritable bootstrap local |
| POS-06 | Clic de relâchement après appui long pouvant ajouter avant validation ; clic consommé | Chrome à frontière simulée : annulation zéro, clic court un, note ajoutée une fois |
| POS-07 | Raccourcis sans connecteur, stations personnalisées, division et impression du mode serveur semblant disponibles | Actions non reliées désactivées et raisons affichées ; ce n'est pas une implémentation du connecteur |
| WEB-01 | Jeton joint à une destination libre ; autorisation d'origine avant envoi axios/fetch, redirections fetch refusées | 8 unités + Chrome ; requêtes externes surveillées/interdites, aucune connexion externe |
| WEB-02 | Conversations globales et réponse tardive dans la discussion courante ; portée utilisateur/société/session et conversation capturée | Unités multi-identités/sociétés ; Chrome sur changement de discussion et persistance après rechargement |
| WEB-03 | Mode thinking non libéré, confirmation HTTP refusée transformée en succès | Unités + vrais boutons Chrome : voix coupée, 409, double clic, résultat réseau inconnu bloqué |
| WEB-04 | PDF proposé mais octets non transmis ; lecture éphémère réelle JPEG/PNG/WebP/PDF, une pièce par requête | Chrome compare les octets fictifs transmis ; analyse IA simulée, aucun résultat IA réel revendiqué |
| WEB-05 | Contrôles d'alertes en panne présentés comme absence d'incident | Chrome : panne totale, résultat partiel puis trois contrôles vides confirmés |
| WEB-06 | Personnalisation sous des clés mortes, fausse protection biométrique financière | Préférences du vrai store, test Chrome après rechargement ; fonctions absentes annoncées indisponibles |
| WEB-07 | Erreur publicitaire silencieuse / saisie perdue et actions réentrantes | Chrome avec POST 503 fictif : message visible et formulaire conservé ; verrou partagé de mutation |
| WEB-08 | Stock refusé laissant la valeur non enregistrée affichée, PUT au simple blur | Chrome avec PUT 403 fictif : valeur confirmée rétablie, erreur visible, aucun PUT inchangé |

Les prix/quantités historiques ne sont pas recalculés par l'interface de transfert. Les cas
financiers ambigus restent soumis aux refus du domaine existant : aucun contournement ajouté.
Le mode serveur n'imprime pas de ticket ni ne route réellement bar/cuisine par sa simple sélection.
Les préparations existantes sont synchronisées, pas prétendues physiquement réalisées.

Les historiques Robi non attribuables sont conservés en quarantaine non affichée, sans les
attribuer arbitrairement au prochain utilisateur. Les pièces jointes nouvelles restent en mémoire,
leurs octets ne sont pas persistés dans les historiques. Le stockage navigateur n'est pas un coffre
chiffré protégeant contre un accès physique au même profil ; aucun ancien profil n'a été ouvert.

## Performance : comparaison réellement appariée

[Mesures HTTP réduites](preuves/profil-http-t100-2026-10-16.json), même empreinte sémantique :
726 produits, 251 tables, 650 groupes et 1 250 lignes. Quatre échauffements puis dix sauvegardes
complètes `PUT /api/pos/draft` dans chaque série ; mêmes instruments Prisma/CPU/IO.

| Mesure | Avant | Après |
|---|---:|---:|
| p95 HTTP, calcul au rang supérieur | 2 605,46 ms | 1 703,63 ms |
| Médiane | 2 427,99 ms | 1 488,56 ms |
| CPU propre `syncKitchenTickets`, total des dix requêtes | 8 995 ms | 60 ms |

Gain p95 de **34,61 %** sur ce jeu. Le test de complexité échouait à 90 000 lectures pour
300 groupes ; il impose désormais une borne linéaire tout en conservant contenu/état/auteur/date.
La sauvegarde reste coûteuse : snapshot JSON global, projections, sérialisation et lectures
répétées des soldes demeurent. L'optimisation n'a retiré ni `fsync`, ni contrôle de révision,
ni transaction, ni validation de droits, ni journal de préparation.

Séries mono-utilisateur loopback, instrumentées, sans builds/tests concurrents ; tâches de fond
locales conservées. Dix valeurs ne qualifient pas une charge de service ni un objectif contractuel.
Ne pas comparer directement aux anciens 2 060 / 2 420 ms obtenus sur d'autres jeux et conditions.
La nouvelle série de recette Chrome est une autre mesure, pas la comparaison appariée ci-dessus.
À 18:36 UTC, cette série donne **2 091,84 ms au p95 HTTP** sur 730 produits / 258 tables /
1 254 lignes, sans erreurs JavaScript ; mesures complètes dans `browserPerformance` de la preuve.
La fenêtre ciblée tient à 375/768/1440 pixels. Ce résultat ne doit pas être remplacé par 1 703,63 ms
dans un compte rendu de cette seconde série : jeux, instrumentation et clients différents.

## Validation et limites

Résultats frais, dates, noms et statuts dans [t100-validation](preuves/t100-validation-2026-10-16.json).
**450 unités (272 backend / 114 web / 64 POS), 173 intégrations PostgreSQL, 21 parcours Chrome
dans huit fichiers : zéro échec/ignoré.** Cinq compilations réussies ; avertissements de gros
bundles conservés. Douze tests d'outils et 23 autocontrôles du comparateur de restauration réussis.
Les tests de frontière simulée portent explicitement ce nom. PostgreSQL, fichiers et PDF sont
vérifiés séparément lors de [la restauration locale](preuves/restauration-t100-2026-10-16.json).
À 18:39 UTC : 79 tables, 8 fichiers, 9 PDF facture et 8 PDF avoir identiques ; AES-GCM/clé séparée,
17 contrôles de reprise ; 3 221 ms sur cette copie, pas un RTO.
Les anciens rapports restent historiques et ne deviennent pas de nouvelles exécutions.

La première reproduction a permis d'écarter des défauts de test : attente de boîte de dialogue
créant un deadlock, sélecteur ambigu et seconde instance du store importée directement via Vite.
Les tests finaux utilisent les véritables boutons. Un rouge de fixture n'est pas compté comme un
défaut métier corrigé, et aucun PASS n'est obtenu en ignorant une assertion.

Pas de baseline visuelle nouvelle, d'audit WCAG complet, de lecteur d'écran matériel, de preuve
micro/haut-parleur ou de toutes les langues. Les contrôles responsive/clavier/contraste ciblés
déjà présents sont conservés ; ils ne valident pas toute l'interface.

## Reproduire sans environnement réel

Depuis un clone installé :

```powershell
node --test tests/recipe/*.test.mjs
node scripts/audit-ui-controls.mjs --output=<inventaire-prive.json>
node scripts/verify-restored-copy.mjs --self-test
node scripts/render-business-recipe.mjs --self-test
```

Les suites backend s'exécutent avec les gardes de laboratoire documentées. Le lanceur privé
`local-2.0/run.mjs` retire `DATABASE_URL` pour les unités et utilise uniquement `creorga_tests`
pour les intégrations. `run-browser-lab.mjs` prend un compte `.invalid`, lance Chrome neuf,
interdit les origines externes et redémarre uniquement l'API privée entre fichiers : limiteur
normal conservé. Les tests publics sont dans `tests/browser-lab`, les comptes jamais dans Git.

```powershell
node ../local-2.0/run.mjs backend-unit --reporter=json --outputFile=../../../local-2.0/t100-backend-unit.json
node node_modules/vitest/vitest.mjs run --root apps/web --reporter=json --outputFile=../../../local-2.0/t100-web-unit.json
node node_modules/vitest/vitest.mjs run --root apps/pos --reporter=json --outputFile=../../../local-2.0/t100-pos-unit.json
node ../local-2.0/run.mjs integration --reporter=json --outputFile=../../../local-2.0/t100-integration.json
node ../local-2.0/run-browser-lab.mjs
node scripts/render-t100-evidence.mjs ../local-2.0 2026-10-16T18:00:00Z
```

Une machine différente doit préparer ses propres bases, secrets et sociétés fictives avec la
procédure de reprise, pas copier une configuration privée ni lancer un seed sur une base réelle.

## Priorités restantes

1. Poursuivre T100 contrôle par contrôle, rôles et états réseau inclus. Raccorder les preuves
   dynamiques aux identifiants source sans transformer le scan statique en test exécuté.
2. Reproduire puis corriger les candidats statiques : caches de préférences/modules au changement
   de société, réponses de configuration portail désordonnées, QR de configuration permanent,
   saisie légale pendant sauvegarde, planning nocturne, simulation RH, erreurs superadmin.
   Ces candidats ne sont pas annoncés comme des échecs navigateur confirmés.
3. Définir un protocole de sauvegarde différentielle de salle/projections groupées après mesure,
   avec monotonie des réponses, conflits, reprise et finance préservée. Pas de patch global aveugle.
4. Exécuter les 45 scénarios métier BLOCKED selon leur catégorie : fonctions manquantes,
   prestataires/matériel externes, reprise historique autorisée. Thermique, banques et vidéo
   ne sont pas rendus disponibles par ce lot.

Aucun déploiement, changement DNS, paiement réel, activation Stripe Refunds/vidéo,
modification de profil historique ou d'archive originale. Aucun nouveau schéma/migration SQL.
Retour arrière et reprise : voir [la procédure](MIGRATION-REPRISE-ROLLBACK.md).
