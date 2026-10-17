import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const fixture = vi.hoisted(() => ({ release: null as null | (() => void), path: '' }))
vi.mock('./pg-dump', () => ({ runPgDump: async () => {
  await new Promise<void>(resolve => { fixture.release = resolve })
  return { path: fixture.path }
} }))
vi.mock('../lib/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
import { runFullBackup, shutdownBackups, startBackupWorker } from './backup-worker'

describe('arrêt des sauvegardes', () => {
  it('attend une archive commencée et refuse une nouvelle sauvegarde pendant l’arrêt', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-backup-drain-fictif-')), data = path.join(root, 'data')
    fs.mkdirSync(data); fixture.path = path.join(root, 'fixture.dump'); fs.writeFileSync(fixture.path, 'PGDMP-fictif')
    const active = runFullBackup(data)
    await vi.waitFor(() => expect(fixture.release).toBeTypeOf('function'))
    let finished = false
    const waiting = shutdownBackups().then(() => { finished = true })
    await Promise.resolve(); await Promise.resolve(); expect(finished).toBe(false)
    await expect(runFullBackup(data)).rejects.toThrow(/arrêt/)
    fixture.release!()
    const filename = await active; await waiting
    expect(fs.existsSync(path.join(data, 'backups/full', filename))).toBe(true)
    expect(fs.existsSync(path.join(data, 'backups/full', filename + '.partial'))).toBe(true)
    vi.useFakeTimers()
    try { startBackupWorker(); expect(vi.getTimerCount()).toBe(0) } finally { vi.useRealTimers() }
  })
})
