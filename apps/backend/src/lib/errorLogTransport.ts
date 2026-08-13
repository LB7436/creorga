import Transport from 'winston-transport'
import { push } from './eventSink'

/**
 * Transport Winston → table ErrorLog.
 *
 * C'est le seul moyen non invasif d'attraper les ~40 routes qui font un
 * try/catch local avec logger.error(...) sans jamais passer par next(err) :
 * zéro modification des routes métier, la console créateur voit quand même
 * l'erreur.
 *
 * Branché dans index.ts (logger.add) et non dans logger.ts : logger →
 * transport → eventSink → logger formerait un cycle d'import.
 */
export class ErrorLogTransport extends Transport {
  constructor(opts: Transport.TransportStreamOptions = {}) {
    super({ ...opts, level: 'error' })
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info))
    try {
      const message = String(info?.message ?? '')
      // Garde anti-boucle : un échec d'écriture du puits ne doit pas se
      // journaliser… dans le puits.
      if (!message.startsWith('[eventSink]')) {
        push('errorLog', {
          message: message.slice(0, 2000),
          stack: info?.stack ? String(info.stack).slice(0, 4000) : null,
        })
      }
    } catch {
      // La journalisation ne doit jamais casser le service.
    }
    callback()
  }
}
