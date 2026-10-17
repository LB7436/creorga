import { requestRuntimeShutdown } from './runtime-control.mjs'
const [file, pidText] = process.argv.slice(2)
try {
  const result = await requestRuntimeShutdown(file, { expectedPid: Number(pidText) })
  if (result.status !== 'STOPPED') throw Error('Drain non confirmé')
  console.log('CréOrga : arrêt propre confirmé, base PostgreSQL conservée.')
} catch {
  console.error('CréOrga : arrêt non confirmé. Aucun processus interrompu de force ; consulter le diagnostic privé.')
  process.exitCode = 1
}
