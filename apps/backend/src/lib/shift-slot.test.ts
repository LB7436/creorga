import { beforeEach, describe, expect, it, vi } from 'vitest'
const tx = vi.hoisted(() => ({ $executeRaw: vi.fn(), shift: { findFirst: vi.fn() } }))
vi.mock('./prisma', () => ({ default: { $transaction: (callback: any) => callback(tx) } }))
import { withShiftSlot, validateShiftTimes, ShiftConflict } from './shift-slot'
beforeEach(() => { vi.clearAllMocks(); tx.shift.findFirst.mockResolvedValue(null) })
describe('Créneaux de planning', () => {
  it('refuse les dates et pauses incohérentes', () => {
    expect(validateShiftTimes(new Date(1000), new Date(500), 0)).toBe(false)
    expect(validateShiftTimes(new Date(0), new Date(3600000), 60)).toBe(false)
    expect(validateShiftTimes(new Date(0), new Date(3600000), 15)).toBe(true)
  })
  it('bloque le chevauchement avant écriture', async () => {
    tx.shift.findFirst.mockResolvedValue({ id: 'autre' })
    const write = vi.fn()
    await expect(withShiftSlot('a', 'alice', new Date(0), new Date(3600000), undefined, write)).rejects.toBeInstanceOf(ShiftConflict)
    expect(tx.$executeRaw).toHaveBeenCalledOnce()
    expect(write).not.toHaveBeenCalled()
  })
  it('exclut le créneau modifié et accepte des créneaux contigus', async () => {
    const write = vi.fn().mockResolvedValue({ id: 'shift' })
    await withShiftSlot('a', 'alice', new Date(0), new Date(3600000), 'shift', write)
    expect(tx.shift.findFirst.mock.calls[0][0].where).toMatchObject({ id: { not: 'shift' }, startTime: { lt: new Date(3600000) }, endTime: { gt: new Date(0) } })
    expect(write).toHaveBeenCalledOnce()
  })
})
