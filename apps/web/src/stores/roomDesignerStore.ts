import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Room designer — walls, windows, counter, stairs, doors, plants.
 * Draws on a 2D canvas. Each element has a type + geometry.
 */

export type ElementType = 'wall' | 'window' | 'door' | 'counter' | 'stairs' | 'plant' | 'bar'

export interface RoomElement {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  angle?: number
  label?: string
  color?: string
}

export interface Room {
  id: string
  name: string
  elements: RoomElement[]
  width: number
  height: number
}

interface RoomDesignerState {
  rooms: Room[]
  activeRoomId: string | null
  // Actions
  addRoom: (name: string) => string
  removeRoom: (id: string) => void
  setActiveRoom: (id: string) => void
  addElement: (roomId: string, el: Omit<RoomElement, 'id'>) => void
  updateElement: (roomId: string, id: string, patch: Partial<RoomElement>) => void
  removeElement: (roomId: string, id: string) => void
  clearElements: (roomId: string) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_ROOM: Room = {
  id: 'room-main',
  name: 'Salle principale',
  width: 800,
  height: 600,
  elements: [
    // Sample layout for Café um Rond-Point
    { id: uid(), type: 'wall',    x: 0,   y: 0,   w: 800, h: 8 },
    { id: uid(), type: 'wall',    x: 0,   y: 0,   w: 8,   h: 600 },
    { id: uid(), type: 'wall',    x: 792, y: 0,   w: 8,   h: 600 },
    { id: uid(), type: 'wall',    x: 0,   y: 592, w: 800, h: 8 },
    { id: uid(), type: 'window',  x: 100, y: 0,   w: 120, h: 10 },
    { id: uid(), type: 'window',  x: 400, y: 0,   w: 120, h: 10 },
    { id: uid(), type: 'door',    x: 350, y: 592, w: 80,  h: 10 },
    { id: uid(), type: 'counter', x: 40,  y: 60,  w: 220, h: 40, label: 'Comptoir' },
    { id: uid(), type: 'bar',     x: 600, y: 80,  w: 160, h: 60, label: 'Bar' },
    { id: uid(), type: 'stairs',  x: 600, y: 420, w: 160, h: 120, label: 'Escaliers' },
    { id: uid(), type: 'plant',   x: 40,  y: 480, w: 40,  h: 40 },
  ],
}

export const useRoomDesigner = create<RoomDesignerState>()(
  persist(
    (set) => ({
      rooms: [DEFAULT_ROOM],
      activeRoomId: DEFAULT_ROOM.id,

      addRoom: (name) => {
        const id = `room-${uid()}`
        set((s) => ({
          rooms: [...s.rooms, { id, name, elements: [], width: 800, height: 600 }],
          activeRoomId: id,
        }))
        return id
      },

      removeRoom: (id) => set((s) => ({
        rooms: s.rooms.filter((r) => r.id !== id),
        activeRoomId: s.activeRoomId === id ? (s.rooms[0]?.id ?? null) : s.activeRoomId,
      })),

      setActiveRoom: (id) => set({ activeRoomId: id }),

      addElement: (roomId, el) => set((s) => ({
        rooms: s.rooms.map((r) => r.id !== roomId ? r : {
          ...r, elements: [...r.elements, { ...el, id: uid() }],
        }),
      })),

      updateElement: (roomId, id, patch) => set((s) => ({
        rooms: s.rooms.map((r) => r.id !== roomId ? r : {
          ...r, elements: r.elements.map((e) => e.id !== id ? e : { ...e, ...patch }),
        }),
      })),

      removeElement: (roomId, id) => set((s) => ({
        rooms: s.rooms.map((r) => r.id !== roomId ? r : {
          ...r, elements: r.elements.filter((e) => e.id !== id),
        }),
      })),

      clearElements: (roomId) => set((s) => ({
        rooms: s.rooms.map((r) => r.id !== roomId ? r : { ...r, elements: [] }),
      })),
    }),
    { name: 'creorga-room-designer' }
  )
)

export const ELEMENT_STYLES: Record<ElementType, { fill: string; stroke: string; emoji: string; label: string }> = {
  wall:    { fill: '#374151', stroke: '#1f2937', emoji: '🧱', label: 'Mur' },
  window:  { fill: '#bae6fd', stroke: '#0284c7', emoji: '🪟', label: 'Fenêtre' },
  door:    { fill: '#fde68a', stroke: '#ca8a04', emoji: '🚪', label: 'Porte' },
  counter: { fill: '#d8b4fe', stroke: '#7e22ce', emoji: '🪵', label: 'Comptoir' },
  bar:     { fill: '#fca5a5', stroke: '#b91c1c', emoji: '🍸', label: 'Bar' },
  stairs:  { fill: '#9ca3af', stroke: '#4b5563', emoji: '📶', label: 'Escaliers' },
  plant:   { fill: '#86efac', stroke: '#166534', emoji: '🪴', label: 'Plante' },
}
