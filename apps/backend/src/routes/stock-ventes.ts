import { Router } from 'express'
import { decrementerPourVente, getMouvements } from '../lib/stockStore'
import { pushNotif } from '../jobs/proactive-worker'
import logger from '../lib/logger'

/**
 * Pont caisse → stock.
 *
 * Avant cette route, aucune vente — ni caisse, ni portail, ni back-office —
 * ne touchait au stock (constat central de l'audit). La caisse appelle
 * POST /vente à chaque encaissement ; le stock est décrémenté, le mouvement
 * journalisé, et une rupture déclenchée PAR cette vente est notifiée au
 * patron dans la seconde, pas au prochain balayage de 10 minutes.
 *
 * Monté sous deviceOrUserAuth : la caisse s'authentifie par jeton
 * d'appareil, le back-office par JWT.
 */
const router = Router()

interface CorpsVente {
  /** Identifiant de la vente côté caisse — clé d'idempotence. */
  venteId: string
  lignes: Array<{ name: string; qty: number }>
  vendeur?: string
}

router.post('/vente', (req, res) => {
  const corps = req.body as Partial<CorpsVente>
  const venteId = typeof corps.venteId === 'string' ? corps.venteId.trim() : ''
  const lignes = Array.isArray(corps.lignes) ? corps.lignes : null

  if (!venteId) return res.status(400).json({ message: 'venteId manquant : sans référence, le décrément ne peut pas être idempotent.' })
  if (!lignes) return res.status(400).json({ message: 'lignes manquantes' })
  const lignesValides = lignes
    .filter((l) => l && typeof l.name === 'string' && Number.isFinite(Number(l.qty)) && Number(l.qty) > 0)
    .map((l) => ({ name: l.name.trim(), qty: Number(l.qty) }))
  if (lignesValides.length === 0) return res.status(400).json({ message: 'aucune ligne exploitable' })

  let resultat
  try {
    resultat = decrementerPourVente(lignesValides, venteId, corps.vendeur)
  } catch (e) {
    // Une écriture de stock qui échoue est une VRAIE erreur : elle remonte
    // en 500 pour que la caisse le sache, elle n'est pas avalée.
    logger.error(`[stock-ventes] échec du décrément pour la vente ${venteId}`, e)
    return res.status(500).json({ message: 'Écriture du stock impossible' })
  }

  // Alertes déclenchées par CETTE vente : notification immédiate.
  for (const a of resultat.alertes) {
    pushNotif(
      a.statut === 'OUT'
        ? {
            type: 'stock-out',
            entityId: a.name,
            title: `🚫 Rupture : ${a.name}`,
            message: `Dernière unité vendue à l'instant — le produit est retiré de la carte client.`,
            cta: { label: 'Commander', route: '/inventory/stock' },
            severity: 'critical',
          }
        : {
            type: 'stock-low',
            entityId: a.name,
            title: `📦 Stock bas : ${a.name}`,
            message: `Il reste ${a.quantite} — seuil atteint après la vente.`,
            cta: { label: 'Commander', route: '/inventory/stock' },
            severity: 'warning',
          },
    )
  }

  // Le back-office (page Stock, cloche) apprend le changement en direct.
  if (resultat.decrementes.length > 0) {
    const broadcast = (globalThis as any).liveBroadcast
    if (broadcast) broadcast('inventory', 'inventory:vente', { venteId, ...resultat })
  }

  res.json(resultat)
})

/** Historique des mouvements (les plus récents en tête). */
router.get('/mouvements', (req, res) => {
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 100))
  res.json({ mouvements: getMouvements().slice(0, limite) })
})

export default router
