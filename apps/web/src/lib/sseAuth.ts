import { fetchAuth } from '@/lib/fetchAuth'

/**
 * Flux SSE authentifié.
 *
 * `EventSource` ne sait pas porter d'en-tête : le flux opérateur de Robi
 * (`GET /api/agent/operator/stream`, monté derrière `authenticate`) partait
 * donc sans jeton et se faisait refouler en 401 — la fonctionnalité ne
 * fonctionnait pas du tout.
 *
 * Des deux options envisagées, le jeton en paramètre d'URL est écarté : il se
 * retrouverait dans les journaux d'accès, l'historique du navigateur et le
 * `Referer`. On lit donc le flux par `fetch`, qui accepte les en-têtes.
 *
 * Contrepartie assumée : `EventSource` reconnecte tout seul, pas `fetch`. La
 * reconnexion est donc explicite ci-dessous, avec un délai croissant plafonné.
 */

type Options = {
  onMessage: (donnees: string) => void
  onOuvert?: () => void
  onFerme?: () => void
  /** Plafond du délai de reconnexion, en ms. */
  delaiMax?: number
}

export function ouvrirFluxAuthentifie(url: string, options: Options) {
  const { onMessage, onOuvert, onFerme, delaiMax = 30_000 } = options
  const controleur = new AbortController()
  let arrete = false
  let echecs = 0

  const lireFlux = async () => {
    const reponse = await fetchAuth(url, {
      headers: { Accept: 'text/event-stream' },
      signal: controleur.signal,
    })
    if (!reponse.ok || !reponse.body) {
      throw new Error(`flux refusé : ${reponse.status}`)
    }

    echecs = 0
    onOuvert?.()

    const lecteur = reponse.body.getReader()
    const decodeur = new TextDecoder()
    let tampon = ''

    while (!arrete) {
      const { done, value } = await lecteur.read()
      if (done) break
      tampon += decodeur.decode(value, { stream: true })

      // Un évènement SSE se termine par une ligne vide.
      let coupure: number
      while ((coupure = tampon.indexOf('\n\n')) !== -1) {
        const evenement = tampon.slice(0, coupure)
        tampon = tampon.slice(coupure + 2)
        const donnees = evenement
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n')
        if (donnees) onMessage(donnees)
      }
    }
  }

  const boucler = async () => {
    while (!arrete) {
      try {
        await lireFlux()
      } catch (erreur) {
        if (arrete) return
        // Ne jamais avaler : un flux qui ne se rétablit pas doit se voir.
        console.error('[sseAuth] flux interrompu', erreur)
      }
      onFerme?.()
      if (arrete) return
      const delai = Math.min(1000 * 2 ** echecs++, delaiMax)
      await new Promise((r) => setTimeout(r, delai))
    }
  }

  void boucler()

  return () => {
    arrete = true
    controleur.abort()
  }
}
