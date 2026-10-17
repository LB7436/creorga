import { describe, expect, it } from 'vitest'
import { runtimeProfile } from './runtime-profile'

describe('profil professionnel réversible', () => {
  it('conserve le profil complet par défaut et ne déduit rien du nom du dossier', () => {
    expect(runtimeProfile({})).toMatchObject({ name: 'full', gamesEnabled: true, legacyStockSync: true })
    expect(runtimeProfile({ CREORGA_BUSINESS_ONLY: 'false' }).gamesEnabled).toBe(true)
  })
  it('aucun profil ni variable d’activation ne donne l’autorisation de purger les sauvegardes', () => {
    for (const env of [{}, { CREORGA_BUSINESS_ONLY: 'false' }, { CREORGA_ALLOW_BACKUP_DELETION: 'true', CREORGA_BACKUP_RETENTION_APPROVED: 'true' }]) {
      expect(runtimeProfile(env).pruneBackups).toBe(false)
    }
  })
  it('ferme les jeux et les tâches automatiques non indispensables, pas les sauvegardes ni paiements', () => {
    const profile = runtimeProfile({ CREORGA_BUSINESS_ONLY: 'true' })
    expect(profile).toMatchObject({ name: 'business', gamesEnabled: false, legacyStockSync: false,
      creatorRetention: false, creatorMetrics: false, opportunityEngine: false, pruneBackups: false,
      backups: true, paymentRecovery: true, invoiceDelivery: true })
    expect(runtimeProfile({ CREORGA_BUSINESS_ONLY: '1' })).toEqual(profile)
  })
})
