import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, History, Slack, Network, Key, Plus, Trash2,
  CheckCircle2, XCircle, Crown, LifeBuoy, Code,
} from 'lucide-react';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

type Role = 'Owner' | 'Support' | 'Developer';

interface Admin {
  name: string;
  email: string;
  role: Role;
  lastSeen: string;
  status: 'active' | 'pending';
  twoFA: boolean;
}

const initialAdmins: Admin[] = [
  { name: 'Bryan L.', email: 'bryanl1994.bl@gmail.com', role: 'Owner', lastSeen: '2026-04-18 14:20', status: 'active', twoFA: true },
  { name: 'Marie D.', email: 'marie@creorga.com', role: 'Support', lastSeen: '2026-04-18 11:42', status: 'active', twoFA: true },
  { name: 'Thomas K.', email: 'thomas@creorga.com', role: 'Developer', lastSeen: '2026-04-17 19:10', status: 'active', twoFA: false },
  { name: 'Sarah M.', email: 'sarah@creorga.com', role: 'Support', lastSeen: '—', status: 'pending', twoFA: false },
];

const auditTrail = [
  { time: '2026-04-18 14:20', who: 'Bryan L.', what: 'A impersonnifié Café Rond-Point' },
  { time: '2026-04-18 11:42', who: 'Marie D.', what: 'Ticket T-5009 marqué résolu' },
  { time: '2026-04-18 10:05', who: 'Bryan L.', what: 'Flag ai_assistant passé à 40%' },
  { time: '2026-04-17 19:10', who: 'Thomas K.', what: 'Déploiement v2.14.1 en production' },
  { time: '2026-04-17 15:22', who: 'Bryan L.', what: 'Invitation envoyée à sarah@creorga.com' },
  { time: '2026-04-17 09:01', who: 'Bryan L.', what: 'IP 91.214.xx.xx ajoutée à la whitelist' },
  { time: '2026-04-16 16:40', who: 'Marie D.', what: 'Crédit offert à Bistro Maxim (30j Pro)' },
  { time: '2026-04-16 10:15', who: 'Bryan L.', what: 'Plan Chez Marie changé: Starter → Pro' },
];

const TABS = [
  { key: 'team', label: 'Équipe', icon: Users },
  { key: 'security', label: 'Sécurité', icon: Shield },
  { key: 'audit', label: 'Audit trail', icon: History },
  { key: 'integrations', label: 'Intégrations', icon: Slack },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<'team' | 'security' | 'audit' | 'integrations'>('team');
  const [admins, setAdmins] = useState(initialAdmins);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('Support');
  const [ips, setIps] = useState(['91.214.12.45', '91.214.89.10']);
  const [newIp, setNewIp] = useState('');
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T0.../B0.../xxx');

  const invite = () => {
    if (!newEmail.includes('@')) return;
    setAdmins([...admins, { name: '—', email: newEmail, role: newRole, lastSeen: '—', status: 'pending', twoFA: false }]);
    setNewEmail('');
  };

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Paramètres super-admin</h1>
        <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>
          Équipe, sécurité et intégrations
        </p>
      </motion.div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 18px', cursor: 'pointer',
              color: tab === t.key ? ACCENT : MUTED,
              borderBottom: `2px solid ${tab === t.key ? ACCENT : 'transparent'}`,
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: -1,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 20 }}>
          <Card title="Inviter un administrateur">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                placeholder="email@creorga.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  flex: 1, minWidth: 240, background: BG, border: `1px solid ${BORDER}`,
                  color: TEXT, padding: '10px 14px', borderRadius: 8,
                  fontSize: 14, outline: 'none',
                }}
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                style={{
                  background: BG, border: `1px solid ${BORDER}`,
                  color: TEXT, padding: '10px 14px', borderRadius: 8,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                <option value="Owner">Owner</option>
                <option value="Support">Support</option>
                <option value="Developer">Developer</option>
              </select>
              <button onClick={invite} style={btnPrimary}>
                <Plus size={14} /> Inviter
              </button>
            </div>
          </Card>

          <Card title="Administrateurs">
            <div style={{ display: 'grid', gap: 10 }}>
              {admins.map((a) => (
                <div
                  key={a.email}
                  style={{
                    padding: 14, background: BG, borderRadius: 8,
                    border: `1px solid ${BORDER}`, display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto auto auto', gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff',
                  }}>{a.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{a.email}</div>
                  </div>
                  <RoleBadge role={a.role} />
                  <div style={{ fontSize: 11, color: MUTED, minWidth: 110, textAlign: 'right' }}>
                    {a.lastSeen}
                  </div>
                  <div title={a.twoFA ? '2FA activé' : '2FA désactivé'}>
                    {a.twoFA ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                  </div>
                  <button
                    style={{
                      background: 'transparent', border: 'none',
                      color: '#ef4444', cursor: 'pointer', padding: 6,
                    }}
                    onClick={() => setAdmins(admins.filter((x) => x.email !== a.email))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Permissions par rôle">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: MUTED, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>
                  <th style={thStyle}>Permission</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Support</th>
                  <th style={thStyle}>Developer</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Voir clients', true, true, true],
                  ['Modifier clients', true, true, false],
                  ['Impersonnifier', true, true, false],
                  ['Facturation', true, false, false],
                  ['Feature flags', true, false, true],
                  ['Logs système', true, false, true],
                  ['Paramètres admin', true, false, false],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{String(row[0])}</td>
                    {[1, 2, 3].map((j) => (
                      <td key={j} style={tdStyle}>
                        {row[j] ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#475569" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {tab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 20 }}>
          <Card title="Authentification à deux facteurs">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Exiger 2FA pour tous les admins</div>
                <div style={{ fontSize: 12, color: MUTED }}>
                  Force l'activation du second facteur pour accéder au panel.
                </div>
              </div>
              <Toggle enabled={enforce2FA} onChange={() => setEnforce2FA(!enforce2FA)} />
            </div>
          </Card>

          <Card title="IP Whitelist">
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 14px' }}>
              Seules les IPs de cette liste pourront se connecter au panel super-admin.
            </p>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {ips.map((ip) => (
                <div
                  key={ip}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: 10, background: BG, borderRadius: 7,
                    border: `1px solid ${BORDER}`, alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Network size={14} color={ACCENT} />
                    <code style={{ fontSize: 13 }}>{ip}</code>
                  </div>
                  <button
                    onClick={() => setIps(ips.filter((x) => x !== ip))}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="192.168.1.1"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                style={{
                  flex: 1, background: BG, border: `1px solid ${BORDER}`,
                  color: TEXT, padding: '9px 12px', borderRadius: 7, fontSize: 13,
                  outline: 'none', fontFamily: 'monospace',
                }}
              />
              <button
                onClick={() => { if (newIp) { setIps([...ips, newIp]); setNewIp(''); } }}
                style={btnPrimary}
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </Card>

          <Card title="Sessions actives">
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { device: 'Chrome — macOS', ip: '91.214.12.45', current: true },
                { device: 'Safari — iPhone', ip: '91.214.89.10', current: false },
              ].map((s) => (
                <div
                  key={s.ip}
                  style={{
                    padding: 12, background: BG, borderRadius: 7,
                    border: `1px solid ${BORDER}`, display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {s.device} {s.current && <span style={{
                        background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 8,
                      }}>CETTE SESSION</span>}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{s.ip}</div>
                  </div>
                  {!s.current && (
                    <button style={{ ...btnSec, color: '#ef4444', borderColor: '#ef444440' }}>
                      Révoquer
                    </button>
                  )}
                </div>
              ))}
              <button style={{ ...btnSec, color: '#ef4444', borderColor: '#ef444440', marginTop: 4 }}>
                Révoquer toutes les autres sessions
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {tab === 'audit' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card title="Journal d'audit (actions administrateurs)">
            <div style={{ display: 'grid', gap: 4 }}>
              {auditTrail.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    padding: 12, borderBottom: `1px solid ${BORDER}`,
                    display: 'grid', gridTemplateColumns: '1fr auto',
                    alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>{a.who}</span> {a.what}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{a.time}</div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {tab === 'integrations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 20 }}>
          <Card title="Webhook Slack pour notifications">
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>
              Recevoir alertes critiques (nouveaux clients, erreurs, paiements échoués) sur Slack.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Slack size={18} color="#a78bfa" />
              <input
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                style={{
                  flex: 1, minWidth: 240, background: BG, border: `1px solid ${BORDER}`,
                  color: TEXT, padding: '9px 12px', borderRadius: 7,
                  fontSize: 12, outline: 'none', fontFamily: 'monospace',
                }}
              />
              <button style={btnSec}>Tester</button>
              <button style={btnPrimary}>Enregistrer</button>
            </div>
            <div style={{
              marginTop: 14, padding: 12, background: BG, borderRadius: 7,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Événements envoyés:</div>
              <div style={{ display: 'grid', gap: 6, fontSize: 12, color: MUTED }}>
                <label style={lblStyle}><input type="checkbox" defaultChecked /> Nouveau client</label>
                <label style={lblStyle}><input type="checkbox" defaultChecked /> Paiement échoué</label>
                <label style={lblStyle}><input type="checkbox" defaultChecked /> Churn détecté</label>
                <label style={lblStyle}><input type="checkbox" defaultChecked /> Erreur critique système</label>
                <label style={lblStyle}><input type="checkbox" /> Ticket support urgent</label>
              </div>
            </div>
          </Card>

          <Card title="Clés API super-admin">
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>
              Tokens pour automatiser des actions sur le panel depuis des scripts.
            </p>
            <div style={{
              padding: 12, background: BG, borderRadius: 7,
              border: `1px solid ${BORDER}`, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Key size={16} color={ACCENT} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Clé principale</div>
                  <code style={{ fontSize: 11, color: MUTED }}>sa_live_****xxxx****</code>
                </div>
              </div>
              <button style={btnSec}>Régénérer</button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { c: string; icon: any }> = {
    Owner: { c: '#fbbf24', icon: Crown },
    Support: { c: '#3b82f6', icon: LifeBuoy },
    Developer: { c: '#10b981', icon: Code },
  };
  const { c, icon: Icon } = map[role];
  return (
    <span style={{
      background: `${c}26`, color: c, padding: '3px 10px',
      borderRadius: 5, fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <Icon size={11} /> {role}
    </span>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: enabled ? ACCENT : BORDER,
        border: 'none', position: 'relative',
        cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 2, width: 20, height: 20,
          borderRadius: '50%', background: '#fff',
        }}
      />
    </button>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      {title && <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{title}</h3>}
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '12px 8px' };
const btnSec: React.CSSProperties = {
  background: BG, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '9px 14px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const btnPrimary: React.CSSProperties = {
  background: ACCENT, border: 'none', color: '#fff',
  padding: '9px 16px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const lblStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' };
