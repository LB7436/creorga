/**
 * Journal & audit transversal — activité des clients et erreurs serveur.
 *
 * Données réelles via /api/creator :
 * - GET /events  (filtres companyId, module, method, date + pagination)
 * - GET /errors  (pagination, stack dépliable)
 * - GET /companies (alimente le sélecteur de société)
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { creatorApi, ApiError } from '../lib/api';
import { couleurs, carte, formatDateHeure, formatNombre } from '../lib/theme';

// ─── Types des réponses API ───────────────────────────────────────────

interface EvenementActivite {
  id: string;
  ts: string;
  companyId: string | null;
  userId: string | null;
  role: string | null;
  method: string;
  module: string | null;
  path: string;
  status: number;
  durationMs: number;
  utilisateur: string | null;
  societe: string | null;
}

interface PageEvenements {
  items: EvenementActivite[];
  total: number;
  page: number;
  limit: number;
}

interface ErreurServeur {
  id: string;
  ts: string;
  method: string;
  path: string;
  companyId: string | null;
  message: string;
  stack: string | null;
}

interface PageErreurs {
  items: ErreurServeur[];
  total: number;
  page: number;
  limit: number;
}

interface SocieteResume {
  id: string;
  nom: string;
}

// ─── Constantes et aides ──────────────────────────────────────────────

const LIMITE = 50;
const METHODES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Construit la query string en omettant les filtres vides. */
function construireQuery(params: Record<string, string>): string {
  const usp = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur !== '') usp.set(cle, valeur);
  }
  return usp.toString();
}

function messageErreur(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Erreur inconnue';
}

function couleurMethode(methode: string): string {
  switch (methode) {
    case 'GET':
      return couleurs.bleu;
    case 'POST':
      return couleurs.vert;
    case 'PUT':
    case 'PATCH':
      return couleurs.orange;
    case 'DELETE':
      return couleurs.rouge;
    default:
      return couleurs.texteSecondaire;
  }
}

function couleurStatut(status: number): string {
  if (status >= 500) return couleurs.rouge;
  if (status >= 400) return couleurs.orange;
  return couleurs.vert;
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [onglet, setOnglet] = useState<'activite' | 'erreurs'>('activite');

  // Filtres de l'onglet Activité — tout changement ramène à la page 1.
  const [filtreSociete, setFiltreSociete] = useState('');
  const [filtreModule, setFiltreModule] = useState('');
  const [filtreMethode, setFiltreMethode] = useState('');
  const [filtreDate, setFiltreDate] = useState('');
  const [pageActivite, setPageActivite] = useState(1);

  const [pageErreurs, setPageErreurs] = useState(1);
  const [erreurDepliee, setErreurDepliee] = useState<string | null>(null);

  const querySocietes = useQuery({
    queryKey: ['companies'],
    queryFn: () => creatorApi.get<SocieteResume[]>('/companies'),
  });

  const queryEvenements = useQuery({
    queryKey: ['events', filtreSociete, filtreModule, filtreMethode, filtreDate, pageActivite],
    queryFn: () =>
      creatorApi.get<PageEvenements>(
        `/events?${construireQuery({
          companyId: filtreSociete,
          module: filtreModule.trim(),
          method: filtreMethode,
          date: filtreDate,
          page: String(pageActivite),
          limit: String(LIMITE),
        })}`,
      ),
    enabled: onglet === 'activite',
  });

  const queryErreurs = useQuery({
    queryKey: ['errors', pageErreurs],
    queryFn: () =>
      creatorApi.get<PageErreurs>(
        `/errors?${construireQuery({ page: String(pageErreurs), limit: String(LIMITE) })}`,
      ),
    enabled: onglet === 'erreurs',
  });

  const filtresActifs =
    filtreSociete !== '' || filtreModule.trim() !== '' || filtreMethode !== '' || filtreDate !== '';

  return (
    <div style={{ padding: '32px 40px', background: couleurs.fond, minHeight: '100vh', color: couleurs.texte }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Journal &amp; audit</h1>
        <p style={{ margin: '6px 0 0', color: couleurs.texteSecondaire, fontSize: 14 }}>
          Activité des clients et erreurs serveur — chaque requête est journalisée
        </p>
      </motion.div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${couleurs.bordure}`, marginBottom: 20 }}>
        <BoutonOnglet
          actif={onglet === 'activite'}
          onClick={() => setOnglet('activite')}
          icone={<Activity size={14} />}
          libelle="Activité"
        />
        <BoutonOnglet
          actif={onglet === 'erreurs'}
          onClick={() => setOnglet('erreurs')}
          icone={<AlertTriangle size={14} />}
          libelle="Erreurs"
        />
      </div>

      {onglet === 'activite' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Filtres */}
          <div style={{ ...carte, padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <select
              value={filtreSociete}
              onChange={(e) => {
                setFiltreSociete(e.target.value);
                setPageActivite(1);
              }}
              style={champ}
            >
              <option value="">Toutes les sociétés</option>
              {(querySocietes.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
            <input
              placeholder="Module (ex. pos, invoices…)"
              value={filtreModule}
              onChange={(e) => {
                setFiltreModule(e.target.value);
                setPageActivite(1);
              }}
              style={{ ...champ, width: 210 }}
            />
            <select
              value={filtreMethode}
              onChange={(e) => {
                setFiltreMethode(e.target.value);
                setPageActivite(1);
              }}
              style={champ}
            >
              <option value="">Toutes les méthodes</option>
              {METHODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filtreDate}
              onChange={(e) => {
                setFiltreDate(e.target.value);
                setPageActivite(1);
              }}
              style={champ}
            />
            {querySocietes.isError && (
              <span style={{ fontSize: 12, color: couleurs.orange }}>
                Sociétés indisponibles : {messageErreur(querySocietes.error)}
              </span>
            )}
          </div>

          {/* Tableau d'activité */}
          <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
            {queryEvenements.isError ? (
              <EtatMessage couleur={couleurs.rouge}>
                Impossible de charger le journal : {messageErreur(queryEvenements.error)}
              </EtatMessage>
            ) : !queryEvenements.data ? (
              <EtatMessage>Chargement…</EtatMessage>
            ) : queryEvenements.data.items.length === 0 ? (
              <EtatMessage>
                {filtresActifs
                  ? 'Aucun événement ne correspond à ces filtres.'
                  : 'Aucun événement — le journal se remplit au fil de l’activité des clients.'}
              </EtatMessage>
            ) : (
              <>
                <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: couleurs.panneau, zIndex: 1 }}>
                      <tr style={{ color: couleurs.texteSecondaire, textAlign: 'left', borderBottom: `1px solid ${couleurs.bordure}` }}>
                        <th style={thStyle}>Heure</th>
                        <th style={thStyle}>Société</th>
                        <th style={thStyle}>Utilisateur</th>
                        <th style={thStyle}>Méthode</th>
                        <th style={thStyle}>Module</th>
                        <th style={thStyle}>Chemin</th>
                        <th style={thStyle}>Statut</th>
                        <th style={thStyle}>Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryEvenements.data.items.map((e) => (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${couleurs.bordure}` }}>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', color: couleurs.texteSecondaire, whiteSpace: 'nowrap' }}>
                            {formatDateHeure(e.ts)}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{e.societe ?? '—'}</td>
                          <td style={tdStyle}>{e.utilisateur ?? '—'}</td>
                          <td style={tdStyle}>
                            <BadgeMethode methode={e.method} />
                          </td>
                          <td style={{ ...tdStyle, color: couleurs.accent, fontFamily: 'monospace' }}>{e.module || '—'}</td>
                          <td
                            style={{ ...tdStyle, fontFamily: 'monospace', color: couleurs.texteSecondaire, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={e.path}
                          >
                            {e.path}
                          </td>
                          <td style={{ ...tdStyle, color: couleurStatut(e.status), fontWeight: 700, fontFamily: 'monospace' }}>
                            {e.status}
                          </td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: couleurs.texteSecondaire }}>
                            {formatNombre(e.durationMs)} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pageActivite}
                  total={queryEvenements.data.total}
                  onPage={setPageActivite}
                />
              </>
            )}
          </div>
        </motion.div>
      )}

      {onglet === 'erreurs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
            {queryErreurs.isError ? (
              <EtatMessage couleur={couleurs.rouge}>
                Impossible de charger les erreurs : {messageErreur(queryErreurs.error)}
              </EtatMessage>
            ) : !queryErreurs.data ? (
              <EtatMessage>Chargement…</EtatMessage>
            ) : queryErreurs.data.items.length === 0 ? (
              <EtatMessage>Aucune erreur enregistrée — rien à signaler.</EtatMessage>
            ) : (
              <>
                <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: couleurs.panneau, zIndex: 1 }}>
                      <tr style={{ color: couleurs.texteSecondaire, textAlign: 'left', borderBottom: `1px solid ${couleurs.bordure}` }}>
                        <th style={thStyle}>Heure</th>
                        <th style={thStyle}>Requête</th>
                        <th style={thStyle}>Société</th>
                        <th style={thStyle}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryErreurs.data.items.map((err) => (
                        <LigneErreur
                          key={err.id}
                          erreur={err}
                          depliee={erreurDepliee === err.id}
                          onToggle={() => setErreurDepliee(erreurDepliee === err.id ? null : err.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={pageErreurs} total={queryErreurs.data.total} onPage={setPageErreurs} />
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function BoutonOnglet({ actif, onClick, icone, libelle }: { actif: boolean; onClick: () => void; icone: React.ReactNode; libelle: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '12px 18px',
        cursor: 'pointer',
        color: actif ? couleurs.accent : couleurs.texteSecondaire,
        borderBottom: `2px solid ${actif ? couleurs.accent : 'transparent'}`,
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: -1,
      }}
    >
      {icone} {libelle}
    </button>
  );
}

function BadgeMethode({ methode }: { methode: string }) {
  const c = couleurMethode(methode);
  return (
    <span
      style={{
        background: `${c}26`,
        color: c,
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'monospace',
      }}
    >
      {methode}
    </span>
  );
}

function LigneErreur({ erreur, depliee, onToggle }: { erreur: ErreurServeur; depliee: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderBottom: depliee ? 'none' : `1px solid ${couleurs.bordure}`, cursor: 'pointer' }}
        title={depliee ? 'Replier la stack' : 'Déplier la stack'}
      >
        <td style={{ ...tdStyle, fontFamily: 'monospace', color: couleurs.texteSecondaire, whiteSpace: 'nowrap' }}>
          {formatDateHeure(erreur.ts)}
        </td>
        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
          <BadgeMethode methode={erreur.method} />{' '}
          <span style={{ fontFamily: 'monospace', color: couleurs.texteSecondaire }}>{erreur.path}</span>
        </td>
        <td style={tdStyle}>{erreur.companyId ?? '—'}</td>
        <td style={{ ...tdStyle, color: couleurs.rouge }}>{erreur.message}</td>
      </tr>
      {depliee && (
        <tr style={{ borderBottom: `1px solid ${couleurs.bordure}` }}>
          <td colSpan={4} style={{ padding: '0 12px 12px' }}>
            {erreur.stack ? (
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: couleurs.fond,
                  border: `1px solid ${couleurs.bordure}`,
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: couleurs.texteSecondaire,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: 260,
                  overflowY: 'auto',
                }}
              >
                {erreur.stack}
              </pre>
            ) : (
              <div style={{ fontSize: 12, color: couleurs.texteDiscret }}>Aucune stack enregistrée pour cette erreur.</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const nbPages = Math.max(1, Math.ceil(total / LIMITE));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: `1px solid ${couleurs.bordure}`,
      }}
    >
      <span style={{ fontSize: 12, color: couleurs.texteSecondaire }}>
        {formatNombre(total)} {total > 1 ? 'entrées' : 'entrée'} — page {page} / {nbPages}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} style={boutonPage(page <= 1)}>
          <ChevronLeft size={13} /> Précédent
        </button>
        <button disabled={page >= nbPages} onClick={() => onPage(page + 1)} style={boutonPage(page >= nbPages)}>
          Suivant <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

function EtatMessage({ children, couleur }: { children: React.ReactNode; couleur?: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', fontSize: 13, color: couleur ?? couleurs.texteSecondaire }}>
      {children}
    </div>
  );
}

// ─── Styles partagés ──────────────────────────────────────────────────

const champ: CSSProperties = {
  background: couleurs.fond,
  border: `1px solid ${couleurs.bordure}`,
  color: couleurs.texte,
  padding: '8px 10px',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  colorScheme: 'dark',
};

const thStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
};

const tdStyle: CSSProperties = { padding: '10px 12px' };

function boutonPage(desactive: boolean): CSSProperties {
  return {
    background: couleurs.panneau,
    border: `1px solid ${couleurs.bordure}`,
    color: desactive ? couleurs.texteDiscret : couleurs.texte,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: desactive ? 'default' : 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    opacity: desactive ? 0.5 : 1,
  };
}
