import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Method = 'especes' | 'carte' | 'sans-contact';
type DiscountMode = 'percent' | 'euro';

interface LineItem {
  id: number;
  name: string;
  qty: number;
  unit: number;
  tva: 3 | 8 | 14 | 17;
}

interface Customer {
  name: string;
  points: number;
  loyaltyDiscount: number;
}

const mockItems: LineItem[] = [
  { id: 1, name: 'Menu dégustation', qty: 2, unit: 68, tva: 17 },
  { id: 2, name: 'Bouteille Riesling AOP', qty: 1, unit: 48, tva: 17 },
  { id: 3, name: 'Café espresso', qty: 2, unit: 3.2, tva: 8 },
  { id: 4, name: 'Eau plate 75cl', qty: 2, unit: 4.5, tva: 3 },
  { id: 5, name: 'Dessert du chef', qty: 2, unit: 9, tva: 14 },
];

const mockCustomer: Customer = { name: 'Sophie Keller', points: 2480, loyaltyDiscount: 5 };
const cashPresets = [10, 20, 50, 100, 200];

const fmt = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

export default function Checkout() {
  const [method, setMethod] = useState<Method>('carte');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('percent');
  const [discount, setDiscount] = useState<number>(0);
  const [tipPreset, setTipPreset] = useState<number | null>(10);
  const [customTip, setCustomTip] = useState<number>(0);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [split, setSplit] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'waiting' | 'ok'>('idle');
  const [paid, setPaid] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [linked] = useState<Customer | null>(mockCustomer);

  const subtotals = useMemo(() => {
    const byTva: Record<number, { ht: number; tva: number }> = { 3: { ht: 0, tva: 0 }, 8: { ht: 0, tva: 0 }, 14: { ht: 0, tva: 0 }, 17: { ht: 0, tva: 0 } };
    mockItems.forEach(i => {
      const ttc = i.qty * i.unit;
      const rate = i.tva / 100;
      const ht = ttc / (1 + rate);
      byTva[i.tva].ht += ht;
      byTva[i.tva].tva += ttc - ht;
    });
    const totalHt = Object.values(byTva).reduce((a, v) => a + v.ht, 0);
    const totalTva = Object.values(byTva).reduce((a, v) => a + v.tva, 0);
    return { byTva, totalHt, totalTva, totalTtc: totalHt + totalTva };
  }, []);

  const discountAmount = discountMode === 'percent'
    ? (subtotals.totalTtc * discount) / 100
    : Math.min(discount, subtotals.totalTtc);

  const loyaltyAmount = linked ? (subtotals.totalTtc * linked.loyaltyDiscount) / 100 : 0;

  const tipAmount = tipPreset != null
    ? ((subtotals.totalTtc - discountAmount - loyaltyAmount) * tipPreset) / 100
    : customTip;

  const grand = Math.max(0, subtotals.totalTtc - discountAmount - loyaltyAmount + tipAmount);
  const perGuest = split && splitCount > 0 ? grand / splitCount : grand;
  const change = Math.max(0, cashGiven - grand);
  const pointsEarned = linked ? Math.round(grand) : 0;

  const sendTerminal = () => {
    setTerminalStatus('waiting');
    setTimeout(() => setTerminalStatus('ok'), 1600);
  };

  const confirm = () => {
    if (method === 'carte' && terminalStatus !== 'ok') {
      sendTerminal();
      setTimeout(() => setPaid(true), 1800);
      return;
    }
    setPaid(true);
  };

  const reset = () => {
    setPaid(false);
    setDiscount(0);
    setCashGiven(0);
    setTerminalStatus('idle');
    setTipPreset(10);
  };

  if (paid) {
    return (
      <div style={{ minHeight: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 44, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            style={{ width: 88, height: 88, borderRadius: '50%', background: '#ecfdf5', border: '3px solid #059669', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#059669' }}
          >
            ✓
          </motion.div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Paiement validé</h2>
          <p style={{ margin: '6px 0 18px', color: '#64748b', fontSize: 14 }}>Encaissement Table 12 — {fmt(grand)}</p>
          {linked && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
              +{pointsEarned} points fidélité crédités à {linked.name}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#334155', fontSize: 13, marginBottom: 18 }}>
            <input type="checkbox" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} />
            Impression automatique du ticket
          </label>
          <button
            onClick={reset}
            style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}
          >
            Nouvelle commande
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', padding: 24, color: '#0f172a' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Encaissement — Table 12</h1>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>{mockItems.reduce((a, i) => a + i.qty, 0)} articles · 4 couverts</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Détail de la commande</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mockItems.map(i => (
                  <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{i.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>TVA {i.tva}%</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>x{i.qty}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{fmt(i.unit)}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, minWidth: 70, textAlign: 'right' }}>{fmt(i.qty * i.unit)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 4 }}>
                  <span>Sous-total HT</span><span>{fmt(subtotals.totalHt)}</span>
                </div>
                {([3, 8, 14, 17] as const).map(rate => subtotals.byTva[rate].tva > 0 && (
                  <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                    <span>TVA {rate}%</span><span>{fmt(subtotals.byTva[rate].tva)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 6, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                  <span>Total TTC</span><span>{fmt(subtotals.totalTtc)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Remise</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
                <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                  {(['percent', 'euro'] as DiscountMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setDiscountMode(m)}
                      style={{ background: discountMode === m ? '#fff' : 'transparent', color: discountMode === m ? '#0f172a' : '#64748b', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      {m === 'percent' ? '%' : '€'}
                    </button>
                  ))}
                </div>
              </div>
              {discountAmount > 0 && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                  Remise appliquée : −{fmt(discountAmount)}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Pourboire</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[5, 10, 15].map(p => (
                  <button
                    key={p}
                    onClick={() => { setTipPreset(p); setCustomTip(0); }}
                    style={{ background: tipPreset === p ? '#0f172a' : '#fff', color: tipPreset === p ? '#fff' : '#334155', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {p}%
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: tipPreset == null ? '1px solid #0f172a' : '1px solid #cbd5e1', borderRadius: 10, padding: '0 10px' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Libre</span>
                  <input
                    type="number"
                    value={customTip || ''}
                    onChange={e => { setCustomTip(parseFloat(e.target.value) || 0); setTipPreset(null); }}
                    placeholder="0"
                    style={{ border: 'none', outline: 'none', width: 70, padding: '10px 0', fontSize: 14, background: 'transparent' }}
                  />
                  <span style={{ fontSize: 13, color: '#64748b' }}>€</span>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>
                Montant du pourboire : <strong style={{ color: '#0f172a' }}>{fmt(tipAmount)}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={split} onChange={e => setSplit(e.target.checked)} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Partager entre plusieurs couverts</span>
              </label>
              <AnimatePresence>
                {split && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                      <button onClick={() => setSplitCount(c => Math.max(2, c - 1))} style={{ width: 34, height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>−</button>
                      <div style={{ fontSize: 18, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>{splitCount}</div>
                      <button onClick={() => setSplitCount(c => c + 1)} style={{ width: 34, height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>+</button>
                      <div style={{ marginLeft: 'auto', fontSize: 14, color: '#475569' }}>Soit <strong style={{ color: '#4f46e5' }}>{fmt(perGuest)}</strong> par couvert</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {linked && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>Client lié</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{linked.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{linked.points} points · Remise fidélité {linked.loyaltyDiscount}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#6d28d9' }}>À créditer</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#6d28d9' }}>+{pointsEarned} pts</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Mode de paiement</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {([
                  { id: 'especes' as Method, label: 'Espèces', icon: '💶' },
                  { id: 'carte' as Method, label: 'Carte', icon: '💳' },
                  { id: 'sans-contact' as Method, label: 'Sans contact', icon: '📱' },
                ]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    style={{
                      background: method === m.id ? '#eef2ff' : '#fff',
                      border: `2px solid ${method === m.id ? '#4f46e5' : '#e5e7eb'}`,
                      borderRadius: 12, padding: '18px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      color: method === m.id ? '#4f46e5' : '#334155', fontWeight: 700, fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, minHeight: 220 }}>
              <AnimatePresence mode="wait">
                {method === 'especes' && (
                  <motion.div key="cash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Calculatrice espèces</h4>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      onChange={e => setCashGiven(parseFloat(e.target.value) || 0)}
                      placeholder="Montant reçu"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 18, fontWeight: 700, outline: 'none', marginBottom: 10, textAlign: 'right' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
                      {cashPresets.map(p => (
                        <button
                          key={p}
                          onClick={() => setCashGiven(c => c + p)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          +{p}€
                        </button>
                      ))}
                    </div>
                    <div style={{ background: change > 0 ? '#ecfdf5' : '#f8fafc', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>À rendre</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: change > 0 ? '#059669' : '#0f172a' }}>{fmt(change)}</span>
                    </div>
                  </motion.div>
                )}
                {method === 'carte' && (
                  <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Terminal de paiement</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, background: terminalStatus === 'ok' ? '#ecfdf5' : '#f8fafc', border: `1px solid ${terminalStatus === 'ok' ? '#a7f3d0' : '#e5e7eb'}`, marginBottom: 12 }}>
                      <motion.span
                        animate={{ scale: terminalStatus === 'waiting' ? [1, 1.3, 1] : 1 }}
                        transition={{ repeat: terminalStatus === 'waiting' ? Infinity : 0, duration: 1 }}
                        style={{ width: 10, height: 10, borderRadius: '50%', background: terminalStatus === 'ok' ? '#059669' : terminalStatus === 'waiting' ? '#f59e0b' : '#94a3b8' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {terminalStatus === 'idle' && 'Terminal connecté — prêt'}
                        {terminalStatus === 'waiting' && 'En attente du paiement…'}
                        {terminalStatus === 'ok' && 'Paiement autorisé'}
                      </span>
                    </div>
                    <button
                      onClick={sendTerminal}
                      disabled={terminalStatus === 'waiting'}
                      style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: terminalStatus === 'waiting' ? 'wait' : 'pointer' }}
                    >
                      {terminalStatus === 'ok' ? 'Transaction réussie' : 'Envoyer au terminal'}
                    </button>
                  </motion.div>
                )}
                {method === 'sans-contact' && (
                  <motion.div key="nfc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                    <h4 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700 }}>Approchez votre appareil</h4>
                    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.4, opacity: 0.8 }}
                          animate={{ scale: 1.4, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.5 }}
                          style={{ position: 'absolute', inset: 0, border: '2px solid #4f46e5', borderRadius: '50%' }}
                        />
                      ))}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>📱</div>
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 14 }}>Montant à régler : <strong style={{ color: '#0f172a' }}>{fmt(grand)}</strong></p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ background: '#0f172a', color: '#fff', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
                <span>Total TTC</span><span>{fmt(subtotals.totalTtc)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
                  <span>Remise</span><span>−{fmt(discountAmount)}</span>
                </div>
              )}
              {loyaltyAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
                  <span>Fidélité</span><span>−{fmt(loyaltyAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
                  <span>Pourboire</span><span>+{fmt(tipAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.8 }}>À payer</span>
                <span style={{ fontSize: 30, fontWeight: 800 }}>{fmt(grand)}</span>
              </div>
              {split && (
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
                  {fmt(perGuest)} × {splitCount} couverts
                </div>
              )}
            </div>

            <button
              onClick={confirm}
              style={{ background: '#059669', color: '#fff', border: 'none', padding: '18px', borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 25px rgba(5,150,105,0.25)' }}
            >
              Valider le paiement — {fmt(grand)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
