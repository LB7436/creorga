import { afterEach, describe, expect, it, vi } from 'vitest'
import { planningShiftLabels } from './email'

afterEach(() => vi.unstubAllEnvs())

describe('Libellés du planning : calendrier Europe/Luxembourg', () => {
  it.each([
    ['2026-10-17T21:00:00Z', '2026-10-18T01:00:00Z', '17/10', '23:00', '03:00 (18/10/2026)'],
    ['2026-01-17T22:00:00Z', '2026-01-18T02:00:00Z', '17/01', '23:00', '03:00 (18/01/2026)'],
    ['2026-07-17T21:00:00Z', '2026-07-18T01:00:00Z', '17/07', '23:00', '03:00 (18/07/2026)'],
    ['2026-03-28T22:00:00Z', '2026-03-29T01:30:00Z', '28/03', '23:00', '03:30 (29/03/2026)'],
    ['2026-10-24T21:00:00Z', '2026-10-25T02:30:00Z', '24/10', '23:00', '03:30 (25/10/2026)'],
    ['2026-07-17T21:00:00Z', '2026-07-19T01:00:00Z', '17/07', '23:00', '03:00 (19/07/2026)'],
    ['2026-12-31T22:00:00Z', '2027-01-01T02:00:00Z', '31/12', '23:00', '03:00 (01/01/2027)'],
    // The UTC day is unchanged, but the Luxembourg calendar day changes.
    ['2026-07-17T21:00:00Z', '2026-07-17T23:00:00Z', '17/07', '23:00', '01:00 (18/07/2026)'],
  ])('préserve les heures et rend la date de fin de %s → %s', (start, end, date, expectedStart, expectedEnd) => {
    vi.stubEnv('TZ', 'Europe/Luxembourg')
    const labels = planningShiftLabels(new Date(start), new Date(end))
    expect(labels.date).toContain(date)
    expect(labels.start).toBe(expectedStart)
    expect(labels.end).toBe(expectedEnd)
  })

  it('conserve les horaires de journée sans date de fin redondante', () => {
    vi.stubEnv('TZ', 'Europe/Luxembourg')
    const labels = planningShiftLabels(new Date('2026-10-18T04:00:00Z'), new Date('2026-10-18T10:00:00Z'))
    expect(labels.date).toContain('18/10')
    expect(labels.start).toBe('06:00')
    expect(labels.end).toBe('12:00')
  })

  it('ne confond pas un changement de date UTC avec le lendemain local', () => {
    vi.stubEnv('TZ', 'Europe/Luxembourg')
    const labels = planningShiftLabels(new Date('2026-07-17T22:30:00Z'), new Date('2026-07-18T00:30:00Z'))
    expect(labels.date).toContain('18/07')
    expect(labels.start).toBe('00:30')
    expect(labels.end).toBe('02:30')
  })

  it.each(['UTC', 'America/New_York'])('ne dépend pas du fuseau %s du serveur', serverZone => {
    vi.stubEnv('TZ', serverZone)
    const labels = planningShiftLabels(new Date('2026-10-17T21:00:00Z'), new Date('2026-10-18T01:00:00Z'))
    expect(labels.date).toContain('17/10')
    expect(labels.start).toBe('23:00')
    expect(labels.end).toBe('03:00 (18/10/2026)')
  })

  it('ne modifie aucun instant historique fourni', () => {
    const start = new Date('2026-10-17T21:00:00Z'), end = new Date('2026-10-18T01:00:00Z')
    planningShiftLabels(start, end)
    expect(start.toISOString()).toBe('2026-10-17T21:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-18T01:00:00.000Z')
  })
})
