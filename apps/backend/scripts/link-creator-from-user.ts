/**
 * Ouvre l'accès console à l'exploitant en reprenant le mot de passe qu'il a
 * déjà sur Creorga — sans que ce mot de passe transite nulle part.
 *
 * Usage, depuis apps/backend :
 *
 *   npx tsx scripts/link-creator-from-user.ts bryanl1994.bl@gmail.com
 *
 * Seule l'EMPREINTE bcrypt du compte utilisateur est recopiée dans
 * CreatorAccount : le mot de passe en clair n'est ni lu, ni saisi, ni
 * journalisé. Changer le mot de passe Creorga plus tard ne changera PAS
 * celui de la console (la copie est ponctuelle) : relancer ce script pour
 * les resynchroniser.
 *
 * ⚠ Compromis assumé : le même secret ouvre l'application cliente et la
 * console transversale. C'est le TOTP (Réglages → activer la double
 * authentification) qui rétablit la séparation — à enrôler dès la première
 * connexion.
 */
import prisma from '../src/lib/prisma'

const email = (process.argv[2] || '').trim().toLowerCase()
if (!email.includes('@')) {
  console.error('Usage : npx tsx scripts/link-creator-from-user.ts <email>')
  process.exit(1)
}

const utilisateur = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    password: true,
    firstName: true,
    lastName: true,
    companies: { select: { role: true, company: { select: { name: true } } } },
  },
})

if (!utilisateur) {
  console.error(`Aucun compte Creorga avec l'adresse ${email}.`)
  process.exit(1)
}

const compte = await prisma.creatorAccount.upsert({
  where: { email: utilisateur.email },
  update: { password: utilisateur.password },
  create: { email: utilisateur.email, password: utilisateur.password },
})

const roles = utilisateur.companies
  .map((c) => `${c.role} sur ${c.company.name}`)
  .join(', ')

console.log(`Accès console ouvert pour ${utilisateur.firstName} ${utilisateur.lastName} <${compte.email}>`)
console.log(`Compte Creorga source : ${roles || 'aucune société'}`)
console.log('Mot de passe : identique à celui de Creorga (empreinte recopiée, jamais lue en clair).')
console.log('À faire à la première connexion : Réglages → activer la double authentification (TOTP).')

await prisma.$disconnect()
