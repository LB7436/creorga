import { describe, it, expect } from 'vitest'
import router, { filtrerParSociete, macroFileForCompany, validateMacro } from './owner'
import { EventEmitter } from 'node:events'

// Preuve du correctif : /api/owner/audit renvoyait le journal de TOUTES les
// sociétés à n'importe quel OWNER.
describe('filtrerParSociete', () => {
  const entrees = [
    { id: 'a1', companyId: 'societe-a', module: 'crm' },
    { id: 'b1', companyId: 'societe-b', module: 'crm' },
    { id: 'l1', module: 'system' }, // entrée historique sans companyId
    { id: 'l2', companyId: null, module: 'auth' }, // idem, null explicite
  ]

  it("ne montre à une société que ses entrées explicitement estampillées", () => {
    const vues = filtrerParSociete(entrees, 'societe-a')
    expect(vues.map((e) => e.id)).toEqual(['a1'])
  })

  it("ne laisse jamais passer l'entrée d'une autre société", () => {
    const vues = filtrerParSociete(entrees, 'societe-b')
    expect(vues.some((e) => e.companyId === 'societe-a')).toBe(false)
  })

  it('tableau vide → tableau vide', () => {
    expect(filtrerParSociete([], 'societe-a')).toEqual([])
  })
  it('aucune société n’obtient l’historique global par contexte absent', () => {
    expect(filtrerParSociete(entrees, undefined)).toEqual([])
  })
})

describe('macros propriétaire', () => {
  it('isole le fichier de chaque société sans permettre une traversée de chemin', () => {
    expect(macroFileForCompany('societe-a')).not.toBe(macroFileForCompany('societe-b'))
    expect(macroFileForCompany('../../secret')).not.toContain('..')
  })

  it('refuse une macro vide ou surdimensionnée', () => {
    expect(validateMacro({ name: '', intents: [] })).toBeNull()
    expect(validateMacro({ name: 'Test', intents: Array.from({ length: 11 }, () => 'action') })).toBeNull()
  })

  it('normalise une macro valide', () => {
    expect(validateMacro({ name: '  Fermeture  ', icon: '', intents: ['  fermer la caisse  ', ''] }))
      .toEqual({ name: 'Fermeture', icon: '⚡', intents: ['fermer la caisse'] })
  })
})

describe('absence de réécriture globale depuis un compte société', () => {
  it.each(['/audit', '/purge-inactive-customers'])('refuse POST %s sans opération de stockage', async url => {
    const result = await new Promise<any>((resolve, reject) => {
      const req = Object.assign(new EventEmitter(), { method: 'POST', url, headers: {}, body: { companyId: 'autre-societe', id: 'forgé' } })
      const res = { statusCode: 200, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { resolve({ status: this.statusCode, body }); return this } }
      router(req as any, res as any, error => error ? reject(error) : resolve({ status: 404 }))
    })
    expect(result.status).toBe(503)
    expect(result.body.ok).not.toBe(true)
    expect(result.body.purged).toBeUndefined()
  })
})
