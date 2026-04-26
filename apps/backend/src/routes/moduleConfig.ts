import { Router } from 'express'

/**
 * Shared module config — used by web (5174) and super-admin (5177).
 * Both apps PATCH and GET the same state so toggles propagate.
 */

export type ModuleDisplayMode = 'visible' | 'hidden' | 'coming_soon'

export interface ModuleConfig {
  displayMode: ModuleDisplayMode
  customLabel?: string
  pinnedToDashboard?: boolean
  enabled?: boolean
}

export interface ModuleConfigState {
  config: Record<string, ModuleConfig>
  updatedAt: number
}

let state: ModuleConfigState = { config: {}, updatedAt: Date.now() }

const router = Router()

router.get('/', (_req, res) => res.json(state))

router.put('/', (req, res) => {
  const body = req.body as Partial<ModuleConfigState>
  if (body.config) state.config = body.config
  state.updatedAt = Date.now()
  res.json(state)
})

// Patch a single module
router.patch('/:moduleId', (req, res) => {
  const { moduleId } = req.params
  const patch = req.body as Partial<ModuleConfig>
  state.config[moduleId] = { ...(state.config[moduleId] || { displayMode: 'visible' }), ...patch }
  state.updatedAt = Date.now()
  res.json(state)
})

router.delete('/:moduleId', (req, res) => {
  delete state.config[req.params.moduleId]
  state.updatedAt = Date.now()
  res.json(state)
})

router.post('/reset', (_req, res) => {
  state = { config: {}, updatedAt: Date.now() }
  res.json(state)
})

export default router
