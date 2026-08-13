/**
 * Création (ou réinitialisation du mot de passe) du compte console créateur.
 *
 * Usage, depuis apps/backend :
 *
 *   npx tsx scripts/create-creator-account.ts
 *
 * L'email et le mot de passe sont saisis au clavier — jamais en argument
 * (l'historique du shell est un journal), jamais en dur (le dépôt est un
 * bundle public en puissance : vécu deux fois). Seule l'empreinte bcrypt est
 * stockée. Le TOTP s'enrôle ensuite depuis la console, au premier login.
 */
import readline from 'node:readline/promises'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const email = (await rl.question('Email du compte créateur : ')).trim().toLowerCase()
const password = await rl.question('Mot de passe (12 caractères minimum, saisie visible) : ')
rl.close()

if (!email.includes('@')) {
  console.error('Email invalide.')
  process.exit(1)
}
if (password.length < 12) {
  console.error('Mot de passe trop court : 12 caractères minimum.')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 12)
const compte = await prisma.creatorAccount.upsert({
  where: { email },
  update: { password: hash },
  create: { email, password: hash },
})

console.log(`Compte créateur prêt : ${compte.email}`)
console.log('Prochaine étape : se connecter à la console et enrôler le TOTP (Réglages).')
await prisma.$disconnect()
