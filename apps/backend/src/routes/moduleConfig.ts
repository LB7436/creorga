import { createHash } from 'node:crypto'
import { Router, type Request } from 'express'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import { dataPath } from '../middleware/audit-log'

/**
 * Préférences de modules du back-office.
 *
 * L'ancien `module-config.json` était partagé par toute l'installation : masquer
 * un module chez un client le masquait aussi chez tous les autres. Le routeur est
 * maintenant monté derrière requireCompany et chaque société possède son fichier
 * atomique propre. L'ancien fichier n'est repris que pour la société explicitement
 * désignée par LEGACY_MODULE_CONFIG_COMPANY_ID lors du déploiement.
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

const FICHIER_HISTORIQUE = 'module-config.json'
const MODES = new Set<ModuleDisplayMode>(['visible', 'hidden', 'coming_soon'])
const MODULE_ID = /^[a-zA-Z0-9_-]{1,100}$/

function emptyState(): ModuleConfigState {
  return { config: {}, updatedAt: Date.now() }
}

/** Nom stable, lisible et impossible à utiliser pour sortir de data/. */
export function companyModuleConfigFilename(companyId: string): string {
  const readable = companyId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'company'
  const digest = createHash('sha256').update(companyId).digest('hex').slice(0, 12)
  return `module-config.${readable}.${digest}.json`
}

function companyIdFrom(req: Request): string {
  const companyId = (req as any).companyId
  if (typeof companyId !== 'string' || !companyId) {
    throw new Error('Contexte société absent pour la configuration des modules')
  }
  return companyId
}

function loadState(companyId: string): ModuleConfigState {
  const own = safeReadJson<ModuleConfigState | null>(dataPath(companyModuleConfigFilename(companyId)), null)
  if (own) return own
  if (process.env.LEGACY_MODULE_CONFIG_COMPANY_ID?.trim() === companyId) {
    return safeReadJson<ModuleConfigState>(dataPath(FICHIER_HISTORIQUE), emptyState())
  }
  return emptyState()
}

function saveState(companyId: string, state: ModuleConfigState): void {
  safeWriteJson(dataPath(companyModuleConfigFilename(companyId)), state)
}

function validPatch(value: unknown, partial = false): Partial<ModuleConfig> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const output: Partial<ModuleConfig> = {}

  if (input.displayMode !== undefined) {
    if (typeof input.displayMode !== 'string' || !MODES.has(input.displayMode as ModuleDisplayMode)) return null
    output.displayMode = input.displayMode as ModuleDisplayMode
  } else if (!partial) {
    output.displayMode = 'visible'
  }

  if (input.customLabel !== undefined) {
    if (typeof input.customLabel !== 'string' || input.customLabel.trim().length > 80) return null
    const label = input.customLabel.trim()
    // Une chaîne vide signifie « revenir au libellé d'origine ».
    output.customLabel = label || undefined
  }
  for (const key of ['pinnedToDashboard', 'enabled'] as const) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') return null
      output[key] = input[key]
    }
  }
  return output
}

const router = Router()

function requireManager(req: Request, res: any): boolean {
  const role = (req as any).role
  if (role === 'OWNER' || role === 'MANAGER') return true
  res.status(403).json({ error: 'Accès réservé aux responsables' })
  return false
}

router.get('/', (req, res) => {
  res.json(loadState(companyIdFrom(req)))
})

router.put('/', (req, res) => {
  if (!requireManager(req, res)) return
  const raw = req.body?.config
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return res.status(400).json({ error: 'Configuration invalide' })
  }
  const entries = Object.entries(raw)
  if (entries.length > 250) return res.status(400).json({ error: '250 modules maximum' })

  const config: Record<string, ModuleConfig> = {}
  for (const [moduleId, value] of entries) {
    if (!MODULE_ID.test(moduleId)) return res.status(400).json({ error: `Identifiant de module invalide: ${moduleId}` })
    const parsed = validPatch(value)
    if (!parsed?.displayMode) return res.status(400).json({ error: `Configuration invalide pour ${moduleId}` })
    config[moduleId] = parsed as ModuleConfig
  }

  const state = { config, updatedAt: Date.now() }
  saveState(companyIdFrom(req), state)
  res.json(state)
})

router.patch('/:moduleId', (req, res) => {
  if (!requireManager(req, res)) return
  const { moduleId } = req.params
  if (!MODULE_ID.test(moduleId)) return res.status(400).json({ error: 'Identifiant de module invalide' })
  const patch = validPatch(req.body, true)
  if (!patch || Object.keys(patch).length === 0) return res.status(400).json({ error: 'Modification invalide' })

  const companyId = companyIdFrom(req)
  const state = loadState(companyId)
  state.config[moduleId] = {
    ...(state.config[moduleId] || { displayMode: 'visible' }),
    ...patch,
  }
  state.updatedAt = Date.now()
  saveState(companyId, state)
  res.json(state)
})

router.delete('/:moduleId', (req, res) => {
  if (!requireManager(req, res)) return
  if (!MODULE_ID.test(req.params.moduleId)) return res.status(400).json({ error: 'Identifiant de module invalide' })
  const companyId = companyIdFrom(req)
  const state = loadState(companyId)
  delete state.config[req.params.moduleId]
  state.updatedAt = Date.now()
  saveState(companyId, state)
  res.json(state)
})

router.post('/reset', (req, res) => {
  if (!requireManager(req, res)) return
  const companyId = companyIdFrom(req)
  const state = emptyState()
  saveState(companyId, state)
  res.json(state)
})

export default router
