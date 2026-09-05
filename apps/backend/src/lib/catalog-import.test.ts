import { describe, it, expect } from 'vitest'
import { importedProductId } from './catalog-import'

describe('Identité des imports de catalogue', () => {
  const product = { name: 'Café', category: 'Boissons' }
  it('reste stable pour une reprise du même fichier', () => {
    expect(importedProductId('a', product)).toBe(importedProductId('a', { ...product }))
    expect(importedProductId('a', product)).toBe(importedProductId('a', { ...product, name: 'Cafe\u0301' }))
  })
  it('isole les sociétés et les identifiants du fichier source', () => {
    expect(importedProductId('a', product)).not.toBe(importedProductId('b', product))
    expect(importedProductId('a', { ...product, id: '1' })).not.toBe(importedProductId('a', { ...product, id: '2' }))
  })
})
