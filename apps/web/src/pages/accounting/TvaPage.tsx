import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Period = 'Mois' | 'Trimestre' | 'Année';

interface VatRate {
  rate: number;
  label: string;
  description: string;
  active: boolean;
  caHt: number;
  collectee: number;
  deductible: number;
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

const initialRates: VatRate[] = [
  { rate: 3,  label: 'Taux super-réduit',  description: 'Alimentation de base, eau, livres, journaux, médicaments, transport de personnes',       active: true, caHt: 4200, collectee: 126, deductible: 18 },
  { rate: 8,  label: 'Taux réduit',         description: 'Restauration sur place, hébergement, services de coiffure, petits travaux de réparation', active: true, caHt: 7800, collectee: 624, deductible: 62 },
  { rate: 14, label: 'Taux intermédiaire',  description: 'Certains biens et services : vins, gestion des déchets, certains combustibles',           active: true, caHt: 1200, collectee: 168, deductible: 24 },
  { rate: 17, label: 'Taux standard',       description: 'Taux normal applicable à tous les autres biens et services non listés',                    active: true, caHt: 6000, collectee: 1022, deductible: 316 },
];

const vatEvolution = [
  { mois: 'Mai', collectee: 1650, deductible: 380 },
  { mois: 'Jun', collectee: 1820, deductible: 410 },
  { mois: 'Jul', collectee: 2100, deductible: 460 },
  { mois: 'Aoû', collectee: 2250, deductible: 490 },
  { mois: 'Sep', collectee: 1980, deductible: 420 },
  { mois: 'Oct', collectee: 1870, deductible: 400 },
  { mois: 'Nov', collectee: 1920, deductible: 430 },
  { mois: 'Déc', collectee: 2310, deductible: 510 },
  { mois: 'Jan', collectee: 1780, deductible: 390 },
  { mois: 'Fév', collectee: 1840, deductible: 405 },
  { mois: 'Mar', collectee: 1890, deductible: 415 },
  { mois: 'Avr', collectee: 1940, deductible: 420 },
];

const salesByRate = [
  { produit: 'Menu du jour',        categorie: 'Restauration',  taux: 8,  caHt: 3200, tva: 256 },
  { produit: 'Vin de table',        categorie: 'Boissons',      taux: 14, caHt: 780,  tva: 109.2 },
  { produit: 'Baguettes fraîches',  categorie: 'Boulangerie',   taux: 3,  caHt: 420,  tva: 12.6 },
  { produit: 'Cocktails',           categorie: 'Boissons',      taux: 17, caHt: 1420, tva: 241.4 },
  { produit: 'Pâtisseries',         categorie: 'Desserts',      taux: 8,  caHt: 1180, tva: 94.4 },
  { produit: 'Café à emporter',     categorie: 'Boissons',      taux: 3,  caHt: 380,  tva: 11.4 },
  { produit: 'Plats traiteur',      categorie: 'Traiteur',      taux: 17, caHt: 2100, tva: 357 },
  { produit: 'Champagne',           categorie: 'Boissons',      taux: 14, caHt: 420,  tva: 58.8 },
];

const declarations = [
  { periode: 'T4 2025', deposeeLe: '2026-01-15', montant: 5920, statut: 'Accepté' as const },
  { periode: 'T3 2025', deposeeLe: '2025-10-15', montant: 5410, statut: 'Accepté' as const },
  { periode: 'T2 2025', deposeeLe: '2025-07-15', montant: 6180, statut: 'Accepté' as const },
  { periode: 'T1 2026', deposeeLe: null,         montant: 1520, statut: 'En cours' as const },
];

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', ...style }}>{children}</div>
);

export default function TvaPage() {
  const [period, setPeriod] = useState<Period>('Mois');
  const [rates, setRates] = useState(initialRates);

  const totalCollectee = useMemo(() => rates.filter(r => r.active).reduce((s, r) => s + r.collectee, 0), [rates]);
  const totalDeductible = useMemo(() => rates.filter(r => r.active).reduce((s, r) => s + r.deductible, 0), [rates]);
  const net = totalCollectee - totalDeductible;

  const toggle = (i: number) => setRates(rs => rs.map((r, idx) => idx === i ? { ...r, active: !r.active } : r));

  const stats = [
    { label: 'TVA collectée ce mois', value: `${totalCollectee.toLocaleString('fr-FR')}€`, color: palette.primary, hint: 'Avril 2026' },
    { label: 'TVA déductible', value: `${totalDeductible.toLocaleString('fr-FR')}€`, color: palette.success, hint: 'Sur dépenses' },
    { label: 'TVA à reverser', value: `${net.toLocaleString('fr-FR')}€`, color: palette.warning, hint: 'Solde net' },
    { label: 'Prochaine échéance', value: '15 mai 2026', color: palette.danger, hint: 'Dans 28 jours' },
  ];

  const statutColor = (s: 'Soumis' | 'Accepté' | 'En cours') =>
    s === 'Accepté' ? { bg: '#d1fae5', fg: '#047857' } : s === 'Soumis' ? { bg: '#dbeafe', fg: '#1d4ed8' } : { bg: '#fef3c7', fg: '#92400e' };

  const rateColor = (r: number) => r === 3 ? '#10b981' : r === 8 ? '#3b82f6' : r === 14 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: palette.bg, minHeight: '100vh', padding: 32, color: palette.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>TVA — Déclarations Luxembourg</h1>
          <p style={{ margin: '6px 0 0', color: palette.subtle }}>Suivi des taux, déclaration AED et rappels d'échéance</p>
        </div>
        <div style={{ display: 'flex', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 10, padding: 4 }}>
          {(['Mois', 'Trimestre', 'Année'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '8px 16px', background: period === p ? palette.primary : 'transparent', color: period === p ? '#fff' : palette.text, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{p}</button>
          ))}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {rates.map((r, i) => (
          <motion.div key={r.rate} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <Card style={{ borderTop: `4px solid ${rateColor(r.rate)}`, opacity: r.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: rateColor(r.rate) }}>{r.rate}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: rateColor(r.rate) }}>%</span>
                </div>
                <div onClick={() => toggle(i)} style={{ width: 36, height: 20, background: r.active ? palette.success : palette.border, borderRadius: 10, position: 'relative', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: r.active ? 18 : 2, transition: '0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: palette.subtle, marginBottom: 12, lineHeight: 1.4, minHeight: 44 }}>{r.description}</div>
              <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 10, fontSize: 12, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.subtle }}>CA HT</span><span style={{ fontWeight: 600 }}>{r.caHt.toLocaleString('fr-FR')}€</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.subtle }}>Collectée</span><span style={{ fontWeight: 600, color: palette.primary }}>{r.collectee.toLocaleString('fr-FR')}€</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.subtle }}>Déductible</span><span style={{ fontWeight: 600, color: palette.success }}>{r.deductible.toLocaleString('fr-FR')}€</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${palette.border}`, paddingTop: 6 }}><span style={{ color: palette.subtle }}>Net</span><span style={{ fontWeight: 700, color: palette.warning }}>{(r.collectee - r.deductible).toLocaleString('fr-FR')}€</span></div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>TVA collectée vs déductible — 12 derniers mois</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={vatEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.border} />
                <XAxis dataKey="mois" stroke={palette.subtle} fontSize={12} />
                <YAxis stroke={palette.subtle} fontSize={12} />
                <Tooltip formatter={(v: number) => `${v}€`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="collectee" fill={palette.primary} name="Collectée" radius={[6, 6, 0, 0]} />
                <Bar dataKey="deductible" fill={palette.success} name="Déductible" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Déclaration AED</h3>
            <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>J-10 avant échéance</span>
          </div>
          <div style={{ background: '#f8fafc', border: `1px solid ${palette.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: palette.subtle, fontWeight: 600, marginBottom: 10 }}>APERÇU DU FORMULAIRE</div>
            {[
              ['Période', 'Avril 2026'],
              ['Numéro TVA', 'LU 28456193'],
              ['Ligne 012 — CA taxable', '19 200€'],
              ['Ligne 701 — TVA 3%',   '126€'],
              ['Ligne 702 — TVA 8%',   '624€'],
              ['Ligne 703 — TVA 14%',  '168€'],
              ['Ligne 704 — TVA 17%',  '1 022€'],
              ['Ligne 801 — Déductible', '420€'],
              ['Ligne 999 — Solde dû', `${net.toLocaleString('fr-FR')}€`],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: i > 0 ? `1px solid ${palette.border}` : 'none', fontSize: 12 }}>
                <span style={{ color: palette.subtle }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => alert('PDF déclaration généré')} style={{ flex: 1, padding: 11, background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Générer la déclaration
            </button>
            <button style={{ padding: 11, background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text }}>
              eTVA
            </button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${palette.border}` }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Détail des ventes par taux</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Produit', 'Catégorie', 'Taux', 'CA HT', 'TVA'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: palette.subtle, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salesByRate.map((s, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${palette.border}` }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.produit}</td>
                  <td style={{ padding: '12px 14px', color: palette.subtle }}>{s.categorie}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: rateColor(s.taux), color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{s.taux}%</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.caHt.toLocaleString('fr-FR')}€</td>
                  <td style={{ padding: '12px 14px', color: palette.primary, fontWeight: 600 }}>{s.tva.toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Historique des déclarations</h3>
          </div>
          {declarations.map((d, i) => {
            const c = statutColor(d.statut);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i > 0 ? `1px solid ${palette.border}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.periode}</div>
                  <div style={{ fontSize: 11, color: palette.subtle }}>{d.deposeeLe ? `Déposée le ${d.deposeeLe}` : 'En préparation'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.montant.toLocaleString('fr-FR')}€</div>
                  <span style={{ background: c.bg, color: c.fg, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{d.statut}</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Card style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)', borderColor: '#c7d2fe' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 26 }}>🇱🇺</div>
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: palette.text }}>Mentions légales TVA Luxembourg</h3>
            <div style={{ fontSize: 13, color: palette.subtle, lineHeight: 1.6, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, color: palette.text, fontSize: 12, marginBottom: 4 }}>Numéro TVA</div>
                LU 28456193<br />
                Délivré par AED
              </div>
              <div>
                <div style={{ fontWeight: 600, color: palette.text, fontSize: 12, marginBottom: 4 }}>Seuils & franchise</div>
                Franchise : CA &lt; 35 000€<br />
                Déclaration mensuelle : CA &gt; 620 000€
              </div>
              <div>
                <div style={{ fontWeight: 600, color: palette.text, fontSize: 12, marginBottom: 4 }}>Échéances</div>
                Trimestrielle : le 15 du mois suivant<br />
                Paiement via eTVA (AED portal)
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
