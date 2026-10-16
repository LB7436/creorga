import prisma from './prisma'
import { getFloorState } from '../routes/floorState'

export async function guestTables(companyId: string) {
  const db = await prisma.table.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true } })
  return [...new Map([...db, ...getFloorState(companyId).tables.map(({ id, name }) => ({ id, name }))].map(t => [t.id, t])).values()]
}
export async function resolveGuestTable(companyId: string, value: string) {
  const tables = await guestTables(companyId)
  const exact = tables.find(t => t.id === value)
  if (exact) return exact.id
  const normal = (s: string) => s.toLowerCase().trim().replace(/^table\s*/i, '')
  const matches = tables.filter(t => normal(t.name) === normal(value))
  return matches.length === 1 ? matches[0].id : null
}
