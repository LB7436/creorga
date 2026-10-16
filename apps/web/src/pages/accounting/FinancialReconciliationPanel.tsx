import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
export default function FinancialReconciliationPanel({ start, end }: { start?: string; end?: string }) {
  const company = useAuthStore(s => s.companyId), actor = useAuthStore(s => s.user?.id), [open, setOpen] = useState(false), [error, setError] = useState('')
  const params = { startDate: start, endDate: end }
  const report = useQuery<any>({ queryKey: ['financial-reconciliation', company, actor, start, end], enabled: open, queryFn: () => api.get('/accounting/reconciliation', { params }).then(r => r.data) })
  async function download() {
    try {
      const r = await api.get('/accounting/reconciliation', { params: { ...params, format: 'csv' }, responseType: 'blob' }), url = URL.createObjectURL(r.data), a = document.createElement('a')
      a.href = url; a.download = 'rapprochement-creorga-v1.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setError('Export non produit : vérifiez le périmètre et vos droits.') }
  }
  const t = report.data?.totals, euro = (c: number) => (c / 100).toFixed(2) + ' €'
  return <section aria-label="Rapprochement financier" style={{ padding: 18, border: '1px solid #64748b', borderRadius: 12, margin: '18px 0' }}>
    <button onClick={() => setOpen(!open)} style={{ padding: 12 }}>{open ? 'Masquer' : 'Ouvrir'} le rapprochement financier</button>
    {open && <><p>Ventes finalisées, documents et trésorerie séparés. Export technique à qualifier avec votre comptable, pas une déclaration fiscale.</p>
      {report.isLoading && <p>Lecture des journaux…</p>}{report.isError && <p role="alert">Rapprochement incomplet : aucun résultat validé.</p>}
      {t && <><dl><dt>Ventes finalisées TTC (commandes payées)</dt><dd>{euro(t.finalizedSalesCents)}</dd><dt>TVA de ces ventes</dt><dd>{euro(t.salesTaxCents)}</dd><dt>Avoirs documentaires (distincts)</dt><dd>{euro(t.creditDocumentsCents)}</dd><dt>Encaissements enregistrés</dt><dd>{euro(t.receiptsCents)}</dd><dt>Remboursements déclarés</dt><dd>{euro(t.declaredRefundsCents)}</dd><dt>Remboursements vérifiés prestataire</dt><dd>{euro(t.verifiedRefundsCents)}</dd><dt>Remboursements réservés / incertains</dt><dd>{euro(t.heldRefundsCents)}</dd><dt>Frais prestataire</dt><dd>{euro(t.knownFeesCents)} connus ; {t.unknownFeesCount} capture(s) aux frais inconnus</dd><dt>Versements bancaires</dt><dd>Non intégrés — inconnus, pas zéro</dd></dl>
        <p>{report.data.issues.length ? `Anomalies à rapprocher : ${report.data.issues.join(', ')}` : 'Aucune incohérence détectée par ces contrôles limités.'}</p>
        <button onClick={() => void download()} style={{ padding: 12 }}>Exporter le rapprochement CSV v1</button><p>{report.data.warning}</p></>}
    </>}{error && <p role="alert">{error}</p>}
  </section>
}
