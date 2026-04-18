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

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    console.warn(`  ⚠ ${label} — ignoré : ${(e as Error).message.split('\n')[0]}`)
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

async function main() {
  console.log('\n🌱 Seed riche — Café um Rond-Point Rumelange')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

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
  let posY = 50
  for (const [i, t] of TABLES.entries()) {
    await safe(`Table ${t.name}`, () =>
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
    posY += 0
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
          loyaltyPoints: randInt(0, 500),
        } as any,
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
          status: 'PAID',
          total: Number(total.toFixed(2)),
          subtotal: Number((total / 1.17).toFixed(2)),
          tax: Number((total - total / 1.17).toFixed(2)),
          createdAt: date,
          paidAt: date,
          customerId: Math.random() < 0.4 ? pick(customerIds) : null,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              price: it.price,
              name: it.name,
            })),
          } as any,
        } as any,
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
          subtotal: Number((amount / 1.17).toFixed(2)),
          tax: Number((amount - amount / 1.17).toFixed(2)),
          issuedAt: daysAgo(randInt(0, 60)),
          dueAt: daysAgo(randInt(-30, 30)),
          clientName: `${pick(LUX_FIRST_NAMES)} ${pick(LUX_LAST_NAMES)}`,
          clientEmail: luxEmail('client', String(i)),
        } as any,
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
          status: pick(['DRAFT', 'SENT', 'ACCEPTED', 'ACCEPTED', 'DECLINED']),
          total: amount,
          subtotal: Number((amount / 1.17).toFixed(2)),
          tax: Number((amount - amount / 1.17).toFixed(2)),
          issuedAt: daysAgo(randInt(0, 45)),
          validUntil: daysFromNow(randInt(5, 30)),
          clientName: `Entreprise ${pick(['Arcelor', 'POST', 'Banque BIL', 'Goodyear', 'PwC', 'KPMG', 'Deloitte'])} ${pick(LUX_LAST_NAMES)}`,
          notes: pick(EVENT_TYPES),
        } as any,
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
          customerName: `${first} ${last}`,
          customerPhone: luxPhone(),
          customerEmail: luxEmail(first, last),
          partySize: randInt(2, 10),
          reservedAt: daysFromNow(randInt(1, 21), pick([12, 13, 19, 20, 21]), pick([0, 15, 30, 45])),
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
          startAt: start,
          endAt: end,
          role: pick(['Service', 'Cuisine', 'Bar', 'Caisse']),
        } as any,
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
          startAt: daysFromNow(randInt(10, 60)),
          endAt: daysFromNow(randInt(61, 75)),
          type: pick(['VACATION', 'SICK', 'PERSONAL']),
          status: pick(['PENDING', 'APPROVED', 'APPROVED']),
          reason: pick(['Vacances été', 'Mariage d\'un proche', 'Rendez-vous médical', 'Déménagement', 'Raisons personnelles']),
        } as any,
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
          location: pick(['Frigo cuisine', 'Frigo bar', 'Congélateur', 'Chambre froide', 'Zone préparation', 'Plan de travail']),
          value: randFloat(-20, 8),
          unit: '°C',
          recordedAt: daysAgo(randInt(0, 29), randInt(7, 22)),
          notes: Math.random() < 0.15 ? 'Action corrective : nettoyage complet' : null,
        } as any,
      })
    )
  }

  // SUPPLIERS (3)
  console.log('▸ Création de 3 fournisseurs')
  const SUPPLIERS = [
    { name: 'Metro Luxembourg', email: 'pro@metro.lu', phone: '+352 42 44 44', address: 'Route d\'Arlon, L-8009 Strassen' },
    { name: 'Brasserie Bofferding', email: 'commandes@bofferding.lu', phone: '+352 23 63 66 22', address: 'Bascharage' },
    { name: 'Cactus Marché', email: 'btoc@cactus.lu', phone: '+352 43 60 61', address: 'Howald' },
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

  // STOCK MOVEMENTS (20) — via purchaseOrder ou ingredient si dispo
  console.log('▸ Création de 20 mouvements de stock')
  for (let i = 0; i < 20; i++) {
    await safe(`PurchaseOrder ${i + 1}`, () =>
      prisma.purchaseOrder.create({
        data: {
          companyId: company.id,
          supplierId: supplierIds.length ? pick(supplierIds) : undefined,
          number: `CMD-${String(100 + i).padStart(4, '0')}`,
          status: pick(['RECEIVED', 'RECEIVED', 'ORDERED', 'DRAFT']),
          total: randFloat(150, 2500),
          orderedAt: daysAgo(randInt(1, 30)),
        } as any,
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
          comment: REVIEW_TEXTS[i],
          author: `${pick(LUX_FIRST_NAMES)} ${pick(LUX_LAST_NAMES).charAt(0)}.`,
          source: pick(['GOOGLE', 'TRIPADVISOR', 'FACEBOOK', 'INTERNAL']),
          createdAt: daysAgo(randInt(0, 90)),
        } as any,
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
          channel: pick(['EMAIL', 'SMS', 'PUSH']),
          status: pick(['DRAFT', 'SCHEDULED', 'SENT', 'SENT']),
          scheduledAt: daysFromNow(randInt(-30, 30)),
          audience: pick(['ALL', 'LOYAL', 'NEW', 'INACTIVE']),
        } as any,
      })
    )
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
