import { Router } from 'express'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import { dataPath } from '../middleware/audit-log'
import logger from '../lib/logger'

/**
 * Shared module config — used by web (5174) and super-admin (5177).
 * Both apps PATCH and GET the same state so toggles propagate.
 *
 * Persisté sur disque : sans cela, les modules masqués ou renommés
 * redevenaient tous visibles au premier redémarrage du service.
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

const FICHIER = 'module-config.json'

let state: ModuleConfigState = safeReadJson<ModuleConfigState>(
  dataPath(FICHIER),
  { config: {}, updatedAt: Date.now() },
)

/** Écriture atomique. Un échec est journalisé, jamais avalé. */
function sauvegarder(): void {
  try {
    safeWriteJson(dataPath(FICHIER), state)
  } catch (err) {
    logger.error(`[module-config] échec de la sauvegarde de ${FICHIER}`, err)
  }
}

const router = Router()

// Toute mutation est écrite sur disque une fois la réponse partie.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
router.use((req, res, next) => {
  if (MUTATING.has(req.method)) res.on('finish', sauvegarder)
  next()
})

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
