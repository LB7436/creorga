import fs from 'node:fs'
import path from 'node:path'

export function privateDocumentPath(root: string, filename: string) {
  if (!filename || filename.length > 200 || !/^[a-zA-Z0-9]/.test(filename) || /[^a-zA-Z0-9._-]/.test(filename)) throw new Error('Nom de stockage invalide')
  const target = path.resolve(root, filename)
  if (path.dirname(target) !== path.resolve(root)) throw new Error('Chemin de stockage invalide')
  return target
}

/** Flush the new file before creating its SQL metadata. No overwrite of an existing file. */
export function storePrivateDocument(root: string, filename: string, bytes: Buffer) {
  const target = privateDocumentPath(root, filename)
  fs.mkdirSync(root, { recursive: true, mode: 0o700 })
  let created = false
  try {
    const descriptor = fs.openSync(target, 'wx', 0o600)
    created = true
    try { fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor) }
    finally { fs.closeSync(descriptor) }
  } catch (error) {
    if (created) { try { fs.unlinkSync(target) } catch {} }
    throw error
  }
}
