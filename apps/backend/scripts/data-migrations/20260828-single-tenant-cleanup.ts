import prisma from '../../src/lib/prisma'
import { moduleRowsFor } from '../../src/lib/company-modules'

const APPLY_MARKER = 'DELETE_ALL_TENANT_DATA_EXCEPT_KEEPER'
const keepEmail = String(process.env.KEEP_USER_EMAIL || '').trim().toLowerCase()
const keepUserId = String(process.env.KEEP_USER_ID || '').trim()
const keepCompanyId = String(process.env.KEEP_COMPANY_ID || '').trim()
const apply = process.env.CONFIRM_SINGLE_TENANT_PURGE === APPLY_MARKER

const truncatedModels = [
  'CompanySettings', 'PortalConfiguration', 'UserCompany', 'RefreshToken',
  'Table', 'Category', 'Product', 'Order', 'OrderItem', 'CompanyModule',
  'Customer', 'LoyaltyTransaction', 'GiftCard', 'Invoice', 'InvoiceItem',
  'Quote', 'QuoteItem', 'Reservation', 'Ingredient', 'Recipe', 'Supplier',
  'PurchaseOrder', 'PurchaseOrderItem', 'Shift', 'TimePunch', 'LeaveRequest',
  'HaccpLog', 'HaccpTask', 'Campaign', 'DiscountCode', 'CashDrawer', 'Expense',
  'Review', 'EventQuote', 'EventQuoteItem', 'EmployeeProfile', 'EmployeeNote',
  'EmployeeDocument', 'ActivityEvent', 'LoginEvent', 'ErrorLog',
  'TenantMetricDaily', 'Opportunity',
] as const

function assertInputs() {
  if (!keepEmail || !keepUserId || !keepCompanyId) {
    throw new Error('KEEP_USER_EMAIL, KEEP_USER_ID et KEEP_COMPANY_ID sont obligatoires')
  }
}

async function countTable(model: string): Promise<number> {
  const delegate = (prisma as any)[model[0].toLowerCase() + model.slice(1)]
  return typeof delegate?.count === 'function' ? delegate.count() : 0
}

async function main() {
  assertInputs()
  const keeper = await prisma.user.findUnique({ where: { id: keepUserId } })
  const company = await prisma.company.findUnique({ where: { id: keepCompanyId } })
  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId: keepUserId, companyId: keepCompanyId } },
  })

  if (!keeper || keeper.email.toLowerCase() !== keepEmail) throw new Error('Le compte à conserver ne correspond pas à l’email et à l’identifiant attendus')
  if (!company) throw new Error('La société à conserver est introuvable')
  if (!membership || membership.role !== 'OWNER' || !membership.isActive) throw new Error('Le compte à conserver doit être propriétaire actif de la société')

  const counts = Object.fromEntries(await Promise.all(truncatedModels.map(async (model) => [model, await countTable(model)])))
  const summary = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    keeper: { userId: keeper.id, email: keeper.email, companyId: company.id, companyName: company.name },
    before: {
      users: await prisma.user.count(),
      companies: await prisma.company.count(),
      memberships: await prisma.userCompany.count(),
      tenantRowsToReset: counts,
    },
  }
  console.log(JSON.stringify(summary, null, 2))

  if (!apply) {
    console.log(`DRY_RUN_ONLY: relancer avec CONFIRM_SINGLE_TENANT_PURGE=${APPLY_MARKER}`)
    return
  }

  const quoted = truncatedModels.map((name) => `"${name}"`).join(', ')
  await prisma.$transaction(async (tx) => {
    // Liste entièrement codée en dur ci-dessus : aucune donnée utilisateur
    // n'entre dans cette requête. TRUNCATE est transactionnel dans PostgreSQL.
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
    await tx.company.deleteMany({ where: { id: { not: keepCompanyId } } })
    await tx.user.deleteMany({ where: { id: { not: keepUserId } } })

    await tx.companySettings.create({ data: { companyId: keepCompanyId } })
    await tx.userCompany.create({
      data: { userId: keepUserId, companyId: keepCompanyId, role: 'OWNER', isActive: true },
    })
    await tx.companyModule.createMany({ data: moduleRowsFor(keepCompanyId) })
    await tx.portalConfiguration.create({
      data: {
        companyId: keepCompanyId,
        toggles: { games: true, menu: true, callWaiter: true },
        // Un objet vide signifie « toute la sélection éditoriale active ».
        // Une clé générique `enabled` rendait au contraire chaque jeu invisible,
        // car le portail attend les identifiants réels (mensch, memory, etc.).
        games: {},
        welcomeMessage: 'Bienvenue dans notre établissement',
      },
    })
  }, { timeout: 120_000 })

  const verification = {
    users: await prisma.user.count(),
    companies: await prisma.company.count(),
    memberships: await prisma.userCompany.count(),
    modules: await prisma.companyModule.count({ where: { companyId: keepCompanyId } }),
    keeperMembership: await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: keepUserId, companyId: keepCompanyId } },
    }),
  }
  if (verification.users !== 1 || verification.companies !== 1 || verification.memberships !== 1 || verification.modules !== moduleRowsFor(keepCompanyId).length) {
    throw new Error(`Vérification finale invalide: ${JSON.stringify(verification)}`)
  }
  console.log(`PURGE_COMPLETE ${JSON.stringify(verification)}`)
}

main()
  .catch((error) => {
    console.error('PURGE_FAILED', error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
