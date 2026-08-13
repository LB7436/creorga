import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Lightbulb, ChevronDown, ChevronUp, Copy, Check, Play,
  Send, ThumbsUp, XCircle, AlertTriangle,
} from 'lucide-react';
import { creatorApi, ApiError } from '../lib/api';
import { couleurs, carte, depuis } from '../lib/theme';

interface Preuve {
  periode: { debut: string; fin: string };
  valeur: number;
  unite: string;
  seuil: number;
  details: Array<Record<string, unknown>>;
  methode: string;
  fiabilite: 'exacte' | 'estimation';
}

interface Opportunite {
  id: string;
  companyId: string;
  societe: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  evidence: Preuve;
  status: 'NEW' | 'SENT' | 'ACCEPTED' | 'DISMISSED';
  statusNote: string | null;
  createdAt: string;
}

interface ReponseOpportunites {
  items: Opportunite[];
  total: number;
  moteurActif: boolean;
}

interface BilanMoteur {
  societes: number;
  reglesEvaluees: number;
  opportunites: number;
  erreurs: number;
}

const SEVERITES: Record<string, { fond: string; texte: string; bordure: string; libelle: string }> = {
  critical: { fond: 'rgba(239,68,68,0.12)', texte: '#f87171', bordure: 'rgba(239,68,68,0.35)', libelle: 'Critique' },
  warning: { fond: 'rgba(245,158,11,0.12)', texte: '#fbbf24', bordure: 'rgba(245,158,11,0.35)', libelle: 'Important' },
  info: { fond: 'rgba(96,165,250,0.12)', texte: '#60a5fa', bordure: 'rgba(96,165,250,0.35)', libelle: 'Info' },
};

const ONGLETS: Array<{ cle: string; libelle: string }> = [
  { cle: 'NEW', libelle: 'Nouvelles' },
  { cle: 'SENT', libelle: 'Envoyées' },
  { cle: 'ACCEPTED', libelle: 'Acceptées' },
  { cle: 'DISMISSED', libelle: 'Écartées' },
  { cle: '', libelle: 'Toutes' },
];

function CarteOpportunite({ opp }: { opp: Opportunite }) {
  const queryClient = useQueryClient();
  const [depliee, setDepliee] = useState(false);
  const [copiee, setCopiee] = useState(false);
  const sev = SEVERITES[opp.severity] ?? SEVERITES.info;

  const patch = useMutation({
    mutationFn: (status: Opportunite['status']) =>
      creatorApi.patch(`/opportunities/${opp.id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunites'] }),
  });

  const copierMessage = async () => {
    try {
      await navigator.clipboard.writeText(opp.message);
      setCopiee(true);
      setTimeout(() => setCopiee(false), 2000);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : sélection manuelle.
    }
  };

  const boutonAction: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${couleurs.bordure}`,
    background: 'transparent',
    color: couleurs.texteSecondaire,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...carte, borderLeft: `3px solid ${sev.texte}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            background: sev.fond,
            color: sev.texte,
            border: `1px solid ${sev.bordure}`,
          }}
        >
          {sev.libelle}
        </span>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: couleurs.texte }}>{opp.title}</div>
          <div style={{ fontSize: 12, color: couleurs.texteDiscret, marginTop: 2 }}>
            {opp.societe} · règle {opp.ruleId} · {depuis(opp.createdAt)}
            {opp.evidence.fiabilite === 'estimation' && (
              <span style={{ color: couleurs.orange, marginLeft: 8 }}>estimation</span>
            )}
          </div>
        </div>
        <button onClick={() => setDepliee(!depliee)} style={boutonAction}>
          {depliee ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Preuve
        </button>
      </div>

      {depliee && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: couleurs.fond,
            border: `1px solid ${couleurs.bordure}`,
            borderRadius: 8,
            fontSize: 12,
            color: couleurs.texteSecondaire,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            Période : {opp.evidence.periode.debut} → {opp.evidence.periode.fin} · Valeur :{' '}
            <strong style={{ color: couleurs.texte }}>
              {opp.evidence.valeur} {opp.evidence.unite}
            </strong>{' '}
            (seuil : {opp.evidence.seuil})
          </div>
          {opp.evidence.details.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <tbody>
                {opp.evidence.details.map((d, i) => (
                  <tr key={i}>
                    {Object.entries(d).map(([cle, valeur]) => (
                      <td
                        key={cle}
                        style={{ padding: '4px 8px', borderBottom: `1px solid ${couleurs.bordure}` }}
                      >
                        <span style={{ color: couleurs.texteDiscret }}>{cle} : </span>
                        <span style={{ color: couleurs.texte }}>{String(valeur)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontStyle: 'italic' }}>Méthode : {opp.evidence.methode}</div>
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'rgba(167,139,250,0.06)',
          border: `1px dashed rgba(167,139,250,0.3)`,
          borderRadius: 8,
          fontSize: 13,
          color: couleurs.texte,
          lineHeight: 1.6,
        }}
      >
        {opp.message}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          onClick={copierMessage}
          style={{
            ...boutonAction,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            border: 'none',
            color: '#fff',
          }}
        >
          {copiee ? <Check size={14} /> : <Copy size={14} />}
          {copiee ? 'Copié !' : 'Copier le message'}
        </button>
        {opp.status === 'NEW' && (
          <button onClick={() => patch.mutate('SENT')} style={boutonAction}>
            <Send size={14} /> Marquer envoyée
          </button>
        )}
        {(opp.status === 'NEW' || opp.status === 'SENT') && (
          <button
            onClick={() => patch.mutate('ACCEPTED')}
            style={{ ...boutonAction, color: couleurs.vert }}
          >
            <ThumbsUp size={14} /> Acceptée
          </button>
        )}
        {opp.status !== 'DISMISSED' && (
          <button
            onClick={() => patch.mutate('DISMISSED')}
            style={{ ...boutonAction, color: couleurs.texteDiscret }}
          >
            <XCircle size={14} /> Écarter
          </button>
        )}
        {opp.status !== 'NEW' && (
          <span style={{ fontSize: 11, color: couleurs.texteDiscret, alignSelf: 'center' }}>
            statut : {ONGLETS.find((o) => o.cle === opp.status)?.libelle ?? opp.status}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function OpportunitesPage() {
  const queryClient = useQueryClient();
  const [onglet, setOnglet] = useState('NEW');
  const [bilan, setBilan] = useState<BilanMoteur | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['opportunites', onglet],
    queryFn: () =>
      creatorApi.get<ReponseOpportunites>(
        `/opportunities${onglet ? `?status=${onglet}` : ''}`,
      ),
  });

  const lancerMoteur = useMutation({
    mutationFn: () => creatorApi.post<BilanMoteur>('/opportunities/engine/run'),
    onSuccess: (b) => {
      setBilan(b);
      queryClient.invalidateQueries({ queryKey: ['opportunites'] });
    },
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Lightbulb size={22} color={couleurs.accent} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: couleurs.texte, margin: 0, flex: 1 }}>
          Opportunités
        </h1>
        <button
          onClick={() => lancerMoteur.mutate()}
          disabled={lancerMoteur.isPending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 8,
            border: `1px solid ${couleurs.bordure}`,
            background: couleurs.panneau,
            color: couleurs.texte,
            fontSize: 13,
            fontWeight: 600,
            cursor: lancerMoteur.isPending ? 'wait' : 'pointer',
          }}
        >
          <Play size={14} color={couleurs.accent} />
          {lancerMoteur.isPending ? 'Analyse en cours…' : 'Lancer le moteur maintenant'}
        </button>
      </div>
      <p style={{ color: couleurs.texteSecondaire, fontSize: 13, margin: '4px 0 20px' }}>
        Propositions générées par les règles, avec preuve chiffrée. La console n'envoie jamais
        rien : copiez le message et envoyez-le vous-même.
      </p>

      {bilan && (
        <div
          style={{
            ...carte,
            padding: 12,
            marginBottom: 16,
            fontSize: 13,
            color: couleurs.texteSecondaire,
          }}
        >
          Cycle terminé : {bilan.opportunites} opportunité(s) sur {bilan.societes} société(s),{' '}
          {bilan.reglesEvaluees} règle(s) évaluée(s), {bilan.erreurs} erreur(s).
        </div>
      )}

      {data && !data.moteurActif && (
        <div
          style={{
            ...carte,
            padding: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: `1px solid rgba(245,158,11,0.35)`,
            color: couleurs.orange,
            fontSize: 13,
          }}
        >
          <AlertTriangle size={16} />
          Le cycle automatique est désactivé (CREATOR_ENGINE_ENABLED). Le bouton « Lancer le
          moteur » reste disponible.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {ONGLETS.map((o) => (
          <button
            key={o.cle || 'toutes'}
            onClick={() => setOnglet(o.cle)}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: `1px solid ${onglet === o.cle ? couleurs.accent : couleurs.bordure}`,
              background: onglet === o.cle ? 'rgba(167,139,250,0.15)' : 'transparent',
              color: onglet === o.cle ? couleurs.accent : couleurs.texteSecondaire,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {o.libelle}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>Chargement…</div>
      )}

      {error && (
        <div style={{ ...carte, color: couleurs.rouge, fontSize: 13 }}>
          {error instanceof ApiError ? error.message : 'API injoignable'}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>
          {onglet === 'NEW'
            ? 'Aucune opportunité nouvelle — les règles n’ont rien détecté qui mérite votre attention.'
            : 'Rien dans cette catégorie.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(data?.items ?? []).map((opp) => (
          <CarteOpportunite key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}
