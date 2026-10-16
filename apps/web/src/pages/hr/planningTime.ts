// Les heures saisies sont celles du site Luxembourg, et non celles du poste
// du navigateur. Les instants transmis à l’API restent en UTC.
const wallFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Luxembourg', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

function wallParts(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new Error('Date de planning invalide')
  const parts = Object.fromEntries(wallFormatter.formatToParts(date).map(part => [part.type, part.value]))
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) }
}

function wallStamp(parts: ReturnType<typeof wallParts>) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

function wallInstant(stamp: number): Date {
  // Échantillonner les décalages autour de la date permet de distinguer les
  // deux occurrences d’une heure en automne et les heures absentes au printemps.
  const offsets = new Set<number>()
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = stamp + hours * 3_600_000
    offsets.add(wallStamp(wallParts(new Date(sample))) - sample)
  }
  const candidates = [...offsets].map(offset => new Date(stamp - offset))
    .filter(candidate => wallStamp(wallParts(candidate)) === stamp)
  if (!candidates.length) throw new Error('Heure locale inexistante au changement d’heure : choisissez un autre horaire.')
  if (candidates.length !== 1) throw new Error('Heure locale ambiguë au changement d’heure : choisissez un horaire non ambigu.')
  return candidates[0]
}

export function createPlanningRange(date: Date, startHour: number, endHour: number, startMin = 0, endMin = 0) {
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(startHour) || startHour < 0 || startHour > 23
    || !Number.isInteger(endHour) || endHour < 0
    || !Number.isInteger(startMin) || startMin < 0 || startMin > 59
    || !Number.isInteger(endMin) || endMin < 0 || endMin > 59) throw new Error('Horaire de planning invalide')
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const startWall = day + (startHour * 60 + startMin) * 60_000
  let endWall = day + (endHour * 60 + endMin) * 60_000
  if (endWall === startWall) throw new Error('La fin doit être différente du début')
  // 24 h est déjà le lendemain : ne pas ajouter une seconde journée.
  if (endHour < 24 && endWall < startWall) endWall += 86_400_000
  const start = wallInstant(startWall)
  const end = wallInstant(endWall)
  if (end <= start) throw new Error('La fin doit être postérieure au début')
  return { startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: (end.getTime() - start.getTime()) / 60_000 }
}

export function readPlanningTiming(startTime: string, endTime: string, breakMinutes: number) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const from = wallParts(start)
  const to = wallParts(end)
  const days = (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000
  return {
    date: new Date(from.year, from.month - 1, from.day),
    startHour: from.hour, startMin: from.minute,
    endHour: to.hour + days * 24, endMin: to.minute,
    durationMinutes: (end.getTime() - start.getTime()) / 60_000,
    breakMinutes,
  }
}

export function planningNetHours(timing: { durationMinutes: number; breakMinutes: number }) {
  return (timing.durationMinutes - timing.breakMinutes) / 60
}

export function planningCalendarSegment(timing: { date: Date; startHour: number; startMin: number; endHour: number; endMin: number }, day: Date) {
  const calendarDay = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  const dayOffset = (calendarDay(day) - calendarDay(timing.date)) / 86_400_000
  const start = Math.max(0, timing.startHour * 60 + timing.startMin - dayOffset * 1440)
  const end = Math.min(1440, timing.endHour * 60 + timing.endMin - dayOffset * 1440)
  if (end <= start) return null
  return { startHour: Math.floor(start / 60), startMin: start % 60, endHour: Math.floor(end / 60), endMin: end % 60 }
}

export function planningEmployeeRows<T extends { userId: string }>(rows: T[], viewMode: 'owner' | 'employee', employeeId: string | null): T[] {
  return viewMode === 'owner' ? rows : rows.filter(row => Boolean(employeeId) && row.userId === employeeId)
}

export function planningTeamOptions(rows: Array<{ userId?: string; user?: { id?: string; firstName?: string; lastName?: string }; [key: string]: unknown }>): Array<{ id: string; name: string }> {
  return rows.map(row => ({
    id: row.userId || row.user?.id || '',
    name: `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim(),
  })).filter(row => Boolean(row.id && row.name))
}
