/** Tickets cuisine issus des commandes de la caisse, conservés après règlement. */
export function syncKitchenTickets(floor: any, tables: any[], actorId: string, now = Date.now()) {
  floor.kitchenTickets ||= {}
  const active = new Set<string>()
  for (const table of tables) for (const cover of table.covers) {
    if (cover.id.startsWith('guest:') || !cover.items.length) continue
    active.add(cover.id)
    const previous = floor.kitchenTickets[cover.id]
    const items = cover.items.map((i: any) => ({ id: i.id, name: i.name, qty: i.qty, note: [i.note, table.kitchenNote].filter(Boolean).join(' · ') }))
    const changed = JSON.stringify(items) !== JSON.stringify(previous?.items)
    floor.kitchenTickets[cover.id] = { ...previous, id: cover.id, tableName: table.name, coverLabel: cover.label, items,
      status: changed ? 'waiting' : previous.status, createdAt: previous?.createdAt || now, updatedAt: changed ? now : previous.updatedAt, actorId }
  }
  return active
}
