# Sauvegarder une ancienne caisse dans son navigateur

Outil autonome `/recovery.html` dans les builds web et POS. Il n'hydrate pas le magasin de caisse,
n'enregistre pas de service worker et n'appelle aucune API métier.

1. Arrêter la saisie, fermer les autres onglets CréOrga et conserver le profil d'origine.
2. Ouvrir l'outil sur l'origine exacte de l'ancienne caisse : protocole, domaine et port.
   `localhost:5175` et `127.0.0.1:5175` sont distincts. Un fichier local ne peut pas lire un site.
   Un ancien domaine retiré exige une reprise accompagnée ; ne pas changer le DNS pour le simuler.
3. Préparer puis télécharger archive AES-256-GCM et clé privée. Déplacer la clé dans un espace
   privé séparé. Ces données peuvent contenir des PIN et jetons historiques : aucun fichier dans GitHub.
4. Relire les deux fichiers téléchargés pour vérifier déchiffrement et empreintes. Répéter pour
   chaque navigateur, profil, appareil et origine. Un export vide ne valide pas les autres.

Sources : clés historiques de caisse, ventes imbriquées dans les clôtures, chaises, brouillons et
références de paiements ; IndexedDB `creorga-offline/queue` ; caches CréOrga à `/__queue__`,
`/legacy-queue-*` et `/api/*`. LocalStorage garde ses chaînes brutes même si leur JSON est corrompu.
Les types IndexedDB non préservables en JSON sont refusés. Les caches conservent corps et empreintes.

Limites : 32 Mio, 10 000 anciennes requêtes ; ni autres origines ni cookies HttpOnly. IndexedDB
est lu en transaction readonly. CacheStorage n'a pas de poignée readonly : seuls les caches déjà
inventoriés sont ouverts, sans put/delete, puis deux lectures sont comparées. La quiescence est
nécessaire ; pas de transaction atomique entre stockages. HTTPS ou localhost avec WebCrypto requis.

Aucune société fiable, écriture comptable ou preuve bancaire n'est déduite. Aucun import/rejeu
automatique. Rapprocher les ventes avant migration. Les fixtures vérifiées le 16 octobre ne
prouvent pas la récupération des profils réels.

Test depuis `apps/web` : `node ../../node_modules/vitest/vitest.mjs run src/lib/browser-recovery.test.ts`.
Sources : [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt),
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/databases).
