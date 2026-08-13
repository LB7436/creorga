/**
 * Purge rétroactive des champs sensibles du journal d'audit (one-shot).
 *
 * Usage, depuis apps/backend (le service peut rester en marche : écriture
 * atomique via safeWriteJson, le middleware rechargera son cache au prochain
 * redémarrage — relancer le service après la purge pour purger aussi le
 * cache mémoire) :
 *
 *   npx tsx scripts/purge-audit-legacy.ts
 *
 * ⚠ Les sauvegardes ZIP antérieures (data/backups/full/) contiennent encore
 * les valeurs en clair : la rotation (30 archives) les évacue d'elle-même ;
 * déclencher une sauvegarde neuve après la purge.
 */
import path from 'path'
import { safeReadJson, safeWriteJson } from '../src/lib/safe-json'
import { masquerChampsSensibles } from '../src/lib/audit-purge'

const AUDIT_FILE = path.resolve(process.cwd(), 'data', 'audit-log.json')

const brutes = safeReadJson<any[]>(AUDIT_FILE, [])
if (!Array.isArray(brutes) || brutes.length === 0) {
  console.log(`Aucune entrée à traiter dans ${AUDIT_FILE}`)
  process.exit(0)
}

const { entries, masques } = masquerChampsSensibles(brutes)
safeWriteJson(AUDIT_FILE, entries)
console.log(`${entries.length} entrées relues, ${masques} champ(s) sensible(s) masqué(s).`)
console.log('Penser à : redémarrer creorga-api (cache mémoire) et déclencher une sauvegarde neuve.')
