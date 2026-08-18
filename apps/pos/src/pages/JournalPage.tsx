import { useState } from 'react'
import { motion } from 'framer-motion'
import { usePOS, type Cloture } from '../store/posStore'

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
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms))

const dateComplete = (ms: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms))

const NOM_METHODE: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte',
  contactless: 'Sans contact',
}

export default function JournalPage({ onExit }: { onExit: () => void }) {
  const ventes = usePOS(s => s.ventes)
  const clotures = usePOS(s => s.clotures)
  const cloturerJournee = usePOS(s => s.cloturerJournee)
  const [confirmation, setConfirmation] = useState(false)
  const [ticket, setTicket] = useState<Cloture | null>(null)

  const totalTTC = ventes.reduce((s, v) => s + v.total - v.pourboire, 0)
  const totalPourboires = ventes.reduce((s, v) => s + v.pourboire, 0)
  const totalTva = ventes.reduce((s, v) => s + v.tva, 0)

  function cloturer() {
    const z = cloturerJournee()
    setConfirmation(false)
    if (z) setTicket(z)
  }

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

          <Ligne libelle="Total hors taxes" valeur={euro(ticket.totalHT)} />
          <Ligne libelle="dont TVA" valeur={euro(ticket.totalTva)} />
          {/* Les remises sont visibles sur le Z : sans cette ligne, un CA
              inférieur à la somme des additions paraît inexplicable. Elles
              n'apparaissent que si elles existent — pas de ligne à 0,00 €
              qui ferait croire à un rabais systématique. */}
          {(ticket.totalRemises ?? 0) > 0 && (
            <Ligne libelle="dont remises accordées" valeur={`− ${euro(ticket.totalRemises)}`} />
          )}
          <Ligne libelle="Chiffre d'affaires TTC" valeur={euro(ticket.totalTTC)} fort />
          <div style={separateur} />
          <Ligne libelle="Espèces" valeur={euro(ticket.parMethode.cash)} />
          <Ligne libelle="Carte" valeur={euro(ticket.parMethode.card)} />
          <Ligne libelle="Sans contact" valeur={euro(ticket.parMethode.contactless)} />
          <div style={separateur} />
          <Ligne libelle="Pourboires" valeur={euro(ticket.totalPourboires)} />
          {(ticket.totalArrondisCaritatifs ?? 0) > 0 && (
            <Ligne libelle="Arrondis caritatifs (à reverser)" valeur={euro(ticket.totalArrondisCaritatifs)} />
          )}

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
          <div style={{ fontSize: 12, color: '#64748b' }}>Journée en cours</div>
        </div>
      </div>

      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        <Tuile libelle="Encaissé" valeur={euro(totalTTC)} accent="#22c55e" />
        <Tuile libelle="dont TVA" valeur={euro(totalTva)} />
        <Tuile libelle="Pourboires" valeur={euro(totalPourboires)} />
        <Tuile libelle="Ventes" valeur={String(ventes.length)} />
      </div>

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
                  {heure(v.horodatage)} · {NOM_METHODE[v.methode] || v.methode} · {v.vendeur}
                  {v.pourboire > 0 && ` · pourboire ${euro(v.pourboire)}`}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>{euro(v.total)}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Clôture */}
      <div style={{ marginTop: 20 }}>
        {confirmation ? (
          <div style={{ ...carte, borderColor: 'rgba(245,158,11,0.4)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Clôturer la journée ?</div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.6 }}>
              Les {ventes.length} vente{ventes.length > 1 ? 's' : ''} de la journée seront regroupées
              dans un ticket Z conservé, et le journal repartira à zéro. Rien n'est supprimé.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmation(false)} style={bouton}>Annuler</button>
              <button onClick={cloturer} style={{ ...bouton, ...boutonPlein }}>Clôturer</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmation(true)}
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
      </div>

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
