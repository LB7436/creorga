// Le hostname vu par le navigateur doit rester identique sur tous les ports :
// localhost et 127.0.0.1 ne sont pas interchangeables pour les cookies de session.
// L'adresse d'écoute reste une contrainte distincte, strictement loopback IPv4.
export const LOCAL_BIND_HOST = '127.0.0.1'
export const LOCAL_API_PORT = 3002
export const LOCAL_API_ORIGIN = 'http://localhost:3002'
export const LOCAL_WEB_ORIGIN = 'http://localhost:5174'
export const LOCAL_FRONTENDS = Object.freeze([
  Object.freeze(['web', 5174]), Object.freeze(['pos', 5175]),
  Object.freeze(['superadmin', 5177]), Object.freeze(['guest', 5178]),
])
export const LOCAL_BROWSER_ORIGINS = Object.freeze(LOCAL_FRONTENDS.map(([, port]) => `http://localhost:${port}`))

export function localInstallationManifest(profile) {
  if (!['business', 'full'].includes(profile)) throw Error('Profil attendu : business ou full')
  return { version: 1, profile, apiOrigin: LOCAL_API_ORIGIN, webOrigin: LOCAL_WEB_ORIGIN,
    binding: 'loopback', externalProviders: 'disabled-by-local-runtime' }
}

export function assertLocalInstallationManifest(installation, profile) {
  const expected = localInstallationManifest(profile)
  if (!installation || Object.entries(expected).some(([key, value]) => installation[key] !== value)) {
    throw Error('Livrable local non vérifié : recompilation locale obligatoire avant ouverture.')
  }
  return installation
}

export function localBuildEnvironment(profile, inherited = {}) {
  localInstallationManifest(profile)
  // VITE_* explicites priment sur process.env et les anciens .env.production.
  // Pas de paramètre permettant de choisir une API ou une interface distante.
  return { ...inherited, CREORGA_BUSINESS_ONLY: profile === 'business' ? 'true' : 'false',
    VITE_BACKEND_URL: LOCAL_API_ORIGIN, VITE_REMOTE_BACKEND: LOCAL_API_ORIGIN, VITE_API_URL: LOCAL_API_ORIGIN + '/api',
    VITE_WEB_CLIENT_URL: LOCAL_WEB_ORIGIN, VITE_BACKOFFICE_URL: LOCAL_WEB_ORIGIN,
    VITE_POS_URL: 'http://localhost:5175', VITE_CAISSE_URL: 'http://localhost:5175',
    VITE_ANALYTICS_URL: '', VITE_OLLAMA_URL: 'http://127.0.0.1:11434',
    VITE_DEMO_AUTOLOGIN: 'false', VITE_DEMO_EMAIL: '', VITE_DEMO_PASSWORD: '', VITE_COMPANY_ID: '' }
}
