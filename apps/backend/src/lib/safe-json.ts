import fs from 'fs'
import path from 'path'

/** Écriture JSON atomique : write .tmp → rename. Garde un .bak de la version précédente. */
export function safeWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  if (fs.existsSync(filePath)) {
    try { fs.copyFileSync(filePath, filePath + '.bak') } catch { /* best effort */ }
  }
  fs.renameSync(tmp, filePath)
}

/** Lecture JSON avec fallback + récupération auto depuis .bak si corrompu. */
export function safeReadJson<T>(filePath: string, fallback: T): T {
  for (const candidate of [filePath, filePath + '.bak']) {
    try {
      if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, 'utf8')) as T
    } catch { /* essaie le suivant */ }
  }
  return fallback
}
