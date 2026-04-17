import { useMemo } from 'react'

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

/* ── mock base data ── */
const INVOICES_RAW: Array<Omit<OverdueAlert, 'severity' | 'type'>> = [
  { id: 'inv-1', number: 'F-2026-042', clientName: 'Pierre Schmitz', amount: 890, daysOverdue: 8, dueDate: '2026-04-09' },
  { id: 'inv-2', number: 'F-2026-038', clientName: 'Restaurant Le Cercle', amount: 2450, daysOverdue: 15, dueDate: '2026-04-02' },
  { id: 'inv-3', number: 'F-2026-029', clientName: 'Café des Arts', amount: 1275, daysOverdue: 22, dueDate: '2026-03-26' },
  { id: 'inv-4', number: 'F-2026-011', clientName: 'Brasserie Nationale', amount: 6120, daysOverdue: 47, dueDate: '2026-03-01' },
]

const QUOTES_RAW: Array<Omit<OverdueAlert, 'severity' | 'type'>> = [
  { id: 'quo-1', number: 'D-2026-034', clientName: 'Groupe Hôtelier Luxembourg', amount: 3200, daysOverdue: 5, dueDate: '2026-04-12' },
  { id: 'quo-2', number: 'D-2026-022', clientName: 'Mairie de Esch-sur-Alzette', amount: 1850, daysOverdue: 12, dueDate: '2026-04-05' },
  { id: 'quo-3', number: 'D-2026-012', clientName: 'ArcelorMittal', amount: 4200, daysOverdue: 28, dueDate: '2026-03-20' },
]

export function useOverdueAlerts(): {
  invoices: OverdueAlert[]
  quotes: OverdueAlert[]
  all: OverdueAlert[]
  totals: { invoicesCount: number; quotesCount: number; totalAmount: number }
} {
  return useMemo(() => {
    const invoices: OverdueAlert[] = INVOICES_RAW.map((i) => ({
      ...i,
      type: 'invoice',
      severity: getAlertSeverity(i.daysOverdue),
    }))
    const quotes: OverdueAlert[] = QUOTES_RAW.map((q) => ({
      ...q,
      type: 'quote',
      severity: getAlertSeverity(q.daysOverdue),
    }))
    const all = [...invoices, ...quotes].sort((a, b) => b.daysOverdue - a.daysOverdue)
    const totalAmount = all.reduce((s, a) => s + a.amount, 0)
    return {
      invoices,
      quotes,
      all,
      totals: {
        invoicesCount: invoices.length,
        quotesCount: quotes.length,
        totalAmount,
      },
    }
  }, [])
}

export default useOverdueAlerts
