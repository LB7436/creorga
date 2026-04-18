import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, Mail, Eye, UserX, LogIn,
  MoreVertical, X, Plus, ChevronUp, ChevronDown,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

type Plan = 'Starter' | 'Pro' | 'Business' | 'Enterprise';
type Status = 'Actif' | 'Trial' | 'Suspendu' | 'Churned';

interface Client {
  id: number;
  name: string;
  city: string;
  plan: Plan;
  mrr: number;
  signup: string;
  lastActivity: string;
  status: Status;
}

const CITIES = ['Luxembourg', 'Esch-sur-Alzette', 'Differdange', 'Dudelange', 'Mersch', 'Vianden', 'Remich', 'Ettelbruck'];
const PLANS: Plan[] = ['Starter', 'Pro', 'Business', 'Enterprise'];
const STATUSES: Status[] = ['Actif', 'Trial', 'Suspendu', 'Churned'];
const NAMES = [
  'Le Gourmand', 'Brasserie du Lac', 'Chez Marco', 'La Petite Table', 'Sushi Tokyo',
  'Auberge Verte', 'Café Central', 'Pizzeria Bella', 'Le Bistrot Moderne', 'La Cave à Vins',
  'Restaurant Panorama', 'Le Jardin Secret', 'Bar Le Coin', 'Trattoria Roma', 'Le Canard Doré',
  'Brasserie Luxembourg', 'Café Namur', 'Sushi Zen', 'Le Moulin Rouge', 'Chez Pierre',
  'La Table Ronde', 'Le Petit Prince', 'Burger King Street', 'Tapas y Vinos', 'Le Bon Coin',
  'L\'Étoile du Sud', 'La Cuisine de Marie', 'Le Relais', 'Saveurs d\'Asie', 'Le Comptoir',
];

const CLIENTS: Client[] = NAMES.map((name, i) => {
  const plan = PLANS[i % 4];
  const status = i % 17 === 0 ? 'Churned' : i % 11 === 0 ? 'Suspendu' : i % 7 === 0 ? 'Trial' : 'Actif';
  const mrr = status === 'Trial' || status === 'Churned' ? 0 : plan === 'Starter' ? 49 : plan === 'Pro' ? 129 : plan === 'Business' ? 289 : 599;
  return {
    id: i + 1, name,
    city: CITIES[i % CITIES.length],
    plan, mrr, status,
    signup: `${((i * 3) % 28) + 1}/${((i % 12) + 1).toString().padStart(2, '0')}/2025`,
    lastActivity: i % 5 === 0 ? 'il y a 2h' : i % 3 === 0 ? 'hier' : `il y a ${(i % 30) + 1}j`,
  };
});

type SortKey = keyof Client;

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<Plan | ''>('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [impersonate, setImpersonate] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    let list = CLIENTS.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      (planFilter ? c.plan === planFilter : true) &&
      (statusFilter ? c.status === statusFilter : true) &&
      (cityFilter ? c.city === cityFilter : true)
    );
    list.sort((a, b) => {
      const av = a[sortKey] as any; const bv = b[sortKey] as any;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [search, planFilter, statusFilter, cityFilter, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };

  const toggleSelect = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const exportCSV = () => {
    const header = 'Nom,Ville,Plan,MRR,Inscription,Dernière activité,Statut\n';
    const rows = filtered.map(c => `${c.name},${c.city},${c.plan},${c.mrr},${c.signup},${c.lastActivity},${c.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'creorga_clients.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => toggleSort(k)} style={{
      padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#64748b',
      textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', textAlign: 'left',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortKey === k && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </div>
    </th>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Clients</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            {CLIENTS.length} restaurants · {CLIENTS.filter(c => c.status === 'Actif').length} actifs · MRR total {CLIENTS.reduce((s, c) => s + c.mrr, 0)} €
          </p>
        </div>
        <button style={{
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff',
          border: 'none', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={15} /> Nouveau client
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
        padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un restaurant..."
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: '#0a0a0f', border: '1px solid #2a2a35',
              borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value as any)} style={selStyle}>
          <option value="">Tous les plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selStyle}>
          <option value="">Tous les statuts</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={selStyle}>
          <option value="">Toutes villes</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setPlanFilter(''); setStatusFilter(''); setCityFilter(''); }} style={{
          background: 'transparent', border: '1px solid #2a2a35',
          color: '#94a3b8', padding: '9px 14px', borderRadius: 8,
          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Filter size={13} /> Réinitialiser
        </button>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: '#e2e8f0' }}>
              <strong style={{ color: '#a78bfa' }}>{selected.size}</strong> client(s) sélectionné(s)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={bulkBtn}><Mail size={13} /> Newsletter</button>
              <button style={bulkBtn} onClick={exportCSV}><Download size={13} /> Export CSV</button>
              <button onClick={() => setSelected(new Set())} style={{ ...bulkBtn, background: 'transparent' }}>
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#0f0f16' }}>
            <tr>
              <th style={{ padding: '12px', width: 40 }}>
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  style={{ accentColor: '#a78bfa' }}
                />
              </th>
              <SortHead k="name" label="Restaurant" />
              <SortHead k="city" label="Ville" />
              <SortHead k="plan" label="Plan" />
              <SortHead k="mrr" label="MRR" />
              <SortHead k="signup" label="Inscription" />
              <SortHead k="lastActivity" label="Dernière activité" />
              <SortHead k="status" label="Statut" />
              <th style={{ padding: '10px 12px', width: 160, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                style={{ borderTop: '1px solid #2a2a35', background: selected.has(c.id) ? 'rgba(167,139,250,0.05)' : 'transparent' }}
              >
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <input
                    type="checkbox" checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    style={{ accentColor: '#a78bfa' }}
                  />
                </td>
                <td style={{ padding: '12px' }}>
                  <Link to={`/clients/${c.id}`} style={{ color: '#e2e8f0', fontWeight: 600, textDecoration: 'none' }}>
                    {c.name}
                  </Link>
                </td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>{c.city}</td>
                <td style={{ padding: '12px' }}><StatusBadge status={c.plan} /></td>
                <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: 600 }}>{c.mrr} €</td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>{c.signup}</td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>{c.lastActivity}</td>
                <td style={{ padding: '12px' }}><StatusBadge status={c.status} /></td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <Link to={`/clients/${c.id}`} style={actionBtn} title="Voir">
                      <Eye size={14} />
                    </Link>
                    <button style={actionBtn} title="Impersonnifier" onClick={() => setImpersonate(c)}>
                      <LogIn size={14} />
                    </button>
                    <button style={actionBtn} title="Suspendre">
                      <UserX size={14} />
                    </button>
                    <button style={actionBtn} title="Contacter">
                      <Mail size={14} />
                    </button>
                    <button style={actionBtn} title="Plus">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Aucun client ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Impersonate modal */}
      <AnimatePresence>
        {impersonate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setImpersonate(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#13131a', border: '1px solid #2a2a35',
                borderRadius: 12, padding: 28, maxWidth: 440, width: '90%',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: 'rgba(167,139,250,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <LogIn size={24} color="#a78bfa" />
              </div>
              <h3 style={{ textAlign: 'center', margin: '0 0 8px', color: '#e2e8f0', fontSize: 18 }}>
                Impersonnification
              </h3>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
                Vous allez accéder au compte de <strong style={{ color: '#a78bfa' }}>{impersonate.name}</strong> en tant qu'admin.
                Cette action sera loggée et visible par le client.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setImpersonate(null)} style={{
                  flex: 1, padding: 10, background: 'transparent',
                  border: '1px solid #2a2a35', borderRadius: 8,
                  color: '#94a3b8', fontSize: 13, cursor: 'pointer',
                }}>Annuler</button>
                <button onClick={() => { alert(`Session d'impersonnification lancée pour ${impersonate.name}`); setImpersonate(null); }} style={{
                  flex: 1, padding: 10,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Confirmer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: '9px 12px', background: '#0a0a0f', border: '1px solid #2a2a35',
  borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', cursor: 'pointer',
};

const bulkBtn: React.CSSProperties = {
  background: '#13131a', border: '1px solid #2a2a35',
  color: '#e2e8f0', padding: '6px 12px', borderRadius: 6,
  fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
};

const actionBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  background: 'transparent', border: '1px solid #2a2a35',
  color: '#94a3b8', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  textDecoration: 'none',
};
