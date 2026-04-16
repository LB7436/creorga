import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Search,
  Plus,
  X,
  Mail,
  Phone,
  MapPin,
  Euro,
  FileText,
  Calendar,
  Hash,
  TrendingUp,
  Edit3,
  ShoppingBag,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

type Sector = 'Banque' | 'Consulting' | 'IT' | 'Pharma' | 'Administration'
type ContractType = 'Tarif préférentiel -15%' | 'Facturation mensuelle' | 'Compte ouvert'

interface B2BClient {
  id: string
  company: string
  sector: Sector
  gradient: [string, string]
  contactName: string
  contactRole: string
  email: string
  phone: string
  address: string
  vat: string
  contract: ContractType
  contractActive: boolean
  totalEvents: number
  totalRevenue: number
  lastEvent: string
}

const MOCK_CLIENTS: B2BClient[] = [
  { id: 'c1', company: 'BGL BNP Paribas', sector: 'Banque', gradient: ['#0ea5e9', '#1e40af'], contactName: 'Sophie Becker', contactRole: 'Responsable RH', email: 's.becker@bgl.lu', phone: '+352 42 42 20 00', address: '50 Avenue J.F. Kennedy, L-2951 Luxembourg', vat: 'LU10708497', contract: 'Facturation mensuelle', contractActive: true, totalEvents: 14, totalRevenue: 28400, lastEvent: '2026-04-02' },
  { id: 'c2', company: 'KPMG Luxembourg', sector: 'Consulting', gradient: ['#7c3aed', '#4c1d95'], contactName: 'Marc Weiland', contactRole: 'Partner', email: 'm.weiland@kpmg.lu', phone: '+352 22 51 51 1', address: '39 Avenue John F. Kennedy, L-1855', vat: 'LU15562746', contract: 'Tarif préférentiel -15%', contractActive: true, totalEvents: 22, totalRevenue: 41250, lastEvent: '2026-04-08' },
  { id: 'c3', company: 'Deloitte', sector: 'Consulting', gradient: ['#059669', '#064e3b'], contactName: 'Julie Hoffmann', contactRole: 'Office Manager', email: 'j.hoffmann@deloitte.lu', phone: '+352 45 145 1', address: '20 Boulevard de Kockelscheuer, L-1821', vat: 'LU20011769', contract: 'Facturation mensuelle', contractActive: true, totalEvents: 9, totalRevenue: 17600, lastEvent: '2026-03-25' },
  { id: 'c4', company: 'ArcelorMittal', sector: 'Administration', gradient: ['#f97316', '#9a3412'], contactName: 'Pierre Lentz', contactRole: 'Events & Communications', email: 'p.lentz@arcelormittal.com', phone: '+352 47 92 1', address: '24-26 Boulevard d\'Avranches, L-1160', vat: 'LU17518770', contract: 'Compte ouvert', contractActive: true, totalEvents: 6, totalRevenue: 21800, lastEvent: '2026-02-12' },
  { id: 'c5', company: 'PwC Luxembourg', sector: 'Consulting', gradient: ['#e11d48', '#881337'], contactName: 'Nathalie Muller', contactRole: 'HR Director', email: 'n.muller@pwc.lu', phone: '+352 49 48 48 1', address: '2 Rue Gerhard Mercator, L-1014', vat: 'LU17564447', contract: 'Tarif préférentiel -15%', contractActive: true, totalEvents: 18, totalRevenue: 34200, lastEvent: '2026-04-10' },
  { id: 'c6', company: 'RTL Group', sector: 'IT', gradient: ['#8b5cf6', '#581c87'], contactName: 'Thomas Reuter', contactRole: 'Chef production', email: 't.reuter@rtlgroup.com', phone: '+352 24 86 1', address: '45 Boulevard Pierre Frieden, L-1543', vat: 'LU10402205', contract: 'Facturation mensuelle', contractActive: false, totalEvents: 4, totalRevenue: 8200, lastEvent: '2025-11-28' },
  { id: 'c7', company: 'SES Astra', sector: 'IT', gradient: ['#0284c7', '#0c4a6e'], contactName: 'Isabelle Roth', contactRole: 'Event Coordinator', email: 'i.roth@ses.com', phone: '+352 710 725 1', address: 'Château de Betzdorf, L-6815', vat: 'LU19729474', contract: 'Compte ouvert', contractActive: true, totalEvents: 11, totalRevenue: 19800, lastEvent: '2026-03-18' },
  { id: 'c8', company: 'Post Luxembourg', sector: 'Administration', gradient: ['#facc15', '#854d0e'], contactName: 'Paul Schumacher', contactRole: 'Direction Communication', email: 'p.schumacher@post.lu', phone: '+352 80 02 80 04', address: '20 Rue de Reims, L-2417', vat: 'LU15734515', contract: 'Tarif préférentiel -15%', contractActive: true, totalEvents: 7, totalRevenue: 12400, lastEvent: '2026-02-26' },
  { id: 'c9', company: 'Laboratoires Ketterthill', sector: 'Pharma', gradient: ['#10b981', '#064e3b'], contactName: 'Céline Jungen', contactRole: 'Admin manager', email: 'c.jungen@ketterthill.lu', phone: '+352 488 288 1', address: '37 Rue Romain Fandel, L-4149', vat: 'LU11895442', contract: 'Facturation mensuelle', contractActive: true, totalEvents: 5, totalRevenue: 9600, lastEvent: '2026-03-30' },
  { id: 'c10', company: 'Spuerkeess', sector: 'Banque', gradient: ['#0891b2', '#164e63'], contactName: 'François Origer', contactRole: 'Events Manager', email: 'f.origer@spuerkeess.lu', phone: '+352 40 15 1', address: '1 Place de Metz, L-2954', vat: 'LU14388823', contract: 'Compte ouvert', contractActive: false, totalEvents: 3, totalRevenue: 5400, lastEvent: '2025-12-05' },
]

const SECTOR_COLORS: Record<Sector, string> = {
  'Banque': '#0ea5e9',
  'Consulting': '#8b5cf6',
  'IT': '#06b6d4',
  'Pharma': '#10b981',
  'Administration': '#f97316',
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n)

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  color: '#1e293b',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function ClientsB2BPage() {
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState<Sector | 'Tous'>('Tous')
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState<B2BClient | null>(null)

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      if (sectorFilter !== 'Tous' && c.sector !== sectorFilter) return false
      if (search && !`${c.company} ${c.contactName}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [search, sectorFilter])

  const stats = [
    { label: 'Clients B2B', value: '24', icon: Building2, color: '#3b82f6' },
    { label: 'Contrats actifs', value: '8', icon: CheckCircle2, color: '#10b981' },
    { label: 'CA B2B ce mois', value: fmtEUR(3450), icon: TrendingUp, color: '#8b5cf6' },
  ]

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a' }}>Clients B2B</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Annuaire des entreprises partenaires et suivi des contrats
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: '#1e293b', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouveau client B2B
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={card}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{s.value}</div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${s.color}15`, color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div style={{ ...card, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            placeholder="Rechercher une société ou un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...input, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Tous', 'Banque', 'Consulting', 'IT', 'Pharma', 'Administration'] as const).map((s) => {
            const active = sectorFilter === s
            const color = s !== 'Tous' ? SECTOR_COLORS[s] : '#1e293b'
            return (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? color : '#e2e8f0'}`,
                  background: active ? color : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
            onClick={() => setDetail(c)}
            style={{ ...card, padding: 0, cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: 16,
              background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
              color: '#fff',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}>
                {c.company.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{c.company}</div>
                <div style={{
                  display: 'inline-block', marginTop: 4,
                  padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  background: 'rgba(255,255,255,0.25)',
                }}>
                  {c.sector}
                </div>
              </div>
            </div>

            <div style={{ padding: 16, flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.contactName}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{c.contactRole}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                    <Mail size={12} /> {c.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                    <Phone size={12} /> {c.phone}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, lineHeight: 1.4, display: 'flex', gap: 4 }}>
                <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{c.address}</span>
              </div>

              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', marginBottom: 12 }}>
                <Hash size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {c.vat}
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', background: c.contractActive ? '#dcfce7' : '#f1f5f9',
                borderRadius: 8, marginBottom: 12,
              }}>
                {c.contractActive
                  ? <CheckCircle2 size={13} style={{ color: '#15803d' }} />
                  : <AlertCircle size={13} style={{ color: '#94a3b8' }} />}
                <div style={{ fontSize: 12, fontWeight: 600, color: c.contractActive ? '#15803d' : '#64748b' }}>
                  {c.contract}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                <MiniStat label="Évts" value={String(c.totalEvents)} />
                <MiniStat label="CA cumulé" value={fmtEUR(c.totalRevenue)} />
                <MiniStat label="Dernier" value={new Date(c.lastEvent).toLocaleDateString('fr-LU', { day: '2-digit', month: 'short' })} />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <ActionBtn icon={ShoppingBag} label="Commande" onClick={() => {}} primary />
                <ActionBtn icon={Eye} label="Historique" onClick={() => setDetail(c)} />
                <ActionBtn icon={Edit3} label="Modifier" onClick={() => {}} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal && <NewClientModal onClose={() => setModal(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {detail && <ClientDetail client={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 6px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary }: { icon: any; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 8px',
        background: primary ? '#1e293b' : '#f8fafc',
        color: primary ? '#fff' : '#475569',
        border: primary ? 'none' : '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
      }}
    >
      <Icon size={12} /> {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  New Client Modal                                                   */
/* ------------------------------------------------------------------ */

function NewClientModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Nouveau client B2B</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Field label="Raison sociale">
              <input style={input} placeholder="Ex. BGL BNP Paribas" />
            </Field>
            <Field label="Secteur">
              <select style={input}>
                <option>Banque</option><option>Consulting</option><option>IT</option><option>Pharma</option><option>Administration</option>
              </select>
            </Field>
            <Field label="N° TVA">
              <input style={input} placeholder="LU..." />
            </Field>
            <Field label="Type de contrat">
              <select style={input}>
                <option>Tarif préférentiel -15%</option><option>Facturation mensuelle</option><option>Compte ouvert</option>
              </select>
            </Field>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Adresse facturation">
                <input style={input} placeholder="50 Avenue J.F. Kennedy, L-2951 Luxembourg" />
              </Field>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 10px' }}>Contact principal</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nom & prénom">
              <input style={input} placeholder="Sophie Becker" />
            </Field>
            <Field label="Poste">
              <input style={input} placeholder="Responsable RH" />
            </Field>
            <Field label="Email">
              <input style={input} placeholder="contact@entreprise.lu" />
            </Field>
            <Field label="Téléphone">
              <input style={input} placeholder="+352 ..." />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 18px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
            <button style={{ padding: '10px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Créer le client
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Client Detail                                                      */
/* ------------------------------------------------------------------ */

function ClientDetail({ client, onClose }: { client: B2BClient; onClose: () => void }) {
  const orders = [
    { id: 'o1', date: '2026-04-08', event: 'Cocktail annuel', amount: 3200, status: 'Payée' },
    { id: 'o2', date: '2026-02-14', event: 'Séminaire direction', amount: 2880, status: 'Payée' },
    { id: 'o3', date: '2025-12-18', event: 'Fête de fin d\'année', amount: 6400, status: 'Payée' },
    { id: 'o4', date: '2025-10-05', event: 'Lancement produit', amount: 4100, status: 'En attente' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{
          padding: 20,
          background: `linear-gradient(135deg, ${client.gradient[0]}, ${client.gradient[1]})`,
          color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{client.company}</h2>
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>{client.sector} · {client.contract}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Historique des commandes</div>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{o.event}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(o.date).toLocaleDateString('fr-LU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fmtEUR(o.amount)}</div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: o.status === 'Payée' ? '#dcfce7' : '#fef3c7',
                    color: o.status === 'Payée' ? '#15803d' : '#b45309',
                  }}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
            <SummaryBox label="Total événements" value={String(client.totalEvents)} icon={Calendar} />
            <SummaryBox label="CA cumulé" value={fmtEUR(client.totalRevenue)} icon={Euro} />
            <SummaryBox label="Moyenne / évt" value={fmtEUR(client.totalRevenue / client.totalEvents)} icon={TrendingUp} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button style={{ flex: 1, padding: '10px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Plus size={15} /> Nouvelle commande
            </button>
            <button style={{ flex: 1, padding: '10px 14px', background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <FileText size={15} /> Voir factures
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SummaryBox({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
        <Icon size={13} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}
