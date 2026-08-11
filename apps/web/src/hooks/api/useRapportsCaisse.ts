import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

/**
 * Extraits de caisse sur une période libre.
 *
 * Contrat réel de `apps/backend/src/routes/rapports-caisse.ts`. La route est
 * montée derrière `requireRole('OWNER')` : elle répond 403 à un serveur ou à
 * un manager. L'écran doit le dire clairement plutôt que d'afficher un vide
 * qu'on prendrait pour « aucune vente ».
 */

export interface LigneVenteRapport {
  nom: string
  quantite: number
  prixUnitaire: number
  /** Pourcentage de TVA (17), jamais une fraction. */
  tauxTva: number
}

export interface VenteRapport {
  id: string
  numero: number
  /** ISO 8601. */
  horodatage: string
  table: string | null
  vendeur: string
  methode: string
  sousTotal: number
  tva: number
  total: number
  lignes: LigneVenteRapport[]
}

export interface RapportCaisse {
  debut: string
  fin: string
  nbVentes: number
  totalTTC: number
  totalHT: number
  totalTva: number
  panierMoyen: number
  parMethode: Record<string, { nb: number; total: number }>
  parVendeur: Record<string, { nb: number; total: number }>
  /** `date` au format AAAA-MM-JJ. */
  parJour: Array<{ date: string; total: number; nb: number }>
  topProduits: Array<{ nom: string; quantite: number; total: number }>
  ventes: VenteRapport[]
}

export function useRapportCaisse(debut: Date | null, fin: Date | null) {
  return useQuery<RapportCaisse>({
    queryKey: ['rapports-caisse', debut?.toISOString(), fin?.toISOString()],
    queryFn: () =>
      api
        .get('/rapports-caisse', {
          params: { debut: debut!.toISOString(), fin: fin!.toISOString() },
        })
        .then((r) => r.data),
    enabled: Boolean(debut && fin),
    // Un extrait de caisse n'a pas besoin d'être rafraîchi en permanence, et
    // il est coûteux sur une année.
    staleTime: 60_000,
    retry: false,
  })
}
