import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { RapportCaisse } from '@/hooks/api/useRapportsCaisse'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})

const { default: RapportsPage } = await import('./RapportsPage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, client: QueryClient
let report: RapportCaisse, reportStatus: number | undefined
let requests: Array<{ method: string; url: string }>, downloads: Array<{ name: string; blob: Blob }>
let print: ReturnType<typeof vi.fn>, pendingBlob: Blob
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === label)!
const reportContent = () => renderer!.root.findByProps({ className: 'rapport' })

beforeEach(() => {
  requests = []; downloads = []; reportStatus = undefined; print = vi.fn()
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/accounting/rapports', href: 'http://localhost:5174/accounting/rapports' }, localStorage, print })
  vi.stubGlobal('document', { createElement: (tag: string) => {
    if (tag !== 'a') throw Error('Élément inattendu dans le téléchargement fictif')
    return { href: '', download: '', click() { downloads.push({ name: this.download, blob: pendingBlob }) } }
  } })
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { pendingBlob = blob as Blob; return 'blob:rapport-fictif' })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  useAuthStore.getState().setAuth({ accessToken: 'rapport-fictif-token',
    user: { id: 'patron-rapport-fictif', email: 'rapport@fixture.invalid', firstName: 'Patron', lastName: 'FICTIF', avatar: null },
    companies: [{ id: 'adhesion-rapport-fictive', userId: 'patron-rapport-fictif', companyId: 'societe-rapport-fictive', isActive: true, role: 'OWNER',
      company: { id: 'societe-rapport-fictive', name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }],
  })
  report = {
    debut: '2026-10-17T00:00:00Z', fin: '2026-10-17T12:00:00Z', nbVentes: 3,
    totalTTC: 21.1, totalHT: 18.03, totalTva: 3.07, panierMoyen: 7.03,
    parMethode: { cash: { nb: 1, total: 10.25 }, card: { nb: 1, total: 4.75 }, 'non précisé': { nb: 1, total: 6.1 } },
    parVendeur: { Inconnu: { nb: 3, total: 21.1 } }, parJour: [{ date: '2026-10-17', nb: 3, total: 21.1 }],
    topProduits: [{ nom: 'Article FICTIF', quantite: 3, total: 21.1 }],
    ventes: [
      { id: 'vente-fictive-1', numero: 1, horodatage: '2026-10-17T10:00:00Z', table: 'Table FICTIVE', vendeur: 'Inconnu', methode: 'cash', sousTotal: 8.76, tva: 1.49, total: 10.25,
        lignes: [{ nom: 'Article FICTIF 1', quantite: 1, prixUnitaire: 10.25, tauxTva: 17 }] },
      { id: 'vente-fictive-2', numero: 2, horodatage: '2026-10-17T10:05:00Z', table: null, vendeur: 'Inconnu', methode: 'card', sousTotal: 4.06, tva: 0.69, total: 4.75,
        lignes: [{ nom: 'Article FICTIF 2', quantite: 1, prixUnitaire: 4.75, tauxTva: 17 }] },
      { id: 'vente-fictive-3', numero: 3, horodatage: '2026-10-17T10:10:00Z', table: null, vendeur: 'Inconnu', methode: 'non précisé', sousTotal: 5.21, tva: 0.89, total: 6.1,
        lignes: [{ nom: 'Article FICTIF 3', quantite: 1, prixUnitaire: 6.1, tauxTva: 17 }] },
    ],
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  // Vrais composants, hooks, CSV et intercepteurs ; seul le transport HTTP est
  // remplacé. Les montants sont fictifs, aucun service local ou externe appelé.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || ''
    requests.push({ method, url })
    let data: unknown
    if (method === 'get' && url === '/rapports-caisse') {
      if (reportStatus) throw new AxiosError('Rapport refusé', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status: reportStatus, statusText: 'fixture', headers: {}, data: { error: 'Accès refusé' } })
      data = report
    } else if (method === 'get' && url === '/accounting/reconciliation') {
      data = { totals: { finalizedSalesCents: 2110, salesTaxCents: 307, creditDocumentsCents: 1025,
        receiptsCents: 2410, declaredRefundsCents: 1025, verifiedRefundsCents: 0, heldRefundsCents: 0,
        knownFeesCents: 0, unknownFeesCount: 0 }, issues: [], warning: 'Données FICTIVES de test uniquement.', payouts: null }
    } else throw Error(`Transport inattendu dans le rapport fictif : ${method} ${url}`)
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})

afterEach(async () => {
  await act(async () => { renderer?.unmount() })
  renderer = undefined; client.clear(); api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); vi.restoreAllMocks(); vi.unstubAllGlobals()
})

async function mount() {
  await act(async () => { renderer = create(createElement(QueryClientProvider, { client }, createElement(RapportsPage))) })
  await vi.waitFor(async () => {
    await act(async () => {})
    expect(client.getQueriesData({ queryKey: ['rapports-caisse'] })).toHaveLength(1)
    const query = client.getQueryCache().find({ queryKey: ['rapports-caisse'], exact: false })!
    expect(query.state.fetchStatus).toBe('idle')
    if (reportStatus) expect(text(renderer!.root.findByType('h1'))).toBe('Réservé au propriétaire')
    else expect(text(renderer!.root)).not.toContain("Calcul de l'extrait…")
  })
}

describe('Rapports : ventes finalisées distinctes des encaissements et corrections documentaires', () => {
  it('garde les ventes brutes et oriente vers le vrai rapprochement sans inventer de trésorerie nette', async () => {
    const before = structuredClone(report)
    await mount()
    expect(text(reportContent())).toMatch(/Ventes TTC avant avoirs21,10\s*€/)
    expect(text(reportContent())).toMatch(/TVA des ventes3,07\s*€/)
    expect(text(renderer!.root)).not.toMatch(/Ventes réellement encaissées|Total encaissé/)
    expect(text(reportContent())).toContain('pas la trésorerie nette')
    expect(text(reportContent())).toContain('acomptes')
    expect(text(reportContent())).toContain('avoirs et remboursements')
    const link = renderer!.root.findAllByType('a').find(node => text(node) === 'Consulter le rapprochement financier')!
    expect(link.props.href).toBe('#rapprochement-financier')
    expect(renderer!.root.findByProps({ id: 'rapprochement-financier' }).findByProps({ 'aria-label': 'Rapprochement financier' })).toBeDefined()
    expect(text(renderer!.root)).toContain('Inconnu (3)')
    await act(async () => { button('Ouvrir le rapprochement financier').props.onClick() })
    await vi.waitFor(async () => { await act(async () => {}); expect(text(renderer!.root)).toContain('Encaissements enregistrés24.10 €') })
    expect(text(renderer!.root)).toContain('Avoirs documentaires (distincts)10.25 €')
    expect(text(renderer!.root)).toContain('Remboursements déclarés10.25 €')
    expect(text(reportContent())).toMatch(/Ventes TTC avant avoirs21,10\s*€/)
    expect(report).toEqual(before)
    expect(requests).toEqual([{ method: 'get', url: '/rapports-caisse' }, { method: 'get', url: '/accounting/reconciliation' }])
  })

  it('exporte les mêmes neuf colonnes et montants avec des en-têtes humains sans promesse d’encaissement net', async () => {
    await mount()
    await act(async () => { button('Télécharger (Excel)').props.onClick() })
    expect(downloads).toHaveLength(1)
    const csv = await downloads[0].blob.text(), rows = csv.split('\r\n')
    expect(downloads[0].name).toBe('extrait-caisse-2026-10-17_2026-10-17.csv')
    expect(rows[0]).toBe('"N°";"Date et heure";"Table";"Vendeur";"Moyen déclaré de la vente";"Ventes HT avant avoirs";"TVA des ventes";"Ventes TTC avant avoirs";"Détail"')
    expect(rows).toHaveLength(4)
    expect(rows[1]).toContain(';"Table FICTIVE";"Inconnu";"Espèces";8,76;1,49;10,25;"1x Article FICTIF 1"')
    expect(rows[2]).toContain(';"";"Inconnu";"Carte";4,06;0,69;4,75;"1x Article FICTIF 2"')
    expect(rows[3]).toContain(';"";"Inconnu";"Non précisé";5,21;0,89;6,1;"1x Article FICTIF 3"')
    expect(requests).toEqual([{ method: 'get', url: '/rapports-caisse' }])
  })

  it('prépare un mailto honnête et un rapport imprimable sans envoyer de mail ni retraiter les ventes', async () => {
    await mount()
    await act(async () => { button('Envoyer par e-mail').props.onClick() })
    const mail = new URL(window.location.href), body = mail.searchParams.get('body')!
    expect(mail.protocol).toBe('mailto:')
    expect(body).toContain('Ventes finalisées : 3')
    expect(body).toMatch(/Ventes TTC avant avoirs : 21,10\s*€/)
    expect(body).toMatch(/TVA des ventes : 3,07\s*€/)
    expect(body).toContain('pas la trésorerie nette')
    expect(body).toContain('acomptes')
    expect(body).not.toMatch(/Ventes encaissées|Total encaissé|Dont TVA/)
    await act(async () => { button('Imprimer').props.onClick() })
    expect(print).toHaveBeenCalledOnce()
    expect(text(reportContent())).toContain('pas la trésorerie nette')
    expect(text(reportContent())).toMatch(/Ventes TTC avant avoirs21,10\s*€/)
    expect(downloads).toHaveLength(1)
    expect(requests).toEqual([{ method: 'get', url: '/rapports-caisse' }])
  })

  it('une période sans vente finalisée ne promet pas l’absence d’acompte ou autre mouvement', async () => {
    report = { ...report, nbVentes: 0, totalTTC: 0, totalHT: 0, totalTva: 0, panierMoyen: 0,
      parMethode: {}, parVendeur: {}, parJour: [], topProduits: [], ventes: [] }
    await mount()
    expect(text(reportContent())).toContain('Aucune vente finalisée sur cette période')
    expect(text(reportContent())).not.toContain("Rien n'a été encaissé")
    expect(text(reportContent())).toContain('acomptes')
    expect(button('Télécharger (Excel)').props.disabled).toBe(true)
    expect(button('Envoyer par e-mail').props.disabled).toBe(true)
    expect(requests).toEqual([{ method: 'get', url: '/rapports-caisse' }])
  })

  it('conserve le refus propriétaire sans rapport, rapprochement ou export accessibles', async () => {
    reportStatus = 403
    await mount()
    expect(text(renderer!.root)).toContain('Réservé au propriétaire')
    expect(renderer!.root.findAllByProps({ className: 'rapport' })).toHaveLength(0)
    expect(renderer!.root.findAllByType('button')).toHaveLength(0)
    expect(downloads).toEqual([])
    expect(requests).toEqual([{ method: 'get', url: '/rapports-caisse' }])
  })
})
