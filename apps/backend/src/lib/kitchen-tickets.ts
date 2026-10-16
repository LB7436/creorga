/** Tickets cuisine issus des commandes de la caisse, conservés après règlement. */
export function syncKitchenTickets(floor: any, tables: any[], actorId: string, now = Date.now(), settledCovers = new Set<string>()) {
  floor.kitchenTickets ||= {}
  const active = new Set<string>()
  const present = new Set(tables.flatMap(t => t.covers.map((c: any) => c.id)))
  const removed = Object.entries(floor.kitchenBaselines || {}).filter(([id, items]) => !present.has(id) && !settledCovers.has(id) && (items as any[]).length).map(([id]) => {
    const ticket: any = Object.values(floor.kitchenTickets).find((t: any) => (t.coverId || t.id) === id || t.routing?.some((r: any) => r.coverId === id))
    return { name: ticket?.routing?.find((r: any) => r.coverId === id)?.tableName || ticket?.tableName || 'Groupe retiré', covers: [{ id, label: 'Groupe retiré', items: [] }] }
  })
  for (const table of [...tables, ...removed]) for (const cover of table.covers) {
    if (cover.id.startsWith('guest:') || !cover.items.length && !floor.kitchenBaselines?.[cover.id]) continue
    const previous = floor.kitchenTickets[cover.id]
    const items: any[] = cover.items.map((i: any) => ({ id: i.id, name: i.name, qty: i.qty, note: [i.note, table.kitchenNote].filter(Boolean).join(' · ') }))
    const baseline = floor.kitchenBaselines?.[cover.id]
    const prior = baseline || previous?.lastRequested || previous?.items || []
    if (!previous && !baseline) floor.kitchenTickets[cover.id] = { id: cover.id, coverId: cover.id, tableName: table.name, coverLabel: cover.label, items, lastRequested: items,
      status: 'waiting', createdAt: now, updatedAt: now, actorId }
    else if (JSON.stringify(items) !== JSON.stringify(prior)) {
      const corrections: any[] = []
      for (const id of new Set<string>([...items, ...prior].map(i => i.id))) {
        const next = items.find(i => i.id === id), old = prior.find((i: any) => i.id === id)
        if (next?.name !== old?.name || next?.note !== old?.note) {
          if (old) corrections.push({ ...old, qty: -old.qty, correction: true })
          if (next) corrections.push({ ...next, correction: true })
        } else if ((next?.qty || 0) !== (old?.qty || 0)) corrections.push({ ...(next || old), qty: (next?.qty || 0) - (old?.qty || 0), correction: true })
      }
      const key = `${cover.id}:lot:${now}:${Object.keys(floor.kitchenTickets).length}`
      floor.kitchenTickets[key] = { id: key, coverId: cover.id, tableName: table.name, coverLabel: `${cover.label} — correction`, items: corrections,
        status: 'waiting', createdAt: now, updatedAt: now, actorId }
      if (previous) previous.lastRequested = items
    }
    if (baseline) floor.kitchenBaselines[cover.id] = items
    for (const ticket of Object.values(floor.kitchenTickets) as any[]) if ((ticket.coverId || ticket.id) === cover.id) {
      active.add(ticket.id); ticket.tableName = table.name
    }
  }
  return active
}

/** Reprojection des demandes après séparation, pas de nouvelle préparation.
 * Le ticket original (quantité, état, horloge) reste inchangé. Son routage rend
 * visibles les destinations des portions, y compris lorsqu'une ligne est divisée.
 */
export function rebaseKitchenAfterSeparation(floor: any, before: any[], after: any[], affected: Set<string>) {
  floor.kitchenBaselines ||= {}
  for (const id of affected) {
    const table = after.find(t => t.covers.some((c: any) => c.id === id)), cover = table?.covers.find((c: any) => c.id === id)
    floor.kitchenBaselines[id] = (cover?.items || []).map((i: any) => ({ id: i.id, name: i.name, qty: i.qty, note: [i.note, table.kitchenNote].filter(Boolean).join(' · ') }))
  }
  const root = (id: string) => floor.lineOrigins?.[id] || id
  const roots = new Set(before.flatMap(t => t.covers.filter((c: any) => affected.has(c.id)).flatMap((c: any) => c.items.map((i: any) => root(i.id)))))
  for (const ticket of Object.values(floor.kitchenTickets || {}) as any[]) if (ticket.items.some((i: any) => roots.has(root(i.id)))) {
    ticket.preserveAfterMove = true
    const ticketRoots = new Set(ticket.items.map((i: any) => root(i.id)))
    ticket.routing = after.flatMap(t => t.covers.filter((c: any) => !c.id.startsWith('guest:')).flatMap((c: any) => c.items.filter((i: any) => ticketRoots.has(root(i.id))).map((i: any) => ({ tableId: t.id, tableName: t.name, coverId: c.id, coverLabel: c.label, lineId: i.id, name: i.name, qty: i.qty }))))
  }
}

/** Localisation native courante, sans recréer les commandes financières QR. */
export function nativeKitchenTables(floor: any): any[] {
  return floor.tables.map((t: any) => ({ ...t, covers: [
    ...(t.posCovers || (t.items?.length ? [{ id: `table-${t.id}-${t.openedAt || 0}`, label: 'Table', items: t.items }] : [])),
    ...floor.chairs.filter((c: any) => c.tableId === t.id && c.items.length).map((c: any) => ({ id: `seat:${c.id}:${c.createdAt || c.openedAt || 0}`, label: c.customerName || c.label, items: c.items })),
  ] }))
}
