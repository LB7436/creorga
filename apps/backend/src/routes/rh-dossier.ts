import { Router, type Response } from 'express'
import express from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

/**
 * Dossier employé — fiche RH complète, notes internes et documents.
 *
 * Complète `routes/hr.ts` (plannings, pointages, congés), qui ne connaît rien
 * de l'employé lui-même : ni poste, ni contrat, ni salaire, ni document.
 *
 * ─── Cloisonnement ──────────────────────────────────────────────────────
 * Toutes les routes passent par `authenticate` puis `requireCompany`, et
 * chaque requête vérifie en plus que l'employé visé appartient bien à la
 * société de l'appelant. Un identifiant d'une autre société renvoie 404, pas
 * 403 : ne pas confirmer l'existence d'une fiche qu'on n'a pas le droit de
 * voir.
 *
 * ─── Données personnelles ───────────────────────────────────────────────
 * Salaire, numéro de sécurité sociale, IBAN et fiches de paie relèvent du
 * RGPD. Aucune route publique, aucun jeton dans une URL : les documents
 * transitent par une route authentifiée qui relit le cloisonnement à chaque
 * téléchargement.
 *
 * Les fichiers vivent dans `data/rh-documents/`, donc DANS le périmètre
 * sauvegardé toutes les 6 h — à la différence des vidéos publicitaires, ce
 * sont des pièces légales à conserver, et elles pèsent quelques centaines de
 * kilo-octets.
 */

const DOSSIER_FICHIERS = path.resolve(process.cwd(), 'data', 'rh-documents')

/** 25 Mo : un contrat ou une fiche de paie numérisée tient largement dedans. */
const TAILLE_MAX = 25 * 1024 * 1024

const TYPES_ACCEPTES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const TYPES_DOCUMENT = ['CONTRAT', 'FICHE_PAIE', 'DIPLOME', 'AUTRE']
const STATUTS = ['ACTIF', 'INACTIF', 'CONGE', 'SORTI']

const router = Router()

/** Champ date facultatif : chaîne vide et valeur absente valent « non renseigné ». */
function dateOuNull(valeur: unknown): Date | null {
  if (typeof valeur !== 'string' || !valeur.trim()) return null
  const d = new Date(valeur)
  return Number.isNaN(d.getTime()) ? null : d
}

function nombreOuNull(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const n = Number(valeur)
  return Number.isFinite(n) ? n : null
}

function texteOuNull(valeur: unknown, max = 400): string | null {
  if (typeof valeur !== 'string') return null
  const t = valeur.trim()
  return t ? t.slice(0, max) : null
}

/**
 * Retrouve l'adhésion visée en vérifiant qu'elle appartient à la société de
 * l'appelant. Renvoie null si elle n'existe pas OU si elle est ailleurs.
 */
async function adhesionDeLaSociete(userCompanyId: string, companyId: string) {
  return prisma.userCompany.findFirst({
    where: { id: userCompanyId, companyId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      profile: true,
    },
  })
}

// ─── Liste des employés ─────────────────────────────────────────────────

router.get('/employes', async (req: any, res: Response) => {
  try {
    const adhesions = await prisma.userCompany.findMany({
      where: { companyId: req.companyId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
        profile: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({
      employes: adhesions.map((a) => ({
        id: a.id,
        userId: a.userId,
        role: a.role,
        isActive: a.isActive,
        prenom: a.user.firstName,
        nom: a.user.lastName,
        email: a.user.email,
        avatar: a.user.avatar,
        profil: a.profile,
      })),
    })
  } catch (error) {
    logger.error('Erreur GET /hr-dossier/employes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── Dossier complet d'un employé ───────────────────────────────────────

router.get('/employes/:id', async (req: any, res: Response) => {
  try {
    const adhesion = await adhesionDeLaSociete(req.params.id, req.companyId)
    if (!adhesion) {
      res.status(404).json({ message: 'Employé introuvable' })
      return
    }

    const [notes, documents, shifts, conges] = await Promise.all([
      adhesion.profile
        ? prisma.employeeNote.findMany({
            where: { profileId: adhesion.profile.id },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      adhesion.profile
        ? prisma.employeeDocument.findMany({
            where: { profileId: adhesion.profile.id },
            orderBy: { createdAt: 'desc' },
            // `fichier` est le nom sur disque : il ne sort jamais de l'API.
            select: { id: true, type: true, nom: true, mime: true, taille: true, periode: true, createdAt: true },
          })
        : [],
      prisma.shift.count({ where: { userId: adhesion.userId, companyId: req.companyId } }),
      prisma.leaveRequest.findMany({
        where: { userId: adhesion.userId, companyId: req.companyId },
        orderBy: { startDate: 'desc' },
        take: 20,
      }),
    ])

    res.json({
      employe: {
        id: adhesion.id,
        userId: adhesion.userId,
        role: adhesion.role,
        isActive: adhesion.isActive,
        prenom: adhesion.user.firstName,
        nom: adhesion.user.lastName,
        email: adhesion.user.email,
        avatar: adhesion.user.avatar,
      },
      profil: adhesion.profile,
      notes,
      documents,
      shifts,
      conges,
    })
  } catch (error) {
    logger.error('Erreur GET /hr-dossier/employes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── Fiche RH ───────────────────────────────────────────────────────────

router.put('/employes/:id', async (req: any, res: Response) => {
  try {
    const adhesion = await adhesionDeLaSociete(req.params.id, req.companyId)
    if (!adhesion) {
      res.status(404).json({ message: 'Employé introuvable' })
      return
    }

    const b = req.body || {}
    const statut = STATUTS.includes(b.statut) ? b.statut : 'ACTIF'

    const donnees = {
      poste: texteOuNull(b.poste, 120),
      contrat: texteOuNull(b.contrat, 60),
      heuresHebdo: nombreOuNull(b.heuresHebdo),
      salaireBrut: nombreOuNull(b.salaireBrut),
      dateEmbauche: dateOuNull(b.dateEmbauche),
      dateFinContrat: dateOuNull(b.dateFinContrat),
      dateNaissance: dateOuNull(b.dateNaissance),
      adresse: texteOuNull(b.adresse, 300),
      telephone: texteOuNull(b.telephone, 40),
      numSecu: texteOuNull(b.numSecu, 40),
      iban: texteOuNull(b.iban, 40),
      statut,
      competences: texteOuNull(b.competences, 2000),
    }

    const profil = await prisma.employeeProfile.upsert({
      where: { userCompanyId: adhesion.id },
      create: { userCompanyId: adhesion.id, ...donnees },
      update: donnees,
    })

    res.json(profil)
  } catch (error) {
    logger.error('Erreur PUT /hr-dossier/employes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── Notes internes ─────────────────────────────────────────────────────

/** Crée la fiche si elle n'existe pas encore : on ne perd pas la première note. */
async function profilOuCreation(userCompanyId: string) {
  const existant = await prisma.employeeProfile.findUnique({ where: { userCompanyId } })
  if (existant) return existant
  return prisma.employeeProfile.create({ data: { userCompanyId } })
}

router.post('/employes/:id/notes', async (req: any, res: Response) => {
  try {
    const adhesion = await adhesionDeLaSociete(req.params.id, req.companyId)
    if (!adhesion) {
      res.status(404).json({ message: 'Employé introuvable' })
      return
    }

    const texte = texteOuNull(req.body?.texte, 4000)
    if (!texte) {
      res.status(400).json({ message: 'La note ne peut pas être vide' })
      return
    }

    const profil = await profilOuCreation(adhesion.id)
    const note = await prisma.employeeNote.create({
      data: { profileId: profil.id, texte, auteurId: req.user?.userId || null },
    })
    res.status(201).json(note)
  } catch (error) {
    logger.error('Erreur POST /hr-dossier/employes/:id/notes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/notes/:noteId', async (req: any, res: Response) => {
  try {
    const note = await prisma.employeeNote.findFirst({
      where: { id: req.params.noteId, profile: { userCompany: { companyId: req.companyId } } },
    })
    if (!note) {
      res.status(404).json({ message: 'Note introuvable' })
      return
    }
    await prisma.employeeNote.delete({ where: { id: note.id } })
    res.json({ ok: true })
  } catch (error) {
    logger.error('Erreur DELETE /hr-dossier/notes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── Documents (contrats, fiches de paie, diplômes) ─────────────────────

router.post(
  '/employes/:id/documents',
  express.raw({ type: '*/*', limit: TAILLE_MAX }),
  async (req: any, res: Response) => {
    try {
      const adhesion = await adhesionDeLaSociete(req.params.id, req.companyId)
      if (!adhesion) {
        res.status(404).json({ message: 'Employé introuvable' })
        return
      }

      const mime = String(req.headers['content-type'] || '').split(';')[0].trim()
      const extension = TYPES_ACCEPTES[mime]
      if (!extension) {
        res.status(415).json({
          message: `Format non pris en charge : ${mime || 'inconnu'}. Acceptés : PDF, JPEG, PNG, WebP.`,
        })
        return
      }

      const contenu = req.body as Buffer
      if (!Buffer.isBuffer(contenu) || contenu.length === 0) {
        res.status(400).json({ message: 'Fichier vide' })
        return
      }

      const typeRecu = String(req.headers['x-type-document'] || '')
      const type = TYPES_DOCUMENT.includes(typeRecu) ? typeRecu : 'AUTRE'

      let nom = 'document'
      const entete = req.headers['x-nom-fichier']
      if (typeof entete === 'string' && entete) {
        try { nom = decodeURIComponent(entete).slice(0, 160) } catch { nom = entete.slice(0, 160) }
      }

      const periodeBrute = req.headers['x-periode']
      const periode = typeof periodeBrute === 'string' && /^\d{4}-\d{2}$/.test(periodeBrute)
        ? periodeBrute
        : null

      const profil = await profilOuCreation(adhesion.id)
      const fichier = `${crypto.randomBytes(16).toString('hex')}.${extension}`

      fs.mkdirSync(DOSSIER_FICHIERS, { recursive: true })
      fs.writeFileSync(path.join(DOSSIER_FICHIERS, fichier), contenu)

      const document = await prisma.employeeDocument.create({
        data: { profileId: profil.id, type, nom, fichier, mime, taille: contenu.length, periode },
        select: { id: true, type: true, nom: true, mime: true, taille: true, periode: true, createdAt: true },
      })

      res.status(201).json(document)
    } catch (error) {
      // Un échec d'écriture ne doit jamais être silencieux : sinon le document
      // apparaîtrait dans le dossier sans exister sur le disque.
      logger.error('Erreur POST /hr-dossier/employes/:id/documents:', error)
      res.status(500).json({ message: "Impossible d'enregistrer le document" })
    }
  },
)

router.get('/documents/:docId/fichier', async (req: any, res: Response) => {
  try {
    const document = await prisma.employeeDocument.findFirst({
      where: { id: req.params.docId, profile: { userCompany: { companyId: req.companyId } } },
    })
    if (!document) {
      res.status(404).json({ message: 'Document introuvable' })
      return
    }

    // `fichier` est construit par le serveur, mais on vérifie tout de même que
    // le chemin résolu ne sort pas du dossier prévu.
    const chemin = path.join(DOSSIER_FICHIERS, document.fichier)
    if (!chemin.startsWith(DOSSIER_FICHIERS + path.sep)) {
      res.status(400).json({ message: 'Chemin de document invalide' })
      return
    }
    if (!fs.existsSync(chemin)) {
      logger.error(`Document ${document.id} référencé mais absent du disque : ${chemin}`)
      res.status(410).json({ message: 'Fichier absent du disque' })
      return
    }

    res.set({
      'Content-Type': document.mime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(document.nom)}`,
      // Donnée personnelle : jamais mise en cache par un intermédiaire.
      'Cache-Control': 'private, no-store',
    })
    fs.createReadStream(chemin).pipe(res)
  } catch (error) {
    logger.error('Erreur GET /hr-dossier/documents/:id/fichier:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/documents/:docId', async (req: any, res: Response) => {
  try {
    const document = await prisma.employeeDocument.findFirst({
      where: { id: req.params.docId, profile: { userCompany: { companyId: req.companyId } } },
    })
    if (!document) {
      res.status(404).json({ message: 'Document introuvable' })
      return
    }

    await prisma.employeeDocument.delete({ where: { id: document.id } })

    try {
      fs.unlinkSync(path.join(DOSSIER_FICHIERS, document.fichier))
    } catch (e: any) {
      // Un fichier orphelin n'empêche rien, mais il doit être signalé.
      if (e?.code !== 'ENOENT') logger.error(`Document non supprimé du disque (${document.fichier}):`, e)
    }

    res.json({ ok: true })
  } catch (error) {
    logger.error('Erreur DELETE /hr-dossier/documents/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
