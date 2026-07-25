/**
 * Seed riche — Creorga
 *
 * Objectif : générer un jeu de données « démo » réaliste pour le
 * Café um Rond-Point Rumelange (Luxembourg). Chaque bloc est encapsulé
 * dans un try/catch pour rester tolérant face aux évolutions du schéma.
 *
 * Lancer : pnpm --filter @creorga/backend db:seed:rich
 *          (ou npm run db:seed:rich depuis apps/backend)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
/**
 * TVA luxembourgeoise — taux normal 17 % (le plus bas de l'UE).
 * Taux réduits : 14 % (intermédiaire), 8 % (réduit), 3 % (super-réduit,
 * applicable à la restauration hors boissons alcoolisées).
 *
 * Convention du code : Product.taxRate et OrderItem.taxRate stockent un
 * POURCENTAGE (17), pas une fraction — cf. routes/orders.ts qui calcule
 * `lineTotal * (product.taxRate / 100)`.
 */
const LUX_VAT_STANDARD_PCT = 17
const LUX_VAT_STANDARD = LUX_VAT_STANDARD_PCT / 100
function randFloat(min: number, max: number, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals))
}
function daysAgo(n: number, hour = 12, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}
function daysFromNow(n: number, hour = 19, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Échecs rencontrés pendant le seed — le script sort en erreur s'il y en a. */
const seedFailures: string[] = []

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    // Les erreurs Prisma commencent par un saut de ligne puis un extrait de
    // code : prendre la 1re ligne brute affichait un message vide. On isole la
    // cause réelle (Unknown argument / Argument manquant / contrainte).
    const raw = String((e as Error).message).replace(/\s+/g, ' ').trim()
    const cause = raw.match(/(Unknown argument[^.]*\.|Argument `[^`]+` is missing\.|Invalid value[^.]*\.|Unique constraint failed[^.]*\.|Foreign key constraint[^.]*\.)/)
    const msg = (cause?.[1] ?? raw).slice(0, 200)
    console.warn(`  ⚠ ${label} — ignoré : ${msg}`)
    seedFailures.push(`${label}: ${msg}`)
    return null
  }
}

// ─── Données de référence ─────────────────────────────────────────────────

const LUX_FIRST_NAMES = [
  'Jean-Claude', 'Marie', 'Léon', 'Sophie', 'Tom', 'Charlotte', 'Nico', 'Lara',
  'Pit', 'Anouk', 'Jos', 'Mila', 'Guy', 'Liz', 'Romain', 'Julie', 'Max', 'Elise',
  'Luc', 'Chantal', 'Paulo', 'Inês', 'Mehdi', 'Sarah', 'Frank', 'Nora', 'Claude',
  'Émile', 'Gilles', 'Viviane', 'André', 'Monique', 'Patrick', 'Nathalie',
  'Michel', 'Isabelle', 'Fernand', 'Annick', 'Henri', 'Martine', 'Daniel',
  'Christine', 'Raoul', 'Carine', 'Gilbert', 'Yvette', 'Marc', 'Laurence',
  'Serge', 'Francine',
]

const LUX_LAST_NAMES = [
  'Weber', 'Schmit', 'Müller', 'Kremer', 'Schumacher', 'Thill', 'Reuter',
  'Weiler', 'Hoffmann', 'Klein', 'Wagner', 'Faber', 'Lentz', 'Becker',
  'Bettendorf', 'Wiltgen', 'Conter', 'Peiffer', 'Da Silva', 'Ferreira',
  'Rodrigues', 'Santos', 'Gonçalves', 'Pereira',
]

function luxPhone() {
  return `+352 6${randInt(21, 91)} ${randInt(100, 999)} ${randInt(100, 999)}`
}
function luxEmail(first: string, last: string) {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  return `${clean(first)}.${clean(last)}@${pick(['pt.lu', 'gmail.com', 'outlook.lu', 'hotmail.com', 'yahoo.fr'])}`
}

// ─── Produits du café ─────────────────────────────────────────────────────

const MENU = {
  'Cafés & Boissons chaudes': {
    icon: '☕',
    items: [
      ['Espresso', 2.5], ['Espresso allongé', 2.7], ['Doppio', 3.5],
      ['Café crème', 3.2], ['Café au lait', 3.5], ['Cappuccino', 3.8],
      ['Latte macchiato', 4.2], ['Flat white', 4.5], ['Mocha', 4.8],
      ['Chocolat chaud', 4.0], ['Chocolat viennois', 4.5],
      ['Thé noir Earl Grey', 3.5], ['Thé vert Sencha', 3.5],
      ['Thé menthe', 3.5], ['Thé rooibos', 3.5], ['Infusion verveine', 3.5],
      ['Chai latte', 4.5], ['Matcha latte', 5.0], ['Golden latte', 5.2],
    ],
  },
  'Boissons fraîches': {
    icon: '🥤',
    items: [
      ['Coca-Cola 33cl', 3.5], ['Coca Zero 33cl', 3.5], ['Fanta 33cl', 3.5],
      ['Sprite 33cl', 3.5], ['Schweppes Tonic', 3.8], ['Orangina', 3.8],
      ['Ice tea pêche', 3.8], ['Limonade maison', 4.5],
      ['Jus d\'orange pressé', 5.5], ['Jus de pomme bio', 4.2],
      ['Smoothie mangue-passion', 6.5], ['Smoothie fruits rouges', 6.5],
      ['Eau plate 50cl', 2.5], ['Eau pétillante 50cl', 2.5],
      ['Rosport 25cl', 2.8], ['San Pellegrino', 3.5],
    ],
  },
  'Bières & Vins': {
    icon: '🍺',
    items: [
      ['Bofferding pression 25cl', 3.5], ['Bofferding pression 50cl', 5.5],
      ['Diekirch pression 25cl', 3.5], ['Diekirch pression 50cl', 5.5],
      ['Battin Blonde', 4.5], ['Simon Pils', 4.2],
      ['Leffe Blonde', 5.0], ['Leffe Brune', 5.0], ['Hoegaarden', 4.8],
      ['Corona', 5.5], ['Heineken', 4.5],
      ['Verre de vin blanc Moselle', 5.5], ['Verre de vin rouge Bordeaux', 6.0],
      ['Verre de vin rosé Provence', 5.5], ['Crémant Poll-Fabaire', 7.5],
      ['Bouteille Riesling', 28], ['Bouteille Pinot Gris', 32],
      ['Bouteille Bordeaux', 35], ['Bouteille Crémant', 38],
    ],
  },
  'Petits-déjeuners & Brunchs': {
    icon: '🥐',
    items: [
      ['Croissant au beurre', 2.2], ['Pain au chocolat', 2.5],
      ['Chausson aux pommes', 2.8], ['Brioche', 2.5],
      ['Petit-déjeuner continental', 12.5], ['Petit-déjeuner anglais', 16.5],
      ['Brunch du dimanche', 24.5], ['Brunch végétarien', 22.5],
      ['Œufs brouillés saumon', 14.5], ['Œufs bénédictine', 13.5],
      ['Avocado toast', 11.5], ['Pancakes sirop d\'érable', 9.5],
      ['Bowl açaï', 10.5], ['Granola maison yaourt', 8.5],
      ['Tartine beurre confiture', 4.5], ['Tartine Nutella', 5.5],
    ],
  },
  'Plats & Salades': {
    icon: '🍽️',
    items: [
      ['Salade César poulet', 16.5], ['Salade de chèvre chaud', 15.5],
      ['Salade niçoise', 15.5], ['Salade quinoa-feta', 14.5],
      ['Burger maison frites', 18.5], ['Burger végétarien', 17.5],
      ['Cheeseburger bacon', 19.5], ['Club sandwich', 14.5],
      ['Croque-monsieur', 12.5], ['Croque-madame', 13.5],
      ['Quiche lorraine salade', 13.5], ['Tarte du jour', 12.5],
      ['Pasta carbonara', 16.5], ['Pasta bolognaise', 15.5],
      ['Risotto champignons', 17.5], ['Wrap poulet avocat', 13.5],
      ['Buddha bowl', 15.5], ['Gueuleton luxembourgeois', 22.5],
      ['Judd mat Gaardebounen', 19.5], ['Bouneschlupp', 9.5],
    ],
  },
  'Desserts & Pâtisseries': {
    icon: '🍰',
    items: [
      ['Tiramisu maison', 7.5], ['Tarte au citron meringuée', 6.5],
      ['Fondant au chocolat', 7.5], ['Crème brûlée', 7.0],
      ['Cheesecake fruits rouges', 7.5], ['Éclair café', 5.5],
      ['Éclair chocolat', 5.5], ['Paris-Brest', 6.5],
      ['Mille-feuille vanille', 6.5], ['Opéra', 6.5],
      ['Macaron (unité)', 2.5], ['Cookie géant', 4.5],
      ['Mousse au chocolat', 6.5], ['Panna cotta fruits rouges', 6.5],
      ['Salade de fruits frais', 7.5], ['Coupe glacée 3 boules', 8.5],
      ['Affogato', 6.5], ['Dame blanche', 8.5],
    ],
  },
  'Snacks & Apéro': {
    icon: '🥨',
    items: [
      ['Planche charcuterie', 16.5], ['Planche fromages', 15.5],
      ['Planche mixte 2 pers.', 24.5], ['Olives marinées', 5.5],
      ['Chips maison', 4.5], ['Nuts maison', 4.5],
      ['Bretzels', 4.5], ['Tapenade maison pain', 6.5],
      ['Houmous crudités', 7.5], ['Guacamole nachos', 8.5],
      ['Bruschetta tomate', 8.5], ['Bruschetta chèvre miel', 9.5],
      ['Nachos gratinés', 11.5], ['Mozza sticks', 8.5],
    ],
  },
  'Cocktails & Spiritueux': {
    icon: '🍸',
    items: [
      ['Mojito', 10.5], ['Caïpirinha', 10.5], ['Spritz Aperol', 9.5],
      ['Gin tonic Hendrick\'s', 12.5], ['Gin tonic Bombay', 11.5],
      ['Moscow Mule', 11.5], ['Margarita', 10.5],
      ['Piña colada', 10.5], ['Cosmopolitan', 11.5],
      ['Whisky Sour', 11.5], ['Espresso Martini', 12.5],
      ['Vodka Absolut', 7.5], ['Rhum Havana 7', 8.5],
      ['Whisky Jameson', 8.5], ['Whisky Lagavulin 16', 14.5],
      ['Cognac Hennessy VS', 9.5], ['Armagnac', 9.5],
      ['Amaretto', 6.5], ['Limoncello maison', 6.5],
    ],
  },
}

const TABLES = [
  { name: 'Table 1', section: 'Salle', capacity: 2 },
  { name: 'Table 2', section: 'Salle', capacity: 2 },
  { name: 'Table 3', section: 'Salle', capacity: 4 },
  { name: 'Table 4', section: 'Salle', capacity: 4 },
  { name: 'Table 5', section: 'Salle', capacity: 6 },
  { name: 'Table 6', section: 'Salle', capacity: 8 },
  { name: 'Bar 1', section: 'Bar', capacity: 2 },
  { name: 'Bar 2', section: 'Bar', capacity: 2 },
  { name: 'Bar 3', section: 'Bar', capacity: 4 },
  { name: 'Terrasse 1', section: 'Terrasse', capacity: 4 },
  { name: 'Terrasse 2', section: 'Terrasse', capacity: 4 },
  { name: 'Terrasse 3', section: 'Terrasse', capacity: 6 },
]

const USERS = [
  { firstName: 'Bryan', lastName: 'Lopes', email: 'bryan@cafe-rondpoint.lu', role: 'OWNER' },
  { firstName: 'Sophie', lastName: 'Weber', email: 'sophie.weber@cafe-rondpoint.lu', role: 'MANAGER' },
  { firstName: 'Tom', lastName: 'Schmit', email: 'tom.schmit@cafe-rondpoint.lu', role: 'STAFF' },
  { firstName: 'Charlotte', lastName: 'Müller', email: 'charlotte@cafe-rondpoint.lu', role: 'STAFF' },
  { firstName: 'Nico', lastName: 'Kremer', email: 'nico@cafe-rondpoint.lu', role: 'STAFF' },
  { firstName: 'Lara', lastName: 'Hoffmann', email: 'lara@cafe-rondpoint.lu', role: 'STAFF' },
  { firstName: 'Jean-Claude', lastName: 'Reuter', email: 'jc.reuter@cafe-rondpoint.lu', role: 'ACCOUNTANT' },
  { firstName: 'Anouk', lastName: 'Thill', email: 'anouk@cafe-rondpoint.lu', role: 'STAFF' },
]

// ─── Main ─────────────────────────────────────────────────────────────────

const SEED_COMPANY_ID = 'seed-rich-company'

/**
 * Purge les données de la société de démo avant de re-seeder.
 * Sans ça, chaque exécution empilait un jeu de données supplémentaire
 * (produits, clients, commandes en double à chaque `db:seed:rich`).
 * Ordre imposé par les clés étrangères : enfants avant parents.
 */
async function purgeSeedCompany() {
  const where = { companyId: SEED_COMPANY_ID }
  const scoped = { company: { id: SEED_COMPANY_ID } }

  await prisma.orderItem.deleteMany({ where: { order: scoped } })
  await prisma.invoiceItem.deleteMany({ where: { invoice: scoped } })
  await prisma.quoteItem.deleteMany({ where: { quote: scoped } })
  await prisma.eventQuoteItem.deleteMany({ where: { eventQuote: scoped } })
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: scoped } })
  await prisma.recipe.deleteMany({ where: { product: scoped } })
  await prisma.loyaltyTransaction.deleteMany({ where: { customer: scoped } })

  await prisma.order.deleteMany({ where })
  await prisma.invoice.deleteMany({ where })
  await prisma.quote.deleteMany({ where })
  await prisma.eventQuote.deleteMany({ where })
  await prisma.purchaseOrder.deleteMany({ where })
  await prisma.review.deleteMany({ where })
  await prisma.reservation.deleteMany({ where })
  await prisma.shift.deleteMany({ where })
  await prisma.timePunch.deleteMany({ where })
  await prisma.leaveRequest.deleteMany({ where })
  await prisma.haccpLog.deleteMany({ where })
  await prisma.haccpTask.deleteMany({ where })
  await prisma.campaign.deleteMany({ where })
  await prisma.discountCode.deleteMany({ where })
  await prisma.cashDrawer.deleteMany({ where })
  await prisma.expense.deleteMany({ where })
  await prisma.giftCard.deleteMany({ where })
  await prisma.ingredient.deleteMany({ where })
  await prisma.supplier.deleteMany({ where })
  await prisma.customer.deleteMany({ where })
  await prisma.product.deleteMany({ where })
  await prisma.category.deleteMany({ where })
  await prisma.table.deleteMany({ where })
}

async function main() {
  console.log('\n🌱 Seed riche — Café um Rond-Point Rumelange')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('▸ Purge des données de démo existantes')
  await purgeSeedCompany()

  // COMPANY
  console.log('▸ Création de la société')
  const company = await prisma.company.upsert({
    where: { id: 'seed-rich-company' } as any,
    update: {},
    create: {
      id: 'seed-rich-company',
      name: 'Café um Rond-Point',
      legalName: 'Café um Rond-Point S.à r.l.',
      vatNumber: 'LU28194765',
      address: '12 rue de la Gare, L-3724 Rumelange, Luxembourg',
      phone: '+352 56 12 34',
      email: 'contact@cafe-rondpoint.lu',
      currency: 'EUR',
      timezone: 'Europe/Luxembourg',
    } as any,
  }).catch(async () => {
    return prisma.company.create({
      data: {
        name: 'Café um Rond-Point',
        legalName: 'Café um Rond-Point S.à r.l.',
        vatNumber: 'LU28194765',
        address: '12 rue de la Gare, L-3724 Rumelange, Luxembourg',
        phone: '+352 56 12 34',
        email: 'contact@cafe-rondpoint.lu',
        currency: 'EUR',
        timezone: 'Europe/Luxembourg',
      } as any,
    })
  })

  await safe('Paramètres société', () =>
    prisma.companySettings.upsert({
      where: { companyId: company.id },
      update: {},
      create: {
        companyId: company.id,
        posMode: 'restaurant',
        taxRate1: 3, taxRate2: 8, taxRate3: 14, taxRate4: 17,
        defaultTaxRate: 17,
        receiptFooter: 'Merci de votre visite — à très bientôt au Rond-Point !',
      } as any,
    })
  )

  // USERS
  console.log('▸ Création de 8 utilisateurs')
  const password = await bcrypt.hash('Demo1234!', 10)
  const createdUsers: any[] = []
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password,
        firstName: u.firstName,
        lastName: u.lastName,
      } as any,
    })
    createdUsers.push({ ...user, role: u.role })
    await safe(`Lien user ${u.email}`, () =>
      prisma.userCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId: company.id } } as any,
        update: { role: u.role as any },
        create: { userId: user.id, companyId: company.id, role: u.role as any },
      })
    )
  }

  // TABLES
  console.log('▸ Création de 12 tables')
  const createdTables: any[] = []
  for (const [i, t] of TABLES.entries()) {
    const created = await safe(`Table ${t.name}`, () =>
      prisma.table.create({
        data: {
          companyId: company.id,
          name: t.name,
          section: t.section,
          capacity: t.capacity,
          posX: 50 + (i % 4) * 150,
          posY: 50 + Math.floor(i / 4) * 150,
        } as any,
      })
    )
    if (created) createdTables.push(created)
  }

  // CATEGORIES + PRODUCTS
  console.log('▸ Création de 8 catégories et 200+ produits')
  const productIds: string[] = []
  const allProducts: any[] = []
  let catOrder = 0
  for (const [catName, catData] of Object.entries(MENU)) {
    const cat = await safe(`Cat ${catName}`, () =>
      prisma.category.create({
        data: {
          companyId: company.id,
          name: catName,
          icon: catData.icon,
          color: pick(['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316']),
          sortOrder: catOrder++,
        } as any,
      })
    )
    if (!cat) continue
    for (const [name, price] of catData.items) {
      const p = await safe(`Produit ${name}`, () =>
        prisma.product.create({
          data: {
            companyId: company.id,
            categoryId: (cat as any).id,
            name: name as string,
            price: price as number,
            taxRate: 17,
            isActive: true,
          } as any,
        })
      )
      if (p) {
        productIds.push((p as any).id)
        allProducts.push(p)
      }
    }
  }

  // CUSTOMERS
  console.log('▸ Création de 50 clients luxembourgeois')
  const customerIds: string[] = []
  for (let i = 0; i < 50; i++) {
    const first = pick(LUX_FIRST_NAMES)
    const last = pick(LUX_LAST_NAMES)
    const c = await safe(`Client ${first} ${last}`, () =>
      prisma.customer.create({
        data: {
          companyId: company.id,
          firstName: first,
          lastName: last,
          email: luxEmail(first, last),
          phone: luxPhone(),
          // Schéma : `points` (pas loyaltyPoints), + solde portefeuille.
          points: randInt(0, 500),
          walletBalance: i % 5 === 0 ? randInt(5, 80) : 0,
        },
      })
    )
    if (c) customerIds.push((c as any).id)
  }

  // ORDERS (100 sur 30 jours, avec patterns)
  console.log('▸ Création de 100 commandes (patterns brunch/lunch/rush)')
  for (let i = 0; i < 100; i++) {
    const dayOffset = randInt(0, 29)
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)
    const dow = date.getDay() // 0=dim, 5=ven, 6=sam

    // Patterns : Dim=brunch 10h-14h, Ven=rush 19h-23h, semaine=lunch 12h-14h
    let hour: number
    if (dow === 0) hour = randInt(10, 14)
    else if (dow === 5 || dow === 6) hour = Math.random() < 0.6 ? randInt(19, 23) : randInt(12, 14)
    else hour = Math.random() < 0.5 ? randInt(12, 14) : randInt(8, 22)
    date.setHours(hour, randInt(0, 59), 0, 0)

    const itemCount = randInt(1, 5)
    const items = []
    let total = 0
    for (let j = 0; j < itemCount; j++) {
      const p = pick(allProducts)
      if (!p) continue
      const qty = randInt(1, 3)
      items.push({ productId: p.id, quantity: qty, price: p.price, name: p.name })
      total += p.price * qty
    }

    await safe(`Order ${i + 1}`, () =>
      prisma.order.create({
        data: {
          companyId: company.id,
          // Schéma : orderNumber et userId obligatoires, taxAmount (pas tax).
          orderNumber: i + 1,
          userId: pick(createdUsers).id,
          tableId: Math.random() < 0.8 ? pick(createdTables)?.id ?? null : null,
          status: 'PAID',
          total: Number(total.toFixed(2)),
          subtotal: Number((total / (1 + LUX_VAT_STANDARD)).toFixed(2)),
          taxAmount: Number((total - total / (1 + LUX_VAT_STANDARD)).toFixed(2)),
          paymentMethod: pick(['CARD', 'CASH', 'CARD', 'MOBILE']),
          createdAt: date,
          paidAt: date,
          customerId: customerIds.length && Math.random() < 0.4 ? pick(customerIds) : null,
          items: {
            // OrderItem : unitPrice + taxRate (pas price/name).
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.price,
              taxRate: LUX_VAT_STANDARD_PCT,
              status: 'SERVED',
            })),
          },
        },
      })
    )
  }

  // INVOICES (20)
  console.log('▸ Création de 20 factures')
  for (let i = 0; i < 20; i++) {
    const amount = randFloat(80, 1200)
    await safe(`Invoice ${i + 1}`, () =>
      prisma.invoice.create({
        data: {
          companyId: company.id,
          number: `FAC-2026-${String(1000 + i).padStart(4, '0')}`,
          status: pick(['PAID', 'PAID', 'PAID', 'SENT', 'DRAFT']),
          total: amount,
          // Schéma : taxAmount (pas tax), dueDate (pas dueAt), pas de champ
          // issuedAt/clientName/clientEmail — le client passe par customerId.
          subtotal: Number((amount / (1 + LUX_VAT_STANDARD)).toFixed(2)),
          taxAmount: Number((amount - amount / (1 + LUX_VAT_STANDARD)).toFixed(2)),
          customerId: customerIds.length ? pick(customerIds) : null,
          dueDate: daysFromNow(randInt(-30, 30)),
          createdAt: daysAgo(randInt(0, 60)),
        },
      })
    )
  }

  // QUOTES (15 devis événements)
  console.log('▸ Création de 15 devis événements')
  const EVENT_TYPES = [
    'Anniversaire 40 ans', 'Mariage civil', 'Baptême', 'Communion',
    'Séminaire entreprise', 'Afterwork équipe', 'Soirée étudiante',
    'Repas de famille', 'Pot de départ', 'Fête de noël entreprise',
  ]
  for (let i = 0; i < 15; i++) {
    const amount = randFloat(450, 5800)
    await safe(`Quote ${i + 1}`, () =>
      prisma.quote.create({
        data: {
          companyId: company.id,
          number: `DEV-2026-${String(500 + i).padStart(4, '0')}`,
          // Schéma Quote : total, validUntil, notes, customerId — pas de
          // subtotal/tax/issuedAt/clientName. Statut REJECTED (pas DECLINED).
          status: pick(['DRAFT', 'SENT', 'ACCEPTED', 'ACCEPTED', 'REJECTED']),
          total: amount,
          customerId: customerIds.length ? pick(customerIds) : null,
          validUntil: daysFromNow(randInt(5, 30)),
          createdAt: daysAgo(randInt(0, 45)),
          notes: `${pick(EVENT_TYPES)} — Entreprise ${pick(['Arcelor', 'POST', 'Banque BIL', 'Goodyear', 'PwC', 'KPMG', 'Deloitte'])}`,
        },
      })
    )
  }

  // RESERVATIONS (10 à venir)
  console.log('▸ Création de 10 réservations à venir')
  for (let i = 0; i < 10; i++) {
    const first = pick(LUX_FIRST_NAMES)
    const last = pick(LUX_LAST_NAMES)
    await safe(`Reservation ${i + 1}`, () =>
      prisma.reservation.create({
        data: {
          companyId: company.id,
          // Schéma : guestName/guestPhone/guestEmail et `date` (pas
          // customerName/customerPhone/customerEmail/reservedAt).
          guestName: `${first} ${last}`,
          guestPhone: luxPhone(),
          guestEmail: luxEmail(first, last),
          partySize: randInt(2, 10),
          date: daysFromNow(randInt(1, 21), pick([12, 13, 19, 20, 21]), pick([0, 15, 30, 45])),
          status: 'CONFIRMED',
          notes: Math.random() < 0.3 ? pick(['Anniversaire', 'Allergie gluten', 'Table terrasse svp', 'Végétarien']) : null,
        } as any,
      })
    )
  }

  // SHIFTS (30)
  console.log('▸ Création de 30 shifts personnel')
  for (let i = 0; i < 30; i++) {
    const user = pick(createdUsers)
    const date = daysAgo(randInt(-14, 14), 0, 0)
    const startH = pick([7, 11, 15, 18])
    const start = new Date(date); start.setHours(startH, 0, 0, 0)
    const end = new Date(start); end.setHours(startH + 8, 0, 0, 0)
    await safe(`Shift ${i + 1}`, () =>
      prisma.shift.create({
        data: {
          companyId: company.id,
          userId: user.id,
          // Schéma : startTime/endTime (pas startAt/endAt).
          startTime: start,
          endTime: end,
          breakMinutes: pick([0, 30, 30, 45]),
          status: 'PLANNED',
          role: pick(['Service', 'Cuisine', 'Bar', 'Caisse']),
        },
      })
    )
  }

  // LEAVE REQUESTS (5)
  console.log('▸ Création de 5 demandes de congés')
  for (let i = 0; i < 5; i++) {
    const user = pick(createdUsers)
    await safe(`Leave ${i + 1}`, () =>
      prisma.leaveRequest.create({
        data: {
          companyId: company.id,
          userId: user.id,
          // Schéma : startDate/endDate (pas startAt/endAt), notes (pas reason).
          startDate: daysFromNow(randInt(10, 60)),
          endDate: daysFromNow(randInt(61, 75)),
          type: pick(['VACATION', 'SICK', 'PERSONAL']),
          status: pick(['PENDING', 'APPROVED', 'APPROVED']),
          notes: pick(['Vacances été', 'Mariage d\'un proche', 'Rendez-vous médical', 'Déménagement', 'Raisons personnelles']),
        },
      })
    )
  }

  // HACCP LOGS (20)
  console.log('▸ Création de 20 relevés HACCP')
  for (let i = 0; i < 20; i++) {
    await safe(`HACCP ${i + 1}`, () =>
      prisma.haccpLog.create({
        data: {
          companyId: company.id,
          type: pick(['TEMPERATURE', 'CLEANING', 'RECEPTION', 'COOLING']),
          value: randFloat(-20, 8),
          // Schéma : loggedAt/loggedBy/isCompliant — pas de location ni unit,
          // l'emplacement est porté par les notes.
          loggedAt: daysAgo(randInt(0, 29), randInt(7, 22)),
          loggedBy: pick(createdUsers).id,
          isCompliant: Math.random() > 0.15,
          notes: `${pick(['Frigo cuisine', 'Frigo bar', 'Congélateur', 'Chambre froide', 'Zone préparation', 'Plan de travail'])} (°C)`
            + (Math.random() < 0.15 ? ' — action corrective : nettoyage complet' : ''),
        },
      })
    )
  }

  // SUPPLIERS (3)
  console.log('▸ Création de 3 fournisseurs')
  // Le modèle Supplier n'a pas de champ `address` : l'adresse va dans `notes`,
  // et `contactName` porte l'interlocuteur commercial.
  const SUPPLIERS = [
    { name: 'Metro Luxembourg', email: 'pro@metro.lu', phone: '+352 42 44 44', contactName: 'Service pro', notes: 'Route d\'Arlon, L-8009 Strassen' },
    { name: 'Brasserie Bofferding', email: 'commandes@bofferding.lu', phone: '+352 23 63 66 22', contactName: 'Commandes', notes: 'Bascharage' },
    { name: 'Cactus Marché', email: 'btoc@cactus.lu', phone: '+352 43 60 61', contactName: 'B2B', notes: 'Howald' },
  ]
  const supplierIds: string[] = []
  for (const s of SUPPLIERS) {
    const sp = await safe(`Supplier ${s.name}`, () =>
      prisma.supplier.create({
        data: { companyId: company.id, ...s } as any,
      })
    )
    if (sp) supplierIds.push((sp as any).id)
  }

  // INGREDIENTS (24) — le module Inventaire s'appuie dessus (stock, seuils,
  // alertes de réappro). Aucun n'était créé : la page Stock restait vide.
  console.log('▸ Création de 24 ingrédients')
  const INGREDIENTS: [string, string, number, number, number][] = [
    // nom, unité, coût/unité, stock actuel, seuil mini
    ['Café en grains Arabica', 'kg', 18.5, 12, 5],
    ['Lait entier', 'L', 1.15, 48, 20],
    ['Farine T55', 'kg', 0.95, 25, 10],
    ['Beurre doux', 'kg', 8.4, 9, 4],
    ['Œufs plein air', 'pièce', 0.32, 180, 60],
    ['Pommes de terre', 'kg', 1.1, 60, 25],
    ['Entrecôte de bœuf', 'kg', 27.9, 14, 6],
    ['Filet de saumon', 'kg', 24.5, 7, 3],
    ['Poulet fermier', 'kg', 11.2, 18, 8],
    ['Jambon de Parme', 'kg', 32.0, 3, 2],
    ['Mozzarella di bufala', 'kg', 14.8, 6, 3],
    ['Gruyère râpé', 'kg', 12.3, 8, 4],
    ['Tomates grappe', 'kg', 3.4, 22, 10],
    ['Salade mêlée', 'kg', 6.2, 5, 3],
    ['Oignons', 'kg', 1.35, 30, 12],
    ['Ail', 'kg', 5.8, 4, 2],
    ['Huile d\'olive extra vierge', 'L', 9.6, 15, 6],
    ['Vin blanc Riesling Moselle', 'bouteille', 8.9, 36, 12],
    ['Vin rouge Pinot Noir', 'bouteille', 11.4, 42, 12],
    ['Bière Bofferding fût', 'L', 2.65, 100, 40],
    ['Eau plate Rosport', 'bouteille', 0.55, 120, 48],
    ['Sucre semoule', 'kg', 1.05, 18, 8],
    ['Chocolat noir 70%', 'kg', 13.7, 6, 3],
    ['Crème fraîche épaisse', 'L', 3.9, 14, 6],
  ]
  for (const [name, unit, cost, stock, minLevel] of INGREDIENTS) {
    await safe(`Ingredient ${name}`, () =>
      prisma.ingredient.create({
        data: {
          companyId: company.id,
          name,
          unit,
          costPerUnit: cost,
          // ~1 sur 6 sous le seuil : de quoi peupler les alertes de réappro.
          currentStock: Math.random() < 0.17 ? Number((minLevel * 0.6).toFixed(2)) : stock,
          minStockLevel: minLevel,
          supplierId: supplierIds.length ? pick(supplierIds) : null,
        },
      })
    )
  }

  // STOCK MOVEMENTS (20) — via purchaseOrder ou ingredient si dispo
  console.log('▸ Création de 20 mouvements de stock')
  for (let i = 0; i < 20; i++) {
    await safe(`PurchaseOrder ${i + 1}`, () =>
      prisma.purchaseOrder.create({
        data: {
          companyId: company.id,
          supplierId: pick(supplierIds),
          // Schéma : ni `number` ni `orderedAt` — la référence va dans notes,
          // la date de commande est createdAt.
          status: pick(['RECEIVED', 'RECEIVED', 'ORDERED', 'DRAFT']),
          total: randFloat(150, 2500),
          notes: `CMD-${String(100 + i).padStart(4, '0')}`,
          createdAt: daysAgo(randInt(1, 30)),
        },
      })
    )
  }

  // REVIEWS (15)
  console.log('▸ Création de 15 avis clients')
  const REVIEW_TEXTS = [
    'Excellent brunch le dimanche, ambiance chaleureuse !',
    'Café correct mais service un peu lent en terrasse.',
    'La meilleure tarte au citron de Rumelange.',
    'Très bon rapport qualité-prix, je reviendrai.',
    'Déçu par la soupe, trop salée.',
    'Équipe super sympa, personnel aux petits soins.',
    'Idéal pour déjeuner entre collègues.',
    'La terrasse est magnifique l\'été.',
    'Carte des vins très bien choisie.',
    'Cocktails créatifs et bien dosés.',
    'Un peu bruyant le vendredi soir mais animé.',
    'Plats généreux, portions copieuses.',
    'WiFi stable, parfait pour télétravailler.',
    'Gueuleton luxembourgeois au top !',
    'Service impeccable, merci à Sophie !',
  ]
  for (let i = 0; i < 15; i++) {
    await safe(`Review ${i + 1}`, () =>
      prisma.review.create({
        data: {
          companyId: company.id,
          rating: randInt(3, 5),
          // Le modèle Review n'a pas de champ `author` : le nom du client est
          // porté par la relation customer, la signature reste dans le texte.
          comment: `${REVIEW_TEXTS[i]} — ${pick(LUX_FIRST_NAMES)} ${pick(LUX_LAST_NAMES).charAt(0)}.`,
          platform: pick(['GOOGLE', 'TRIPADVISOR', 'FACEBOOK', 'INTERNAL']),
          replied: i % 3 === 0,
          replyText: i % 3 === 0 ? 'Merci beaucoup pour votre retour, à très bientôt !' : null,
          createdAt: daysAgo(randInt(0, 90)),
        },
      })
    )
  }

  // CAMPAIGNS (10)
  console.log('▸ Création de 10 campagnes marketing')
  const CAMPAIGNS = [
    'Brunch du dimanche — 20% offerts',
    'Happy hour 17h-19h',
    'Menu de la Saint-Valentin',
    'Nouveauté : Menu végétarien',
    'Fête des Mères — offre spéciale',
    'Terrasse d\'été ouverte',
    'Soirée quiz jeudi 19h',
    'Semaine du Luxembourg',
    'Black Friday — bons cadeaux -15%',
    'Menu Fête Nationale 23 juin',
  ]
  for (let i = 0; i < CAMPAIGNS.length; i++) {
    await safe(`Campaign ${i + 1}`, () =>
      prisma.campaign.create({
        data: {
          companyId: company.id,
          name: CAMPAIGNS[i],
          // Schéma : type (pas channel), scheduledFor (pas scheduledAt),
          // content obligatoire, audience limitée à ALL|LOYAL|INACTIVE|BIRTHDAY.
          type: pick(['EMAIL', 'SMS', 'PUSH']),
          audience: pick(['ALL', 'LOYAL', 'INACTIVE', 'BIRTHDAY']),
          subject: CAMPAIGNS[i],
          content: `${CAMPAIGNS[i]} — Rendez-vous au Café um Rond-Point, 12 Rond-Point, L-3730 Rumelange. Réservation au +352 26 12 34 56.`,
          status: pick(['DRAFT', 'SCHEDULED', 'SENT', 'SENT']),
          scheduledFor: daysFromNow(randInt(-30, 30)),
        },
      })
    )
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (seedFailures.length > 0) {
    // Un seed partiellement échoué annonçait « ✅ terminé » : les données
    // manquantes ne se voyaient qu'à l'usage, dans l'app.
    console.error(`❌ Seed incomplet — ${seedFailures.length} création(s) en échec :`)
    // Regroupé par cause : 200 lignes identiques n'apprennent rien de plus.
    const byCause = new Map<string, number>()
    for (const f of seedFailures) {
      const cause = f.slice(f.indexOf(': ') + 2)
      byCause.set(cause, (byCause.get(cause) ?? 0) + 1)
    }
    for (const [cause, count] of [...byCause].sort((a, b) => b[1] - a[1])) {
      console.error(`   • ${count}× ${cause}`)
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exitCode = 1
    return
  }
  console.log('✅ Seed riche terminé')
  console.log('   Login : bryan@cafe-rondpoint.lu / Demo1234!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
