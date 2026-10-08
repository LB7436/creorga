import { Router } from 'express'

/**
 * Les sauvegardes intégrales contiennent toutes les sociétés. Elles restent
 * gérées par le worker et les outils opérateur de reprise. Un OWNER de société
 * ne peut ni les énumérer, ni les récupérer, ni écraser l'installation avec.
 *
 * Le montage d'index.ts est déjà désactivé ; ce routeur reste lui aussi fermé
 * pour qu'une réutilisation ultérieure ne réintroduise pas l'accès global.
 */
const FILENAME_RE = /^creorga-full-[\d-]+\.zip$/
const router = Router()

export function validFilename(filename: string): boolean {
  return FILENAME_RE.test(filename)
}

router.use((_req, res) => {
  res.status(503).json({
    code: 'COMPANY_BACKUP_MIGRATION_REQUIRED',
    message: "Les exports et restaurations sont temporairement indisponibles jusqu'à leur isolation par entreprise.",
  })
})

export default router
