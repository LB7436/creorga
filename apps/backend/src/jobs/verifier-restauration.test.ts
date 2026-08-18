import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
import { dernierZip, verifierJson, verifierRestauration } from './verifier-restauration'

/** v5.0 — vérification de restauration : partie hermétique (sans Docker). */
function zipDeTest(contenu: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-zip-'))
  const zip = new AdmZip()
  for (const [nom, texte] of Object.entries(contenu)) zip.addFile(nom, Buffer.from(texte, 'utf8'))
  const chemin = path.join(dir, 'creorga-full-2026-01-01-0000.zip')
  zip.writeZip(chemin)
  return chemin
}

describe('verifierRestauration — JSON et structure du ZIP', () => {
  it('signale les JSON tronqués et l’absence de dump, sans jamais dire ok', async () => {
    const zip = zipDeTest({
      'data/inventory-stock.json': '[]',
      'data/proactive-notifs.json': '[{"id":"n1"}',
      'data/sous/dossier.json': '{"a":1}',
    })
    const rapport = await verifierRestauration(zip)
    expect(rapport.fichiersJson).toBe(3)
    expect(rapport.jsonInvalides).toEqual([path.join('data', 'proactive-notifs.json')])
    expect(rapport.dump).toBeNull()
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs.join(' ')).toMatch(/illisible/)
    expect(rapport.erreurs.join(' ')).toMatch(/dump PostgreSQL/)
  })

  it('un ZIP sans aucune donnée est un échec, pas un succès vide', async () => {
    const zip = zipDeTest({ 'readme.txt': 'rien' })
    const rapport = await verifierRestauration(zip)
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs.join(' ')).toMatch(/aucun fichier JSON/)
  })

  it('sans ZIP du tout : erreur explicite', async () => {
    const rapport = await verifierRestauration(null)
    expect(rapport.ok).toBe(false)
    expect(rapport.erreurs[0]).toMatch(/aucun ZIP/)
  })

  it('verifierJson compte récursivement et dernierZip prend le plus récent par nom', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-json-'))
    fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'a', 'x.json'), '{}')
    fs.writeFileSync(path.join(dir, 'a', 'b', 'y.json'), 'pas du json')
    expect(verifierJson(dir)).toEqual({ total: 2, invalides: [path.join('a', 'b', 'y.json')] })

    fs.writeFileSync(path.join(dir, 'creorga-full-2026-01-01-0900.zip'), '')
    fs.writeFileSync(path.join(dir, 'creorga-full-2026-01-02-0800.zip'), '')
    fs.writeFileSync(path.join(dir, 'autre.zip'), '')
    expect(path.basename(dernierZip(dir)!)).toBe('creorga-full-2026-01-02-0800.zip')
    expect(dernierZip(path.join(dir, 'inexistant'))).toBeNull()
  })
})
