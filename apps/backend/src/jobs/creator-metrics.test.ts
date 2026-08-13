import { describe, it, expect } from 'vitest'
import { agregerUsage, jourLocal } from './creator-metrics'

describe('agregerUsage', () => {
  it('repondère les GET échantillonnés à 1/5 (×5) et compte les mutations brut', () => {
    const { moduleUsage, mutations } = agregerUsage([
      { module: 'crm', method: 'GET', nombre: 4 }, // échantillon → 20 lectures estimées
      { module: 'crm', method: 'POST', nombre: 3 },
      { module: 'haccp', method: 'PUT', nombre: 2 },
    ])
    expect(moduleUsage).toEqual({ crm: 23, haccp: 2 })
    expect(mutations).toBe(5)
  })

  it('sans événement : usage vide, zéro mutation', () => {
    expect(agregerUsage([])).toEqual({ moduleUsage: {}, mutations: 0 })
  })
})

describe('jourLocal', () => {
  it("ramène n'importe quelle heure au minuit local du même jour", () => {
    const j = jourLocal(new Date(2026, 7, 13, 17, 45, 12))
    expect([j.getFullYear(), j.getMonth(), j.getDate()]).toEqual([2026, 7, 13])
    expect([j.getHours(), j.getMinutes(), j.getSeconds(), j.getMilliseconds()]).toEqual([0, 0, 0, 0])
  })
})
