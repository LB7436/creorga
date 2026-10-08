import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

const operations = vi.hoisted(() => ({ run: vi.fn(), list: vi.fn().mockReturnValue([]) }))
vi.mock('../jobs/backup-worker', () => ({ runFullBackup: operations.run, listFullBackups: operations.list }))
import backupRouter from './backup'

describe('sauvegardes globales — aucun accès depuis le routeur société', () => {
  const app = express()
  app.use((req: any, _res, next) => {
    req.user = { userId: 'owner-fixture', email: 'owner@fixture.invalid' }
    req.companyId = 'company-fixture'
    req.role = 'OWNER'
    next()
  })
  app.use('/api/backup', backupRouter)

  it.each([
    ['get', '/full'],
    ['post', '/full'],
    ['get', '/full/creorga-full-2026-10-08-1200.zip/download'],
    ['post', '/full/creorga-full-2026-10-08-1200.zip/restore'],
    ['delete', '/full/creorga-full-2026-10-08-1200.zip'],
  ] as const)('un propriétaire ne peut pas %s %s', async (method, route) => {
    const response = await request(app)[method](`/api/backup${route}`)
    expect(response.status).toBe(503)
    expect(response.body.code).toBe('COMPANY_BACKUP_MIGRATION_REQUIRED')
    expect(response.body).not.toHaveProperty('backups')
    expect(response.body).not.toHaveProperty('filename')
    expect(operations.run).not.toHaveBeenCalled()
    expect(operations.list).not.toHaveBeenCalled()
  })
})
