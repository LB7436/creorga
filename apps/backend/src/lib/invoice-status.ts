const transitions: Record<string, string[]> = {
  DRAFT: ['SENT', 'PAID', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
}
export function invoiceTransitionAllowed(from: string, to: string) {
  return from === to || Boolean(transitions[from]?.includes(to))
}
