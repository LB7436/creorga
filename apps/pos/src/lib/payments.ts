/**
 * POS payment client — talks to /api/payments/charge
 */
export type PaymentProvider =
  | 'stripe' | 'sumup' | 'mypos' | 'viva' | 'worldline' | 'servipay'

export interface ChargeRequest {
  provider: PaymentProvider
  amount: number
  orderId: string
  description?: string
  customerEmail?: string
  terminalId?: string
  returnUrl?: string
  cancelUrl?: string
}

export interface ChargeResult {
  ok: boolean
  provider: PaymentProvider
  transactionId?: string
  redirectUrl?: string
  qrPayload?: string
  status: 'pending' | 'succeeded' | 'failed' | 'awaiting_terminal'
  error?: string
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export async function listProviders(): Promise<{ provider: PaymentProvider; enabled: boolean }[]> {
  try {
    const res = await fetch(`${API_BASE}/payments/providers`)
    const data = await res.json()
    return data.providers || []
  } catch {
    return []
  }
}

export async function chargePayment(req: ChargeRequest): Promise<ChargeResult> {
  try {
    const res = await fetch(`${API_BASE}/payments/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    return await res.json()
  } catch (e: any) {
    return { ok: false, provider: req.provider, status: 'failed', error: e.message }
  }
}

export const PROVIDER_LABELS: Record<PaymentProvider, { name: string; icon: string; color: string }> = {
  stripe:    { name: 'Stripe',      icon: '💳', color: '#635BFF' },
  sumup:     { name: 'SumUp',       icon: '📱', color: '#2C2E2F' },
  mypos:     { name: 'myPOS',       icon: '🏧', color: '#00BFB3' },
  viva:      { name: 'Viva Wallet', icon: '💰', color: '#F6A800' },
  worldline: { name: 'Worldline',   icon: '🌐', color: '#E60028' },
  servipay:  { name: 'Servipay',    icon: '🇱🇺', color: '#00A3E0' },
}
