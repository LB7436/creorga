import { useMemo, useState } from 'react'
import { Download, Printer, Mail, CalendarRange, Lock } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { toastInfo } from '@/lib/toast'
import { useRapportCaisse, type RapportCaisse } from '@/hooks/api/useRapportsCaisse'

/**
 * Extraits de caisse.
 *
 * Cette page affichait cinq tableaux écrits en dur — indicateurs, chiffre
 * d'affaires quotidien, répartition par catégorie, top produits, historique
 * mensuel — sans le moindre appel au serveur. Les chiffres ne bougeaient
 * jamais, quel que soit l'établissement ou la période.
 *
 * Elle interroge maintenant les commandes réellement encaissées, sur la
 * période demandée, à la minute près. La route serveur est réservée au
 * propriétaire.
 */

// ─── Périodes ───────────────────────────────────────────────────────────────

type Preset = 'jour' | 'hier' | 'semaine' | 'mois' | 'trimestre' | 'annee' | 'libre'

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'hier', label: 'Hier' },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'mois', label: 'Ce mois' },
  { id: 'trimestre', label: 'Ce trimestre' },
  { id: 'annee', label: 'Cette année' },
  { id: 'libre', label: 'Période précise…' },
]

function debutDeJour(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function finDeJour(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

/** Bornes d'un raccourci. La semaine commence le lundi (usage européen). */
function bornes(preset: Preset): { debut: Date; fin: Date } {
  const maintenant = new Date()
  switch (preset) {
    case 'hier': {
      const h = new Date(maintenant); h.setDate(h.getDate() - 1)
      return { debut: debutDeJour(h), fin: finDeJour(h) }
    }
    case 'semaine': {
      const d = new Date(maintenant)
      const jour = (d.getDay() + 6) % 7 // 0 = lundi
      d.setDate(d.getDate() - jour)
      return { debut: debutDeJour(d), fin: maintenant }
    }
    case 'mois':
      return { debut: debutDeJour(new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)), fin: maintenant }
    case 'trimestre': {
      const moisDebut = Math.floor(maintenant.getMonth() / 3) * 3
      return { debut: debutDeJour(new Date(maintenant.getFullYear(), moisDebut, 1)), fin: maintenant }
    }
    case 'annee':
      return { debut: debutDeJour(new Date(maintenant.getFullYear(), 0, 1)), fin: maintenant }
    default:
      return { debut: debutDeJour(maintenant), fin: maintenant }
  }
}

/** Format attendu par <input type="datetime-local"> : heure LOCALE. */
function pourChamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// ─── Formats ────────────────────────────────────────────────────────────────

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

const dateHeure = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))

const jourLisible = (aaaammjj: string) => {
  const [a, m, j] = aaaammjj.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(a, m - 1, j))
}

const NOM_METHODE: Record<string, string> = {
  cash: 'Espèces', CASH: 'Espèces',
  card: 'Carte', CARD: 'Carte',
  contactless: 'Sans contact',
  transfer: 'Virement', TRANSFER: 'Virement',
  'non précisé': 'Non précisé',
}
const nomMethode = (m: string) => NOM_METHODE[m] || m

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RapportsPage() {
  const [preset, setPreset] = useState<Preset>('jour')
  const initial = bornes('jour')
  const [debutLibre, setDebutLibre] = useState(pourChamp(initial.debut))
  const [finLibre, setFinLibre] = useState(pourChamp(initial.fin))

  const { debut, fin } = useMemo(() => {
    if (preset !== 'libre') return bornes(preset)
    const d = new Date(debutLibre)
    const f = new Date(finLibre)
    return {
      debut: Number.isNaN(d.getTime()) ? null : d,
      fin: Number.isNaN(f.getTime()) ? null : f,
    }
  }, [preset, debutLibre, finLibre])

  const { data, isLoading, error } = useRapportCaisse(debut, fin)
  const statut = (error as any)?.response?.status
  const messageServeur = (error as any)?.response?.data?.error

  const libellePeriode = debut && fin
    ? `${dateHeure(debut.toISOString())} — ${dateHeure(fin.toISOString())}`
    : 'Période incomplète'

  // ── Actions

  function telecharger() {
    if (!data) return
    downloadCsv(
      `extrait-caisse-${data.debut.slice(0, 10)}_${data.fin.slice(0, 10)}.csv`,
      ['N°', 'Date et heure', 'Table', 'Vendeur', 'Paiement', 'Total HT', 'TVA', 'Total TTC', 'Détail'],
      data.ventes.map((v) => [
        v.numero,
        dateHeure(v.horodatage),
        v.table || '',
        v.vendeur,
        nomMethode(v.methode),
        v.sousTotal,
        v.tva,
        v.total,
        v.lignes.map((l) => `${l.quantite}x ${l.nom}`).join(' | '),
      ]),
    )
  }

  function envoyerParEmail() {
    if (!data) return
    // L'envoi depuis le serveur est impossible : aucun domaine d'expédition
    // n'est configuré. Plutôt qu'un bouton qui affiche « envoyé » sans rien
    // envoyer, on ouvre la messagerie de l'utilisateur avec le récapitulatif
    // déjà rédigé, et on télécharge le détail pour qu'il soit joint.
    const corps = [
      `Extrait de caisse`,
      `Période : ${libellePeriode}`,
      ``,
      `Ventes encaissées : ${data.nbVentes}`,
      `Total TTC : ${euro(data.totalTTC)}`,
      `Dont TVA : ${euro(data.totalTva)}`,
      `Total HT : ${euro(data.totalHT)}`,
      `Panier moyen : ${euro(data.panierMoyen)}`,
      ``,
      `Répartition par moyen de paiement :`,
      ...Object.entries(data.parMethode).map(([m, v]) => `  ${nomMethode(m)} : ${euro(v.total)} (${v.nb})`),
      ``,
      `Le détail ligne à ligne est dans le fichier CSV téléchargé avec ce message.`,
    ].join('\n')

    telecharger()
    window.location.href =
      `mailto:?subject=${encodeURIComponent(`Extrait de caisse — ${libellePeriode}`)}&body=${encodeURIComponent(corps)}`
    toastInfo("Le détail a été téléchargé : joignez-le au message qui vient de s'ouvrir.")
  }

  // ── Accès refusé (la route est réservée au propriétaire)

  if (statut === 403) {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', textAlign: 'center', color: '#cbd5e1' }}>
        <Lock size={34} style={{ color: '#f59e0b', marginBottom: 14 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Réservé au propriétaire</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#94a3b8', margin: 0 }}>
          Les extraits de caisse contiennent le chiffre d'affaires et les totaux de TVA de
          l'établissement. Seul le compte propriétaire peut les consulter.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', color: '#e2e8f0' }}>
      <style>{`
        @media print {
          /* À l'impression : ne garder que le rapport. Les boutons et la
             barre latérale n'ont aucun sens sur une feuille. */
          aside, nav, button, .sans-impression { display: none !important; }
          body, .rapport { background: #fff !important; color: #000 !important; }
          .rapport * { color: #000 !important; border-color: #ccc !important; }
          .carte { break-inside: avoid; background: #fff !important; }
        }
      `}</style>

      <div className="sans-impression" style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Extraits de caisse</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Ventes réellement encaissées, à la minute près. Réservé au propriétaire.
        </p>
      </div>

      {/* Sélecteur de période */}
      <div className="sans-impression" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            style={{
              padding: '8px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.12)',
              background: preset === p.id ? '#6366f1' : 'rgba(255,255,255,0.04)',
              color: preset === p.id ? '#fff' : '#cbd5e1',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'libre' && (
        <div className="sans-impression" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>
            Du (date et heure)
            <input
              type="datetime-local"
              value={debutLibre}
              onChange={(e) => setDebutLibre(e.target.value)}
              style={champ}
            />
          </label>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>
            Au (date et heure)
            <input
              type="datetime-local"
              value={finLibre}
              onChange={(e) => setFinLibre(e.target.value)}
              style={champ}
            />
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="sans-impression" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={telecharger} disabled={!data?.nbVentes} style={bouton(!data?.nbVentes)}>
          <Download size={14} /> Télécharger (Excel)
        </button>
        <button onClick={() => window.print()} disabled={!data?.nbVentes} style={bouton(!data?.nbVentes)}>
          <Printer size={14} /> Imprimer
        </button>
        <button onClick={envoyerParEmail} disabled={!data?.nbVentes} style={bouton(!data?.nbVentes)}>
          <Mail size={14} /> Envoyer par e-mail
        </button>
      </div>

      {/* Contenu */}
      <div className="rapport">
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarRange size={15} /> {libellePeriode}
        </div>

        {isLoading && <p style={{ color: '#94a3b8' }}>Calcul de l'extrait…</p>}

        {error && statut !== 403 && (
          <div style={{ ...carte, borderColor: 'rgba(239,68,68,0.4)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Extrait indisponible</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              {messageServeur || "Le serveur n'a pas pu produire cet extrait."}
            </div>
          </div>
        )}

        {data && <Contenu data={data} />}
      </div>
    </div>
  )
}

// ─── Contenu du rapport ─────────────────────────────────────────────────────

function Contenu({ data }: { data: RapportCaisse }) {
  if (data.nbVentes === 0) {
    return (
      <div style={{ ...carte, textAlign: 'center', padding: '44px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🧾</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Aucune vente sur cette période</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
          Rien n'a été encaissé entre ces deux dates.
        </div>
      </div>
    )
  }

  const maxJour = Math.max(...data.parJour.map((j) => j.total), 1)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
        <Tuile libelle="Total encaissé" valeur={euro(data.totalTTC)} accent="#22c55e" />
        <Tuile libelle="Total hors taxes" valeur={euro(data.totalHT)} />
        <Tuile libelle="dont TVA" valeur={euro(data.totalTva)} />
        <Tuile libelle="Ventes" valeur={String(data.nbVentes)} />
        <Tuile libelle="Panier moyen" valeur={euro(data.panierMoyen)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 20 }}>
        <div className="carte" style={carte}>
          <Titre>Par moyen de paiement</Titre>
          {Object.entries(data.parMethode).map(([m, v]) => (
            <LigneCle key={m} gauche={`${nomMethode(m)} (${v.nb})`} droite={euro(v.total)} />
          ))}
        </div>

        <div className="carte" style={carte}>
          <Titre>Par vendeur</Titre>
          {Object.entries(data.parVendeur).map(([nom, v]) => (
            <LigneCle key={nom} gauche={`${nom} (${v.nb})`} droite={euro(v.total)} />
          ))}
        </div>
      </div>

      {data.parJour.length > 1 && (
        <div className="carte" style={{ ...carte, marginBottom: 20 }}>
          <Titre>Jour par jour</Titre>
          {data.parJour.map((j) => (
            <div key={j.date} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: '#94a3b8', width: 110, flexShrink: 0 }}>{jourLisible(j.date)}</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(j.total / maxJour) * 100}%`, height: '100%', background: '#6366f1' }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, width: 90, textAlign: 'right' }}>{euro(j.total)}</span>
              <span style={{ fontSize: 11, color: '#64748b', width: 62, textAlign: 'right' }}>{j.nb} vente{j.nb > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {data.topProduits.length > 0 && (
        <div className="carte" style={{ ...carte, marginBottom: 20 }}>
          <Titre>Produits les plus vendus</Titre>
          {data.topProduits.map((p) => (
            <LigneCle key={p.nom} gauche={`${p.quantite} × ${p.nom}`} droite={euro(p.total)} />
          ))}
        </div>
      )}

      <div className="carte" style={carte}>
        <Titre>Détail des ventes ({data.ventes.length})</Titre>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                <th style={cellule}>N°</th>
                <th style={cellule}>Date et heure</th>
                <th style={cellule}>Table</th>
                <th style={cellule}>Vendeur</th>
                <th style={cellule}>Paiement</th>
                <th style={{ ...cellule, textAlign: 'right' }}>HT</th>
                <th style={{ ...cellule, textAlign: 'right' }}>TVA</th>
                <th style={{ ...cellule, textAlign: 'right' }}>TTC</th>
              </tr>
            </thead>
            <tbody>
              {data.ventes.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={cellule}>{v.numero}</td>
                  <td style={cellule}>{dateHeure(v.horodatage)}</td>
                  <td style={cellule}>{v.table || '—'}</td>
                  <td style={cellule}>{v.vendeur}</td>
                  <td style={cellule}>{nomMethode(v.methode)}</td>
                  <td style={{ ...cellule, textAlign: 'right' }}>{euro(v.sousTotal)}</td>
                  <td style={{ ...cellule, textAlign: 'right' }}>{euro(v.tva)}</td>
                  <td style={{ ...cellule, textAlign: 'right', fontWeight: 700 }}>{euro(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ─── Petits composants et styles ────────────────────────────────────────────

const Titre = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
    {children}
  </div>
)

function Tuile({ libelle, valeur, accent }: { libelle: string; valeur: string; accent?: string }) {
  return (
    <div className="carte" style={{ ...carte, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{libelle}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: accent || '#e2e8f0' }}>{valeur}</div>
    </div>
  )
}

function LigneCle({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: '#cbd5e1' }}>{gauche}</span>
      <span style={{ fontWeight: 700 }}>{droite}</span>
    </div>
  )
}

const carte: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 18,
}

const cellule: React.CSSProperties = { padding: '7px 10px', whiteSpace: 'nowrap' }

const champ: React.CSSProperties = {
  display: 'block', marginTop: 5, padding: '9px 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
  color: '#e2e8f0', fontSize: 13, colorScheme: 'dark',
}

const bouton = (desactive?: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
  border: '1px solid rgba(255,255,255,0.12)',
  background: desactive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
  color: desactive ? '#64748b' : '#e2e8f0',
  cursor: desactive ? 'not-allowed' : 'pointer',
})
