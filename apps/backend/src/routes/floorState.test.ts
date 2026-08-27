import { describe, expect, it } from 'vitest'
import {
  companyFloorFilename,
  getFloorState,
  remplacerPlanDeSalle,
} from './floorState'

describe('floorState — isolation par société', () => {
  it('génère un nom de fichier stable sans traversée de répertoire', () => {
    const filename = companyFloorFilename('../../societe/a')
    expect(filename).toMatch(/^floor-state\.[a-zA-Z0-9_-]+\.[a-f0-9]{12}\.json$/)
    expect(filename).not.toContain('..')
    expect(filename).not.toContain('/')
    expect(filename).not.toContain('\\')
  })

  it('ne partage ni tables ni modifications entre deux clients', () => {
    const suffix = `${Date.now()}-${Math.random()}`
    const companyA = `test-floor-a-${suffix}`
    const companyB = `test-floor-b-${suffix}`
    const stateA = getFloorState(companyA)
    const stateB = getFloorState(companyB)

    stateA.tables.push({
      id: 'table-privee-a', name: 'Table privée A', seats: 4,
      section: stateA.zones[0].name, shape: 'round', status: 'LIBRE',
      x: 120, y: 120, items: [],
    })
    stateA.zones.push({ id: 'privee-a', name: 'Salle privée A' })

    expect(stateB.tables.some((table) => table.id === 'table-privee-a')).toBe(false)
    expect(stateB.zones.some((zone) => zone.id === 'privee-a')).toBe(false)
    expect(stateA).not.toBe(stateB)
  })

  it('remplace seulement le plan de la société ciblée', () => {
    const suffix = `${Date.now()}-${Math.random()}`
    const companyA = `test-replace-a-${suffix}`
    const companyB = `test-replace-b-${suffix}`
    const originalB = getFloorState(companyB)
    const changedA = {
      ...getFloorState(companyA),
      tables: [{
        id: 'table-a', name: 'Table A', seats: 2,
        section: 'Salle principale', shape: 'round' as const, status: 'LIBRE' as const,
        x: 100, y: 100, items: [],
      }],
      updatedAt: Date.now(),
    }

    remplacerPlanDeSalle(changedA, companyA)

    expect(getFloorState(companyA).tables).toHaveLength(1)
    expect(getFloorState(companyB)).toBe(originalB)
    expect(getFloorState(companyB).tables).toEqual([])
  })
})
