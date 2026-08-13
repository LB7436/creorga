/**
 * Masquage rétroactif des champs sensibles du journal d'audit.
 *
 * Avant le 11 août 2026, le middleware d'audit persistait le corps des
 * requêtes /auth tel quel : mots de passe et emails en clair dans
 * data/audit-log.json (donc lisibles via /api/owner/audit et embarqués dans
 * chaque sauvegarde ZIP). Le middleware masque désormais à l'écriture ; ce
 * module traite le stock existant.
 */

// Superset de CHAMPS_SENSIBLES du middleware : on ajoute les identités
// (email, téléphone, adresse) — dans le journal, ce sont des données
// personnelles sans valeur d'exploitation.
export const CHAMPS_A_MASQUER = new Set([
  'password', 'motdepasse', 'motDePasse', 'pin', 'code',
  'token', 'refreshtoken', 'refreshToken', 'accesstoken', 'accessToken',
  'secret', 'iban', 'currentpassword', 'currentPassword', 'newpassword', 'newPassword',
  'email', 'telephone', 'phone', 'adresse', 'address',
])

export function masquerChampsSensibles(entries: any[]): { entries: any[]; masques: number } {
  let masques = 0
  for (const entry of entries) {
    const body = entry?.body
    if (!body || typeof body !== 'object') continue
    for (const cle of Object.keys(body)) {
      if (!CHAMPS_A_MASQUER.has(cle) && !CHAMPS_A_MASQUER.has(cle.toLowerCase())) continue
      if (body[cle] === '***') continue
      body[cle] = '***'
      masques++
    }
  }
  return { entries, masques }
}
