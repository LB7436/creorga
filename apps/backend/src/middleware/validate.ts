import { type Request, type Response, type NextFunction } from 'express'
import { type ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message)
        res.status(400).json({ message: 'Données invalides', errors: messages })
        return
      }
      next(error)
    }
  }
}
