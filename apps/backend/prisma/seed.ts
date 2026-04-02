import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding de la base de données Creorga...')

  // Créer l'utilisateur admin
  const hashedPassword = await bcrypt.hash('Admin1234!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@creorga.local' },
    update: {},
    create: {
      email: 'admin@creorga.local',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Creorga',
    },
  })

  // Créer la société
  const company = await prisma.company.create({
    data: {
      name: 'Ma Société',
      legalName: 'Ma Société S.à r.l.',
      vatNumber: 'LU12345678',
      address: '1, rue du Commerce, L-1234 Luxembourg',
      email: 'contact@masociete.lu',
      currency: 'EUR',
      timezone: 'Europe/Luxembourg',
    },
  })

  // Créer les paramètres société
  await prisma.companySettings.create({
    data: {
      companyId: company.id,
      posMode: 'restaurant',
      taxRate1: 3,
      taxRate2: 8,
      taxRate3: 14,
      taxRate4: 17,
      defaultTaxRate: 17,
      receiptFooter: 'Merci de votre visite !',
    },
  })

  // Lier admin à la société
  await prisma.userCompany.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      role: 'OWNER',
    },
  })

  // Créer les tables
  const tables = [
    { name: 'Table 1', section: 'Salle', capacity: 4, posX: 50, posY: 50 },
    { name: 'Table 2', section: 'Salle', capacity: 4, posX: 200, posY: 50 },
    { name: 'Table 3', section: 'Salle', capacity: 6, posX: 350, posY: 50 },
    { name: 'Table 4', section: 'Salle', capacity: 2, posX: 50, posY: 200 },
    { name: 'Table 5', section: 'Salle', capacity: 8, posX: 200, posY: 200, width: 180, height: 120 },
    { name: 'Terrasse 1', section: 'Terrasse', capacity: 4, posX: 50, posY: 400 },
    { name: 'Terrasse 2', section: 'Terrasse', capacity: 4, posX: 200, posY: 400 },
    { name: 'Bar 1', section: 'Bar', capacity: 2, posX: 50, posY: 550 },
    { name: 'Bar 2', section: 'Bar', capacity: 2, posX: 200, posY: 550 },
  ]

  for (const table of tables) {
    await prisma.table.create({
      data: { companyId: company.id, ...table },
    })
  }

  // Créer les catégories
  const categories = [
    { name: 'Entrées', icon: '🥗', color: '#10B981', sortOrder: 0 },
    { name: 'Plats', icon: '🍽️', color: '#3B82F6', sortOrder: 1 },
    { name: 'Desserts', icon: '🍰', color: '#F59E0B', sortOrder: 2 },
    { name: 'Boissons', icon: '🍷', color: '#8B5CF6', sortOrder: 3 },
    { name: 'Boissons chaudes', icon: '☕', color: '#D97706', sortOrder: 4 },
  ]

  const createdCategories: Record<string, string> = {}
  for (const cat of categories) {
    const created = await prisma.category.create({
      data: { companyId: company.id, ...cat },
    })
    createdCategories[cat.name] = created.id
  }

  // Créer les produits
  const products = [
    // Entrées (TVA 3% alimentaire LU)
    { categoryId: createdCategories['Entrées'], name: 'Salade César', price: 9.50, taxRate: 3 },
    { categoryId: createdCategories['Entrées'], name: 'Soupe du jour', price: 7.00, taxRate: 3 },
    { categoryId: createdCategories['Entrées'], name: 'Bruschetta', price: 8.50, taxRate: 3 },

    // Plats
    { categoryId: createdCategories['Plats'], name: 'Steak frites', price: 22.00, taxRate: 3 },
    { categoryId: createdCategories['Plats'], name: 'Saumon grillé', price: 19.50, taxRate: 3 },
    { categoryId: createdCategories['Plats'], name: 'Pâtes carbonara', price: 14.50, taxRate: 3 },
    { categoryId: createdCategories['Plats'], name: 'Burger maison', price: 16.00, taxRate: 3 },
    { categoryId: createdCategories['Plats'], name: 'Poulet rôti', price: 17.50, taxRate: 3 },

    // Desserts
    { categoryId: createdCategories['Desserts'], name: 'Crème brûlée', price: 8.00, taxRate: 3 },
    { categoryId: createdCategories['Desserts'], name: 'Tarte Tatin', price: 7.50, taxRate: 3 },
    { categoryId: createdCategories['Desserts'], name: 'Mousse au chocolat', price: 7.00, taxRate: 3 },

    // Boissons (TVA 17% LU)
    { categoryId: createdCategories['Boissons'], name: 'Eau plate 50cl', price: 3.50, taxRate: 17 },
    { categoryId: createdCategories['Boissons'], name: 'Eau gazeuse 50cl', price: 3.50, taxRate: 17 },
    { categoryId: createdCategories['Boissons'], name: 'Coca-Cola', price: 3.80, taxRate: 17 },
    { categoryId: createdCategories['Boissons'], name: 'Verre de vin rouge', price: 5.50, taxRate: 17 },
    { categoryId: createdCategories['Boissons'], name: 'Verre de vin blanc', price: 5.50, taxRate: 17 },
    { categoryId: createdCategories['Boissons'], name: 'Bière pression 33cl', price: 4.50, taxRate: 17 },

    // Boissons chaudes
    { categoryId: createdCategories['Boissons chaudes'], name: 'Espresso', price: 2.50, taxRate: 17 },
    { categoryId: createdCategories['Boissons chaudes'], name: 'Cappuccino', price: 3.80, taxRate: 17 },
    { categoryId: createdCategories['Boissons chaudes'], name: 'Thé', price: 3.00, taxRate: 17 },
  ]

  for (let i = 0; i < products.length; i++) {
    await prisma.product.create({
      data: {
        companyId: company.id,
        sortOrder: i,
        ...products[i],
      },
    })
  }

  console.log('Seed terminé !')
  console.log(`  - Utilisateur admin : admin@creorga.local / Admin1234!`)
  console.log(`  - Société : ${company.name} (${company.id})`)
  console.log(`  - ${tables.length} tables créées`)
  console.log(`  - ${categories.length} catégories créées`)
  console.log(`  - ${products.length} produits créés`)
}

main()
  .catch((e) => {
    console.error('Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
