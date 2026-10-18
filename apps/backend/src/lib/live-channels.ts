/** Public signals never include order IDs or a table's financial activity. */
export function isPublicLiveChannel(value: unknown, options = { gamesEnabled: true }): value is string {
  return typeof value === 'string'
    && (options.gamesEnabled || !value.startsWith('games-'))
    && /^(?:games-[a-zA-Z0-9_-]{1,100}|floor-[a-zA-Z0-9_-]{1,100})$/.test(value)
}

/** Le navigateur devra relire l'API authentifiée : aucun contenu métier public. */
export function publicFloorInvalidation() {
  return { invalidated: true } as const
}
