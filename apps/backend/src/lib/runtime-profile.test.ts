import { describe, expect, it } from 'vitest'
import { runtimeProfile } from './runtime-profile'

describe('profil professionnel réversible', () => {
  it('conserve le profil complet par défaut et ne déduit rien du nom du dossier', () => {
    expect(runtimeProfile({})).toMatchObject({ name: 'full', gamesEnabled: true, legacyStockSync: true })
    expect(runtimeProfile({ CREORGA_BUSINESS_ONLY: 'false' }).gamesEnabled).toBe(true)
  })
  it('ferme les jeux et les tâches automatiques non indispensables, pas les sauvegardes ni paiements', () => {
    const profile = runtimeProfile({ CREORGA_BUSINESS_ONLY: 'true' })
    expect(profile).toMatchObject({ name: 'business', gamesEnabled: false, legacyStockSync: false,
      creatorRetention: false, creatorMetrics: false, opportunityEngine: false, pruneBackups: false,
      backups: true, paymentRecovery: true, invoiceDelivery: true })
    expect(runtimeProfile({ CREORGA_BUSINESS_ONLY: '1' })).toEqual(profile)
  })
})
