import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addPhoto: (moduleId: string, dataUrl: string, category: PhotoCategory, caption?: string, author?: string) => void
  removePhoto: (id: string) => void
  updatePhoto: (id: string, patch: Partial<Photo>) => void
  byModule: (moduleId: string) => Photo[]
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const usePhotoWall = create<PhotoWallState>()(
  persist(
    (set, get) => ({
      photos: [],
      addPhoto: (moduleId, dataUrl, category, caption, author) => set((s) => ({
        photos: [{ id: uid(), dataUrl, category, caption, moduleId, author, addedAt: Date.now() }, ...s.photos],
      })),
      removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
      updatePhoto: (id, patch) => set((s) => ({
        photos: s.photos.map((p) => p.id !== id ? p : { ...p, ...patch }),
      })),
      byModule: (moduleId) => get().photos.filter((p) => p.moduleId === moduleId),
    }),
    {
      name: 'creorga-photo-wall',
      // Limit localStorage pressure — only keep 50 most recent photos
      partialize: (s) => ({ photos: s.photos.slice(0, 50) }),
    }
  )
)
