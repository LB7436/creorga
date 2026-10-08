import { api } from './server'
import { moneyMinor } from '../../../backend/src/lib/money'

type PaymentBill = { total: number; orderIds: string[]; paymentProviders: string[] }
type KeyStorage = Pick<Storage, 'getItem' | 'setItem'>

export async function requestTablePayment(companyId: string, tableId: string, provider: string, orderIds: string[], expectedTotal: number, storage: KeyStorage = localStorage) {
  const bill = await api<PaymentBill>(`/guest/bill/${encodeURIComponent(tableId)}?companyId=${encodeURIComponent(companyId)}`)
  const requested = [...orderIds].sort(), current = [...(bill.orderIds || [])].sort()
  if (!requested.length || JSON.stringify(requested) !== JSON.stringify(current) || moneyMinor(bill.total) !== moneyMinor(expectedTotal)) {
    throw new Error('L’addition a changé. Actualisez la table et vérifiez ses règlements avant de continuer.')
  }
  if (!['paypal', 'stripe'].includes(provider) || !bill.paymentProviders?.includes(provider)) throw new Error('Ce moyen de paiement en ligne n’est pas configuré pour cet établissement.')
  // Les nouvelles commandes d’une table utilisent une autre référence. Une
  // reprise sur les mêmes commandes conserve celle déjà enregistrée.
  const key = `creorga-pos-online:${[companyId, tableId, provider, ...requested].map(encodeURIComponent).join(':')}`
  let requestId = storage.getItem(key)
  if (!requestId) { requestId = crypto.randomUUID(); storage.setItem(key, requestId) }
  const payment = await api<{ url?: string; error?: string }>('/guest/pay', { method: 'POST', body: JSON.stringify({ companyId, tableId, provider, requestId }) })
  if (!payment.url) throw new Error(payment.error || 'Référence conservée : paiement en attente ou résultat incertain. Vérifiez le règlement avant de recommencer.')
  const url = new URL(payment.url)
  if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com', 'checkout.stripe.com'].includes(url.hostname)) throw new Error('Lien de paiement non reconnu. Référence conservée pour vérification.')
  return url.href
}
