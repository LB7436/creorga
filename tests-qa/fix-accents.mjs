import fs from 'fs'
import path from 'path'
// Remplace \é \è … (backslash + lettre accentuée) par la lettre seule.
// Sûr : ces séquences ne sont PAS des échappements JS valides ni des tokens regex.
const ACCENTS = 'éèêëàâäçùûüîïôöÿœæÉÈÊËÀÂÄÇÙÛÜÎÏÔÖŸŒÆ'
const RE = new RegExp('\\\\([' + ACCENTS + '])', 'g')
const roots = ['apps/web/src', 'apps/pos/src', 'apps/guest/src', 'apps/marketing/src', 'apps/superadmin/src']
let files = 0, hits = 0
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue }
    if (!/\.(tsx?|jsx?|css)$/.test(e.name)) continue
    const src = fs.readFileSync(p, 'utf8')
    const m = src.match(RE)
    if (m) { fs.writeFileSync(p, src.replace(RE, '$1')); files++; hits += m.length }
  }
}
for (const r of roots) if (fs.existsSync(r)) walk(r)
console.log(`${files} fichiers corriges, ${hits} occurrences backslash-accent -> accent`)
