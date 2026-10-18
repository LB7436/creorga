import type { Request, Response, NextFunction } from 'express'
import { hasCapability, type Capability } from '../lib/business-permissions'
export function requireCapability(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!capabilities.every(capability => hasCapability(req as any, capability))) {
      res.status(403).json({ code: 'CAPABILITY_REQUIRED', message: 'Votre accès ne permet pas cette action.', required: capabilities })
      return
    }
    next()
  }
}
