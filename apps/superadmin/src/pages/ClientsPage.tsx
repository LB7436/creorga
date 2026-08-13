import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Search } from 'lucide-react';
import { creatorApi, ApiError } from '../lib/api';
import { couleurs, carte, formatEuro, formatOctets, depuis } from '../lib/theme';

interface InstantaneQuotidien {
  revenue: number;
  dataBytes: number;
}

interface LigneSociete {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  creeLe: string;
  membres: number;
  derniereActivite: string | null;
  actif: boolean;
  dernierSnapshot: InstantaneQuotidien | null;
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.5,
  color: couleurs.texteDiscret,
  textTransform: 'uppercase',
  borderBottom: `1px solid ${couleurs.bordure}`,
};

const td: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  color: couleurs.texte,
  borderBottom: `1px solid ${couleurs.bordure}`,
};

function PastilleActivite({ actif }: { actif: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: actif ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: actif ? couleurs.vert : couleurs.rouge,
        border: `1px solid ${actif ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: actif ? couleurs.vert : couleurs.rouge,
        }}
      />
      {actif ? 'Actif' : 'Inactif 14 j+'}
    </span>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: () => creatorApi.get<LigneSociete[]>('/companies'),
  });

  const societes = (data ?? []).filter((s) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return s.nom.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: 32 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Users size={22} color={couleurs.accent} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: couleurs.texte, margin: 0 }}>
            Sociétés
          </h1>
          {data && (
            <span style={{ fontSize: 13, color: couleurs.texteDiscret }}>
              {data.length} au total
            </span>
          )}
        </div>
        <p style={{ color: couleurs.texteSecondaire, fontSize: 13, margin: '0 0 24px' }}>
          Tous les établissements équipés de Creorga.
        </p>
      </motion.div>

      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
        <Search
          size={15}
          style={{ position: 'absolute', left: 12, top: 11, color: couleurs.texteDiscret }}
        />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          style={{
            width: '100%',
            padding: '9px 12px 9px 36px',
            background: couleurs.panneau,
            border: `1px solid ${couleurs.bordure}`,
            borderRadius: 8,
            color: couleurs.texte,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {isLoading && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>Chargement…</div>
      )}

      {error && (
        <div style={{ ...carte, color: couleurs.rouge, fontSize: 13 }}>
          {error instanceof ApiError ? error.message : 'API injoignable'}
        </div>
      )}

      {data && societes.length === 0 && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>
          {recherche
            ? 'Aucune société ne correspond à cette recherche.'
            : 'Aucune société enregistrée pour le moment.'}
        </div>
      )}

      {societes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ ...carte, padding: 0, overflow: 'hidden' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Société</th>
                <th style={th}>Membres</th>
                <th style={th}>Dernière activité</th>
                <th style={th}>Activité</th>
                <th style={th}>CA (dernier instantané)</th>
                <th style={th}>Données</th>
              </tr>
            </thead>
            <tbody>
              {societes.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/clients/${s.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(167,139,250,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{s.nom}</div>
                    {s.email && (
                      <div style={{ fontSize: 11, color: couleurs.texteDiscret }}>{s.email}</div>
                    )}
                  </td>
                  <td style={td}>{s.membres}</td>
                  <td style={{ ...td, color: couleurs.texteSecondaire }}>
                    {depuis(s.derniereActivite)}
                  </td>
                  <td style={td}>
                    <PastilleActivite actif={s.actif} />
                  </td>
                  <td style={td}>
                    {s.dernierSnapshot ? formatEuro(s.dernierSnapshot.revenue) : '—'}
                  </td>
                  <td style={{ ...td, color: couleurs.texteSecondaire }}>
                    {s.dernierSnapshot ? formatOctets(s.dernierSnapshot.dataBytes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
