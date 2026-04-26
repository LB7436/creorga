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

  // ── Table actions
  openTable: (tableId: string, coverCount: number) => void
  closeTable: (tableId: string) => void
  setTableStatus: (tableId: string, status: TableStatus) => void
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
  processPayment: (tableId: string, method: PayMethod, tip: number, coverIds?: string[]) => void

  // ── Menu actions
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void
  removeMenuItem: (id: string) => void
  toggleMenuItem: (id: string) => void

  // ── Settings
  updateSettings: (updates: Partial<POSSettings>) => void

  // ── Staff actions
  loginStaff: (pin: string) => boolean
  logoutStaff: () => void
  addStaff: (s: Omit<StaffMember, 'id'>) => void
  removeStaff: (id: string) => void
  setKioskMode: (on: boolean) => void

  // ── Reset (for testing)
  resetData: () => void
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

      closeTable: (tableId) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : {
          ...t,
          status: 'dirty',
          covers: [],
          openedAt: undefined,
          mergedWith: [],
        })
      })),

      setTableStatus: (tableId, status) => set(s => ({
        tables: s.tables.map(t => t.id !== tableId ? t : { ...t, status })
      })),

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

      processPayment: (tableId, _method, _tip, _coverIds) => {
        // Mark paid → close table
        get().closeTable(tableId)
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

      loginStaff: (pin) => {
        const found = get().staff.find(s => s.pin === pin)
        if (found) { set({ currentStaff: found }); return true }
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
      })),
    }),
    { name: 'creorga-pos-v2' }
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
