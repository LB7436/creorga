import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

export type TableShape = 'round' | 'square' | 'rect' | 'bar'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty'
export type PayMethod = 'cash' | 'card' | 'contactless'
export type StaffRole = 'OWNER' | 'WAITER' | 'KITCHEN' | 'MANAGER'

export interface StaffMember {
  id: string
  name: string
  pin: string
  role: StaffRole
  color: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  emoji: string
  active: boolean
  stock?: number
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  qty: number
  note: string
  coverId: string
}

export interface Cover {
  id: string
  label: string      // "Couvert 1", "Marie", etc.
  items: OrderItem[]
  /** Horodatage du règlement (ms). Absent = pas encore payé. */
  paidAt?: number
  /** Moyen de paiement retenu pour ce couvert. */
  paidMethod?: PayMethod
}

/** Ligne figée d'une vente : le prix est copié, pas référencé. */
export interface LigneVente {
  name: string
  qty: number
  /** Prix unitaire TTC au moment de la vente. */
  price: number
}

/** Nature d'une remise accordée à l'encaissement. */
export type TypeRemise = 'promo' | 'carte_cadeau' | 'points' | 'membre' | 'geste'

/**
 * Une remise figée dans la vente. Sans cette trace, promos, cartes cadeaux
 * et points fidélité étaient déduits À L'ÉCRAN puis oubliés au journal : le
 * ticket Z affichait un chiffre encaissé supérieur à l'argent réellement
 * entré en caisse.
 */
export interface Remise {
  type: TypeRemise
  libelle: string
  /** Montant TTC déduit, en euros positifs. */
  montant: number
}

/** Une part d'un règlement mixte (ex. 30 € en espèces + le reste en carte). */
export interface Reglement {
  methode: PayMethod
  montant: number
}

/**
 * Une vente enregistrée. C'est la seule trace comptable de la caisse : elle
 * n'existait pas, et sans elle aucune clôture ni aucun ticket Z n'est possible.
 */
export interface Vente {
  id: string
  /** Numéro séquentiel dans la journée, reparti à 1 après chaque clôture. */
  numero: number
  horodatage: number
  tableId: string
  tableName: string
  /** Libellés des couverts réglés par cette vente. */
  couverts: string[]
  lignes: LigneVente[]
  /** Hors taxes, déduit du TTC APRÈS remises : les prix de la carte sont TTC. */
  sousTotal: number
  tva: number
  pourboire: number
  /** Total brut TTC des lignes, avant toute remise. */
  brut: number
  /** Remises accordées, dans l'ordre d'application. */
  remises: Remise[]
  /** Arrondi caritatif (« arrondir aux 50 € »), reversé, jamais du chiffre. */
  arrondiCaritatif: number
  /** TTC net + pourboire + arrondi — ce qui est réellement encaissé. */
  total: number
  /**
   * Ventilation par moyen de paiement. Somme = total. Un règlement simple
   * n'a qu'une entrée ; un règlement mixte en a plusieurs. `methode` reste
   * la méthode principale (la plus grosse part) pour la rétro-compat.
   */
  reglements: Reglement[]
  methode: PayMethod
  vendeur: string
}

/** Ce que l'écran de paiement transmet au store en plus de la méthode et du pourboire. */
export interface OptionsPaiement {
  remises?: Remise[]
  arrondiCaritatif?: number
  /** Ventilation d'un règlement mixte. Si absent : tout sur `method`. */
  reglements?: Reglement[]
}

/** Résultat d'une clôture de journée (ticket Z). */
export interface Cloture {
  id: string
  horodatage: number
  /** Horodatage de la vente la plus ancienne de la période. */
  debut: number
  nbVentes: number
  totalTTC: number
  totalHT: number
  totalTva: number
  totalPourboires: number
  /** Somme des remises accordées sur la période — visible sur le ticket Z. */
  totalRemises: number
  /** Arrondis caritatifs collectés (à reverser, hors chiffre d'affaires). */
  totalArrondisCaritatifs: number
  parMethode: Record<PayMethod, number>
  ventes: Vente[]
}

export interface Table {
  id: string
  name: string
  shape: TableShape
  seats: number
  x: number          // SVG center x
  y: number          // SVG center y
  status: TableStatus
  covers: Cover[]
  openedAt?: number  // timestamp ms
  section: string
  mergedWith: string[]   // IDs of tables merged INTO this one
  isMergedInto?: string  // parent table ID if this table was absorbed
  rotation?: number
}

export interface POSSettings {
  restaurantName: string
  currency: string
  taxRate: number
  defaultTip: number
  tipPresets: number[]
}

// ─── Default data ────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9)

/** Arrondi au centime. Sans lui, 3 × 3,30 € donne 9,899999999999999. */
const centimes = (n: number) => Math.round(n * 100) / 100

/** Total TTC d'un couvert. */
export function totalCouvert(cover: Cover): number {
  return centimes(cover.items.reduce((s, i) => s + i.price * i.qty, 0))
}

/**
 * Ventile un montant TTC en HT + TVA.
 *
 * Les prix de la carte sont TTC — c'est ainsi qu'un café affiche ses prix. La
 * TVA est donc INCLUSE et doit être extraite, pas ajoutée : `WaiterMode.tsx`
 * calculait `total * taxRate` et affichait `taxRate * 100`, ce qui traitait le
 * taux comme une fraction alors que `CLAUDE.md` impose un pourcentage (17, pas
 * 0,17). À 17 %, l'ancienne formule annonçait une TVA de 17 fois le total.
 *
 * @param totalTTC montant toutes taxes comprises
 * @param taux     POURCENTAGE (17), jamais une fraction
 */
export function ventilationTva(totalTTC: number, taux: number): { ht: number; tva: number } {
  if (!taux || taux <= 0) return { ht: centimes(totalTTC), tva: 0 }
  const ht = centimes(totalTTC / (1 + taux / 100))
  return { ht, tva: centimes(totalTTC - ht) }
}

// Helper — génère un item avec stock 100 par défaut
const mk = (id: string, name: string, price: number, category: string, emoji: string): MenuItem => ({
  id, name, price, category, emoji, active: true, stock: 100,
})

export const DEFAULT_MENU: MenuItem[] = [
  // ═══ BOISSONS CHAUDES ═══
  mk('bc1', 'Café', 2.80, 'Boissons Chaudes', '☕'),
  mk('bc2', 'Irish Coffee', 4.50, 'Boissons Chaudes', '☕'),
  mk('bc3', 'Thé', 2.60, 'Boissons Chaudes', '🫖'),
  mk('bc4', 'Lait Russe', 3.50, 'Boissons Chaudes', '🥛'),
  mk('bc5', 'Expresso', 2.50, 'Boissons Chaudes', '☕'),
  mk('bc6', 'Expresso Déca', 2.30, 'Boissons Chaudes', '☕'),
  mk('bc7', 'Café Chantilly', 3.00, 'Boissons Chaudes', '☕'),
  mk('bc8', 'Café Déca', 2.60, 'Boissons Chaudes', '☕'),
  mk('bc9', 'Chocky', 3.40, 'Boissons Chaudes', '🍫'),
  mk('bc10', 'Capuccino', 3.40, 'Boissons Chaudes', '☕'),

  // ═══ SOFTS ═══
  mk('s1', 'Eau Plate 1/4L', 3.00, 'Softs', '💧'),
  mk('s2', 'Eau Plate 1/2L', 4.30, 'Softs', '💧'),
  mk('s3', 'Eau Plate 1L', 7.50, 'Softs', '💧'),
  mk('s4', 'Eau Gaz 1/4L', 3.00, 'Softs', '💧'),
  mk('s5', 'Eau Gaz 1/2L', 4.30, 'Softs', '💧'),
  mk('s6', 'Fanta', 3.00, 'Softs', '🥤'),
  mk('s7', 'Cola', 3.00, 'Softs', '🥤'),
  mk('s8', 'Cola Zero', 3.00, 'Softs', '🥤'),
  mk('s9', 'Sprite', 3.00, 'Softs', '🥤'),
  mk('s10', 'Ice Tea', 3.00, 'Softs', '🧊'),
  mk('s11', 'Red Bull', 3.50, 'Softs', '🧃'),
  mk('s12', 'Crodino', 3.90, 'Softs', '🍊'),
  mk('s13', 'Bitter Rouge', 3.90, 'Softs', '🔴'),
  mk('s14', 'Schweppes Lemon', 3.00, 'Softs', '🍋'),
  mk('s15', 'Schweppes Agrumes', 2.90, 'Softs', '🍊'),
  mk('s16', 'Schweppes Tonic', 3.00, 'Softs', '🥤'),
  mk('s17', 'Jus Abricot', 3.00, 'Softs', '🍑'),
  mk('s18', 'Jus Peach', 3.00, 'Softs', '🍑'),
  mk('s19', 'Jus Tomate', 3.00, 'Softs', '🍅'),
  mk('s20', 'Jus Pomme', 3.00, 'Softs', '🍎'),
  mk('s21', 'Jus Orange', 3.00, 'Softs', '🍊'),
  mk('s22', 'Jus Multi', 3.00, 'Softs', '🧃'),
  mk('s23', 'Jus Fraise', 3.00, 'Softs', '🍓'),
  mk('s24', 'Jus Banane', 3.00, 'Softs', '🍌'),
  mk('s25', 'Jus Ananas', 3.00, 'Softs', '🍍'),
  mk('s26', 'Sirop', 1.00, 'Softs', '🍯'),
  mk('s27', 'Schampi', 3.50, 'Softs', '🥂'),
  mk('s28', 'Lampi', 3.50, 'Softs', '🥤'),
  mk('s29', 'Symples', 3.50, 'Softs', '🥤'),
  mk('s30', 'Soft Ouvert', 1.50, 'Softs', '🥤'),

  // ═══ BIÈRES ═══
  mk('b1', 'Martini Bière', 5.30, 'Bières', '🍺'),
  mk('b2', 'Panache', 3.50, 'Bières', '🍺'),
  mk('b3', 'Sol', 5.10, 'Bières', '🍺'),
  mk('b4', 'Favaios Bière', 5.30, 'Bières', '🍺'),
  mk('b5', 'Bofferding Flute', 3.20, 'Bières', '🍺'),
  mk('b6', 'Bofferding 0.5', 3.50, 'Bières', '🍺'),
  mk('b7', 'Bofferding Btle', 3.20, 'Bières', '🍺'),
  mk('b8', 'Bofferding Humpen', 3.50, 'Bières', '🍺'),
  mk('b9', 'Battin 0.4', 5.30, 'Bières', '🍺'),
  mk('b10', 'Battin 0.5', 3.80, 'Bières', '🍺'),
  mk('b11', 'Battin Blanche', 3.80, 'Bières', '🍺'),
  mk('b12', 'Battin Brune', 3.80, 'Bières', '🍺'),
  mk('b13', 'Battin Fruitée', 3.60, 'Bières', '🍺'),
  mk('b14', 'Battin Gambrinus', 3.50, 'Bières', '🍺'),
  mk('b15', 'Battin Pression', 5.10, 'Bières', '🍺'),
  mk('b16', 'Klensch 0.3', 4.00, 'Bières', '🍺'),
  mk('b17', 'Clausthaler', 3.50, 'Bières', '🍺'),
  mk('b18', 'Monaco', 5.30, 'Bières', '🍺'),
  mk('b19', 'Picon Bière 0.3', 6.30, 'Bières', '🍺'),
  mk('b20', 'Picon Bière 0.4', 7.40, 'Bières', '🍺'),
  mk('b21', 'Picon Bière 0.5', 2.60, 'Bières', '🍺'),
  mk('b22', 'Superbok', 3.50, 'Bières', '🍺'),
  mk('b23', 'Superbok N.A.', 3.50, 'Bières', '🍺'),
  mk('b24', 'Tango', 2.80, 'Bières', '🍺'),

  // ═══ APÉRITIFS ═══
  mk('ap1', 'Martini Rouge', 5.30, 'Apéritifs', '🍷'),
  mk('ap2', 'Martini Blanc', 5.30, 'Apéritifs', '🍷'),
  mk('ap3', 'Campari Soda', 8.50, 'Apéritifs', '🍹'),
  mk('ap4', 'Campari', 6.10, 'Apéritifs', '🍹'),
  mk('ap5', 'Cynar', 5.90, 'Apéritifs', '🥃'),
  mk('ap6', 'Favaios', 3.90, 'Apéritifs', '🍷'),
  mk('ap7', 'Gin Gordon', 6.60, 'Apéritifs', '🥃'),
  mk('ap8', 'Gin Hendrix', 14.50, 'Apéritifs', '🥃'),
  mk('ap9', 'Gin Tonic', 11.50, 'Apéritifs', '🥃'),
  mk('ap10', 'Picon', 5.10, 'Apéritifs', '🍹'),
  mk('ap11', 'Porto 10 ans', 6.90, 'Apéritifs', '🍷'),
  mk('ap12', 'Porto Blanc', 3.90, 'Apéritifs', '🍷'),
  mk('ap13', 'Porto Rouge', 3.90, 'Apéritifs', '🍷'),
  mk('ap14', 'Porto Rosé', 5.30, 'Apéritifs', '🍷'),
  mk('ap15', 'Verre Crément', 6.70, 'Apéritifs', '🥂'),
  mk('ap16', 'Ricard', 3.80, 'Apéritifs', '🥃'),

  // ═══ VINS (au verre) ═══
  mk('v1', 'Verre Pinot', 4.10, 'Vins', '🍷'),
  mk('v2', 'Verre Elbling', 4.10, 'Vins', '🍷'),
  mk('v3', 'Verre Premier Cru', 4.40, 'Vins', '🍷'),
  mk('v4', 'Verre Rivaner', 4.20, 'Vins', '🍷'),
  mk('v5', 'Verre Edmond Rouge', 6.90, 'Vins', '🍷'),
  mk('v6', 'Verre Belle Emilie', 4.30, 'Vins', '🍷'),
  mk('v7', 'Verre Rose de 10L', 4.20, 'Vins', '🍷'),
  mk('v8', 'Verre Rouge de 10L', 4.60, 'Vins', '🍷'),
  mk('v9', 'Verre Blanc de 10L', 4.20, 'Vins', '🍷'),
  mk('v10', 'Verre Vin Rouge', 4.40, 'Vins', '🍷'),
  mk('v11', 'Verre Vin Rosé', 4.40, 'Vins', '🍷'),
  mk('v12', 'Verre Vin Blanc', 4.40, 'Vins', '🍷'),
  mk('v13', 'Verre Moscato', 6.90, 'Vins', '🍷'),
  mk('v14', 'Mini Moscato', 4.90, 'Vins', '🍷'),
  mk('v15', 'Fiederwaissen', 5.00, 'Vins', '🍷'),
  mk('v16', 'Vin Cola 0.4', 5.10, 'Vins', '🍷'),
  mk('v17', 'Vin Cola', 6.90, 'Vins', '🍷'),
  mk('v18', 'Rose Chateau Edmond', 4.20, 'Vins', '🍷'),

  // ═══ BOUTEILLES ALCOOL ═══
  mk('ba1', 'Bt. Rivaner', 26.00, 'Bouteilles', '🍾'),
  mk('ba2', 'Bt. Rosé Edm', 34.00, 'Bouteilles', '🍾'),
  mk('ba3', 'Bt. Edmond R', 34.00, 'Bouteilles', '🍾'),
  mk('ba4', 'Kir Royal', 7.20, 'Bouteilles', '🥂'),
  mk('ba5', 'Bernard Massard', 30.00, 'Bouteilles', '🍾'),
  mk('ba6', 'Petite Bt. Crément', 7.10, 'Bouteilles', '🥂'),
  mk('ba7', 'Bt. Vin Blanc', 28.00, 'Bouteilles', '🍾'),
  mk('ba8', 'Bt. Crément P.F.', 25.00, 'Bouteilles', '🍾'),

  // ═══ COCKTAILS ═══
  mk('c1', 'Coctail N.A.', 7.90, 'Cocktails', '🍹'),
  mk('c2', 'Hugo', 8.10, 'Cocktails', '🍹'),
  mk('c3', 'Caipirinha', 8.30, 'Cocktails', '🍹'),
  mk('c4', 'Mojito', 8.10, 'Cocktails', '🍹'),
  mk('c5', 'Coctail Maison', 8.50, 'Cocktails', '🍹'),
  mk('c6', 'Cuba Libre', 8.00, 'Cocktails', '🍹'),
  mk('c7', 'Aperol', 8.50, 'Cocktails', '🍹'),

  // ═══ ALCOOLS / SHOTS ═══
  mk('a1', 'Batida de Coco', 5.80, 'Alcool', '🥃'),
  mk('a2', 'Shot Berliner', 3.00, 'Alcool', '🥃'),
  mk('a3', 'Berliner Rouge', 5.60, 'Alcool', '🥃'),
  mk('a4', 'Berliner 0.4', 4.00, 'Alcool', '🥃'),
  mk('a5', 'Berliner Blue', 5.60, 'Alcool', '🥃'),
  mk('a6', 'Berliner Luft', 5.50, 'Alcool', '🥃'),
  mk('a7', 'Berliner 40%', 5.60, 'Alcool', '🥃'),
  mk('a8', 'Bacardi', 6.10, 'Alcool', '🥃'),
  mk('a9', 'Passoa', 5.90, 'Alcool', '🥃'),
  mk('a10', 'Safari', 5.90, 'Alcool', '🥃'),
  mk('a11', 'Malibou', 5.80, 'Alcool', '🥃'),
  mk('a12', 'Don Papa', 8.20, 'Alcool', '🥃'),
  mk('a13', 'Shot Don Papa', 4.00, 'Alcool', '🥃'),
  mk('a14', 'Shot J.W. Black', 4.00, 'Alcool', '🥃'),
  mk('a15', 'Shot Havanna 7', 4.00, 'Alcool', '🥃'),
  mk('a16', 'Shot Henessy', 4.00, 'Alcool', '🥃'),
  mk('a17', 'Shot Diplomatico', 4.00, 'Alcool', '🥃'),
  mk('a18', 'Havana Verde', 5.80, 'Alcool', '🥃'),
  mk('a19', 'Havana Club', 5.90, 'Alcool', '🥃'),
  mk('a20', 'Havana 7 ans', 7.90, 'Alcool', '🥃'),
  mk('a21', 'Tequila Spéciale', 4.00, 'Alcool', '🥃'),
  mk('a22', 'Tequila Shot', 5.80, 'Alcool', '🥃'),
  mk('a23', 'Vodka Soft', 3.00, 'Alcool', '🥃'),
  mk('a24', 'Vodka', 9.00, 'Alcool', '🥃'),
  mk('a25', 'Vodka Red Bull', 5.80, 'Alcool', '🥃'),
  mk('a26', 'Shot 41', 8.40, 'Alcool', '🥃'),
  mk('a27', 'Remy Martin', 5.80, 'Alcool', '🥃'),
  mk('a28', 'Negrita', 7.40, 'Alcool', '🥃'),
  mk('a29', 'Henessy', 3.50, 'Alcool', '🥃'),
  mk('a30', 'Grand Marnier', 8.40, 'Alcool', '🥃'),
  mk('a31', 'Diplomatico', 5.80, 'Alcool', '🥃'),
  mk('a32', 'Cointreau', 5.80, 'Alcool', '🥃'),
  mk('a33', 'Baileys', 5.30, 'Alcool', '🥃'),

  // ═══ WHISKY ═══
  mk('w1', 'Jack Honey', 7.20, 'Whisky', '🥃'),
  mk('w2', 'Jack Daniels', 6.90, 'Whisky', '🥃'),
  mk('w3', 'Chivas', 7.40, 'Whisky', '🥃'),
  mk('w4', 'Glenfidich', 5.80, 'Whisky', '🥃'),
  mk('w5', 'Becherovka', 6.60, 'Whisky', '🥃'),
  mk('w6', 'Jameson', 6.30, 'Whisky', '🥃'),
  mk('w7', 'J&B', 7.10, 'Whisky', '🥃'),
  mk('w8', 'Johnny Walker Black', 6.40, 'Whisky', '🥃'),
  mk('w9', 'Johnny Walker Red', 6.80, 'Whisky', '🥃'),
  mk('w10', 'Saint James', 6.90, 'Whisky', '🥃'),

  // ═══ DIGESTIFS ═══
  mk('d1', 'Grappa Giulia', 5.20, 'Digestifs', '🥃'),
  mk('d2', 'Grappa Invechiatta 98', 5.80, 'Digestifs', '🥃'),
  mk('d3', 'Limoncello', 5.80, 'Digestifs', '🥃'),
  mk('d4', 'Licor 35', 5.80, 'Digestifs', '🥃'),
  mk('d5', 'Jägermeister', 4.90, 'Digestifs', '🥃'),
  mk('d6', 'Hunneg Drepp', 4.90, 'Digestifs', '🥃'),
  mk('d7', 'Averna', 4.90, 'Digestifs', '🥃'),
  mk('d8', 'Buff', 5.90, 'Digestifs', '🥃'),
  mk('d9', 'Amendoa Amarga', 4.90, 'Digestifs', '🥃'),
  mk('d10', 'Amaretto', 5.20, 'Digestifs', '🥃'),
  mk('d11', 'Macieira / 1920', 5.90, 'Digestifs', '🥃'),
  mk('d12', 'Mirabelle Drepp', 5.20, 'Digestifs', '🥃'),
  mk('d13', 'Calvados VSOP', 5.40, 'Digestifs', '🥃'),
  mk('d14', 'Calvados VS', 5.80, 'Digestifs', '🥃'),
  mk('d15', 'Appeldrepp', 5.40, 'Digestifs', '🥃'),
  mk('d16', 'Qwetschdrepp', 6.90, 'Digestifs', '🥃'),
  mk('d17', 'Poire Drepp', 4.90, 'Digestifs', '🥃'),
  mk('d18', 'Sambucca', 1.50, 'Digestifs', '🥃'),

  // ═══ SNACKS ═══
  mk('sn1', 'Quiche Lorraine', 3.50, 'Snacks', '🥧'),
  mk('sn2', 'Gromperen Zalot 1 wupp', 16.50, 'Snacks', '🥔'),
  mk('sn3', 'Gromperen Zalot 2 wupp', 6.50, 'Snacks', '🥔'),
  mk('sn4', 'Bouneschlupp', 7.50, 'Snacks', '🍲'),
  mk('sn5', 'Plancha Mixte', 25.50, 'Snacks', '🍖'),
  mk('sn6', 'Plancha Fromage', 12.50, 'Snacks', '🧀'),
  mk('sn7', 'Plancha Charcuterie', 12.50, 'Snacks', '🥓'),
  mk('sn8', 'Cordon Bleu', 26.50, 'Snacks', '🍖'),
  mk('sn9', 'Steak de Cheval', 30.50, 'Snacks', '🥩'),
  mk('sn10', 'Filet de Cheval', 5.50, 'Snacks', '🥩'),
  mk('sn11', 'Sandwich', 14.50, 'Snacks', '🥪'),
  mk('sn12', 'Pâtes Bolo', 7.50, 'Snacks', '🍝'),
  mk('sn13', 'Hammeschmier', 5.80, 'Snacks', '🥪'),
  mk('sn14', 'Hamburger', 4.50, 'Snacks', '🍔'),
  mk('sn15', 'Cheeseburger', 8.50, 'Snacks', '🍔'),
  mk('sn16', 'Bauerburger', 11.50, 'Snacks', '🍔'),
  mk('sn17', 'Beierwurscht', 8.50, 'Snacks', '🌭'),
  mk('sn18', 'Gehacktes Breidche', 4.90, 'Snacks', '🥪'),
  mk('sn19', 'Croque Monsieur', 8.50, 'Snacks', '🥪'),
  mk('sn20', 'Curly Fries', 1.00, 'Snacks', '🍟'),
  mk('sn21', 'Frites', 4.50, 'Snacks', '🍟'),
  mk('sn22', 'Pastels Bacalhau', 1.50, 'Snacks', '🐟'),
  mk('sn23', 'Moelas', 7.50, 'Snacks', '🍽️'),
  mk('sn24', 'Chupa Chups', 2.00, 'Snacks', '🍭'),

  // ═══ DIVERS ═══
  mk('dv1', 'Briquet', 1.50, 'Divers', '🔥'),
]

export const makeTable = (id: string, name: string, shape: TableShape, seats: number, x: number, y: number, section: string): Table => ({
  id, name, shape, seats, x, y, status: 'available', covers: [], section, mergedWith: []
})

export const DEFAULT_TABLES: Table[] = [
  // ── Salle principale
  makeTable('t1',  'Table 1',    'round',  2, 155, 150, 'Salle'),
  makeTable('t2',  'Table 2',    'round',  4, 310, 150, 'Salle'),
  makeTable('t3',  'Table 3',    'round',  4, 465, 150, 'Salle'),
  makeTable('t4',  'Table 4',    'square', 4, 155, 320, 'Salle'),
  makeTable('t5',  'Table 5',    'square', 4, 310, 320, 'Salle'),
  makeTable('t6',  'Table 6',    'square', 4, 465, 320, 'Salle'),
  makeTable('t7',  'Table 7',    'rect',   6, 205, 490, 'Salle'),
  makeTable('t8',  'Table 8',    'rect',   8, 470, 490, 'Salle'),
  // ── Bar
  makeTable('bar', 'Bar',        'bar',    6, 840, 155, 'Bar'),
  // ── Terrasse
  makeTable('t9',  'Terrasse 1', 'round',  4, 790, 400, 'Terrasse'),
  makeTable('t10', 'Terrasse 2', 'round',  4, 930, 400, 'Terrasse'),
  makeTable('t11', 'Terrasse 3', 'round',  2, 860, 550, 'Terrasse'),
]

const DEFAULT_SETTINGS: POSSettings = {
  restaurantName: 'Café um Rond-Point',
  currency: '€',
  taxRate: 0,
  defaultTip: 0,
  tipPresets: [10, 15, 20],
}

const DEFAULT_STAFF: StaffMember[] = [
  { id: 's1', name: 'Admin', pin: '0000', role: 'OWNER', color: '#6366f1' },
  { id: 's2', name: 'Marie', pin: '1234', role: 'WAITER', color: '#ec4899' },
  { id: 's3', name: 'Lucas', pin: '5678', role: 'WAITER', color: '#10b981' },
  { id: 's4', name: 'Chef Paul', pin: '9999', role: 'KITCHEN', color: '#f59e0b' },
]

// ─── Store ───────────────────────────────────────────────────────────────────

interface POSStore {
  tables: Table[]
  menu: MenuItem[]
  settings: POSSettings
  staff: StaffMember[]
  currentStaff: StaffMember | null
  kioskMode: boolean
  /** Journal des ventes de la journée en cours, la plus récente en tête. */
  ventes: Vente[]
  /** Clôtures passées (tickets Z), la plus récente en tête. */
  clotures: Cloture[]

  // ── Table actions
  openTable: (tableId: string, coverCount: number) => void
  /** Renvoie false si la table a des consommations non réglées (sauf `forcer`). */
  closeTable: (tableId: string, options?: { forcer?: boolean }) => boolean
  setTableStatus: (tableId: string, status: TableStatus) => boolean
  moveTable: (tableId: string, x: number, y: number) => void
  addTable: (t: Omit<Table, 'covers' | 'mergedWith' | 'status'>) => void
  updateTable: (id: string, updates: Partial<Table>) => void
  removeTable: (id: string) => void

  // ── Cover actions
  addCover: (tableId: string, label?: string) => void
  removeCover: (tableId: string, coverId: string) => void
  renameCover: (tableId: string, coverId: string, label: string) => void

  // ── Order actions
  addItem: (tableId: string, coverId: string, item: MenuItem, note?: string) => void
  removeItem: (tableId: string, itemId: string) => void
  setItemQty: (tableId: string, itemId: string, qty: number) => void
  setItemNote: (tableId: string, itemId: string, note: string) => void
  moveItemToCover: (tableId: string, itemId: string, toCoverId: string) => void

  // ── Merge / split
  mergeTables: (fromId: string, intoId: string) => void
  unmergeTable: (tableId: string) => void

  // ── Transfer entire table (swap orders from A to B)
  transferTable: (fromId: string, toId: string) => void

  // ── Payment
  /** Règle la table entière, ou seulement `coverIds`. Inscrit la vente au journal. */
  processPayment: (tableId: string, method: PayMethod, tip: number, coverIds?: string[], options?: OptionsPaiement) => Vente | null
  /** Clôture la journée (ticket Z). Renvoie null s'il n'y a aucune vente. */
  cloturerJournee: () => Cloture | null

  // ── Menu actions
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void
  removeMenuItem: (id: string) => void
  toggleMenuItem: (id: string) => void

  // ── Settings
  updateSettings: (updates: Partial<POSSettings>) => void

  // ── Staff actions
  /** Échecs de PIN consécutifs. Remis à zéro par une connexion réussie. */
  echecsPin: number
  /** Horodatage (ms) jusqu'auquel toute saisie de PIN est refusée. 0 = libre. */
  pinBloqueJusqua: number
  loginStaff: (pin: string) => boolean
  logoutStaff: () => void
  addStaff: (s: Omit<StaffMember, 'id'>) => void
  removeStaff: (id: string) => void
  setKioskMode: (on: boolean) => void

  // ── Reset (for testing)
  resetData: () => void
}

/**
 * Migration du magasin persistant. Exportée pour être testée directement :
 * elle touche des données financières et mérite sa preuve.
 */
export function migrerEtatPersistant(etat: any, versionPrecedente: number): any {
    if (!etat) return etat
    // v0 → v1 : arrivée du journal des ventes et des clôtures. Les couverts
    // existants n'ont pas de marqueur de règlement : on les laisse impayés,
    // ce qui est le comportement sûr (on ne déclare pas payé ce qu'on
    // ignore) — au pire un serveur réencaisse une table déjà réglée, ce qui
    // se voit, alors qu'une table déclarée payée à tort ne se voit pas.
    if (versionPrecedente < 1) {
      etat.ventes = Array.isArray(etat.ventes) ? etat.ventes : []
      etat.clotures = Array.isArray(etat.clotures) ? etat.clotures : []
    }
    // v1 → v2 : remises, arrondi caritatif et ventilation par règlement.
    // Une vente ancienne n'a connu aucune remise (elles n'étaient pas
    // enregistrées) : brut = total - pourboire, remises vides, un seul
    // règlement sur sa méthode. On ne réécrit pas l'histoire, on la
    // complète avec ce qu'elle disait déjà.
    if (versionPrecedente < 2) {
      const completer = (v: any) => {
        if (!v || typeof v !== 'object') return v
        if (!Array.isArray(v.remises)) v.remises = []
        if (typeof v.arrondiCaritatif !== 'number') v.arrondiCaritatif = 0
        if (typeof v.brut !== 'number') v.brut = centimes((v.total ?? 0) - (v.pourboire ?? 0))
        if (!Array.isArray(v.reglements) || v.reglements.length === 0) {
          v.reglements = [{ methode: v.methode ?? 'card', montant: v.total ?? 0 }]
        }
        return v
      }
      etat.ventes = (etat.ventes ?? []).map(completer)
      etat.clotures = (etat.clotures ?? []).map((c: any) => {
        if (!c || typeof c !== 'object') return c
        if (typeof c.totalRemises !== 'number') c.totalRemises = 0
        if (typeof c.totalArrondisCaritatifs !== 'number') c.totalArrondisCaritatifs = 0
        c.ventes = (c.ventes ?? []).map(completer)
        return c
      })
    }
    return etat
  }

export const usePOS = create<POSStore>()(
  persist(
    (set, get) => ({
      tables: DEFAULT_TABLES,
      menu: DEFAULT_MENU,
      settings: DEFAULT_SETTINGS,
      staff: DEFAULT_STAFF,
      currentStaff: null,
      kioskMode: false,
      echecsPin: 0,
      pinBloqueJusqua: 0,
      ventes: [],
      clotures: [],

      // ── Table actions ─────────────────────────────────────────────────────

      openTable: (tableId, coverCount) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          status: 'occupied',
          openedAt: Date.now(),
          covers: Array.from({ length: coverCount }, (_, i) => ({
            id: uid(),
            label: `Couvert ${i + 1}`,
            items: [],
          })),
        })
      })),

      /**
       * Libère une table. Vide `covers`, donc EFFACE les commandes.
       *
       * Refuse par défaut si des consommations n'ont pas été réglées : c'est
       * exactement ce qui faisait disparaître du chiffre d'affaires en service.
       * `forcer: true` reste possible (table abandonnée, commande annulée),
       * mais devient un geste délibéré.
       *
       * @returns true si la table a bien été libérée.
       */
      closeTable: (tableId, options) => {
        const table = get().tables.find(t => t.id === tableId)
        if (!table) return false

        const impaye = table.covers.some(c => !c.paidAt && c.items.length > 0)
        if (impaye && !options?.forcer) return false

        set(s => ({
          tables: s.tables.map(t => t.id !== tableId ? t : {
            ...t,
            status: 'dirty',
            covers: [],
            openedAt: undefined,
            mergedWith: [],
          })
        }))
        return true
      },

      /**
       * Change le statut d'une table.
       *
       * Refuse « dirty » ou « available » sur une table qui a des
       * consommations non réglées : c'était le contournement de la
       * protection de closeTable — « Fermer la table » passait par ici, la
       * table repartait « à nettoyer » puis « libre », et la prochaine
       * ouverture écrasait les couverts impayés. Même règle que closeTable :
       * on ne fait pas disparaître du chiffre d'affaires par un changement
       * de statut.
       *
       * @returns false si le changement a été refusé.
       */
      setTableStatus: (tableId, status) => {
        const table = get().tables.find(t => t.id === tableId)
        if (!table) return false
        const impaye = table.covers.some(c => !c.paidAt && c.items.length > 0)
        if (impaye && (status === 'dirty' || status === 'available')) return false
        set(s => ({
          tables: s.tables.map(t => t.id !== tableId ? t : { ...t, status })
        }))
        return true
      },

      moveTable: (tableId, x, y) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : { ...t, x, y })
      })),

      addTable: (table) => set(s => ({
        tables: [...s.tables, { ...table, covers: [], mergedWith: [], status: 'available' }]
      })),

      updateTable: (id, updates) => set(s => ({
        tables: s.tables.map(t => t.id !== id ? t : { ...t, ...updates })
      })),

      removeTable: (id) => set(s => ({
        tables: s.tables.filter(t => t.id !== id)
      })),

      // ── Cover actions ─────────────────────────────────────────────────────

      addCover: (tableId, label) => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          const num = t.covers.length + 1
          return {
            ...t,
            covers: [...t.covers, {
              id: uid(),
              label: label ?? `Couvert ${num}`,
              items: [],
            }]
          }
        })
      })),

      removeCover: (tableId, coverId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.filter(c => c.id !== coverId)
        })
      })),

      renameCover: (tableId, coverId, label) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => c.id !== coverId ? c : { ...c, label })
        })
      })),

      // ── Order actions ─────────────────────────────────────────────────────

      addItem: (tableId, coverId, menuItem, note = '') => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          return {
            ...t,
            covers: t.covers.map(c => {
              if (c.id !== coverId) return c
              // Check if same item+note already exists → increment qty
              const existing = c.items.find(i => i.menuItemId === menuItem.id && i.note === note)
              if (existing) {
                return {
                  ...c,
                  items: c.items.map(i => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i)
                }
              }
              return {
                ...c,
                items: [...c.items, {
                  id: uid(),
                  menuItemId: menuItem.id,
                  name: menuItem.name,
                  price: menuItem.price,
                  qty: 1,
                  note,
                  coverId,
                }]
              }
            })
          }
        })
      })),

      removeItem: (tableId, itemId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: c.items.filter(i => i.id !== itemId)
          }))
        })
      })),

      setItemQty: (tableId, itemId, qty) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: qty <= 0
              ? c.items.filter(i => i.id !== itemId)
              : c.items.map(i => i.id !== itemId ? i : { ...i, qty })
          }))
        })
      })),

      setItemNote: (tableId, itemId, note) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          covers: t.covers.map(c => ({
            ...c,
            items: c.items.map(i => i.id !== itemId ? i : { ...i, note })
          }))
        })
      })),

      moveItemToCover: (tableId, itemId, toCoverId) => set(s => ({
        tables: s.tables.map(t => {
          if (t.id !== tableId) return t
          let moved: OrderItem | undefined
          const covers = t.covers.map(c => ({
            ...c,
            items: c.items.filter(i => {
              if (i.id === itemId) { moved = { ...i, coverId: toCoverId }; return false }
              return true
            })
          }))
          if (!moved) return t
          return {
            ...t,
            covers: covers.map(c => c.id !== toCoverId ? c : {
              ...c, items: [...c.items, moved!]
            })
          }
        })
      })),

      // ── Merge / split ─────────────────────────────────────────────────────

      mergeTables: (fromId, intoId) => set(s => {
        const from = s.tables.find(t => t.id === fromId)
        const into = s.tables.find(t => t.id === intoId)
        if (!from || !into) return s
        return {
          tables: s.tables.map(t => {
            if (t.id === intoId) return {
              ...t,
              covers: [...t.covers, ...from.covers],
              mergedWith: [...t.mergedWith, fromId],
            }
            if (t.id === fromId) return { ...t, status: 'available', covers: [], isMergedInto: intoId }
            return t
          })
        }
      }),

      unmergeTable: (tableId) => set(s => {
        const table = s.tables.find(t => t.id === tableId)
        if (!table) return s
        return {
          tables: s.tables.map(t => {
            if (t.id === tableId) return { ...t, mergedWith: [] }
            if (table.mergedWith.includes(t.id)) return { ...t, isMergedInto: undefined }
            return t
          })
        }
      }),

      // ── Transfer entire table ─────────────────────────────────────────────

      transferTable: (fromId, toId) => set(s => {
        if (fromId === toId) return s
        const from = s.tables.find(t => t.id === fromId)
        const to = s.tables.find(t => t.id === toId)
        if (!from || !to) return s
        return {
          tables: s.tables.map(t => {
            if (t.id === toId) return {
              ...t,
              status: 'occupied',
              openedAt: from.openedAt ?? Date.now(),
              covers: [...t.covers, ...from.covers],
            }
            if (t.id === fromId) return {
              ...t,
              status: 'dirty',
              covers: [],
              openedAt: undefined,
            }
            return t
          })
        }
      }),

      // ── Payment ──────────────────────────────────────────────────────────

      /**
       * Encaisse une table, ou seulement certains couverts.
       *
       * L'ancienne version ignorait `method`, `tip` ET `coverIds` : elle
       * appelait `closeTable`, qui vide `covers`. Régler la part d'une seule
       * personne effaçait donc la commande de toute la table — les autres
       * consommations disparaissaient sans être encaissées. C'est une perte de
       * chiffre d'affaires réelle, en plein service.
       *
       * Désormais : seuls les couverts visés passent en payé, ils GARDENT leurs
       * lignes, la vente est inscrite au journal, et la table ne se libère que
       * lorsque plus rien n'est dû.
       */
      processPayment: (tableId, method, tip, coverIds, options) => {
        const etat = get()
        const table = etat.tables.find(t => t.id === tableId)
        if (!table) return null

        // Sans sélection : on règle tout ce qui reste dû.
        const cibles = table.covers.filter(c =>
          !c.paidAt && (coverIds ? coverIds.includes(c.id) : true)
        )
        if (cibles.length === 0) return null

        const maintenant = Date.now()
        const lignes: LigneVente[] = cibles.flatMap(c =>
          c.items.map(i => ({ name: i.name, qty: i.qty, price: i.price }))
        )
        const brut = centimes(cibles.reduce((s, c) => s + totalCouvert(c), 0))

        // Les remises sont plafonnées au brut : une carte cadeau de 50 € sur
        // une addition de 30 € ne crée pas un « TTC négatif ». Le solde non
        // consommé n'est pas l'affaire de la vente.
        const remises = (options?.remises ?? [])
          .map(r => ({ ...r, montant: centimes(Math.max(0, r.montant)) }))
          .filter(r => r.montant > 0)
        const totalRemises = Math.min(brut, centimes(remises.reduce((s, r) => s + r.montant, 0)))
        const totalTTC = centimes(brut - totalRemises)

        // La TVA se calcule sur ce qui est réellement facturé, remises
        // déduites — c'est la base imposable, pas le prix affiché.
        const { ht, tva } = ventilationTva(totalTTC, etat.settings.taxRate)
        const pourboire = centimes(tip || 0)
        const arrondiCaritatif = centimes(Math.max(0, options?.arrondiCaritatif ?? 0))
        const total = centimes(totalTTC + pourboire + arrondiCaritatif)

        // Ventilation par méthode. Un règlement mixte incohérent (somme des
        // parts ≠ total) est REFUSÉ : mieux vaut un encaissement bloqué qu'un
        // ticket Z dont les colonnes ne s'additionnent pas.
        let reglements: Reglement[]
        if (options?.reglements && options.reglements.length > 0) {
          const parts = options.reglements
            .map(r => ({ methode: r.methode, montant: centimes(r.montant) }))
            .filter(r => r.montant > 0)
          const somme = centimes(parts.reduce((s, r) => s + r.montant, 0))
          if (Math.abs(somme - total) > 0.011) {
            throw new Error(
              `Règlement mixte incohérent : les parts font ${somme.toFixed(2)} € pour un total de ${total.toFixed(2)} €.`
            )
          }
          reglements = parts
        } else {
          reglements = [{ methode: method, montant: total }]
        }
        // Méthode principale = la plus grosse part (rétro-compat du journal).
        const principale = reglements.reduce((a, b) => (b.montant > a.montant ? b : a)).methode

        const derniere = etat.ventes[0]
        const vente: Vente = {
          id: uid(),
          numero: (derniere?.numero ?? 0) + 1,
          horodatage: maintenant,
          tableId,
          tableName: table.name,
          couverts: cibles.map(c => c.label),
          lignes,
          sousTotal: ht,
          tva,
          pourboire,
          brut,
          remises,
          arrondiCaritatif,
          total,
          reglements,
          methode: principale,
          vendeur: etat.currentStaff?.name || 'Inconnu',
        }

        const idsRegles = new Set(cibles.map(c => c.id))
        set(s => ({
          // La vente la plus récente en tête : le numéro suivant se lit en O(1).
          ventes: [vente, ...s.ventes],
          tables: s.tables.map(t => t.id !== tableId ? t : {
            ...t,
            covers: t.covers.map(c => idsRegles.has(c.id)
              ? { ...c, paidAt: maintenant, paidMethod: principale }
              : c),
          }),
        }))

        // Table entièrement réglée → elle peut être libérée sans rien perdre.
        const apres = get().tables.find(t => t.id === tableId)
        if (apres && apres.covers.every(c => c.paidAt || c.items.length === 0)) {
          get().closeTable(tableId)
        }
        return vente
      },

      /**
       * Enregistre la clôture de la journée et repart à zéro (ticket Z).
       * Renvoie null s'il n'y a rien à clôturer — on ne fabrique pas un
       * ticket Z vide qui laisserait croire qu'une journée a été arrêtée.
       */
      cloturerJournee: () => {
        const ventes = get().ventes
        if (ventes.length === 0) return null

        // Ventilation par les RÈGLEMENTS, pas par la méthode principale : un
        // paiement mixte 30 € espèces + 50 € carte tombe dans les deux
        // colonnes, pas entièrement dans « carte ». Les ventes antérieures à
        // ce champ (magasin migré) retombent sur leur méthode unique.
        const parMethode: Record<PayMethod, number> = { cash: 0, card: 0, contactless: 0 }
        for (const v of ventes) {
          const parts = v.reglements?.length ? v.reglements : [{ methode: v.methode, montant: v.total }]
          for (const p of parts) parMethode[p.methode] = centimes(parMethode[p.methode] + p.montant)
        }

        const cloture: Cloture = {
          id: uid(),
          horodatage: Date.now(),
          debut: ventes[ventes.length - 1].horodatage,
          nbVentes: ventes.length,
          // TTC = chiffre d'affaires facturé : ni pourboire ni arrondi
          // caritatif, qui sont encaissés mais ne sont pas du chiffre.
          totalTTC: centimes(ventes.reduce((s, v) => s + v.total - v.pourboire - (v.arrondiCaritatif ?? 0), 0)),
          totalHT: centimes(ventes.reduce((s, v) => s + v.sousTotal, 0)),
          totalTva: centimes(ventes.reduce((s, v) => s + v.tva, 0)),
          totalPourboires: centimes(ventes.reduce((s, v) => s + v.pourboire, 0)),
          totalRemises: centimes(ventes.reduce((s, v) => s + (v.remises ?? []).reduce((a, r) => a + r.montant, 0), 0)),
          totalArrondisCaritatifs: centimes(ventes.reduce((s, v) => s + (v.arrondiCaritatif ?? 0), 0)),
          parMethode,
          ventes,
        }

        // Les ventes partent dans la clôture, qui est conservée : on ne
        // supprime jamais une trace comptable, on la déplace.
        set(s => ({ ventes: [], clotures: [cloture, ...s.clotures] }))
        return cloture
      },

      // ── Menu actions ─────────────────────────────────────────────────────

      addMenuItem: (item) => set(s => ({
        menu: [...s.menu, { ...item, id: uid() }]
      })),

      updateMenuItem: (id, updates) => set(s => ({
        menu: s.menu.map(m => m.id !== id ? m : { ...m, ...updates })
      })),

      removeMenuItem: (id) => set(s => ({
        menu: s.menu.filter(m => m.id !== id)
      })),

      toggleMenuItem: (id) => set(s => ({
        menu: s.menu.map(m => m.id !== id ? m : { ...m, active: !m.active })
      })),

      // ── Settings ─────────────────────────────────────────────────────────

      updateSettings: (updates) => set(s => ({
        settings: { ...s.settings, ...updates }
      })),

      // ── Staff actions ──────────────────────────────────────────────────────

      /**
       * Vérifie un code PIN et ouvre la session.
       *
       * L'écran affichait « tentatives restantes » et descendait jusqu'à zéro
       * sans jamais rien bloquer : on pouvait essayer les 10 000 codes à quatre
       * chiffres, et le compteur repartait à trois au moindre rechargement de
       * page. Le blocage vit désormais dans le magasin persistant, donc il
       * survit à un rechargement, et il s'allonge à chaque série d'échecs.
       */
      loginStaff: (pin) => {
        const { pinBloqueJusqua, echecsPin, staff } = get()
        if (pinBloqueJusqua && Date.now() < pinBloqueJusqua) return false

        const found = staff.find(s => s.pin === pin)
        if (found) {
          set({ currentStaff: found, echecsPin: 0, pinBloqueJusqua: 0 })
          return true
        }

        const echecs = echecsPin + 1
        // 5 échecs → 1 minute ; 10 → 5 minutes ; 15 → 15 minutes.
        const paliers: Record<number, number> = { 5: 60_000, 10: 300_000, 15: 900_000 }
        const attente = paliers[echecs]
        set({
          echecsPin: echecs,
          pinBloqueJusqua: attente ? Date.now() + attente : get().pinBloqueJusqua,
        })
        return false
      },

      logoutStaff: () => set({ currentStaff: null }),

      addStaff: (s) => set(st => ({
        staff: [...st.staff, { ...s, id: uid() }]
      })),

      removeStaff: (id) => set(st => ({
        staff: st.staff.filter(s => s.id !== id)
      })),

      setKioskMode: (on) => set({ kioskMode: on }),

      resetData: () => set(() => ({
        tables: DEFAULT_TABLES,
        menu: DEFAULT_MENU,
        settings: DEFAULT_SETTINGS,
        staff: DEFAULT_STAFF,
        currentStaff: null,
        kioskMode: false,
        echecsPin: 0,
        pinBloqueJusqua: 0,
        // Les clôtures survivent : ce sont des pièces comptables, pas des
        // données de démonstration. Seul le journal en cours repart à zéro.
        ventes: [],
      })),
    }),
    {
      name: 'creorga-pos-v2',
      /**
       * Le magasin n'avait NI version NI migration : toute évolution de la
       * structure faisait repartir un poste déjà déployé sur des données
       * incohérentes (ou le faisait planter au premier accès à un champ
       * inexistant). Toute modification de forme doit désormais incrémenter ce
       * numéro et compléter `migrate`.
       */
      version: 2,
      migrate: migrerEtatPersistant,
    }
  )
)

// ─── Selectors ───────────────────────────────────────────────────────────────

export const tableTotal = (table: Table) =>
  table.covers.flatMap(c => c.items).reduce((s, i) => s + i.price * i.qty, 0)

export const coverTotal = (cover: Cover) =>
  cover.items.reduce((s, i) => s + i.price * i.qty, 0)

export const elapsed = (openedAt?: number) => {
  if (!openedAt) return ''
  const m = Math.floor((Date.now() - openedAt) / 60000)
  if (m < 60) return `${m}min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

export const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#10b981',
  occupied:  '#6366f1',
  reserved:  '#8b5cf6',
  dirty:     '#f43f5e',
}

export const STATUS_RGB: Record<TableStatus, string> = {
  available: '16,185,129',
  occupied:  '99,102,241',
  reserved:  '139,92,246',
  dirty:     '244,63,94',
}

export const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Libre',
  occupied:  'Occupée',
  reserved:  'Réservée',
  dirty:     'À nettoyer',
}

export const MENU_CATEGORIES = [
  'Boissons Chaudes',
  'Softs',
  'Bières',
  'Apéritifs',
  'Vins',
  'Bouteilles',
  'Cocktails',
  'Alcool',
  'Whisky',
  'Digestifs',
  'Snacks',
  'Divers',
]
