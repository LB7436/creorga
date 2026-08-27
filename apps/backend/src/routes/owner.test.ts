import { describe, it, expect } from 'vitest'
import { filtrerParSociete, macroFileForCompany, validateMacro } from './owner'

// Preuve du correctif : /api/owner/audit renvoyait le journal de TOUTES les
// sociétés à n'importe quel OWNER.
describe('filtrerParSociete', () => {
  const entrees = [
    { id: 'a1', companyId: 'societe-a', module: 'crm' },
    { id: 'b1', companyId: 'societe-b', module: 'crm' },
    { id: 'l1', module: 'system' }, // entrée historique sans companyId
    { id: 'l2', companyId: null, module: 'auth' }, // idem, null explicite
  ]

  it("ne montre à une société que ses entrées (et l'historique non estampillé)", () => {
    const vues = filtrerParSociete(entrees, 'societe-a')
    expect(vues.map((e) => e.id)).toEqual(['a1', 'l1', 'l2'])
  })

  it("ne laisse jamais passer l'entrée d'une autre société", () => {
    const vues = filtrerParSociete(entrees, 'societe-b')
    expect(vues.some((e) => e.companyId === 'societe-a')).toBe(false)
  })

  it('tableau vide → tableau vide', () => {
    expect(filtrerParSociete([], 'societe-a')).toEqual([])
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
