# 🔍 Rapport QA intégral Creorga — 2 juillet 2026

## Méthodologie
Audit automatisé Playwright (Chrome) : connexion réelle, puis sur **chacune des 35 pages**
de l'app web, clic sur chaque bouton/lien visible (dédupliqué, hors actions destructives)
avec mesure de la réaction réelle : navigation, ouverture de modale, mutation du DOM,
requête réseau. Capture des erreurs JavaScript, des appels API en échec (4xx/5xx),
des écrans blancs et des redirections. En parallèle : audit API (41 flux critiques)
et vérification des 5 autres apps (POS, Guest, Superadmin, Marketing, portail /c).

**Volume : ~900 clics testés, 1 438 contrôles inventoriés, 35 pages web + 4 apps.**

## Résultats

| Suite | Score |
|---|---|
| Audit API (auth, paiements, floor-state, portal, IA Ollama, CORS, routes) | **41/41 ✅** |
| Pages web : écrans blancs | **0** |
| Pages web : erreurs JavaScript | **0** |
| Boutons morts (hors login) | **0** |
| Tests unitaires backend | **16/16 ✅** |
| Tests e2e Playwright | **6/6 ✅** |

## 🐛 Bugs trouvés et corrigés pendant l'audit

1. **401 permanent sur les suggestions Robi** (54 occurrences) — `RobiSuggestionBanner`
   appelait `/api/agent/proactive/inbox` en `fetch` brut sans token. → corrigé (client API).
2. **401 sur le briefing quotidien** — `DailyBriefingPill`, même cause. → corrigé.
3. **500 sur la liste clients CRM** en mode sans-DB — la route ne retombait pas sur
   `data/customers.json`. → fallback ajouté.
4. **Déconnexion forcée après 15 minutes** en mode sans-DB — `/api/auth/refresh`
   renvoyait 500 (refresh token introuvable sans Postgres) et tuait la session.
   → ré-émission d'une session fallback en dev. *Découvert car l'audit a duré > 15 min.*
5. **Conflit de ports Guest/Marketing** — `apps/guest/vite.config.ts` était sur 5176
   (port de Marketing) au lieu de 5178 : selon l'ordre de démarrage, les mauvaises
   apps répondaient sur les mauvais ports. → corrigé.

## ✅ Passe 2 — améliorations et audit exhaustif (même jour)

- **Boutons OAuth Google/Apple/Microsoft (/login)** : corrigés — affichent désormais
  « La connexion X arrive bientôt » au lieu de ne rien faire ; lien « Demander un accès »
  (href="#" mort) → mailto contact@creorga.lu.
- **Audit exhaustif sans plafond** relancé sur les 12 pages les plus denses
  (/reputation 114 contrôles, /c 102, /api 96, /settings/modules 72, /music 60…) :
  **0 bouton mort réel, 0 erreur JS, 0 écran blanc.**
- **POS audité en profondeur** : 0 erreur JS, 0 API KO ; sélection d'employé → pavé PIN OK,
  changement de langue FR/DE/EN/PT OK (vérifié manuellement).
- Faux positifs documentés : onglet « Jeux » déjà actif sur /c (clic sans effet = normal) ;
  2×401 sur /invoices = expiration du token à 15 min suivie d'un refresh réussi (flux normal
  depuis la correction du bug n°4).
- Les clics destructifs (supprimer, payer, encaisser, reset…) restent volontairement exclus
  de l'audit automatique — à tester manuellement avant une release.

## Environnement testé
- Backend :3002 (mode fallback sans Docker/Postgres), web :5174, POS :5175,
  Marketing :5176, Superadmin :5177, Guest :5178, Ollama gemma2:2b actif.
- Captures d'écran : `tests-qa/screenshots/`, données brutes : `tests-qa/ui-audit-results.json`.
