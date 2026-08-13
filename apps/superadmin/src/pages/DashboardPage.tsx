/**
 * Vue d'ensemble — activité réelle des sociétés clientes.
 *
 * Remplace la maquette (MRR, churn, géographie inventés) par les données
 * du backend : GET /overview. Un écran vide ne ment pas.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Euro, ShoppingCart, Building2, Sparkles } from 'lucide-react';
import { creatorApi } from '../lib/api';
import { couleurs, carte, formatEuro, formatNombre, depuis } from '../lib/theme';

// ─── Types de la réponse API (contrat GET /overview) ─────────────────

interface PointSerie {
  date: string;
  revenue: number;
  orders: number;
  mutations: number;
  activeUsers: number;
  cashDiscrepancy: number;
}

interface SocieteOverview {
  id: string;
  nom: string;
  creeLe: string;
  caJour: number;
  commandesJour: number;
  ca30Jours: number;
  commandes30Jours: number;
  actifsAujourdhui: number;
  opportunitesNouvelles: number;
  derniereActivite: string | null;
  serie: PointSerie[];
}

interface ReponseOverview {
  societes: SocieteOverview[];
}

// ─── Tuile agrégée (rangée du haut) ──────────────────────────────────

function Tuile({
  label,
  valeur,
  Icone,
  teinte,
}: {
  label: string;
  valeur: string;
  Icone: typeof Euro;
  teinte: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={carte}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${teinte}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icone size={20} color={teinte} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: couleurs.texte, marginBottom: 4 }}>
        {valeur}
      </div>
      <div style={{ fontSize: 12, color: couleurs.texteSecondaire }}>{label}</div>
    </motion.div>
  );
}

// ─── Carte société ───────────────────────────────────────────────────

function Metrique({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: couleurs.texte }}>{valeur}</div>
      <div style={{ fontSize: 11, color: couleurs.texteDiscret }}>{label}</div>
    </div>
  );
}

function CarteSociete({ societe, index }: { societe: SocieteOverview; index: number }) {
  const navigate = useNavigate();
  const idDegrade = `degrade-ca-${societe.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ scale: 1.01, borderColor: couleurs.accent }}
      onClick={() => navigate(`/clients/${societe.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/clients/${societe.id}`);
      }}
      role="button"
      tabIndex={0}
      style={{ ...carte, cursor: 'pointer' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: couleurs.texte }}>
          {societe.nom}
        </h3>
        {societe.opportunitesNouvelles > 0 && (
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 600,
              color: couleurs.accent,
              background: 'rgba(167, 139, 250, 0.15)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              borderRadius: 999,
              padding: '3px 10px',
            }}
          >
            {formatNombre(societe.opportunitesNouvelles)}{' '}
            {societe.opportunitesNouvelles > 1 ? 'opportunités' : 'opportunité'}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Metrique label="CA jour" valeur={formatEuro(societe.caJour)} />
        <Metrique label="Commandes jour" valeur={formatNombre(societe.commandesJour)} />
        <Metrique label="CA 30 j" valeur={formatEuro(societe.ca30Jours)} />
        <Metrique label="Actifs aujourd'hui" valeur={formatNombre(societe.actifsAujourdhui)} />
      </div>

      {societe.serie.length > 0 ? (
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={societe.serie} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={idDegrade} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={couleurs.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={couleurs.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: couleurs.panneau,
                  border: `1px solid ${couleurs.bordure}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: couleurs.texteSecondaire }}
                formatter={(v) => [formatEuro(Number(v)), 'CA']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={couleurs.accent}
                strokeWidth={2}
                fill={`url(#${idDegrade})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: couleurs.texteDiscret,
            background: couleurs.fond,
            border: `1px dashed ${couleurs.bordure}`,
            borderRadius: 8,
            padding: '0 12px',
            textAlign: 'center',
          }}
        >
          Historique en construction — premier instantané cette nuit
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: couleurs.texteSecondaire }}>
        dernière activité : {depuis(societe.derniereActivite)}
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => creatorApi.get<ReponseOverview>('/overview'),
  });

  const societes = data?.societes ?? [];
  const caJourTotal = societes.reduce((somme, s) => somme + s.caJour, 0);
  const commandesJourTotal = societes.reduce((somme, s) => somme + s.commandesJour, 0);
  const societesActives = societes.filter((s) => s.actifsAujourdhui > 0).length;
  const opportunitesTotal = societes.reduce((somme, s) => somme + s.opportunitesNouvelles, 0);

  return (
    <div style={{ padding: 32 }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: couleurs.texte }}>
          Vue d'ensemble
        </h1>
        <p style={{ margin: 0, color: couleurs.texteSecondaire, fontSize: 14 }}>
          Activité réelle de vos sociétés clientes — aujourd'hui et sur 30 jours
        </p>
      </motion.div>

      {isLoading && (
        <div style={{ color: couleurs.texteSecondaire, fontSize: 14 }}>Chargement…</div>
      )}

      {error !== null && error !== undefined && (
        <div
          style={{
            ...carte,
            borderColor: 'rgba(248, 113, 113, 0.4)',
            color: couleurs.rouge,
            fontSize: 14,
          }}
        >
          Impossible de charger la vue d'ensemble :{' '}
          {error instanceof Error ? error.message : 'erreur inconnue'}
        </div>
      )}

      {!isLoading && !error && societes.length === 0 && (
        <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 14 }}>
          Aucune société pour l'instant — les cartes apparaîtront dès la première inscription.
        </div>
      )}

      {!isLoading && !error && societes.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <Tuile
              label="CA aujourd'hui (toutes sociétés)"
              valeur={formatEuro(caJourTotal)}
              Icone={Euro}
              teinte={couleurs.accent}
            />
            <Tuile
              label="Commandes aujourd'hui"
              valeur={formatNombre(commandesJourTotal)}
              Icone={ShoppingCart}
              teinte={couleurs.bleu}
            />
            <Tuile
              label="Sociétés actives aujourd'hui"
              valeur={`${formatNombre(societesActives)} / ${formatNombre(societes.length)}`}
              Icone={Building2}
              teinte={couleurs.vert}
            />
            <Tuile
              label="Opportunités nouvelles"
              valeur={formatNombre(opportunitesTotal)}
              Icone={Sparkles}
              teinte={couleurs.orange}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}
          >
            {societes.map((societe, index) => (
              <CarteSociete key={societe.id} societe={societe} index={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
