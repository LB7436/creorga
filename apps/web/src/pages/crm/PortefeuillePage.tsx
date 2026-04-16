import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type TxType = 'TOPUP' | 'SPEND';
interface Transaction {
  id: number;
  date: string;
  type: TxType;
  amount: number;
  description: string;
  balanceAfter: number;
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
}

const statsData = [
  { label: 'Total en circulation', value: '3 240 €', icon: '💰', gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
  { label: 'Rechargements ce mois', value: '890 €', icon: '📥', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
  { label: 'Dépenses ce mois', value: '650 €', icon: '📤', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
  { label: 'Clients actifs', value: '48', icon: '👥', gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)' },
];

const makeTx = (seed: number, startBalance: number): Transaction[] => {
  const descTop = ['Rechargement en caisse', 'Recharge SMS', 'Rechargement bar', 'Recharge carte'];
  const descSpend = ['Boisson au bar', 'Menu du jour', 'Café & croissant', 'Plateau apéro', 'Addition table'];
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
    });
  }
  return out;
};

const customers: Customer[] = [
  { id: 1, name: 'Marie Schmit', phone: '+352 621 123 456', initials: 'MS', color: '#6366f1', balance: 85.50, totalTopUp: 300, lastActivity: '12 avr. 2026', transactions: makeTx(1, 85.50) },
  { id: 2, name: 'Luc Müller', phone: '+352 621 234 567', initials: 'LM', color: '#10b981', balance: 120.00, totalTopUp: 500, lastActivity: '11 avr. 2026', transactions: makeTx(2, 120) },
  { id: 3, name: 'Sophie Weber', phone: '+352 621 345 678', initials: 'SW', color: '#f59e0b', balance: 45.20, totalTopUp: 200, lastActivity: '10 avr. 2026', transactions: makeTx(3, 45.2) },
  { id: 4, name: 'Pierre Hoffmann', phone: '+352 621 456 789', initials: 'PH', color: '#ef4444', balance: 200.00, totalTopUp: 800, lastActivity: '9 avr. 2026', transactions: makeTx(4, 200) },
  { id: 5, name: 'Claire Reuter', phone: '+352 621 567 890', initials: 'CR', color: '#8b5cf6', balance: 30.00, totalTopUp: 150, lastActivity: '8 avr. 2026', transactions: makeTx(5, 30) },
  { id: 6, name: 'Jean-Marc Biver', phone: '+352 621 678 901', initials: 'JB', color: '#ec4899', balance: 67.80, totalTopUp: 250, lastActivity: '7 avr. 2026', transactions: makeTx(6, 67.8) },
  { id: 7, name: 'Anne Faber', phone: '+352 621 789 012', initials: 'AF', color: '#0ea5e9', balance: 5.20, totalTopUp: 180, lastActivity: '6 avr. 2026', transactions: makeTx(7, 5.2) },
  { id: 8, name: 'Thomas Kremer', phone: '+352 621 890 123', initials: 'TK', color: '#14b8a6', balance: 0, totalTopUp: 100, lastActivity: '3 avr. 2026', transactions: makeTx(8, 0) },
  { id: 9, name: 'Isabelle Wagner', phone: '+352 621 901 234', initials: 'IW', color: '#f43f5e', balance: 155.40, totalTopUp: 600, lastActivity: '12 avr. 2026', transactions: makeTx(9, 155.4) },
  { id: 10, name: 'Nicolas Thill', phone: '+352 621 012 345', initials: 'NT', color: '#84cc16', balance: 22.10, totalTopUp: 120, lastActivity: '5 avr. 2026', transactions: makeTx(10, 22.1) },
];

type SortKey = 'balance' | 'name' | 'activity';
type FilterKey = 'all' | 'with' | 'low' | 'none';

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

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    if (filter === 'with') list = list.filter((c) => c.balance > 10);
    if (filter === 'low') list = list.filter((c) => c.balance > 0 && c.balance <= 10);
    if (filter === 'none') list = list.filter((c) => c.balance === 0);
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Portefeuille numérique</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>Gérez les soldes clients, recharges et transactions</p>
        </div>
        <button
          onClick={() => setBulkOpen(true)}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
        >
          + Recharge groupée
        </button>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {statsData.map((s) => (
          <motion.div key={s.label} variants={item} style={{ background: s.gradient, borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{s.value}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <motion.div variants={item} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          style={{ flex: '1 1 260px', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', outline: 'none' }}
        />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#1e293b', cursor: 'pointer' }}>
          <option value="balance">Trier par solde</option>
          <option value="name">Trier par nom</option>
          <option value="activity">Trier par activité</option>
        </select>
        <div style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4 }}>
          {([
            ['all', 'Tous'],
            ['with', 'Avec solde'],
            ['low', 'Solde bas'],
            ['none', 'Sans solde'],
          ] as [FilterKey, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, background: filter === k ? '#6366f1' : 'transparent', color: filter === k ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              {l}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.2fr', padding: '14px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {['Client', 'Téléphone', 'Solde', 'Total rechargé', 'Dernière utilisation'].map((h) => (
            <span key={h} style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</span>
          ))}
        </div>
        {filtered.map((c, i) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.2fr', padding: '14px 22px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.initials}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
            </div>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.phone}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: c.balance === 0 ? '#94a3b8' : c.balance < 10 ? '#f59e0b' : '#10b981' }}>{c.balance.toFixed(2)} €</span>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.totalTopUp.toFixed(0)} €</span>
            <span style={{ fontSize: 13, color: '#475569' }}>{c.lastActivity}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Aucun client trouvé</div>
        )}
      </motion.div>

      {/* Slide-out detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 900 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, background: '#fff', borderLeft: '1px solid #e2e8f0', zIndex: 950, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 50px rgba(15,23,42,0.15)' }}
            >
              <div style={{ padding: '22px 26px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{selected.initials}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{selected.name}</h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: 13, color: '#64748b' }}>{selected.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
                {/* Balance card */}
                <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: 20, color: '#fff' }}>
                  <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5 }}>Solde actuel</div>
                  <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>{selected.balance.toFixed(2)} €</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, opacity: 0.9 }}>
                    <span>Total rechargé : {selected.totalTopUp.toFixed(0)} €</span>
                    <span>Dépensé : {(selected.totalTopUp - selected.balance).toFixed(0)} €</span>
                  </div>
                </div>

                {/* Quick recharge */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Recharge rapide</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {[10, 20, 50, 100].map((v) => (
                      <button key={v} style={{ padding: '12px 0', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+{v}€</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} type="number" placeholder="Montant perso." style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }} />
                    <button style={{ padding: '10px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Recharger</button>
                  </div>
                </div>

                {/* Deduct */}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <input value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} type="number" placeholder="Montant à déduire" style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }} />
                  <button style={{ padding: '10px 18px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Déduire</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={{ flex: 1, padding: '10px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📱 Envoyer lien de recharge SMS</button>
                  <button style={{ padding: '10px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇ CSV</button>
                </div>

                {/* Transactions */}
                <div style={{ marginTop: 26 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Historique des transactions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.transactions.map((t) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: t.type === 'TOPUP' ? '#dcfce7' : '#fee2e2', color: t.type === 'TOPUP' ? '#166534' : '#991b1b' }}>{t.type}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{t.description}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.date} · Solde : {t.balanceAfter.toFixed(2)}€</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t.type === 'TOPUP' ? '#059669' : '#dc2626' }}>
                          {t.type === 'TOPUP' ? '+' : '-'}{t.amount.toFixed(2)}€
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bulk recharge modal */}
      <AnimatePresence>
        {bulkOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBulkOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Recharge groupée</h3>
              <p style={{ margin: '6px 0 18px 0', color: '#64748b', fontSize: 14 }}>Sélectionnez les clients et le montant à créditer</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} type="number" placeholder="Montant par client" style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none' }} />
                <div style={{ padding: '10px 16px', background: '#f1f5f9', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Total : {(Number(bulkAmount || 0) * bulkSelected.length).toFixed(2)} €</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                {customers.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={() => toggleBulk(c.id)} style={{ width: 16, height: 16 }} />
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{c.initials}</div>
                    <span style={{ flex: 1, fontSize: 14, color: '#1e293b' }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{c.balance.toFixed(2)} €</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button onClick={() => setBulkOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => setBulkOpen(false)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Recharger {bulkSelected.length} clients</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
