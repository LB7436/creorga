import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User, UserCompany } from '@/types'

const saved = new Map<string, string>()
const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) }
vi.stubGlobal('localStorage', storage)
const { useAuthStore } = await import('./authStore')
const wall = await import('./photoWallStore')
const { usePhotoWall } = wall
const imageA = 'data:image/png;base64,RklDVElGLUE='
const imageB = 'data:image/png;base64,RklDVElGLUI='
function login(id = 'user-a') {
  const user: User = { id, email: `${id}@fixture.invalid`, firstName: 'Fictif', lastName: 'Photos', avatar: null }
  const companies: UserCompany[] = ['company-a', 'company-b'].map(companyId => ({ id: `membership-${companyId}`, companyId, userId: id, role: 'OWNER', isActive: true, company: { id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR' } }))
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies })
}
beforeEach(() => {
  vi.stubGlobal('localStorage', storage)
  useAuthStore.getState().logout(); saved.clear()
  usePhotoWall.setState({ photos: [], albums: {}, legacyPhotoCount: 0 } as any)
  login()
})
afterEach(() => { useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('mur photos local attribué au compte, à la société et à la vue', () => {
  it('masque immédiatement les photos de A dans B, puis retrouve seulement A au retour', () => {
    usePhotoWall.getState().addPhoto('clients', imageA, 'other', 'Photo fictive A')
    useAuthStore.getState().setActiveCompany('company-b')
    expect(usePhotoWall.getState().byModule('clients')).toEqual([])
    usePhotoWall.getState().addPhoto('clients', imageB, 'other', 'Photo fictive B')
    useAuthStore.getState().setActiveCompany('company-a')
    expect(usePhotoWall.getState().byModule('clients').map(photo => photo.dataUrl)).toEqual([imageA])
  })
  it('ne montre pas le cache propriétaire dans une vue employé ou un autre compte', () => {
    usePhotoWall.getState().addPhoto('clients', imageA, 'staff')
    useAuthStore.getState().setViewMode('employee', 'employee-fictif')
    expect(usePhotoWall.getState().photos).toEqual([])
    login('user-b')
    expect(usePhotoWall.getState().photos).toEqual([])
    useAuthStore.getState().logout()
    expect(usePhotoWall.getState().photos).toEqual([])
  })
  it('ne peut ni modifier ni supprimer une photo d’un autre périmètre', () => {
    usePhotoWall.getState().addPhoto('clients', imageA, 'other', 'Original fictif')
    const id = usePhotoWall.getState().photos[0].id
    useAuthStore.getState().setActiveCompany('company-b')
    usePhotoWall.getState().updatePhoto(id, { caption: 'Interdit' })
    usePhotoWall.getState().removePhoto(id)
    useAuthStore.getState().setActiveCompany('company-a')
    expect(usePhotoWall.getState().photos.map(photo => photo.caption)).toEqual(['Original fictif'])
  })
  it('ne publie pas une lecture de fichier tardive après A → B → A', () => {
    const context = (wall as any).capturePhotoWallContext?.()
    useAuthStore.getState().setActiveCompany('company-b')
    useAuthStore.getState().setActiveCompany('company-a')
    const result = usePhotoWall.getState().addPhoto('clients', imageA, 'other', undefined, undefined, context)
    expect(result).toBe(false)
    expect(usePhotoWall.getState().photos).toEqual([])
  })
  it('refuse l’ajout déconnecté et conserve l’album lors d’une reconnexion du même compte', () => {
    usePhotoWall.getState().addPhoto('clients', imageA, 'other')
    useAuthStore.getState().logout()
    expect(usePhotoWall.getState().addPhoto('clients', imageB, 'other')).toBe(false)
    login()
    expect(usePhotoWall.getState().photos.map(photo => photo.dataUrl)).toEqual([imageA])
  })
  it('garde l’ancien cache non attribué intact, sans l’importer après réhydratation', async () => {
    const original = JSON.stringify({ state: { photos: [{ id: 'legacy', moduleId: 'clients', dataUrl: imageA, category: 'other', addedAt: 1 }] }, version: 0 })
    saved.set('creorga-photo-wall', original)
    await usePhotoWall.persist.rehydrate()
    expect(usePhotoWall.getState().photos).toEqual([])
    expect(saved.get('creorga-photo-wall')).toBe(original)
  })
  it('ne supprime pas silencieusement les photos plus anciennes à la persistance', () => {
    for (let index = 0; index < 52; index++) usePhotoWall.getState().addPhoto('clients', imageA, 'other', `Fictif ${index}`)
    const payloads = [...saved.entries()].filter(([key]) => key.startsWith('creorga-photo-wall'))
    const stored = payloads.map(([, value]) => value).join('')
    expect(stored).toContain('Fictif 0')
    expect(stored).toContain('Fictif 51')
    expect(usePhotoWall.getState().photos).toHaveLength(52)
  })
  it('ne montre pas une photo comme enregistrée si le navigateur refuse sa persistance', () => {
    const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota fictif dépassé') })
    try {
      expect(() => usePhotoWall.getState().addPhoto('clients', imageA, 'other')).toThrow('Quota fictif dépassé')
      expect(usePhotoWall.getState().photos).toEqual([])
    } finally { setItem.mockRestore() }
  })
})
