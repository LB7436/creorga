import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { JsonStoreUnavailableError, readJsonStrict, safeWriteJson, safeReadJson } from './safe-json'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-safejson-'))
})

afterEach(() => {
  vi.restoreAllMocks()
  const resolved = path.resolve(dir)
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('creorga-safejson-')) throw new Error('Répertoire de test inattendu')
  fs.rmSync(resolved, { recursive: true, force: true })
})

describe('safeWriteJson', () => {
  it('écrit le fichier et ne laisse aucun .tmp derrière', () => {
    const file = path.join(dir, 'data.json')
    safeWriteJson(file, { a: 1 })
    expect(fs.existsSync(file)).toBe(true)
    expect(fs.existsSync(file + '.tmp')).toBe(false)
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ a: 1 })
  })

  it('conserve un .bak de la version précédente au second write', () => {
    const file = path.join(dir, 'data.json')
    safeWriteJson(file, { v: 1 })
    safeWriteJson(file, { v: 2 })
    expect(fs.existsSync(file + '.bak')).toBe(true)
    expect(JSON.parse(fs.readFileSync(file + '.bak', 'utf8'))).toEqual({ v: 1 })
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ v: 2 })
  })

  it('crée le dossier parent si absent', () => {
    const file = path.join(dir, 'nested', 'sub', 'data.json')
    safeWriteJson(file, { ok: true })
    expect(fs.existsSync(file)).toBe(true)
  })

  it('un flush disque refusé ne remplace pas le dernier état confirmé', () => {
    const file = path.join(dir, 'data.json')
    safeWriteJson(file, { balance: 24 })
    vi.spyOn(fs, 'fsyncSync').mockImplementationOnce(() => { throw Object.assign(new Error('disk flush failed'), { code: 'EIO' }) })
    expect(() => safeWriteJson(file, { balance: 0 })).toThrow('disk flush failed')
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ balance: 24 })
    expect(fs.readdirSync(dir)).toEqual(['data.json'])
  })

  it('un échec de renommage laisse le fichier courant et sa sauvegarde lisibles', () => {
    const file = path.join(dir, 'data.json')
    safeWriteJson(file, { balance: 24 })
    const rename = fs.renameSync.bind(fs)
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (to === file) throw Object.assign(new Error('rename refused'), { code: 'EACCES' })
      return rename(from, to)
    })
    expect(() => safeWriteJson(file, { balance: 0 })).toThrow('rename refused')
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ balance: 24 })
    expect(JSON.parse(fs.readFileSync(file + '.bak', 'utf8'))).toEqual({ balance: 24 })
    expect(fs.readdirSync(dir).sort()).toEqual(['data.json', 'data.json.bak'])
  })

  it('préserve un ancien temporaire et une sauvegarde valide lorsque le courant est corrompu', () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{corrupt')
    fs.writeFileSync(file + '.bak', '{"balance":24}')
    fs.writeFileSync(file + '.tmp', 'diagnostic précédent')
    safeWriteJson(file, { balance: 24 })
    expect(JSON.parse(fs.readFileSync(file + '.bak', 'utf8'))).toEqual({ balance: 24 })
    expect(fs.readFileSync(file + '.tmp', 'utf8')).toBe('diagnostic précédent')
  })
})

describe('readJsonStrict — données métier', () => {
  it('initialise uniquement en absence de fichier et de sauvegarde', () => {
    const file = path.join(dir, 'new.json')
    expect(readJsonStrict(file, { tables: [] })).toEqual({ tables: [] })
    fs.writeFileSync(file + '.bak', '{"balance":24}')
    expect(() => readJsonStrict(file, { tables: [] })).toThrow(JsonStoreUnavailableError)
  })

  it('ne transforme pas un fichier et une sauvegarde corrompus en salle vide', () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{corrupt')
    fs.writeFileSync(file + '.bak', '{also corrupt')
    expect(() => readJsonStrict(file, { tables: [] })).toThrow(JsonStoreUnavailableError)
    expect(fs.readFileSync(file, 'utf8')).toBe('{corrupt')
  })

  it('signale la copie récupérable sans revenir silencieusement à son ancien solde', () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{corrupt')
    fs.writeFileSync(file + '.bak', '{"balance":24}')
    try {
      readJsonStrict(file, { balance: 0 })
      expect.unreachable('La récupération exige une décision explicite')
    } catch (error) {
      expect(error).toBeInstanceOf(JsonStoreUnavailableError)
      expect((error as JsonStoreUnavailableError).recoveryAvailable).toBe(true)
    }
  })

  it('refuse un JSON valide dont la structure métier est endommagée', () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{"tables":null}')
    expect(() => readJsonStrict(file, { tables: [] }, value => Array.isArray((value as any)?.tables))).toThrow(JsonStoreUnavailableError)
  })
})

describe('safeReadJson', () => {
  it('retourne le fallback si le fichier est absent', () => {
    const file = path.join(dir, 'missing.json')
    expect(safeReadJson(file, { fallback: true })).toEqual({ fallback: true })
  })

  it('récupère depuis .bak si le fichier principal est corrompu', () => {
    const file = path.join(dir, 'data.json')
    safeWriteJson(file, { v: 1 })
    safeWriteJson(file, { v: 2 })
    fs.writeFileSync(file, '{not valid json')
    expect(safeReadJson(file, { fallback: true })).toEqual({ v: 1 })
  })

  it('retourne le fallback si fichier ET .bak sont corrompus', () => {
    const file = path.join(dir, 'data.json')
    fs.writeFileSync(file, '{broken')
    fs.writeFileSync(file + '.bak', '{also broken')
    expect(safeReadJson(file, { fallback: true })).toEqual({ fallback: true })
  })
})
