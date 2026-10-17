import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const commands = vi.hoisted(() => [] as string[][])
const remoteDirectories = vi.hoisted(() => new Set<string>())
vi.mock('node:crypto', async importOriginal => ({ ...await importOriginal<typeof import('node:crypto')>(), randomInt: () => 123 }))
vi.mock('child_process', () => ({ execFile: (bin: string, args: string[], _options: unknown, done: (error: Error | null, result: string) => void) => {
  commands.push([bin, ...args])
  if (args.includes('mkdir')) {
    const directory = args[args.length - 1]
    if (remoteDirectories.has(directory)) { done(new Error('EEXIST fixture Docker'), ''); return }
    remoteDirectories.add(directory)
  }
  if (args[0] === 'cp') fs.writeFileSync(args[args.length - 1], 'PGDMP-fictif-docker')
  done(null, '')
} }))
vi.mock('../lib/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
import { runPgDump } from './pg-dump'
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); commands.length = 0; remoteDirectories.clear() })
describe('pg_dump Docker simulé : conservation de la copie intermédiaire', () => {
  it('copie et vérifie le dump sans rm automatique dans le conteneur', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://fixture:fixture@127.0.0.1:5450/fixture_only')
    vi.stubEnv('PG_DUMP_MODE', 'docker')
    vi.stubEnv('PG_DUMP_DOCKER_CONTAINER', 'fixture-container')
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-docker-dump-fictif-'))
    const result = await runPgDump(target)
    expect(fs.readFileSync(result.path, 'utf8')).toBe('PGDMP-fictif-docker')
    expect(commands.some(args => args.includes('rm'))).toBe(false)
    expect(commands.filter(args => args[1] === 'cp')).toHaveLength(1)
  })
  it('refuse une collision de nom avant toute commande pouvant écraser le dump', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://fixture:fixture@127.0.0.1:5450/fixture_only')
    vi.stubEnv('PG_DUMP_MODE', 'docker')
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T14:34:46.128Z'))
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-dump-collision-fictif-'))
    const first = await runPgDump(target)
    const before = fs.readFileSync(first.path), commandCount = commands.length
    await expect(runPgDump(target)).rejects.toThrow(/exist|collision|EEXIST/i)
    expect(fs.readFileSync(first.path)).toEqual(before)
    expect(commands).toHaveLength(commandCount)
  })
  it('réserve aussi le répertoire Docker pour ne pas écraser une copie distante conservée', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://fixture:fixture@127.0.0.1:5450/fixture_only')
    vi.stubEnv('PG_DUMP_MODE', 'docker')
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T14:34:46.128Z'))
    const firstTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-dump-remote-A-fictif-'))
    const nextTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-dump-remote-B-fictif-'))
    const first = await runPgDump(firstTarget), before = fs.readFileSync(first.path)
    await expect(runPgDump(nextTarget)).rejects.toThrow(/EEXIST/)
    expect(commands.filter(args => args.includes('pg_dump'))).toHaveLength(1)
    expect(fs.readFileSync(first.path)).toEqual(before)
  })
})
