/**
 * Catalogue serveur des modules attribués à chaque nouvelle société.
 *
 * Le front peut changer de présentation, mais l'inscription doit toujours
 * créer les droits correspondants. Sans ces lignes, /api/modules renvoyait
 * une liste vide pour un nouveau client.
 */
export const COMPANY_MODULE_IDS = [
  'pos',
  'hr',
  'inventory',
  'invoices',
  'marketing',
  'accounting',
  'haccp',
  'sales',
  'ai',
  'qrmenu',
  'ads',
  'clients',
  'owner',
  'sites',
  'rgpd',
  'backup',
  'api',
  'maintenance',
] as const

export function moduleRowsFor(companyId: string) {
  return COMPANY_MODULE_IDS.map((moduleId) => ({ companyId, moduleId, isActive: true }))
}
