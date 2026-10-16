import { createHash, randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import prisma from './prisma'

export class GuestAccessError extends Error {
  constructor(public status: number, message = 'Lien de visite absent, expiré ou révoqué. Demandez un nouveau QR au personnel.') { super(message) }
}
export const GUEST_VISIT_HOURS = 8
export const guestTokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export const lockGuestTable = (tx: Prisma.TransactionClient, companyId: string, tableId: string) =>
  tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${`table-payment:${tableId}`}))::text`

export async function requireGuestAccess(companyId: string, token: unknown, tableId?: string, db: Prisma.TransactionClient = prisma) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new GuestAccessError(401)
  const access = await db.guestVisitAccess.findUnique({ where: { tokenHash: guestTokenHash(token) }, include: { visit: true } })
  const now = Date.now()
  if (!access || access.companyId !== companyId || access.visit.companyId !== companyId
    || access.revokedAt || (tableId !== undefined && access.visit.tableId !== tableId) || access.visit.closedAt
    || access.expiresAt.getTime() <= now || access.visit.expiresAt.getTime() <= now) throw new GuestAccessError(403)
  return access.visit
}

export async function issueGuestAccess(tx: Prisma.TransactionClient, visit: { id: string; companyId: string; expiresAt: Date }) {
  const token = randomBytes(32).toString('hex')
  await tx.guestVisitAccess.create({ data: { companyId: visit.companyId, visitId: visit.id, expiresAt: visit.expiresAt, tokenHash: guestTokenHash(token) } })
  return token
}
