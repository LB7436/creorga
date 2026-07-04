import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { safeWriteJson, safeReadJson } from './safe-json'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-safejson-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
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
