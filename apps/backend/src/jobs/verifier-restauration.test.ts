import { describe, it, expect, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'
import { dernierZip, verifierJson, verifierRestauration, extractVerifiedArchive, restaurerDansBaseJetable, validateRestoreTarget, type RestoreRuntime } from './verifier-restauration'

const temporaryDirectories: string[] = []
function temporary(prefix: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}
afterEach(() => {
  // Conservation des nouvelles fixtures exclusives : aucun nettoyage automatique.
  temporaryDirectories.splice(0)
})

/** v5.0 — vérification de restauration : partie hermétique (sans Docker). */
function zipDeTest(contenu: Record<string, string>): string {
  const dir = temporary('creorga-zip-')
  const zip = new AdmZip()
  for (const [nom, texte] of Object.entries(contenu)) zip.addFile(nom, Buffer.from(texte, 'utf8'))
  const chemin = path.join(dir, 'creorga-full-2026-01-01-0000.zip')
  zip.writeZip(chemin)
  return chemin
}

describe('verifierRestauration — JSON et structure du ZIP', () => {
  it('refuse un ZIP sans dump avant toute extraction ou commande Docker', async () => {
    const zip = zipDeTest({
      'data/inventory-stock.json': '[]',
      'data/proactive-notifs.json': '[{"id":"n1"}',
      'data/sous/dossier.json': '{"a":1}',
    })
    const restore = vi.fn()
    const rapport = await verifierRestauration(zip, restore)
    expect(rapport.fichiersJson).toBe(0)
    expect(rapport.fichiersVerifies).toBe(0)
    expect(rapport.dump).toBeNull()
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs.join(' ')).toMatch(/dump PostgreSQL/)
    expect(restore).not.toHaveBeenCalled()
  })

  it('un ZIP sans aucune donnée est un échec, pas un succès vide', async () => {
    const zip = zipDeTest({ 'readme.txt': 'rien' })
    const rapport = await verifierRestauration(zip)
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs.join(' ')).toMatch(/Archive refusée/)
  })

  it('sans ZIP du tout : erreur explicite', async () => {
    const rapport = await verifierRestauration(null)
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs[0]).toMatch(/aucun ZIP/)
  })

  it('verifierJson compte récursivement et dernierZip prend le plus récent par nom', () => {
    const dir = temporary('creorga-json-')
    fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'a', 'x.json'), '{}')
    fs.writeFileSync(path.join(dir, 'a', 'b', 'y.json'), 'pas du json')
    expect(verifierJson(dir)).toEqual({ total: 2, invalides: [path.join('a', 'b', 'y.json')] })

    fs.writeFileSync(path.join(dir, 'creorga-full-2026-01-01-0900.zip'), '')
    fs.writeFileSync(path.join(dir, 'creorga-full-2026-01-02-0800.zip'), '')
    fs.writeFileSync(path.join(dir, 'autre.zip'), '')
    expect(path.basename(dernierZip(dir)!)).toBe('creorga-full-2026-01-02-0800.zip')
    expect(dernierZip(path.join(dir, 'inexistant'))).toBeNull()
  })
})

function validArchive(version: 1 | 2 = 2, corruptJson = false): string {
  const prefix = version === 2 ? 'data/' : ''
  const contents: Record<string, string> = {
    [`${prefix}floor-state.json`]: corruptJson ? '{broken' : '{"tables":[]}',
    'database/fixture.dump': 'PGDMP-fixture-only',
  }
  const files = Object.entries(contents).map(([name, value]) => ({ name, size: Buffer.byteLength(value), sha256: createHash('sha256').update(value).digest('hex') }))
  contents['backup-manifest.json'] = JSON.stringify({ version, databaseIncluded: true, files,
    ...(version === 2 ? { roots: [{ name: 'data', prefix: 'data/', status: 'included' }, { name: 'medias', prefix: 'medias/', status: 'absent' }] } : {}) })
  return zipDeTest(contents)
}

describe('restauration contrôlée — fichiers', () => {
  it('vérifie chaque fichier v2 et ne compte pas le manifeste comme donnée métier', async () => {
    const restore = vi.fn(async (_dump: string) => ({ tables: 48, societes: 1 }))
    const report = await verifierRestauration(validArchive(), restore)
    expect(report).toMatchObject({ ok: true, fichiersJson: 1, fichiersVerifies: 2, versionArchive: 2 })
    expect(restore).toHaveBeenCalledOnce()
    const extraction = path.dirname(path.dirname(restore.mock.calls[0][0] as string))
    expect(fs.existsSync(path.join(extraction, 'data', 'floor-state.json'))).toBe(true)
  })
  it('conserve la lecture v1 avec couverture ancienne explicitement limitée', async () => {
    const report = await verifierRestauration(validArchive(1), async () => ({ tables: 48, societes: 1 }))
    expect(report.ok).toBe(true)
    expect(report.versionArchive).toBe(1)
    expect(report.limites.join(' ')).toMatch(/médias inconnue/)
  })
  it('un JSON métier corrompu arrête le processus avant restauration PostgreSQL', async () => {
    const restore = vi.fn()
    const report = await verifierRestauration(validArchive(2, true), restore)
    expect(report.ok).toBe(false)
    expect(report.jsonInvalides).toEqual([path.join('data', 'floor-state.json')])
    expect(restore).not.toHaveBeenCalled()
  })
  it('une destination non vide est refusée sans écraser le fichier existant', async () => {
    const destination = temporary('creorga-extraction-')
    fs.writeFileSync(path.join(destination, 'conserver.txt'), 'intact')
    await expect(extractVerifiedArchive(validArchive(), destination)).rejects.toThrow(/neuf et vide/)
    expect(fs.readFileSync(path.join(destination, 'conserver.txt'), 'utf8')).toBe('intact')
  })
  it('une altération d’octets est refusée avant extraction', async () => {
    const zipPath = validArchive()
    const zip = new AdmZip(zipPath)
    zip.updateFile('data/floor-state.json', Buffer.from('{"tables":[1]}'))
    zip.writeZip(zipPath)
    const destination = temporary('creorga-extraction-')
    await expect(extractVerifiedArchive(zipPath, destination)).rejects.toThrow(/Archive refusée/)
    expect(fs.readdirSync(destination)).toEqual([])
  })
  it('aucune erreur de prestataire ne divulgue son stderr dans le rapport', async () => {
    const report = await verifierRestauration(validArchive(), async () => { throw new Error('fixture-private-credential-and-row') })
    expect(report.ok).toBe(false)
    expect(JSON.stringify(report)).not.toContain('fixture-private')
  })
  it('plusieurs dumps sont refusés avant de choisir arbitrairement le premier', async () => {
    const restore = vi.fn()
    const archive = zipDeTest({ 'data/state.json': '{}', 'database/one.dump': 'PGDMP-one', 'database/two.dump': 'PGDMP-two' })
    const report = await verifierRestauration(archive, restore)
    expect(report.ok).toBe(false)
    expect(restore).not.toHaveBeenCalled()
  })
})

function fakeRuntime(failAt?: string): RestoreRuntime & { run: ReturnType<typeof vi.fn> } {
  return { sourceDatabase: 'creorga_fixture_source', user: 'fixture', container: 'fixture-db', run: vi.fn(async (args: string[]) => {
    if (failAt && args.includes(failAt)) throw new Error('WARNING: errors ignored on restore; fixture-private-row')
    return { stdout: args.includes('psql') ? (args[args.length - 1].includes('information_schema') ? '48\n' : '1\n') : '' }
  }) }
}
describe('restauration contrôlée — commandes simulées', () => {
  it('refuse une destination égale à la source ou hors convention jetable', () => {
    const name = `creorga_restore_${'a'.repeat(32)}`
    expect(() => validateRestoreTarget(name, name)).toThrow(/refusée/)
    expect(() => validateRestoreTarget('source', 'creorga_production')).toThrow(/refusée/)
  })
  it('un pg_restore échoué conserve base et dump pour diagnostic sans lancer dropdb ou rm', async () => {
    const runtime = fakeRuntime('pg_restore')
    await expect(restaurerDansBaseJetable('fixture.dump', runtime)).rejects.toThrow(/restauration PostgreSQL/)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('dropdb'))).toBe(false)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('rm'))).toBe(false)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('psql'))).toBe(false)
  })
  it('un échec createdb ne supprime aucune base qui existait déjà', async () => {
    const runtime = fakeRuntime('createdb')
    await expect(restaurerDansBaseJetable('fixture.dump', runtime)).rejects.toThrow(/création/)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('dropdb'))).toBe(false)
  })
  it('un échec de copie ne déclenche aucun nettoyage de ressource non créée', async () => {
    const runtime = fakeRuntime('cp')
    await expect(restaurerDansBaseJetable('fixture.dump', runtime)).rejects.toThrow(/copie/)
    expect(runtime.run.mock.calls.filter(([args]) => args.includes('cp'))).toHaveLength(1)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('createdb') || args.includes('dropdb') || args.includes('rm'))).toBe(false)
  })
  it('une collision du répertoire Docker est refusée avant la copie du dump', async () => {
    const runtime = fakeRuntime('mkdir')
    await expect(restaurerDansBaseJetable('fixture.dump', runtime)).rejects.toThrow(/réservation/)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('cp') || args.includes('pg_restore') || args.includes('dropdb') || args.includes('rm'))).toBe(false)
  })
  it('deux opérations ont des destinations indépendantes et utilisent une restauration atomique', async () => {
    const runtime = fakeRuntime()
    const results = await Promise.all([restaurerDansBaseJetable('fixture.dump', runtime), restaurerDansBaseJetable('fixture.dump', runtime)])
    for (const result of results) expect(result).toMatchObject({ tables: 48, societes: 1 })
    const targets = runtime.run.mock.calls.filter(([args]) => args.includes('createdb')).map(([args]) => args[args.length - 1])
    expect(new Set(targets).size).toBe(2)
    for (const [args] of runtime.run.mock.calls.filter(([args]) => args.includes('pg_restore'))) {
      expect(args).toContain('--exit-on-error')
      expect(args).toContain('--single-transaction')
    }
  })
  it('une restauration réussie conserve ses destinations et n’appelle aucun nettoyage', async () => {
    const execution = fakeRuntime('dropdb')
    const result = await restaurerDansBaseJetable('fixture.dump', execution)
    expect(result).toMatchObject({ tables: 48, societes: 1 })
    expect(execution.run.mock.calls.some(([args]) => args.includes('dropdb') || args.includes('rm'))).toBe(false)
  })
  it('une sortie psql vide ne devient pas un comptage valide à zéro', async () => {
    const runtime = fakeRuntime()
    runtime.run.mockImplementation(async () => ({ stdout: '' }))
    await expect(restaurerDansBaseJetable('fixture.dump', runtime)).rejects.toThrow(/vérification des tables/)
    expect(runtime.run.mock.calls.some(([args]) => args.includes('dropdb'))).toBe(false)
  })
})
