import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/safe-json', () => ({ safeReadJson: () => [], safeWriteJson: () => {} }))
vi.mock('../lib/eventSink', () => ({ push: () => {} }))
import { auditLog, readAuditEntries } from './audit-log'

describe('Journal du téléchargement capacitaire', () => {
  it('conserve le résultat mais jamais le corps ou la query du point de téléchargement exact', () => {
    const secret = 'CAPACITE-FICTIVE-NE-PAS-CONSIGNER'
    const req = { method: 'POST', path: '/api/document-download', originalUrl: `/api/document-download?copie=${secret}`, body: { token: secret, malformedSecret: secret } }
    const res = Object.assign(new EventEmitter(), { statusCode: 400 })
    auditLog(req as any, res as any, () => {})
    res.emit('finish')
    const entry = readAuditEntries()[0]
    expect(entry.status).toBe(400)
    expect(entry.path).toBe('/api/document-download')
    expect(JSON.stringify(entry)).not.toContain(secret)
  })
  it('ne désactive ni le contenu non sensible ni le statut des autres actions métier', () => {
    const req = { method: 'POST', path: '/api/invoices', originalUrl: '/api/invoices', body: { requestId: 'fictif', token: 'secret', notes: 'Note fictive' } }
    const res = Object.assign(new EventEmitter(), { statusCode: 201 })
    auditLog(req as any, res as any, () => {})
    res.emit('finish')
    expect(readAuditEntries()[0]).toMatchObject({ path: '/api/invoices', status: 201, body: { notes: 'Note fictive', token: '***' } })
  })
})
