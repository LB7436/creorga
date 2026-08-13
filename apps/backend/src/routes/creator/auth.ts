import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { generateSecret, generateURI, verifySync } from 'otplib'
import prisma from '../../lib/prisma'
import logger from '../../lib/logger'
import { validate } from '../../middleware/validate'
import { creatorAuth, type CreatorRequest } from '../../middleware/creatorAuth'
import { isProduction } from '../../lib/security'
import {
  signerAccesCreator,
  signerAttenteTotp,
  verifierJetonCreator,
  chiffrerSecretTotp,
  dechiffrerSecretTotp,
} from '../../lib/creatorSecurity'
import { push as pushEvenement } from '../../lib/eventSink'

const router = Router()

const COOKIE = 'creator_refresh'
const DUREE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000
// path restreint : le cookie n'accompagne que les routes d'auth de la console,
// jamais le reste de l'API.
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'strict' as const,
  path: '/api/creator/auth',
  maxAge: DUREE_REFRESH_MS,
})

// ─── Verrouillage en mémoire : 5 échecs → 15 minutes ──────────────────
// Suffisant mono-instance ; le creatorAuthLimiter (5 req/15 min/IP) double
// la barrière côté réseau.
const echecs = new Map<string, { compte: number; bloqueJusqua: number }>()

function estVerrouille(cle: string): boolean {
  const e = echecs.get(cle)
  return !!e && e.bloqueJusqua > Date.now()
}

function noterEchec(cle: string): void {
  const e = echecs.get(cle) ?? { compte: 0, bloqueJusqua: 0 }
  e.compte++
  if (e.compte >= 5) {
    e.bloqueJusqua = Date.now() + 15 * 60 * 1000
    e.compte = 0
    logger.warn(`[creator] compte verrouillé 15 min après 5 échecs`)
  }
  echecs.set(cle, e)
}

function effacerEchecs(cle: string): void {
  echecs.delete(cle)
}

/** Réservé aux tests. */
export function _reinitialiserVerrousPourTests(): void {
  echecs.clear()
}

// ─── Session ──────────────────────────────────────────────────────────

async function ouvrirSession(req: CreatorRequest, res: Response, accountId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex')
  await prisma.creatorRefreshToken.create({
    data: {
      token,
      accountId,
      expiresAt: new Date(Date.now() + DUREE_REFRESH_MS),
      ip: req.ip ?? null,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200) || null,
    },
  })
  await prisma.creatorAccount.update({ where: { id: accountId }, data: { lastLoginAt: new Date() } })
  res.cookie(COOKIE, token, cookieOptions())
  return signerAccesCreator(accountId)
}

// ─── POST /api/creator/auth/login ─────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

router.post('/login', validate(loginSchema), async (req: CreatorRequest, res: Response) => {
  try {
    const email = String(req.body.email).trim().toLowerCase()
    if (estVerrouille(email)) {
      res.status(429).json({ message: 'Compte verrouillé 15 minutes après 5 échecs' })
      return
    }

    const compte = await prisma.creatorAccount.findUnique({ where: { email } })
    const valide = compte && (await bcrypt.compare(req.body.password, compte.password))
    if (!compte || !valide) {
      noterEchec(email)
      pushEvenement('loginEvent', { kind: 'CREATOR_LOGIN_FAILED' })
      res.status(401).json({ message: 'Email ou mot de passe incorrect' })
      return
    }
    effacerEchecs(email)

    if (compte.totpEnabled) {
      // Jeton intermédiaire : n'ouvre aucune route, ne pose aucun cookie.
      res.json({ totpRequis: true, pendingToken: signerAttenteTotp(compte.id) })
      return
    }

    // Fenêtre d'amorçage : tant que le TOTP n'est pas enrôlé, connexion par
    // mot de passe seul — la console impose l'enrôlement à l'arrivée.
    const accessToken = await ouvrirSession(req, res, compte.id)
    pushEvenement('loginEvent', { kind: 'CREATOR_LOGIN' })
    res.json({ totpRequis: false, totpAConfigurer: true, accessToken })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/login:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/auth/totp — 2e étape ───────────────────────────

const totpSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres requis'),
})

router.post('/totp', validate(totpSchema), async (req: CreatorRequest, res: Response) => {
  try {
    const payload = verifierJetonCreator(req.body.pendingToken)
    if (!payload || payload.typ !== 'creator-pending') {
      res.status(401).json({ message: 'Jeton intermédiaire invalide ou expiré' })
      return
    }

    const compte = await prisma.creatorAccount.findUnique({ where: { id: payload.accountId } })
    if (!compte?.totpSecret) {
      res.status(401).json({ message: 'TOTP non configuré' })
      return
    }
    if (estVerrouille(compte.email)) {
      res.status(429).json({ message: 'Compte verrouillé 15 minutes après 5 échecs' })
      return
    }

    const resultat = verifySync({ secret: dechiffrerSecretTotp(compte.totpSecret), token: req.body.code })
    if (!resultat.valid) {
      noterEchec(compte.email)
      pushEvenement('loginEvent', { kind: 'CREATOR_LOGIN_FAILED' })
      res.status(401).json({ message: 'Code incorrect' })
      return
    }
    effacerEchecs(compte.email)

    const accessToken = await ouvrirSession(req, res, compte.id)
    pushEvenement('loginEvent', { kind: 'CREATOR_LOGIN' })
    res.json({ accessToken })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/totp:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/auth/refresh ───────────────────────────────────

router.post('/refresh', async (req: CreatorRequest, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE]
    if (!token) {
      res.status(401).json({ message: 'Session absente' })
      return
    }

    const stocke = await prisma.creatorRefreshToken.findUnique({ where: { token } })
    if (!stocke) {
      res.status(401).json({ message: 'Session invalide' })
      return
    }

    if (stocke.revokedAt) {
      // Réutilisation d'un jeton déjà tourné = vol probable du cookie :
      // toutes les sessions de la console sont révoquées.
      await prisma.creatorRefreshToken.updateMany({
        where: { accountId: stocke.accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      logger.error('[creator] réutilisation d\'un refresh révoqué — toutes les sessions console révoquées')
      res.status(401).json({ message: 'Session révoquée' })
      return
    }

    if (stocke.expiresAt < new Date()) {
      res.status(401).json({ message: 'Session expirée' })
      return
    }

    // Rotation par révocation, jamais par suppression : l'historique de
    // connexion de la console est conservé.
    await prisma.creatorRefreshToken.update({
      where: { id: stocke.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    })

    const accessToken = await ouvrirSession(req, res, stocke.accountId)
    res.json({ accessToken })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/refresh:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/auth/logout ────────────────────────────────────

router.post('/logout', async (req: CreatorRequest, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE]
    if (token) {
      await prisma.creatorRefreshToken.updateMany({
        where: { token, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    res.clearCookie(COOKIE, { path: '/api/creator/auth' })
    res.json({ message: 'Déconnexion réussie' })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/logout:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/auth/me ─────────────────────────────────────────

router.get('/me', creatorAuth, async (req: CreatorRequest, res: Response) => {
  try {
    const compte = await prisma.creatorAccount.findUnique({
      where: { id: req.creator!.accountId },
      select: { email: true, totpEnabled: true, lastLoginAt: true, createdAt: true },
    })
    if (!compte) {
      res.status(401).json({ message: 'Compte introuvable' })
      return
    }
    res.json(compte)
  } catch (error) {
    logger.error('Erreur GET /creator/auth/me:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/auth/totp/setup — enrôlement ───────────────────

router.post('/totp/setup', creatorAuth, async (req: CreatorRequest, res: Response) => {
  try {
    const compte = await prisma.creatorAccount.findUnique({ where: { id: req.creator!.accountId } })
    if (!compte) {
      res.status(401).json({ message: 'Compte introuvable' })
      return
    }

    const secret = generateSecret()
    // totpEnabled reste false jusqu'à la confirmation par un premier code :
    // un secret jamais scanné ne doit pas verrouiller la console.
    await prisma.creatorAccount.update({
      where: { id: compte.id },
      data: { totpSecret: chiffrerSecretTotp(secret), totpEnabled: false },
    })

    res.json({
      secret,
      uri: generateURI({ secret, issuer: 'Creorga Console', label: compte.email }),
    })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/totp/setup:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/auth/totp/confirm ──────────────────────────────

const confirmSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres requis') })

router.post('/totp/confirm', creatorAuth, validate(confirmSchema), async (req: CreatorRequest, res: Response) => {
  try {
    const compte = await prisma.creatorAccount.findUnique({ where: { id: req.creator!.accountId } })
    if (!compte?.totpSecret) {
      res.status(400).json({ message: 'Aucun enrôlement en cours' })
      return
    }

    const resultat = verifySync({ secret: dechiffrerSecretTotp(compte.totpSecret), token: req.body.code })
    if (!resultat.valid) {
      res.status(400).json({ message: 'Code incorrect — rescannez le QR et réessayez' })
      return
    }

    await prisma.creatorAccount.update({ where: { id: compte.id }, data: { totpEnabled: true } })
    res.json({ totpEnabled: true })
  } catch (error) {
    logger.error('Erreur POST /creator/auth/totp/confirm:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
