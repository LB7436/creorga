import { Prisma } from '@prisma/client'
import prisma from '../prisma'

/**
 * Volumétrie par société : « vous avez 1 240 commandes et 850 Mo de données ».
 *
 * Les noms de tables viennent d'une liste blanche codée en dur — jamais d'une
 * entrée utilisateur — car un nom de table ne peut pas être paramétré en SQL.
 * Seules les tables MÉTIER comptent : les tables de la console elle-même
 * (ActivityEvent, LoginEvent, …) ne sont pas des données du client.
 */

// modele = propriété du client Prisma (camelCase), table = nom SQL.
export const TABLES_DIRECTES: ReadonlyArray<{ modele: string; table: string }> = [
  { modele: 'userCompany', table: 'UserCompany' },
  { modele: 'companySettings', table: 'CompanySettings' },
  { modele: 'companyModule', table: 'CompanyModule' },
  { modele: 'table', table: 'Table' },
  { modele: 'category', table: 'Category' },
  { modele: 'product', table: 'Product' },
  { modele: 'order', table: 'Order' },
  { modele: 'customer', table: 'Customer' },
  { modele: 'giftCard', table: 'GiftCard' },
  { modele: 'invoice', table: 'Invoice' },
  { modele: 'quote', table: 'Quote' },
  { modele: 'reservation', table: 'Reservation' },
  { modele: 'ingredient', table: 'Ingredient' },
  { modele: 'supplier', table: 'Supplier' },
  { modele: 'purchaseOrder', table: 'PurchaseOrder' },
  { modele: 'shift', table: 'Shift' },
  { modele: 'timePunch', table: 'TimePunch' },
  { modele: 'leaveRequest', table: 'LeaveRequest' },
  { modele: 'haccpLog', table: 'HaccpLog' },
  { modele: 'haccpTask', table: 'HaccpTask' },
  { modele: 'campaign', table: 'Campaign' },
  { modele: 'discountCode', table: 'DiscountCode' },
  { modele: 'cashDrawer', table: 'CashDrawer' },
  { modele: 'expense', table: 'Expense' },
  { modele: 'review', table: 'Review' },
  { modele: 'eventQuote', table: 'EventQuote' },
  { modele: 'eventQuoteItem', table: 'EventQuoteItem' },
]

// Tables de lignes rattachées par jointure : (table SQL, table parente, clé).
const TABLES_JOINTES: ReadonlyArray<{ table: string; parent: string; cle: string }> = [
  { table: 'OrderItem', parent: 'Order', cle: 'orderId' },
  { table: 'InvoiceItem', parent: 'Invoice', cle: 'invoiceId' },
  { table: 'QuoteItem', parent: 'Quote', cle: 'quoteId' },
  { table: 'PurchaseOrderItem', parent: 'PurchaseOrder', cle: 'purchaseOrderId' },
]

export async function compterLignes(companyId: string): Promise<Record<string, number>> {
  const resultats: Record<string, number> = {}
  for (const { modele, table } of TABLES_DIRECTES) {
    resultats[table] = await (prisma as any)[modele].count({ where: { companyId } })
  }
  resultats.OrderItem = await prisma.orderItem.count({ where: { order: { companyId } } })
  resultats.InvoiceItem = await prisma.invoiceItem.count({ where: { invoice: { companyId } } })
  resultats.QuoteItem = await prisma.quoteItem.count({ where: { quote: { companyId } } })
  resultats.PurchaseOrderItem = await prisma.purchaseOrderItem.count({
    where: { purchaseOrder: { companyId } },
  })
  return resultats
}

/** Poids estimé en octets des données de la société (lignes + documents RH). */
export async function poidsDonnees(companyId: string): Promise<bigint> {
  let total = 0n

  for (const { table } of TABLES_DIRECTES) {
    const lignes = await prisma.$queryRaw<Array<{ octets: bigint }>>(
      Prisma.sql`SELECT COALESCE(SUM(pg_column_size(t.*)), 0)::bigint AS octets
                 FROM ${Prisma.raw(`"${table}"`)} t
                 WHERE t."companyId" = ${companyId}`,
    )
    total += BigInt(lignes[0]?.octets ?? 0)
  }

  for (const { table, parent, cle } of TABLES_JOINTES) {
    const lignes = await prisma.$queryRaw<Array<{ octets: bigint }>>(
      Prisma.sql`SELECT COALESCE(SUM(pg_column_size(i.*)), 0)::bigint AS octets
                 FROM ${Prisma.raw(`"${table}"`)} i
                 JOIN ${Prisma.raw(`"${parent}"`)} p ON p."id" = i.${Prisma.raw(`"${cle}"`)}
                 WHERE p."companyId" = ${companyId}`,
    )
    total += BigInt(lignes[0]?.octets ?? 0)
  }

  // Documents RH stockés sur disque : leur taille est en base, pas leur contenu.
  const documents = await prisma.$queryRaw<Array<{ octets: bigint }>>(
    Prisma.sql`SELECT COALESCE(SUM(d."taille"), 0)::bigint AS octets
               FROM "EmployeeDocument" d
               JOIN "EmployeeProfile" p ON p."id" = d."profileId"
               JOIN "UserCompany" uc ON uc."id" = p."userCompanyId"
               WHERE uc."companyId" = ${companyId}`,
  )
  total += BigInt(documents[0]?.octets ?? 0)

  return total
}
