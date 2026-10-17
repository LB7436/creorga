import { createHmac, timingSafeEqual } from 'node:crypto'

const AUDIENCE = 'creorga:invoice-pdf-download:v1'
const TOKEN = /^v1\.([a-f\d-]{36})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/
export interface DocumentCapabilityTarget {
  id: string
  companyId: string
  invoiceId: string
  documentHash: string
  expiresAt: Date
}
function signingKey(secret: string): Buffer {
  if (secret.length < 32) throw Error('Configuration des liens documentaires indisponible.')
  return createHmac('sha256', secret).update('creorga:key-derivation:document-download:v1').digest()
}
function signature(link: DocumentCapabilityTarget, secret: string): string {
  return createHmac('sha256', signingKey(secret)).update(JSON.stringify([
    AUDIENCE, link.id, link.companyId, link.invoiceId, link.documentHash, link.expiresAt.toISOString(),
  ])).digest('base64url')
}
export function signDocumentCapability(link: DocumentCapabilityTarget, secret: string): string {
  return `v1.${link.id}.${Math.floor(link.expiresAt.getTime() / 1000)}.${signature(link, secret)}`
}
/** Aucune donnée du jeton n'est utilisée comme identité de connexion. */
export function verifyDocumentCapability(token: string, link: DocumentCapabilityTarget, secret: string, now: Date): boolean {
  const parsed = TOKEN.exec(token)
  if (!parsed || parsed[1] !== link.id || Number(parsed[2]) !== Math.floor(link.expiresAt.getTime() / 1000)) return false
  if (!Number.isFinite(now.getTime()) || now.getTime() >= link.expiresAt.getTime()) return false
  const expected = Buffer.from(signature(link, secret)), received = Buffer.from(parsed[3])
  return expected.length === received.length && timingSafeEqual(expected, received)
}
export function documentCapabilityId(token: string): string | null { return TOKEN.exec(token)?.[1] ?? null }
