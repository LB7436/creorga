/**
 * Rétention de la console créateur — gel de suppression explicite.
 *
 * Ancienne proposition historique, non autorisée et non exécutée dans ce lot :
 * | Table                | Rétention | Pourquoi                                  |
 * |----------------------|-----------|-------------------------------------------|
 * | ActivityEvent        | 90 j      | minimisation ; les tendances longues      |
 * |                      |           | vivent dans TenantMetricDaily             |
 * | LoginEvent           | 180 j     | sessions / sécurité                       |
 * | ErrorLog             | 30 j      | débogage                                  |
 * | Opportunity DISMISSED| 365 j     | historique commercial épuré               |
 * | CreatorRefreshToken  | 90 j      | journal de connexion console (révoqués/   |
 * | révoqués ou expirés  |           | expirés seulement)                        |
 *
 * TenantMetricDaily n'est jamais purgé : agrégat au niveau société, une ligne
 * par jour.
 */

export interface BilanPurge {
  activityEvents: number
  loginEvents: number
  errorLogs: number
  opportunites: number
  refreshTokens: number
}

export async function purgerRetention(_maintenant: Date = new Date()): Promise<BilanPurge> {
  // L'import direct et les variables legacy ne permettent pas de contourner
  // le gel. La politique future devra être approuvée et qualifiée séparément.
  return { activityEvents: 0, loginEvents: 0, errorLogs: 0, opportunites: 0, refreshTokens: 0 }
}

export function startCreatorRetention(): void {
  // Aucun minuteur de purge installé, même en profil complet.
}

export function stopCreatorRetention(): void {
  // Fonction conservée pour les anciens appelants ; aucun minuteur actif.
}
