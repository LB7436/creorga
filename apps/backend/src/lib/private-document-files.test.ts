import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { privateDocumentPath, storePrivateDocument } from './private-document-files'
let root: string
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-document-test-')) })
afterEach(() => {
  vi.restoreAllMocks()
  const resolved = path.resolve(root)
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('creorga-document-test-')) throw new Error('Cleanup refused')
  fs.rmSync(resolved, { recursive: true, force: true })
})
describe('durability of private uploaded documents', () => {
  it('never overwrites or removes a file that already existed', () => {
    storePrivateDocument(root, 'document.pdf', Buffer.from('original'))
    expect(() => storePrivateDocument(root, 'document.pdf', Buffer.from('replacement'))).toThrow()
    expect(fs.readFileSync(path.join(root, 'document.pdf'), 'utf8')).toBe('original')
  })
  it('does not leave a success or incomplete new file after flush fails', () => {
    vi.spyOn(fs, 'fsyncSync').mockImplementationOnce(() => { throw new Error('simulated disk failure') })
    expect(() => storePrivateDocument(root, 'new.pdf', Buffer.from('not durable'))).toThrow('disk failure')
    expect(fs.existsSync(path.join(root, 'new.pdf'))).toBe(false)
  })
  it('rejects paths, control characters and an alternate Windows stream', () => {
    for (const value of ['../secret', '..', 'document.pdf:stream', 'file.pdf\n', '/root', 'folder/file.pdf']) expect(() => privateDocumentPath(root, value)).toThrow()
    expect(fs.readdirSync(root)).toEqual([])
  })
})
