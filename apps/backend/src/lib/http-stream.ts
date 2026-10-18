import type { ServerResponse } from 'node:http'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

/** Flux de lecture appartenant à cette réponse, fermeture de la source incluse. */
export async function sendHttpStream(source: Readable, response: ServerResponse): Promise<void> {
  try { await pipeline(source, response) }
  catch (error: any) {
    // pipeline a déjà attendu la destruction/fermeture de SES flux. L'abandon
    // d'un téléchargement ne laisse aucun callback métier ni transaction.
    if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE' && response.destroyed) return
    throw error
  }
}
