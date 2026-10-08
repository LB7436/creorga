/** Après confirmation financière : débit atomique une fois, jamais un blocage de l'encaissement déjà capturé.
 * Un stock négatif expose un écart physique à traiter ; il n'annule pas un paiement réel.
 */
export async function debitOrderInventory(tx: any, companyId: string, orderId: string) {
  const order = await tx.order.findFirstOrThrow({ where: { id: orderId, companyId }, include: { items: true } })
  if (order.inventoryDebitedAt) return
  for (const item of order.items) await tx.product.updateMany({ where: { id: item.productId, companyId, stock: { not: null } }, data: { stock: { decrement: item.quantity } } })
  await tx.order.update({ where: { id: orderId }, data: { inventoryDebitedAt: new Date() } })
}
