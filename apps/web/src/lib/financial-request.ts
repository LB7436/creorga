/** Ces références ne remplacent jamais le journal serveur. Une copie illisible
 * doit être rapprochée, pas écrasée par une nouvelle tentative. */
export function readFinancialRequest(key: string): any | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  try {
    const body = JSON.parse(raw)
    if (!body || Array.isArray(body) || typeof body !== 'object' || typeof body.requestId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) throw new Error()
    return body
  } catch { throw new Error('Référence locale illisible. Rapprochement du journal nécessaire ; aucune nouvelle demande envoyée.') }
}
export function preserveFinancialRequest(key: string, body: any) {
  const previous = readFinancialRequest(key)
  if (previous && JSON.stringify(previous) !== JSON.stringify(body)) throw new Error('Une autre demande attend une vérification. Ne pas remplacer sa référence.')
  localStorage.setItem(key, JSON.stringify(body))
}
export function forgetFinancialRequest(key: string, requestId: string) {
  const previous = readFinancialRequest(key)
  if (previous && previous.requestId !== requestId) throw new Error('Référence locale différente : elle doit être préservée.')
  localStorage.removeItem(key)
}
