import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileMinus, Euro, Plus, X, Download, Mail, Search, ArrowRight,
  FileText, CheckCircle2, User, Clock, ClipboardList,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Raison = 'Erreur saisie' | 'Annulation' | 'Remboursement' | 'Geste commercial' | 'Produit défectueux';
type Statut = 'Brouillon' | 'Envoyé' | 'Appliqué';

interface AuditEntry {
  who: string;
  action: string;
  when: string;
}

interface Avoir {
  id: string;
  numero: string;
  factureLiee: string;
  client: string;
  date: string;
  montantHT: number;
  tva: number;
  raison: Raison;
  justification?: string;
  statut: Statut;
  audit: AuditEntry[];
}

interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  tva: number;
}

interface SourceInvoice {
  numero: string;
  client: string;
  date: string;
  total: number;
  lignes: InvoiceLine[];
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const avoirsMock: Avoir[] = [
  {
    id: 'a1', numero: 'AVR-2026-001', factureLiee: 'FAC-2026-089',
    client: 'Restaurant Le Pavillon', date: '12/04/2026',
    montantHT: 85.00, tva: 17, raison: 'Erreur saisie', statut: 'Appliqué',
    audit: [
      { who: 'Sophie L.', action: 'Création', when: '12/04/2026 14:32' },
      { who: 'Direction', action: 'Validation', when: '12/04/2026 15:10' },
      { who: 'Système', action: 'Appliqué à la facture', when: '12/04/2026 15:12' },
    ],
  },
  {
    id: 'a2', numero: 'AVR-2026-002', factureLiee: 'FAC-2026-085',
    client: 'Trattoria Roma', date: '10/04/2026',
    montantHT: 42.50, tva: 8, raison: 'Produit défectueux',
    justification: 'Bouteille de vin oxydée signalée par le client',
    statut: 'Envoyé',
    audit: [
      { who: 'Thomas B.', action: 'Création', when: '10/04/2026 11:15' },
      { who: 'Direction', action: 'Validation', when: '10/04/2026 12:00' },
      { who: 'Système', action: 'Envoyé par email', when: '10/04/2026 12:01' },
    ],
  },
  {
    id: 'a3', numero: 'AVR-2026-003', factureLiee: 'FAC-2026-082',
    client: 'La Table du Chef', date: '08/04/2026',
    montantHT: 125.00, tva: 17, raison: 'Geste commercial',
    justification: 'Compensation pour retard service important',
    statut: 'Appliqué',
    audit: [
      { who: 'Paul M.', action: 'Création', when: '08/04/2026 18:20' },
      { who: 'Direction', action: 'Validation', when: '08/04/2026 18:45' },
    ],
  },
  {
    id: 'a4', numero: 'AVR-2026-004', factureLiee: 'FAC-2026-081',
    client: 'Brasserie Mansfeld', date: '05/04/2026',
    montantHT: 28.00, tva: 3, raison: 'Annulation', statut: 'Appliqué',
    audit: [
      { who: 'Sophie L.', action: 'Création', when: '05/04/2026 10:00' },
      { who: 'Direction', action: 'Validation', when: '05/04/2026 10:30' },
    ],
  },
  {
    id: 'a5', numero: 'AVR-2026-005', factureLiee: 'FAC-2026-078',
    client: 'Café des Artistes', date: '02/04/2026',
    montantHT: 15.50, tva: 17, raison: 'Erreur saisie', statut: 'Brouillon',
    audit: [
      { who: 'Julie K.', action: 'Création', when: '02/04/2026 16:45' },
    ],
  },
  {
    id: 'a6', numero: 'AVR-2026-006', factureLiee: 'FAC-2026-075',
    client: 'Hotel Parc Belair', date: '28/03/2026',
    montantHT: 38.00, tva: 14, raison: 'Remboursement', statut: 'Appliqué',
    audit: [
      { who: 'Thomas B.', action: 'Création', when: '28/03/2026 09:15' },
      { who: 'Direction', action: 'Validation', when: '28/03/2026 09:40' },
    ],
  },
  {
    id: 'a7', numero: 'AVR-2026-007', factureLiee: 'FAC-2026-068',
    client: 'Wine Bar Clausen', date: '25/03/2026',
    montantHT: 52.00, tva: 17, raison: 'Geste commercial', statut: 'Envoyé',
    audit: [
      { who: 'Paul M.', action: 'Création', when: '25/03/2026 20:10' },
      { who: 'Direction', action: 'Validation', when: '25/03/2026 21:00' },
    ],
  },
  {
    id: 'a8', numero: 'AVR-2026-008', factureLiee: 'FAC-2026-061',
    client: 'Bistro Kirchberg', date: '20/03/2026',
    montantHT: 18.00, tva: 8, raison: 'Produit défectueux', statut: 'Appliqué',
    audit: [
      { who: 'Sophie L.', action: 'Création', when: '20/03/2026 13:30' },
      { who: 'Direction', action: 'Validation', when: '20/03/2026 14:00' },
    ],
  },
];

const mockInvoices: SourceInvoice[] = [
  {
    numero: 'FAC-2026-089', client: 'Restaurant Le Pavillon', date: '10/04/2026', total: 2450.00,
    lignes: [
      { id: 'l1', description: 'Menu dégustation × 4', qty: 4, unitPrice: 85.00, tva: 17 },
      { id: 'l2', description: 'Bouteille Bordeaux 2018', qty: 2, unitPrice: 65.00, tva: 17 },
      { id: 'l3', description: 'Café gourmand', qty: 4, unitPrice: 12.00, tva: 17 },
      { id: 'l4', description: 'Eau minérale', qty: 6, unitPrice: 4.50, tva: 17 },
    ],
  },
  {
    numero: 'FAC-2026-088', client: 'Brasserie Mansfeld', date: '08/04/2026', total: 1280.00,
    lignes: [
      { id: 'l1', description: 'Plat du jour × 12', qty: 12, unitPrice: 18.50, tva: 17 },
      { id: 'l2', description: 'Vin carafe', qty: 4, unitPrice: 22.00, tva: 17 },
    ],
  },
  {
    numero: 'FAC-2026-087', client: 'Café des Artistes', date: '05/04/2026', total: 890.00,
    lignes: [
      { id: 'l1', description: 'Formule midi × 15', qty: 15, unitPrice: 16.00, tva: 17 },
      { id: 'l2', description: 'Boissons', qty: 15, unitPrice: 4.00, tva: 17 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statutConfig: Record<Statut, { bg: string; color: string }> = {
  Brouillon: { bg: '#f1f5f9', color: '#475569' },
  Envoyé:    { bg: '#eff6ff', color: '#2563eb' },
  Appliqué:  { bg: '#ecfdf5', color: '#059669' },
};

const raisonConfig: Record<Raison, string> = {
  'Erreur saisie':      '#6366f1',
  'Annulation':         '#64748b',
  'Remboursement':      '#f59e0b',
  'Geste commercial':   '#10b981',
  'Produit défectueux': '#ef4444',
};

const formatEur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AvoirsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [detailAvoir, setDetailAvoir] = useState<Avoir | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SourceInvoice | null>(null);
  const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
  const [raison, setRaison] = useState<Raison>('Erreur saisie');
  const [justification, setJustification] = useState('');
  const [preview, setPreview] = useState(false);

  const invoiceMatches = useMemo(() => {
    if (!invoiceSearch.trim()) return mockInvoices;
    const s = invoiceSearch.toLowerCase();
    return mockInvoices.filter(i =>
      i.numero.toLowerCase().includes(s) || i.client.toLowerCase().includes(s)
    );
  }, [invoiceSearch]);

  const computedTotal = useMemo(() => {
    if (!selectedInvoice) return { ht: 0, tva: 0, ttc: 0 };
    let ht = 0, tva = 0;
    selectedInvoice.lignes.forEach(l => {
      const qty = selectedLines[l.id] ?? 0;
      const lineHt = qty * l.unitPrice;
      ht += lineHt;
      tva += lineHt * (l.tva / 100);
    });
    return { ht, tva, ttc: ht + tva };
  }, [selectedInvoice, selectedLines]);

  const reasonsCount = useMemo(() => {
    const map: Partial<Record<Raison, number>> = {};
    avoirsMock.forEach(a => { map[a.raison] = (map[a.raison] ?? 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 3) as Array<[Raison, number]>;
  }, []);

  const stats = {
    thisMonth: avoirsMock.filter(a => a.date.includes('/04/2026')).length,
    totalAmount: avoirsMock
      .filter(a => a.date.includes('/04/2026'))
      .reduce((s, a) => s + a.montantHT * (1 + a.tva / 100), 0),
  };

  const resetCreate = () => {
    setInvoiceSearch('');
    setSelectedInvoice(null);
    setSelectedLines({});
    setJustification('');
    setRaison('Erreur saisie');
    setPreview(false);
  };

  const closeCreate = () => {
    setShowCreate(false);
    resetCreate();
  };

  return (
    <div style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Avoirs</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Gestion des notes de crédit et remboursements
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          <Plus size={16} /> Créer un avoir
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ ...cardStyle, borderTop: '3px solid #065F46' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Avoirs émis ce mois</span>
            <FileMinus size={18} color="#065F46" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{stats.thisMonth}</div>
        </div>

        <div style={{ ...cardStyle, borderTop: '3px solid #0369a1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Total montant avoirs</span>
            <Euro size={18} color="#0369a1" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{formatEur(stats.totalAmount)}</div>
        </div>

        <div style={{ ...cardStyle, borderTop: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Raisons les plus courantes</span>
            <ClipboardList size={18} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {reasonsCount.map(([r, n]) => (
              <span
                key={r}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 14,
                  background: `${raisonConfig[r]}22`, color: raisonConfig[r],
                }}
              >
                {r} · {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>N° avoir</th>
                <th style={thStyle}>Facture liée</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Date</th>
                <th style={{ ...thStyle, textAlign: 'right' as const }}>Montant HT</th>
                <th style={{ ...thStyle, textAlign: 'right' as const }}>TVA</th>
                <th style={thStyle}>Raison</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {avoirsMock.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setDetailAvoir(a)}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{a.numero}</td>
                  <td style={tdStyle}>
                    <span style={{ color: '#0369a1', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {a.factureLiee} <ArrowRight size={11} />
                    </span>
                  </td>
                  <td style={tdStyle}>{a.client}</td>
                  <td style={tdStyle}>{a.date}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' as const, fontWeight: 600 }}>{formatEur(a.montantHT)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' as const, color: '#64748b' }}>{a.tva}%</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12,
                      background: `${raisonConfig[a.raison]}22`, color: raisonConfig[a.raison],
                    }}>
                      {a.raison}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                      background: statutConfig[a.statut].bg, color: statutConfig[a.statut].color,
                    }}>
                      {a.statut}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <ArrowRight size={14} color="#94a3b8" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeCreate}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720,
                padding: 28, boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
                maxHeight: '92vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: 18 }}>
                  {preview ? 'Aperçu de l\'avoir' : 'Créer un avoir'}
                </h3>
                <button onClick={closeCreate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>

              {!preview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Search invoice */}
                  <div>
                    <label style={labelStyle}>Facture d'origine</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        value={invoiceSearch}
                        onChange={e => setInvoiceSearch(e.target.value)}
                        placeholder="N° facture ou nom du client..."
                        style={{ ...inputStyle, paddingLeft: 34 }}
                      />
                    </div>
                    {!selectedInvoice && invoiceSearch && (
                      <div style={{
                        marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 8,
                        maxHeight: 180, overflowY: 'auto',
                      }}>
                        {invoiceMatches.length === 0 && (
                          <div style={{ padding: 14, color: '#94a3b8', fontSize: 13 }}>Aucune facture.</div>
                        )}
                        {invoiceMatches.map(inv => (
                          <div
                            key={inv.numero}
                            onClick={() => { setSelectedInvoice(inv); setInvoiceSearch(''); }}
                            style={{
                              padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{inv.numero}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{inv.client} — {inv.date}</div>
                            </div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatEur(inv.total)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedInvoice && (
                    <>
                      <div style={{
                        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0369a1', fontSize: 13 }}>{selectedInvoice.numero}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{selectedInvoice.client} — {selectedInvoice.date}</div>
                        </div>
                        <button
                          onClick={() => { setSelectedInvoice(null); setSelectedLines({}); }}
                          style={{ ...btnGhost, padding: '5px 10px', fontSize: 12 }}
                        >
                          Changer
                        </button>
                      </div>

                      <div>
                        <label style={labelStyle}>Lignes à rembourser</label>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                          {selectedInvoice.lignes.map((l, idx) => {
                            const qty = selectedLines[l.id] ?? 0;
                            const checked = qty > 0;
                            return (
                              <div
                                key={l.id}
                                style={{
                                  padding: '10px 14px',
                                  borderBottom: idx < selectedInvoice.lignes.length - 1 ? '1px solid #f1f5f9' : 'none',
                                  display: 'flex', alignItems: 'center', gap: 12,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e =>
                                    setSelectedLines({ ...selectedLines, [l.id]: e.target.checked ? l.qty : 0 })
                                  }
                                  style={{ cursor: 'pointer' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 13 }}>{l.description}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>
                                    {l.qty} × {formatEur(l.unitPrice)} · TVA {l.tva}%
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  min={0}
                                  max={l.qty}
                                  value={qty}
                                  disabled={!checked}
                                  onChange={e =>
                                    setSelectedLines({ ...selectedLines, [l.id]: Math.min(l.qty, Math.max(0, +e.target.value)) })
                                  }
                                  style={{
                                    width: 60, padding: '5px 8px', border: '1px solid #e2e8f0',
                                    borderRadius: 6, fontSize: 13, textAlign: 'center' as const,
                                    color: '#1e293b', background: checked ? '#fff' : '#f8fafc',
                                  }}
                                />
                                <div style={{ width: 90, textAlign: 'right' as const, fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                  {formatEur(qty * l.unitPrice)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Totals */}
                      <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14,
                      }}>
                        <Row label="Montant HT" value={formatEur(computedTotal.ht)} />
                        <Row label="TVA" value={formatEur(computedTotal.tva)} />
                        <Row label="Total TTC" value={formatEur(computedTotal.ttc)} bold />
                      </div>

                      <div>
                        <label style={labelStyle}>Raison</label>
                        <select value={raison} onChange={e => setRaison(e.target.value as Raison)} style={inputStyle}>
                          {(Object.keys(raisonConfig) as Raison[]).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Justification</label>
                        <textarea
                          value={justification}
                          onChange={e => setJustification(e.target.value)}
                          placeholder="Précisez le contexte..."
                          rows={3}
                          style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
                        />
                      </div>

                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        Lien facture : <span style={{ color: '#0369a1', fontWeight: 500 }}>{selectedInvoice.numero}</span> (auto-généré)
                      </div>

                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={closeCreate} style={btnGhost}>Annuler</button>
                        <button
                          onClick={() => setPreview(true)}
                          style={{
                            ...btnPrimary,
                            opacity: computedTotal.ht > 0 ? 1 : 0.5,
                            cursor: computedTotal.ht > 0 ? 'pointer' : 'not-allowed',
                          }}
                          disabled={computedTotal.ht <= 0}
                        >
                          Prévisualiser <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Preview */
                <div>
                  <div style={{
                    border: '2px solid #1e293b', padding: 24, borderRadius: 8, marginBottom: 18,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>AVOIR</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>AVR-2026-009</div>
                      </div>
                      <div style={{ textAlign: 'right' as const, fontSize: 12, color: '#64748b' }}>
                        Date : {new Date().toLocaleDateString('fr-FR')}<br />
                        Facture liée : {selectedInvoice?.numero}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16, fontSize: 13 }}>
                      <div style={{ color: '#64748b' }}>Client</div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedInvoice?.client}</div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b' }}>
                          <th style={{ textAlign: 'left' as const, padding: 6 }}>Description</th>
                          <th style={{ textAlign: 'right' as const, padding: 6 }}>Qté</th>
                          <th style={{ textAlign: 'right' as const, padding: 6 }}>PU</th>
                          <th style={{ textAlign: 'right' as const, padding: 6 }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice?.lignes
                          .filter(l => (selectedLines[l.id] ?? 0) > 0)
                          .map(l => {
                            const qty = selectedLines[l.id];
                            return (
                              <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: 6 }}>{l.description}</td>
                                <td style={{ padding: 6, textAlign: 'right' as const }}>{qty}</td>
                                <td style={{ padding: 6, textAlign: 'right' as const }}>{formatEur(l.unitPrice)}</td>
                                <td style={{ padding: 6, textAlign: 'right' as const, fontWeight: 600 }}>
                                  {formatEur(qty * l.unitPrice)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    <div style={{ marginTop: 16, textAlign: 'right' as const, fontSize: 14 }}>
                      <Row label="HT" value={formatEur(computedTotal.ht)} />
                      <Row label="TVA" value={formatEur(computedTotal.tva)} />
                      <Row label="Total" value={formatEur(computedTotal.ttc)} bold />
                    </div>

                    <div style={{ marginTop: 16, padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                      <strong>Raison :</strong> {raison}
                      {justification && <div style={{ marginTop: 4, color: '#64748b' }}>{justification}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                    <button onClick={() => setPreview(false)} style={btnGhost}>
                      ← Modifier
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={btnGhost}><Download size={14} /> PDF</button>
                      <button style={btnPrimary}>
                        <Mail size={14} /> Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailAvoir && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetailAvoir(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560,
                padding: 28, boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: 18 }}>{detailAvoir.numero}</h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    Lié à <span style={{ color: '#0369a1', fontWeight: 500 }}>{detailAvoir.factureLiee}</span>
                  </div>
                </div>
                <button onClick={() => setDetailAvoir(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <Info label="Client" value={detailAvoir.client} />
                <Info label="Date" value={detailAvoir.date} />
                <Info label="Montant HT" value={formatEur(detailAvoir.montantHT)} />
                <Info label="TVA" value={`${detailAvoir.tva}%`} />
                <Info
                  label="Raison"
                  value={
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12,
                      background: `${raisonConfig[detailAvoir.raison]}22`, color: raisonConfig[detailAvoir.raison],
                    }}>
                      {detailAvoir.raison}
                    </span>
                  }
                />
                <Info
                  label="Statut"
                  value={
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                      background: statutConfig[detailAvoir.statut].bg, color: statutConfig[detailAvoir.statut].color,
                    }}>
                      {detailAvoir.statut}
                    </span>
                  }
                />
              </div>

              {detailAvoir.justification && (
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: 12, marginBottom: 18,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Justification</div>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{detailAvoir.justification}</div>
                </div>
              )}

              {/* Audit trail */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> Historique
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailAvoir.audit.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12,
                      }}
                    >
                      <CheckCircle2 size={13} color="#10b981" />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{e.action}</span>
                        <span style={{ color: '#64748b' }}> par </span>
                        <span style={{ color: '#1e293b' }}>{e.who}</span>
                      </div>
                      <span style={{ color: '#94a3b8' }}>{e.when}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <button style={btnGhost}>
                  <FileText size={14} /> Voir facture liée
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={btnGhost}>
                    <Download size={14} /> PDF
                  </button>
                  <button style={btnPrimary}>
                    <Mail size={14} /> Envoyer par email
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components & styles                                            */
/* ------------------------------------------------------------------ */

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '4px 0',
      fontWeight: bold ? 700 : 400,
      color: bold ? '#1e293b' : '#475569',
      fontSize: bold ? 14 : 13,
      borderTop: bold ? '1px solid #e2e8f0' : 'none',
      marginTop: bold ? 6 : 0,
      paddingTop: bold ? 8 : 4,
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18,
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', border: 'none', borderRadius: 8,
  background: '#065F46', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
  background: '#fff', color: '#334155', fontWeight: 500, fontSize: 13, cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none', boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left' as const, padding: '12px 14px', fontWeight: 600, color: '#475569',
  fontSize: 12, borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 14px', color: '#1e293b',
};
