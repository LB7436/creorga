# Dépendances — contrôle du 8 octobre 2026

Installation locale sous Node 22.19.0. npm 10.9.3 a échoué dans son résolveur (`edgesOut`) ;
l'installation a abouti avec `npx --yes npm@11.21.0 install --ignore-scripts`, sans remplacement
global de npm. Client Prisma généré séparément. Ne pas présenter l'échec intermédiaire comme validé.

Mises à jour ciblées : Vite 6.4.4, Capacitor 8.5.3, Vitest 4.1.11, Stripe 23,
Nodemailer 10.0.16, bibliothèques d'archives/images/HTTP et dépendances transitives.
Le lockfile fait référence pour les versions exactes. Nodemon inutilisé supprimé.
Développement Vite limité au loopback ; APK Android et matériel non qualifiés.

Derniers contrôles : `npm audit --omit=dev --json` : **0 alerte connue**.
`npm audit --json` : **11 alertes** (1 faible, 5 modérées, 5 élevées), aucune critique.
Elles concernent notamment la chaîne Tailwind 3/fast-glob/chokidar/micromatch/braces,
postcss-nested/selector, esbuild et Capacitor CLI xcode/uuid. L'exploitabilité de chacune
dans ce projet n'est pas entièrement qualifiée. Ne pas les ignorer sur un serveur de
développement exposé ou une construction recevant des entrées non fiables.

Pas de `npm audit fix --force` : une migration Tailwind majeure doit préserver les interfaces
et être testée séparément. Zéro alerte de production n'exclut pas les défauts du code.

Sources primaires consultées :

- [Avis Capacitor WebView](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv).
- [Avis Vite sous Windows](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff).
- [Guide de migration Vite](https://vite.dev/guide/migration).
