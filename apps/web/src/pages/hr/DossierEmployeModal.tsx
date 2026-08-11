import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  X, Save, Upload, Trash2, FileText, StickyNote, UserRound,
  CalendarClock, Download, Plus,
} from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'
import { toastSuccess, toastError } from '@/lib/toast'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Dossier employé — fenêtre complète ouverte au clic sur un employé.
 *
 * Quatre onglets : la fiche RH modifiable, les notes internes, les documents
 * (contrats, fiches de paie, diplômes) et l'activité (plannings, congés).
 *
 * Toutes les données viennent de `/api/hr-dossier`. Rien n'est simulé ici :
 * un champ vide est un champ réellement vide en base.
 */

interface Profil {
  id: string
  poste: string | null
  contrat: string | null
  heuresHebdo: number | null
  salaireBrut: number | null
  dateEmbauche: string | null
  dateFinContrat: string | null
  dateNaissance: string | null
  adresse: string | null
  telephone: string | null
  numSecu: string | null
  iban: string | null
  statut: string
  competences: string | null
}

interface Note {
  id: string
  texte: string
  createdAt: string
}

interface Document {
  id: string
  type: string
  nom: string
  mime: string
  taille: number
  periode: string | null
  createdAt: string
}

interface Conge {
  id: string
  type: string
  startDate: string
  endDate: string
  status: string
}

interface Employe {
  id: string
  prenom: string
  nom: string
  email: string
  role: string
}

interface Props {
  userCompanyId: string
  onClose: () => void
  /** Appelé après enregistrement, pour rafraîchir la liste derrière. */
  onEnregistre?: () => void
}

const CONTRATS = ['CDI', 'CDD', 'Extra/Intérimaire', 'Stage', 'Apprentissage']
const STATUTS: Record<string, { label: string; couleur: string }> = {
  ACTIF: { label: 'Actif', couleur: '#10b981' },
  CONGE: { label: 'En congé', couleur: '#f59e0b' },
  INACTIF: { label: 'Inactif', couleur: '#94a3b8' },
  SORTI: { label: 'Sorti des effectifs', couleur: '#ef4444' },
}
const TYPES_DOC: Record<string, string> = {
  CONTRAT: 'Contrat',
  FICHE_PAIE: 'Fiche de paie',
  DIPLOME: 'Diplôme / formation',
  AUTRE: 'Autre',
}

type Onglet = 'fiche' | 'notes' | 'documents' | 'activite'

const vide: Profil = {
  id: '', poste: null, contrat: null, heuresHebdo: null, salaireBrut: null,
  dateEmbauche: null, dateFinContrat: null, dateNaissance: null,
  adresse: null, telephone: null, numSecu: null, iban: null,
  statut: 'ACTIF', competences: null,
}

/** Une date ISO devient `AAAA-MM-JJ` pour un `<input type="date">`. */
const pourInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

const enClair = (iso: string) => new Date(iso).toLocaleDateString('fr-LU', {
  day: '2-digit', month: 'long', year: 'numeric',
})

function poids(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`
}

export default function DossierEmployeModal({ userCompanyId, onClose, onEnregistre }: Props) {
  const [onglet, setOnglet] = useState<Onglet>('fiche')
  const [employe, setEmploye] = useState<Employe | null>(null)
  const [profil, setProfil] = useState<Profil>(vide)
  const [notes, setNotes] = useState<Note[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [conges, setConges] = useState<Conge[]>([])
  const [shifts, setShifts] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [nouvelleNote, setNouvelleNote] = useState('')
  const [typeAjout, setTypeAjout] = useState('CONTRAT')
  const [periodeAjout, setPeriodeAjout] = useState('')
  const fichierRef = useRef<HTMLInputElement>(null)

  // ─── Chargement du dossier ────────────────────────────────────────────

  useEffect(() => {
    const charger = async () => {
      setChargement(true)
      try {
        const r = await fetchAuth(`${BACKEND}/api/hr-dossier/employes/${userCompanyId}`)
        const corps = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
        setEmploye(corps.employe)
        setProfil(corps.profil ? { ...vide, ...corps.profil } : vide)
        setNotes(corps.notes || [])
        setDocuments(corps.documents || [])
        setConges(corps.conges || [])
        setShifts(corps.shifts || 0)
      } catch (e: any) {
        toastError(`Dossier illisible : ${e.message}`)
      } finally {
        setChargement(false)
      }
    }
    charger()
  }, [userCompanyId])

  // Échap ferme la fenêtre.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ─── Fiche ────────────────────────────────────────────────────────────

  const champ = (cle: keyof Profil, valeur: string) => {
    setProfil((p) => ({ ...p, [cle]: valeur === '' ? null : valeur }))
  }

  const enregistrerFiche = async () => {
    setEnregistrement(true)
    try {
      const r = await fetchAuth(`${BACKEND}/api/hr-dossier/employes/${userCompanyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profil),
      })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setProfil({ ...vide, ...corps })
      toastSuccess('Fiche enregistrée')
      onEnregistre?.()
    } catch (e: any) {
      toastError(`Enregistrement impossible : ${e.message}`)
    } finally {
      setEnregistrement(false)
    }
  }

  // ─── Notes ────────────────────────────────────────────────────────────

  const ajouterNote = async () => {
    const texte = nouvelleNote.trim()
    if (!texte) return
    try {
      const r = await fetchAuth(`${BACKEND}/api/hr-dossier/employes/${userCompanyId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte }),
      })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setNotes((n) => [corps, ...n])
      setNouvelleNote('')
      toastSuccess('Note ajoutée')
    } catch (e: any) {
      toastError(`Note non enregistrée : ${e.message}`)
    }
  }

  const supprimerNote = async (id: string) => {
    try {
      const r = await fetchAuth(`${BACKEND}/api/hr-dossier/notes/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setNotes((n) => n.filter((x) => x.id !== id))
      toastSuccess('Note supprimée')
    } catch (e: any) {
      toastError(`Suppression impossible : ${e.message}`)
    }
  }

  // ─── Documents ────────────────────────────────────────────────────────

  const televerser = async (fichiers: FileList | null) => {
    if (!fichiers || !fichiers.length) return
    for (const fichier of Array.from(fichiers)) {
      try {
        const entetes: Record<string, string> = {
          'Content-Type': fichier.type || 'application/octet-stream',
          'X-Nom-Fichier': encodeURIComponent(fichier.name),
          'X-Type-Document': typeAjout,
        }
        if (typeAjout === 'FICHE_PAIE' && /^\d{4}-\d{2}$/.test(periodeAjout)) {
          entetes['X-Periode'] = periodeAjout
        }
        const r = await fetchAuth(`${BACKEND}/api/hr-dossier/employes/${userCompanyId}/documents`, {
          method: 'POST', headers: entetes, body: fichier,
        })
        const corps = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
        setDocuments((d) => [corps, ...d])
        toastSuccess(`${fichier.name} ajouté`)
      } catch (e: any) {
        toastError(`${fichier.name} : ${e.message}`)
      }
    }
    if (fichierRef.current) fichierRef.current.value = ''
  }

  const supprimerDocument = async (doc: Document) => {
    if (!window.confirm(`Supprimer « ${doc.nom} » ? Cette pièce sera définitivement retirée du dossier.`)) return
    try {
      const r = await fetchAuth(`${BACKEND}/api/hr-dossier/documents/${doc.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setDocuments((d) => d.filter((x) => x.id !== doc.id))
      toastSuccess('Document supprimé')
    } catch (e: any) {
      toastError(`Suppression impossible : ${e.message}`)
    }
  }

  /**
   * Le document est une donnée personnelle servie par une route authentifiée :
   * on ne peut pas l'ouvrir par un simple lien, il faut passer par fetchAuth
   * puis créer une URL temporaire.
   */
  const ouvrirDocument = async (doc: Document) => {
    try {
      const r = await fetchAuth(`${BACKEND}/api/hr-dossier/documents/${doc.id}/fichier`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      toastError(`Ouverture impossible : ${e.message}`)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────

  const statut = STATUTS[profil.statut] || STATUTS.ACTIF
  const initiales = employe ? `${employe.prenom[0] || ''}${employe.nom[0] || ''}`.toUpperCase() : '—'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(3px)',
        display: 'grid', placeItems: 'center', padding: 24,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          width: 'min(980px, 100%)', maxHeight: 'calc(100vh - 48px)',
          background: '#fff', borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
      >
        {/* En-tête */}
        <header style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          padding: '20px 24px', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16, flexShrink: 0,
            background: 'rgba(255,255,255,0.22)',
            display: 'grid', placeItems: 'center',
            fontSize: 19, fontWeight: 900,
          }}>{initiales}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 900 }}>
              {employe ? `${employe.prenom} ${employe.nom}` : 'Dossier employé'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              {profil.poste || employe?.role || '—'}
              {profil.contrat ? ` · ${profil.contrat}` : ''}
              {employe?.email ? ` · ${employe.email}` : ''}
            </div>
          </div>
          <span style={{
            padding: '5px 12px', borderRadius: 999, flexShrink: 0,
            background: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 800,
            border: `1px solid ${statut.couleur}`,
          }}>{statut.label}</span>
          <button type="button" onClick={onClose} aria-label="Fermer le dossier" style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
            border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff',
            display: 'grid', placeItems: 'center',
          }}><X size={17} /></button>
        </header>

        {/* Onglets */}
        <nav style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
          {([
            { id: 'fiche', label: 'Fiche', icon: UserRound },
            { id: 'notes', label: `Notes${notes.length ? ` (${notes.length})` : ''}`, icon: StickyNote },
            { id: 'documents', label: `Documents${documents.length ? ` (${documents.length})` : ''}`, icon: FileText },
            { id: 'activite', label: 'Activité', icon: CalendarClock },
          ] as const).map((t) => {
            const Icone = t.icon
            const actif = onglet === t.id
            return (
              <button key={t.id} type="button" onClick={() => setOnglet(t.id)} style={{
                flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                background: actif ? '#fff' : 'transparent',
                color: actif ? '#6366f1' : '#64748b',
                borderBottom: `2px solid ${actif ? '#8b5cf6' : 'transparent'}`,
                fontWeight: actif ? 800 : 600, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
                <Icone size={15} /> {t.label}
              </button>
            )
          })}
        </nav>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f8fafc' }}>
          {chargement ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement du dossier…</div>
          ) : (
            <>
              {/* ─── FICHE ───────────────────────────────────────────── */}
              {onglet === 'fiche' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  {([
                    { cle: 'poste', label: 'Poste', type: 'text', placeholder: 'Serveur, cuisinier, manager…' },
                    { cle: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '+352 621 000 000' },
                    { cle: 'dateNaissance', label: 'Date de naissance', type: 'date' },
                    { cle: 'dateEmbauche', label: 'Date d’embauche', type: 'date' },
                    { cle: 'dateFinContrat', label: 'Fin de contrat', type: 'date' },
                    { cle: 'heuresHebdo', label: 'Heures par semaine', type: 'number' },
                    { cle: 'salaireBrut', label: 'Salaire brut mensuel (€)', type: 'number' },
                    { cle: 'numSecu', label: 'N° de sécurité sociale', type: 'text' },
                    { cle: 'iban', label: 'IBAN', type: 'text', placeholder: 'LU28 0019 4006 4475 0000' },
                  ] as const).map((f) => (
                    <label key={f.cle} style={etiquette}>
                      {f.label}
                      <input
                        type={f.type}
                        placeholder={(f as any).placeholder}
                        value={f.type === 'date'
                          ? pourInput(profil[f.cle] as string | null)
                          : ((profil[f.cle] as string | number | null) ?? '')}
                        onChange={(e) => champ(f.cle, e.target.value)}
                        style={saisie}
                      />
                    </label>
                  ))}

                  <label style={etiquette}>
                    Type de contrat
                    <select value={profil.contrat || ''} onChange={(e) => champ('contrat', e.target.value)} style={saisie}>
                      <option value="">Non renseigné</option>
                      {CONTRATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>

                  <label style={etiquette}>
                    Statut
                    <select value={profil.statut} onChange={(e) => champ('statut', e.target.value)} style={saisie}>
                      {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                    </select>
                  </label>

                  <label style={{ ...etiquette, gridColumn: '1 / -1' }}>
                    Adresse
                    <input
                      value={profil.adresse || ''}
                      onChange={(e) => champ('adresse', e.target.value)}
                      placeholder="14 Rue de Hollerich, L-1741 Luxembourg"
                      style={saisie}
                    />
                  </label>

                  <label style={{ ...etiquette, gridColumn: '1 / -1' }}>
                    Formations, certifications, langues
                    <textarea
                      value={profil.competences || ''}
                      onChange={(e) => champ('competences', e.target.value)}
                      rows={4}
                      placeholder="HACCP (mars 2025), premiers secours, luxembourgeois courant…"
                      style={{ ...saisie, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </label>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={enregistrerFiche} disabled={enregistrement} style={btnPrincipal}>
                      <Save size={16} /> {enregistrement ? 'Enregistrement…' : 'Enregistrer la fiche'}
                    </button>
                  </div>
                </div>
              )}

              {/* ─── NOTES ───────────────────────────────────────────── */}
              {onglet === 'notes' && (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'flex-start' }}>
                    <textarea
                      value={nouvelleNote}
                      onChange={(e) => setNouvelleNote(e.target.value)}
                      rows={3}
                      placeholder="Entretien annuel, remarque, félicitation, incident…"
                      style={{ ...saisie, flex: 1, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <button type="button" onClick={ajouterNote} disabled={!nouvelleNote.trim()} style={btnPrincipal}>
                      <Plus size={16} /> Ajouter
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div style={cadreVide}>Aucune note pour l’instant.</div>
                  ) : notes.map((n) => (
                    <article key={n.id} style={carte}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, whiteSpace: 'pre-wrap', fontSize: 14, color: '#334155' }}>{n.texte}</div>
                        <button type="button" onClick={() => supprimerNote(n.id)} style={btnDanger} aria-label="Supprimer la note">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{enClair(n.createdAt)}</div>
                    </article>
                  ))}
                </div>
              )}

              {/* ─── DOCUMENTS ───────────────────────────────────────── */}
              {onglet === 'documents' && (
                <div>
                  <div style={{ ...carte, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ ...etiquette, minWidth: 190 }}>
                      Type de pièce
                      <select value={typeAjout} onChange={(e) => setTypeAjout(e.target.value)} style={saisie}>
                        {Object.entries(TYPES_DOC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>

                    {typeAjout === 'FICHE_PAIE' && (
                      <label style={{ ...etiquette, minWidth: 160 }}>
                        Période
                        <input type="month" value={periodeAjout} onChange={(e) => setPeriodeAjout(e.target.value)} style={saisie} />
                      </label>
                    )}

                    <input
                      ref={fichierRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => televerser(e.target.files)}
                      style={{ display: 'none' }}
                    />
                    <button type="button" onClick={() => fichierRef.current?.click()} style={btnPrincipal}>
                      <Upload size={16} /> Ajouter un document
                    </button>
                    <span style={{ fontSize: 11, color: '#94a3b8', flexBasis: '100%' }}>
                      PDF, JPEG, PNG ou WebP — 25 Mo maximum.
                    </span>
                  </div>

                  {documents.length === 0 ? (
                    <div style={cadreVide}>Aucun document. Ajoutez le contrat, les fiches de paie, les diplômes.</div>
                  ) : Object.keys(TYPES_DOC).map((type) => {
                    const lot = documents.filter((d) => d.type === type)
                    if (!lot.length) return null
                    return (
                      <section key={type} style={{ marginTop: 18 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>
                          {TYPES_DOC[type]} ({lot.length})
                        </h3>
                        {lot.map((d) => (
                          <div key={d.id} style={{ ...carte, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <FileText size={17} color="#6366f1" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {d.nom}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {d.periode ? `Période ${d.periode} · ` : ''}{poids(d.taille)} · ajouté le {enClair(d.createdAt)}
                              </div>
                            </div>
                            <button type="button" onClick={() => ouvrirDocument(d)} style={btnSecondaire}>
                              <Download size={14} /> Ouvrir
                            </button>
                            <button type="button" onClick={() => supprimerDocument(d)} style={btnDanger} aria-label="Supprimer le document">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </section>
                    )
                  })}
                </div>
              )}

              {/* ─── ACTIVITÉ ────────────────────────────────────────── */}
              {onglet === 'activite' && (
                <div>
                  <div style={{ ...carte, marginBottom: 18 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#1e293b' }}>{shifts}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      service{shifts > 1 ? 's' : ''} planifié{shifts > 1 ? 's' : ''} pour cet employé
                    </div>
                  </div>

                  <h3 style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>
                    Demandes de congé
                  </h3>
                  {conges.length === 0 ? (
                    <div style={cadreVide}>Aucune demande de congé enregistrée.</div>
                  ) : conges.map((c) => (
                    <div key={c.id} style={{ ...carte, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <CalendarClock size={16} color="#6366f1" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{c.type}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          du {enClair(c.startDate)} au {enClair(c.endDate)}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                        background: '#f1f5f9', color: '#475569',
                      }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const etiquette: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
  fontSize: 12, fontWeight: 700, color: '#475569',
}

const saisie: React.CSSProperties = {
  padding: '9px 11px', borderRadius: 9, fontSize: 14,
  border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a',
}

const carte: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 12, padding: 14, marginBottom: 8,
}

const cadreVide: React.CSSProperties = {
  border: '1px dashed #cbd5e1', borderRadius: 12,
  padding: '26px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13,
}

const btnPrincipal: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
  padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
  fontSize: 13, fontWeight: 800, color: '#fff',
  border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
}

const btnSecondaire: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
  padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 800, color: '#4338ca',
  border: '1px solid #c7d2fe', background: '#eef2ff',
}

const btnDanger: React.CSSProperties = {
  display: 'grid', placeItems: 'center', flexShrink: 0,
  width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
  border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444',
}
