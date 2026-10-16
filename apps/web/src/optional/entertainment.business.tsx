// Aucun import ludique, même dynamique : les réglages existants restent en base.
export const GAMES_ENABLED = false
export const gameEntries: Array<{ id: string; name: string; emoji: string; detail: string; beta: boolean; casino: boolean }> = []
export function GamesSection(_props: { companyId?: string | null }) { return null }
