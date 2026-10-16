/** Ne fusionne que les valeurs monétaires confirmées, jamais une ancienne quantité. */
export function reconcileDraftPricing(draft: any, floor: any) {
  const item = (line: any) => {
    const quote = Object.prototype.hasOwnProperty.call(floor.posPricing || {}, line.id) ? floor.posPricing[line.id] : undefined
    return quote ? { ...line, name: quote.name, price: quote.priceCents / 100, taxRate: quote.taxRate,
      menuItemId: quote.productId || line.menuItemId, pricingStatus: quote.status, pricingSource: quote.source } : line
  }
  return { ...draft, tables: draft.tables.map((t: any) => ({ ...t, covers: t.covers.map((c: any) => ({ ...c, items: c.items.map(item) })) })),
    seats: draft.seats.map((s: any) => ({ ...s, items: s.items.map(item) })) }
}
