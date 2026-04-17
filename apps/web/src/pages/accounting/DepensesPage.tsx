import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

type Category = 'FOOD_COST' | 'STAFF' | 'UTILITIES' | 'SUPPLIES' | 'OTHER';
type Statut = 'Payé' | 'En attente' | 'En retard';

interface Expense {
  id: string;
  date: string;
  fournisseur: string;
  categorie: Category;
  description: string;
  ht: number;
  tvaRate: number;
  paiement: string;
  recurrente: boolean;
  recu: boolean;
  statut: Statut;
}

const palette = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  subtle: '#64748b',
  muted: '#94a3b8',
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const categoryMeta: Record<Category, { emoji: string; label: string; color: string; bg: string }> = {
  FOOD_COST: { emoji: '🍅', label: 'Nourriture', color: '#047857', bg: '#d1fae5' },
  STAFF:     { emoji: '👥', label: 'Personnel', color: '#1d4ed8', bg: '#dbeafe' },
  UTILITIES: { emoji: '💡', label: 'Énergie', color: '#9a3412', bg: '#ffedd5' },
  SUPPLIES:  { emoji: '📦', label: 'Fournitures', color: '#6d28d9', bg: '#ede9fe' },
  OTHER:     { emoji: '📋', label: 'Autre', color: '#475569', bg: '#f1f5f9' },
};

const mockExpenses: Expense[] = [
  { id: '1', date: '2026-04-15', fournisseur: 'Boucherie Centrale', categorie: 'FOOD_COST', description: 'Viande du week-end', ht: 420, tvaRate: 8, paiement: 'Virement', recurrente: false, recu: true, statut: 'Payé' },
  { id: '2', date: '2026-04-14', fournisseur: 'Enovos', categorie: 'UTILITIES', description: 'Électricité mars', ht: 380, tvaRate: 17, paiement: 'Prélèvement', recurrente: true, recu: true, statut: 'Payé' },
  { id: '3', date: '2026-04-13', fournisseur: 'Primeur du Marché', categorie: 'FOOD_COST', description: 'Fruits & légumes', ht: 180, tvaRate: 3, paiement: 'Espèces', recurrente: false, recu: true, statut: 'Payé' },
  { id: '4', date: '2026-04-12', fournisseur: 'Adecco', categorie: 'STAFF', description: 'Intérim week-end', ht: 640, tvaRate: 17, paiement: 'Virement', recurrente: false, recu: true, statut: 'En attente' },
  { id: '5', date: '2026-04-11', fournisseur: 'Metro Cash & Carry', categorie: 'FOOD_COST', description: 'Achats hebdomadaires', ht: 890, tvaRate: 8, paiement: 'Carte', recurrente: false, recu: true, statut: 'Payé' },
  { id: '6', date: '2026-04-10', fournisseur: 'Post Luxembourg', categorie: 'UTILITIES', description: 'Internet + téléphone', ht: 95, tvaRate: 17, paiement: 'Prélèvement', recurrente: true, recu: true, statut: 'Payé' },
  { id: '7', date: '2026-04-09', fournisseur: 'Papier & Co', categorie: 'SUPPLIES', description: 'Serviettes, nappes', ht: 145, tvaRate: 17, paiement: 'Carte', recurrente: false, recu: false, statut: 'En attente' },
  { id: '8', date: '2026-04-08', fournisseur: 'SudGaz', categorie: 'UTILITIES', description: 'Gaz avril', ht: 210, tvaRate: 8, paiement: 'Prélèvement', recurrente: true, recu: true, statut: 'Payé' },
  { id: '9', date: '2026-04-06', fournisseur: 'Cave du Sommelier', categorie: 'FOOD_COST', description: 'Vins & spiritueux', ht: 410, tvaRate: 17, paiement: 'Virement', recurrente: false, recu: true, statut: 'Payé' },
  { id: '10', date: '2026-04-05', fournisseur: 'CleanPro', categorie: 'SUPPLIES', description: 'Produits entretien', ht: 78, tvaRate: 17, paiement: 'Carte', recurrente: false, recu: true, statut: 'Payé' },
  { id: '11', date: '2026-04-03', fournisseur: 'Assurance Foyer', categorie: 'OTHER', description: 'Assurance trimestrielle', ht: 310, tvaRate: 17, paiement: 'Virement', recurrente: true, recu: true, statut: 'En retard' },
  { id: '12', date: '2026-04-02', fournisseur: 'Fromagerie Kessler', categorie: 'FOOD_COST', description: 'Fromages', ht: 230, tvaRate: 3, paiement: 'Carte', recurrente: false, recu: true, statut: 'Payé' },
  { id: '13', date: '2026-04-01', fournisseur: 'CCSS', categorie: 'STAFF', description: 'Cotisations sociales', ht: 1240, tvaRate: 0, paiement: 'Virement', recurrente: true, recu: false, statut: 'En attente' },
  { id: '14', date: '2026-03-29', fournisseur: 'Repar-Frigo', categorie: 'OTHER', description: 'Réparation chambre froide', ht: 380, tvaRate: 17, paiement: 'Virement', recurrente: false, recu: true, statut: 'En retard' },
  { id: '15', date: '2026-03-28', fournisseur: 'Poissonnerie Nord', categorie: 'FOOD_COST', description: 'Poissons frais', ht: 195, tvaRate: 3, paiement: 'Espèces', recurrente: false, recu: false, statut: 'En attente' },
];

const suppliers = ['Boucherie Centrale', 'Enovos', 'Primeur du Marché', 'Adecco', 'Metro Cash & Carry', 'Post Luxembourg', 'Papier & Co', 'SudGaz', 'Cave du Sommelier', 'CleanPro', 'CCSS', 'Autre…'];

const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];
const evolution = [
  { mois: 'Nov', total: 3820 },
  { mois: 'Déc', total: 4150 },
  { mois: 'Jan', total: 3940 },
  { mois: 'Fév', total: 4080 },
  { mois: 'Mar', total: 4310 },
  { mois: 'Avr', total: 4230 },
];

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', ...style }}>{children}</div>
);

export default function DepensesPage() {
  const [expenses, setExpenses] = useState(mockExpenses);
  const [filter, setFilter] = useState<Category | 'ALL'>('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ fournisseur: '', date: '2026-04-17', categorie: 'FOOD_COST' as Category, description: '', ht: 0, tvaRate: 17, paiement: 'Virement', recurrente: false });

  const filtered = useMemo(() => filter === 'ALL' ? expenses : expenses.filter(e => e.categorie === filter), [expenses, filter]);
  const countByCat = useMemo(() => {
    const c: Record<Category, number> = { FOOD_COST: 0, STAFF: 0, UTILITIES: 0, SUPPLIES: 0, OTHER: 0 };
    expenses.forEach(e => c[e.categorie]++);
    return c;
  }, [expenses]);

  const pieData = useMemo(() =>
    (Object.keys(categoryMeta) as Category[]).map(c => ({
      name: categoryMeta[c].label,
      value: expenses.filter(e => e.categorie === c).reduce((s, e) => s + e.ht, 0),
    })).filter(x => x.value > 0), [expenses]);

  const topSuppliers = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => map.set(e.fournisseur, (map.get(e.fournisseur) || 0) + e.ht * (1 + e.tvaRate / 100)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);

  const onReceiptUpload = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setReceiptPreview(r.result as string);
      setForm(f => ({ ...f, fournisseur: 'Metro Cash & Carry', ht: 248.50, description: 'Achat détecté OCR' }));
    };
    r.readAsDataURL(file);
  };

  const addExpense = () => {
    const id = String(Date.now());
    setExpenses(prev => [{ id, date: form.date, fournisseur: form.fournisseur, categorie: form.categorie, description: form.description, ht: form.ht, tvaRate: form.tvaRate, paiement: form.paiement, recurrente: form.recurrente, recu: !!receiptPreview, statut: 'En attente' }, ...prev]);
    setShowAdd(false);
    setReceiptPreview(null);
    setForm({ fournisseur: '', date: '2026-04-17', categorie: 'FOOD_COST', description: '', ht: 0, tvaRate: 17, paiement: 'Virement', recurrente: false });
  };

  const stats = [
    { label: 'Ce mois', value: '4 230€', color: palette.primary, hint: 'Avril 2026' },
    { label: 'Catégorie principale', value: 'Nourriture', color: categoryMeta.FOOD_COST.color, hint: '1 890€' },
    { label: 'En attente', value: '5', color: palette.warning, hint: 'À valider' },
    { label: 'En retard', value: '2', color: palette.danger, hint: 'Action requise' },
  ];

  const statutColor = (s: Statut) => s === 'Payé' ? { bg: '#d1fae5', fg: '#047857' } : s === 'En attente' ? { bg: '#fef3c7', fg: '#92400e' } : { bg: '#fee2e2', fg: '#991b1b' };

  return (
    <div style={{ background: palette.bg, minHeight: '100vh', padding: 32, color: palette.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Dépenses</h1>
          <p style={{ margin: '6px 0 0', color: palette.subtle }}>Suivi des dépenses, factures fournisseurs et import bancaire</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowImport(true)} style={{ padding: '10px 16px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text }}>
            Importer un relevé
          </button>
          <button onClick={() => alert('Export CSV comptable')} style={{ padding: '10px 16px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text }}>
            Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} style={{ padding: '10px 18px', background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Ajouter une dépense
          </button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <div style={{ color: palette.subtle, fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: palette.muted }}>{s.hint}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('ALL')} style={{ padding: '8px 14px', background: filter === 'ALL' ? palette.text : '#fff', color: filter === 'ALL' ? '#fff' : palette.text, border: `1px solid ${palette.border}`, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Toutes <span style={{ opacity: 0.6, marginLeft: 4 }}>{expenses.length}</span>
        </button>
        {(Object.keys(categoryMeta) as Category[]).map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: '8px 14px', background: filter === c ? categoryMeta[c].color : '#fff', color: filter === c ? '#fff' : palette.text, border: `1px solid ${palette.border}`, borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{categoryMeta[c].emoji}</span>
            <span>{categoryMeta[c].label}</span>
            <span style={{ opacity: 0.6, marginLeft: 4 }}>{countByCat[c]}</span>
          </button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Date', 'Fournisseur', 'Catégorie', 'Description', 'HT', 'TVA', 'TTC', 'Reçu', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: palette.subtle, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const ttc = e.ht * (1 + e.tvaRate / 100);
                const tva = ttc - e.ht;
                const c = statutColor(e.statut);
                return (
                  <tr key={e.id} style={{ borderTop: `1px solid ${palette.border}` }}>
                    <td style={{ padding: '12px 14px', color: palette.subtle }}>{e.date}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{e.fournisseur} {e.recurrente && <span title="Récurrente" style={{ marginLeft: 4 }}>🔁</span>}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: categoryMeta[e.categorie].bg, color: categoryMeta[e.categorie].color, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                        {categoryMeta[e.categorie].emoji} {categoryMeta[e.categorie].label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: palette.subtle }}>{e.description}</td>
                    <td style={{ padding: '12px 14px' }}>{e.ht.toLocaleString('fr-FR')}€</td>
                    <td style={{ padding: '12px 14px', color: palette.subtle }}>{tva.toFixed(2)}€ ({e.tvaRate}%)</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{ttc.toFixed(2)}€</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{e.recu ? '📎' : '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: c.bg, color: c.fg, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{e.statut}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ background: 'none', border: 'none', color: palette.primary, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Voir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Répartition par catégorie</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')}€`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Évolution 6 mois</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.border} />
                <XAxis dataKey="mois" stroke={palette.subtle} fontSize={12} />
                <YAxis stroke={palette.subtle} fontSize={12} />
                <Tooltip formatter={(v: number) => `${v}€`} />
                <Line type="monotone" dataKey="total" stroke={palette.primary} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Top 5 fournisseurs</h3>
          {topSuppliers.map(([name, val], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? `1px solid ${palette.border}` : 'none', gap: 12 }}>
              <div style={{ width: 24, height: 24, background: pieColors[i], color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 13, color: palette.primary, fontWeight: 600 }}>{val.toFixed(0)}€</div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Galerie des reçus</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {expenses.filter(e => e.recu).slice(0, 12).map(e => (
            <div key={e.id} style={{ aspectRatio: '3/4', background: '#f1f5f9', border: `1px solid ${palette.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: palette.subtle, cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
              <div style={{ fontWeight: 600, color: palette.text, textAlign: 'center', padding: '0 6px' }}>{e.fournisseur.slice(0, 16)}</div>
              <div>{e.date}</div>
            </div>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 600 }}>Ajouter une dépense</h2>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Facture / reçu (OCR)</div>
                {receiptPreview ? (
                  <div style={{ background: '#f1f5f9', border: `1px dashed ${palette.border}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: palette.success, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>✓ OCR terminé — champs pré-remplis</div>
                    <button onClick={() => setReceiptPreview(null)} style={{ fontSize: 12, color: palette.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remplacer</button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${palette.border}`, borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer', color: palette.subtle }}>
                    <div style={{ fontSize: 30 }}>📤</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>Cliquez pour uploader — OCR automatique</div>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => onReceiptUpload(e.target.files?.[0])} />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Fournisseur</label>
                  <select value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, color: palette.text, background: '#fff' }}>
                    <option value="">Choisir…</option>
                    {suppliers.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, color: palette.text }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Catégorie</label>
                  <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value as Category }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: palette.text }}>
                    {(Object.keys(categoryMeta) as Category[]).map(c => <option key={c} value={c}>{categoryMeta[c].emoji} {categoryMeta[c].label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Paiement</label>
                  <select value={form.paiement} onChange={e => setForm(f => ({ ...f, paiement: e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: palette.text }}>
                    {['Espèces', 'Virement', 'Carte', 'Prélèvement'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Montant HT</label>
                  <input type="number" value={form.ht} onChange={e => setForm(f => ({ ...f, ht: +e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, color: palette.text }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>TVA (%)</label>
                  <select value={form.tvaRate} onChange={e => setForm(f => ({ ...f, tvaRate: +e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: palette.text }}>
                    {[0, 3, 8, 14, 17].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: palette.subtle, fontWeight: 600 }}>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', padding: 10, marginTop: 4, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, color: palette.text }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.recurrente} onChange={e => setForm(f => ({ ...f, recurrente: e.target.checked }))} />
                Dépense récurrente (mensuelle / trimestrielle)
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAdd(false)} style={{ padding: '10px 18px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: palette.text }}>Annuler</button>
                <button onClick={addExpense} style={{ padding: '10px 18px', background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImport(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 600 }}>Importer un relevé bancaire</h2>
              <p style={{ color: palette.subtle, fontSize: 13, margin: '0 0 16px' }}>Format CSV. Les transactions seront automatiquement rapprochées de vos dépenses.</p>
              <div style={{ border: `2px dashed ${palette.border}`, borderRadius: 10, padding: 30, textAlign: 'center', color: palette.subtle, cursor: 'pointer' }}>
                <div style={{ fontSize: 34 }}>🏦</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Déposer un fichier CSV (BGL, BIL, Spuerkeess…)</div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setShowImport(false)} style={{ padding: '10px 18px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: palette.text }}>Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
