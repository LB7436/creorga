import { useMemo } from 'react'
import { useInvoices, useQuotes } from '@/hooks/api/useInvoices'

/**
 * Retards de paiement et devis sans réponse.
 *
 * Ce fichier contenait 4 factures et 3 devis écrits en dur — « Brasserie
 * Nationale », « Mairie de Esch-sur-Alzette », « ArcelorMittal » — avec des
 * montants et des retards inventés. La cloche de notifications affichait donc
 * des impayés qui n'existaient pas, et les chiffres ne bougeaient jamais.
 *
 * Les alertes viennent maintenant des vraies factures et des vrais devis.
 * Quand il n'y a aucun retard, il n'y a aucune alerte : un écran vide ne ment pas.
 */

export type AlertType = 'invoice' | 'quote'
export type AlertSeverity = 'warning' | 'danger'

export interface OverdueAlert {
  id: string
  type: AlertType
  number: string
  clientName: string
  amount: number
  daysOverdue: number
  dueDate: string
  severity: AlertSeverity
}

export function getAlertSeverity(days: number): AlertSeverity {
  if (days > 30) return 'danger'
  return 'warning'
}

export function formatAlertMessage(alert: OverdueAlert): string {
  const amount = alert.amount.toLocaleString('fr-FR', { minimumFractionDigits: 0 })
  if (alert.type === 'invoice') {
    return `Facture ${alert.number} impayée depuis ${alert.daysOverdue}j (${alert.clientName}, ${amount}€)`
  }
  return `Devis ${alert.number} sans réponse depuis ${alert.daysOverdue}j (${alert.clientName}, ${amount}€)`
}

/** Nom affichable d'un client, sans jamais inventer d'identité. */
function nomClient(customer?: { firstName?: string; lastName?: string } | null): string {
  const nom = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()
  return nom || 'Client non renseigné'
}

/**
 * Nombre de jours pleins de retard, calculé sur des dates locales.
 *
 * On compare des minuits locaux et non des horodatages : sinon une échéance
 * d'aujourd'hui à 23 h compterait « 0 jour » le matin et « 1 jour » le soir,
 * et le même impayé changerait de couleur au fil de la journée.
 */
function joursDeRetard(echeance: string, maintenant: Date): number {
  const d = new Date(echeance)
  if (Number.isNaN(d.getTime())) return 0
  const jourEcheance = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()).getTime()
  return Math.max(0, Math.round((aujourdhui - jourEcheance) / 86_400_000))
}

export function useOverdueAlerts(): {
  invoices: OverdueAlert[]
  quotes: OverdueAlert[]
  all: OverdueAlert[]
  totals: { invoicesCount: number; quotesCount: number; totalAmount: number }
  isLoading: boolean
} {
  const { data: factures, isLoading: chargeFactures } = useInvoices()
  const { data: devis, isLoading: chargeDevis } = useQuotes()

  return useMemo(() => {
    const maintenant = new Date()

    // Une facture payée, annulée ou encore en brouillon n'est jamais en retard,
    // quelle que soit son échéance. Sans échéance, on ne peut rien affirmer.
    const invoices: OverdueAlert[] = (factures || [])
      .filter((f) => f.dueDate && f.status !== 'PAID' && f.status !== 'CANCELLED' && f.status !== 'DRAFT')
      .map((f) => {
        const daysOverdue = joursDeRetard(f.dueDate as string, maintenant)
        return {
          id: f.id,
          type: 'invoice' as const,
          number: f.number,
          clientName: nomClient(f.customer),
          amount: f.total,
          daysOverdue,
          dueDate: f.dueDate as string,
          severity: getAlertSeverity(daysOverdue),
        }
      })
      .filter((a) => a.daysOverdue > 0)

    // Un devis accepté, refusé ou en brouillon n'attend aucune réponse.
    const quotes: OverdueAlert[] = (devis || [])
      .filter((d) => d.validUntil && d.status === 'SENT')
      .map((d) => {
        const daysOverdue = joursDeRetard(d.validUntil as string, maintenant)
        return {
          id: d.id,
          type: 'quote' as const,
          number: d.number,
          clientName: nomClient(d.customer),
          amount: d.total,
          daysOverdue,
          dueDate: d.validUntil as string,
          severity: getAlertSeverity(daysOverdue),
        }
      })
      .filter((a) => a.daysOverdue > 0)

    const all = [...invoices, ...quotes].sort((a, b) => b.daysOverdue - a.daysOverdue)
    return {
      invoices,
      quotes,
      all,
      totals: {
        invoicesCount: invoices.length,
        quotesCount: quotes.length,
        totalAmount: all.reduce((s, a) => s + a.amount, 0),
      },
      isLoading: chargeFactures || chargeDevis,
    }
  }, [factures, devis, chargeFactures, chargeDevis])
}

export default useOverdueAlerts
