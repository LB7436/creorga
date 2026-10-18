import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'

/** À installer après les handlers Socket.IO/HTTP, avant listen(). */
export function createHttpDrain(server: Server, isTransportRequest: (req: IncomingMessage) => boolean) {
  const connections = new Map<Duplex, {
    inFlight: number, business: number, transport: number, used: boolean,
    upgraded: boolean, rejected: boolean, rejectUpgrade?: () => void,
  }>()
  const requestListeners = server.listeners('request')
  const upgradeListeners = server.listeners('upgrade')
  let draining = false
  let closing: Promise<void> | undefined
  let pendingResponses = 0
  let responsesDrained: (() => void) | undefined
  let responseInterrupted: ((error: Error) => void) | undefined
  let interruptedBusiness: Error | undefined

  server.on('connection', socket => {
    connections.set(socket, { inFlight: 0, business: 0, transport: 0, used: false, upgraded: false, rejected: false })
    socket.once('close', () => connections.delete(socket))
    // Une acceptation TCP en file n'est pas une requête métier admise.
    if (draining) socket.destroy()
  })
  // Comme l'attachement Engine.IO, envelopper les handlers existants pour que
  // le refus précède leur exécution, pas un listener qui les laisserait courir.
  server.removeAllListeners('request')
  server.on('request', (req: IncomingMessage, res: ServerResponse) => {
    const connection = connections.get(req.socket)
    if (!connection) return
    const transport = isTransportRequest(req)
    const refused = draining || connection.rejected || (transport ? connection.business > 0 : connection.transport > 0)
    connection.used = true
    connection.inFlight++
    pendingResponses++
    if (!refused) { if (transport) connection.transport++; else connection.business++ }
    let released = false
    const release = () => {
      if (released) return
      released = true
      connection.inFlight--
      pendingResponses--
      // Un close prématuré ne prouve pas que le callback/commit métier a fini.
      // Ne jamais passer à l'audit puis déconnecter sa base dans ce cas.
      if (!refused && !transport && !res.writableFinished) {
        // Conserver aussi l'incertitude d'un abandon antérieur au drainage.
        // Le simple close/end HTTP ne prouve pas la fin du callback métier.
        interruptedBusiness ||= new Error('Arrêt non confirmé : réponse métier interrompue ; fin du callback non prouvée, travaux et base conservés.')
        responseInterrupted?.(interruptedBusiness)
      }
      if (pendingResponses === 0) responsesDrained?.()
      if (!refused) { if (transport) connection.transport--; else connection.business-- }
      if (connection.inFlight === 0 && connection.rejectUpgrade) {
        connection.rejectUpgrade()
        return
      }
      // FIN gracieux : conserver tous les octets et les réponses pipelinées,
      // y compris le refus503 d'une nouvelle requête pendant l'arrêt.
      if (draining && connection.inFlight === 0 && !connection.upgraded) req.socket.end()
    }
    res.once('finish', release)
    res.once('close', release)
    if (refused) {
      connection.rejected = true
      res.writeHead(503, { Connection: 'close', 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ code: draining ? 'BACKEND_STOPPING' : 'HTTP_TRANSPORT_CONFLICT',
        message: 'Connexion indisponible. Reprenez sur une nouvelle connexion avec la même référence.' }))
      req.resume()
      return
    }
    // Polling.doClose() détruit parfois tout le TCP du POST polling. Ne jamais
    // lui confier une connexion portant une réponse métier simultanée, ni
    // admettre du métier derrière un longpoll qui retiendrait sa réponse.
    for (const listener of requestListeners) listener.call(server, req, res)
  })
  // Les transports déjà passés en WebSocket appartiennent à Socket.IO : son
  // close() fait leur fermeture protocolaire, pas une destruction TCP ici.
  server.removeAllListeners('upgrade')
  server.on('upgrade', (req, socket, head) => {
    const connection = connections.get(socket)
    if (!connection) return
    if (draining || connection.rejected || connection.inFlight > 0) {
      connection.rejected = true
      // Un 503 d'upgrade écrit immédiatement dépasserait la réponse HTTP en
      // cours. Attendre ses octets avant le refus, sans créer de WebSocket.
      connection.rejectUpgrade = () => socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      if (connection.inFlight === 0) connection.rejectUpgrade()
      return
    }
    connection.upgraded = true
    for (const listener of upgradeListeners) listener.call(server, req, socket, head)
  })

  return {
    close(closeServer: () => Promise<void>, closeTransports: () => void): Promise<void> {
      if (closing) return closing
      draining = true
      closing = (async () => {
        if (interruptedBusiness) throw interruptedBusiness
        const finished = new Promise<void>((resolve, reject) => { responsesDrained = resolve; responseInterrupted = reject })
        // Les transports ne partagent aucun TCP avec du métier actif. Les
        // fermer d'abord libère les longpolls, sans attendre leur timeout.
        closeTransports()
        for (const [socket, connection] of connections) {
          if (connection.upgraded || connection.inFlight !== 0) continue
          // Sans événement request, même des en-têtes partiels peuvent retenir
          // server.close(). Aucune requête ni réponse admise n'est interrompue.
          if (!connection.used) socket.destroy()
          else socket.end()
        }
        if (pendingResponses === 0) responsesDrained!()
        await finished
        // Node peut sinon fermer un TCP devenu inactif entre le finish du poll
        // et l'émission de la réponse503 déjà en file après celui-ci.
        await closeServer()
      })()
      return closing
    },
  }
}
