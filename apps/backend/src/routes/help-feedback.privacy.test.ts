import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
vi.mock('fs', () => ({ default: { existsSync: () => true, readFileSync: () => JSON.stringify([{ articleId: 'fixture', vote: 'up', comment: 'Texte privé fictif à ne pas divulguer' }]) } }))
import router from './help-feedback'
describe('Ancien feedback global : pas de lecture publique intersociétés', () => {
  it.each(['/', '/stats'])('ferme explicitement %s sans lire ni publier les commentaires historiques', async url => {
    const result = await new Promise<any>((resolve, reject) => {
      const req = Object.assign(new EventEmitter(), { method: 'GET', url, headers: {} })
      const res = { statusCode: 200, set() { return this }, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { resolve({ status: this.statusCode, body }) } }
      router(req as any, res as any, error => error ? reject(error) : resolve({ status: 404 }))
    })
    expect(result.status).toBe(503)
    expect(JSON.stringify(result.body)).not.toContain('Texte privé')
    expect(result.body.code).toBe('HELP_FEEDBACK_SCOPE_MIGRATION_REQUIRED')
  })
})
