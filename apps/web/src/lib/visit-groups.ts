export function visitForGroup<T extends { id: string; tableId: string; expiresAt: string }>(visits: T[], tableId: string, groupId: string): T | undefined {
  const current = visits.filter(v => v.tableId === tableId && new Date(v.expiresAt).getTime() > Date.now())
  return groupId ? current.find(v => v.id === groupId) : current.length === 1 ? current[0] : undefined
}
