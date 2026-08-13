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

async function lireEntrees(): Promise<[string, string]> {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const email = await rl.question('Email du compte créateur : ')
    const password = await rl.question('Mot de passe (12 caractères minimum, saisie visible) : ')
    rl.close()
    return [email, password]
  }
  // Entrée redirigée (automatisation, recette) : deux lignes attendues.
  const brut = await new Promise<string>((resolve) => {
    let acc = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (morceau) => {
      acc += morceau
    })
    process.stdin.on('end', () => resolve(acc))
  })
  const [email = '', password = ''] = brut.split(/\r?\n/)
  return [email, password]
}

const [emailBrut, password] = await lireEntrees()
const email = emailBrut.trim().toLowerCase()

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
