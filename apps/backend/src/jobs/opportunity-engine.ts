import path from 'path'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { safeReadJson } from '../lib/safe-json'
import {
  CONFIG_DEFAUT,
  REGLES_SOCIETE,
  REGLES_GLOBALES,
  COMPANY_ID_SERVEUR,
  type ReglesConfig,
  type OpportuniteCandidate,
} from '../lib/creator/regles'
import { isProduction } from '../lib/security'

/**
 * Moteur d'opportunités de la console créateur.
 *
 * Une fois par jour, chaque règle observe chaque société et produit des
 * opportunités commerciales avec preuve chiffrée et brouillon de message.
 * L'upsert par dedupKey (règle × société × période) garantit : jamais de
 * doublon d'un jour à l'autre, et une opportunité déjà traitée (SENT,
 * ACCEPTED, DISMISSED) n'est JAMAIS remise à NEW — seule sa preuve est
 * rafraîchie.
 *
 * Interrupteur : CREATOR_ENGINE_ENABLED=1 obligatoire en production
 * (la collecte tourne toujours ; le moteur, seulement quand les données
 * existent). Hors production, actif par défaut (=0 pour couper).
 */

const CONFIG_FILE = path.resolve(process.cwd(), 'data', 'creator-rules.json')

export function chargerConfig(): ReglesConfig {
  const disque = safeReadJson<{ regles?: ReglesConfig }>(CONFIG_FILE, {})
  const config: ReglesConfig = {}
  for (const [id, defaut] of Object.entries(CONFIG_DEFAUT)) {
    config[id] = { ...defaut, ...(disque?.regles?.[id] ?? {}) }
  }
  return config
}

export function moteurActive(): boolean {
  if (isProduction()) return process.env.CREATOR_ENGINE_ENABLED === '1'
  return process.env.CREATOR_ENGINE_ENABLED !== '0'
}

async function enregistrer(companyId: string, candidate: OpportuniteCandidate): Promise<void> {
  const dedupKey = `${candidate.ruleId}:${companyId}:${candidate.periode}`
  const existante = await prisma.opportunity.findUnique({ where: { dedupKey } })
  if (existante) {
    // Preuve rafraîchie, statut respecté : une opportunité écartée ou envoyée
    // ne redevient jamais « nouvelle ».
    await prisma.opportunity.update({
      where: { dedupKey },
      data: {
        severity: candidate.severity,
        title: candidate.title,
        message: candidate.message,
        evidence: candidate.evidence as object,
      },
    })
    return
  }
  await prisma.opportunity.create({
    data: {
      companyId,
      ruleId: candidate.ruleId,
      severity: candidate.severity,
      title: candidate.title,
      message: candidate.message,
      evidence: candidate.evidence as object,
      dedupKey,
    },
  })
}

export interface BilanMoteur {
  societes: number
  reglesEvaluees: number
  opportunites: number
  erreurs: number
}

export async function lancerMoteur(maintenant: Date = new Date()): Promise<BilanMoteur> {
  const config = chargerConfig()
  const societes = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true },
  })

  const bilan: BilanMoteur = { societes: societes.length, reglesEvaluees: 0, opportunites: 0, erreurs: 0 }

  for (const societe of societes) {
    for (const regle of REGLES_SOCIETE) {
      const reglage = config[regle.id] ?? { actif: false }
      if (!reglage.actif) continue
      bilan.reglesEvaluees++
      try {
        const candidate = await regle.evaluer({
          companyId: societe.id,
          companyName: societe.name,
          creeLe: societe.createdAt,
          maintenant,
          reglage,
        })
        if (candidate) {
          await enregistrer(societe.id, candidate)
          bilan.opportunites++
        }
      } catch (e: any) {
        bilan.erreurs++
        logger.error(`[opportunites] règle ${regle.id} sur ${societe.name}: ${e?.message || e}`)
      }
    }
  }

  for (const regle of REGLES_GLOBALES) {
    const reglage = config[regle.id] ?? { actif: false }
    if (!reglage.actif) continue
    bilan.reglesEvaluees++
    try {
      const candidate = await regle.evaluer({
        companyId: COMPANY_ID_SERVEUR,
        companyName: 'Serveur',
        creeLe: new Date(0),
        maintenant,
        reglage,
      })
      if (candidate) {
        await enregistrer(COMPANY_ID_SERVEUR, candidate)
        bilan.opportunites++
      }
    } catch (e: any) {
      bilan.erreurs++
      logger.error(`[opportunites] règle globale ${regle.id}: ${e?.message || e}`)
    }
  }

  return bilan
}

let premierPassage: NodeJS.Timeout | null = null
let minuteur: NodeJS.Timeout | null = null

export function startOpportunityEngine(): void {
  if (minuteur) return
  if (!moteurActive()) {
    logger.info('[opportunites] moteur désactivé (CREATOR_ENGINE_ENABLED)')
    return
  }
  const lancer = () => {
    lancerMoteur()
      .then((b) =>
        logger.info(
          `[opportunites] cycle terminé : ${b.opportunites} opportunité(s) sur ${b.societes} société(s) (${b.erreurs} erreur(s))`,
        ),
      )
      .catch((e) => logger.error(`[opportunites] cycle impossible: ${e?.message || e}`))
  }
  // Premier passage 10 min après le démarrage (après le premier snapshot),
  // puis toutes les 24 h.
  premierPassage = setTimeout(lancer, 10 * 60 * 1000)
  premierPassage.unref?.()
  minuteur = setInterval(lancer, 24 * 60 * 60 * 1000)
  minuteur.unref?.()
}

export function stopOpportunityEngine(): void {
  if (premierPassage) {
    clearTimeout(premierPassage)
    premierPassage = null
  }
  if (minuteur) {
    clearInterval(minuteur)
    minuteur = null
  }
}
