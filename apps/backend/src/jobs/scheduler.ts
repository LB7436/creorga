/**
 * v3.19 F1 — Scheduled tasks worker
 *
 * Lit `scheduled-tasks.json` toutes les 60s, détecte tâches `dueAt <= now`
 * (status='pending'), exécute :
 *   - kind='reminder'   → push WebSocket /live channel 'inbox' event 'reminder'
 *   - kind='intent'     → POST /api/agent/intent { text }
 *   - kind='broadcast'  → push event custom
 * Marque ensuite `status='done'`.
 *
 * Format scheduled-tasks.json :
 *   [{
 *     id, kind, payload, dueAt (ms),
 *     status: 'pending'|'done'|'cancelled',
 *     createdAt, completedAt?, repeatEvery?: number (ms, optionnel)
 *   }]
 */

import fs from 'fs'
import path from 'path'
import { safeWriteJson, safeReadJson } from '../lib/safe-json'
import logger from '../lib/logger'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const TASKS_FILE = path.join(DATA_DIR, 'scheduled-tasks.json')

export interface ScheduledTask {
  id: string
  kind: 'reminder' | 'intent' | 'broadcast'
  payload: any
  dueAt: number
  status: 'pending' | 'done' | 'cancelled'
  createdAt: number
  completedAt?: number
  repeatEvery?: number
  description?: string
}

function loadTasks(): ScheduledTask[] {
  // Fichier absent = aucune tâche programmée. Ce n'est pas une erreur.
  if (!fs.existsSync(TASKS_FILE)) return []
  try {
    const brut = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))
    if (!Array.isArray(brut)) throw new Error('le contenu n\'est pas un tableau')
    return brut as ScheduledTask[]
  } catch (e: any) {
    // Ne JAMAIS avaler cette lecture (règle du CLAUDE.md). L'ancienne version
    // renvoyait [] en silence : des rappels programmés disparaissaient sans
    // qu'aucune trace ne permette de s'en apercevoir.
    logger.error(`[scheduler] ${TASKS_FILE} illisible (${e?.message || e}) — reprise sur .bak`)
    const secours = safeReadJson<ScheduledTask[]>(TASKS_FILE + '.bak', [])
    if (Array.isArray(secours) && secours.length) {
      logger.warn(`[scheduler] ${secours.length} tâche(s) récupérée(s) depuis la sauvegarde`)
      return secours
    }
    logger.error('[scheduler] aucune reprise possible — les tâches programmées sont perdues')
    return []
  }
}

function saveTasks(tasks: ScheduledTask[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  // Écriture atomique (.tmp puis rename, avec .bak) comme tout data/*.json :
  // un fs.writeFileSync direct laisse un fichier tronqué si le processus meurt
  // au milieu, et on perd toutes les tâches d'un coup.
  try {
    safeWriteJson(TASKS_FILE, tasks)
  } catch (e: any) {
    logger.error(`[scheduler] écriture de ${TASKS_FILE} impossible : ${e?.message || e}`)
    // Propagé : une route qui croit avoir programmé un rappel doit le savoir.
    throw e
  }
}

let timerHandle: NodeJS.Timeout | null = null

export function startScheduler() {
  if (timerHandle) return
  timerHandle = setInterval(tick, 60_000)
  // Run once at boot to catch overdue tasks
  setTimeout(tick, 5000)
  logger.info('[scheduler] démarré — vérification toutes les 60 s')
}

export function stopScheduler() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
}

async function tick() {
  const now = Date.now()
  const tasks = loadTasks()
  let mutated = false
  const due = tasks.filter((t) => t.status === 'pending' && t.dueAt <= now)
  for (const task of due) {
    try {
      await executeTask(task)
      if (task.repeatEvery) {
        task.dueAt = now + task.repeatEvery
      } else {
        task.status = 'done'
        task.completedAt = now
      }
      mutated = true
    } catch (e: any) {
      logger.error(`[scheduler] tâche ${task.id} en échec : ${e?.message || e}`)
    }
  }
  // saveTasks peut désormais lever. Ici on est appelé par setInterval : une
  // exception non rattrapée deviendrait un rejet non géré et tuerait la boucle.
  if (mutated) {
    try {
      saveTasks(tasks)
    } catch {
      // Déjà journalisé en erreur par saveTasks. On laisse la boucle vivre :
      // au pire les tâches seront rejouées au tour suivant.
    }
  }
}

async function executeTask(task: ScheduledTask) {
  const broadcast = (globalThis as any).liveBroadcast
  if (task.kind === 'reminder') {
    if (broadcast) broadcast('inbox', 'reminder', {
      id: task.id,
      title: task.description || 'Rappel',
      message: task.payload?.message || task.description || '',
      dueAt: task.dueAt,
    })
  } else if (task.kind === 'intent') {
    // Self-call /api/agent/intent
    const PORT = process.env.PORT || '3002'
    try {
      await fetch(`http://localhost:${PORT}/api/agent/intent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: task.payload?.text, currentPath: '/', userId: task.payload?.userId || 'default' }),
      })
    } catch (e: any) {
      // L'API se rappelle elle-même : si ça échoue, l'intention programmée
      // n'a pas été exécutée. Le taire reviendrait à marquer la tâche « faite »
      // sans qu'elle ait rien fait.
      throw new Error(`appel à /api/agent/intent impossible : ${e?.message || e}`)
    }
  } else if (task.kind === 'broadcast') {
    if (broadcast) broadcast(task.payload?.channel || 'inbox', task.payload?.event || 'notify', task.payload?.data || {})
  }
}

// Helpers exportées pour les routes
export function listTasks(filter?: { status?: string; userId?: string }): ScheduledTask[] {
  let tasks = loadTasks()
  if (filter?.status) tasks = tasks.filter((t) => t.status === filter.status)
  if (filter?.userId) tasks = tasks.filter((t) => t.payload?.userId === filter.userId)
  return tasks.sort((a, b) => a.dueAt - b.dueAt)
}

export function createTask(input: Omit<ScheduledTask, 'id' | 'status' | 'createdAt'>): ScheduledTask {
  const tasks = loadTasks()
  const task: ScheduledTask = {
    ...input,
    id: 'sched-' + Math.random().toString(36).slice(2, 10),
    status: 'pending',
    createdAt: Date.now(),
  }
  tasks.push(task)
  saveTasks(tasks)
  return task
}

export function cancelTask(id: string): boolean {
  const tasks = loadTasks()
  const t = tasks.find((x) => x.id === id)
  if (!t) return false
  t.status = 'cancelled'
  saveTasks(tasks)
  return true
}

export function deleteTask(id: string): boolean {
  const tasks = loadTasks()
  const before = tasks.length
  const remaining = tasks.filter((x) => x.id !== id)
  saveTasks(remaining)
  return remaining.length < before
}
