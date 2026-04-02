import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { validate } from '../middleware/validate'
import { authenticate, type AuthRequest } from '../middleware/auth'
import logger from '../lib/logger'

const router = Router()

// ─── Schemas ───────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  companyName: z.string().min(1, 'Nom de la société requis'),
})

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

// ─── Helpers ───────────────────────────────────────────

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  )
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

function getRefreshExpiry(): Date {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '30', 10)
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + (isNaN(days) ? 30 : days))
  return expiry
}

// ─── POST /api/auth/register ───────────────────────────

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ message: 'Un compte avec cet email existe déjà' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
    })

    const company = await prisma.company.create({
      data: { name: companyName },
    })

    await prisma.companySettings.create({
      data: { companyId: company.id },
    })

    await prisma.userCompany.create({
      data: { userId: user.id, companyId: company.id, role: 'OWNER' },
    })

    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken()

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiry(),
      },
    })

    const companies = await prisma.userCompany.findMany({
      where: { userId: user.id },
      include: { company: true },
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    logger.info(`Nouvel utilisateur inscrit: ${email}`)

    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar },
      companies,
    })
  } catch (error) {
    logger.error('Erreur inscription:', error)
    res.status(500).json({ message: 'Erreur lors de l\'inscription' })
  }
})

// ─── POST /api/auth/login ──────────────────────────────

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ message: 'Email ou mot de passe incorrect' })
      return
    }

    const accessToken = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken()

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiry(),
      },
    })

    const companies = await prisma.userCompany.findMany({
      where: { userId: user.id, isActive: true },
      include: { company: true },
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    logger.info(`Connexion: ${email}`)

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar },
      companies,
    })
  } catch (error) {
    logger.error('Erreur login:', error)
    res.status(500).json({ message: 'Erreur lors de la connexion' })
  }
})

// ─── POST /api/auth/refresh ────────────────────────────

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      res.status(401).json({ message: 'Refresh token manquant' })
      return
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      res.status(401).json({ message: 'Refresh token invalide ou expiré' })
      return
    }

    // Rotation du refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const newRefreshToken = generateRefreshToken()
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.userId,
        expiresAt: getRefreshExpiry(),
      },
    })

    const accessToken = generateAccessToken(stored.user.id, stored.user.email)

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json({ accessToken })
  } catch (error) {
    logger.error('Erreur refresh:', error)
    res.status(500).json({ message: 'Erreur lors du refresh' })
  }
})

// ─── POST /api/auth/logout ─────────────────────────────

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } })
    }

    res.clearCookie('refreshToken', { path: '/' })
    res.json({ message: 'Déconnexion réussie' })
  } catch (error) {
    logger.error('Erreur logout:', error)
    res.status(500).json({ message: 'Erreur lors de la déconnexion' })
  }
})

// ─── GET /api/auth/me ──────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, firstName: true, lastName: true, avatar: true },
    })

    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' })
      return
    }

    const companies = await prisma.userCompany.findMany({
      where: { userId: user.id, isActive: true },
      include: { company: true },
    })

    res.json({ user, companies })
  } catch (error) {
    logger.error('Erreur /me:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
