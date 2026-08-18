import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { dernierZip, verifierRestauration } from '../jobs/verifier-restauration'

/**
 * v5.0 — SAUV-1 : la dernière sauvegarde complète se restaure vraiment.
 * Nécessite Docker (conteneur `creorga-db`) et un ZIP produit par le
 * backup-worker (60 s après le démarrage du backend). Sans l'un des deux, le
 * test ÉCHOUE avec la cause : une restauration non prouvée n'est pas « passée ».
 */
describe('SAUV — restauration testée de la sauvegarde complète', () => {
  it('SAUV-1 : JSON relisibles + dump PostgreSQL restauré dans une base jetable', async () => {
    let dockerOk = false
    try {
      execFileSync('docker', ['exec', process.env.PG_DUMP_DOCKER_CONTAINER || 'creorga-db', 'pg_restore', '--version'], { stdio: 'pipe' })
      dockerOk = true
    } catch { /* absent */ }
    expect(dockerOk, 'BLOQUÉ : Docker / conteneur creorga-db indisponible — restauration non prouvée').toBe(true)

    const zip = dernierZip()
    expect(zip, 'BLOQUÉ : aucun ZIP creorga-full-*.zip (le backup-worker n’a pas encore tourné)').toBeTruthy()

    const rapport = await verifierRestauration(zip)
    expect(rapport.erreurs, rapport.erreurs.join(' | ')).toEqual([])
    expect(rapport.ok).toBe(true)
    expect(rapport.fichiersJson).toBeGreaterThan(0)
    expect(rapport.jsonInvalides).toEqual([])
    expect(rapport.dump?.tables ?? 0).toBeGreaterThan(30)
    expect(rapport.dump?.societes ?? 0).toBeGreaterThan(0)
  }, 240_000)
})
