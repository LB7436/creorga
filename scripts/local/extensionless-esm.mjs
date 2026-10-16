import { fileURLToPath } from 'node:url'
import { existsSync, statSync } from 'node:fs'
// Le projet TS utilise moduleResolution=bundler. Adapter seulement ses imports
// relatifs compilés, jamais la résolution des paquets tiers ou des URL réseau.
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context) }
  catch (error) {
    if (!['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error.code)
      || !specifier.startsWith('.') || !context.parentURL?.includes('/apps/backend/dist/')) throw error
    for (const suffix of ['.js', '/index.js']) {
      const candidate = new URL(specifier + suffix, context.parentURL)
      if (candidate.protocol === 'file:' && existsSync(fileURLToPath(candidate)) && statSync(fileURLToPath(candidate)).isFile()) {
        return nextResolve(candidate.href, context)
      }
    }
    throw error
  }
}
