import type { Prisma } from '@prisma/client'

/** Même autorité pour l'éditeur, la remise à zéro et l'onboarding société. */
export const lockPortalConfiguration = (tx: Prisma.TransactionClient, companyId: string) =>
  tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('portal-config'))::text`

export const nextPortalRevision = (existing: { updatedAt: Date } | null) =>
  new Date(Math.max(Date.now(), (existing?.updatedAt.getTime() || 0) + 1))
