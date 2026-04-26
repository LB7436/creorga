#!/usr/bin/env node
// Convert \uXXXX escape sequences to actual UTF-8 characters in source files.
import fs from 'fs'
import path from 'path'

const roots = [
  'apps/web/src',
  'apps/pos/src',
  'apps/marketing/src',
  'apps/superadmin/src',
  'apps/guest/src',
]
const exts = new Set(['.ts', '.tsx', '.js', '.jsx'])

let filesChanged = 0
let totalReplacements = 0

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(p)
    } else if (exts.has(path.extname(entry.name))) {
      const src = fs.readFileSync(p, 'utf8')
      let count = 0
      const out = src.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => {
        count++
        return String.fromCharCode(parseInt(hex, 16))
      })
      if (count > 0) {
        fs.writeFileSync(p, out, 'utf8')
        filesChanged++
        totalReplacements += count
        console.log(`  ${p} — ${count} replacements`)
      }
    }
  }
}

for (const r of roots) walk(path.resolve(r))
console.log(`\n✓ ${filesChanged} files updated, ${totalReplacements} sequences converted`)
