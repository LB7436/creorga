import type { RequestHandler } from 'express'
/** Bound large in-memory document operations; no unbounded waiting queue in the cash process. */
export function concurrentOperationGate(limit: number): RequestHandler {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid concurrent-operation limit')
  let active = 0
  return (_req, res, next) => {
    if (active >= limit) { res.status(429).json({ message: 'Traitement de documents occupé. Patientez puis réessayez.' }); return }
    active++
    let released = false
    const release = () => { if (!released) { released = true; active-- } }
    res.once('finish', release); res.once('close', release)
    next()
  }
}
