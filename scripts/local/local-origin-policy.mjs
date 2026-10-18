// Le hostname vu par le navigateur doit rester identique sur tous les ports :
// localhost et 127.0.0.1 ne sont pas interchangeables pour les cookies de session.
// L'adresse d'écoute reste une contrainte distincte, strictement loopback IPv4.
export const LOCAL_BIND_HOST = '127.0.0.1'
export function localContext(name = process.env.CREORGA_LOCAL_CONTEXT) {
  const context = name === undefined || name === 'default' ? 'default' : name
  if (!['default', 'f18-isolated', 'f18-recovery'].includes(context)) throw Error('Contexte local inconnu : default, f18-isolated ou f18-recovery attendu.')
  const isolated = context !== 'default'
  const hostname = isolated ? '127.0.0.1' : 'localhost'
  const apiPort = context === 'f18-recovery' ? 23002 : isolated ? 13002 : 3002
  const frontends = Object.freeze((context === 'f18-recovery'
    ? [['web', 25174], ['pos', 25175], ['superadmin', 25177], ['guest', 25178]] : isolated
    ? [['web', 15174], ['pos', 15175], ['superadmin', 15177], ['guest', 15178]]
    : [['web', 5174], ['pos', 5175], ['superadmin', 5177], ['guest', 5178]])
    .map(entry => Object.freeze(entry)))
  return Object.freeze({ name: context, apiPort, apiOrigin: `http://${hostname}:${apiPort}`,
    webOrigin: `http://${hostname}:${frontends[0][1]}`, posOrigin: `http://${hostname}:${frontends[1][1]}`,
    frontends, browserOrigins: Object.freeze(frontends.map(([, port]) => `http://${hostname}:${port}`)) })
}
const installationContext = localContext()
export const LOCAL_API_PORT = installationContext.apiPort
export const LOCAL_API_ORIGIN = installationContext.apiOrigin
export const LOCAL_WEB_ORIGIN = installationContext.webOrigin
export const LOCAL_FRONTENDS = installationContext.frontends
export const LOCAL_BROWSER_ORIGINS = installationContext.browserOrigins

export function localInstallationManifest(profile, contextName = process.env.CREORGA_LOCAL_CONTEXT) {
  const context = localContext(contextName)
  if (!['business', 'full'].includes(profile)) throw Error('Profil attendu : business ou full')
  if (context.name !== 'default' && profile !== 'business') throw Error(`Le contexte ${context.name} exige le profil business.`)
  return { version: 1, profile, ...(context.name === 'default' ? {} : { context: context.name }),
    apiOrigin: context.apiOrigin, webOrigin: context.webOrigin,
    binding: 'loopback', externalProviders: 'disabled-by-local-runtime' }
}

export function assertLocalInstallationManifest(installation, profile, contextName = process.env.CREORGA_LOCAL_CONTEXT) {
  const expected = localInstallationManifest(profile, contextName)
  if (!installation || (installation.context ?? 'default') !== (expected.context ?? 'default')
    || Object.entries(expected).some(([key, value]) => installation[key] !== value)) {
    throw Error('Livrable local non vérifié : recompilation locale obligatoire avant ouverture.')
  }
  return installation
}

export function localArtifactDirectory(profile, { backend = false, context = process.env.CREORGA_LOCAL_CONTEXT } = {}) {
  const installation = localInstallationManifest(profile, context)
  return installation.context ? `dist-business-${installation.context}` : backend ? 'dist' : `dist-${profile}`
}

export function localBuildEnvironment(profile, inherited = {}) {
  const context = localContext(inherited.CREORGA_LOCAL_CONTEXT)
  localInstallationManifest(profile, context.name)
  // VITE_* explicites priment sur process.env et les anciens .env.production.
  // Pas de paramètre permettant de choisir une API ou une interface distante.
  return { ...inherited, CREORGA_BUSINESS_ONLY: profile === 'business' ? 'true' : 'false',
    VITE_BACKEND_URL: context.apiOrigin, VITE_REMOTE_BACKEND: context.apiOrigin, VITE_API_URL: context.apiOrigin + '/api',
    VITE_WEB_CLIENT_URL: context.webOrigin, VITE_BACKOFFICE_URL: context.webOrigin,
    VITE_POS_URL: context.posOrigin, VITE_CAISSE_URL: context.posOrigin,
    VITE_ANALYTICS_URL: '', VITE_OLLAMA_URL: 'http://127.0.0.1:11434',
    VITE_DEMO_AUTOLOGIN: 'false', VITE_DEMO_EMAIL: '', VITE_DEMO_PASSWORD: '', VITE_COMPANY_ID: '' }
}
