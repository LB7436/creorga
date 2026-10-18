import { createTrackedRouter as Router } from '../lib/tracked-router'

/**
 * Help Center feedback — articles, conversations, command results.
 *
 * Collecte et lecture suspendues : les commentaires historiques globaux ne
 * disposent pas d'un périmètre société/utilisateur fiable.
 */

const router = Router()
// Quarantaine : les commentaires historiques n'ont ni société ni auteur
// fiables. Aucun fichier existant n'est lu, transformé ou supprimé. Les
// contrats historiques restent dans Git, pas dans le code actif.
router.use((_req, res) => {
  res.set('Cache-Control', 'private, no-store').status(503).json({
    code: 'HELP_FEEDBACK_SCOPE_MIGRATION_REQUIRED',
    error: 'Les avis du centre d’aide sont indisponibles pendant leur migration sécurisée. Aucun commentaire enregistré ou publié.',
  })
})
export default router
