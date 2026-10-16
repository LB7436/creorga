/** Le profil ne migre ni ne supprime aucune donnée. Les clés restent côté serveur. */
export function runtimeProfile(env: Record<string, string | undefined> = process.env) {
  const businessOnly = env.CREORGA_BUSINESS_ONLY === 'true' || env.CREORGA_BUSINESS_ONLY === '1'
  const essential = businessOnly || env.CREORGA_BACKGROUND_MODE === 'essential'
  return {
    name: businessOnly ? 'business' : 'full', businessOnly, gamesEnabled: !businessOnly,
    legacyStockSync: !essential, creatorRetention: !essential, creatorMetrics: !essential,
    opportunityEngine: !essential, pruneBackups: !essential,
    backups: true, paymentRecovery: true, invoiceDelivery: true,
  } as const
}
