import { Router, type Request, type Response } from 'express'
import express from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import logger from '../lib/logger'

/**
 * Affichage TV — médiathèque, séquences et grille hebdomadaire.
 *
 * Complète `routes/ads.ts`, qui ne gère que des visuels fixes avec un simple
 * drapeau « en direct ». Ici on ajoute :
 *   - des médias téléversés (images ET vidéos) ;
 *   - des séquences ordonnées, jouées en boucle, avec une durée par élément ;
 *   - une grille hebdomadaire de 7 jours × 24 heures qui décide quelle
 *     séquence passe à quel moment ;
 *   - un comportement configurable pour les créneaux laissés vides.
 *
 * ─── Où sont rangés les fichiers, et pourquoi ───────────────────────────
 * Les vidéos vivent dans `medias/`, à côté de `data/` et NON dedans.
 * `jobs/backup-worker.ts` produit un ZIP de tout `data/` toutes les 6 heures
 * et en conserve 30 : y déposer des vidéos multiplierait le volume des
 * sauvegardes par leur taille × 30. En contrepartie, `medias/` n'est pas
 * sauvegardé automatiquement — c'est un choix assumé, les visuels étant
 * re-téléversables alors qu'une sauvegarde obèse est un vrai incident.
 * Seules les métadonnées (légères) sont dans `data/affichage.json`.
 */

const RACINE = process.cwd()

function safeCompanyId(value: unknown) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
  return id || null
}

function dossierMedias(companyId: string) {
  return path.join(RACINE, 'medias', 'companies', companyId)
}

function fichierMeta(companyId: string) {
  return path.join(RACINE, 'data', 'companies', companyId, 'affichage.json')
}

/** Taille maximale d'un média téléversé. */
const TAILLE_MAX = 200 * 1024 * 1024

const TYPES_ACCEPTES: Record<string, { type: 'image' | 'video'; ext: string }> = {
  'image/jpeg': { type: 'image', ext: 'jpg' },
  'image/png': { type: 'image', ext: 'png' },
  'image/webp': { type: 'image', ext: 'webp' },
  'image/gif': { type: 'image', ext: 'gif' },
  'video/mp4': { type: 'video', ext: 'mp4' },
  'video/webm': { type: 'video', ext: 'webm' },
  'video/quicktime': { type: 'video', ext: 'mov' },
}

export interface Media {
  id: string
  nom: string
  type: 'image' | 'video'
  mime: string
  taille: number
  fichier: string
  /** Durée d'affichage proposée par défaut lors de l'ajout à une séquence. */
  dureeParDefautSec: number
  creeLe: number
}

export interface ElementSequence {
  id: string
  mediaId: string
  /** Durée d'affichage. Pour une vidéo, 0 signifie « jouer jusqu'au bout ». */
  dureeSec: number
}

export interface Sequence {
  id: string
  nom: string
  /** Couleur d'identification dans la grille hebdomadaire. */
  couleur: string
  elements: ElementSequence[]
}

/** Un créneau occupé. Les créneaux absents de la liste sont vides. */
export interface Creneau {
  /** 0 = lundi … 6 = dimanche. */
  jour: number
  /** 0 à 23. */
  heure: number
  sequenceId: string
}

export interface CreneauVide {
  mode: 'noir' | 'sequence' | 'message'
  sequenceId?: string
  message?: string
}

export interface Programmation {
  medias: Media[]
  sequences: Sequence[]
  creneaux: Creneau[]
  creneauVide: CreneauVide
}

const VIDE: Programmation = {
  medias: [],
  sequences: [],
  creneaux: [],
  creneauVide: { mode: 'noir' },
}

function lire(companyId: string): Programmation {
  const p = safeReadJson<Programmation>(fichierMeta(companyId), VIDE)
  // Un fichier incomplet ne doit pas faire disparaître la programmation :
  // on complète les champs manquants sans rien écraser.
  return {
    medias: p.medias || [],
    sequences: p.sequences || [],
    creneaux: p.creneaux || [],
    creneauVide: p.creneauVide || { mode: 'noir' },
  }
}

function ecrire(companyId: string, p: Programmation): void {
  safeWriteJson(fichierMeta(companyId), p)
}

const identifiant = () => crypto.randomBytes(16).toString('hex')

// ─── Routeur public : service des fichiers ──────────────────────────────
//
// Monté AVANT `authenticate` : les balises <img> et <video> n'envoient pas
// d'en-tête Authorization, l'écran TV ne pourrait donc pas lire les fichiers
// par une route protégée. L'identifiant fait 32 caractères hexadécimaux tirés
// au sort (128 bits) et sert de jeton d'accès. Ce sont des visuels
// publicitaires destinés à être projetés en salle, pas des données
// personnelles.

export const mediasPublicRouter = Router()

mediasPublicRouter.get('/:companyId/:id', (req: Request, res: Response) => {
  const companyId = safeCompanyId(req.params.companyId)
  if (!companyId) {
    res.status(400).json({ message: 'Identifiant entreprise invalide' })
    return
  }
  const media = lire(companyId).medias.find((m) => m.id === req.params.id)
  if (!media) {
    res.status(404).json({ message: 'Média introuvable' })
    return
  }

  // `media.fichier` est construit par le serveur (identifiant tiré au sort +
  // extension issue d'une liste blanche) et jamais repris de l'utilisateur,
  // mais on vérifie tout de même que le chemin reste dans le dossier prévu.
  const dossier = dossierMedias(companyId)
  const chemin = path.join(dossier, media.fichier)
  if (!chemin.startsWith(dossier + path.sep)) {
    res.status(400).json({ message: 'Chemin de média invalide' })
    return
  }
  if (!fs.existsSync(chemin)) {
    logger.error(`Média ${media.id} référencé mais absent du disque : ${chemin}`)
    res.status(410).json({ message: 'Fichier absent du disque' })
    return
  }

  const taille = fs.statSync(chemin).size
  const plage = req.headers.range

  // Les vidéos exigent le support des requêtes partielles, sans quoi le
  // navigateur ne peut ni chercher dans la piste ni relancer la boucle.
  if (plage) {
    const bornes = plage.match(/bytes=(\d*)-(\d*)/)
    const debut = bornes && bornes[1] ? parseInt(bornes[1], 10) : 0
    const fin = bornes && bornes[2] ? parseInt(bornes[2], 10) : taille - 1

    if (Number.isNaN(debut) || Number.isNaN(fin) || debut >= taille || fin >= taille || debut > fin) {
      res.status(416).set('Content-Range', `bytes */${taille}`).end()
      return
    }

    res.status(206).set({
      'Content-Type': media.mime,
      'Content-Length': String(fin - debut + 1),
      'Content-Range': `bytes ${debut}-${fin}/${taille}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    fs.createReadStream(chemin, { start: debut, end: fin }).pipe(res)
    return
  }

  res.status(200).set({
    'Content-Type': media.mime,
    'Content-Length': String(taille),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(chemin).pipe(res)
})

// ─── Routeur d'administration (authentifié) ─────────────────────────────

const router = Router()

/** Programmation complète : médiathèque, séquences, grille et créneau vide. */
router.get('/', (req: any, res: Response) => {
  res.json(lire(req.companyId))
})

/**
 * Téléversement d'un média.
 *
 * Le corps est reçu en binaire brut plutôt qu'en base64 : une vidéo encodée
 * en base64 gonfle d'un tiers et devrait transiter par `express.json`, dont la
 * limite globale est de 1 Mo. `express.raw` évite les deux écueils sans
 * ajouter de dépendance de téléversement.
 *
 * Le nom d'origine passe par l'en-tête `X-Nom-Fichier`, encodé en URI pour
 * supporter les accents.
 */
router.post(
  '/medias',
  express.raw({ type: '*/*', limit: TAILLE_MAX }),
  (req: Request, res: Response) => {
    const companyId = (req as any).companyId as string
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim()
    const accepte = TYPES_ACCEPTES[mime]
    if (!accepte) {
      res.status(415).json({
        message: `Format non pris en charge : ${mime || 'inconnu'}. Formats acceptés : JPEG, PNG, WebP, GIF, MP4, WebM, MOV.`,
      })
      return
    }

    const contenu = req.body as Buffer
    if (!Buffer.isBuffer(contenu) || contenu.length === 0) {
      res.status(400).json({ message: 'Fichier vide' })
      return
    }

    let nom = 'sans-nom'
    const entete = req.headers['x-nom-fichier']
    if (typeof entete === 'string' && entete) {
      try { nom = decodeURIComponent(entete).slice(0, 160) } catch { nom = entete.slice(0, 160) }
    }

    try {
      const dossier = dossierMedias(companyId)
      fs.mkdirSync(dossier, { recursive: true })
      const id = identifiant()
      const fichier = `${id}.${accepte.ext}`
      fs.writeFileSync(path.join(dossier, fichier), contenu)

      const media: Media = {
        id,
        nom,
        type: accepte.type,
        mime,
        taille: contenu.length,
        fichier,
        dureeParDefautSec: accepte.type === 'video' ? 0 : 8,
        creeLe: Date.now(),
      }

      const p = lire(companyId)
      p.medias.push(media)
      ecrire(companyId, p)
      res.status(201).json(media)
    } catch (e: any) {
      // Un échec d'écriture ne doit jamais passer inaperçu : sans cela le
      // média apparaîtrait dans la médiathèque sans exister sur le disque.
      logger.error('Échec du téléversement de média:', e)
      res.status(500).json({ message: "Impossible d'enregistrer le fichier" })
    }
  },
)

/** Renomme un média ou change sa durée par défaut. */
router.patch('/medias/:id', (req: any, res: Response) => {
  const p = lire(req.companyId)
  const media = p.medias.find((m) => m.id === req.params.id)
  if (!media) {
    res.status(404).json({ message: 'Média introuvable' })
    return
  }
  if (typeof req.body?.nom === 'string') media.nom = req.body.nom.slice(0, 160)
  if (Number.isFinite(req.body?.dureeParDefautSec)) {
    media.dureeParDefautSec = Math.max(0, Math.min(600, Number(req.body.dureeParDefautSec)))
  }
  ecrire(req.companyId, p)
  res.json(media)
})

/** Supprime un média, son fichier, et toutes ses occurrences en séquence. */
router.delete('/medias/:id', (req: any, res: Response) => {
  const p = lire(req.companyId)
  const media = p.medias.find((m) => m.id === req.params.id)
  if (!media) {
    res.status(404).json({ message: 'Média introuvable' })
    return
  }

  p.medias = p.medias.filter((m) => m.id !== media.id)
  // Retirer le média des séquences évite des éléments fantômes qui
  // afficheraient un écran noir sans explication.
  let retires = 0
  for (const sequence of p.sequences) {
    const avant = sequence.elements.length
    sequence.elements = sequence.elements.filter((e) => e.mediaId !== media.id)
    retires += avant - sequence.elements.length
  }
  ecrire(req.companyId, p)

  try {
    fs.unlinkSync(path.join(dossierMedias(req.companyId), media.fichier))
  } catch (e: any) {
    // Un fichier orphelin n'empêche rien, mais il doit être signalé.
    if (e?.code !== 'ENOENT') logger.error(`Fichier média non supprimé (${media.fichier}):`, e)
  }

  res.json({ ok: true, elementsRetires: retires })
})

/** Remplace l'ensemble des séquences. */
router.put('/sequences', (req: any, res: Response) => {
  const recues = req.body?.sequences
  if (!Array.isArray(recues)) {
    res.status(400).json({ message: 'Le corps doit contenir un tableau « sequences »' })
    return
  }

  const p = lire(req.companyId)
  const mediasConnus = new Set(p.medias.map((m) => m.id))

  p.sequences = recues.map((s: any) => ({
    id: typeof s.id === 'string' && s.id ? s.id : identifiant(),
    nom: String(s.nom || 'Séquence').slice(0, 80),
    couleur: typeof s.couleur === 'string' ? s.couleur : '#6366f1',
    elements: (Array.isArray(s.elements) ? s.elements : [])
      .filter((e: any) => mediasConnus.has(e?.mediaId))
      .map((e: any) => ({
        id: typeof e.id === 'string' && e.id ? e.id : identifiant(),
        mediaId: e.mediaId,
        dureeSec: Math.max(0, Math.min(600, Number(e.dureeSec) || 0)),
      })),
  }))

  // Une séquence supprimée ne doit pas laisser des créneaux pointant dans le
  // vide : ces créneaux redeviennent libres.
  const sequencesConnues = new Set(p.sequences.map((s) => s.id))
  p.creneaux = p.creneaux.filter((c) => sequencesConnues.has(c.sequenceId))

  ecrire(req.companyId, p)
  res.json({ sequences: p.sequences, creneaux: p.creneaux })
})

/** Remplace la grille hebdomadaire. */
router.put('/creneaux', (req: any, res: Response) => {
  const recus = req.body?.creneaux
  if (!Array.isArray(recus)) {
    res.status(400).json({ message: 'Le corps doit contenir un tableau « creneaux »' })
    return
  }

  const p = lire(req.companyId)
  const sequencesConnues = new Set(p.sequences.map((s) => s.id))

  // Une seule séquence par case : la dernière reçue gagne.
  const parCase = new Map<string, Creneau>()
  for (const c of recus) {
    const jour = Number(c?.jour)
    const heure = Number(c?.heure)
    if (!Number.isInteger(jour) || jour < 0 || jour > 6) continue
    if (!Number.isInteger(heure) || heure < 0 || heure > 23) continue
    if (!sequencesConnues.has(c?.sequenceId)) continue
    parCase.set(`${jour}-${heure}`, { jour, heure, sequenceId: c.sequenceId })
  }

  p.creneaux = [...parCase.values()]
  ecrire(req.companyId, p)
  res.json({ creneaux: p.creneaux })
})

/** Configure ce qui passe quand un créneau est vide. */
router.put('/creneau-vide', (req: any, res: Response) => {
  const mode = req.body?.mode
  if (!['noir', 'sequence', 'message'].includes(mode)) {
    res.status(400).json({ message: 'Mode attendu : noir, sequence ou message' })
    return
  }

  const p = lire(req.companyId)
  const config: CreneauVide = { mode }
  if (mode === 'sequence') {
    if (!p.sequences.some((s) => s.id === req.body?.sequenceId)) {
      res.status(400).json({ message: 'Séquence de repli introuvable' })
      return
    }
    config.sequenceId = req.body.sequenceId
  }
  if (mode === 'message') config.message = String(req.body?.message || '').slice(0, 240)

  p.creneauVide = config
  ecrire(req.companyId, p)
  res.json(p.creneauVide)
})

/**
 * Séquence à jouer maintenant, d'après la grille.
 *
 * L'heure est calculée dans le fuseau du Luxembourg et non dans celui du
 * serveur : le VPS tourne en UTC, une grille programmée à 12 h y passerait à
 * 11 h l'été. Le lundi vaut 0, pour coller à la grille affichée.
 */
export function sequenceDuMoment(p: Programmation, maintenant = new Date()) {
  const parties = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Luxembourg',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(maintenant)

  const jourTexte = parties.find((x) => x.type === 'weekday')?.value.toLowerCase() || ''
  const heure = parseInt(parties.find((x) => x.type === 'hour')?.value || '0', 10)
  const jours = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
  const jour = jours.findIndex((j) => jourTexte.startsWith(j))

  const creneau = p.creneaux.find((c) => c.jour === jour && c.heure === heure)
  const programmee = creneau ? p.sequences.find((s) => s.id === creneau.sequenceId) : undefined

  if (programmee && programmee.elements.length > 0) {
    return { sequence: programmee, origine: 'grille' as const, jour, heure }
  }

  if (p.creneauVide.mode === 'sequence') {
    const repli = p.sequences.find((s) => s.id === p.creneauVide.sequenceId)
    if (repli && repli.elements.length > 0) {
      return { sequence: repli, origine: 'repli' as const, jour, heure }
    }
  }

  return { sequence: null, origine: p.creneauVide.mode, jour, heure }
}

/** Ce que l'écran TV doit afficher à cet instant. */
/**
 * Ce qu'il faut afficher à cet instant.
 *
 * PUBLIC, et c'est indispensable : `/ads/tv` est la page qu'on ouvre sur la
 * télévision de la salle, sans session. Derrière `authenticate`, elle recevait
 * un 401 et la télé restait désespérément vide — le module d'affichage ne
 * fonctionnait donc sur aucun écran réel.
 *
 * Ce qui sort d'ici : un nom de séquence, des durées, l'heure, et des URL de
 * médias qui sont DÉJÀ publiques (`/api/media-affichage/:companyId/:id`, identifiants
 * tirés au sort sur 128 bits). Aucune donnée personnelle, aucun chiffre
 * d'affaires. Même niveau de confiance que les médias eux-mêmes.
 */
function maintenant(req: any, res: Response) {
  const companyId = safeCompanyId(req.companyId || req.query.companyId)
  if (!companyId) {
    return res.status(400).json({ message: 'companyId requis pour cet écran TV' })
  }
  const p = lire(companyId)
  const { sequence, origine, jour, heure } = sequenceDuMoment(p)

  const parId = new Map(p.medias.map((m) => [m.id, m]))
  const elements = (sequence?.elements || [])
    .map((e) => {
      const media = parId.get(e.mediaId)
      if (!media) return null
      return {
        id: e.id,
        type: media.type,
        url: `/api/media-affichage/${companyId}/${media.id}`,
        nom: media.nom,
        dureeSec: e.dureeSec,
      }
    })
    .filter(Boolean)

  res.json({
    sequence: sequence ? { id: sequence.id, nom: sequence.nom } : null,
    elements,
    origine,
    jour,
    heure,
    creneauVide: p.creneauVide,
  })
}

// Enregistre sur les deux routeurs : le public (pour la television) et
// l'authentifie (pour l'apercu depuis le back-office).
export const maintenantPublicRouter = Router()
maintenantPublicRouter.get('/maintenant', maintenant)
router.get('/maintenant', maintenant)

export default router
