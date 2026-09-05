import { describe, it, expect } from 'vitest'
import { csvField, buildCsv } from './csv'
describe('CSV sûr pour Excel', () => {
  it.each(['=1+1', '+cmd', '-cmd', '@SUM(A1)', '  =1+1', '\t=1+1'])('neutralise la formule %s', (text) => {
    expect(csvField(text).startsWith('"\'')).toBe(true)
  })
  it('conserve les nombres sommables, les accents, le BOM et les guillemets', () => {
    expect(csvField(-12.5)).toBe('-12,5')
    expect(csvField('Émilie "Test"')).toBe('"Émilie ""Test"""')
    expect(buildCsv(['Prénom', 'Montant'], [['Émilie', 12.5]])).toBe('\uFEFF"Prénom";"Montant"\r\n"Émilie";12,5')
  })
})
