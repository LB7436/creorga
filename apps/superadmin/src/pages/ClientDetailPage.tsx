import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MoreHorizontal, Mail, Gift, RefreshCw, Pause, UserCheck,
  TrendingUp, Users, Clock, Euro, Activity,
  StickyNote, CheckCircle2, AlertTriangle, Heart, Zap, Download,
  CreditCard, Star, MessageSquare, LifeBuoy,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

const client = {
  id: '1',
  name: 'Café um Rond-Point',
  city: 'Rumelange',
  logo: 'CR',
  plan: 'Pro',
  status: 'Actif',
  mrr: 149,
  ca: 1788,
  healthScore: 82,
  since: '2024-11-03',
  users: 8,
  sites: 1,
  modules: 6,
  email: 'contact@cafe-rumelange.lu',
  phone: '+352 27 12 34 56',
  country: 'LU',
  nextBilling: '2026-05-03',
};

const usageData = [
  { day: 'Lun', heures: 9.2, commandes: 142 },
  { day: 'Mar', heures: 8.7, commandes: 128 },
  { day: 'Mer', heures: 9.5, commandes: 156 },
  { day: 'Jeu', heures: 10.1, commandes: 189 },
  { day: 'Ven', heures: 12.3, commandes: 243 },
  { day: 'Sam', heures: 13.8, commandes: 287 },
  { day: 'Dim', heures: 6.4, commandes: 98 },
];

const mrrTrend = [
  { mois: 'Nov', mrr: 49 },
  { mois: 'Déc', mrr: 99 },
  { mois: 'Jan', mrr: 99 },
  { mois: 'Fév', mrr: 149 },
  { mois: 'Mar', mrr: 149 },
  { mois: 'Avr', mrr: 149 },
];

const modulesUsage = [
  { name: 'POS', pct: 98, color: '#a78bfa' },
  { name: 'Stocks', pct: 84, color: '#8b5cf6' },
  { name: 'Menu', pct: 76, color: '#7c3aed' },
  { name: 'Analytique', pct: 62, color: '#6d28d9' },
  { name: 'Personnel', pct: 41, color: '#5b21b6' },
  { name: 'Marketing', pct: 18, color: '#4c1d95' },
];

const invoicesMock = [
  { id: 'INV-2026-0412', date: '2026-04-03', amount: 149, status: 'Payée' },
  { id: 'INV-2026-0289', date: '2026-03-03', amount: 149, status: 'Payée' },
  { id: 'INV-2026-0176', date: '2026-02-03', amount: 149, status: 'Payée' },
  { id: 'INV-2026-0051', date: '2026-01-03', amount: 149, status: 'Payée' },
  { id: 'INV-2025-1198', date: '2025-12-03', amount: 99, status: 'Payée' },
  { id: 'INV-2025-1089', date: '2025-11-03', amount: 49, status: 'Payée' },
];

const ticketsMock = [
  { id: 'T-4821', subject: 'Problème impression ticket', date: '2026-04-12', status: 'Résolu', satisfaction: 5 },
  { id: 'T-4789', subject: 'Question sur TVA 17%', date: '2026-03-28', status: 'Résolu', satisfaction: 5 },
  { id: 'T-4701', subject: 'Formation module stocks', date: '2026-03-10', status: 'Résolu', satisfaction: 4 },
  { id: 'T-4612', subject: 'Ajout utilisateur', date: '2026-02-14', status: 'Résolu', satisfaction: 5 },
];

const activityMock = [
  { time: '2026-04-18 14:23', action: 'Commande #1284 créée', user: 'Sophie M.' },
  { time: '2026-04-18 13:51', action: 'Stock mis à jour (Café)', user: 'Marc L.' },
  { time: '2026-04-18 11:07', action: 'Connexion admin', user: 'Jean R.' },
  { time: '2026-04-18 09:14', action: 'Menu modifié (Plat du jour)', user: 'Jean R.' },
  { time: '2026-04-17 19:48', action: 'Rapport journée exporté', user: 'Jean R.' },
  { time: '2026-04-17 15:22', action: 'Utilisateur ajouté', user: 'Jean R.' },
  { time: '2026-04-17 10:03', action: 'Facturation générée', user: 'Système' },
];

const tabs = [
  { key: 'overview', label: "Vue d'ensemble", icon: TrendingUp },
  { key: 'usage', label: 'Utilisation', icon: Activity },
  { key: 'billing', label: 'Facturation', icon: CreditCard },
  { key: 'support', label: 'Support', icon: LifeBuoy },
  { key: 'activity', label: 'Activité', icon: Clock },
  { key: 'notes', label: 'Notes CRM', icon: StickyNote },
];

export default function ClientDetailPage() {
  useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notes, setNotes] = useState(
    "Très bon client, recommande Creorga à 2 autres restaurateurs de la région. Intéressé par module Marketing au Q3."
  );

  const quickActions = [
    { label: 'Envoyer un email', icon: Mail, color: '#3b82f6' },
    { label: 'Offrir crédit (30j Pro)', icon: Gift, color: '#10b981' },
    { label: 'Changer de plan', icon: RefreshCw, color: '#f59e0b' },
    { label: 'Suspendre le compte', icon: Pause, color: '#ef4444' },
    { label: 'Impersonnifier', icon: UserCheck, color: ACCENT },
  ];

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/clients')}
        style={{
          background: 'transparent', border: 'none', color: MUTED,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 13, marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Retour aux clients
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
          padding: 24, display: 'flex', alignItems: 'center', gap: 20,
          marginBottom: 24,
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 24, color: '#fff',
        }}>{client.logo}</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{client.name}</h1>
            <span style={{
              background: 'rgba(167, 139, 250, 0.15)', color: ACCENT,
              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            }}>{client.plan}</span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <CheckCircle2 size={12} /> {client.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: MUTED, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>{client.city}, {client.country}</span>
            <span>•</span>
            <span>{client.email}</span>
            <span>•</span>
            <span>Client depuis {new Date(client.since).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: ACCENT, color: '#fff', border: 'none',
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            Actions <MoreHorizontal size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
                  minWidth: 240, zIndex: 20, overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '12px 14px', background: 'transparent',
                      border: 'none', color: TEXT, cursor: 'pointer', fontSize: 13,
                      borderBottom: `1px solid ${BORDER}`, textAlign: 'left',
                    }}
                  >
                    <a.icon size={16} color={a.color} /> {a.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div style={{
        display: 'flex', gap: 2, borderBottom: `1px solid ${BORDER}`,
        marginBottom: 24, overflowX: 'auto',
      }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 18px', cursor: 'pointer',
              color: activeTab === t.key ? ACCENT : MUTED,
              borderBottom: `2px solid ${activeTab === t.key ? ACCENT : 'transparent'}`,
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'support' && <SupportTab />}
          {activeTab === 'activity' && <ActivityTab />}
          {activeTab === 'notes' && <NotesTab notes={notes} setNotes={setNotes} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: 20, ...style,
    }}>{children}</div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </Card>
  );
}

function OverviewTab() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="MRR" value={`${client.mrr}€`} icon={Euro} color="#10b981" />
        <StatCard label="CA total" value={`${client.ca}€`} icon={TrendingUp} color={ACCENT} />
        <StatCard label="Utilisateurs" value={client.users} icon={Users} color="#3b82f6" />
        <StatCard label="Health Score" value={`${client.healthScore}/100`} icon={Heart} color="#ef4444" />
      </div>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Évolution MRR</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={mrrTrend}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
            <XAxis dataKey="mois" stroke={MUTED} fontSize={11} />
            <YAxis stroke={MUTED} fontSize={11} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
            <Area type="monotone" dataKey="mrr" stroke={ACCENT} fill="url(#mrrGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Health Score</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `conic-gradient(#10b981 ${client.healthScore * 3.6}deg, ${BORDER} 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%', background: CARD,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{client.healthScore}</div>
                <div style={{ fontSize: 10, color: MUTED }}>/ 100</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <HealthIndicator label="Engagement" value={92} />
              <HealthIndicator label="Paiements" value={100} />
              <HealthIndicator label="Support" value={74} />
              <HealthIndicator label="Adoption modules" value={65} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Informations</h3>
          <InfoRow label="Plan" value={client.plan} />
          <InfoRow label="Sites" value={String(client.sites)} />
          <InfoRow label="Modules actifs" value={String(client.modules)} />
          <InfoRow label="Prochaine facture" value={new Date(client.nextBilling).toLocaleDateString('fr-FR')} />
          <InfoRow label="Téléphone" value={client.phone} />
        </Card>
      </div>
    </div>
  );
}

function HealthIndicator({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: MUTED }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: BORDER, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '8px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13,
    }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function UsageTab() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Heures d'utilisation / jour</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={usageData}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={MUTED} fontSize={11} />
            <YAxis stroke={MUTED} fontSize={11} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
            <Bar dataKey="heures" fill={ACCENT} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Commandes / jour</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={usageData}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={MUTED} fontSize={11} />
            <YAxis stroke={MUTED} fontSize={11} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
            <Line type="monotone" dataKey="commandes" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Utilisation par module</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {modulesUsage.map((m) => (
            <div key={m.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>{m.name}</span>
                <span style={{ color: m.color, fontWeight: 600 }}>{m.pct}%</span>
              </div>
              <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.pct}%` }}
                  transition={{ duration: 0.8 }}
                  style={{ height: '100%', background: m.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BillingTab() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="Total facturé" value={`${client.ca}€`} icon={Euro} color="#10b981" />
        <StatCard label="Impayés" value="0€" icon={AlertTriangle} color="#f59e0b" />
        <StatCard label="Mode de paiement" value="SEPA" icon={CreditCard} color={ACCENT} />
        <StatCard label="Prochaine facture" value="03/05" icon={Clock} color="#3b82f6" />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Historique des factures</h3>
          <button style={btnSec}>
            <Download size={14} /> Exporter
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, textAlign: 'left', color: MUTED }}>
              <th style={thStyle}>N°</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Montant</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {invoicesMock.map((i) => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={tdStyle}>{i.id}</td>
                <td style={tdStyle}>{new Date(i.date).toLocaleDateString('fr-FR')}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{i.amount}€</td>
                <td style={tdStyle}>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                    padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                  }}>{i.status}</span>
                </td>
                <td style={tdStyle}>
                  <button style={btnGhost}><Download size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SupportTab() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="Tickets totaux" value="12" icon={LifeBuoy} color={ACCENT} />
        <StatCard label="Résolus" value="11" icon={CheckCircle2} color="#10b981" />
        <StatCard label="En cours" value="1" icon={Clock} color="#f59e0b" />
        <StatCard label="Satisfaction" value="4.8/5" icon={Star} color="#fbbf24" />
      </div>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Tickets récents</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {ticketsMock.map((t) => (
            <div
              key={t.id}
              style={{
                padding: 14, background: BG, borderRadius: 8,
                border: `1px solid ${BORDER}`, display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{t.id} • {new Date(t.date).toLocaleDateString('fr-FR')}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.subject}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} fill={i < t.satisfaction ? '#fbbf24' : 'transparent'} color="#fbbf24" />
                  ))}
                </div>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                  padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                }}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ActivityTab() {
  return (
    <Card>
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Journal d'activité</h3>
      <div style={{ display: 'grid', gap: 2 }}>
        {activityMock.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              padding: '12px 14px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1px solid ${BORDER}`, fontSize: 13,
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{a.action}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>par {a.user}</div>
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>{a.time}</div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function NotesTab({ notes, setNotes }: { notes: string; setNotes: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <StickyNote size={16} color={ACCENT} /> Notes internes
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          style={{
            width: '100%', background: BG, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: 12, color: TEXT, fontSize: 13,
            fontFamily: 'inherit', resize: 'vertical',
          }}
        />
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Prochaines actions</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { t: 'Appel de suivi trimestriel', d: '28/04/2026', icon: MessageSquare },
            { t: 'Proposer module Marketing', d: '15/05/2026', icon: Zap },
            { t: 'Renouvellement contrat', d: '03/11/2026', icon: RefreshCw },
          ].map((a, i) => (
            <div key={i} style={{
              padding: 12, background: BG, borderRadius: 8,
              border: `1px solid ${BORDER}`, display: 'flex',
              alignItems: 'center', gap: 12,
            }}>
              <a.icon size={16} color={ACCENT} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{a.t}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{a.d}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Risques / Opportunités</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, border: `1px solid #10b98140`, fontSize: 13 }}>
            <strong style={{ color: '#10b981' }}>Opportunité:</strong> Client promoteur — 2 recommandations actives.
          </div>
          <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.08)', borderRadius: 8, border: `1px solid #f59e0b40`, fontSize: 13 }}>
            <strong style={{ color: '#f59e0b' }}>À surveiller:</strong> Utilisation module Marketing à 18% seulement.
          </div>
        </div>
      </Card>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '12px 8px' };
const btnSec: React.CSSProperties = {
  background: BG, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '8px 14px', borderRadius: 7, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const btnGhost: React.CSSProperties = {
  background: 'transparent', border: 'none', color: MUTED,
  cursor: 'pointer', padding: 6,
};
