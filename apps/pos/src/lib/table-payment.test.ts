import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './server'
import { requestTablePayment } from './table-payment'
vi.mock('./server', () => ({ api: vi.fn() }))
const mock = vi.mocked(api), entries = new Map<string, string>()
const storage = { getItem: (key: string) => entries.get(key) || null, setItem: (key: string, value: string) => { entries.set(key, value) } }
const bill = { total: 11.7, orderIds: ['order-a'], paymentProviders: ['paypal'] }
describe('Paiement en ligne depuis la caisse', () => {
  beforeEach(() => { mock.mockReset(); entries.clear() })
  it('conserve la référence et le fournisseur après une réponse perdue', async () => {
    mock.mockResolvedValueOnce(bill).mockRejectedValueOnce(new Error('connexion perdue'))
    await expect(requestTablePayment('company', 'table', 'paypal', ['order-a'], 11.7, storage)).rejects.toThrow('connexion perdue')
    const first = JSON.parse((mock.mock.calls[1][1] as RequestInit).body as string)
    mock.mockResolvedValueOnce(bill).mockResolvedValueOnce({ url: 'https://www.sandbox.paypal.com/checkoutnow?token=fixture-only' })
    await expect(requestTablePayment('company', 'table', 'paypal', ['order-a'], 11.7, storage)).resolves.toContain('sandbox.paypal.com')
    expect(JSON.parse((mock.mock.calls[3][1] as RequestInit).body as string)).toEqual(first)
    expect(first.provider).toBe('paypal'); expect(first.requestId).toMatch(/^[a-f0-9-]{36}$/i)
  })
  it('ne transmet pas une addition modifiée ou un fournisseur indisponible', async () => {
    mock.mockResolvedValueOnce({ ...bill, total: 12 })
    await expect(requestTablePayment('company', 'table', 'paypal', ['order-a'], 11.7, storage)).rejects.toThrow('changé')
    expect(mock).toHaveBeenCalledTimes(1)
    mock.mockResolvedValueOnce(bill)
    await expect(requestTablePayment('company', 'table', 'stripe', ['order-a'], 11.7, storage)).rejects.toThrow('configuré')
    expect(mock).toHaveBeenCalledTimes(2)
  })
  it('un résultat inconnu ne devient jamais un paiement réussi', async () => {
    mock.mockResolvedValueOnce(bill).mockResolvedValueOnce({ status: 'pending' })
    await expect(requestTablePayment('company', 'table', 'paypal', ['order-a'], 11.7, storage)).rejects.toThrow('incertain')
    expect(entries.size).toBe(1)
  })
})
