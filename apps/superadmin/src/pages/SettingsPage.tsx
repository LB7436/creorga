import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, History, Network, Key, Plus, Trash2,
  CheckCircle2, XCircle, Crown, LifeBuoy, Code,
  Database, Server, Globe, Palette, FileText, Mail, Lock,
  CreditCard, Zap, Bell, AlertTriangle, Download, Upload,
  RefreshCw, Search, Filter, Eye, EyeOff, Edit3,
} from 'lucide-react';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

// Backend URL — configurable via env
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002';

type Role = 'Owner' | 'Support' | 'Developer';
type Section = 'admins' | 'security' | 'audit' | 'modules' | 'payments' | 'data' | 'system' | 'branding' | 'notifications' | 'api';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastSeen: string;
  status: 'active' | 'pending';
  twoFA: boolean;
}

const initialAdmins: Admin[] = [
  { id: 'a1', name: 'Bryan L.', email: 'bryanl1994.bl@gmail.com', role: 'Owner', lastSeen: '2026-04-18 14:20', status: 'active', twoFA: true },
  { id: 'a2', name: 'Marie D.', email: 'marie@creorga.com', role: 'Support', lastSeen: '2026-04-18 11:42', status: 'active', twoFA: true },
  { id: 'a3', name: 'Thomas K.', email: 'thomas@creorga.com', role: 'Developer', lastSeen: '2026-04-17 19:10', status: 'active', twoFA: false },
  { id: 'a4', name: 'Sarah M.', email: 'sarah@creorga.com', role: 'Support', lastSeen: '—', status: 'pending', twoFA: false },
];

const auditTrail = [
  { time: '2026-04-18 14:20', who: 'Bryan L.', what: 'A impersonnifié Café Rond-Point', sev: 'info' },
  { time: '2026-04-18 11:42', who: 'Marie D.', what: 'Ticket T-5009 marqué résolu', sev: 'info' },
  { time: '2026-04-18 10:05', who: 'Bryan L.', what: 'Flag ai_assistant passé à 40%', sev: 'warn' },
  { time: '2026-04-17 19:10', who: 'Thomas K.', what: 'Déploiement v2.14.1 en production', sev: 'success' },
  { time: '2026-04-17 15:22', who: 'Bryan L.', what: 'Invitation envoyée à sarah@creorga.com', sev: 'info' },
  { time: '2026-04-17 09:01', who: 'Bryan L.', what: 'IP 91.214.xx.xx ajoutée à la whitelist', sev: 'warn' },
  { time: '2026-04-16 16:40', who: 'Marie D.', what: 'Crédit offert à Bistro Maxim (30j Pro)', sev: 'success' },
];

interface ModuleRow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  hidden: boolean;
  comingSoon: boolean;
}

const SECTIONS: { id: Section; label: string; icon: any; count?: number }[] = [
  { id: 'admins',        label: 'Équipe admin',         icon: Users },
  { id: 'security',      label: 'Sécurité & accès',     icon: Shield },
  { id: 'modules',       label: 'Modules',              icon: Code, count: 33 },
  { id: 'payments',      label: 'Paiements',            icon: CreditCard, count: 6 },
  { id: 'branding',      label: 'Marque & thèmes',      icon: Palette },
  { id: 'data',          label: 'Données & backups',    icon: Database },
  { id: 'system',        label: 'Système',              icon: Server },
  { id: 'notifications', label: 'Notifications',        icon: Bell },
  { id: 'api',           label: 'API & webhooks',       icon: Network },
  { id: 'audit',         label: 'Audit & logs',         icon: History },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('admins');
  const [admins, setAdmins] = useState(initialAdmins);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Fetch modules from web config
  useEffect(() => {
    // Pull module list from the web app's known stores. We hard-code since
    // super-admin is a separate Vite app (no import from apps/web).
    setModules([
      { id: 'pos',         name: 'Caisse POS',       description: 'Tables, commandes, paiements',       enabled: true, hidden: false, comingSoon: false },
      { id: 'clients',     name: 'Portail clients',  description: 'Interface & commande en ligne',      enabled: true, hidden: false, comingSoon: false },
      { id: 'invoices',    name: 'Factures & Devis', description: 'Facturation professionnelle',        enabled: true, hidden: false, comingSoon: false },
      { id: 'qrmenu',      name: 'Menu QR',          description: 'Carte numérique & QR code',          enabled: true, hidden: false, comingSoon: false },
      { id: 'planning',    name: 'Planning',         description: 'Horaires & disponibilités',          enabled: true, hidden: false, comingSoon: false },
      { id: 'contracts',   name: 'Contrats',         description: 'Clients & fournisseurs',             enabled: true, hidden: false, comingSoon: false },
      { id: 'hr',          name: 'Gestion RH',       description: 'Ressources humaines & paie',         enabled: true, hidden: false, comingSoon: false },
      { id: 'accounting',  name: 'Comptabilité',     description: 'TVA, bilan & OCR factures',          enabled: true, hidden: false, comingSoon: false },
      { id: 'marketing',   name: 'CRM & Marketing',  description: 'Clients, fidélité & campagnes',      enabled: true, hidden: false, comingSoon: false },
      { id: 'inventory',   name: 'Inventaire',       description: 'Stock, recettes & fournisseurs',     enabled: true, hidden: false, comingSoon: false },
      { id: 'haccp',       name: 'HACCP',            description: 'Traçabilité & hygiène',              enabled: true, hidden: false, comingSoon: false },
      { id: 'events',      name: 'Agenda',           description: 'Réservations & événements',          enabled: true, hidden: false, comingSoon: false },
      { id: 'reputation',  name: 'Réputation',       description: 'Avis clients & e-réputation',        enabled: true, hidden: false, comingSoon: false },
      { id: 'formation',   name: 'Formation',        description: 'Formation & certification',          enabled: true, hidden: false, comingSoon: true  },
      { id: 'maintenance', name: 'Maintenance',      description: 'Équipements & interventions',        enabled: true, hidden: false, comingSoon: false },
      { id: 'licences',    name: 'Licences',         description: 'Documents légaux & échéances',       enabled: true, hidden: false, comingSoon: false },
      { id: 'rgpd',        name: 'RGPD',             description: 'Protection des données',             enabled: true, hidden: false, comingSoon: false },
      { id: 'sites',       name: 'Multi-établissements', description: 'Gestion des sites',              enabled: true, hidden: false, comingSoon: false },
      { id: 'api',         name: 'API & Intégrations', description: 'Connectez vos outils',              enabled: true, hidden: false, comingSoon: false },
      { id: 'ai',          name: 'Assistant IA',     description: 'Gemma 2B local',                     enabled: true, hidden: false, comingSoon: false },
      { id: 'backup',      name: 'Sauvegarde',       description: 'Sécurité & restauration',            enabled: true, hidden: false, comingSoon: false },
      { id: 'owner',       name: 'Rapport Patron',   description: 'Vision stratégique',                 enabled: true, hidden: false, comingSoon: false },
      { id: 'delivery',    name: 'Livraison',        description: 'Uber Eats, Wedely',                  enabled: true, hidden: false, comingSoon: false },
      { id: 'clickcollect',name: 'Click & Collect',  description: 'Commandes à emporter',               enabled: true, hidden: false, comingSoon: false },
      { id: 'catering',    name: 'Traiteur',         description: 'Événements livrés',                  enabled: true, hidden: false, comingSoon: true  },
      { id: 'centralkitchen', name: 'Cuisine Centrale', description: 'Batch cooking & prévisions',      enabled: true, hidden: false, comingSoon: true  },
      { id: 'billing',     name: 'Facturation SaaS', description: 'Abonnement & paiements',             enabled: true, hidden: false, comingSoon: false },
      { id: 'autoorder',   name: 'Auto-Réapprovisionnement', description: 'Commandes IA',               enabled: true, hidden: false, comingSoon: true  },
      { id: 'sustainability', name: 'Durabilité',    description: 'Impact environnemental',             enabled: true, hidden: false, comingSoon: true  },
      { id: 'community',   name: 'Communauté',       description: 'Réseau & benchmarks',                enabled: true, hidden: false, comingSoon: false },
      { id: 'status',      name: 'Statut système',   description: 'Uptime & incidents',                 enabled: true, hidden: false, comingSoon: false },
      { id: 'changelog',   name: 'Changelog',        description: 'Nouveautés & versions',              enabled: true, hidden: false, comingSoon: false },
      { id: 'referral',    name: 'Parrainage',       description: 'Programme de parrainage',            enabled: true, hidden: false, comingSoon: true  },
    ]);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleModule = async (id: string, field: 'enabled' | 'hidden' | 'comingSoon') => {
    const target = modules.find((m) => m.id === id);
    if (!target) return;
    const newValue = !target[field];

    // Optimistic local update
    setModules((list) => list.map((m) => m.id === id ? { ...m, [field]: newValue } : m));

    // Map to backend schema — only displayMode matters for /modules rendering
    // If hidden is on → hidden. If comingSoon is on → coming_soon. Else visible.
    const next = { ...target, [field]: newValue };
    const displayMode = next.hidden ? 'hidden' : next.comingSoon ? 'coming_soon' : 'visible';

    try {
      await fetch(`${BACKEND}/api/module-config/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayMode, enabled: next.enabled }),
      });
      showToast(`Module ${id} → ${displayMode}`);
    } catch {
      showToast('Erreur réseau — changement local uniquement');
    }
  };

  // Load from backend on mount so both apps stay in sync
  useEffect(() => {
    fetch(`${BACKEND}/api/module-config`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.config) return;
        setModules((list) => list.map((m) => {
          const cfg = data.config[m.id];
          if (!cfg) return m;
          return {
            ...m,
            enabled: cfg.enabled !== false,
            hidden: cfg.displayMode === 'hidden',
            comingSoon: cfg.displayMode === 'coming_soon',
          };
        }));
      })
      .catch(() => { /* offline ok */ });
  }, [modules.length]);

  const addAdmin = () => {
    const email = prompt('Email du nouvel administrateur :');
    if (!email) return;
    const name = prompt('Nom complet :') || email.split('@')[0];
    const role = (prompt('Rôle (Owner/Support/Developer) :') || 'Support') as Role;
    setAdmins([...admins, {
      id: 'a' + Date.now(), name, email, role, lastSeen: '—',
      status: 'pending', twoFA: false,
    }]);
    showToast(`${email} invité`);
  };

  const removeAdmin = (id: string) => {
    if (!confirm('Supprimer cet administrateur ?')) return;
    setAdmins(admins.filter((a) => a.id !== id));
    showToast('Admin supprimé');
  };

  const changeRole = (id: string, role: Role) => {
    setAdmins(admins.map((a) => a.id === id ? { ...a, role } : a));
    showToast(`Rôle changé → ${role}`);
  };

  const filteredModules = modules.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.includes(search)
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, display: 'flex' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{ width: 260, background: '#0f0f18', borderRight: `1px solid ${BORDER}`, padding: 20, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Super Admin</div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>CONTROL PANEL</div>
          </div>
        </div>

        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: active ? ACCENT : MUTED, fontWeight: active ? 700 : 500, fontSize: 13,
                marginBottom: 2, textAlign: 'left', transition: 'all .15s',
              }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{s.label}</span>
              {s.count && <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(167,139,250,0.2)', borderRadius: 4 }}>{s.count}</span>}
            </button>
          );
        })}

        <div style={{ marginTop: 20, padding: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>SYSTÈME OK</div>
          <div style={{ fontSize: 10, color: MUTED }}>Uptime 99.98% · 7 services live</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, padding: 32, maxWidth: 1200, overflowY: 'auto' }}>
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {section === 'admins' && <AdminsSection admins={admins} onAdd={addAdmin} onRemove={removeAdmin} onChangeRole={changeRole} />}
          {section === 'security' && <SecuritySection />}
          {section === 'modules' && <ModulesSection modules={filteredModules} search={search} setSearch={setSearch} onToggle={toggleModule} />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'branding' && <BrandingSection />}
          {section === 'data' && <DataSection showToast={showToast} />}
          {section === 'system' && <SystemSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'api' && <ApiSection showToast={showToast} />}
          {section === 'audit' && <AuditSection />}
        </motion.div>
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            padding: '12px 18px', background: CARD, color: TEXT,
            border: `1px solid ${ACCENT}`, borderRadius: 10,
            fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(167,139,250,0.3)',
          }}>
          ✓ {toast}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sections
// ═══════════════════════════════════════════════════════════════════════════

function AdminsSection({ admins, onAdd, onRemove, onChangeRole }: any) {
  return (
    <div>
      <Header title="Équipe admin" subtitle={`${admins.length} administrateur(s) · gestion des accès panel`}>
        <button onClick={onAdd} style={primaryBtn}>
          <Plus size={14} /> Inviter un admin
        </button>
      </Header>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <Th>Nom</Th><Th>Email</Th><Th>Rôle</Th><Th>2FA</Th><Th>Dernière activité</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a: Admin) => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#a78bfa,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {a.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    {a.status === 'pending' && <Pill color="#f59e0b">En attente</Pill>}
                  </div>
                </Td>
                <Td style={{ color: MUTED, fontSize: 12 }}>{a.email}</Td>
                <Td>
                  <select value={a.role} onChange={(e) => onChangeRole(a.id, e.target.value)} style={selectStyle}>
                    <option>Owner</option><option>Support</option><option>Developer</option>
                  </select>
                </Td>
                <Td>{a.twoFA ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}</Td>
                <Td style={{ color: MUTED, fontSize: 12 }}>{a.lastSeen}</Td>
                <Td>
                  <button onClick={() => onRemove(a.id)} style={ghostBtn}>
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const [ipWhitelist, setIpWhitelist] = useState(['91.214.1.5', '193.19.140.0/24']);
  const [passwordPolicy, setPasswordPolicy] = useState({ minLength: 12, symbols: true, uppercase: true });
  const [session, setSession] = useState({ timeout: 30, force2fa: true });

  return (
    <div>
      <Header title="Sécurité & accès" subtitle="Politique mot de passe, 2FA, IP whitelist, sessions" />

      <Card title="Politique de mot de passe">
        <Row>
          <span>Longueur minimum</span>
          <input type="number" value={passwordPolicy.minLength}
            onChange={(e) => setPasswordPolicy({ ...passwordPolicy, minLength: +e.target.value })}
            style={inputStyle} />
        </Row>
        <Row><ToggleRow label="Symboles obligatoires" value={passwordPolicy.symbols} onChange={(v) => setPasswordPolicy({ ...passwordPolicy, symbols: v })} /></Row>
        <Row><ToggleRow label="Majuscule obligatoire" value={passwordPolicy.uppercase} onChange={(v) => setPasswordPolicy({ ...passwordPolicy, uppercase: v })} /></Row>
      </Card>

      <Card title="Sessions">
        <Row>
          <span>Timeout (minutes)</span>
          <input type="number" value={session.timeout}
            onChange={(e) => setSession({ ...session, timeout: +e.target.value })}
            style={inputStyle} />
        </Row>
        <Row><ToggleRow label="2FA obligatoire pour tous" value={session.force2fa} onChange={(v) => setSession({ ...session, force2fa: v })} /></Row>
      </Card>

      <Card title="IP Whitelist (accès panel super-admin)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ipWhitelist.map((ip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '8px 12px', background: '#0a0a0a', borderRadius: 6, fontSize: 12 }}>{ip}</code>
              <button onClick={() => setIpWhitelist(ipWhitelist.filter((_, j) => j !== i))} style={ghostBtn}>
                <Trash2 size={14} color="#ef4444" />
              </button>
            </div>
          ))}
          <button onClick={() => {
            const ip = prompt('Nouvelle IP (ex: 91.214.1.5 ou 192.168.0.0/24) :');
            if (ip) setIpWhitelist([...ipWhitelist, ip]);
          }} style={primaryBtn}>
            <Plus size={14} /> Ajouter IP
          </button>
        </div>
      </Card>
    </div>
  );
}

function ModulesSection({ modules, search, setSearch, onToggle }: any) {
  const stats = {
    active: modules.filter((m: ModuleRow) => m.enabled && !m.hidden && !m.comingSoon).length,
    hidden: modules.filter((m: ModuleRow) => m.hidden).length,
    soon: modules.filter((m: ModuleRow) => m.comingSoon).length,
  };

  return (
    <div>
      <Header title="Modules" subtitle={`${modules.length} modules · ${stats.active} actifs · ${stats.hidden} masqués · ${stats.soon} bientôt`}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 220, paddingLeft: 32 }} />
        </div>
      </Header>

      <div style={{ display: 'grid', gap: 6 }}>
        {modules.map((m: ModuleRow) => (
          <div key={m.id} style={{
            padding: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
            display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 14, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{m.description}</div>
              <div style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', marginTop: 2 }}>{m.id}</div>
            </div>
            <ToggleRow label="Activé"   value={m.enabled}    onChange={() => onToggle(m.id, 'enabled')} color="#10b981" />
            <ToggleRow label="Masqué"   value={m.hidden}     onChange={() => onToggle(m.id, 'hidden')} color="#ef4444" />
            <ToggleRow label="Bientôt"  value={m.comingSoon} onChange={() => onToggle(m.id, 'comingSoon')} color="#f59e0b" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsSection() {
  const gateways = [
    { id: 'stripe',    name: 'Stripe',      status: 'connected' as const,    env: 'live'   },
    { id: 'sumup',     name: 'SumUp',       status: 'connected' as const,    env: 'live'   },
    { id: 'mypos',     name: 'myPOS',       status: 'disconnected' as const, env: '—'      },
    { id: 'viva',      name: 'Viva Wallet', status: 'connected' as const,    env: 'sandbox' },
    { id: 'worldline', name: 'Worldline',   status: 'disconnected' as const, env: '—'      },
    { id: 'servipay',  name: 'Servipay',    status: 'disconnected' as const, env: '—'      },
  ];

  return (
    <div>
      <Header title="Passerelles de paiement" subtitle="6 gateways disponibles · gestion des clés API" />
      <div style={{ display: 'grid', gap: 8 }}>
        {gateways.map((g) => (
          <Card key={g.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={18} color={ACCENT} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: MUTED }}>
                  {g.status === 'connected' ? `✓ Connecté · environnement ${g.env}` : '⊝ Non configuré'}
                </div>
              </div>
              <button style={secondaryBtn}>
                {g.status === 'connected' ? <><Edit3 size={12} /> Clés API</> : <><Plus size={12} /> Connecter</>}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandingSection() {
  const [companyName, setCompanyName] = useState('Creorga OS');
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  return (
    <div>
      <Header title="Marque & thèmes" subtitle="Identité visuelle · couleurs · logo" />
      <Card title="Identité">
        <Row><span>Nom commercial</span><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} /></Row>
        <Row>
          <span>Couleur principale</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map((c) => (
              <button key={c} onClick={() => setPrimaryColor(c)}
                style={{ width: 32, height: 32, borderRadius: 8, background: c, border: primaryColor === c ? '3px solid #fff' : 'none', cursor: 'pointer' }} />
            ))}
          </div>
        </Row>
      </Card>
      <Card title="Assets">
        <Row><span>Logo (SVG/PNG)</span><button style={secondaryBtn}><Upload size={12} /> Charger</button></Row>
        <Row><span>Favicon</span><button style={secondaryBtn}><Upload size={12} /> Charger</button></Row>
        <Row><span>Image OG (1200×630)</span><button style={secondaryBtn}><Upload size={12} /> Charger</button></Row>
      </Card>
    </div>
  );
}

function DataSection({ showToast }: any) {
  const runBackup = () => showToast('Backup lancé — ETA 2 min');
  const runRestore = () => { if (confirm('⚠️ Restaurer écrasera les données actuelles. Continuer ?')) showToast('Restauration en cours…'); };
  const clearCache = () => showToast('Cache vidé');

  return (
    <div>
      <Header title="Données & backups" subtitle="Import, export, sauvegardes, purge" />
      <Card title="Backups automatiques">
        <Row><ToggleRow label="Backup quotidien 04:00 UTC" value={true} onChange={() => {}} /></Row>
        <Row><ToggleRow label="Rétention 90 jours" value={true} onChange={() => {}} /></Row>
        <Row><ToggleRow label="Backup chiffré AES-256" value={true} onChange={() => {}} /></Row>
      </Card>
      <Card title="Actions manuelles">
        <Row><span>Lancer un backup maintenant</span><button onClick={runBackup} style={primaryBtn}><Download size={12} /> Backup</button></Row>
        <Row><span>Restaurer depuis un backup</span><button onClick={runRestore} style={{ ...secondaryBtn, borderColor: '#ef4444', color: '#ef4444' }}><Upload size={12} /> Restaurer</button></Row>
        <Row><span>Vider le cache Redis</span><button onClick={clearCache} style={secondaryBtn}><RefreshCw size={12} /> Clear cache</button></Row>
        <Row><span>Exporter toutes les données</span><button style={secondaryBtn}><Download size={12} /> Export JSON</button></Row>
      </Card>
    </div>
  );
}

function SystemSection() {
  return (
    <div>
      <Header title="Système" subtitle="Infrastructure · environnement · variables" />
      <Card title="Services (7)">
        {[
          { port: 3002,  name: 'Backend API',    status: 'up',  latency: 45 },
          { port: 5174,  name: 'Web (back-office)', status: 'up',  latency: 12 },
          { port: 5175,  name: 'POS standalone', status: 'up',  latency: 14 },
          { port: 5176,  name: 'Marketing',      status: 'up',  latency: 18 },
          { port: 5177,  name: 'Super-admin',    status: 'up',  latency: 10 },
          { port: 5178,  name: 'Guest portal',   status: 'up',  latency: 16 },
          { port: 11434, name: 'Ollama + Gemma', status: 'up',  latency: 120 },
        ].map((s) => (
          <Row key={s.port}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'up' ? '#10b981' : '#ef4444', boxShadow: s.status === 'up' ? '0 0 6px #10b981' : 'none' }} />
              <strong style={{ fontSize: 13 }}>{s.name}</strong>
              <code style={{ fontSize: 11, color: MUTED, padding: '2px 6px', background: '#0a0a0a', borderRadius: 4 }}>:{s.port}</code>
            </div>
            <span style={{ fontSize: 11, color: MUTED }}>{s.latency}ms</span>
          </Row>
        ))}
      </Card>

      <Card title="Variables d'environnement">
        <Row><code style={{ fontSize: 12 }}>NODE_ENV</code><span style={{ color: MUTED }}>development</span></Row>
        <Row><code style={{ fontSize: 12 }}>DATABASE_URL</code><span style={{ color: MUTED }}>postgresql://…:5433/creorga_dev</span></Row>
        <Row><code style={{ fontSize: 12 }}>JWT_SECRET</code><span style={{ color: MUTED }}>••••••••••</span></Row>
        <Row><code style={{ fontSize: 12 }}>FALLBACK_ADMIN_EMAIL</code><span style={{ color: MUTED }}>admin@creorga.local</span></Row>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [email, setEmail] = useState(true);
  const [slack, setSlack] = useState(false);
  const [webhook, setWebhook] = useState('');
  return (
    <div>
      <Header title="Notifications" subtitle="Email · Slack · Webhook personnalisé" />
      <Card title="Canaux">
        <Row><ToggleRow label="Notifications email (staff)" value={email} onChange={setEmail} /></Row>
        <Row><ToggleRow label="Notifications Slack" value={slack} onChange={setSlack} /></Row>
      </Card>
      <Card title="Webhook générique">
        <Row><span>URL</span><input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hooks.example.com/..." style={{ ...inputStyle, width: 360 }} /></Row>
        <Row><span>Événements déclencheurs</span><select multiple style={{ ...inputStyle, height: 100 }}>
          <option>new_order</option><option>payment_captured</option><option>user_signup</option>
          <option>module_error</option><option>backup_completed</option>
        </select></Row>
      </Card>
    </div>
  );
}

function ApiSection({ showToast }: any) {
  const [tokens, setTokens] = useState([
    { id: 't1', name: 'Production', key: 'crg_live_8f2a…9ec3', created: '2026-01-15', scope: 'read-write' },
    { id: 't2', name: 'Monitoring', key: 'crg_live_7d3e…1ac9', created: '2026-03-02', scope: 'read' },
  ]);
  return (
    <div>
      <Header title="API & webhooks" subtitle="Tokens d'accès · endpoints · rate limits">
        <button onClick={() => {
          const name = prompt('Nom du token :');
          if (name) {
            const key = 'crg_live_' + Math.random().toString(36).slice(2, 10);
            setTokens([...tokens, { id: 'tk' + Date.now(), name, key, created: new Date().toISOString().slice(0, 10), scope: 'read-write' }]);
            showToast(`Token créé : ${key}`);
          }
        }} style={primaryBtn}><Plus size={14} /> Nouveau token</button>
      </Header>
      <Card>
        {tokens.map((t) => (
          <Row key={t.id}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
              <code style={{ fontSize: 11, color: MUTED }}>{t.key}</code>
            </div>
            <Pill color={t.scope === 'read-write' ? '#10b981' : '#f59e0b'}>{t.scope}</Pill>
            <span style={{ color: MUTED, fontSize: 11, marginLeft: 10 }}>{t.created}</span>
            <button onClick={() => { setTokens(tokens.filter(x => x.id !== t.id)); showToast('Token révoqué') }} style={ghostBtn}>
              <Trash2 size={14} color="#ef4444" />
            </button>
          </Row>
        ))}
      </Card>
    </div>
  );
}

function AuditSection() {
  const [filter, setFilter] = useState('');
  const filtered = auditTrail.filter(a => !filter || a.who.toLowerCase().includes(filter.toLowerCase()) || a.what.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div>
      <Header title="Audit & logs" subtitle={`${filtered.length} entrées · traçabilité complète des actions`}>
        <input placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: 220 }} />
      </Header>
      <Card>
        {filtered.map((a, i) => (
          <Row key={i}>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace', width: 160 }}>{a.time}</span>
            <strong style={{ fontSize: 12, width: 120 }}>{a.who}</strong>
            <span style={{ flex: 1, fontSize: 13 }}>{a.what}</span>
            <Pill color={a.sev === 'warn' ? '#f59e0b' : a.sev === 'success' ? '#10b981' : '#64748b'}>{a.sev}</Pill>
          </Row>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function Header({ title, subtitle, children }: any) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{title}</h1>
        <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13 }}>{subtitle}</p>
      </div>
      {children && <div style={{ display: 'flex', gap: 8 }}>{children}</div>}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 12 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  );
}

function Row({ children }: any) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>{children}</div>;
}

function Th({ children }: any) { return <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: 0.5 }}>{children}</th>; }
function Td({ children, style }: any) { return <td style={{ padding: '10px 12px', fontSize: 13, ...style }}>{children}</td>; }

function Pill({ children, color }: any) {
  return <span style={{ padding: '2px 8px', borderRadius: 999, background: `${color}20`, color, fontSize: 10, fontWeight: 700 }}>{children}</span>;
}

function ToggleRow({ label, value, onChange, color = '#6366f1' }: { label?: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
      {label && <span style={{ flex: 1, fontSize: 12, color: MUTED }}>{label}</span>}
      <button type="button" onClick={() => onChange(!value)}
        style={{
          position: 'relative', width: 36, height: 20, borderRadius: 999,
          background: value ? color : '#2a2a35', border: 'none', cursor: 'pointer',
          transition: 'all .15s',
        }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'all .15s',
        }} />
      </button>
    </label>
  );
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', background: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', background: 'transparent', color: TEXT,
  border: `1px solid ${BORDER}`, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: 6, background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#0a0a0a', border: `1px solid ${BORDER}`,
  borderRadius: 6, color: TEXT, fontSize: 12, outline: 'none',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
