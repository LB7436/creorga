import { describe, it, expect } from 'vitest'
import { masquerChampsSensibles } from './audit-purge'

// Preuve du correctif : le journal legacy contenait mots de passe et emails
// en clair (persistés avant le masquage à l'écriture du 11 août 2026).
describe('masquerChampsSensibles', () => {
  it('masque mots de passe et identités, préserve le reste', () => {
    const { entries, masques } = masquerChampsSensibles([
      { id: 'a', body: { email: 'personne@exemple.lu', password: 'EnClair!', name: 'Espresso' } },
      { id: 'b', body: { PIN: '0000', montant: '12.50' } },
    ])
    expect(entries[0].body).toEqual({ email: '***', password: '***', name: 'Espresso' })
    expect(entries[1].body).toEqual({ PIN: '***', montant: '12.50' })
    expect(masques).toBe(3)
  })

  it('ne recompte pas un champ déjà masqué (relance idempotente)', () => {
    const { masques } = masquerChampsSensibles([{ id: 'a', body: { password: '***' } }])
    expect(masques).toBe(0)
  })

  it('ignore les entrées sans corps', () => {
    const { entries, masques } = masquerChampsSensibles([{ id: 'a' }, { id: 'b', body: null }])
    expect(entries).toHaveLength(2)
    expect(masques).toBe(0)
  })
})
