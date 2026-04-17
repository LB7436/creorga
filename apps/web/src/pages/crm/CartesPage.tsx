import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type CardStatus = 'active' | 'used' | 'expired' | 'suspect';
type DesignKey = 'classic' | 'modern' | 'luxembourg' | 'birthday' | 'christmas';
type Tab = 'cards' | 'studio' | 'analytics' | 'marketplace' | 'corporate' | 'fraud';

interface Design {
  key: DesignKey;
  name: string;
  gradient: string;
  accent: string;
  label: string;
}

const designs: Design[] = [
  { key: 'classic', name: 'Classic Gold', gradient: 'linear-gradient(135deg,#c9a46b 0%,#f3d98b 50%,#a07c3a 100%)', accent: '#3f2f12', label: 'Gold' },
  { key: 'modern', name: 'Modern Blue', gradient: 'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#3b82f6 100%)', accent: '#fff', label: 'Modern' },
  { key: 'luxembourg', name: 'Luxembourg Red', gradient: 'linear-gradient(135deg,#ef4444 0%,#b91c1c 60%,#7f1d1d 100%)', accent: '#fff', label: 'Lëtzebuerg' },
  { key: 'birthday', name: 'Birthday Pink', gradient: 'linear-gradient(135deg,#f472b6 0%,#ec4899 50%,#be185d 100%)', accent: '#fff', label: 'Anniversaire' },
  { key: 'christmas', name: 'Christmas Green', gradient: 'linear-gradient(135deg,#065f46 0%,#059669 50%,#dc2626 100%)', accent: '#fff', label: 'Noël' },
];

interface GiftCard {
  id: number;
  code: string;
  initial: number;
  remaining: number;
  expiry: string;
  status: CardStatus;
  design: DesignKey;
  recipient?: string;
  reloadable?: boolean;
  multiSite?: boolean;
  daysToRedeem?: number;
  flag?: string;
}

const genCode = (seed: number) => {
  const part = (s: number) => ((s * 9301 + 49297) % 233280).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return `GIFT-${part(seed + 17)}-${part(seed + 131)}`;
};

const initialCards: GiftCard[] = [
  { id: 1, code: genCode(1), initial: 50, remaining: 50, expiry: '15 avr. 2027', status: 'active', design: 'classic', recipient: 'Marie Schmit', reloadable: true },
  { id: 2, code: genCode(2), initial: 100, remaining: 62.5, expiry: '20 mars 2027', status: 'active', design: 'modern', recipient: 'Luc Müller', multiSite: true, daysToRedeem: 12 },
  { id: 3, code: genCode(3), initial: 25, remaining: 0, expiry: '10 fév. 2027', status: 'used', design: 'birthday', recipient: 'Sophie Weber', daysToRedeem: 4 },
  { id: 4, code: genCode(4), initial: 200, remaining: 145, expiry: '01 déc. 2026', status: 'active', design: 'christmas', recipient: 'Pierre Hoffmann', daysToRedeem: 22 },
  { id: 5, code: genCode(5), initial: 50, remaining: 50, expiry: '15 jan. 2027', status: 'active', design: 'luxembourg', recipient: 'Claire Reuter' },
  { id: 6, code: genCode(6), initial: 25, remaining: 12, expiry: '05 mai 2027', status: 'active', design: 'classic', daysToRedeem: 9 },
  { id: 7, code: genCode(7), initial: 100, remaining: 0, expiry: '12 mars 2026', status: 'expired', design: 'modern' },
  { id: 8, code: genCode(8), initial: 75, remaining: 75, expiry: '30 juin 2027', status: 'active', design: 'birthday', recipient: 'Anne Faber', reloadable: true },
  { id: 9, code: genCode(9), initial: 50, remaining: 18.4, expiry: '22 avr. 2027', status: 'suspect', design: 'classic', flag: '7 utilisations en 2h', daysToRedeem: 1 },
  { id: 10, code: genCode(10), initial: 150, remaining: 150, expiry: '01 nov. 2027', status: 'active', design: 'luxembourg', recipient: 'Nicolas Thill', multiSite: true },
  { id: 11, code: genCode(11), initial: 10, remaining: 0, expiry: '18 fév. 2026', status: 'expired', design: 'christmas' },
  { id: 12, code: genCode(12), initial: 200, remaining: 120, expiry: '15 sept. 2027', status: 'active', design: 'modern', recipient: 'Isabelle Wagner', daysToRedeem: 18 },
];

const statsData = [
  { label: 'Cartes actives', value: '34', gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  { label: 'Valeur en circulation', value: '2 150 €', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
  { label: 'Utilisées ce mois', value: '8', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  { label: "Taux d'utilisation", value: '42%', gradient: 'linear-gradient(135deg,#ec4899,#f472b6)' },
];

const redemptionTimeline = [
  { jour: 'J+1', redemptions: 3 },
  { jour: 'J+7', redemptions: 9 },
  { jour: 'J+14', redemptions: 14 },
  { jour: 'J+30', redemptions: 22 },
  { jour: 'J+60', redemptions: 28 },
  { jour: 'J+90', redemptions: 31 },
];

const ticketSizeData = [
  { plage: '0-25 €', cartes: 18 },
  { plage: '25-50 €', cartes: 24 },
  { plage: '50-100 €', cartes: 16 },
  { plage: '100-200 €', cartes: 8 },
  { plage: '200+ €', cartes: 3 },
];

const designDistribution = [
  { name: 'Classic', value: 38, color: '#c9a46b' },
  { name: 'Modern', value: 24, color: '#3b82f6' },
  { name: 'Luxembourg', value: 12, color: '#ef4444' },
  { name: 'Anniversaire', value: 18, color: '#ec4899' },
  { name: 'Noël', value: 8, color: '#059669' },
];

const marketplaceCards = [
  { id: 'mp1', title: 'Carte Gourmande 50 €', price: 50, sold: 124, design: 'classic' as DesignKey, desc: 'Dîner pour 2, entrée+plat+dessert' },
  { id: 'mp2', title: 'Expérience Chef 100 €', price: 100, sold: 87, design: 'modern' as DesignKey, desc: 'Menu dégustation signature 5 services' },
  { id: 'mp3', title: 'Brunch Dominical 35 €', price: 35, sold: 210, design: 'birthday' as DesignKey, desc: 'Brunch buffet + cocktail' },
  { id: 'mp4', title: 'Saint-Valentin 150 €', price: 150, sold: 54, design: 'luxembourg' as DesignKey, desc: 'Menu romantique + coupe de champagne' },
];

const fraudAlerts = [
  { id: 'f1', code: 'GIFT-A1B2-C3D4', level: 'high', msg: '7 utilisations en 2h sur 3 sites différents', time: 'il y a 12 min' },
  { id: 'f2', code: 'GIFT-E5F6-G7H8', level: 'medium', msg: 'Solde utilisé à 95% en une seule transaction', time: 'il y a 2 h' },
  { id: 'f3', code: 'GIFT-I9J0-K1L2', level: 'low', msg: 'Tentative de lecture après expiration', time: 'hier' },
];

const DesignPreview = ({ design, code, value, recipient, message, logo, photo }: { design: Design; code: string; value: number; recipient?: string; message?: string; logo?: string; photo?: string }) => (
  <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: 16, background: design.gradient, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: design.accent, boxShadow: '0 10px 30px rgba(15,23,42,0.2)', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
    <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
      <div>
        <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1.4, fontWeight: 700 }}>{logo || 'CREORGA'}</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>CARTE CADEAU</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {photo && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '1.5px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{photo}</div>}
        <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>{design.label}</div>
      </div>
    </div>
    <div style={{ zIndex: 1 }}>
      {recipient && <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Pour {recipient}</div>}
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{value.toFixed(0)} €</div>
      {message && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, fontStyle: 'italic' }}>"{message.slice(0, 40)}{message.length > 40 ? '...' : ''}"</div>}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
      <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: 1.2, opacity: 0.95 }}>{code}</span>
      <div style={{ width: 32, height: 32, borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>◫</div>
    </div>
  </div>
);

export default function CartesPage() {
  const [cards] = useState<GiftCard[]>(initialCards);
  const [tab, setTab] = useState<Tab>('cards');
  const [statusFilter, setStatusFilter] = useState<'all' | CardStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [detail, setDetail] = useState<GiftCard | null>(null);

  const [cValue, setCValue] = useState(50);
  const [cRecipient, setCRecipient] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cMessage, setCMessage] = useState('');
  const [cDesign, setCDesign] = useState<DesignKey>('classic');
  const [cDelivery, setCDelivery] = useState<'physical' | 'email' | 'sms'>('email');
  const [cReloadable, setCReloadable] = useState(false);
  const [cMultiSite, setCMultiSite] = useState(false);
  const [cPhoto, setCPhoto] = useState('');

  const [rCode, setRCode] = useState('');
  const [rAmount, setRAmount] = useState('');
  const foundCard = useMemo(() => cards.find((c) => c.code === rCode.trim().toUpperCase()), [cards, rCode]);

  const [bQuantity, setBQuantity] = useState(50);
  const [bValue, setBValue] = useState(25);
  const [bDesign, setBDesign] = useState<DesignKey>('classic');
  const [bCompany, setBCompany] = useState('');
  const [bLogo, setBLogo] = useState('');
  const [bExpRule, setBExpRule] = useState<'12m' | '24m' | 'none'>('12m');

  const [tFrom1, setTFrom1] = useState('');
  const [tFrom2, setTFrom2] = useState('');

  const filteredCards = useMemo(() => {
    if (statusFilter === 'all') return cards;
    return cards.filter((c) => c.status === statusFilter);
  }, [cards, statusFilter]);

  const selectedDesign = designs.find((d) => d.key === cDesign)!;
  const previewCode = genCode(999);

  const statusBadge = (s: CardStatus) => {
    const map = {
      active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
      used: { bg: '#e0e7ff', color: '#3730a3', label: 'Utilisée' },
      expired: { bg: '#fee2e2', color: '#991b1b', label: 'Expirée' },
      suspect: { bg: '#ffedd5', color: '#9a3412', label: 'Suspecte' },
    };
    const m = map[s];
    return <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>{m.label}</span>;
  };

  const totalFromPair = (() => {
    const c1 = cards.find(c => c.code === tFrom1.trim().toUpperCase());
    const c2 = cards.find(c => c.code === tFrom2.trim().toUpperCase());
    return (c1?.remaining || 0) + (c2?.remaining || 0);
  })();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cards', label: 'Cartes' },
    { key: 'studio', label: 'Studio design' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'corporate', label: 'Entreprise B2B' },
    { key: 'fraud', label: 'Fraude' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, background: '#f8fafc', minHeight: '100vh' }}>
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Cartes cadeaux</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>Créez, distribuez, analysez et sécurisez vos cartes cadeaux</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setScannerOpen(true)} style={{ padding: '11px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Scanner QR</button>
          <button onClick={() => setTransferOpen(true)} style={{ padding: '11px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fusionner</button>
          <button onClick={() => setRedeemOpen(true)} style={{ padding: '11px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Utiliser une carte</button>
          <button onClick={() => setBatchOpen(true)} style={{ padding: '11px 16px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer un lot</button>
          <button onClick={() => setCreateOpen(true)} style={{ padding: '11px 20px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,24,93,0.35)' }}>+ Créer une carte</button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {statsData.map((s) => (
          <motion.div key={s.label} variants={item} style={{ background: s.gradient, borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{s.value}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#be185d' : 'transparent', color: tab === t.key ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </motion.div>

      {tab === 'cards' && (
        <>
          <motion.div variants={item} style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, width: 'fit-content' }}>
            {([
              ['all', 'Toutes'],
              ['active', 'Actives'],
              ['used', 'Utilisées'],
              ['expired', 'Expirées'],
              ['suspect', 'Suspectes'],
            ] as [typeof statusFilter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setStatusFilter(k)} style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, background: statusFilter === k ? '#be185d' : 'transparent', color: statusFilter === k ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{l}</button>
            ))}
          </motion.div>

          <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {filteredCards.map((c) => {
              const d = designs.find((x) => x.key === c.design)!;
              const pct = c.initial > 0 ? (c.remaining / c.initial) * 100 : 0;
              return (
                <motion.div key={c.id} whileHover={{ y: -4 }} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ opacity: c.status === 'expired' ? 0.55 : 1 }}>
                    <DesignPreview design={d} code={c.code} value={c.initial} recipient={c.recipient} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#475569' }}>{c.code}</span>
                    {statusBadge(c.status)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      <span>Solde</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{c.remaining.toFixed(2)} € / {c.initial}€</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c.status === 'expired' ? '#94a3b8' : 'linear-gradient(90deg,#be185d,#ec4899)', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.reloadable && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#ecfdf5', color: '#047857' }}>Rechargeable</span>}
                    {c.multiSite && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8' }}>Multi-sites</span>}
                    {c.flag && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#fef2f2', color: '#b91c1c' }}>Alerte</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Expire : {c.expiry}</span>
                    <button onClick={() => setDetail(c)} style={{ padding: '6px 12px', background: 'transparent', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir détails</button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {tab === 'studio' && (
        <motion.div variants={item} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Studio de design physique</h3>
            <p style={{ margin: '6px 0 22px 0', color: '#64748b', fontSize: 14 }}>Personnalisez votre carte physique imprimable</p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Artwork personnalisé</label>
              <div style={{ marginTop: 8, padding: 20, border: '2px dashed #cbd5e1', borderRadius: 12, textAlign: 'center', background: '#f8fafc', cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>↑</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Glissez-déposez une image (PNG, SVG)</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Format recommandé 1040×640 px, 300 DPI</div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Logo (3 lettres)</label>
              <input value={bLogo} onChange={e => setBLogo(e.target.value.slice(0, 10))} placeholder="CREORGA" style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Couleurs personnalisées</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Couleur 1</div>
                  <input type="color" defaultValue="#be185d" style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Couleur 2</div>
                  <input type="color" defaultValue="#ec4899" style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Accent texte</div>
                  <input type="color" defaultValue="#ffffff" style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Finition physique</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                {['Mate', 'Brillante', 'Dorure à chaud'].map(f => (
                  <button key={f} style={{ padding: '10px 0', background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{f}</button>
                ))}
              </div>
            </div>

            <button style={{ padding: '11px 20px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Commander 100 cartes physiques (180 €)</button>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Aperçu</div>
            <DesignPreview design={selectedDesign} code={previewCode} value={50} logo={bLogo || 'CREORGA'} recipient="Destinataire" message="Joyeux anniversaire" />
            <div style={{ marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 12, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
              <div><strong style={{ color: '#1e293b' }}>Format :</strong> 85 × 54 mm (CR80)</div>
              <div><strong style={{ color: '#1e293b' }}>Impression :</strong> Recto-verso</div>
              <div><strong style={{ color: '#1e293b' }}>Délai :</strong> 5-7 jours ouvrés</div>
              <div><strong style={{ color: '#1e293b' }}>Minimum :</strong> 50 cartes</div>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { label: 'Temps moyen avant utilisation', value: '14 jours' },
              { label: 'Ticket moyen payé en carte', value: '47.80 €' },
              { label: 'Taux de dépassement', value: '62%', sub: 'client dépense plus que la carte' },
              { label: 'Marge ajoutée', value: '+12 850 €', sub: 'vs paiement classique' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginTop: 6 }}>{k.value}</div>
                {k.sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Timeline des utilisations</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={redemptionTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="jour" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="redemptions" stroke="#be185d" strokeWidth={2.5} dot={{ r: 4 }} name="Utilisations cumulées" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Répartition par montant</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ticketSizeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="plage" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                  <Bar dataKey="cartes" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Popularité des designs</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={designDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {designDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Gestion d'expiration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Cartes expirent à J-30', count: 4, color: '#f59e0b' },
                  { label: 'Cartes expirent à J-7', count: 2, color: '#ef4444' },
                  { label: 'Rappels envoyés ce mois', count: 12, color: '#10b981' },
                  { label: 'Cartes réactivées après rappel', count: 7, color: '#3b82f6' },
                ].map(e => (
                  <div key={e.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>{e.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: e.color }}>{e.count}</span>
                  </div>
                ))}
                <button style={{ marginTop: 6, padding: '10px', background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Configurer les règles d'expiration</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'marketplace' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Marketplace cartes cadeaux</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Publiées sur votre site web et portail Creorga</p>
            </div>
            <button style={{ padding: '9px 18px', background: '#be185d', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle offre</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
            {marketplaceCards.map(mp => {
              const d = designs.find(x => x.key === mp.design)!;
              return (
                <div key={mp.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fafbff' }}>
                  <DesignPreview design={d} code={genCode(mp.sold)} value={mp.price} />
                  <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{mp.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{mp.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{mp.sold} vendues</span>
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>En ligne</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Performance du mois</div>
            <div style={{ fontSize: 13, color: '#15803d', marginTop: 4 }}>475 cartes vendues sur la marketplace · <strong>21 480 €</strong> de chiffre d'affaires additionnel</div>
          </div>
        </div>
      )}

      {tab === 'corporate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Programme B2B entreprises</h3>
            <p style={{ margin: '4px 0 20px', color: '#64748b', fontSize: 13 }}>Gestion des commandes en gros avec logo client et facturation TVA</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'ArcelorMittal Luxembourg', qty: 250, value: 50, date: '12 avr. 2026', status: 'Livré' },
                { name: 'Banque BIL', qty: 120, value: 100, date: '08 avr. 2026', status: 'En production' },
                { name: 'POST Luxembourg', qty: 500, value: 25, date: '05 avr. 2026', status: 'Livré' },
                { name: 'Cactus SA', qty: 80, value: 75, date: '02 avr. 2026', status: 'Livré' },
                { name: 'RTL Group', qty: 45, value: 150, date: '28 mars 2026', status: 'Facturé' },
              ].map(o => (
                <div key={o.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, padding: 14, background: '#f8fafc', borderRadius: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.date}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569' }}>{o.qty} cartes</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>{o.value} € / carte</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{(o.qty * o.value).toLocaleString('fr-FR')} €</div>
                  <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: o.status === 'Livré' ? '#dcfce7' : o.status === 'Facturé' ? '#e0e7ff' : '#fef3c7', color: o.status === 'Livré' ? '#166534' : o.status === 'Facturé' ? '#3730a3' : '#92400e' }}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Nouvelle commande B2B</h3>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={bCompany} onChange={e => setBCompany(e.target.value)} placeholder="Nom de l'entreprise" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
              <input placeholder="Numéro TVA (LU...)" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
              <input placeholder="Contact email" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="number" placeholder="Quantité" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
                <input type="number" placeholder="Valeur unitaire €" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
              </div>
              <div style={{ padding: 12, background: '#fdf2f8', borderRadius: 10, fontSize: 12, color: '#831843' }}>
                Remise automatique : 5% à partir de 50 cartes · 10% à partir de 200
              </div>
              <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Générer devis + facture</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'fraud' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Alertes de fraude</h3>
            <p style={{ margin: '4px 0 18px', color: '#64748b', fontSize: 13 }}>Patterns d'utilisation anormaux détectés automatiquement</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fraudAlerts.map(a => {
                const lv = a.level === 'high' ? { bg: '#fef2f2', bd: '#fecaca', c: '#991b1b', l: 'Critique' } : a.level === 'medium' ? { bg: '#fffbeb', bd: '#fde68a', c: '#92400e', l: 'Modérée' } : { bg: '#eff6ff', bd: '#bfdbfe', c: '#1d4ed8', l: 'Faible' };
                return (
                  <div key={a.id} style={{ padding: 14, background: lv.bg, border: `1px solid ${lv.bd}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: lv.c }}>{a.code}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: lv.c, color: '#fff' }}>{lv.l}</span>
                    </div>
                    <div style={{ fontSize: 13, color: lv.c }}>{a.msg}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{a.time}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ padding: '5px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Ignorer</button>
                        <button style={{ padding: '5px 10px', background: lv.c, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Bloquer</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Règles de détection</h3>
            <p style={{ margin: '4px 0 18px', color: '#64748b', fontSize: 13 }}>Paramétrez le niveau de sécurité</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { name: 'Utilisations multiples en moins d\'1h', active: true },
                { name: 'Utilisation depuis IP/pays différent', active: true },
                { name: 'Solde épuisé en transaction unique', active: true },
                { name: 'Tentatives avec code invalide répétées', active: true },
                { name: 'Utilisation en dehors heures restaurant', active: false },
              ].map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#f8fafc', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#1e293b' }}>{r.name}</span>
                  <div style={{ width: 42, height: 22, borderRadius: 11, background: r.active ? '#10b981' : '#cbd5e1', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, left: r.active ? 22 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>Score de sécurité : 92/100</div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>4 fraudes évitées ce mois · 380 € protégés</div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 22, padding: 28, width: 960, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Créer une carte cadeau</h3>
                <p style={{ margin: '6px 0 22px 0', color: '#64748b', fontSize: 14 }}>Personnalisez une carte à offrir</p>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeur</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6, marginTop: 8 }}>
                    {[10, 25, 50, 100, 200].map((v) => (
                      <button key={v} onClick={() => setCValue(v)} style={{ padding: '10px 0', background: cValue === v ? '#be185d' : '#f8fafc', color: cValue === v ? '#fff' : '#1e293b', border: cValue === v ? 'none' : '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{v}€</button>
                    ))}
                    <input type="number" value={cValue} onChange={(e) => setCValue(Number(e.target.value))} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', textAlign: 'center' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Destinataire (optionnel)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <input value={cRecipient} onChange={(e) => setCRecipient(e.target.value)} placeholder="Nom" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
                    <input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="Email" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none' }} />
                    <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="Téléphone" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', gridColumn: 'span 2' }} />
                    <input value={cPhoto} onChange={(e) => setCPhoto(e.target.value.slice(0, 2))} placeholder="Initiales (photo)" style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', gridColumn: 'span 2' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message personnel (pré-chargé sur la carte)</label>
                  <textarea value={cMessage} onChange={(e) => setCMessage(e.target.value)} placeholder="Bon anniversaire ! Profite bien..." rows={2} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Design</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 8 }}>
                    {designs.map((d) => (
                      <button key={d.key} onClick={() => setCDesign(d.key)} style={{ padding: 3, background: cDesign === d.key ? '#be185d' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                        <div style={{ height: 56, borderRadius: 8, background: d.gradient }} />
                        <div style={{ fontSize: 10, marginTop: 4, color: cDesign === d.key ? '#be185d' : '#475569', fontWeight: 600 }}>{d.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mode de livraison</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                    {([
                      ['physical', 'Physique'],
                      ['email', 'Email PDF'],
                      ['sms', 'SMS'],
                    ] as [typeof cDelivery, string][]).map(([k, l]) => (
                      <button key={k} onClick={() => setCDelivery(k)} style={{ padding: '10px 0', background: cDelivery === k ? '#fdf2f8' : '#f8fafc', color: cDelivery === k ? '#be185d' : '#475569', border: cDelivery === k ? '1px solid #fbcfe8' : '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18, display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                    <input type="checkbox" checked={cReloadable} onChange={e => setCReloadable(e.target.checked)} /> Carte rechargeable
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                    <input type="checkbox" checked={cMultiSite} onChange={e => setCMultiSite(e.target.checked)} /> Valide sur toutes les enseignes
                  </label>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Expiration & rappel J-30</label>
                  <input type="date" defaultValue="2027-04-16" style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>Un email de rappel sera envoyé 30 jours avant l'expiration</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setCreateOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={() => setCreateOpen(false)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer & envoyer</button>
                </div>
              </div>

              <div style={{ position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Aperçu en direct</div>
                <DesignPreview design={selectedDesign} code={previewCode} value={cValue} recipient={cRecipient || undefined} message={cMessage || undefined} photo={cPhoto || undefined} />
                <div style={{ marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 12, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  <div><strong style={{ color: '#1e293b' }}>Valeur :</strong> {cValue} €</div>
                  <div><strong style={{ color: '#1e293b' }}>Design :</strong> {selectedDesign.name}</div>
                  <div><strong style={{ color: '#1e293b' }}>Livraison :</strong> {cDelivery === 'physical' ? 'Physique' : cDelivery === 'email' ? 'Email PDF' : 'SMS'}</div>
                  {cReloadable && <div style={{ color: '#047857', fontWeight: 600 }}>Rechargeable activé</div>}
                  {cMultiSite && <div style={{ color: '#1d4ed8', fontWeight: 600 }}>Multi-sites activé</div>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redeem modal */}
      <AnimatePresence>
        {redeemOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRedeemOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 480 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Utiliser une carte cadeau</h3>
              <p style={{ margin: '6px 0 20px 0', color: '#64748b', fontSize: 14 }}>Saisissez le code à 10 caractères</p>
              <input value={rCode} onChange={(e) => setRCode(e.target.value)} placeholder="GIFT-XXXX-XXXX" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 16, color: '#1e293b', outline: 'none', fontFamily: 'monospace', letterSpacing: 1.5, boxSizing: 'border-box' }} />
              {rCode && (
                <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: foundCard ? '#ecfdf5' : '#fef2f2', border: foundCard ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
                  {foundCard ? (
                    <>
                      <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Carte valide</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#065f46' }}>Solde disponible : <strong>{foundCard.remaining.toFixed(2)} €</strong></div>
                      <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Expire le {foundCard.expiry}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>Code introuvable ou invalide</div>
                  )}
                </div>
              )}
              {foundCard && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Montant à déduire</label>
                  <input type="number" value={rAmount} onChange={(e) => setRAmount(e.target.value)} placeholder="0.00" max={foundCard.remaining} style={{ width: '100%', padding: '12px 14px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 600, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setRedeemOpen(false); setRCode(''); setRAmount(''); }} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
                <button disabled={!foundCard || !rAmount} onClick={() => { setRedeemOpen(false); setRCode(''); setRAmount(''); }} style={{ padding: '10px 22px', background: foundCard && rAmount ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: foundCard && rAmount ? 'pointer' : 'not-allowed' }}>Valider</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch modal */}
      <AnimatePresence>
        {batchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBatchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 560 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Assistant génération en lot</h3>
              <p style={{ margin: '6px 0 20px 0', color: '#64748b', fontSize: 14 }}>Générez 10 à 500 cartes pour cadeaux d'entreprise</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Quantité</label>
                  <input type="number" value={bQuantity} onChange={(e) => setBQuantity(Number(e.target.value))} min={10} max={500} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                  <input type="range" min={10} max={500} value={bQuantity} onChange={e => setBQuantity(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeur unitaire</label>
                  <input type="number" value={bValue} onChange={(e) => setBValue(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Logo entreprise</label>
                <input value={bLogo} onChange={e => setBLogo(e.target.value.slice(0, 12))} placeholder="Ex : ArcelorMittal" style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Règle d'expiration</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                  {([
                    ['12m', '12 mois'],
                    ['24m', '24 mois'],
                    ['none', 'Sans expiration'],
                  ] as [typeof bExpRule, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setBExpRule(k)} style={{ padding: '10px 0', background: bExpRule === k ? '#fdf2f8' : '#f8fafc', color: bExpRule === k ? '#be185d' : '#475569', border: bExpRule === k ? '1px solid #fbcfe8' : '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Design</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 8 }}>
                  {designs.map((d) => (
                    <button key={d.key} onClick={() => setBDesign(d.key)} style={{ padding: 3, background: bDesign === d.key ? '#be185d' : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                      <div style={{ height: 44, borderRadius: 8, background: d.gradient }} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, padding: 14, background: '#fdf2f8', borderRadius: 12, border: '1px solid #fbcfe8' }}>
                <div style={{ fontSize: 13, color: '#831843', fontWeight: 600 }}>Récapitulatif</div>
                <div style={{ fontSize: 13, color: '#9f1239', marginTop: 4 }}>{bQuantity} cartes × {bValue} € = <strong>{(bQuantity * bValue).toFixed(0)} €</strong> · Remise auto : -{bQuantity >= 200 ? 10 : bQuantity >= 50 ? 5 : 0}%</div>
                <div style={{ fontSize: 12, color: '#9f1239', marginTop: 2 }}>Total à facturer : <strong>{((bQuantity * bValue) * (bQuantity >= 200 ? 0.9 : bQuantity >= 50 ? 0.95 : 1)).toFixed(0)} € HT</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setBatchOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => setBatchOpen(false)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer le lot + CSV</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer modal */}
      <AnimatePresence>
        {transferOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTransferOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 500 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Fusionner plusieurs cartes</h3>
              <p style={{ margin: '6px 0 20px 0', color: '#64748b', fontSize: 14 }}>Combinez les soldes restants sur une seule nouvelle carte</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input value={tFrom1} onChange={e => setTFrom1(e.target.value)} placeholder="Code carte source 1" style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', fontFamily: 'monospace' }} />
                <input value={tFrom2} onChange={e => setTFrom2(e.target.value)} placeholder="Code carte source 2" style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', fontFamily: 'monospace' }} />
              </div>
              {totalFromPair > 0 && (
                <div style={{ marginTop: 14, padding: 14, background: '#fdf2f8', borderRadius: 12, fontSize: 13, color: '#831843' }}>
                  Nouvelle carte générée avec un solde combiné de <strong>{totalFromPair.toFixed(2)} €</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setTransferOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => setTransferOpen(false)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fusionner</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner modal */}
      <AnimatePresence>
        {scannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScannerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 440 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Scanner QR code</h3>
              <p style={{ margin: '6px 0 20px 0', color: '#64748b', fontSize: 14 }}>Pointez la caméra POS vers le QR code de la carte</p>
              <div style={{ position: 'relative', width: '100%', aspectRatio: 1, background: '#0f172a', borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Activation caméra...</div>
                <motion.div animate={{ y: [0, 220, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', left: 24, right: 24, height: 2, background: 'linear-gradient(90deg,transparent,#ec4899,transparent)' }} />
                <div style={{ position: 'absolute', inset: 24, border: '2px solid rgba(236,72,153,0.6)', borderRadius: 12 }} />
              </div>
              <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                Compatible avec lecteurs USB, caméras frontales iPad et terminaux Sunmi
              </div>
              <button onClick={() => setScannerOpen(false)} style={{ width: '100%', marginTop: 16, padding: '10px', background: '#be185d', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 440 }}>
              <DesignPreview design={designs.find((d) => d.key === detail.design)!} code={detail.code} value={detail.initial} recipient={detail.recipient} />
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div><div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Code</div><div style={{ color: '#1e293b', fontWeight: 600, fontFamily: 'monospace' }}>{detail.code}</div></div>
                <div><div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Statut</div><div>{statusBadge(detail.status)}</div></div>
                <div><div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Solde</div><div style={{ color: '#1e293b', fontWeight: 700 }}>{detail.remaining.toFixed(2)} € / {detail.initial} €</div></div>
                <div><div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Expire</div><div style={{ color: '#1e293b', fontWeight: 600 }}>{detail.expiry}</div></div>
                {detail.daysToRedeem !== undefined && <div><div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jours avant 1ère utilisation</div><div style={{ color: '#1e293b', fontWeight: 600 }}>{detail.daysToRedeem} j</div></div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button onClick={() => setDetail(null)} style={{ padding: '10px 22px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
                <button style={{ padding: '10px 22px', background: '#be185d', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Renvoyer par email</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
