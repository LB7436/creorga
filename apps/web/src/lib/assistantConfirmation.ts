export class AssistantConfirmationError extends Error {
  constructor(message: string, readonly uncertain: boolean) { super(message) }
}

/** Un aperçu/retour HTTP n'est pas une confirmation de l'opération métier. */
export async function confirmAssistantPreview(
  backend: string,
  preview: { confirmEndpoint: string; confirmPayload: unknown },
  send: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<string> {
  if (preview.confirmEndpoint !== '/api/agent/intent/confirm') throw new AssistantConfirmationError('Point de validation non autorisé.', false)
  let response: Response
  try {
    response = await send(`${backend}/api/agent/intent/confirm`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preview.confirmPayload),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new AssistantConfirmationError('Connexion interrompue : vérifiez les données avant toute nouvelle tentative.', true)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success !== true) {
    const uncertain = response.ok ? data.success !== false : response.status >= 500 && data.code !== 'ASSISTANT_ACTION_MIGRATION_REQUIRED'
    throw new AssistantConfirmationError(data.message || data.error || `Validation non confirmée (HTTP ${response.status}).`, uncertain)
  }
  return typeof data.summary === 'string' && data.summary.trim() ? data.summary : '✅ Action validée.'
}
