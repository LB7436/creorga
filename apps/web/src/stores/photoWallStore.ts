import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'
import { authDataScope } from '@/lib/authScope'

export type PhotoCategory = 'staff' | 'clients' | 'café' | 'event' | 'other'

export interface Photo {
  id: string
  dataUrl: string
  category: PhotoCategory
  caption?: string
  addedAt: number
  moduleId: string // which module the photo belongs to
  author?: string
}

interface PhotoWallState {
  photos: Photo[]
  albums: Record<string, Photo[]>
  legacyPhotoCount: number
  addPhoto: (moduleId: string, dataUrl: string, category: PhotoCategory, caption?: string, author?: string, context?: string) => boolean
  removePhoto: (id: string) => void
  updatePhoto: (id: string, patch: Partial<Photo>) => void
  byModule: (moduleId: string) => Photo[]
}

const uid = () => Math.random().toString(36).slice(2, 10)
const STORAGE_KEY = 'creorga-photo-wall-scoped-v1'
let generation = 0
let currentContext = authDataScope(useAuthStore.getState())

// L'album est personnel, local à ce navigateur et à cette adhésion/vue. Il ne
// devient pas un dossier RH partagé. La génération, elle, reste en mémoire.
function albumKey(): string | null {
  const state = useAuthStore.getState()
  if (!state.isAuthenticated || !state.user?.id || !state.companyId) return null
  return JSON.stringify([state.user.id, state.companyId, state.role, state.viewMode, state.viewAsEmployeeId])
}

export function capturePhotoWallContext(): string {
  return JSON.stringify([generation, authDataScope(useAuthStore.getState())])
}

function legacyCount(): number {
  try {
    const value = localStorage.getItem('creorga-photo-wall')
    const photos = value ? JSON.parse(value)?.state?.photos : null
    return Array.isArray(photos) ? photos.length : 0
  } catch { return 0 }
}

function persistAlbums(albums: Record<string, Photo[]>): void {
  // Vérifier l'écriture AVANT d'afficher le succès en mémoire (quota, accès
  // interdit...). Aucune purge d'anciennes photos pour gagner de la place.
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { albums }, version: 0 }))
}

export const usePhotoWall = create<PhotoWallState>()(
  persist(
    (set, get) => ({
      photos: [], albums: {}, legacyPhotoCount: legacyCount(),
      addPhoto: (moduleId, dataUrl, category, caption, author, context) => {
        const key = albumKey()
        if (!key || (context !== undefined && context !== capturePhotoWallContext())) return false
        const photos = [{ id: uid(), dataUrl, category, caption, moduleId, author, addedAt: Date.now() }, ...(get().albums[key] ?? [])]
        const albums = { ...get().albums, [key]: photos }
        persistAlbums(albums)
        set({ photos, albums })
        return true
      },
      removePhoto: (id) => {
        const key = albumKey()
        if (!key) return
        const photos = (get().albums[key] ?? []).filter(photo => photo.id !== id)
        const albums = { ...get().albums, [key]: photos }
        persistAlbums(albums)
        set({ photos, albums })
      },
      updatePhoto: (id, patch) => {
        const key = albumKey()
        if (!key) return
        const photos = (get().albums[key] ?? []).map(photo => photo.id !== id ? photo : { ...photo, ...patch, id: photo.id, moduleId: photo.moduleId })
        const albums = { ...get().albums, [key]: photos }
        persistAlbums(albums)
        set({ photos, albums })
      },
      byModule: (moduleId) => get().photos.filter((p) => p.moduleId === moduleId),
    }),
    {
      // Ne jamais réattribuer ni écraser l'ancien cache global non attribuable.
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: key => localStorage.getItem(key),
        // L'écriture durable ci-dessus est identique ; ne pas écrire deux fois
        // ni réécrire les albums lors d'un simple changement de contexte.
        setItem: (key, value) => { if (localStorage.getItem(key) !== value) localStorage.setItem(key, value) },
        removeItem: key => localStorage.removeItem(key),
      })),
      partialize: (state) => ({ albums: state.albums }),
      merge: (persisted, current) => {
        const albums = (persisted as Partial<PhotoWallState> | null)?.albums ?? current.albums
        const key = albumKey()
        return { ...current, albums, photos: key ? albums[key] ?? [] : [], legacyPhotoCount: legacyCount() }
      },
    }
  )
)

useAuthStore.subscribe(state => {
  const context = authDataScope(state)
  if (context === currentContext) return
  currentContext = context; generation++
  const key = albumKey()
  usePhotoWall.setState(current => ({ photos: key ? current.albums[key] ?? [] : [], legacyPhotoCount: legacyCount() }))
})
