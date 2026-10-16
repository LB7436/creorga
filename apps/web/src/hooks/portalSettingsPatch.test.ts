import { describe, expect, it } from 'vitest'
import { portalSettingsPatch } from './portalSettingsPatch'
const old = { toggles: { menu: true, order: true }, games: { mensch: true }, welcomeMessage: '', accentColor: '#6366f1', tableNumber: '1', themeMode: 'dark' as const }
describe('écritures partielles du configurateur portail', () => {
  it('enregistrer le message d’un onglet ancien ne réactive pas le menu changé ailleurs', () => {
    const patch = portalSettingsPatch(old, { ...old, welcomeMessage: 'FICTIF nouveau' }, true)
    expect(patch).toEqual({ welcomeMessage: 'FICTIF nouveau' })
    expect({ ...old.toggles, menu: false, ...patch.toggles }).toMatchObject({ menu: false })
  })
  it('une bascule ne transmet que sa clé et conserve les champs sans changement', () => {
    expect(portalSettingsPatch(old, { ...old, toggles: { ...old.toggles, order: false } }, true)).toEqual({ toggles: { order: false } })
    expect(portalSettingsPatch(old, old, true)).toEqual({})
  })
  it('conserve les chaînes vides explicites sans toucher aux jeux dans le profil métier', () => {
    expect(portalSettingsPatch({ ...old, welcomeMessage: 'FICTIF' }, { ...old, games: { mensch: false } }, false)).toEqual({ welcomeMessage: '' })
  })
})
