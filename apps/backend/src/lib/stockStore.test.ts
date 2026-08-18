import { describe, it, expect } from 'vitest'
import { stockStatusFor, type StockEntry } from './stockStore'

const stock: StockEntry[] = [
  { id: '1', name: 'coca-cola', quantity: 24, unit: 'pcs', lowStockThreshold: 6 },
  { id: '2', name: 'jambon', quantity: 2, unit: 'kg', lowStockThreshold: 5 },
  { id: '3', name: 'eau', quantity: 0, unit: 'pcs' },
]

describe('stockStatusFor', () => {
  it('produit non suivi → UNTRACKED et disponible', () => {
    const s = stockStatusFor('Tiramisu maison', stock)
    expect(s.status).toBe('UNTRACKED')
    expect(s.isAvailable).toBe(true)
    expect(s.qty).toBeNull()
  })

  it('stock suffisant → OK', () => {
    const s = stockStatusFor('Coca-Cola 33cl', stock)
    expect(s.status).toBe('OK')
    expect(s.qty).toBe(24)
    expect(s.isAvailable).toBe(true)
  })

  it('stock sous le seuil → LOW mais disponible', () => {
    const s = stockStatusFor('Croque au jambon', stock)
    expect(s.status).toBe('LOW')
    expect(s.isAvailable).toBe(true)
  })

  it('stock épuisé → OUT et indisponible', () => {
    const s = stockStatusFor('Eau minérale', stock)
    expect(s.status).toBe('OUT')
    expect(s.isAvailable).toBe(false)
  })

  it('correspondance insensible à la casse et bidirectionnelle', () => {
    expect(stockStatusFor('JAMBON', stock).tracked).toBe(true)
    // le matching est volontairement flou dans les deux sens
    expect(stockStatusFor('jambon de pays', stock).tracked).toBe(true)
    expect(stockStatusFor('salade', stock).tracked).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* Décrément de vente — écrit sur disque : chaque test part d'un       */
/* répertoire temporaire vierge (le module résout data/ depuis cwd).   */
/* ------------------------------------------------------------------ */
import { beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { decrementerPourVente, getStock, saveStock, getMouvements, trouverEntree, _resetCachesPourTests } from './stockStore'

describe('decrementerPourVente', () => {
  let cwdInitial: string
  let dossier: string

  beforeEach(() => {
    cwdInitial = process.cwd()
    dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'creorga-stock-'))
    process.chdir(dossier)
    _resetCachesPourTests()
    saveStock([
      { id: 'c', name: 'Coca-Cola', quantity: 5, unit: 'pcs', lowStockThreshold: 3 },
      { id: 'z', name: 'Coca-Cola Zero', quantity: 10, unit: 'pcs', lowStockThreshold: 2 },
      { id: 'j', name: 'Jambon', quantity: 2, unit: 'kg', lowStockThreshold: 5 },
    ])
  })

  afterEach(() => {
    process.chdir(cwdInitial)
    _resetCachesPourTests()
    fs.rmSync(dossier, { recursive: true, force: true })
  })

  it('une vente decremente le stock — ce qui n arrivait NULLE PART avant', () => {
    const r = decrementerPourVente([{ name: 'Coca-Cola', qty: 2 }], 'vente-1')
    expect(r.decrementes).toEqual([{ name: 'Coca-Cola', delta: -2, quantiteApres: 3 }])
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(3)
  })

  it('le decrement est ECRIT sur disque, pas seulement en memoire', () => {
    decrementerPourVente([{ name: 'Coca-Cola', qty: 1 }], 'vente-2')
    _resetCachesPourTests()   // force la relecture depuis le fichier
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(4)
  })

  it('un Coca vendu ne decremente JAMAIS le Coca Zero (nom exact prioritaire)', () => {
    decrementerPourVente([{ name: 'Coca-Cola', qty: 1 }], 'vente-3')
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(4)
    expect(getStock().find(e => e.id === 'z')!.quantity).toBe(10)
  })

  it('avec plusieurs candidats flous et aucun exact, on refuse de deviner', () => {
    // « Coca » est inclus dans « Coca-Cola » ET « Coca-Cola Zero » : ambigu.
    const r = decrementerPourVente([{ name: 'Coca', qty: 1 }], 'vente-4')
    expect(r.nonSuivis).toEqual(['Coca'])
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(5)
    expect(getStock().find(e => e.id === 'z')!.quantity).toBe(10)
  })

  it('idempotent : rejouer la meme vente ne decremente pas deux fois', () => {
    decrementerPourVente([{ name: 'Coca-Cola', qty: 2 }], 'vente-5')
    const r2 = decrementerPourVente([{ name: 'Coca-Cola', qty: 2 }], 'vente-5')
    expect(r2.decrementes).toEqual([])
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(3)
  })

  it('ne descend jamais sous zero et signale la rupture', () => {
    const r = decrementerPourVente([{ name: 'Coca-Cola', qty: 99 }], 'vente-6')
    expect(getStock().find(e => e.id === 'c')!.quantity).toBe(0)
    expect(r.alertes).toEqual([{ name: 'Coca-Cola', quantite: 0, statut: 'OUT' }])
  })

  it('alerte LOW au franchissement du seuil, une seule fois', () => {
    // 5 -> 3 : franchit le seuil (3) => LOW
    const r1 = decrementerPourVente([{ name: 'Coca-Cola', qty: 2 }], 'v-a')
    expect(r1.alertes).toEqual([{ name: 'Coca-Cola', quantite: 3, statut: 'LOW' }])
    // 3 -> 2 : deja sous le seuil, pas de nouvelle alerte
    const r2 = decrementerPourVente([{ name: 'Coca-Cola', qty: 1 }], 'v-b')
    expect(r2.alertes).toEqual([])
  })

  it('un produit sans entree de stock est declare non suivi, sans erreur', () => {
    const r = decrementerPourVente([{ name: 'Tiramisu maison', qty: 1 }], 'vente-7')
    expect(r.nonSuivis).toEqual(['Tiramisu maison'])
    expect(r.decrementes).toEqual([])
  })

  it('journalise un mouvement par ligne decrementee, avec la reference', () => {
    decrementerPourVente([{ name: 'Coca-Cola', qty: 1 }, { name: 'Jambon', qty: 1 }], 'vente-8', 'Marie')
    const m = getMouvements()
    expect(m).toHaveLength(2)
    expect(m.every(x => x.type === 'vente' && x.reference === 'vente-8' && x.auteur === 'Marie')).toBe(true)
    expect(m.map(x => x.name).sort()).toEqual(['Coca-Cola', 'Jambon'])
  })

  it('trouverEntree : accents et casse ignores', () => {
    expect(trouverEntree('coca-cola')?.id).toBe('c')
    expect(trouverEntree('JAMBON')?.id).toBe('j')
  })
})
