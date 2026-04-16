import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type CardStatus = 'active' | 'used' | 'expired';
type DesignKey = 'classic' | 'modern' | 'luxembourg' | 'birthday' | 'christmas';

interface Design {
  key: DesignKey;
  name: string;
  gradient: string;
  accent: string;
  label: string;
}

const designs: Design[] = [
  { key: 'classic', name: 'Classic Gold', gradient: 'linear-gradient(135deg,#c9a46b 0%,#f3d98b 50%,#a07c3a 100%)', accent: '#3f2f12', label: '✨ Gold' },
  { key: 'modern', name: 'Modern Blue', gradient: 'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#3b82f6 100%)', accent: '#fff', label: '◆ Modern' },
  { key: 'luxembourg', name: 'Luxembourg Red', gradient: 'linear-gradient(135deg,#ef4444 0%,#b91c1c 60%,#7f1d1d 100%)', accent: '#fff', label: '★ Lëtzebuerg' },
  { key: 'birthday', name: 'Birthday Pink', gradient: 'linear-gradient(135deg,#f472b6 0%,#ec4899 50%,#be185d 100%)', accent: '#fff', label: '🎂 Anniversaire' },
  { key: 'christmas', name: 'Christmas Green', gradient: 'linear-gradient(135deg,#065f46 0%,#059669 50%,#dc2626 100%)', accent: '#fff', label: '🎄 Noël' },
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
}

const genCode = (seed: number) => {
  const part = (s: number) => ((s * 9301 + 49297) % 233280).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return `GIFT-${part(seed + 17)}-${part(seed + 131)}`;
};

const initialCards: GiftCard[] = [
  { id: 1, code: genCode(1), initial: 50, remaining: 50, expiry: '15 avr. 2027', status: 'active', design: 'classic', recipient: 'Marie Schmit' },
  { id: 2, code: genCode(2), initial: 100, remaining: 62.50, expiry: '20 mars 2027', status: 'active', design: 'modern', recipient: 'Luc Müller' },
  { id: 3, code: genCode(3), initial: 25, remaining: 0, expiry: '10 fév. 2027', status: 'used', design: 'birthday', recipient: 'Sophie Weber' },
  { id: 4, code: genCode(4), initial: 200, remaining: 145, expiry: '01 déc. 2026', status: 'active', design: 'christmas', recipient: 'Pierre Hoffmann' },
  { id: 5, code: genCode(5), initial: 50, remaining: 50, expiry: '15 jan. 2027', status: 'active', design: 'luxembourg', recipient: 'Claire Reuter' },
  { id: 6, code: genCode(6), initial: 25, remaining: 12, expiry: '05 mai 2027', status: 'active', design: 'classic' },
  { id: 7, code: genCode(7), initial: 100, remaining: 0, expiry: '12 mars 2026', status: 'expired', design: 'modern' },
  { id: 8, code: genCode(8), initial: 75, remaining: 75, expiry: '30 juin 2027', status: 'active', design: 'birthday', recipient: 'Anne Faber' },
  { id: 9, code: genCode(9), initial: 50, remaining: 18.40, expiry: '22 avr. 2027', status: 'active', design: 'classic' },
  { id: 10, code: genCode(10), initial: 150, remaining: 150, expiry: '01 nov. 2027', status: 'active', design: 'luxembourg', recipient: 'Nicolas Thill' },
  { id: 11, code: genCode(11), initial: 10, remaining: 0, expiry: '18 fév. 2026', status: 'expired', design: 'christmas' },
  { id: 12, code: genCode(12), initial: 200, remaining: 120, expiry: '15 sept. 2027', status: 'active', design: 'modern', recipient: 'Isabelle Wagner' },
];

const statsData = [
  { label: 'Cartes actives', value: '34', icon: '🎟️', gradient: 'linear-gradient(135deg,#6366f1,#818cf8)' },
  { label: 'Valeur en circulation', value: '2 150 €', icon: '💎', gradient: 'linear-gradient(135deg,#10b981,#34d399)' },
  { label: 'Utilisées ce mois', value: '8', icon: '✨', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
  { label: "Taux d'utilisation", value: '42%', icon: '📈', gradient: 'linear-gradient(135deg,#ec4899,#f472b6)' },
];

const DesignPreview = ({ design, code, value, recipient, message }: { design: Design; code: string; value: number; recipient?: string; message?: string }) => (
  <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: 16, background: design.gradient, padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: design.accent, boxShadow: '0 10px 30px rgba(15,23,42,0.2)', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
    <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
      <div>
        <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1.4, fontWeight: 700 }}>CREORGA</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>CARTE CADEAU</div>
      </div>
      <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>{design.label}</div>
    </div>
    <div style={{ zIndex: 1 }}>
      {recipient && <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Pour {recipient}</div>}
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{value.toFixed(0)} €</div>
      {message && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, fontStyle: 'italic' }}>"{message.slice(0, 40)}{message.length > 40 ? '...' : ''}"</div>}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
      <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: 1.2, opacity: 0.95 }}>{code}</span>
      <span style={{ fontSize: 10, opacity: 0.75 }}>exp. +12 mois</span>
    </div>
  </div>
);

export default function CartesPage() {
  const [cards] = useState<GiftCard[]>(initialCards);
  const [statusFilter, setStatusFilter] = useState<'all' | CardStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [detail, setDetail] = useState<GiftCard | null>(null);

  const [cValue, setCValue] = useState(50);
  const [cRecipient, setCRecipient] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cMessage, setCMessage] = useState('');
  const [cDesign, setCDesign] = useState<DesignKey>('classic');
  const [cDelivery, setCDelivery] = useState<'physical' | 'email' | 'sms'>('email');

  const [rCode, setRCode] = useState('');
  const [rAmount, setRAmount] = useState('');
  const foundCard = useMemo(() => cards.find((c) => c.code === rCode.trim().toUpperCase()), [cards, rCode]);

  const [bQuantity, setBQuantity] = useState(10);
  const [bValue, setBValue] = useState(25);
  const [bDesign, setBDesign] = useState<DesignKey>('classic');

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
    };
    const m = map[s];
    return <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>{m.label}</span>;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Cartes cadeaux</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>Créez, distribuez et suivez vos cartes cadeaux</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setRedeemOpen(true)} style={{ padding: '11px 18px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🎁 Utiliser une carte</button>
          <button onClick={() => setBatchOpen(true)} style={{ padding: '11px 18px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>📦 Générer un lot</button>
          <button onClick={() => setCreateOpen(true)} style={{ padding: '11px 20px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,24,93,0.35)' }}>+ Créer une carte cadeau</button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {statsData.map((s) => (
          <motion.div key={s.label} variants={item} style={{ background: s.gradient, borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{s.value}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {([
          ['all', 'Toutes'],
          ['active', 'Actives'],
          ['used', 'Utilisées'],
          ['expired', 'Expirées'],
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Expire : {c.expiry}</span>
                <button onClick={() => setDetail(c)} style={{ padding: '6px 12px', background: 'transparent', color: '#be185d', border: '1px solid #fbcfe8', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir détails</button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCreateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 22, padding: 28, width: 920, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28 }}>
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
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message personnel</label>
                  <textarea value={cMessage} onChange={(e) => setCMessage(e.target.value)} placeholder="Bon anniversaire ! Profite bien…" rows={2} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
                      ['physical', '🎁 Physique'],
                      ['email', '📧 Email PDF'],
                      ['sms', '📱 SMS'],
                    ] as [typeof cDelivery, string][]).map(([k, l]) => (
                      <button key={k} onClick={() => setCDelivery(k)} style={{ padding: '10px 0', background: cDelivery === k ? '#fdf2f8' : '#f8fafc', color: cDelivery === k ? '#be185d' : '#475569', border: cDelivery === k ? '1px solid #fbcfe8' : '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Expiration</label>
                  <input type="date" defaultValue="2027-04-16" style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setCreateOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={() => setCreateOpen(false)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer & envoyer</button>
                </div>
              </div>

              <div style={{ position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Aperçu en direct</div>
                <DesignPreview design={selectedDesign} code={previewCode} value={cValue} recipient={cRecipient || undefined} message={cMessage || undefined} />
                <div style={{ marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 12, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                  <div><strong style={{ color: '#1e293b' }}>Valeur :</strong> {cValue} €</div>
                  <div><strong style={{ color: '#1e293b' }}>Design :</strong> {selectedDesign.name}</div>
                  <div><strong style={{ color: '#1e293b' }}>Livraison :</strong> {cDelivery === 'physical' ? 'Physique' : cDelivery === 'email' ? 'Email PDF' : 'SMS'}</div>
                  {cEmail && <div><strong style={{ color: '#1e293b' }}>Email :</strong> {cEmail}</div>}
                  {cPhone && <div><strong style={{ color: '#1e293b' }}>Tél :</strong> {cPhone}</div>}
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
                      <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>✓ Carte valide</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: '#065f46' }}>Solde disponible : <strong>{foundCard.remaining.toFixed(2)} €</strong></div>
                      <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Expire le {foundCard.expiry}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>✗ Code introuvable ou invalide</div>
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: 500 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Générer un lot de cartes</h3>
              <p style={{ margin: '6px 0 20px 0', color: '#64748b', fontSize: 14 }}>Idéal pour les cadeaux d'entreprise</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Quantité</label>
                  <input type="number" value={bQuantity} onChange={(e) => setBQuantity(Number(e.target.value))} min={1} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeur unitaire</label>
                  <input type="number" value={bValue} onChange={(e) => setBValue(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
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
                <div style={{ fontSize: 13, color: '#9f1239', marginTop: 4 }}>{bQuantity} cartes × {bValue} € = <strong>{(bQuantity * bValue).toFixed(0)} €</strong> de valeur totale</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setBatchOpen(false)} style={{ padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => setBatchOpen(false)} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#be185d,#ec4899)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Générer le lot</button>
              </div>
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
