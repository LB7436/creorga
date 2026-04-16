import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Status = 'attente' | 'preparation' | 'pret';
type Cours = 'Apéritif' | 'Entrée' | 'Plat' | 'Dessert';
type Station = 'Toutes' | 'Chaud' | 'Froid' | 'Boissons' | 'Desserts';
type Filter = 'Tout' | 'Apéritif' | 'Plat' | 'Dessert';

interface OrderItem {
  id: number;
  name: string;
  qty: number;
  cours: Cours;
  station: Exclude<Station, 'Toutes'>;
  note?: string;
}

interface Order {
  id: number;
  table: string;
  createdMinAgo: number;
  status: Status;
  items: OrderItem[];
  server: string;
}

const initialOrders: Order[] = [
  {
    id: 1, table: 'T-04', createdMinAgo: 2, status: 'attente', server: 'Laura',
    items: [
      { id: 1, name: 'Spritz Apérol', qty: 2, cours: 'Apéritif', station: 'Boissons' },
      { id: 2, name: 'Planche charcuterie', qty: 1, cours: 'Apéritif', station: 'Froid' },
      { id: 3, name: 'Tartare bœuf', qty: 2, cours: 'Plat', station: 'Froid', note: 'Sans câpres pour 1' },
    ],
  },
  {
    id: 2, table: 'T-12', createdMinAgo: 4, status: 'attente', server: 'Karim',
    items: [
      { id: 4, name: 'Burrata maison', qty: 1, cours: 'Entrée', station: 'Froid' },
      { id: 5, name: 'Risotto champignons', qty: 2, cours: 'Plat', station: 'Chaud', note: 'Allergie gluten' },
      { id: 6, name: 'Tiramisu', qty: 2, cours: 'Dessert', station: 'Desserts' },
    ],
  },
  {
    id: 3, table: 'T-07', createdMinAgo: 11, status: 'attente', server: 'Sophie',
    items: [
      { id: 7, name: 'Velouté butternut', qty: 3, cours: 'Entrée', station: 'Chaud' },
      { id: 8, name: 'Magret canard', qty: 3, cours: 'Plat', station: 'Chaud', note: 'Cuisson rosé' },
    ],
  },
  {
    id: 4, table: 'T-02', createdMinAgo: 7, status: 'preparation', server: 'Laura',
    items: [
      { id: 9, name: 'Carpaccio saumon', qty: 2, cours: 'Entrée', station: 'Froid' },
      { id: 10, name: 'Pasta truffe', qty: 2, cours: 'Plat', station: 'Chaud' },
      { id: 11, name: 'Café gourmand', qty: 2, cours: 'Dessert', station: 'Desserts' },
    ],
  },
  {
    id: 5, table: 'T-15', createdMinAgo: 16, status: 'preparation', server: 'Karim',
    items: [
      { id: 12, name: 'Soupe du jour', qty: 1, cours: 'Entrée', station: 'Chaud' },
      { id: 13, name: 'Entrecôte 300g', qty: 1, cours: 'Plat', station: 'Chaud', note: 'Saignant — priorité !' },
    ],
  },
  {
    id: 6, table: 'T-09', createdMinAgo: 1, status: 'pret', server: 'Sophie',
    items: [
      { id: 14, name: 'Fondant chocolat', qty: 2, cours: 'Dessert', station: 'Desserts' },
      { id: 15, name: 'Espresso', qty: 2, cours: 'Dessert', station: 'Boissons' },
    ],
  },
  {
    id: 7, table: 'T-01', createdMinAgo: 3, status: 'pret', server: 'Laura',
    items: [
      { id: 16, name: 'Bruschetta truffe', qty: 2, cours: 'Apéritif', station: 'Froid' },
    ],
  },
];

const timerColor = (min: number): { bg: string; text: string; pulse: boolean } => {
  if (min < 5) return { bg: '#ecfdf5', text: '#059669', pulse: false };
  if (min < 10) return { bg: '#fefce8', text: '#ca8a04', pulse: false };
  if (min < 15) return { bg: '#fff7ed', text: '#ea580c', pulse: false };
  return { bg: '#fef2f2', text: '#dc2626', pulse: true };
};

const statusMeta: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  attente: { label: 'En attente', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  preparation: { label: 'En préparation', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  pret: { label: 'Prêt', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
};

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<Filter>('Tout');
  const [station, setStation] = useState<Station>('Toutes');
  const [soundOn, setSoundOn] = useState(true);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const advance = (id: number) =>
    setOrders(os => os.map(o => {
      if (o.id !== id) return o;
      const next: Status = o.status === 'attente' ? 'preparation' : o.status === 'preparation' ? 'pret' : 'pret';
      return { ...o, status: next, createdMinAgo: next === 'pret' ? 0 : o.createdMinAgo };
    }));

  const recall = (table: string) => setToast(`Rappel envoyé à la salle — ${table}`);

  const filterOrder = (o: Order) => {
    const matchesFilter = filter === 'Tout' || o.items.some(i => {
      if (filter === 'Plat') return i.cours === 'Plat';
      return i.cours === filter;
    });
    const matchesStation = station === 'Toutes' || o.items.some(i => i.station === station);
    return matchesFilter && matchesStation;
  };

  const byStatus = useMemo(() => ({
    attente: orders.filter(o => o.status === 'attente').filter(filterOrder),
    preparation: orders.filter(o => o.status === 'preparation').filter(filterOrder),
    pret: orders.filter(o => o.status === 'pret').filter(filterOrder),
  }), [orders, filter, station]);

  const activeCount = orders.filter(o => o.status !== 'pret').length;
  const clock = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const renderCard = (o: Order) => {
    const visibleItems = o.items.filter(i => {
      const okFilter = filter === 'Tout' || (filter === 'Plat' ? i.cours === 'Plat' : i.cours === filter);
      const okStation = station === 'Toutes' || i.station === station;
      return okFilter && okStation;
    });
    const grouped = visibleItems.reduce<Record<Cours, OrderItem[]>>((acc, i) => {
      (acc[i.cours] ||= []).push(i); return acc;
    }, {} as Record<Cours, OrderItem[]>);
    const tc = timerColor(o.createdMinAgo);
    const meta = statusMeta[o.status];
    return (
      <motion.div
        key={o.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#ffffff', border: `1px solid ${meta.border}`, borderRadius: 14, padding: 14, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{o.table}</div>
          <motion.div
            animate={tc.pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={tc.pulse ? { repeat: Infinity, duration: 1.1 } : { duration: 0 }}
            style={{ background: tc.bg, color: tc.text, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: `1px solid ${tc.text}22` }}
          >
            {o.createdMinAgo} min
          </motion.div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Serveur : {o.server}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {(Object.keys(grouped) as Cours[]).map(c => (
            <div key={c}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{c}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grouped[c].map(i => (
                  <div key={i.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#0f172a' }}>
                      <span style={{ fontWeight: 600 }}>{i.name}</span>
                      <span style={{ color: '#475569', fontWeight: 700 }}>x{i.qty}</span>
                    </div>
                    {i.note && <div style={{ fontSize: 12, color: '#dc2626', fontStyle: 'italic', marginTop: 2 }}>↳ {i.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {o.status === 'attente' && (
            <button onClick={() => advance(o.id)} style={{ flex: 1, background: '#ea580c', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Commencer</button>
          )}
          {o.status === 'preparation' && (
            <button onClick={() => advance(o.id)} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Prêt !</button>
          )}
          {o.status === 'pret' && (
            <button onClick={() => recall(o.table)} style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Rappel salle</button>
          )}
          {o.status !== 'pret' && (
            <button onClick={() => recall(o.table)} style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Rappel</button>
          )}
        </div>
      </motion.div>
    );
  };

  const column = (status: Status) => {
    const meta = statusMeta[status];
    const list = byStatus[status];
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: meta.color }}>{meta.label}</span>
          </div>
          <span style={{ background: '#fff', color: meta.color, border: `1px solid ${meta.border}`, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{list.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {list.map(renderCard)}
          </AnimatePresence>
          {list.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 18, border: '1px dashed #e5e7eb', borderRadius: 10 }}>Aucune commande</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', padding: 24, color: '#0f172a', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Cuisine — Temps réel</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Affichage cuisinier intégré à l'application web.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{clock}</div>
          <button
            onClick={() => setSoundOn(s => !s)}
            style={{ background: soundOn ? '#ecfdf5' : '#fff', color: soundOn ? '#059669' : '#64748b', border: `1px solid ${soundOn ? '#a7f3d0' : '#e5e7eb'}`, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {soundOn ? '🔔 Son activé' : '🔕 Son coupé'}
          </button>
          <div style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
            {activeCount} commandes actives
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Cours :</span>
          {(['Tout', 'Apéritif', 'Plat', 'Dessert'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ background: filter === f ? '#0f172a' : '#fff', color: filter === f ? '#fff' : '#334155', border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: '#e5e7eb' }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Station :</span>
          {(['Toutes', 'Chaud', 'Froid', 'Boissons', 'Desserts'] as Station[]).map(s => (
            <button
              key={s}
              onClick={() => setStation(s)}
              style={{ background: station === s ? '#4f46e5' : '#fff', color: station === s ? '#fff' : '#334155', border: `1px solid ${station === s ? '#4f46e5' : '#cbd5e1'}`, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {column('attente')}
        {column('preparation')}
        {column('pret')}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', marginTop: 4 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Temps moyen</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>8 min</div>
        </div>
        <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Commandes / h</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>12</div>
        </div>
        <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Retards</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>1</div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(15,23,42,0.25)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
