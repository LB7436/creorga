import { describe, expect, it } from 'vitest'
import { createPlanningRange, readPlanningTiming, planningNetHours, planningEmployeeRows, planningTeamOptions, planningCalendarSegment } from './planningTime'

describe('horaires du planning Luxembourg', () => {
  // Ces valeurs UTC sont indépendantes du fuseau du poste qui lance Vitest.
  it('ne passe qu’une fois au lendemain pour une fin explicite à 24 h', () => {
    const range = createPlanningRange(new Date(2026, 9, 15), 20, 24)
    expect(range.startTime).toBe('2026-10-15T18:00:00.000Z')
    expect(range.endTime).toBe('2026-10-15T22:00:00.000Z')
    expect(range.durationMinutes).toBe(240)
  })

  it.each([
    [23, 3, '2026-10-15T21:00:00.000Z', '2026-10-16T01:00:00.000Z', 240],
    [22, 6, '2026-10-15T20:00:00.000Z', '2026-10-16T04:00:00.000Z', 480],
    [23, 27, '2026-10-15T21:00:00.000Z', '2026-10-16T01:00:00.000Z', 240],
  ])('normalise %s → %s sans doubler le passage à minuit', (start, end, startTime, endTime, duration) => {
    const range = createPlanningRange(new Date(2026, 9, 15), start as number, end as number)
    expect(range).toEqual({ startTime, endTime, durationMinutes: duration })
  })

  it.each([
    [new Date(2026, 0, 31), '2026-01-31T22:00:00.000Z', '2026-02-01T02:00:00.000Z'],
    [new Date(2026, 11, 31), '2026-12-31T22:00:00.000Z', '2027-01-01T02:00:00.000Z'],
  ])('conserve les changements de mois et d’année', (date, startTime, endTime) => {
    expect(createPlanningRange(date as Date, 23, 3)).toEqual({ startTime, endTime, durationMinutes: 240 })
  })

  it.each([
    [new Date(2026, 2, 28), '2026-03-28T21:00:00.000Z', '2026-03-29T04:00:00.000Z', 420],
    [new Date(2026, 9, 24), '2026-10-24T20:00:00.000Z', '2026-10-25T05:00:00.000Z', 540],
  ])('calcule le temps écoulé pendant le changement d’heure', (date, startTime, endTime, duration) => {
    expect(createPlanningRange(date as Date, 22, 6)).toEqual({ startTime, endTime, durationMinutes: duration })
  })

  it('ne déplace pas silencieusement une heure inexistante ou ambiguë', () => {
    expect(() => createPlanningRange(new Date(2026, 2, 29), 2, 6)).toThrow(/inexistante/i)
    expect(() => createPlanningRange(new Date(2026, 9, 25), 2, 6)).toThrow(/ambiguë/i)
  })

  it('refuse les heures invalides et une durée nulle avant envoi', () => {
    expect(() => createPlanningRange(new Date(2026, 9, 15), 8, 8)).toThrow()
    expect(() => createPlanningRange(new Date(2026, 9, 15), -1, 8)).toThrow()
    expect(() => createPlanningRange(new Date(2026, 9, 15), 8, Number.NaN)).toThrow()
  })

  it('préserve les minutes et les pauses historiques au lieu de les réduire à trente minutes', () => {
    const timing = readPlanningTiming('2026-10-15T20:15:00.000Z', '2026-10-16T04:45:00.000Z', 45)
    expect(timing).toMatchObject({ startHour: 22, startMin: 15, endHour: 30, endMin: 45, durationMinutes: 510, breakMinutes: 45 })
    expect(planningNetHours(timing)).toBe(7.75)
  })

  it('sépare les jours calendaires du temps écoulé autour des changements d’heure', () => {
    const timing = readPlanningTiming('2026-03-28T21:00:00.000Z', '2026-03-29T04:00:00.000Z', 30)
    expect(timing).toMatchObject({ startHour: 22, endHour: 30, durationMinutes: 420, breakMinutes: 30 })
    expect(planningNetHours(timing)).toBe(6.5)
  })

  it('ne confond pas deux mêmes jours du mois dans des mois différents', () => {
    expect(readPlanningTiming('2026-01-01T07:00:00.000Z', '2026-02-01T07:00:00.000Z', 0)).toMatchObject({ endHour: 752, durationMinutes: 44_640 })
  })

  it('affiche un service nocturne sur ses deux jours sans déborder sous le calendrier', () => {
    const timing = readPlanningTiming('2026-10-15T20:15:00.000Z', '2026-10-16T04:45:00.000Z', 45)
    expect(planningCalendarSegment(timing, new Date(2026, 9, 15))).toEqual({ startHour: 22, startMin: 15, endHour: 24, endMin: 0 })
    expect(planningCalendarSegment(timing, new Date(2026, 9, 16))).toEqual({ startHour: 0, startMin: 0, endHour: 6, endMin: 45 })
    expect(planningCalendarSegment(timing, new Date(2026, 9, 14))).toBeNull()
    expect(planningCalendarSegment(timing, new Date(2026, 9, 17))).toBeNull()
  })

  it('ne crée pas de bloc fantôme le lendemain quand le service finit à minuit', () => {
    const timing = readPlanningTiming('2026-10-15T18:00:00.000Z', '2026-10-15T22:00:00.000Z', 0)
    expect(planningCalendarSegment(timing, new Date(2026, 9, 16))).toBeNull()
  })
})

describe('identité des collaborateurs du planning', () => {
  const rows = [{ userId: 'employe-a', employeeName: 'Alex Test' }, { userId: 'employe-b', employeeName: 'Alex Test' }]

  it('filtre les homonymes sur leur identifiant et non sur leur nom', () => {
    expect(planningEmployeeRows(rows, 'employee', 'employe-b')).toEqual([{ userId: 'employe-b', employeeName: 'Alex Test' }])
    expect(planningEmployeeRows(rows, 'employee', null)).toEqual([])
    expect(planningEmployeeRows(rows, 'owner', null)).toEqual(rows)
  })

  it('utilise userId et le nom imbriqué des adhésions RH pour le sélecteur', () => {
    expect(planningTeamOptions([
      { id: 'adhesion-a', userId: 'employe-a', user: { id: 'employe-a', firstName: 'Alex', lastName: 'Test' } },
      { id: 'adhesion-b', userId: 'employe-b', user: { id: 'employe-b', firstName: 'Alex', lastName: 'Test' } },
      { id: 'adhesion-incomplete', user: { firstName: 'Sans identifiant' } },
    ])).toEqual([{ id: 'employe-a', name: 'Alex Test' }, { id: 'employe-b', name: 'Alex Test' }])
  })
})
