/**
 * Fiche société — données réelles (plus aucune maquette).
 *
 * GET /companies/:id           → identité, membres, modules
 * GET /companies/:id/metrics   → série TenantMetricDaily sur 30 jours
 * GET /companies/:id/volumes   → occupation disque + lignes par table
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Activity, Briefcase, Database, Euro,
  AlertTriangle, FileX, ClipboardCheck, Users,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { creatorApi, ApiError } from '../lib/api';
import {
  couleurs, carte, formatEuro, formatNombre, formatOctets, depuis,
} from '../lib/theme';

// ─── Types des réponses API ───────────────────────────────────────────

interface Membre {
  userId: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
  derniereConnexion: string | null;
}

interface FicheSociete {
  societe: {
    id: string;
    name: string;
    legalName: string | null;
    vatNumber: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    createdAt: string;
  };
  membres: Membre[];
  modules: { moduleId: string; isActive: boolean; expiresAt: string | null }[];
}

interface TenantMetricDaily {
  id: string;
  companyId: string;
  date: string;
  activeUsers: number;
  mutations: number;
  moduleUsage: Record<string, number>;
  revenue: number;
  orders: number;
  cashDiscrepancy: number;
  invoicesOverdueCount: number;
  invoicesOverdueAmount: number;
  expensesNoReceipt: number;
  haccpLogs: number;
  wasOpen: boolean;
  rowCounts: Record<string, number>;
  dataBytes: number;
}

interface Volumes {
  rowCounts: Record<string, number>;
  dataBytes: number;
}

type Onglet = 'usage' | 'metier' | 'volumes';

function messageErreur(erreur: unknown): string {
  if (erreur instanceof ApiError) return erreur.message;
  if (erreur instanceof Error) return erreur.message;
  return 'Erreur inconnue';
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState<Onglet>('usage');

  const fiche = useQuery({
    queryKey: ['societe', id],
    queryFn: () => creatorApi.get<FicheSociete>(`/companies/${id}`),
    enabled: id !== undefined,
  });

  const metriques = useQuery({
    queryKey: ['societe', id, 'metriques', 30],
    queryFn: () => creatorApi.get<TenantMetricDaily[]>(`/companies/${id}/metrics?jours=30`),
    enabled: id !== undefined,
  });

  const volumes = useQuery({
    queryKey: ['societe', id, 'volumes'],
    queryFn: () => creatorApi.get<Volumes>(`/companies/${id}/volumes`),
    enabled: id !== undefined,
  });

  const boutonRetour = (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => navigate('/clients')}
      style={{
        background: 'transparent', border: 'none', color: couleurs.texteSecondaire,
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 13, marginBottom: 20, padding: 0,
      }}
    >
      <ArrowLeft size={16} /> Retour aux clients
    </motion.button>
  );

  if (id === undefined) {
    return (
      <PagePleine>
        {boutonRetour}
        <MessageCarte couleur={couleurs.rouge} texte="Identifiant de société manquant dans l’URL." />
      </PagePleine>
    );
  }

  if (fiche.isLoading) {
    return (
      <PagePleine>
        {boutonRetour}
        <MessageCarte couleur={couleurs.texteSecondaire} texte="Chargement…" />
      </PagePleine>
    );
  }

  if (fiche.data === undefined) {
    return (
      <PagePleine>
        {boutonRetour}
        <MessageCarte couleur={couleurs.rouge} texte={`Erreur : ${messageErreur(fiche.error)}`} />
      </PagePleine>
    );
  }

  const { societe, membres } = fiche.data;
  const initiales =
    societe.name.split(/\s+/).filter(Boolean).slice(0, 2).map((mot) => mot[0]?.toUpperCase() ?? '').join('') || '?';

  const infosDiscretes = [
    societe.address,
    societe.vatNumber ? `TVA ${societe.vatNumber}` : null,
    societe.email,
    `Créée le ${new Date(societe.createdAt).toLocaleDateString('fr-LU')}`,
  ].filter((info): info is string => info !== null);

  const onglets: { cle: Onglet; libelle: string; icone: typeof Activity }[] = [
    { cle: 'usage', libelle: 'Usage', icone: Activity },
    { cle: 'metier', libelle: 'Métier', icone: Briefcase },
    { cle: 'volumes', libelle: 'Volumes', icone: Database },
  ];

  return (
    <PagePleine>
      {boutonRetour}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          ...carte, borderRadius: 14, padding: 24,
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24,
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: 16, flexShrink: 0,
          background: `linear-gradient(135deg, ${couleurs.accent}, ${couleurs.accentFonce})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 24, color: '#fff',
        }}>
          {initiales}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700 }}>{societe.name}</h1>
          {societe.legalName !== null && societe.legalName !== societe.name && (
            <div style={{ fontSize: 13, color: couleurs.texteSecondaire, marginBottom: 4 }}>
              {societe.legalName}
            </div>
          )}
          <div style={{
            fontSize: 13, color: couleurs.texteDiscret,
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {infosDiscretes.map((info, i) => (
              <span key={info} style={{ display: 'flex', gap: 10 }}>
                {i > 0 && <span>•</span>}
                {info}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div style={{
        display: 'flex', gap: 2, borderBottom: `1px solid ${couleurs.bordure}`,
        marginBottom: 24, overflowX: 'auto',
      }}>
        {onglets.map((o) => (
          <button
            key={o.cle}
            onClick={() => setOnglet(o.cle)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 18px', cursor: 'pointer',
              color: onglet === o.cle ? couleurs.accent : couleurs.texteSecondaire,
              borderBottom: `2px solid ${onglet === o.cle ? couleurs.accent : 'transparent'}`,
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            <o.icone size={14} /> {o.libelle}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={onglet}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {onglet === 'usage' && (
            metriques.isLoading
              ? <MessageCarte couleur={couleurs.texteSecondaire} texte="Chargement…" />
              : metriques.data === undefined
                ? <MessageCarte couleur={couleurs.rouge} texte={`Erreur : ${messageErreur(metriques.error)}`} />
                : <OngletUsage serie={metriques.data} membres={membres} />
          )}
          {onglet === 'metier' && (
            metriques.isLoading
              ? <MessageCarte couleur={couleurs.texteSecondaire} texte="Chargement…" />
              : metriques.data === undefined
                ? <MessageCarte couleur={couleurs.rouge} texte={`Erreur : ${messageErreur(metriques.error)}`} />
                : <OngletMetier serie={metriques.data} />
          )}
          {onglet === 'volumes' && (
            volumes.isLoading
              ? <MessageCarte couleur={couleurs.texteSecondaire} texte="Chargement…" />
              : volumes.data === undefined
                ? <MessageCarte couleur={couleurs.rouge} texte={`Erreur : ${messageErreur(volumes.error)}`} />
                : <OngletVolumes volumes={volumes.data} />
          )}
        </motion.div>
      </AnimatePresence>
    </PagePleine>
  );
}

// ─── Onglet Usage ─────────────────────────────────────────────────────

function OngletUsage({ serie, membres }: { serie: TenantMetricDaily[]; membres: Membre[] }) {
  const usageParModule = useMemo(() => {
    const totaux: Record<string, number> = {};
    for (const jour of serie) {
      for (const [module, n] of Object.entries(jour.moduleUsage ?? {})) {
        totaux[module] = (totaux[module] ?? 0) + n;
      }
    }
    return Object.entries(totaux)
      .map(([module, total]) => ({ module, total }))
      .sort((a, b) => b.total - a.total);
  }, [serie]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={carte}>
        <h3 style={titreCarte}>Usage par module — 30 jours</h3>
        {usageParModule.length === 0 ? (
          <TexteVide texte="Aucune donnée d’usage — la collecte vient de démarrer, l’historique se remplit chaque nuit." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, usageParModule.length * 36)}>
            <BarChart data={usageParModule} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke={couleurs.bordure} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                stroke={couleurs.texteSecondaire}
                fontSize={11}
                tickFormatter={(v) => formatNombre(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="module"
                stroke={couleurs.texteSecondaire}
                fontSize={12}
                width={140}
              />
              <Tooltip
                contentStyle={styleInfobulle}
                formatter={(v) => [formatNombre(Number(v)), 'Actions']}
              />
              <Bar dataKey="total" fill={couleurs.accent} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={carte}>
        <h3 style={{ ...titreCarte, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color={couleurs.accent} /> Membres ({formatNombre(membres.length)})
        </h3>
        {membres.length === 0 ? (
          <TexteVide texte="Aucun membre rattaché à cette société." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${couleurs.bordure}`, textAlign: 'left', color: couleurs.texteSecondaire }}>
                <th style={styleTh}>Membre</th>
                <th style={styleTh}>Email</th>
                <th style={styleTh}>Rôle</th>
                <th style={styleTh}>Statut</th>
                <th style={styleTh}>Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.userId} style={{ borderBottom: `1px solid ${couleurs.bordure}` }}>
                  <td style={{ ...styleTd, fontWeight: 600 }}>{m.prenom} {m.nom}</td>
                  <td style={{ ...styleTd, color: couleurs.texteSecondaire }}>{m.email}</td>
                  <td style={styleTd}>{m.role}</td>
                  <td style={styleTd}><BadgeActif actif={m.actif} /></td>
                  <td style={{ ...styleTd, color: couleurs.texteSecondaire }}>{depuis(m.derniereConnexion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Onglet Métier ────────────────────────────────────────────────────

function OngletMetier({ serie }: { serie: TenantMetricDaily[] }) {
  const { serieCa, ecartsCaisse, dernier, depensesSansJustif, totalHaccp, joursOuverts } = useMemo(() => {
    const triee = [...serie].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return {
      serieCa: triee.map((m) => ({
        date: new Date(m.date).toLocaleDateString('fr-LU', { day: '2-digit', month: '2-digit' }),
        revenue: m.revenue,
      })),
      ecartsCaisse: triee.reduce((somme, m) => somme + m.cashDiscrepancy, 0),
      dernier: triee.length > 0 ? triee[triee.length - 1] : null,
      depensesSansJustif: triee.reduce((somme, m) => somme + m.expensesNoReceipt, 0),
      totalHaccp: triee.reduce((somme, m) => somme + m.haccpLogs, 0),
      joursOuverts: triee.filter((m) => m.wasOpen).length,
    };
  }, [serie]);

  if (serie.length === 0 || dernier === null) {
    return (
      <div style={carte}>
        <TexteVide texte="Aucune métrique métier — la collecte vient de démarrer, l’historique se remplit chaque nuit." />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Tuile
          libelle="Écarts de caisse (30 j)"
          valeur={formatEuro(ecartsCaisse)}
          sousTexte="cumul de la période"
          icone={Euro}
          couleur={ecartsCaisse > 50 ? couleurs.rouge : couleurs.vert}
        />
        <Tuile
          libelle="Impayés (dernier relevé)"
          valeur={formatEuro(dernier.invoicesOverdueAmount)}
          sousTexte={`${formatNombre(dernier.invoicesOverdueCount)} facture(s) en retard`}
          icone={AlertTriangle}
          couleur={dernier.invoicesOverdueCount > 0 ? couleurs.orange : couleurs.vert}
        />
        <Tuile
          libelle="Dépenses sans justificatif (30 j)"
          valeur={formatNombre(depensesSansJustif)}
          sousTexte="cumul de la période"
          icone={FileX}
          couleur={depensesSansJustif > 0 ? couleurs.orange : couleurs.vert}
        />
        <Tuile
          libelle="Relevés HACCP (30 j)"
          valeur={formatNombre(totalHaccp)}
          sousTexte={`sur ${formatNombre(joursOuverts)} jour(s) ouvert(s)`}
          icone={ClipboardCheck}
          couleur={couleurs.bleu}
        />
      </div>

      <div style={carte}>
        <h3 style={titreCarte}>Chiffre d’affaires — 30 jours</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={serieCa}>
            <defs>
              <linearGradient id="degradeCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={couleurs.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={couleurs.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={couleurs.bordure} strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke={couleurs.texteSecondaire} fontSize={11} />
            <YAxis
              stroke={couleurs.texteSecondaire}
              fontSize={11}
              tickFormatter={(v) => formatEuro(Number(v))}
              width={80}
            />
            <Tooltip
              contentStyle={styleInfobulle}
              formatter={(v) => [formatEuro(Number(v)), 'CA']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={couleurs.accent}
              fill="url(#degradeCa)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Onglet Volumes ───────────────────────────────────────────────────

function OngletVolumes({ volumes }: { volumes: Volumes }) {
  const lignes = useMemo(
    () =>
      Object.entries(volumes.rowCounts)
        .filter(([, nombre]) => nombre > 0)
        .sort((a, b) => b[1] - a[1]),
    [volumes.rowCounts],
  );

  if (volumes.dataBytes === 0 && lignes.length === 0) {
    return (
      <div style={carte}>
        <TexteVide texte="Aucun volume mesuré — la collecte vient de démarrer, l’historique se remplit chaque nuit." />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ ...carte, textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ fontSize: 12, color: couleurs.texteSecondaire, marginBottom: 8 }}>
          Données stockées
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: couleurs.accent }}>
          {formatOctets(volumes.dataBytes)}
        </div>
      </div>

      <div style={carte}>
        <h3 style={titreCarte}>Lignes par table</h3>
        {lignes.length === 0 ? (
          <TexteVide texte="Aucune table avec des données pour cette société." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${couleurs.bordure}`, textAlign: 'left', color: couleurs.texteSecondaire }}>
                <th style={styleTh}>Table</th>
                <th style={{ ...styleTh, textAlign: 'right' }}>Lignes</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(([table, nombre]) => (
                <tr key={table} style={{ borderBottom: `1px solid ${couleurs.bordure}` }}>
                  <td style={{ ...styleTd, fontFamily: 'monospace' }}>{table}</td>
                  <td style={{ ...styleTd, textAlign: 'right', fontWeight: 600 }}>{formatNombre(nombre)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Briques d'affichage ──────────────────────────────────────────────

function PagePleine({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '32px 40px', background: couleurs.fond,
      minHeight: '100vh', color: couleurs.texte,
    }}>
      {children}
    </div>
  );
}

function MessageCarte({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <div style={{ ...carte, color: couleur, fontSize: 14 }}>{texte}</div>
  );
}

function TexteVide({ texte }: { texte: string }) {
  return (
    <div style={{ color: couleurs.texteDiscret, fontSize: 13, padding: '12px 0' }}>{texte}</div>
  );
}

function BadgeActif({ actif }: { actif: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: actif ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
      color: actif ? couleurs.vert : couleurs.texteSecondaire,
      border: `1px solid ${actif ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
    }}>
      {actif ? 'Actif' : 'Inactif'}
    </span>
  );
}

function Tuile({ libelle, valeur, sousTexte, icone: Icone, couleur }: {
  libelle: string;
  valeur: string;
  sousTexte: string;
  icone: typeof Euro;
  couleur: string;
}) {
  return (
    <div style={carte}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: couleurs.texteSecondaire, marginBottom: 6 }}>{libelle}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: couleur }}>{valeur}</div>
          <div style={{ fontSize: 11, color: couleurs.texteDiscret, marginTop: 4 }}>{sousTexte}</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${couleur}20`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icone size={20} color={couleur} />
        </div>
      </div>
    </div>
  );
}

const titreCarte: CSSProperties = { margin: '0 0 16px', fontSize: 16 };
const styleTh: CSSProperties = { padding: '10px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' };
const styleTd: CSSProperties = { padding: '12px 8px' };
const styleInfobulle: CSSProperties = {
  background: couleurs.panneau,
  border: `1px solid ${couleurs.bordure}`,
  borderRadius: 8,
};
