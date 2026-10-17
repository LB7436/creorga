import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../lib/eventSink', () => ({ push: () => {} }))
vi.mock('../lib/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const original = process.cwd()
let root = ''
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-audit-arret-fictif-')); process.chdir(root); vi.resetModules(); vi.useFakeTimers() })
afterEach(() => { process.chdir(original); vi.restoreAllMocks(); vi.useRealTimers() /* fixtures conservées */ })
async function entry() {
  const module = await import('./audit-log')
  const res = Object.assign(new EventEmitter(), { statusCode: 201 })
  module.auditLog({ method: 'POST', path: '/api/invoices', originalUrl: '/api/invoices', body: { requestId: 'fictif' } } as any, res as any, () => {})
  res.emit('finish')
  return module
}
describe('audit fichier à l’arrêt', () => {
  it('persiste immédiatement une mutation encore dans le tampon des deux secondes', async () => {
    const audit = await entry()
    await audit.flushAuditLog()
    const stored = JSON.parse(fs.readFileSync(path.join(root, 'data/audit-log.json'), 'utf8'))
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ status: 201, path: '/api/invoices', body: { requestId: 'fictif' } })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('un fsync échoué refuse un arrêt propre et laisse la mutation réessayable', async () => {
    const audit = await entry()
    const failure = vi.spyOn(fs, 'fsyncSync').mockImplementationOnce(() => { throw new Error('fsync fictif refusé') })
    await expect(audit.flushAuditLog()).rejects.toThrow(/fsync fictif/)
    failure.mockRestore()
    await audit.flushAuditLog()
    const stored = JSON.parse(fs.readFileSync(path.join(root, 'data/audit-log.json'), 'utf8'))
    expect(stored).toHaveLength(1)
  })
})
