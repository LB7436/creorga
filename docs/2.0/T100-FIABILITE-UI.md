# T100 — Fiabilité des écrans métier

Lot local après `f198c98`, sans déploiement ni paiement réel. Ce document ne constitue pas la validation des 3 680 contrôles inventoriés : il décrit uniquement les parcours ci-dessous. Les comptes et images utilisés sont fictifs ; aucun profil navigateur historique n'est ouvert.

## Carte des états et des actions

| Écran / périmètre | État et autorité | Actions contrôlées | Risque ciblé | Statut de recette |
|---|---|---|---|---|
| En-tête / identité | `authStore`, cookie serveur, cache React Query par génération | Déconnexion au clavier, rechargement, refus HTTP | Déconnexion visuelle sans révocation du cookie | PASS ciblé Chrome, cookie réel et 503 simulé |
| Modules et réglages Mobile | Même flux de révocation ; reset destructif désactivé | Déconnexion au clavier, reset non interactif, rechargement | Déconnexion seulement locale ou effacement du marqueur | Trois unités RED → GREEN ; PASS ciblé Chrome |
| En-tête / société active | Adhésions reçues de l'API ; `setActiveCompany` et frontière de contexte existante | Choix explicite A/B, annulation, changement de rôle, rechargement | Contexte ou rôle d'une autre société | PASS ciblé Chrome et refus API réels |
| Portail / mur photos | Stockage navigateur, sans envoi serveur ni sauvegarde métier | Ajout de fixture image, affichage, filtrage, rechargement, retrait volontaire | Cache global d'un autre compte ou d'une autre société | 8 unités GREEN ; PASS ciblé Chrome |
| Stock | API PostgreSQL, état local de formulaire | Saisie, perte de focus, sauvegarde et rechargement | Faux succès ou réécriture d'un ancien stock | PASS réel propriétaire A ; refus historique à relancer dans la campagne existante |
| Commandes fournisseurs | API PostgreSQL, projections de lecture | Réception, double clic, refus, reprise et réponses désordonnées | Demande de réception répétée, projection ancienne | Deux défauts RED → GREEN Chrome ; réception réelle également vérifiée |

Les modules, la salle et le portail bénéficient déjà des frontières `authDataScope` et du remontage `ScopedQueryProvider`. Ces protections ne sont pas réimplémentées ici.

## Limites à conserver explicitement

- Un contrôle d'interface n'est pas une autorisation serveur. Les droits se vérifient directement sur l'API avec les adhésions réelles de comptes de laboratoire.
- Une prévention du double clic dans Chrome ne remplace pas l'idempotence de réception en base : ce point appartient également à la recette backend.
- Le mur photos est une fonction **locale au navigateur**. Il ne constitue pas une sauvegarde serveur, un document RH ou un album partagé entre salariés.
- Le cloisonnement de l'album est un contrôle d'affichage et de mutation du client, **pas un chiffrement** du profil Windows. Ne pas y placer de documents RH ou de photographies sensibles sur un poste partagé. Un utilisateur ayant accès aux outils du navigateur ou au profil disque peut lire son stockage local.
- Les caches anciens non attribuables restent conservés, mais ne sont ni affichés ni importés automatiquement dans une société nouvelle.
- Les refus HTTP et retards contrôlés de Chrome sont des incidents simulés, pas des pannes de production ni des preuves matérielles.

## Corrections implémentées

- `AppShell` utilise `useLogout` et son endpoint serveur. **Dès la demande, l'accès local est verrouillé, l'identité et le token disparaissent, le cache d'affichage est vidé.** Le marqueur persistant `logoutRevocationPending` ne contient aucun secret. Si le serveur refuse, la page de connexion annonce « révocation serveur non confirmée » et propose une nouvelle tentative ; aucune ancienne identité ni reconnexion implicite après rechargement. Une connexion explicite n'est possible qu'après confirmation de la révocation. Les brouillons locaux attribués restent conservés/quarantainés, sans purge de profils historiques.
- Les déconnexions du sélecteur Modules et des réglages Mobile rejoignent le même flux. Plus de redirection de déconnexion vers `/m/demo`. Le « Reset complet » qui effaçait auth/préférences/historique est désactivé et annoncé « Réinitialisation locale — procédure de reprise requise » ; aucune purge ni effacement du marqueur pending.
- Sélecteur natif « Société active » limité aux adhésions actives reçues, avec confirmation explicite avant changement. Il réutilise la frontière et le recalcul de rôle existants. Les adhésions inactives ne peuvent plus être sélectionnées via le store non plus. Le serveur reste l'autorité de droits.
- Le mur photos utilise `creorga-photo-wall-scoped-v1`, albums attribués au compte, à la société et à la vue/au rôle. Le cache ancien `creorga-photo-wall` reste intact et en quarantaine. Une lecture de fichier terminée après un changement de contexte n'est pas affectée au nouveau compte, y compris après A → B → A.
- Aucune troncature automatique à 50 photos dans les nouveaux albums. Un refus de quota est signalé avant affichage de la photo en mémoire ; aucune suppression d'autres photos n'est tentée. Le bouton de retrait volontaire a un nom accessible.
- Une réception fournisseur en attente verrouille immédiatement le bon concerné, y compris avant rerendu React. Les lectures d'inventaire sont numérotées ; une ancienne réponse ne peut plus remplacer la dernière projection demandée.
- La saisie de stock pendant un PUT était déjà désactivée. Ce candidat de défaut **n'a pas été confirmé** ; aucun changement arbitraire de ce comportement n'est ajouté. Le refus serveur qui restaure la valeur stock confirmée reste couvert par le test existant.

Le marqueur protège la page et ses rechargements. Ce lot ne prétend pas révoquer instantanément tous les JWT d'accès déjà émis ni garantir la fermeture de toutes les autres fenêtres connectées : les contrôles inter-onglets/serveur plus larges restent distincts. Le cookie de refresh est réellement supprimé/révoqué lorsque le endpoint confirme. Une coupure réseau n'est jamais appelée « révocation réussie ».

## Exécution et preuves

Reproductions réellement observées sur l'ancien livrable compilé `f198c98` :

1. Déconnexion au clavier : le refresh est **200 avant**, puis encore **200 après** la déconnexion visuelle, au lieu de 401. Ce test effectue une vraie connexion depuis le formulaire, sur la même origine que le cookie.
2. Refus simulé de déconnexion : aucun avertissement serveur n'est visible et la navigation quitte le contexte.
3. Une photo ancienne non attribuable apparaît dans le portail du compte actuel.
4. L'ajout/filtrage/rechargement de la photo fonctionne, mais le bouton de retrait n'a pas de nom accessible par photo.
5. Double clic « Réceptionner » : deux requêtes PUT sont envoyées (le serveur disposait déjà de sa protection transactionnelle).
6. Une ancienne lecture libérée après la réception récente fait réapparaître un bon non réceptionné.
7. Aucun sélecteur de société n'est présent dans l'en-tête.

Le premier essai de révocation utilisait un cookie API sur `127.0.0.1` et une interface sur `localhost`. Son résultat était un **faux positif de test, exclu des preuves de révocation**. Le test a été corrigé et réexécuté : login réel de Chrome, refresh 200 préalable, puis reproduction du défaut. Une tentative intermédiaire a été bloquée par le limiteur normal ; le profil API privé a ensuite été redémarré, PostgreSQL conservé et limiteur non désactivé.

Unités nouvelles : 8 mur photos, 6 déconnexion, 2 choix d'adhésion, 3 entrées Modules/Mobile/reset : **19 GREEN** après RED. Premier RED : 9 échecs et 3 succès ; un cas de quota ajouté ensuite a échoué avant correction. La politique finale de verrouillage immédiat a ensuite été testée : 5 échecs et 1 succès avant implémentation, puis 6 succès. Les entrées Modules/Mobile ont été rendues avec React et leurs handlers réellement exécutés vers l'adaptateur HTTP de laboratoire : zéro requête de révocation avant correctif, une après ; reset actif avant, désactivé après. Ce n'est **pas** un Chrome RED distinct.

La suite web complète est maintenant relancée : **207 PASS / 0 FAIL / 0 SKIP, 28 fichiers**, incluant les autres chantiers du lot. Une première relance root avait trouvé une régression de harnais : le test SSR `mobileAvailability` ne fournissait pas le QueryClient requis par la déconnexion réelle. Il a été corrigé avec un vrai `QueryClientProvider`, sans retirer les assertions biométriques ; cible 4/4 puis suite complète 207/207.

Des avertissements Zustand de stockage absent ont été observés dans les anciennes suites Node sans DOM, et React avertit de l'usage SSR de hooks d'affichage dans le harnais des handlers ; ils ne sont pas présentés comme une recette navigateur.

Première tentative Chrome après compilation : **1 PASS / 9 échecs de recette, non qualifiés PASS**. Deux préconditions du harnais ont été corrigées : la reprise de révocation remonte la page Login et exige une ressaisie réelle des identifiants ; la page Modules d'un profil Chrome neuf exige son marqueur local d'onboarding. Aucune donnée de société n'est modifiée pour ce marqueur de test. Les sept autres cas étaient bloqués au login par le limiteur normal : il compte aussi les routes refresh/logout, pas uniquement les mots de passe. La relance est segmentée avec redémarrage propre de l'API privée entre groupes, PostgreSQL et limiteur conservés. Le premier rapport non qualifié est conservé séparément.

Relance finale réellement exécutée : **10 PASS / 0 FAIL / 0 SKIP** dans Chrome. Les trois déconnexions utilisent une connexion réelle au formulaire et un refresh 200 préalable ; après confirmation du logout, le refresh est 401. Le cas 503 garde l'accès local verrouillé après rechargement, n'envoie aucun refresh implicite ni nouveau login, puis réessaie la révocation et exige une connexion explicite.

Le parcours métier réel, uniquement dans la société fictive A, crée un fournisseur et un article, sauvegarde le stock à 12,5, crée un bon de 4 unités à 2 € (8 €), reçoit le bon et retrouve **16,5 en base et après rechargement**. Une tentative sur le même ID avec la société B est refusée 404, sans changement du stock A. Le refus de l'API propriétaire pour le rôle salarié B et les refus des sociétés inactive C/inconnue sont également réellement exécutés. La politique générale de droits stock des salariés n'est pas modifiée ni déduite de ces résultats.

Une relance intermédiaire segmentée a validé neuf parcours, puis trouvé un sélecteur de test trop strict (`getByLabel` du fournisseur). Le rôle Chrome « combobox Fournisseur » était bien présent ; le harnais utilise maintenant ce rôle accessible. L'ensemble des dix parcours a ensuite été réexécuté avec succès. Le fournisseur fictif créé lors de l'essai incomplet est conservé, pas purgé.

[Preuve JSON minimale et sanitisée](preuves/fiabilite-ui-2026-10-17.json) : titres, statuts, durées et limites, sans comptes, mots de passe, tokens, QR privés ou captures de données. La durée cumulée Playwright est **18,08 s hors redémarrages API** ; ce n'est ni une mesure de performance métier ni le temps total de la campagne. Pas de baseline visuelle ni de qualification WCAG globale : les contrôles clavier portent uniquement sur les actions citées.

Commandes de reproduction (depuis la racine du dépôt) :

```powershell
npm run test --workspace=apps/web
node ../local-2.0/run-reliability-ui-segmented.mjs
```

Le second lanceur est **privé au laboratoire** : il lit uniquement les comptes fictifs locaux, utilise un profil Chrome neuf, bloque les destinations non locales, redémarre seulement l'API privée entre cinq groupes et produit un rapport distinct des anciennes preuves. Aucun scénario hors de ce périmètre n'est annoncé PASS.
