/**
 * Preuve de la Phase 2.1 : la sauvegarde complete contient bien un dump
 * PostgreSQL. Lance depuis apps/backend :  npx tsx scripts/verify-backup.ts
 */
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import 'dotenv/config'
import { runFullBackup } from '../src/jobs/backup-worker'
import { listPgDumps, DB_BACKUP_DIR } from '../src/jobs/pg-dump'

async function main() {
  const t0 = Date.now()
  const zipName = await runFullBackup()
  const zipPath = path.join(process.cwd(), 'data', 'backups', 'full', zipName)

  console.log(`ZIP        : ${zipName}`)
  console.log(`Taille     : ${fs.statSync(zipPath).size.toLocaleString('fr-FR')} octets`)
  console.log(`Duree      : ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  const entries = new AdmZip(zipPath).getEntries().map((e) => e.entryName)
  const dumps = entries.filter((n) => n.startsWith('database/'))

  console.log(`\nEntrees    : ${entries.length}`)
  console.log(`Dump inclus: ${dumps.length ? dumps.join(', ') : 'AUCUN  <-- ECHEC'}`)
  console.log(`Exclusion  : ${entries.some((n) => n.startsWith('backups/')) ? 'KO backups/ present' : 'OK backups/ exclu'}`)

  const onDisk = listPgDumps()
  console.log(`\nDumps sur disque (${DB_BACKUP_DIR}) : ${onDisk.length}`)
  for (const d of onDisk.slice(0, 5)) {
    console.log(`  ${d.filename}  ${d.size.toLocaleString('fr-FR')} o`)
  }

  if (!dumps.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
