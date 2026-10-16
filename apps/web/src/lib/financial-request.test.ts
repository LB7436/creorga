import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from './financial-request'
const key = 'creorga-financial-v1:payment:societe:acteur:commande'
const request = { requestId: 'f8e209de-7378-41ac-a31b-f5a765bf41d7', partialAmountCents: 500 }
describe('Références financières locales : ne jamais écraser une opération incertaine', () => {
  const values = new Map<string, string>()
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) })
  })
  it('relit une requête identique après rechargement', () => {
    preserveFinancialRequest(key, request); preserveFinancialRequest(key, request)
    expect(readFinancialRequest(key)).toEqual(request)
  })
  it('refuse une nouvelle référence ou un montant différent sur une référence incertaine', () => {
    preserveFinancialRequest(key, request)
    expect(() => preserveFinancialRequest(key, { ...request, partialAmountCents: 501 })).toThrow()
    expect(() => preserveFinancialRequest(key, { ...request, requestId: crypto.randomUUID() })).toThrow()
    expect(readFinancialRequest(key)).toEqual(request)
  })
  it.each(['{corrompu', 'null', '[]', '{"requestId":"invalide"}'])('ne remplace pas une référence illisible : %s', raw => {
    values.set(key, raw)
    expect(() => readFinancialRequest(key)).toThrow()
    expect(() => preserveFinancialRequest(key, request)).toThrow()
    expect(values.get(key)).toBe(raw)
  })
  it('une réponse tardive ne retire pas une autre référence', () => {
    preserveFinancialRequest(key, request)
    expect(() => forgetFinancialRequest(key, crypto.randomUUID())).toThrow()
    expect(readFinancialRequest(key)).toEqual(request)
    forgetFinancialRequest(key, request.requestId); expect(readFinancialRequest(key)).toBeNull()
  })
  it('une autre société/acteur possède son propre emplacement', () => {
    preserveFinancialRequest(key, request)
    expect(readFinancialRequest('creorga-financial-v1:payment:autre:acteur:commande')).toBeNull()
  })
})
