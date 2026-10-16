// Ordre commun : société financière, table éventuelle, commandes triées.
export const lockFinancialCompany = (tx: any, companyId: string) => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('pos-ledger'))::text`
