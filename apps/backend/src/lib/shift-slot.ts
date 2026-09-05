import prisma from './prisma'
import type { Prisma } from '@prisma/client'
export class ShiftConflict extends Error {}
export function validateShiftTimes(start: Date, end: Date, breakMinutes: unknown): boolean {
  const pause = Number(breakMinutes)
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start
    && Number.isInteger(pause) && pause >= 0 && pause * 60000 < end.getTime() - start.getTime()
}
/** Verrou par salarié : deux créations concurrentes ne contournent pas le contrôle. */
export function withShiftSlot<T>(companyId: string, userId: string, start: Date, end: Date, excludeId: string | undefined, write: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${userId}))`
    const overlap = await tx.shift.findFirst({ where: {
      companyId, userId, startTime: { lt: end }, endTime: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    }, select: { id: true } })
    if (overlap) throw new ShiftConflict('Ce salarié a déjà un créneau qui chevauche ces horaires.')
    return write(tx)
  })
}
