import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, Globe, FileClock, Webhook, Plus, X,
  CheckCircle, Lock, Trash2, Edit3, Send,
} from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'Fondateur' | 'Admin' | 'Support' | 'Finance';
  lastActive: string;
}

const TEAM: TeamMember[] = [
  { id: 1, name: 'Bryan L.', email: 'bryan@creorga.lu', role: 'Fondateur', lastActive: 'En ligne' },
  { id: 2, name: 'Sophie Martin', email: 'sophie@creorga.lu', role: 'Admin', lastActive: 'il y a 15min' },
  { id: 3, name: 'Thomas Keller', email: 'thomas@creorga.lu', role: 'Support', lastActive: 'il y a 2h' },
  { id: 4, name: 'Laura Dupont', email: 'laura@creorga.lu', role: 'Finance', lastActive: 'hier' },
];

const PERMS: Record<string, string[]> = {
  Fondateur: ['Tous accès', 'Facturation globale', 'Gestion équipe', 'Logs sécurité', 'Impersonnification'],
  Admin: ['Gérer clients', 'Voir facturation', 'Feature flags', 'Impersonnification'],
  Support: ['Voir clients', 'Tickets support', 'Logs système (lecture)'],
  Finance: ['Voir clients', 'Facturation', 'Rapports TVA', 'Export comptable'],
};

const AUDIT = [
  { who: 'Bryan L.', action: 'A activé le feature flag "AI Assistant" pour Brasserie LU', when: 'il y a 32min' },
  { who: 'Sophie Martin', action: 'A impersonnifié le compte de Le Gourmand', when: 'il y a 2h' },
  { who: 'Thomas Keller', action: 'A répondu au ticket #4812', when: 'il y a 3h' },
  { who: 'Bryan L.', action: 'A ajouté 85.93.118.42 à la whitelist IP', when: 'hier' },
  { who: 'Laura Dupont', action: 'A exporté le rapport TVA du trimestre', when: 'hier' },
  { who: 'Sophie Martin', action: 'A changé le plan de Chez Marco vers Business', when: 'il y a 2j' },
];

const WEBHOOKS = [
  { url: 'https://hooks.slack.com/services/T.../B.../xxx', event: 'Nouveau client', enabled: true },
  { url: 'https://hooks.slack.com/services/T.../B.../yyy', event: 'Churn détecté', enabled: true },
  { url: 'https://hooks.slack.com/services/T.../B.../zzz', event: 'Paiement échoué', enabled: false },
  { url: 'https://hooks.slack.com/services/T.../B.../aaa', event: 'Ticket urgent', enabled: true },
];

export default function SettingsPage() {
  const [section, setSection] = useState<'team' | 'perms' | 'ip' | 'audit' | 'webhooks'>('team');
  const [ips, setIps] = useState(['85.93.118.42 (Bureau Luxembourg)', '194.154.200.11 (VPN)', '89.212.44.89 (Backup)']);
  const [newIp, setNewIp] = useState('');

  const addIp = () => {
    if (newIp.trim()) { setIps([...ips, newIp.trim()]); setNewIp(''); }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Paramètres</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Gestion de l'équipe, permissions, sécurité et audit</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Nav */}
        <div style={{
          background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
          padding: 10, height: 'fit-content',
        }}>
          {[
            { k: 'team', label: 'Membres équipe', Icon: Users },
            { k: 'perms', label: 'Permissions', Icon: Shield },
            { k: 'ip', label: 'Whitelist IP', Icon: Globe },
            { k: 'audit', label: 'Audit trail', Icon: FileClock },
            { k: 'webhooks', label: 'Webhooks Slack', Icon: Webhook },
          ].map(({ k, label, Icon }) => (
            <button
              key={k} onClick={() => setSection(k as any)}
              style={{
                width: '100%', padding: '10px 12px', textAlign: 'left',
                background: section === k ? 'rgba(167,139,250,0.15)' : 'transparent',
                border: 'none', borderRadius: 8,
                color: section === k ? '#a78bfa' : '#94a3b8',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2,
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#13131a', border: '1px solid #2a2a35',
            borderRadius: 12, padding: 24,
          }}
        >
          {section === 'team' && (
            <>
              <Header title="Membres de l'équipe" subtitle="Gérer les administrateurs Creorga" action={
                <button style={primaryBtn}><Plus size={14} /> Inviter un membre</button>
              } />
              <div>
                {TEAM.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 0', borderTop: '1px solid #2a2a35',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700,
                    }}>{m.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.email}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      background: m.role === 'Fondateur' ? 'rgba(236,72,153,0.15)' : 'rgba(167,139,250,0.15)',
                      color: m.role === 'Fondateur' ? '#f472b6' : '#a78bfa',
                    }}>{m.role}</span>
                    <div style={{ fontSize: 11, color: m.lastActive === 'En ligne' ? '#4ade80' : '#64748b', minWidth: 80, textAlign: 'right' }}>
                      {m.lastActive === 'En ligne' && '● '}{m.lastActive}
                    </div>
                    <button style={iconBtn} disabled={m.role === 'Fondateur'}><Edit3 size={13} /></button>
                    <button style={iconBtn} disabled={m.role === 'Fondateur'}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'perms' && (
            <>
              <Header title="Niveaux de permission" subtitle="Configurer les droits par rôle" />
              {Object.entries(PERMS).map(([role, perms]) => (
                <div key={role} style={{
                  padding: 16, marginBottom: 12,
                  background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Shield size={16} color="#a78bfa" />
                    <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>{role}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {perms.map(p => (
                      <span key={p} style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.25)',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                        <CheckCircle size={11} /> {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {section === 'ip' && (
            <>
              <Header title="Whitelist IP" subtitle="Restreindre l'accès au super-admin à des IPs spécifiques" />
              <div style={{
                padding: 14, background: 'rgba(167,139,250,0.08)',
                border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8,
                fontSize: 12, color: '#a78bfa', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Lock size={14} /> Seules les IPs listées ci-dessous peuvent accéder au super-admin.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newIp} onChange={e => setNewIp(e.target.value)}
                  placeholder="Ex: 85.93.118.42 (Description)"
                  style={{
                    flex: 1, padding: '9px 12px', background: '#0a0a0f',
                    border: '1px solid #2a2a35', borderRadius: 8,
                    color: '#e2e8f0', fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={addIp} style={primaryBtn}><Plus size={14} /> Ajouter</button>
              </div>
              {ips.map((ip, i) => (
                <div key={i} style={{
                  padding: '10px 14px', background: '#0a0a0f',
                  border: '1px solid #2a2a35', borderRadius: 8, marginBottom: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace' }}>{ip}</span>
                  <button onClick={() => setIps(ips.filter((_, idx) => idx !== i))} style={{
                    background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer',
                  }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </>
          )}

          {section === 'audit' && (
            <>
              <Header title="Audit trail" subtitle="Historique complet des actions admin" />
              {AUDIT.map((a, i) => (
                <div key={i} style={{
                  padding: '14px 0', borderTop: '1px solid #2a2a35',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileClock size={14} color="#a78bfa" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                      <strong style={{ color: '#a78bfa' }}>{a.who}</strong> — {a.action}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{a.when}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {section === 'webhooks' && (
            <>
              <Header title="Webhooks Slack" subtitle="Notifications automatiques sur Slack" action={
                <button style={primaryBtn}><Plus size={14} /> Nouveau webhook</button>
              } />
              {WEBHOOKS.map((w, i) => (
                <div key={i} style={{
                  padding: 14, marginBottom: 10,
                  background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Webhook size={15} color={w.enabled ? '#4ade80' : '#64748b'} />
                      <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{w.event}</span>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                      background: w.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                      color: w.enabled ? '#4ade80' : '#64748b',
                    }}>{w.enabled ? 'ACTIF' : 'DÉSACTIVÉ'}</span>
                  </div>
                  <code style={{
                    display: 'block', fontSize: 11, color: '#94a3b8',
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', padding: 8, background: '#13131a',
                    borderRadius: 4, marginTop: 6,
                  }}>{w.url}</code>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={smallBtn}><Send size={11} /> Tester</button>
                    <button style={smallBtn}><Edit3 size={11} /> Modifier</button>
                    <button style={{ ...smallBtn, color: '#f87171' }}><Trash2 size={11} /> Supprimer</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #2a2a35',
    }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#e2e8f0' }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 6,
  background: '#0a0a0f', border: '1px solid #2a2a35',
  color: '#94a3b8', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const smallBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #2a2a35',
  color: '#94a3b8', padding: '5px 10px', borderRadius: 6,
  fontSize: 11, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 5,
};
