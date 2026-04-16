import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, LayoutGrid, Users, Settings2, Printer, Percent,
  Plus, Trash2, Edit3, ArrowLeft, Check, X, Upload, Download,
  AlertTriangle, Wifi, TestTube2, Save, Power,
} from 'lucide-react'

interface Props { onBack?: () => void }

type ConfigTab = 'menu' | 'tables' | 'employees' | 'settings' | 'printers' | 'taxes'

// ── Mock data ────────────────────────────────────────────────────────────
interface MenuRow { id: string; emoji: string; name: string; category: string; price: number; active: boolean }
interface StaffRow { id: string; name: string; pin: string; role: string }
interface TaxRow { id: string; rate: number; label: string; description: string; active: boolean }

const INITIAL_MENU: MenuRow[] = [
  { id: 'm1', emoji: '🍺', name: 'Bière blonde 25cl', category: 'Bières',  price: 3.80, active: true },
  { id: 'm2', emoji: '🍷', name: 'Verre de vin rouge', category: 'Vins',   price: 5.50, active: true },
  { id: 'm3', emoji: '☕', name: 'Espresso',           category: 'Chaudes', price: 2.20, active: true },
  { id: 'm4', emoji: '🍔', name: 'Burger maison',      category: 'Plats',  price: 14.50, active: true },
  { id: 'm5', emoji: '🍕', name: 'Pizza margherita',   category: 'Plats',  price: 12.00, active: true },
  { id: 'm6', emoji: '🥗', name: 'Salade César',       category: 'Plats',  price: 11.80, active: false },
  { id: 'm7', emoji: '🍰', name: 'Tiramisu',           category: 'Desserts', price: 6.50, active: true },
  { id: 'm8', emoji: '🥤', name: 'Coca-Cola 33cl',     category: 'Softs',  price: 3.20, active: true },
]

const INITIAL_STAFF: StaffRow[] = [
  { id: 's1', name: 'Sophie Martin',   pin: '1234', role: 'Manager' },
  { id: 's2', name: 'Marc Dubois',     pin: '5678', role: 'Serveur' },
  { id: 's3', name: 'Julie Lefèvre',   pin: '9012', role: 'Chef' },
  { id: 's4', name: 'Alex Weber',      pin: '3456', role: 'Commis' },
  { id: 's5', name: 'Nora Schmitt',    pin: '7890', role: 'Barmaid' },
]

const INITIAL_TAXES: TaxRow[] = [
  { id: 't1', rate: 3,  label: 'Super réduit', description: 'Aliments de base, livres, journaux', active: true },
  { id: 't2', rate: 8,  label: 'Réduit',        description: 'Restaurant, coiffure, gaz, électricité', active: true },
  { id: 't3', rate: 14, label: 'Intermédiaire', description: 'Vin, publications, alimentation pour animaux', active: true },
  { id: 't4', rate: 17, label: 'Standard',      description: 'Taux normal (biens et services hors exceptions)', active: true },
]

// ── Styles ──────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 10, color: '#64748b', fontWeight: 700,
  marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9,
  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0', fontSize: 13, outline: 'none',
}
const th: React.CSSProperties = {
  padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}
const td: React.CSSProperties = { padding: '11px 14px', fontSize: 13, color: '#cbd5e1' }
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
  border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)',
  color: '#a5b4fc', fontSize: 12, fontWeight: 700,
}
const iconBtn = (color: string): React.CSSProperties => ({
  padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
  border: `1px solid ${color}40`, background: `${color}12`, color,
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
})

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      background: '#0a0a14', borderRadius: 16, padding: 22,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22, borderRadius: 999, cursor: 'pointer',
        border: 'none', padding: 2, position: 'relative',
        background: value ? '#6366f1' : 'rgba(255,255,255,0.1)',
        transition: 'background .15s',
      }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: value ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform .15s',
      }} />
    </button>
  )
}

// ── Menu tab ─────────────────────────────────────────────────────────────
function MenuTab() {
  const [items, setItems] = useState(INITIAL_MENU)

  function toggle(id: string) { setItems(v => v.map(i => i.id === id ? { ...i, active: !i.active } : i)) }
  function remove(id: string) { setItems(v => v.filter(i => i.id !== id)) }

  return (
    <Panel title="Catalogue produits"
      action={<button style={primaryBtn}><Plus size={13} /> Nouveau produit</button>}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Produit</th>
            <th style={th}>Catégorie</th>
            <th style={th}>Prix</th>
            <th style={th}>Actif</th>
            <th style={th}>Actions</th>
          </tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: it.active ? 1 : 0.5 }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{it.emoji}</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{it.name}</span>
                  </div>
                </td>
                <td style={td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                  }}>{it.category}</span>
                </td>
                <td style={{ ...td, fontWeight: 700, color: '#e2e8f0' }}>{it.price.toFixed(2)} €</td>
                <td style={td}><Toggle value={it.active} onChange={() => toggle(it.id)} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={iconBtn('#94a3b8')}><Edit3 size={12} /></button>
                    <button onClick={() => remove(it.id)} style={iconBtn('#f43f5e')}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

// ── Tables tab ───────────────────────────────────────────────────────────
function TablesTab() {
  return (
    <Panel title="Plan des tables">
      <div style={{
        padding: 28, borderRadius: 14, textAlign: 'center' as const,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06))',
        border: '1px solid rgba(99,102,241,0.15)',
      }}>
        <LayoutGrid size={42} color="#a5b4fc" style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Éditeur visuel du plan</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, maxWidth: 380, margin: '0 auto 18px' }}>
          Organisez vos tables, sections et disposition par glisser-déposer dans l'éditeur dédié.
        </div>
        <button style={{
          padding: '11px 22px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)',
          color: '#a5b4fc', fontSize: 13, fontWeight: 700,
        }}>
          Ouvrir l'éditeur de plan →
        </button>
      </div>

      <div style={{
        marginTop: 18, padding: 16, borderRadius: 12,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Résumé</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Tables total',  value: '24' },
            { label: 'Sections',      value: '3' },
            { label: 'Couverts max.', value: '96' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ── Employees tab ────────────────────────────────────────────────────────
function EmployeesTab() {
  const [staff, setStaff] = useState(INITIAL_STAFF)
  const [showPins, setShowPins] = useState(false)

  function remove(id: string) { setStaff(v => v.filter(s => s.id !== id)) }

  return (
    <Panel title="Employés & codes PIN"
      action={<div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowPins(v => !v)} style={{
          ...primaryBtn, background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
        }}>{showPins ? 'Masquer PINs' : 'Afficher PINs'}</button>
        <button style={primaryBtn}><Plus size={13} /> Ajouter employé</button>
      </div>}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Nom</th>
            <th style={th}>Rôle</th>
            <th style={th}>Code PIN</th>
            <th style={th}>Actions</th>
          </tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ ...td, fontWeight: 600, color: '#e2e8f0' }}>{s.name}</td>
                <td style={td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: s.role === 'Manager' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.12)',
                    color:      s.role === 'Manager' ? '#fb7185' : '#34d399',
                  }}>{s.role}</span>
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.15em', color: '#a5b4fc', fontWeight: 700 }}>
                  {showPins ? s.pin : '••••'}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={iconBtn('#94a3b8')}><Edit3 size={12} /></button>
                    <button onClick={() => remove(s.id)} style={iconBtn('#f43f5e')}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

// ── Settings tab ────────────────────────────────────────────────────────
function SettingsTab() {
  const [cfg, setCfg] = useState({
    name: 'Le Bistrot du Coin',
    currency: 'EUR',
    tvaDefault: 17,
    tipPresets: '5, 10, 15, 20',
    kiosqueAuto: false,
    autoLogout: 300,
  })
  const [saved, setSaved] = useState(false)

  function save() { setSaved(true); setTimeout(() => setSaved(false), 1800) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
      <Panel title="Identité restaurant">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={labelStyle}>Nom du restaurant</div>
            <input value={cfg.name} onChange={e => setCfg(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Devise</div>
            <select value={cfg.currency} onChange={e => setCfg(v => ({ ...v, currency: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="USD">USD — Dollar ($)</option>
              <option value="CHF">CHF — Franc suisse</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={labelStyle}>Logo</div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer',
            borderRadius: 10, border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 10, display: 'grid', placeItems: 'center',
              background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
            }}><Upload size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>Importer un logo</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>PNG, SVG, JPG — recommandé 512×512 px</div>
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} />
          </label>
        </div>
      </Panel>

      <Panel title="TVA & pourboires">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={labelStyle}>TVA par défaut (%)</div>
            <input type="number" value={cfg.tvaDefault} onChange={e => setCfg(v => ({ ...v, tvaDefault: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Préréglages pourboire (%, séparés par virgule)</div>
            <input value={cfg.tipPresets} onChange={e => setCfg(v => ({ ...v, tipPresets: e.target.value }))} style={inputStyle} />
          </div>
        </div>
      </Panel>

      <Panel title="Mode kiosque">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Activation automatique</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Passe automatiquement en mode kiosque après {cfg.autoLogout}s d'inactivité
            </div>
          </div>
          <Toggle value={cfg.kiosqueAuto} onChange={v => setCfg(c => ({ ...c, kiosqueAuto: v }))} />
        </div>
        {cfg.kiosqueAuto && (
          <div style={{ marginTop: 14 }}>
            <div style={labelStyle}>Délai (secondes)</div>
            <input type="number" value={cfg.autoLogout} onChange={e => setCfg(v => ({ ...v, autoLogout: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, maxWidth: 200 }} />
          </div>
        )}
      </Panel>

      <button onClick={save} style={{
        padding: '13px 0', borderRadius: 12, cursor: 'pointer', width: '100%',
        border: saved ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(99,102,241,0.4)',
        background: saved ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.15)',
        color: saved ? '#34d399' : '#a5b4fc', fontSize: 14, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .3s',
      }}>
        {saved ? <><Check size={16} /> Paramètres enregistrés</> : <><Save size={16} /> Sauvegarder</>}
      </button>
    </div>
  )
}

// ── Printers tab ────────────────────────────────────────────────────────
function PrintersTab() {
  const [caisse, setCaisse] = useState({ ip: '192.168.1.45', port: 9100, format: '80mm' })
  const [cuisine, setCuisine] = useState({ ip: '192.168.1.46', port: 9100, format: '80mm' })
  const [autoPrint, setAutoPrint] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  function test(which: string) {
    setTesting(which)
    setTimeout(() => setTesting(null), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
      <Panel title="Imprimante caisse"
        action={<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#34d399', fontWeight: 700 }}>
          <Wifi size={13} /> Connectée
        </div>}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={labelStyle}>Adresse IP</div>
            <input value={caisse.ip} onChange={e => setCaisse(v => ({ ...v, ip: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Port</div>
            <input type="number" value={caisse.port} onChange={e => setCaisse(v => ({ ...v, port: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Format</div>
            <select value={caisse.format} onChange={e => setCaisse(v => ({ ...v, format: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option>58mm</option>
              <option>80mm</option>
            </select>
          </div>
        </div>
        <button onClick={() => test('caisse')} style={{ ...primaryBtn, marginTop: 14 }}>
          <TestTube2 size={13} /> {testing === 'caisse' ? 'Envoi du test…' : 'Imprimer un test'}
        </button>
      </Panel>

      <Panel title="Imprimante cuisine"
        action={<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#34d399', fontWeight: 700 }}>
          <Wifi size={13} /> Connectée
        </div>}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={labelStyle}>Adresse IP</div>
            <input value={cuisine.ip} onChange={e => setCuisine(v => ({ ...v, ip: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Port</div>
            <input type="number" value={cuisine.port} onChange={e => setCuisine(v => ({ ...v, port: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Format</div>
            <select value={cuisine.format} onChange={e => setCuisine(v => ({ ...v, format: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option>58mm</option>
              <option>80mm</option>
            </select>
          </div>
        </div>
        <button onClick={() => test('cuisine')} style={{ ...primaryBtn, marginTop: 14 }}>
          <TestTube2 size={13} /> {testing === 'cuisine' ? 'Envoi du test…' : 'Imprimer un test'}
        </button>
      </Panel>

      <Panel title="Impression automatique">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Imprimer à la validation de commande</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Envoie automatiquement les tickets caisse et cuisine dès qu'une commande est validée.
            </div>
          </div>
          <Toggle value={autoPrint} onChange={setAutoPrint} />
        </div>
      </Panel>
    </div>
  )
}

// ── Taxes tab ───────────────────────────────────────────────────────────
function TaxesTab() {
  const [taxes, setTaxes] = useState(INITIAL_TAXES)

  function toggle(id: string) { setTaxes(v => v.map(t => t.id === id ? { ...t, active: !t.active } : t)) }

  return (
    <Panel title="Taux de TVA Luxembourg">
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {taxes.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            opacity: t.active ? 1 : 0.5,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 12, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc', fontWeight: 800, fontSize: 18,
            }}>{t.rate}%</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{t.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.description}</div>
            </div>
            <Toggle value={t.active} onChange={() => toggle(t.id)} />
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 16, padding: '10px 14px', borderRadius: 10,
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#fbbf24',
      }}>
        <AlertTriangle size={15} />
        <span>Les taux de TVA Luxembourg sont appliqués automatiquement selon la catégorie du produit.</span>
      </div>
    </Panel>
  )
}

// ── Main page ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'menu' as const,      label: 'Menu',       icon: UtensilsCrossed },
  { id: 'tables' as const,    label: 'Tables',     icon: LayoutGrid },
  { id: 'employees' as const, label: 'Employés',   icon: Users },
  { id: 'settings' as const,  label: 'Paramètres', icon: Settings2 },
  { id: 'printers' as const,  label: 'Imprimantes', icon: Printer },
  { id: 'taxes' as const,     label: 'Taxes',      icon: Percent },
]

export default function ConfigPage({ onBack }: Props) {
  const [tab, setTab] = useState<ConfigTab>('menu')
  const [showReset, setShowReset] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%', background: '#07070d', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14', flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8', display: 'grid', placeItems: 'center',
          }}><ArrowLeft size={17} /></button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Configuration POS
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Paramètres du point de vente standalone</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}><Download size={13} /> Exporter</button>
          <button style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}><Upload size={13} /> Importer</button>
          <button onClick={() => setShowReset(true)} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.1)',
            color: '#fb7185', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}><Power size={13} /> Réinitialiser données</button>
        </div>
      </div>

      {/* Horizontal tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '12px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a14', flexShrink: 0, overflowX: 'auto',
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#a5b4fc' : '#64748b',
                fontSize: 13, fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap' as const, transition: 'all .15s',
              }}>
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            {tab === 'menu'      && <MenuTab />}
            {tab === 'tables'    && <TablesTab />}
            {tab === 'employees' && <EmployeesTab />}
            {tab === 'settings'  && <SettingsTab />}
            {tab === 'printers'  && <PrintersTab />}
            {tab === 'taxes'     && <TaxesTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Reset modal */}
      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowReset(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
            }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
              style={{
                background: '#0a0a14', borderRadius: 18, padding: 26, maxWidth: 440, width: '100%',
                border: '1px solid rgba(244,63,94,0.25)',
              }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(244,63,94,0.12)', color: '#fb7185',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              }}><AlertTriangle size={28} /></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', textAlign: 'center' as const, marginBottom: 8 }}>
                Réinitialiser toutes les données ?
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' as const, lineHeight: 1.5, marginBottom: 22 }}>
                Cette action supprimera définitivement le menu, les tables, les employés et toutes les commandes en cours. Cette opération est <b style={{ color: '#fb7185' }}>irréversible</b>.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowReset(false)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                  color: '#94a3b8', fontSize: 13, fontWeight: 700,
                }}>Annuler</button>
                <button onClick={() => setShowReset(false)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.2)',
                  color: '#fb7185', fontSize: 13, fontWeight: 700,
                }}>Confirmer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
