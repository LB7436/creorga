# Guide de déploiement Creorga OS

Ce document décrit la procédure complète pour déployer Creorga OS sur Vercel, de la configuration initiale jusqu'à la mise en production sur le domaine `creorga.lu`.

## 1. Prérequis

- Node.js 20.x ou supérieur
- npm 10.x ou supérieur
- Un compte Vercel (https://vercel.com)
- Vercel CLI installé : `npm i -g vercel`
- Un compte GitHub avec le dépôt `creorga` accessible
- Accès au registraire du domaine `creorga.lu`

## 2. Configuration initiale du compte Vercel

1. Créer un compte sur https://vercel.com (ou se connecter avec GitHub).
2. Créer une organisation (Team) nommée `creorga` (plan Pro recommandé pour le support de domaines multiples).
3. Depuis le dashboard, cliquer sur **Add New Project** → **Import Git Repository**.
4. Sélectionner le dépôt `creorga`.
5. Créer **deux projets séparés** depuis le même dépôt :
   - `creorga-app` → Root directory : `apps/web`
   - `creorga-marketing` → Root directory : `apps/marketing`

## 3. Variables d'environnement

Ajouter les variables suivantes dans **Project Settings → Environment Variables** (cocher Production, Preview et Development selon les besoins).

### Application principale (`creorga-app`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de l'API backend | `https://api.creorga.lu` |
| `VITE_APP_ENV` | Environnement | `production` |
| `VITE_SENTRY_DSN` | DSN Sentry (monitoring) | `https://...@sentry.io/...` |
| `VITE_POSTHOG_KEY` | Clé PostHog (analytics) | `phc_...` |
| `VITE_POSTHOG_HOST` | Hôte PostHog | `https://eu.i.posthog.com` |
| `VITE_STRIPE_PUBLIC_KEY` | Clé publique Stripe | `pk_live_...` |
| `VITE_MAPBOX_TOKEN` | Token Mapbox (si cartes) | `pk.eyJ...` |
| `VITE_VAPID_PUBLIC_KEY` | Clé publique push notifications | `B...` |

### Site marketing (`creorga-marketing`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_APP_URL` | URL de l'app principale | `https://app.creorga.lu` |
| `VITE_CONTACT_EMAIL` | Email de contact | `hello@creorga.lu` |
| `VITE_PLAUSIBLE_DOMAIN` | Domaine Plausible | `creorga.lu` |

### Variables secrètes (backend, non dans Vercel front)

À configurer uniquement sur l'API backend :
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `SESSION_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- `VAPID_PRIVATE_KEY`

## 4. Configuration des domaines

### 4.1 DNS chez le registraire

Configurer les enregistrements DNS suivants chez votre registraire (OVH, Gandi, etc.) :

```
# Site marketing (apex)
creorga.lu         A       76.76.21.21
www.creorga.lu     CNAME   cname.vercel-dns.com.

# Application
app.creorga.lu     CNAME   cname.vercel-dns.com.

# API (backend, pointé vers votre infrastructure)
api.creorga.lu     CNAME   <votre-backend>.example.com.
```

### 4.2 Rattachement côté Vercel

- Projet `creorga-marketing` → ajouter `creorga.lu` et `www.creorga.lu` (définir `creorga.lu` comme primaire).
- Projet `creorga-app` → ajouter `app.creorga.lu`.

Vercel émet automatiquement les certificats SSL via Let's Encrypt.

## 5. Pipeline CI/CD

Vercel déploie automatiquement à chaque push :

- Push sur `main` → **Production** (creorga.lu, app.creorga.lu)
- Push sur autre branche → **Preview** (URL unique par commit)
- Pull Request → Preview avec commentaire automatique sur GitHub

### 5.1 Vérifications avant merge

Recommandé : activer dans **Project Settings → Git** :
- Ignored Build Step : utiliser le script par défaut pour éviter les builds inutiles
- Comments on Pull Requests : activé

### 5.2 Déploiement manuel (CLI)

```bash
# Depuis la racine du monorepo
cd apps/web
vercel            # Preview
vercel --prod     # Production
```

### 5.3 Checks automatiques

Activer les intégrations :
- **Checkly** ou **Vercel Checks** pour les tests E2E post-déploiement
- **Lighthouse CI** via GitHub Actions pour surveiller les Core Web Vitals

## 6. Procédure de rollback

### 6.1 Rollback via le dashboard (le plus rapide)

1. Aller sur https://vercel.com/creorga/creorga-app/deployments
2. Identifier le dernier déploiement de production stable
3. Cliquer sur `⋯` → **Promote to Production**
4. Confirmer. Le rollback est effectif en moins de 10 secondes (pas de rebuild).

### 6.2 Rollback via CLI

```bash
vercel rollback <deployment-url> --token=$VERCEL_TOKEN
```

### 6.3 Rollback par revert Git

Si le problème vient du code :

```bash
git revert <commit-fautif>
git push origin main
```

Vercel redéploie automatiquement.

### 6.4 Post-mortem

Pour chaque incident en production :
1. Documenter dans `docs/postmortems/YYYY-MM-DD.md`
2. Ajouter un test de non-régression
3. Revoir la procédure de déploiement si nécessaire

## 7. Monitoring post-déploiement

- **Vercel Analytics** : activé par défaut (Web Vitals)
- **Sentry** : erreurs frontend et backend
- **Uptime Robot** / **Better Uptime** : surveillance externe de creorga.lu et app.creorga.lu
- **PostHog** : comportement utilisateur et entonnoirs de conversion

## 8. Checklist de mise en production

- [ ] Toutes les variables d'environnement renseignées en Production
- [ ] DNS propagés (vérifier avec `dig creorga.lu`)
- [ ] SSL actif sur tous les domaines
- [ ] Sitemap.xml accessible sur https://creorga.lu/sitemap.xml
- [ ] robots.txt accessible sur https://creorga.lu/robots.txt
- [ ] PWA installable (tester sur mobile iOS et Android)
- [ ] Service Worker fonctionnel (mode offline testé)
- [ ] Lighthouse score > 90 sur mobile
- [ ] Sentry reçoit les événements test
- [ ] Sauvegarde base de données programmée
- [ ] Documentation équipe à jour

## 9. Support

- Équipe technique : `tech@creorga.lu`
- Astreinte production : voir `ONCALL.md`
- Statut Vercel : https://www.vercel-status.com
