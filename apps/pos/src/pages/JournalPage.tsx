import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { usePOS, type Cloture } from '../store/posStore'
import { closeServerDay } from '../lib/floorBridge'
import { sessionCompany, sessionGeneration } from '../lib/server'
import { hasCapability } from '../lib/business-access'
import { BusinessGuard } from '../components/BusinessGuard'

/**
 * Journal des ventes et clôture de journée (ticket Z).
 *
 * La caisse n'enregistrait AUCUNE vente : `CashDrawer.totalSales` n'était
 * jamais alimenté, il n'existait ni journal, ni clôture, ni ticket Z. Aucune
 * comptabilité n'était possible, et rien ne permettait de savoir ce qui avait
 * été encaissé dans la journée.
 *
 * Cet écran montre ce qui a réellement été vendu, et permet d'arrêter la
 * journée. Une clôture ne supprime rien : elle déplace les ventes dans une
 * pièce conservée.
 */

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

const heure = (ms: number) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Luxembourg', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))

const dateComplete = (ms: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Luxembourg', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))

const NOM_METHODE: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte',
  contactless: 'Sans contact',
  GIFT_CARD: 'Carte cadeau prépayée',
}

const journalScope = () => {
  const staff = usePOS.getState().currentStaff
  return JSON.stringify([sessionGeneration(), sessionCompany(), staff?.id, staff?.role, usePOS.getState().businessAccess?.revision])
}

export default function JournalPage(props: { onExit: () => void }) {
  // Les confirmations, tickets et erreurs appartiennent à cette identité seulement.
  const staff = usePOS(s => s.currentStaff)
  const access = usePOS(s => s.businessAccess)
  const scope = JSON.stringify([sessionGeneration(), sessionCompany(), staff?.id, staff?.role, access?.revision])
  return <BusinessGuard capability="finance.revenue.read" onBack={props.onExit}><ScopedJournalPage key={scope} scope={scope} {...props} /></BusinessGuard>
}

function ScopedJournalPage({ onExit, scope }: { onExit: () => void; scope: string }) {
  const ventes = usePOS(s => s.ventes)
  const clotures = usePOS(s => s.clotures)
  const access = usePOS(s => s.businessAccess)
  const financialDataReady = usePOS(s => s.financialDataReady)
  const canClose = hasCapability('cash.close', access)
  // Sans URL de gestion configurée, seul le laboratoire local connaît son port.
  const backoffice = import.meta.env.VITE_BACKOFFICE_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? `${window.location.protocol}//${window.location.hostname}:5174` : '')
  const invoiceUrl = (id: string) => {
    try {
      const url = new URL('/invoices/factures', backoffice)
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
      url.searchParams.set('receipt', id)
      return url.href
    } catch { return null }
  }
  const reconciliationUrl = (() => {
    try {
      const url = new URL('/accounting/rapports', backoffice)
      return url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) ? url.href : null
    } catch { return null }
  })()
  const [closing, setClosing] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [ticket, setTicket] = useState<Cloture | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const closingRef = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const isCurrent = () => mounted.current && scope === journalScope()

  const totalTTC = ventes.reduce((s, v) => s + v.total - v.pourboire - (v.arrondiCaritatif || 0), 0)
  const totalPourboires = ventes.reduce((s, v) => s + v.pourboire, 0)
  const totalTva = ventes.reduce((s, v) => s + v.tva, 0)
  const financialNotice = <aside aria-label="Périmètre financier du journal" style={{ ...carte, color: '#94a3b8', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
    <p style={{ margin: '0 0 8px' }}>Ventes finalisées, hors pourboires et arrondis caritatifs, avant les avoirs. Ce journal n’est pas le solde de trésorerie : acomptes, avoirs et remboursements sont à rapprocher séparément.</p>
    <p style={{ margin: '0 0 8px' }}>Le registre non archivé peut couvrir plusieurs dates : il ne correspond ni au chiffre d’affaires du jour civil, ni à la clôture du tiroir. Dates affichées en Europe/Luxembourg.</p>
    {canClose && reconciliationUrl ? <a href={reconciliationUrl} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc' }}>Ouvrir le rapprochement financier</a>
      : <span>Demandez au responsable de consulter Comptabilité → Rapports → Rapprochement financier.</span>}
  </aside>

  async function cloturer() {
    if (closingRef.current || !isCurrent() || !hasCapability('cash.close')) return
    // Un second clic peut arriver avant le prochain rendu React.
    closingRef.current = true
    setCloseError(null)
    setClosing(true)
    try {
      const z = await closeServerDay()
      if (isCurrent()) { setConfirmation(false); setTicket(z) }
    } catch (e: unknown) {
      if (isCurrent()) {
        setCloseError(e instanceof Error ? e.message : 'Le serveur n’a pas confirmé la clôture.')
        setConfirmation(false)
      }
    } finally {
      closingRef.current = false
      if (isCurrent()) setClosing(false)
    }
  }

  if (!financialDataReady) return <section role="status" style={fond}>
    <button onClick={onExit} style={bouton}>← Retour</button>
    <p>Actualisation des données financières autorisées en attente. Aucun total nul n’est déduit d’un cache vide.</p>
  </section>

  // ─── Ticket Z affiché après clôture ───────────────────────────────────────
  if (ticket) {
    return (
      <div style={fond}>
        <div style={{ ...carte, maxWidth: 460, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 13, letterSpacing: 2, color: '#94a3b8' }}>TICKET Z</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {dateComplete(ticket.horodatage)}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Depuis {heure(ticket.debut)} · {ticket.nbVentes} vente{ticket.nbVentes > 1 ? 's' : ''}
            </div>
          </div>

          <Ligne libelle="Ventes HT avant avoirs" valeur={euro(ticket.totalHT)} />
          <Ligne libelle="TVA des ventes" valeur={euro(ticket.totalTva)} />
          {/* Les remises sont visibles sur le Z : sans cette ligne, un CA
              inférieur à la somme des additions paraît inexplicable. Elles
              n'apparaissent que si elles existent — pas de ligne à 0,00 €
              qui ferait croire à un rabais systématique. */}
          {(ticket.totalRemises ?? 0) > 0 && (
            <Ligne libelle="dont remises accordées" valeur={`− ${euro(ticket.totalRemises)}`} />
          )}
          <Ligne libelle="Ventes TTC avant avoirs" valeur={euro(ticket.totalTTC)} fort />
          <div style={separateur} />
          <Ligne libelle="Espèces" valeur={euro(ticket.parMethode.cash)} />
          <Ligne libelle="Carte" valeur={euro(ticket.parMethode.card)} />
          <Ligne libelle="Sans contact" valeur={euro(ticket.parMethode.contactless)} />
          {(ticket.parMethode.GIFT_CARD || 0) > 0 && <Ligne libelle="Crédit cadeau consommé" valeur={euro(ticket.parMethode.GIFT_CARD)} />}
          <div style={separateur} />
          <Ligne libelle="Pourboires" valeur={euro(ticket.totalPourboires)} />
          {(ticket.totalArrondisCaritatifs ?? 0) > 0 && (
            <Ligne libelle="Arrondis caritatifs (à reverser)" valeur={euro(ticket.totalArrondisCaritatifs)} />
          )}
          {financialNotice}

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={() => window.print()} style={{ ...bouton, flex: 1 }}>Imprimer</button>
            <button onClick={() => setTicket(null)} style={{ ...bouton, ...boutonPlein, flex: 1 }}>Terminé</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={fond}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={onExit} style={bouton}>← Retour</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Journal des ventes</h1>
          <div style={{ fontSize: 12, color: '#64748b' }}>Ventes non archivées dans un ticket Z</div>
        </div>
      </div>

      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        <Tuile libelle="Ventes TTC avant avoirs" valeur={euro(totalTTC)} accent="#22c55e" />
        <Tuile libelle="TVA des ventes" valeur={euro(totalTva)} />
        <Tuile libelle="Pourboires" valeur={euro(totalPourboires)} />
        <Tuile libelle="Ventes" valeur={String(ventes.length)} />
      </div>
      {financialNotice}

      {ventes.length === 0 ? (
        <div style={{ ...carte, textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>Aucune vente enregistrée</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Les ventes apparaissent ici dès qu'une table est encaissée.
          </div>
        </div>
      ) : (
        <div style={carte}>
          {ventes.map(v => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', width: 46, flexShrink: 0 }}>
                #{v.numero}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {v.tableName}
                  <span style={{ fontWeight: 400, color: '#64748b' }}> · {v.couverts.join(', ')}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {v.lignes.map(l => `${l.qty}× ${l.name}`).join(', ')}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {dateComplete(v.horodatage)} · {v.vendeur}
                  {v.pourboire > 0 && ` · pourboire ${euro(v.pourboire)}`}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {Array.isArray(v.reglements) && v.reglements.length > 0 ? <>
                    <div>Ventilation enregistrée : {v.reglements.map(part => `${NOM_METHODE[part.methode] || part.methode} ${euro(part.montant)}`).join(' · ')}</div>
                    {v.reglements.some(part => part.methode === 'card' || part.methode === 'contactless') && <div>Confirmation bancaire non vérifiée ici</div>}
                  </> : <div>Ventilation non renseignée · Moyen principal historique : {NOM_METHODE[v.methode] || v.methode}</div>}
                </div>
                {hasCapability('invoices.read', access) && invoiceUrl(v.id) && <a href={invoiceUrl(v.id)!} aria-label={`Facture société du ticket ${v.numero}`} style={{ color: '#a5b4fc', display: 'inline-block', padding: '10px 0', fontSize: 13 }}>Facture société →</a>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{euro(v.total)}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Clôture */}
      {canClose && <div style={{ marginTop: 20 }}>
        {closeError && <div role="alert" style={{ ...carte, borderColor: '#f87171', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Clôture non confirmée</div>
          <div style={{ marginTop: 6 }}>{closeError}</div>
          <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>Vérifiez le résultat serveur avant de réessayer. La référence de reprise est conservée.</div>
        </div>}
        {confirmation ? (
          <div style={{ ...carte, borderColor: 'rgba(245,158,11,0.4)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Clôturer la journée ?</div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.6 }}>
              Les {ventes.length} vente{ventes.length > 1 ? 's' : ''} de la journée seront regroupées
              dans un ticket Z conservé, et le journal repartira à zéro. Rien n'est supprimé.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={closing} onClick={() => setConfirmation(false)} style={bouton}>Annuler</button>
              <button disabled={closing} onClick={cloturer} style={{ ...bouton, ...boutonPlein }}>{closing ? 'Clôture en cours…' : 'Clôturer'}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { if (isCurrent()) { setCloseError(null); setConfirmation(true) } }}
            disabled={ventes.length === 0}
            style={{
              ...bouton,
              ...(ventes.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : boutonPlein),
              width: '100%', padding: '14px',
            }}
          >
            Clôturer la journée (ticket Z)
          </button>
        )}
      </div>}

      {/* Clôtures passées */}
      {clotures.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, letterSpacing: 1 }}>
            CLÔTURES PRÉCÉDENTES
          </div>
          <div style={carte}>
            {clotures.slice(0, 10).map(c => (
              <button
                key={c.id}
                onClick={() => setTicket(c)}
                style={{
                  display: 'flex', width: '100%', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0', background: 'none',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: '#e2e8f0', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13 }}>
                  {dateComplete(c.horodatage)}
                  <span style={{ color: '#64748b' }}> · {c.nbVentes} vente{c.nbVentes > 1 ? 's' : ''}</span>
                </span>
                <span style={{ fontWeight: 700 }}>{euro(c.totalTTC)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Petits composants ──────────────────────────────────────────────────────

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: fort ? 14 : 13, color: fort ? '#e2e8f0' : '#94a3b8', fontWeight: fort ? 700 : 400 }}>
        {libelle}
      </span>
      <span style={{ fontSize: fort ? 16 : 13, fontWeight: fort ? 800 : 600 }}>{valeur}</span>
    </div>
  )
}

function Tuile({ libelle, valeur, accent }: { libelle: string; valeur: string; accent?: string }) {
  return (
    <div style={{ ...carte, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 0.5 }}>{libelle}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: accent || '#e2e8f0' }}>{valeur}</div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const fond: React.CSSProperties = {
  minHeight: '100vh', background: '#07070d', color: '#e2e8f0',
  padding: '24px 20px', overflowY: 'auto',
}

const carte: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14, padding: 18,
}

const separateur: React.CSSProperties = {
  height: 1, background: 'rgba(255,255,255,0.08)', margin: '10px 0',
}

const bouton: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', cursor: 'pointer',
}

const boutonPlein: React.CSSProperties = {
  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff',
}
