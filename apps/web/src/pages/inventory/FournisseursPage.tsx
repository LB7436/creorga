import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ShoppingCart, Euro, Plus, X, Phone, Mail, User, Truck, Star,
  History, Package,
} from 'lucide-react';

/* ─── animations ─── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── types ─── */
type Categorie = 'Alimentation' | 'Boissons' | "Produits d'entretien" | 'Équipement';

interface Fournisseur {
  id: string;
  nom: string;
  categorie: Categorie;
  contactNom: string;
  email: string;
  telephone: string;
  delaiLivraison: number;
  note: number;
  commandesEnCours: number;
  adresse: string;
  actif: boolean;
}

const CATEGORY_COLORS: Record<Categorie, { bg: string; text: string }> = {
  Alimentation:            { bg: '#dcfce7', text: '#166534' },
  Boissons:                { bg: '#dbeafe', text: '#1d4ed8' },
  "Produits d'entretien":  { bg: '#fef3c7', text: '#92400e' },
  'Équipement':            { bg: '#ede9fe', text: '#6d28d9' },
};

const INITIAL: Fournisseur[] = [
  { id: 'f1', nom: 'Metro Luxembourg',       categorie: 'Alimentation',          contactNom: 'Pierre Schmit',    email: 'contact@metro.lu',          telephone: '+352 40 40 40',  delaiLivraison: 1, note: 4.5, commandesEnCours: 2, adresse: '1 Rue des Cerisiers, Gasperich', actif: true },
  { id: 'f2', nom: 'Bofrost',                categorie: 'Alimentation',          contactNom: 'Sophie Muller',    email: 'lux@bofrost.com',           telephone: '+352 42 31 55',  delaiLivraison: 2, note: 4.2, commandesEnCours: 1, adresse: '12 Zone Industrielle, Bertrange', actif: true },
  { id: 'f3', nom: 'Luxlait',                categorie: 'Alimentation',          contactNom: 'Marc Weber',       email: 'ventes@luxlait.lu',         telephone: '+352 31 02 21',  delaiLivraison: 1, note: 4.8, commandesEnCours: 0, adresse: 'Route de Luxembourg, Roost',     actif: true },
  { id: 'f4', nom: 'Cave des Vignerons',     categorie: 'Boissons',              contactNom: 'Jean-Luc Adam',    email: 'info@vinsmoselle.lu',       telephone: '+352 76 82 11',  delaiLivraison: 3, note: 4.6, commandesEnCours: 1, adresse: 'Route du Vin, Stadtbredimus',    actif: true },
  { id: 'f5', nom: 'Brasserie Nationale',    categorie: 'Boissons',              contactNom: 'Thomas Reiff',     email: 'pro@bofferding.lu',         telephone: '+352 50 91 11',  delaiLivraison: 2, note: 4.4, commandesEnCours: 0, adresse: '2 Boulevard Kennedy, Bascharage', actif: true },
  { id: 'f6', nom: 'Ferme Bio Schengen',     categorie: 'Alimentation',          contactNom: 'Claire Hoffmann',  email: 'contact@fermebio.lu',       telephone: '+352 23 66 74',  delaiLivraison: 2, note: 4.9, commandesEnCours: 1, adresse: 'Route du Vin, Schengen',         actif: true },
  { id: 'f7', nom: 'Fournisseur Pâtisseries',categorie: 'Alimentation',          contactNom: 'Marie Dubois',    email: 'commandes@patisseries.lu',  telephone: '+352 44 12 58',  delaiLivraison: 2, note: 4.3, commandesEnCours: 0, adresse: '8 Rue du Fort, Luxembourg-ville', actif: true },
  { id: 'f8', nom: 'Proxi Nettoyage',        categorie: "Produits d'entretien",  contactNom: 'Lucas Kremer',     email: 'ventes@proxi.lu',           telephone: '+352 35 80 22',  delaiLivraison: 3, note: 4.0, commandesEnCours: 0, adresse: 'Zone Artisanale, Mamer',         actif: true },
];

/* ─── overlay ─── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600,
            maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── stars ─── */
function Stars({ value }: { value: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <Star
            key={i} size={13}
            fill={filled ? '#facc15' : half ? 'url(#half)' : 'none'}
            color={filled || half ? '#facc15' : '#cbd5e1'}
          />
        );
      })}
      <span style={{ marginLeft: 4, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{value.toFixed(1)}</span>
    </div>
  );
}

/* ─── page ─── */
export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [historyFor, setHistoryFor] = useState<Fournisseur | null>(null);

  const stats = useMemo(() => {
    const actifs = fournisseurs.filter((f) => f.actif).length;
    return { actifs, commandes: 12, depense: 4230 };
  }, [fournisseurs]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (f: Fournisseur) => { setEditing(f); setModalOpen(true); };

  const save = (f: Fournisseur) => {
    setFournisseurs((prev) => {
      const idx = prev.findIndex((x) => x.id === f.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = f; return copy; }
      return [...prev, f];
    });
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', color: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.3 }}>Fournisseurs</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Votre réseau de partenaires au Luxembourg — contacts, délais et historique de commandes.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Ajouter un fournisseur
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={<Building2 size={20} />} label="Fournisseurs actifs" value={String(stats.actifs)} tint="#eef2ff" textTint="#4338ca" />
        <StatCard icon={<ShoppingCart size={20} />} label="Commandes ce mois" value={String(stats.commandes)} tint="#dbeafe" textTint="#1e40af" />
        <StatCard icon={<Euro size={20} />} label="Total dépensé" value={fmt(stats.depense)} tint="#dcfce7" textTint="#166534" />
      </div>

      <motion.div
        variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}
      >
        {fournisseurs.map((f) => (
          <motion.div key={f.id} variants={item} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, flexShrink: 0,
              }}>
                {f.nom.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{f.nom}</div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: CATEGORY_COLORS[f.categorie].bg,
                    color: CATEGORY_COLORS[f.categorie].text,
                  }}>{f.categorie}</span>
                </div>
                <div style={{ marginTop: 4 }}><Stars value={f.note} /></div>
              </div>
              <button
                onClick={() => openEdit(f)}
                style={{
                  padding: '4px 10px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#334155',
                }}
              >Modifier</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: 13, color: '#475569' }}>
              <Line icon={<User size={13} />} text={f.contactNom} />
              <Line icon={<Mail size={13} />} text={f.email} />
              <Line icon={<Phone size={13} />} text={f.telephone} />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              padding: 12, background: '#f8fafc', borderRadius: 12,
            }}>
              <Mini icon={<Truck size={14} />} label="Délai moyen" value={`${f.delaiLivraison} j`} />
              <Mini icon={<Package size={14} />} label="En cours" value={String(f.commandesEnCours)} highlight={f.commandesEnCours > 0} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button style={{
                flex: 1, padding: '9px 12px', background: '#0f172a', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <ShoppingCart size={13} /> Nouvelle commande
              </button>
              <button
                onClick={() => setHistoryFor(f)}
                style={{
                  flex: 1, padding: '9px 12px', background: '#fff', color: '#334155',
                  border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <History size={13} /> Historique
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {modalOpen && (
        <Overlay onClose={() => setModalOpen(false)}>
          <FournisseurForm initial={editing} onSave={save} onCancel={() => setModalOpen(false)} />
        </Overlay>
      )}
      {historyFor && (
        <Overlay onClose={() => setHistoryFor(null)}>
          <HistoryPanel f={historyFor} onClose={() => setHistoryFor(null)} />
        </Overlay>
      )}
    </div>
  );
}

/* ─── subs ─── */
function StatCard({
  icon, label, value, tint, textTint,
}: { icon: React.ReactNode; label: string; value: string; tint: string; textTint: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: tint, color: textTint,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function Line({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ color: '#94a3b8', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
}

function Mini({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 700, marginTop: 2,
        color: highlight ? '#b45309' : '#0f172a',
      }}>{value}</div>
    </div>
  );
}

/* ─── form ─── */
function FournisseurForm({
  initial, onSave, onCancel,
}: { initial: Fournisseur | null; onSave: (f: Fournisseur) => void; onCancel: () => void }) {
  const [f, setF] = useState<Fournisseur>(initial ?? {
    id: Math.random().toString(36).slice(2),
    nom: '', categorie: 'Alimentation', contactNom: '',
    email: '', telephone: '', delaiLivraison: 2, note: 4.0,
    commandesEnCours: 0, adresse: '', actif: true,
  });

  const update = <K extends keyof Fournisseur>(k: K, v: Fournisseur[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {initial ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <Field label="Nom du fournisseur">
            <input value={f.nom} onChange={(e) => update('nom', e.target.value)} style={inputStyle} placeholder="ex: Metro Luxembourg" />
          </Field>
          <Field label="Catégorie">
            <select value={f.categorie} onChange={(e) => update('categorie', e.target.value as Categorie)} style={inputStyle}>
              <option>Alimentation</option><option>Boissons</option>
              <option>Produits d'entretien</option><option>Équipement</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nom du contact">
            <input value={f.contactNom} onChange={(e) => update('contactNom', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Téléphone">
            <input value={f.telephone} onChange={(e) => update('telephone', e.target.value)} style={inputStyle} placeholder="+352 …" />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={f.email} onChange={(e) => update('email', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Adresse">
          <input value={f.adresse} onChange={(e) => update('adresse', e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Délai livraison (j)">
            <input type="number" value={f.delaiLivraison} onChange={(e) => update('delaiLivraison', Number(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Note / 5">
            <input type="number" step="0.1" min="0" max="5" value={f.note} onChange={(e) => update('note', Number(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Statut">
            <select value={f.actif ? '1' : '0'} onChange={(e) => update('actif', e.target.value === '1')} style={inputStyle}>
              <option value="1">Actif</option><option value="0">Inactif</option>
            </select>
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <button onClick={onCancel} style={ghostBtn}>Annuler</button>
        <button onClick={() => onSave(f)} style={primaryBtn}>Enregistrer</button>
      </div>
    </div>
  );
}

/* ─── history panel (mock) ─── */
function HistoryPanel({ f, onClose }: { f: Fournisseur; onClose: () => void }) {
  const history = [
    { num: 'CMD-2026-041', date: '2026-04-10', montant: 420.50, statut: 'Reçue' },
    { num: 'CMD-2026-035', date: '2026-03-28', montant: 612.00, statut: 'Reçue' },
    { num: 'CMD-2026-028', date: '2026-03-14', montant: 285.75, statut: 'Reçue' },
    { num: 'CMD-2026-019', date: '2026-02-22', montant: 540.20, statut: 'Reçue' },
  ];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Historique — {f.nom}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={thStyle}>N° commande</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Montant</th>
            <th style={thStyle}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.num} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={tdStyle}><strong>{h.num}</strong></td>
              <td style={tdStyle}>{new Date(h.date).toLocaleDateString('fr-LU')}</td>
              <td style={tdStyle}>{fmt(h.montant)}</td>
              <td style={tdStyle}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: '#dcfce7', color: '#166534',
                }}>{h.statut}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0f172a',
  boxSizing: 'border-box',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#64748b',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
};
const tdStyle: React.CSSProperties = { padding: '10px', fontSize: 13 };
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#334155',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#0f172a', color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
