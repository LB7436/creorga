/** Tickets cuisine issus des commandes de la caisse, conservés après règlement. */
export function syncKitchenTickets(floor: any, tables: any[], actorId: string, now = Date.now()) {
  floor.kitchenTickets ||= {}
  const active = new Set<string>()
  for (const table of tables) for (const cover of table.covers) {
    if (cover.id.startsWith('guest:') || !cover.items.length) continue
    const previous = floor.kitchenTickets[cover.id]
    const items: any[] = cover.items.map((i: any) => ({ id: i.id, name: i.name, qty: i.qty, note: [i.note, table.kitchenNote].filter(Boolean).join(' · ') }))
    const prior = previous?.lastRequested || previous?.items || []
    if (!previous) floor.kitchenTickets[cover.id] = { id: cover.id, coverId: cover.id, tableName: table.name, coverLabel: cover.label, items, lastRequested: items,
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
      previous.lastRequested = items
    }
    for (const ticket of Object.values(floor.kitchenTickets) as any[]) if ((ticket.coverId || ticket.id) === cover.id) {
      active.add(ticket.id); ticket.tableName = table.name
    }
  }
  return active
}
