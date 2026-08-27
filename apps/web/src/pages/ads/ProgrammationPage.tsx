import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Upload, Trash2, Plus, Film, Image as ImageIcon, Copy, Eraser,
  CalendarDays, Library, ListVideo, Save, Monitor, GripVertical, X,
} from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'
import { toastSuccess, toastError, toastInfo } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Programmation de l'affichage TV.
 *
 * Trois volets :
 *   - Médiathèque : téléverser images et vidéos ;
 *   - Séquences   : listes ordonnées de médias, jouées en boucle, avec une
 *                   durée par élément (0 s sur une vidéo = jusqu'au bout) ;
 *   - Grille      : 7 jours × 24 heures. On choisit une séquence dans la
 *                   palette puis on peint les créneaux au clic ou au
 *                   glissement. Une journée entière se recopie sur les autres.
 *
 * Les créneaux laissés vides suivent un réglage explicite (écran noir,
 * séquence de repli, ou message), plutôt qu'un comportement implicite.
 */

interface Media {
  id: string
  nom: string
  type: 'image' | 'video'
  mime: string
  taille: number
  dureeParDefautSec: number
  creeLe: number
}

interface ElementSequence {
  id: string
  mediaId: string
  dureeSec: number
}

interface Sequence {
  id: string
  nom: string
  couleur: string
  elements: ElementSequence[]
}

interface Creneau {
  jour: number
  heure: number
  sequenceId: string
}

interface CreneauVide {
  mode: 'noir' | 'sequence' | 'message'
  sequenceId?: string
  message?: string
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HEURES = Array.from({ length: 24 }, (_, h) => h)

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16']

const idLocal = () => Math.random().toString(36).slice(2, 12)

function poids(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`
}

type Volet = 'mediatheque' | 'sequences' | 'grille'

export default function ProgrammationPage() {
  const companyId = useAuthStore((state) => state.companyId)
  const [volet, setVolet] = useState<Volet>('grille')
  const [medias, setMedias] = useState<Media[]>([])
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [creneauVide, setCreneauVide] = useState<CreneauVide>({ mode: 'noir' })
  const [chargement, setChargement] = useState(true)
  const [televersement, setTeleversement] = useState<string | null>(null)

  // Séquence active dans la palette de la grille. `null` = gomme.
  const [pinceau, setPinceau] = useState<string | null>(null)
  const [peinture, setPeinture] = useState(false)
  const [jourCopie, setJourCopie] = useState<number | null>(null)

  const fichierRef = useRef<HTMLInputElement>(null)

  // ─── Chargement ───────────────────────────────────────────────────────

  useEffect(() => {
    const charger = async () => {
      try {
        const r = await fetchAuth(`${BACKEND}/api/affichage`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const p = await r.json()
        setMedias(p.medias || [])
        setSequences(p.sequences || [])
        setCreneaux(p.creneaux || [])
        setCreneauVide(p.creneauVide || { mode: 'noir' })
        if ((p.sequences || []).length) setPinceau(p.sequences[0].id)
      } catch (e: any) {
        toastError(`Programmation illisible : ${e.message}`)
      } finally {
        setChargement(false)
      }
    }
    charger()
  }, [companyId])

  // Arrêter la peinture même si le relâchement a lieu hors de la grille.
  useEffect(() => {
    const stop = () => setPeinture(false)
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  // ─── Médiathèque ──────────────────────────────────────────────────────

  const televerser = async (fichiers: FileList | null) => {
    if (!fichiers || !fichiers.length) return

    for (const fichier of Array.from(fichiers)) {
      setTeleversement(fichier.name)
      try {
        const r = await fetchAuth(`${BACKEND}/api/affichage/medias`, {
          method: 'POST',
          headers: {
            'Content-Type': fichier.type || 'application/octet-stream',
            'X-Nom-Fichier': encodeURIComponent(fichier.name),
          },
          body: fichier,
        })
        const corps = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
        setMedias((m) => [...m, corps])
        toastSuccess(`${fichier.name} ajouté`)
      } catch (e: any) {
        toastError(`${fichier.name} : ${e.message}`)
      } finally {
        setTeleversement(null)
      }
    }
    if (fichierRef.current) fichierRef.current.value = ''
  }

  const supprimerMedia = async (media: Media) => {
    if (!window.confirm(`Supprimer « ${media.nom} » ? Il sera retiré de toutes les séquences.`)) return
    try {
      const r = await fetchAuth(`${BACKEND}/api/affichage/medias/${media.id}`, { method: 'DELETE' })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setMedias((m) => m.filter((x) => x.id !== media.id))
      setSequences((s) => s.map((sq) => ({
        ...sq,
        elements: sq.elements.filter((e) => e.mediaId !== media.id),
      })))
      toastSuccess(
        corps.elementsRetires
          ? `Supprimé, et retiré de ${corps.elementsRetires} élément(s) de séquence`
          : 'Média supprimé',
      )
    } catch (e: any) {
      toastError(`Suppression impossible : ${e.message}`)
    }
  }

  // ─── Séquences ────────────────────────────────────────────────────────

  const enregistrerSequences = async (prochaines: Sequence[]) => {
    try {
      const r = await fetchAuth(`${BACKEND}/api/affichage/sequences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequences: prochaines }),
      })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setSequences(corps.sequences)
      setCreneaux(corps.creneaux)
      toastSuccess('Séquences enregistrées')
    } catch (e: any) {
      toastError(`Enregistrement impossible : ${e.message}`)
    }
  }

  const ajouterSequence = () => {
    const nouvelle: Sequence = {
      id: idLocal(),
      nom: `Séquence ${sequences.length + 1}`,
      couleur: PALETTE[sequences.length % PALETTE.length],
      elements: [],
    }
    setSequences((s) => [...s, nouvelle])
    setPinceau(nouvelle.id)
  }

  const majSequence = (id: string, patch: Partial<Sequence>) => {
    setSequences((s) => s.map((sq) => (sq.id === id ? { ...sq, ...patch } : sq)))
  }

  const ajouterElement = (sequenceId: string, media: Media) => {
    setSequences((s) => s.map((sq) => sq.id === sequenceId
      ? {
          ...sq,
          elements: [...sq.elements, { id: idLocal(), mediaId: media.id, dureeSec: media.dureeParDefautSec }],
        }
      : sq))
  }

  const deplacerElement = (sequenceId: string, index: number, sens: -1 | 1) => {
    setSequences((s) => s.map((sq) => {
      if (sq.id !== sequenceId) return sq
      const cible = index + sens
      if (cible < 0 || cible >= sq.elements.length) return sq
      const elements = [...sq.elements]
      const [retire] = elements.splice(index, 1)
      elements.splice(cible, 0, retire)
      return { ...sq, elements }
    }))
  }

  // ─── Grille ───────────────────────────────────────────────────────────

  const carte = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of creneaux) m.set(`${c.jour}-${c.heure}`, c.sequenceId)
    return m
  }, [creneaux])

  const parSequence = useMemo(() => {
    const m = new Map<string, Sequence>()
    for (const s of sequences) m.set(s.id, s)
    return m
  }, [sequences])

  const peindre = (jour: number, heure: number) => {
    setCreneaux((liste) => {
      const autres = liste.filter((c) => !(c.jour === jour && c.heure === heure))
      if (!pinceau) return autres
      return [...autres, { jour, heure, sequenceId: pinceau }]
    })
  }

  const copierJournee = (jour: number) => {
    setJourCopie(jour)
    toastInfo(`${JOURS[jour]} copié — cliquez sur l’en-tête d’un autre jour pour le coller`)
  }

  const collerJournee = (cible: number) => {
    if (jourCopie === null || jourCopie === cible) { setJourCopie(null); return }
    const source = creneaux.filter((c) => c.jour === jourCopie)
    setCreneaux((liste) => [
      ...liste.filter((c) => c.jour !== cible),
      ...source.map((c) => ({ ...c, jour: cible })),
    ])
    toastSuccess(`${JOURS[jourCopie]} recopié sur ${JOURS[cible]}`)
    setJourCopie(null)
  }

  const remplirSemaine = () => {
    if (!pinceau) {
      toastInfo('Choisissez d’abord une séquence dans la palette')
      return
    }
    const tout: Creneau[] = []
    for (let j = 0; j < 7; j++) for (const h of HEURES) tout.push({ jour: j, heure: h, sequenceId: pinceau })
    setCreneaux(tout)
    toastSuccess('Semaine entière remplie')
  }

  const viderSemaine = () => {
    if (!window.confirm('Vider toute la grille ? Les séquences et les médias sont conservés.')) return
    setCreneaux([])
    toastSuccess('Grille vidée')
  }

  const enregistrerGrille = async () => {
    try {
      const r = await fetchAuth(`${BACKEND}/api/affichage/creneaux`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creneaux }),
      })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setCreneaux(corps.creneaux)
      toastSuccess('Grille enregistrée')
    } catch (e: any) {
      toastError(`Enregistrement impossible : ${e.message}`)
    }
  }

  const enregistrerCreneauVide = async (config: CreneauVide) => {
    try {
      const r = await fetchAuth(`${BACKEND}/api/affichage/creneau-vide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const corps = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corps.message || `HTTP ${r.status}`)
      setCreneauVide(corps)
      toastSuccess('Comportement des créneaux vides enregistré')
    } catch (e: any) {
      toastError(`Enregistrement impossible : ${e.message}`)
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────

  if (chargement) {
    return <div style={{ padding: 40, color: '#94a3b8' }}>Chargement de la programmation…</div>
  }

  const heuresOccupees = creneaux.length

  return (
    <div style={{ padding: '20px 24px 60px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Programmation TV</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {medias.length} média{medias.length > 1 ? 's' : ''} · {sequences.length} séquence{sequences.length > 1 ? 's' : ''} ·{' '}
            {heuresOccupees} heure{heuresOccupees > 1 ? 's' : ''} programmée{heuresOccupees > 1 ? 's' : ''} sur 168
          </p>
        </div>
        <a
          href={`/ads/tv?companyId=${encodeURIComponent(companyId || '')}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...btnSecondaire, textDecoration: 'none' }}
        >
          <Monitor size={16} /> Ouvrir l’écran TV
        </a>
      </header>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { id: 'grille', label: 'Grille horaire', icon: CalendarDays },
          { id: 'sequences', label: 'Séquences', icon: ListVideo },
          { id: 'mediatheque', label: 'Médiathèque', icon: Library },
        ] as const).map((t) => {
          const Icone = t.icon
          const actif = volet === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setVolet(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 15px', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 800,
                border: `1px solid ${actif ? '#6366f1' : 'rgba(148,163,184,0.3)'}`,
                background: actif ? 'rgba(99,102,241,0.18)' : 'transparent',
                color: actif ? '#c7d2fe' : '#94a3b8',
              }}
            >
              <Icone size={15} /> {t.label}
            </button>
          )
        })}
      </nav>

      {/* ─── MÉDIATHÈQUE ─────────────────────────────────────────────── */}
      {volet === 'mediatheque' && (
        <section>
          <input
            ref={fichierRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => televerser(e.target.files)}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={() => fichierRef.current?.click()} style={btnPrincipal} disabled={!!televersement}>
            <Upload size={16} /> {televersement ? `Envoi de ${televersement}…` : 'Ajouter des vidéos ou des images'}
          </button>
          <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0 20px' }}>
            Formats acceptés : MP4, WebM, MOV, JPEG, PNG, WebP, GIF — 200 Mo maximum par fichier.
          </p>

          {medias.length === 0 ? (
            <div style={cadreVide}>
              Aucun média pour l’instant. Ajoutez vos publicités, puis composez une séquence.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {medias.map((m) => (
                <article key={m.id} style={carteMedia}>
                  <div style={{
                    height: 118, borderRadius: 8, overflow: 'hidden', background: '#0b1220',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {m.type === 'video'
                      ? <video src={`${BACKEND}/api/media-affichage/${encodeURIComponent(companyId || '')}/${m.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                      : <img src={`${BACKEND}/api/media-affichage/${encodeURIComponent(companyId || '')}/${m.id}`} alt={m.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
                    {m.type === 'video' ? <Film size={14} color="#a5b4fc" /> : <ImageIcon size={14} color="#a5b4fc" />}
                    <span style={{ fontSize: 13, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.nom}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    {poids(m.taille)} · {m.type === 'video' && m.dureeParDefautSec === 0 ? 'lue en entier' : `${m.dureeParDefautSec} s`}
                  </div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const sq = sequences.find((s) => s.id === e.target.value)
                        if (sq) { ajouterElement(sq.id, m); toastSuccess(`Ajouté à « ${sq.nom} » — pensez à enregistrer`) }
                      }}
                      disabled={sequences.length === 0}
                      style={{ ...champ, flex: 1, fontSize: 11 }}
                    >
                      <option value="">
                        {sequences.length === 0 ? 'Créez une séquence d’abord' : 'Ajouter à une séquence…'}
                      </option>
                      {sequences.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                    <button type="button" onClick={() => supprimerMedia(m)} title="Supprimer" style={btnDanger}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── SÉQUENCES ───────────────────────────────────────────────── */}
      {volet === 'sequences' && (
        <section>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <button type="button" onClick={ajouterSequence} style={btnPrincipal}>
              <Plus size={16} /> Nouvelle séquence
            </button>
            <button type="button" onClick={() => enregistrerSequences(sequences)} style={btnSecondaire}>
              <Save size={16} /> Enregistrer les séquences
            </button>
          </div>

          {sequences.length === 0 ? (
            <div style={cadreVide}>
              Une séquence est une suite de médias jouée en boucle. Par exemple cinq publicités
              qui s’enchaînent 8 secondes chacune.
            </div>
          ) : sequences.map((sq) => (
            <article key={sq.id} style={{ ...carteSection, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="color"
                  value={sq.couleur}
                  onChange={(e) => majSequence(sq.id, { couleur: e.target.value })}
                  title="Couleur dans la grille"
                  style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
                <input
                  value={sq.nom}
                  onChange={(e) => majSequence(sq.id, { nom: e.target.value })}
                  style={{ ...champ, fontWeight: 800, flex: 1, minWidth: 160 }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {sq.elements.length} élément{sq.elements.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setSequences((s) => s.filter((x) => x.id !== sq.id))}
                  title="Supprimer la séquence"
                  style={btnDanger}
                >
                  <X size={14} />
                </button>
              </div>

              {sq.elements.length === 0 ? (
                <p style={{ fontSize: 12, color: '#64748b', margin: '12px 0 0' }}>
                  Vide — ajoutez des médias depuis la médiathèque.
                </p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sq.elements.map((el, i) => {
                    const media = medias.find((m) => m.id === el.mediaId)
                    return (
                      <li key={el.id} style={ligneElement}>
                        <GripVertical size={14} color="#475569" />
                        <span style={{ fontSize: 12, color: '#64748b', width: 18 }}>{i + 1}</span>
                        {media?.type === 'video' ? <Film size={14} color="#a5b4fc" /> : <ImageIcon size={14} color="#a5b4fc" />}
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {media?.nom || 'Média supprimé'}
                        </span>
                        <label style={{ fontSize: 11, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={el.dureeSec}
                            onChange={(e) => majSequence(sq.id, {
                              elements: sq.elements.map((x) => x.id === el.id
                                ? { ...x, dureeSec: Math.max(0, Math.min(600, Number(e.target.value) || 0)) }
                                : x),
                            })}
                            style={{ ...champ, width: 68, fontSize: 12 }}
                          />
                          s
                        </label>
                        {media?.type === 'video' && el.dureeSec === 0 && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>jusqu’au bout</span>
                        )}
                        <button type="button" onClick={() => deplacerElement(sq.id, i, -1)} disabled={i === 0} style={btnMini}>↑</button>
                        <button type="button" onClick={() => deplacerElement(sq.id, i, 1)} disabled={i === sq.elements.length - 1} style={btnMini}>↓</button>
                        <button
                          type="button"
                          onClick={() => majSequence(sq.id, { elements: sq.elements.filter((x) => x.id !== el.id) })}
                          style={btnMini}
                        >
                          <X size={12} />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </article>
          ))}
        </section>
      )}

      {/* ─── GRILLE ──────────────────────────────────────────────────── */}
      {volet === 'grille' && (
        <section>
          {sequences.length === 0 ? (
            <div style={cadreVide}>
              Créez au moins une séquence avant de programmer la semaine.
            </div>
          ) : (
            <>
              {/* Palette */}
              <div style={{ ...carteSection, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 10 }}>
                  Choisissez une séquence, puis cliquez ou glissez sur les créneaux
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sequences.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPinceau(s.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 13px', borderRadius: 9, cursor: 'pointer',
                        fontSize: 12, fontWeight: 800, color: '#f8fafc',
                        border: `2px solid ${pinceau === s.id ? s.couleur : 'transparent'}`,
                        background: pinceau === s.id ? `${s.couleur}33` : 'rgba(148,163,184,0.12)',
                      }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: s.couleur }} />
                      {s.nom}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinceau(null)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '8px 13px', borderRadius: 9, cursor: 'pointer',
                      fontSize: 12, fontWeight: 800,
                      border: `2px solid ${pinceau === null ? '#ef4444' : 'transparent'}`,
                      background: pinceau === null ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.12)',
                      color: '#fca5a5',
                    }}
                  >
                    <Eraser size={13} /> Effacer
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <button type="button" onClick={remplirSemaine} style={btnSecondaire}>Remplir toute la semaine</button>
                  <button type="button" onClick={viderSemaine} style={btnSecondaire}>Vider la grille</button>
                  <button type="button" onClick={enregistrerGrille} style={btnPrincipal}>
                    <Save size={16} /> Enregistrer la grille
                  </button>
                </div>
              </div>

              {/* Grille 7 × 24 */}
              <div style={{ overflowX: 'auto', ...carteSection, padding: 12 }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%', minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 52 }} />
                      {JOURS.map((j, i) => (
                        <th key={j} style={{ padding: 0 }}>
                          <button
                            type="button"
                            onClick={() => (jourCopie === null ? copierJournee(i) : collerJournee(i))}
                            title={jourCopie === null ? `Copier ${j}` : `Coller sur ${j}`}
                            style={{
                              width: '100%', padding: '7px 4px', borderRadius: 7, cursor: 'pointer',
                              fontSize: 12, fontWeight: 800,
                              border: `1px solid ${jourCopie === i ? '#f59e0b' : 'rgba(148,163,184,0.25)'}`,
                              background: jourCopie === i ? 'rgba(245,158,11,0.2)' : 'transparent',
                              color: jourCopie === i ? '#fcd34d' : '#cbd5e1',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            }}
                          >
                            {JOURS_COURTS[i]}
                            <Copy size={11} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HEURES.map((h) => (
                      <tr key={h}>
                        <td style={{ fontSize: 11, color: '#64748b', textAlign: 'right', paddingRight: 6, fontVariantNumeric: 'tabular-nums' }}>
                          {String(h).padStart(2, '0')}h
                        </td>
                        {JOURS.map((_, j) => {
                          const sequenceId = carte.get(`${j}-${h}`)
                          const sq = sequenceId ? parSequence.get(sequenceId) : undefined
                          return (
                            <td key={j} style={{ padding: 0 }}>
                              <button
                                type="button"
                                title={sq
                                  ? `${JOURS[j]} ${String(h).padStart(2, '0')}h — ${sq.nom}`
                                  : `${JOURS[j]} ${String(h).padStart(2, '0')}h — libre`}
                                onMouseDown={() => { setPeinture(true); peindre(j, h) }}
                                onMouseEnter={() => { if (peinture) peindre(j, h) }}
                                style={{
                                  width: '100%', height: 22, borderRadius: 5, cursor: 'pointer',
                                  border: '1px solid rgba(148,163,184,0.16)',
                                  background: sq ? sq.couleur : 'rgba(148,163,184,0.07)',
                                  display: 'block',
                                }}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Créneaux vides */}
              <div style={{ ...carteSection, marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Quand un créneau est vide</div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  168 créneaux composent une semaine : ceux que vous ne remplissez pas suivent ce réglage.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={creneauVide.mode}
                    onChange={(e) => setCreneauVide({ ...creneauVide, mode: e.target.value as CreneauVide['mode'] })}
                    style={{ ...champ, minWidth: 190 }}
                  >
                    <option value="noir">Écran noir</option>
                    <option value="sequence">Rejouer une séquence de repli</option>
                    <option value="message">Afficher un message</option>
                  </select>

                  {creneauVide.mode === 'sequence' && (
                    <select
                      value={creneauVide.sequenceId || ''}
                      onChange={(e) => setCreneauVide({ ...creneauVide, sequenceId: e.target.value })}
                      style={{ ...champ, minWidth: 190 }}
                    >
                      <option value="">Choisir…</option>
                      {sequences.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  )}

                  {creneauVide.mode === 'message' && (
                    <input
                      value={creneauVide.message || ''}
                      onChange={(e) => setCreneauVide({ ...creneauVide, message: e.target.value })}
                      placeholder="Bienvenue au Café um Rond-Point"
                      style={{ ...champ, flex: 1, minWidth: 220 }}
                    />
                  )}

                  <button type="button" onClick={() => enregistrerCreneauVide(creneauVide)} style={btnSecondaire}>
                    <Save size={15} /> Enregistrer
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const btnPrincipal: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
  fontSize: 13, fontWeight: 800, color: '#fff',
  border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
}

const btnSecondaire: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
  fontSize: 13, fontWeight: 800, color: '#c7d2fe',
  border: '1px solid rgba(148,163,184,0.3)', background: 'transparent',
}

const btnDanger: React.CSSProperties = {
  display: 'grid', placeItems: 'center',
  width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
  border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
}

const btnMini: React.CSSProperties = {
  display: 'grid', placeItems: 'center',
  width: 26, height: 26, borderRadius: 6, cursor: 'pointer', fontSize: 12,
  border: '1px solid rgba(148,163,184,0.25)', background: 'transparent', color: '#94a3b8',
}

const champ: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8, fontSize: 13,
  border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.6)', color: '#f8fafc',
}

const carteSection: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.5)',
  borderRadius: 14, padding: 16,
}

const carteMedia: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.5)',
  borderRadius: 12, padding: 12,
}

const ligneElement: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9,
  padding: '8px 10px', borderRadius: 9,
  border: '1px solid rgba(148,163,184,0.14)', background: 'rgba(2,6,23,0.5)',
}

const cadreVide: React.CSSProperties = {
  border: '1px dashed rgba(148,163,184,0.3)', borderRadius: 12,
  padding: '28px 20px', textAlign: 'center', color: '#64748b', fontSize: 13,
}
