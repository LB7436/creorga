import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type TxType = 'TOPUP' | 'SPEND' | 'REFUND' | 'TRANSFER' | 'GIFT_CONV';
interface Transaction {
  id: number;
  date: string;
  type: TxType;
  amount: number;
  description: string;
  balanceAfter: number;
  disputed?: boolean;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  initials: string;
  color: string;
  balance: number;
  totalTopUp: number;
  lastActivity: string;
  transactions: Transaction[];
  autoTopup?: { enabled: boolean; threshold: number; amount: number };
  group?: string;
  giftCard?: number;
  isVIP?: boolean;
  expiresAt?: string;
}

const palette = { indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e', sky: '#0ea5e9', violet: '#8b5cf6' };

const makeTx = (seed: number, startBalance: number): Transaction[] => {
  const descTop = ['Rechargement en caisse', 'Recharge SMS', 'Rechargement bar', 'Recharge carte'];
  const descSpend = ['Boisson au bar', 'Menu du jour', 'Caf\é & croissant', 'Plateau ap\éro', 'Addition table'];
  const out: Transaction[] = [];
  let bal = startBalance;
  for (let i = 0; i < 20; i++) {
    const isTop = (seed + i) % 3 === 0;
    const amt = isTop ? [10, 20, 50, 100][(seed + i) % 4] : Number(((seed * 2 + i) % 25 + 3).toFixed(2));
    bal = isTop ? bal + amt : Math.max(0, bal - amt);
    const d = new Date(2026, 3, 15 - i);
    out.push({
      id: i + 1,
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      type: isTop ? 'TOPUP' : 'SPEND',
      amount: amt,
      description: isTop ? descTop[i % descTop.length] : descSpend[i % descSpend.length],
      balanceAfter: bal,
      disputed: i === 3 && seed === 4,
    });
  }
  return out;
};

const customers: Customer[] = [
  { id: 1, name: 'Marie Schmit', phone: '+352 621 123 456', initials: 'MS', color: palette.indigo, balance: 85.50, totalTopUp: 300, lastActivity: '12 avr. 2026', transactions: makeTx(1, 85.50), autoTopup: { enabled: true, threshold: 20, amount: 50 }, isVIP: true, expiresAt: '2026-10-15' },
  { id: 2, name: 'Luc M\üller', phone: '+352 621 234 567', initials: 'LM', color: palette.emerald, balance: 120.00, totalTopUp: 500, lastActivity: '11 avr. 2026', transactions: makeTx(2, 120), group: 'Famille M\üller', isVIP: true },
  { id: 3, name: 'Sophie Weber', phone: '+352 621 345 678', initials: 'SW', color: palette.amber, balance: 45.20, totalTopUp: 200, lastActivity: '10 avr. 2026', transactions: makeTx(3, 45.2), giftCard: 25 },
  { id: 4, name: 'Pierre Hoffmann', phone: '+352 621 456 789', initials: 'PH', color: '#ef4444', balance: 200.00, totalTopUp: 800, lastActivity: '9 avr. 2026', transactions: makeTx(4, 200), autoTopup: { enabled: true, threshold: 30, amount: 100 }, isVIP: true },
  { id: 5, name: 'Claire Reuter', phone: '+352 621 567 890', initials: 'CR', color: palette.violet, balance: 30.00, totalTopUp: 150, lastActivity: '8 avr. 2026', transactions: makeTx(5, 30), group: 'Famille M\üller' },
  { id: 6, name: 'Jean-Marc Biver', phone: '+352 621 678 901', initials: 'JB', color: '#ec4899', balance: 67.80, totalTopUp: 250, lastActivity: '7 avr. 2026', transactions: makeTx(6, 67.8) },
  { id: 7, name: 'Anne Faber', phone: '+352 621 789 012', initials: 'AF', color: palette.sky, balance: 5.20, totalTopUp: 180, lastActivity: '6 avr. 2026', transactions: makeTx(7, 5.2), expiresAt: '2026-05-20' },
  { id: 8, name: 'Thomas Kremer', phone: '+352 621 890 123', initials: 'TK', color: '#14b8a6', balance: 0, totalTopUp: 100, lastActivity: '3 avr. 2026', transactions: makeTx(8, 0) },
  { id: 9, name: 'Isabelle Wagner', phone: '+352 621 901 234', initials: 'IW', color: palette.rose, balance: 155.40, totalTopUp: 600, lastActivity: '12 avr. 2026', transactions: makeTx(9, 155.4), isVIP: true },
  { id: 10, name: 'Nicolas Thill', phone: '+352 621 012 345', initials: 'NT', color: '#84cc16', balance: 22.10, totalTopUp: 120, lastActivity: '5 avr. 2026', transactions: makeTx(10, 22.1) },
];

const velocityData = [
  { jour: 'Lun', topup: 320, spend: 280 },
  { jour: 'Mar', topup: 180, spend: 220 },
  { jour: 'Mer', topup: 240, spend: 310 },
  { jour: 'Jeu', topup: 420, spend: 290 },
  { jour: 'Ven', topup: 560, spend: 680 },
  { jour: 'Sam', topup: 720, spend: 820 },
  { jour: 'Dim', topup: 280, spend: 350 },
];

const topSpenders = customers
  .slice()
  .sort((a, b) => (b.totalTopUp - b.balance) - (a.totalTopUp - a.balance))
  .slice(0, 5)
  .map(c => ({ name: c.name.split(' ')[0], depense: c.totalTopUp - c.balance }));

const TOPUP_PROMOS = [
  { min: 20, bonus: 0, label: 'Aucun bonus' },
  { min: 50, bonus: 10, label: '+10% bonus' },
  { min: 100, bonus: 15, label: '+15% bonus' },
  { min: 200, bonus: 20, label: '+20% bonus premium' },
];

type SortKey = 'balance' | 'name' | 'activity';
type FilterKey = 'all' | 'with' | 'low' | 'none' | 'vip' | 'expiring';

const statsData = [
  { label: 'Total en circulation', value: '3 240 \€', delta: '+8,4%', icon: 'TOT', color: '#6366f1', bg: '#eef2ff' },
  { label: 'Rechargements ce mois', value: '890 \€', delta: '+12,1%', icon: 'REC', color: '#10b981', bg: '#ecfdf5' },
  { label: 'Solde moyen', value: '73 \€', delta: '+3,2%', icon: 'AVG', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Clients actifs', value: '48', delta: '+5', icon: 'CLI', color: '#ec4899', bg: '#fdf2f8' },
];

export default function PortefeuillePage() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('balance');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [bulkAmount, setBulkAmount] = useState('20');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('MS;50\nLM;25\nPH;100\nIW;75');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFee, setTransferFee] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'overview' | 'history' | 'rules'>('overview');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    if (filter === 'with') list = list.filter((c) => c.balance > 10);
    if (filter === 'low') list = list.filter((c) => c.balance > 0 && c.balance <= 10);
    if (filter === 'none') list = list.filter((c) => c.balance === 0);
    if (filter === 'vip') list = list.filter((c) => c.isVIP);
    if (filter === 'expiring') list = list.filter((c) => c.expiresAt);
    list.sort((a, b) => {
      if (sortKey === 'balance') return b.balance - a.balance;
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      return b.lastActivity.localeCompare(a.lastActivity);
    });
    return list;
  }, [search, sortKey, filter]);

  const toggleBulk = (id: number) => {
    setBulkSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const avgBalance = customers.reduce((s, c) => s + c.balance, 0) / customers.length;
  const totalVelocity = customers.reduce((s, c) => s + c.totalTopUp, 0);
  const disputes = customers.flatMap(c => c.transactions.filter(t => t.disputed)).length;

  const openPanel = (c: Customer) => { setSelected(c); setPanelTab('overview'); };

  const renderBadge = (label: string, color: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 8,
      fontSize: 10, fontWeight: 700, background: `${color}18`, color,
    }}>{label}</span>
  );

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 22,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>Portefeuille num\érique</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 14 }}>Soldes, recharges, promos et P2P pour vos clients</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setCsvOpen(true)}
            style={{ background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Import CSV
          </button>
          <button onClick={() => setTransferOpen(true)}
            style={{ background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Transfert P2P
          </button>
          <button onClick={() => setBulkOpen(true)}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            + Recharge group\ée
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {statsData.map((s) => (
          <motion.div key={s.label} variants={item} style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{s.delta}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Analytics row */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>V\élocit\é de circulation</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Recharges vs d\épenses (7 derniers jours)</p>
            </div>
            <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 700 }}>{totalVelocity.toFixed(0)} \€ cumul\é</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="jour" stroke="#94a3b8" style={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="topup" fill="#10b981" radius={[6, 6, 0, 0]} name="Rechargements" />
              <Bar dataKey="spend" fill="#6366f1" radius={[6, 6, 0, 0]} name="D\épenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Top 5 utilisateurs</h3>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 14px' }}>Total d\épens\é cumul\é</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topSpenders.map((s, i) => {
              const max = Math.max(...topSpenders.map(x => x.depense));
              const pct = (s.depense / max) * 100;
              return (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{i + 1}. {s.name}</span>
                    <span style={{ color: '#6366f1', fontWeight: 700 }}>{s.depense.toFixed(0)} \€</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Promo banner */}
      <motion.div variants={item} style={{
        background: 'linear-gradient(120deg,#fef3c7,#fde68a)', border: '1px solid #fcd34d',
        borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#b45309', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>%</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7c2d12' }}>Promos top-up actives</div>
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
              {TOPUP_PROMOS.slice(1).map(p => `+${p.bonus}% d\ès ${p.min} \€`).join(' \· ')}
            </div>
          </div>
        </div>
        <button onClick={() => showToast('R\ègles de promo mises \à jour')}
          style={{ background: '#fff', color: '#7c2d12', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          G\érer les promos
        </button>
      </motion.div>

      {/* Controls */}
      <motion.div variants={item} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou t\él\éphone..."
          style={{ flex: '1 1 260px', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', outline: 'none' }}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', cursor: 'pointer' }}>
          <option value="balance">Trier par solde</option>
          <option value="name">Trier par nom</option>
          <option value="activity">Trier par activit\é</option>
        </select>
        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
          {([
            ['all', 'Tous'],
            ['with', 'Avec solde'],
            ['low', 'Solde bas'],
            ['none', 'Sans solde'],
            ['vip', 'VIP'],
            ['expiring', 'Expire bient\ôt'],
          ] as [FilterKey, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600,
                background: filter === k ? '#6366f1' : 'transparent',
                color: filter === k ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Alerts row */}
      {(disputes > 0) && (
        <motion.div variants={item} style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14,
          padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>
            <strong>{disputes} transaction(s) contest\ée(s)</strong> en attente de r\évision
          </div>
          <button onClick={() => showToast('Voir les litiges \— bient\ôt disponible')}
            style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            R\éviser
          </button>
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={item} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.2fr 1fr', padding: '14px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {['Client', 'T\él\éphone', 'Solde', 'Total rechargé', 'Derni\ère utilisation', 'Statut'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</span>
          ))}
        </div>
        {filtered.map((c, i) => (
          <div
            key={c.id}
            onClick={() => openPanel(c)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.2fr 1fr', padding: '14px 22px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.initials}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                {c.group && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>Groupe : {c.group}</div>}
              </div>
            </div>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.phone}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: c.balance === 0 ? '#94a3b8' : c.balance < 10 ? '#f59e0b' : '#10b981' }}>{c.balance.toFixed(2)} \€</span>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.totalTopUp.toFixed(0)} \€</span>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.lastActivity}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {c.isVIP && renderBadge('VIP', '#d97706')}
              {c.autoTopup?.enabled && renderBadge('AUTO', '#10b981')}
              {c.giftCard && renderBadge('GIFT', '#ec4899')}
              {c.expiresAt && renderBadge('EXPIRE', '#dc2626')}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Aucun client trouv\é</div>
        )}
      </motion.div>

      {/* Slide-out detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 900 }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, background: '#fff', borderLeft: '1px solid #e2e8f0', zIndex: 950, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 50px rgba(15,23,42,0.15)' }}>
              <div style={{ padding: '22px 26px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{selected.initials}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{selected.name}</h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: 13, color: '#64748b' }}>{selected.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}>\×</button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, padding: '0 26px', borderBottom: '1px solid #e2e8f0' }}>
                {(['overview', 'history', 'rules'] as const).map(t => (
                  <button key={t} onClick={() => setPanelTab(t)}
                    style={{
                      padding: '12px 16px', fontSize: 13, fontWeight: 600, background: 'transparent',
                      color: panelTab === t ? '#6366f1' : '#64748b',
                      border: 'none', borderBottom: panelTab === t ? '2px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer',
                    }}>
                    {t === 'overview' ? 'Vue d\'ensemble' : t === 'history' ? 'Historique' : 'R\ègles & auto'}
                  </button>
                ))}
              </div>

              <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
                {panelTab === 'overview' && (
                  <>
                    {/* Balance card */}
                    <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: 20, color: '#fff' }}>
                      <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>Solde actuel</div>
                      <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{selected.balance.toFixed(2)} \€</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, opacity: 0.9 }}>
                        <span>Total rechargé : {selected.totalTopUp.toFixed(0)} \€</span>
                        <span>D\épens\é : {(selected.totalTopUp - selected.balance).toFixed(0)} \€</span>
                      </div>
                      {selected.expiresAt && (
                        <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 11 }}>
                          Expire le {selected.expiresAt} (inactivit\é 6 mois)
                        </div>
                      )}
                    </div>

                    {/* Gift card conversion */}
                    {selected.giftCard && selected.giftCard > 0 && (
                      <div style={{ marginTop: 16, padding: 14, background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#9d174d', fontWeight: 700 }}>CARTE CADEAU DISPONIBLE</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#be185d' }}>{selected.giftCard.toFixed(2)} \€</div>
                        </div>
                        <button onClick={() => showToast('Carte cadeau convertie en solde portefeuille')}
                          style={{ padding: '8px 14px', background: '#be185d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Convertir \→ wallet
                        </button>
                      </div>
                    )}

                    {/* Quick recharge */}
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Recharge rapide</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {[10, 20, 50, 100].map((v) => {
                          const promo = TOPUP_PROMOS.filter(p => v >= p.min).slice(-1)[0];
                          return (
                            <button key={v} onClick={() => showToast(`+${v}\€ recharg\é${promo.bonus ? ` (+${promo.bonus}% bonus)` : ''}`)}
                              style={{ padding: '12px 0', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', position: 'relative' }}>
                              +{v}\€
                              {promo.bonus > 0 && (
                                <div style={{ fontSize: 9, color: '#b45309', fontWeight: 700, marginTop: 2 }}>+{promo.bonus}%</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} type="number" placeholder="Montant perso."
                          style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }} />
                        <button onClick={() => { showToast(`+${customAmount}\€ recharg\é`); setCustomAmount(''); }}
                          style={{ padding: '10px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                          Recharger
                        </button>
                      </div>
                    </div>

                    {/* Deduct & Refund */}
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} type="number" placeholder="D\éduire"
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
                        <button onClick={() => { showToast(`-${deductAmount}\€ d\éduit`); setDeductAmount(''); }}
                          style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          \−
                        </button>
                      </div>
                      <button onClick={() => showToast('Remboursement cr\édit\é sur le wallet')}
                        style={{ padding: '10px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Rembourser via wallet
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 16 }}>
                      <button onClick={() => setQrOpen(true)}
                        style={{ padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        QR Pay en caisse
                      </button>
                      <button onClick={() => showToast('Relev\é PDF g\én\ér\é')}
                        style={{ padding: '10px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Relev\é PDF
                      </button>
                      <button onClick={() => showToast('Lien SMS envoy\é')}
                        style={{ padding: '10px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Lien recharge SMS
                      </button>
                      <button onClick={() => { setTransferOpen(true); setTransferTo(String(selected.id)); }}
                        style={{ padding: '10px 14px', background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Transfert P2P
                      </button>
                    </div>
                  </>
                )}

                {panelTab === 'history' && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                      Historique des transactions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selected.transactions.map((t) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: t.disputed ? '#fef2f2' : '#f8fafc', border: `1px solid ${t.disputed ? '#fecaca' : '#e2e8f0'}`, borderRadius: 10 }}>
                          <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: t.type === 'TOPUP' ? '#dcfce7' : '#fee2e2', color: t.type === 'TOPUP' ? '#166534' : '#991b1b' }}>{t.type}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{t.description}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.date} \· Solde : {t.balanceAfter.toFixed(2)}\€</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.type === 'TOPUP' ? '#059669' : '#dc2626' }}>
                              {t.type === 'TOPUP' ? '+' : '-'}{t.amount.toFixed(2)}\€
                            </div>
                            {t.disputed ? (
                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: '#dc2626', color: '#fff', fontWeight: 700 }}>LITIGE</span>
                            ) : (
                              <button onClick={() => showToast('Transaction signal\ée pour r\évision')}
                                style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 10, padding: '2px 6px', borderRadius: 5, cursor: 'pointer' }}>
                                Contester
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {panelTab === 'rules' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Auto-topup */}
                    <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Auto top-up</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Recharge automatique quand le solde est bas</div>
                        </div>
                        <div style={{
                          width: 40, height: 22, borderRadius: 11,
                          background: selected.autoTopup?.enabled ? '#10b981' : '#cbd5e1',
                          position: 'relative', cursor: 'pointer',
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2, left: selected.autoTopup?.enabled ? 20 : 2, transition: 'left 0.2s',
                          }} />
                        </div>
                      </div>
                      {selected.autoTopup?.enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, color: '#64748b' }}>Seuil d\éclencheur</label>
                            <input type="number" defaultValue={selected.autoTopup.threshold}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', outline: 'none', marginTop: 4 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: '#64748b' }}>Montant \à recharger</label>
                            <input type="number" defaultValue={selected.autoTopup.amount}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', outline: 'none', marginTop: 4 }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expiration rules */}
                    <div style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#7c2d12' }}>Expiration du solde</div>
                      <div style={{ fontSize: 12, color: '#92400e', marginTop: 4, marginBottom: 8 }}>Le solde expire apr\ès une p\ériode d'inactivit\é</div>
                      <select style={{ width: '100%', padding: '8px 10px', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1e293b' }}>
                        <option>Jamais</option>
                        <option>Apr\ès 6 mois</option>
                        <option>Apr\ès 12 mois</option>
                        <option>Apr\ès 24 mois</option>
                      </select>
                    </div>

                    {/* Group wallet */}
                    <div style={{ padding: 14, background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#6b21a8' }}>Wallet de groupe</div>
                      <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 4, marginBottom: 8 }}>
                        {selected.group ? `Membre du groupe : ${selected.group}` : 'Aucun groupe associ\é'}
                      </div>
                      <button onClick={() => showToast('Gestion des groupes ouverte')}
                        style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {selected.group ? 'Modifier le groupe' : 'Cr\éer un groupe'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk recharge modal */}
      <AnimatePresence>
        {bulkOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setBulkOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Recharge group\ée</h3>
              <p style={{ margin: '6px 0 18px 0', color: '#64748b', fontSize: 14 }}>S\électionnez les clients et le montant \à cr\éditer</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} type="number" placeholder="Montant par client"
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }} />
                <div style={{ padding: '10px 16px', background: '#f1f5f9', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                  Total : {(Number(bulkAmount || 0) * bulkSelected.length).toFixed(2)} \€
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                {customers.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={() => toggleBulk(c.id)} style={{ width: 16, height: 16 }} />
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{c.initials}</div>
                    <span style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{c.balance.toFixed(2)} \€</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button onClick={() => setBulkOpen(false)}
                  style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { showToast(`${bulkSelected.length} clients recharg\és`); setBulkOpen(false); setBulkSelected([]); }}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Recharger {bulkSelected.length} clients
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV import modal */}
      <AnimatePresence>
        {csvOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCsvOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: 28, width: 520, maxHeight: '80vh', overflow: 'auto' }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Import CSV \— Recharge en masse</h3>
              <p style={{ margin: '6px 0 16px', color: '#64748b', fontSize: 13 }}>Format : <code>INITIALES;MONTANT</code> (une ligne par client)</p>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)}
                style={{ width: '100%', minHeight: 180, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13, fontFamily: 'monospace', color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569' }}>
                {csvText.split('\n').filter(Boolean).length} ligne(s) d\étect\ée(s) \· Total : {csvText.split('\n').reduce((s, l) => s + (Number(l.split(';')[1]) || 0), 0).toFixed(2)} \€
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button onClick={() => setCsvOpen(false)}
                  style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { showToast('CSV import\é avec succ\ès'); setCsvOpen(false); }}
                  style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Importer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer modal */}
      <AnimatePresence>
        {transferOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setTransferOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: 28, width: 460 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Transfert entre clients (P2P)</h3>
              <p style={{ margin: '6px 0 18px', color: '#64748b', fontSize: 13 }}>Transf\érer un montant du wallet d'un client vers un autre</p>
              <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>De</label>
              <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, marginTop: 4, marginBottom: 12, color: '#1e293b', background: '#fff' }}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.balance.toFixed(2)} \€)</option>)}
              </select>
              <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Vers</label>
              <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, marginTop: 4, marginBottom: 12, color: '#1e293b', background: '#fff' }}>
                <option value="">S\électionner...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Montant</label>
              <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, marginTop: 4, marginBottom: 12, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: '#f8fafc', borderRadius: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={transferFee} onChange={e => setTransferFee(e.target.checked)} />
                <span style={{ fontSize: 13, color: '#475569' }}>Appliquer frais de transfert (0,50 \€)</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button onClick={() => setTransferOpen(false)}
                  style={{ padding: '10px 18px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => { showToast(`Transfert de ${transferAmount}\€ effectu\é`); setTransferOpen(false); setTransferAmount(''); setTransferTo(''); }}
                  style={{ padding: '10px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Transf\érer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR pay modal */}
      <AnimatePresence>
        {qrOpen && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setQrOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: 32, width: 360, textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>QR Pay - {selected.name}</h3>
              <p style={{ margin: '6px 0 18px', color: '#64748b', fontSize: 13 }}>Le client scanne ce QR \à la caisse pour payer instantan\ément</p>
              <div style={{ width: 220, height: 220, background: '#1e293b', borderRadius: 16, margin: '0 auto', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={200} height={200} style={{ background: '#fff', borderRadius: 8 }}>
                  {Array.from({ length: 16 }).flatMap((_, r) =>
                    Array.from({ length: 16 }).map((_, c) => {
                      const on = ((r * 31 + c * 17 + selected.id) % 3 === 0) ? 1 : 0;
                      return on ? <rect key={`${r}-${c}`} x={c * 12.5} y={r * 12.5} width={12.5} height={12.5} fill="#1e293b" /> : null;
                    })
                  )}
                </svg>
              </div>
              <div style={{ marginTop: 14, fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{selected.balance.toFixed(2)} \€</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>disponible</div>
              <button onClick={() => setQrOpen(false)}
                style={{ marginTop: 18, width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            style={{ position: 'fixed', bottom: 28, right: 28, background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 10001 }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
