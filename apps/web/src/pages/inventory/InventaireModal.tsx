import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, X, Search, ArrowUpDown, Check, AlertTriangle,
  Download, Printer, ChevronRight, ChevronLeft, RotateCcw, PackageCheck,
} from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { imprimerHtml, tableauHtml, echapperHtml } from '@/lib/impression'

/**
 * Inventaire physique — reprend le déroulé d'un « document d'inventaire » SAP :
 *
 *   1. Périmètre  : on fige la liste des articles à compter (tout, ou filtré
 *                   par catégorie / emplacement). C'est le document.
 *   2. Comptage   : saisie du stock physique réellement trouvé, article par
 *                   article. Le stock système reste affiché à côté, jamais
 *                   modifié à ce stade — c'est ce qui rend l'écart auditable.
 *   3. Validation : on poste les différences. Le stock système est aligné sur
 *                   le comptage, et chaque écart est remonté à l'appelant.
 *
 * La règle importante : **un article non compté n'est pas un article à zéro**.
 * Compter zéro est une décision (rupture constatée) ; ne pas compter en est
 * une autre (article non visité). Les confondre ferait disparaître du stock
 * réel à chaque inventaire partiel. Les deux cas sont donc distincts partout.
 */

/** Forme minimale attendue — évite de coupler ce composant au type de StockPage. */
export interface ArticleInventoriable {
  id: string
  nom: string
  categorie: string
  location: string
  stockActuel: number
  unite: string
  cogs: number
}

export interface EcartInventaire {
  id: string
  nom: string
  systeme: number
  compte: number
  ecart: number
  ecartValeur: number
}

type Etape = 'perimetre' | 'comptage' | 'recap'
type Tri = 'nom' | 'categorie' | 'emplacement' | 'systeme' | 'ecart' | 'ecartValeur'
type FiltreComptage = 'tous' | 'non_comptes' | 'ecarts'

const C = {
  carte: '#ffffff',
  bord: '#e2e8f0',
  texte: '#0f172a',
  discret: '#64748b',
  accent: '#92400E',
  accentDoux: '#fef3c7',
  vert: '#16a34a',
  rouge: '#dc2626',
  orange: '#f59e0b',
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

export default function InventaireModal({
  articles,
  onClose,
  onToast,
  onValider,
}: {
  articles: ArticleInventoriable[]
  onClose: () => void
  onToast: (m: string) => void
  /** Persiste les écarts. Reçoit uniquement les articles réellement modifiés. */
  onValider: (ecarts: EcartInventaire[]) => Promise<void> | void
}) {
  const [etape, setEtape] = useState<Etape>('perimetre')
  const [nomSession] = useState(
    () => `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
  )

  const [categorie, setCategorie] = useState<string>('')
  const [emplacement, setEmplacement] = useState<string>('')

  /** id -> valeur saisie. Clé absente = non compté (≠ compté à zéro). */
  const [comptages, setComptages] = useState<Record<string, string>>({})
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<Tri>('nom')
  const [sensAsc, setSensAsc] = useState(true)
  const [filtre, setFiltre] = useState<FiltreComptage>('tous')
  const [enCours, setEnCours] = useState(false)

  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.categorie))].sort(),
    [articles],
  )
  const emplacements = useMemo(
    () => [...new Set(articles.map((a) => a.location))].sort(),
    [articles],
  )

  const perimetre = useMemo(
    () =>
      articles.filter(
        (a) =>
          (!categorie || a.categorie === categorie) &&
          (!emplacement || a.location === emplacement),
      ),
    [articles, categorie, emplacement],
  )

  const lignes = useMemo(() => {
    return perimetre.map((a) => {
      const saisie = comptages[a.id]
      const estCompte = saisie !== undefined && saisie !== ''
      const compte = estCompte ? Number(String(saisie).replace(',', '.')) : null
      const valide = compte !== null && Number.isFinite(compte) && compte >= 0
      const ecart = valide ? (compte as number) - a.stockActuel : 0
      return {
        article: a,
        estCompte,
        saisieInvalide: estCompte && !valide,
        compte: valide ? (compte as number) : null,
        ecart,
        ecartValeur: ecart * a.cogs,
      }
    })
  }, [perimetre, comptages])

  const lignesAffichees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    let l = lignes.filter((x) => !q || x.article.nom.toLowerCase().includes(q))
    if (filtre === 'non_comptes') l = l.filter((x) => !x.estCompte)
    if (filtre === 'ecarts') l = l.filter((x) => x.estCompte && x.ecart !== 0)

    const sens = sensAsc ? 1 : -1
    return [...l].sort((a, b) => {
      switch (tri) {
        case 'categorie': return sens * a.article.categorie.localeCompare(b.article.categorie)
        case 'emplacement': return sens * a.article.location.localeCompare(b.article.location)
        case 'systeme': return sens * (a.article.stockActuel - b.article.stockActuel)
        case 'ecart': return sens * (a.ecart - b.ecart)
        case 'ecartValeur': return sens * (a.ecartValeur - b.ecartValeur)
        default: return sens * a.article.nom.localeCompare(b.article.nom)
      }
    })
  }, [lignes, recherche, filtre, tri, sensAsc])

  const bilan = useMemo(() => {
    const comptes = lignes.filter((x) => x.estCompte && !x.saisieInvalide)
    const ecarts = comptes.filter((x) => x.ecart !== 0)
    const manquants = ecarts.filter((x) => x.ecart < 0)
    const excedents = ecarts.filter((x) => x.ecart > 0)
    return {
      total: perimetre.length,
      comptes: comptes.length,
      nonComptes: perimetre.length - comptes.length,
      invalides: lignes.filter((x) => x.saisieInvalide).length,
      ecarts: ecarts.length,
      valeurManquante: manquants.reduce((s, x) => s + x.ecartValeur, 0),
      valeurExcedent: excedents.reduce((s, x) => s + x.ecartValeur, 0),
      valeurNette: ecarts.reduce((s, x) => s + x.ecartValeur, 0),
      lignesEcart: ecarts,
    }
  }, [lignes, perimetre.length])

  const basculerTri = (t: Tri) => {
    if (tri === t) setSensAsc((v) => !v)
    else { setTri(t); setSensAsc(true) }
  }

  /** Pré-remplit avec le stock système : accélère quand peu d'écarts sont attendus. */
  const prendreSysteme = () => {
    setComptages((c) => {
      const suivant = { ...c }
      for (const a of perimetre) if (suivant[a.id] === undefined) suivant[a.id] = String(a.stockActuel)
      return suivant
    })
    onToast('Comptage pré-rempli avec le stock système — corrigez les écarts constatés.')
  }

  const feuilleDeComptage = () => {
    imprimerHtml(
      `Feuille de comptage ${nomSession}`,
      `<h1>Feuille de comptage — ${echapperHtml(nomSession)}</h1>
       <p>Périmètre : ${echapperHtml(categorie || 'toutes catégories')} · ${echapperHtml(emplacement || 'tous emplacements')} — ${perimetre.length} article(s).</p>
       <p>Date : ${new Date().toLocaleDateString('fr-FR')} · Compté par : ______________________</p>
       ${tableauHtml(
         ['Article', 'Catégorie', 'Emplacement', 'Unité', 'Quantité comptée'],
         perimetre.map((a) => [a.nom, a.categorie, a.location, a.unite, '']),
       )}`,
    )
  }

  const exporterCsv = () => {
    downloadCsv(
      `${nomSession}.csv`,
      ['Article', 'Catégorie', 'Emplacement', 'Stock système', 'Compté', 'Écart', 'Unité', 'Écart en valeur'],
      lignes.map((x) => [
        x.article.nom,
        x.article.categorie,
        x.article.location,
        x.article.stockActuel,
        x.estCompte ? (x.compte ?? '') : 'non compté',
        x.estCompte ? x.ecart : '',
        x.article.unite,
        x.estCompte ? +x.ecartValeur.toFixed(2) : '',
      ]),
    )
    onToast(`${nomSession}.csv exporté.`)
  }

  const valider = async () => {
    if (!bilan.lignesEcart.length) {
      onToast('Aucun écart à enregistrer — le stock système est déjà juste.')
      onClose()
      return
    }
    setEnCours(true)
    try {
      await onValider(
        bilan.lignesEcart.map((x) => ({
          id: x.article.id,
          nom: x.article.nom,
          systeme: x.article.stockActuel,
          compte: x.compte as number,
          ecart: x.ecart,
          ecartValeur: x.ecartValeur,
        })),
      )
      onToast(`Inventaire ${nomSession} validé — ${bilan.ecarts} écart(s) enregistré(s).`)
      onClose()
    } catch {
      onToast("Échec de l'enregistrement — le stock système n'a pas été modifié.")
    } finally {
      setEnCours(false)
    }
  }

  const th: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800,
    color: C.discret, textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: `1px solid ${C.bord}`, background: '#f8fafc',
    position: 'sticky', top: 0, cursor: 'pointer', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: C.texte, borderBottom: '1px solid #f1f5f9' }
  const btnPrim: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
    borderRadius: 10, border: 'none', background: C.accent, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  }
  const btnSec: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
    borderRadius: 10, border: `1px solid ${C.bord}`, background: '#fff',
    color: C.texte, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 18 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: C.carte, borderRadius: 18, width: 'min(1100px, 100%)',
            maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            border: `1px solid ${C.bord}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.bord}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: C.accentDoux, display: 'grid', placeItems: 'center', color: C.accent }}>
              <ClipboardList size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.texte }}>Inventaire physique</div>
              <div style={{ fontSize: 12, color: C.discret }}>
                Document {nomSession} ·{' '}
                {etape === 'perimetre' ? 'étape 1/3 — périmètre'
                  : etape === 'comptage' ? 'étape 2/3 — comptage'
                  : 'étape 3/3 — validation'}
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" style={{ ...btnSec, padding: 9 }}><X size={16} /></button>
          </div>

          {etape === 'perimetre' && (
            <div style={{ padding: 22, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: C.discret, lineHeight: 1.6 }}>
                Choisissez ce que vous allez compter. Un inventaire partiel est parfaitement valable :
                seuls les articles du périmètre seront ajustés, les autres ne sont pas touchés.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div>
                  <label htmlFor="inv-cat" style={{ fontSize: 11, fontWeight: 800, color: C.discret, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Catégorie</label>
                  <select
                    id="inv-cat"
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 9, border: `1px solid ${C.bord}`, fontSize: 13 }}
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="inv-loc" style={{ fontSize: 11, fontWeight: 800, color: C.discret, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emplacement</label>
                  <select
                    id="inv-loc"
                    value={emplacement}
                    onChange={(e) => setEmplacement(e.target.value)}
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 9, border: `1px solid ${C.bord}`, fontSize: 13 }}
                  >
                    <option value="">Tous les emplacements</option>
                    {emplacements.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12, background: C.accentDoux, border: '1px solid #fde68a', marginBottom: 20 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.accent }}>{perimetre.length}</div>
                <div style={{ fontSize: 13, color: '#78350f' }}>
                  article(s) à compter · valeur système {fmtEur(perimetre.reduce((s, a) => s + a.stockActuel * a.cogs, 0))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => perimetre.length ? setEtape('comptage') : onToast('Aucun article dans ce périmètre.')}
                  disabled={!perimetre.length}
                  style={{ ...btnPrim, opacity: perimetre.length ? 1 : 0.5 }}
                >
                  Commencer le comptage <ChevronRight size={16} />
                </button>
                <button onClick={feuilleDeComptage} disabled={!perimetre.length} style={btnSec}>
                  <Printer size={15} /> Feuille de comptage papier
                </button>
              </div>
            </div>
          )}

          {etape === 'comptage' && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${C.bord}`, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: C.discret }} />
                  <input
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Filtrer un article…"
                    aria-label="Filtrer un article"
                    style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: `1px solid ${C.bord}`, fontSize: 13 }}
                  />
                </div>
                {([
                  { id: 'tous', label: `Tous (${perimetre.length})` },
                  { id: 'non_comptes', label: `À compter (${bilan.nonComptes})` },
                  { id: 'ecarts', label: `Écarts (${bilan.ecarts})` },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltre(f.id)}
                    style={{
                      padding: '8px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      border: `1px solid ${filtre === f.id ? C.accent : C.bord}`,
                      background: filtre === f.id ? C.accent : '#fff',
                      color: filtre === f.id ? '#fff' : C.discret,
                    }}
                  >{f.label}</button>
                ))}
                <button onClick={prendreSysteme} style={btnSec}><RotateCcw size={14} /> Pré-remplir</button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th} onClick={() => basculerTri('nom')}>Article <ArrowUpDown size={11} /></th>
                      <th style={th} onClick={() => basculerTri('categorie')}>Catégorie <ArrowUpDown size={11} /></th>
                      <th style={th} onClick={() => basculerTri('emplacement')}>Emplacement <ArrowUpDown size={11} /></th>
                      <th style={{ ...th, textAlign: 'right' }} onClick={() => basculerTri('systeme')}>Système <ArrowUpDown size={11} /></th>
                      <th style={{ ...th, textAlign: 'right', cursor: 'default' }}>Comptage physique</th>
                      <th style={{ ...th, textAlign: 'right' }} onClick={() => basculerTri('ecart')}>Écart <ArrowUpDown size={11} /></th>
                      <th style={{ ...th, textAlign: 'right' }} onClick={() => basculerTri('ecartValeur')}>Valeur <ArrowUpDown size={11} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesAffichees.map((x) => {
                      const couleur = !x.estCompte ? C.discret : x.ecart === 0 ? C.vert : x.ecart > 0 ? C.orange : C.rouge
                      return (
                        <tr key={x.article.id} style={{ background: x.saisieInvalide ? '#fef2f2' : undefined }}>
                          <td style={{ ...td, fontWeight: 600 }}>{x.article.nom}</td>
                          <td style={{ ...td, color: C.discret }}>{x.article.categorie}</td>
                          <td style={{ ...td, color: C.discret }}>{x.article.location}</td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {x.article.stockActuel} <span style={{ color: C.discret, fontSize: 11 }}>{x.article.unite}</span>
                          </td>
                          <td style={{ ...td, textAlign: 'right' }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              value={comptages[x.article.id] ?? ''}
                              onChange={(e) => setComptages((c) => ({ ...c, [x.article.id]: e.target.value }))}
                              placeholder="—"
                              aria-label={`Quantité comptée pour ${x.article.nom}`}
                              style={{
                                width: 96, padding: '6px 9px', borderRadius: 8, textAlign: 'right',
                                border: `1px solid ${x.saisieInvalide ? C.rouge : C.bord}`, fontSize: 13,
                              }}
                            />
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: couleur, fontVariantNumeric: 'tabular-nums' }}>
                            {x.estCompte ? (x.ecart > 0 ? `+${x.ecart}` : x.ecart) : '—'}
                          </td>
                          <td style={{ ...td, textAlign: 'right', color: couleur, fontVariantNumeric: 'tabular-nums' }}>
                            {x.estCompte && x.ecart !== 0 ? fmtEur(x.ecartValeur) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    {!lignesAffichees.length && (
                      <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: 40, color: C.discret }}>Aucun article pour ce filtre.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: `1px solid ${C.bord}`, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ height: 7, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bilan.total ? (bilan.comptes / bilan.total) * 100 : 0}%`, background: C.accent, transition: 'width .2s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.discret, marginTop: 5 }}>
                    {bilan.comptes} / {bilan.total} compté(s)
                    {bilan.invalides > 0 && <span style={{ color: C.rouge, fontWeight: 700 }}> · {bilan.invalides} saisie(s) invalide(s)</span>}
                  </div>
                </div>
                <button onClick={() => setEtape('perimetre')} style={btnSec}><ChevronLeft size={15} /> Périmètre</button>
                <button onClick={exporterCsv} style={btnSec}><Download size={15} /> Export CSV</button>
                <button
                  onClick={() => bilan.comptes ? setEtape('recap') : onToast('Comptez au moins un article avant de continuer.')}
                  style={btnPrim}
                >
                  Récapitulatif <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          {etape === 'recap' && (
            <>
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {[
                    { l: 'Articles comptés', v: `${bilan.comptes} / ${bilan.total}`, c: C.texte },
                    { l: 'Écarts constatés', v: String(bilan.ecarts), c: bilan.ecarts ? C.orange : C.vert },
                    { l: 'Manquants', v: fmtEur(bilan.valeurManquante), c: C.rouge },
                    { l: 'Excédents', v: fmtEur(bilan.valeurExcedent), c: C.vert },
                  ].map((s) => (
                    <div key={s.l} style={{ padding: 14, borderRadius: 12, background: '#f8fafc', border: `1px solid ${C.bord}` }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: C.discret, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.c, marginTop: 4 }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 14, borderRadius: 12, background: bilan.valeurNette < 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${bilan.valeurNette < 0 ? '#fecaca' : '#bbf7d0'}`, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: C.discret }}>Impact net sur la valeur du stock</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: bilan.valeurNette < 0 ? C.rouge : C.vert }}>
                    {bilan.valeurNette >= 0 ? '+' : ''}{fmtEur(bilan.valeurNette)}
                  </div>
                </div>

                {bilan.nonComptes > 0 && (
                  <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 18 }}>
                    <AlertTriangle size={17} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                      <strong>{bilan.nonComptes} article(s) non compté(s).</strong> Ils ne seront pas modifiés :
                      leur stock système reste inchangé. Un article non compté n'est pas un article à zéro.
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 13, fontWeight: 800, color: C.texte, marginBottom: 8 }}>
                  Écarts à enregistrer ({bilan.ecarts})
                </div>
                <div style={{ border: `1px solid ${C.bord}`, borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      <th style={{ ...th, cursor: 'default' }}>Article</th>
                      <th style={{ ...th, textAlign: 'right', cursor: 'default' }}>Système</th>
                      <th style={{ ...th, textAlign: 'right', cursor: 'default' }}>Compté</th>
                      <th style={{ ...th, textAlign: 'right', cursor: 'default' }}>Écart</th>
                      <th style={{ ...th, textAlign: 'right', cursor: 'default' }}>Valeur</th>
                    </tr></thead>
                    <tbody>
                      {bilan.lignesEcart.map((x) => (
                        <tr key={x.article.id}>
                          <td style={{ ...td, fontWeight: 600 }}>{x.article.nom}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{x.article.stockActuel}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{x.compte}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: x.ecart > 0 ? C.orange : C.rouge }}>
                            {x.ecart > 0 ? `+${x.ecart}` : x.ecart}
                          </td>
                          <td style={{ ...td, textAlign: 'right', color: x.ecart > 0 ? C.vert : C.rouge }}>{fmtEur(x.ecartValeur)}</td>
                        </tr>
                      ))}
                      {!bilan.lignesEcart.length && (
                        <tr><td colSpan={5} style={{ ...td, textAlign: 'center', padding: 30, color: C.vert, fontWeight: 700 }}>
                          <Check size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                          Aucun écart : le stock système est exact.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: `1px solid ${C.bord}`, flexWrap: 'wrap' }}>
                <button onClick={() => setEtape('comptage')} style={btnSec}><ChevronLeft size={15} /> Reprendre le comptage</button>
                <button onClick={exporterCsv} style={btnSec}><Download size={15} /> Export CSV</button>
                <div style={{ flex: 1 }} />
                <button onClick={valider} disabled={enCours} style={{ ...btnPrim, opacity: enCours ? 0.6 : 1 }}>
                  <PackageCheck size={16} />
                  {enCours ? 'Enregistrement…' : `Valider et ajuster le stock (${bilan.ecarts})`}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
