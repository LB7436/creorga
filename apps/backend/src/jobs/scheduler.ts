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
  try {
    if (!fs.existsSync(TASKS_FILE)) return []
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))
  } catch { return [] }
}

function saveTasks(tasks: ScheduledTask[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8')
}

let timerHandle: NodeJS.Timeout | null = null

export function startScheduler() {
  if (timerHandle) return
  timerHandle = setInterval(tick, 60_000)
  // Run once at boot to catch overdue tasks
  setTimeout(tick, 5000)
  // eslint-disable-next-line no-console
  console.log('[scheduler] started — check toutes les 60s')
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
      // eslint-disable-next-line no-console
      console.error('[scheduler] task failed', task.id, e?.message)
    }
  }
  if (mutated) saveTasks(tasks)
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
    } catch { /* ignore — backend down */ }
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
