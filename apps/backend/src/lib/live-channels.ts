/** Public signals never include order IDs or a table's financial activity. */
export function isPublicLiveChannel(value: unknown): value is string {
  return typeof value === 'string' && /^(?:games-[a-zA-Z0-9_-]{1,100}|floor-[a-zA-Z0-9_-]{1,100})$/.test(value)
}
