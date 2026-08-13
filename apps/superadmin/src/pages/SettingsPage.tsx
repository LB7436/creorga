/**
 * Réglages de la console créateur.
 *
 * Compte, double authentification TOTP, rétention RGPD et règles
 * d'opportunités (phase suivante). Données réelles via GET /auth/me —
 * aucune donnée inventée : chaque état (chargement, erreur, vide) dit la vérité.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { creatorApi } from '../lib/api';
import { carte, couleurs, formatDateHeure } from '../lib/theme';

// ─── Types des réponses API ──────────────────────────────────────────────────

interface ProfilCreateur {
  email: string;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ReponseTotpSetup {
  secret: string;
  uri: string;
}

interface ReponseTotpConfirm {
  totpEnabled: boolean;
}

// ─── Politique de rétention (fixe, lecture seule) ────────────────────────────

const RETENTION: { donnee: string; duree: string }[] = [
  { donnee: 'Événements d’usage', duree: '90 jours' },
  { donnee: 'Connexions', duree: '180 jours' },
  { donnee: 'Erreurs', duree: '30 jours' },
  { donnee: 'Instantanés quotidiens', duree: 'Illimités' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const clientRequetes = useQueryClient();
  const [code, setCode] = useState('');

  const profil = useQuery({
    queryKey: ['me'],
    queryFn: () => creatorApi.get<ProfilCreateur>('/auth/me'),
  });

  const activation = useMutation({
    mutationFn: () => creatorApi.post<ReponseTotpSetup>('/auth/totp/setup'),
  });

  const confirmation = useMutation({
    mutationFn: (codeSaisi: string) =>
      creatorApi.post<ReponseTotpConfirm>('/auth/totp/confirm', { code: codeSaisi }),
    onSuccess: () => {
      void clientRequetes.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return (
    <div style={{ padding: 32, maxWidth: 860, color: couleurs.texte }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Réglages</h1>
        <p style={{ margin: '4px 0 24px', color: couleurs.texteSecondaire, fontSize: 13 }}>
          Compte créateur, double authentification et politique de rétention
        </p>

        {profil.isLoading && (
          <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>Chargement…</div>
        )}

        {profil.isError && (
          <div style={{ ...carte, border: `1px solid ${couleurs.rouge}`, color: couleurs.rouge, fontSize: 13 }}>
            {profil.error.message}
          </div>
        )}

        {!profil.isLoading && !profil.isError && !profil.data && (
          <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>
            Aucune donnée de compte — la session semble incomplète, reconnectez-vous.
          </div>
        )}

        {profil.data && (
          <>
            {/* ── 1. Compte ─────────────────────────────────────────────── */}
            <section style={{ marginBottom: 24 }}>
              <TitreSection icone={User} titre="Compte" />
              <div style={carte}>
                <Ligne libelle="Email" valeur={profil.data.email} />
                <Ligne libelle="Dernière connexion" valeur={formatDateHeure(profil.data.lastLoginAt)} />
                <Ligne libelle="Créé le" valeur={formatDateHeure(profil.data.createdAt)} derniere />
              </div>
            </section>

            {/* ── 2. Double authentification (TOTP) ─────────────────────── */}
            <section style={{ marginBottom: 24 }}>
              <TitreSection
                icone={profil.data.totpEnabled ? ShieldCheck : ShieldAlert}
                titre="Double authentification (TOTP)"
              />

              {confirmation.isSuccess || profil.data.totpEnabled ? (
                <div style={panneauTeinte(couleurs.vert)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} color={couleurs.vert} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: couleurs.vert }}>
                        {confirmation.isSuccess
                          ? '2FA activée avec succès'
                          : '2FA active — exigée à chaque connexion'}
                      </div>
                      {confirmation.isSuccess && (
                        <div style={{ fontSize: 12, color: couleurs.texteSecondaire, marginTop: 2 }}>
                          Elle sera exigée à chaque connexion à la console.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={panneauTeinte(couleurs.orange)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldAlert size={18} color={couleurs.orange} />
                      <div style={{ fontWeight: 700, fontSize: 14, color: couleurs.orange }}>
                        2FA non configurée
                      </div>
                    </div>
                    {!activation.data && (
                      <button
                        type="button"
                        onClick={() => activation.mutate()}
                        disabled={activation.isPending}
                        style={{ ...boutonPrincipal, opacity: activation.isPending ? 0.6 : 1 }}
                      >
                        {activation.isPending ? 'Activation…' : 'Activer'}
                      </button>
                    )}
                  </div>

                  {activation.isError && (
                    <div style={{ marginTop: 12, fontSize: 12, color: couleurs.rouge }}>
                      {activation.error.message}
                    </div>
                  )}

                  {activation.data && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: couleurs.texteSecondaire, marginBottom: 6 }}>
                        Reportez ce secret dans votre application authenticator :
                      </div>
                      <div
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 22,
                          fontWeight: 700,
                          letterSpacing: 3,
                          padding: '12px 16px',
                          background: couleurs.fond,
                          border: `1px solid ${couleurs.bordure}`,
                          borderRadius: 8,
                          wordBreak: 'break-all',
                          marginBottom: 12,
                        }}
                      >
                        {activation.data.secret}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          color: couleurs.texteDiscret,
                          wordBreak: 'break-all',
                          marginBottom: 6,
                        }}
                      >
                        {activation.data.uri}
                      </div>
                      <a
                        href={activation.data.uri}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: couleurs.accent,
                          textDecoration: 'none',
                          marginBottom: 16,
                        }}
                      >
                        <ExternalLink size={13} />
                        Ouvrir dans l’app authenticator
                      </a>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Code à 6 chiffres"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          style={{
                            padding: '10px 14px',
                            background: couleurs.fond,
                            border: `1px solid ${couleurs.bordure}`,
                            borderRadius: 8,
                            color: couleurs.texte,
                            fontSize: 16,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            letterSpacing: 4,
                            width: 170,
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => confirmation.mutate(code)}
                          disabled={code.length !== 6 || confirmation.isPending}
                          style={{
                            ...boutonPrincipal,
                            opacity: code.length !== 6 || confirmation.isPending ? 0.5 : 1,
                          }}
                        >
                          {confirmation.isPending ? 'Vérification…' : 'Confirmer'}
                        </button>
                      </div>

                      {confirmation.isError && (
                        <div style={{ marginTop: 10, fontSize: 12, color: couleurs.rouge }}>
                          {confirmation.error.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 3. Rétention des données (RGPD) ───────────────────────── */}
            <section style={{ marginBottom: 24 }}>
              <TitreSection icone={Database} titre="Rétention des données (RGPD)" />
              <div style={{ ...carte, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${couleurs.bordure}` }}>
                      <th style={enTete}>Donnée</th>
                      <th style={{ ...enTete, textAlign: 'right' }}>Durée de conservation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETENTION.map((r, i) => (
                      <tr
                        key={r.donnee}
                        style={{ borderBottom: i < RETENTION.length - 1 ? `1px solid ${couleurs.bordure}` : 'none' }}
                      >
                        <td style={{ padding: '12px 20px' }}>{r.donnee}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', color: couleurs.texteSecondaire }}>
                          {r.duree}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '10px 2px 0', fontSize: 12, color: couleurs.texteDiscret }}>
                Des actions, pas des contenus : ni corps de requête, ni IP, ni user-agent.
              </p>
            </section>

            {/* ── 4. Règles d'opportunités ──────────────────────────────── */}
            <section style={{ marginBottom: 24 }}>
              <TitreSection icone={Lightbulb} titre="Règles d’opportunités" />
              <div style={{ ...carte, color: couleurs.texteSecondaire, fontSize: 13 }}>
                Livré avec le moteur d’opportunités (phase suivante) — aucun réglage à afficher pour l’instant.
              </div>
            </section>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Sous-composants et styles ───────────────────────────────────────────────

function TitreSection({ icone: Icone, titre }: { icone: LucideIcon; titre: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Icone size={15} color={couleurs.accent} />
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>{titre}</h2>
    </div>
  );
}

function Ligne({ libelle, valeur, derniere }: { libelle: string; valeur: string; derniere?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: derniere ? 'none' : `1px solid ${couleurs.bordure}`,
        fontSize: 13,
      }}
    >
      <span style={{ color: couleurs.texteSecondaire }}>{libelle}</span>
      <span style={{ fontWeight: 600 }}>{valeur}</span>
    </div>
  );
}

/** Panneau type carte teinté (vert = OK, orange = attention). */
function panneauTeinte(couleur: string): CSSProperties {
  return {
    ...carte,
    border: `1px solid ${couleur}55`,
    background: `${couleur}0d`,
  };
}

const boutonPrincipal: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 16px',
  background: `linear-gradient(135deg, ${couleurs.accent}, ${couleurs.accentFonce})`,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
};

const enTete: CSSProperties = {
  padding: '12px 20px',
  textAlign: 'left',
  fontSize: 11,
  color: couleurs.texteSecondaire,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};
