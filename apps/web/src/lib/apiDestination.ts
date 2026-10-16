/** Seules l'origine de l'application et celle fixée au build reçoivent la session.
 * Une adresse saisie dans un réglage n'est pas une nouvelle autorité de confiance.
 */
export const CONFIGURED_BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

function applicationOrigin(): string {
  if (typeof window !== 'undefined') {
    try { return new URL(window.location.origin || window.location.href).origin } catch { /* tests sans navigateur */ }
  }
  return new URL(CONFIGURED_BACKEND_URL).origin
}

export function assertApiDestination(input: RequestInfo | URL): void {
  const base = applicationOrigin()
  const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  let url: URL
  try { url = new URL(value, base) } catch { throw new Error('Destination API invalide.') }
  const configured = new URL(CONFIGURED_BACKEND_URL, base)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || ![base, configured.origin].includes(url.origin)) {
    throw new Error('Destination API non autorisée : utilisez le serveur configuré de cet établissement.')
  }
}
