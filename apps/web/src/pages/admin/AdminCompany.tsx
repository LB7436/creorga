import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Building2, Upload, MapPin, Phone, Clock, Landmark, Share2,
  Check, X, Save, Image as ImageIcon, Facebook, Instagram, Globe,
} from 'lucide-react'

type DayKey = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

interface DaySchedule {
  open: boolean
  openTime: string
  closeTime: string
  lunch: boolean
  dinner: boolean
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

const INITIAL_SCHEDULE: Record<DayKey, DaySchedule> = {
  lundi:     { open: true,  openTime: '11:30', closeTime: '23:00', lunch: true,  dinner: true  },
  mardi:     { open: true,  openTime: '11:30', closeTime: '23:00', lunch: true,  dinner: true  },
  mercredi:  { open: true,  openTime: '11:30', closeTime: '23:00', lunch: true,  dinner: true  },
  jeudi:     { open: true,  openTime: '11:30', closeTime: '23:00', lunch: true,  dinner: true  },
  vendredi:  { open: true,  openTime: '11:30', closeTime: '00:00', lunch: true,  dinner: true  },
  samedi:    { open: true,  openTime: '12:00', closeTime: '00:00', lunch: true,  dinner: true  },
  dimanche:  { open: false, openTime: '12:00', closeTime: '22:00', lunch: false, dinner: false },
}

const styles = {
  page: { padding: '0', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { marginBottom: 24 },
  h1: { fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
    padding: 24, marginBottom: 20, boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 18 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  input: {
    padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10,
    fontSize: 14, color: '#1e293b', background: '#fff', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  saveBar: {
    position: 'sticky' as const, bottom: 16, display: 'flex', justifyContent: 'flex-end',
    padding: 16, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
    borderRadius: 14, border: '1px solid #e2e8f0', marginTop: 24,
  },
  button: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px',
    background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'transform 0.1s, opacity 0.15s',
  },
}

export default function AdminCompany() {
  const [logo, setLogo] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nomCommercial: 'Café um Rond-Point',
    raisonSociale: 'Café um Rond-Point S.à r.l.',
    siret: 'LU2019B41287',
    tva: 'LU28734591',
    haccp: 'HACCP-LU-2841-RP',
    rue: '12 Avenue de la Liberté',
    codePostal: '1930',
    ville: 'Luxembourg-Ville',
    pays: 'Luxembourg',
    telPrincipal: '+352 27 12 34 56',
    telReservation: '+352 27 12 34 57',
    email: 'contact@cafe-rondpoint.lu',
    website: 'https://cafe-rondpoint.lu',
    iban: 'LU28 0019 4006 4475 0000',
    bic: 'BCEELULL',
    banque: 'BCEE Luxembourg',
    facebook: 'https://facebook.com/caferondpoint',
    instagram: 'https://instagram.com/cafe_rondpoint',
    google: 'https://g.page/cafe-rondpoint',
  })

  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(INITIAL_SCHEDULE)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogo(ev.target?.result as string)
      toast.success('Logo chargé')
    }
    reader.readAsDataURL(file)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const updateField = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }))

  const updateSchedule = (day: DayKey, patch: Partial<DaySchedule>) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))

  const handleSave = () => {
    toast.success('Informations enregistrées avec succès', { duration: 2500, icon: '✓' })
  }

  const Field = ({ label, value, onChange, placeholder, span }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; span?: number }) => (
    <div style={{ ...styles.field, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
      />
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Informations de l'entreprise</h1>
        <p style={styles.subtitle}>Gérez l'identité légale et opérationnelle de votre établissement</p>
      </div>

      {/* Logo upload */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={styles.card}>
        <div style={styles.sectionTitle}><ImageIcon size={18} color="#3b82f6" /> Logo de l'établissement</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              width: 160, height: 160, border: `2px dashed ${dragOver ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: dragOver ? '#eff6ff' : '#f8fafc',
              overflow: 'hidden', transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {logo ? (
              <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Upload size={28} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, fontWeight: 500 }}>Cliquer ou déposer</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: '#334155', margin: '0 0 8px', fontWeight: 500 }}>
              Téléversez le logo de votre restaurant
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              Format recommandé : PNG ou SVG, fond transparent, 512×512 px minimum.
              Ce logo apparaîtra sur vos tickets, factures et sur le QR menu.
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ marginTop: 14, padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer' }}
            >
              Choisir un fichier
            </button>
          </div>
        </div>
      </motion.div>

      {/* Identité */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={styles.card}>
        <div style={styles.sectionTitle}><Building2 size={18} color="#8b5cf6" /> Identité</div>
        <div style={styles.grid2}>
          <Field label="Nom commercial" value={form.nomCommercial} onChange={(v) => updateField('nomCommercial', v)} />
          <Field label="Raison sociale" value={form.raisonSociale} onChange={(v) => updateField('raisonSociale', v)} />
          <Field label="N° entreprise Luxembourg" value={form.siret} onChange={(v) => updateField('siret', v)} placeholder="LU..." />
          <Field label="N° TVA" value={form.tva} onChange={(v) => updateField('tva', v)} placeholder="LU12345678" />
          <Field label="N° d'établissement HACCP" value={form.haccp} onChange={(v) => updateField('haccp', v)} span={2} />
        </div>
      </motion.div>

      {/* Adresse */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={styles.card}>
        <div style={styles.sectionTitle}><MapPin size={18} color="#ef4444" /> Adresse</div>
        <div style={styles.grid3}>
          <Field label="Rue" value={form.rue} onChange={(v) => updateField('rue', v)} span={3} />
          <Field label="Code postal" value={form.codePostal} onChange={(v) => updateField('codePostal', v)} />
          <Field label="Ville" value={form.ville} onChange={(v) => updateField('ville', v)} />
          <Field label="Pays" value={form.pays} onChange={(v) => updateField('pays', v)} />
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={styles.card}>
        <div style={styles.sectionTitle}><Phone size={18} color="#10b981" /> Contact</div>
        <div style={styles.grid2}>
          <Field label="Téléphone principal" value={form.telPrincipal} onChange={(v) => updateField('telPrincipal', v)} />
          <Field label="Téléphone de réservation" value={form.telReservation} onChange={(v) => updateField('telReservation', v)} />
          <Field label="Email" value={form.email} onChange={(v) => updateField('email', v)} />
          <Field label="Site web" value={form.website} onChange={(v) => updateField('website', v)} />
        </div>
      </motion.div>

      {/* Horaires */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={styles.card}>
        <div style={styles.sectionTitle}><Clock size={18} color="#f59e0b" /> Horaires d'ouverture</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map(({ key, label }) => {
            const d = schedule[key]
            return (
              <div key={key} style={{
                display: 'grid', gridTemplateColumns: '120px 110px 1fr 1fr auto auto', gap: 14, alignItems: 'center',
                padding: '12px 14px', background: d.open ? '#f8fafc' : '#fef2f2',
                borderRadius: 12, border: `1px solid ${d.open ? '#e2e8f0' : '#fecaca'}`,
              }}>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{label}</div>
                <button
                  onClick={() => updateSchedule(key, { open: !d.open })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                    background: d.open ? '#dcfce7' : '#fee2e2', color: d.open ? '#16a34a' : '#dc2626',
                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {d.open ? <Check size={12} /> : <X size={12} />}
                  {d.open ? 'Ouvert' : 'Fermé'}
                </button>
                <input type="time" value={d.openTime} disabled={!d.open}
                  onChange={(e) => updateSchedule(key, { openTime: e.target.value })}
                  style={{ ...styles.input, padding: '8px 10px', opacity: d.open ? 1 : 0.4 }} />
                <input type="time" value={d.closeTime} disabled={!d.open}
                  onChange={(e) => updateSchedule(key, { closeTime: e.target.value })}
                  style={{ ...styles.input, padding: '8px 10px', opacity: d.open ? 1 : 0.4 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={d.lunch} disabled={!d.open}
                    onChange={(e) => updateSchedule(key, { lunch: e.target.checked })} />
                  Midi
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={d.dinner} disabled={!d.open}
                    onChange={(e) => updateSchedule(key, { dinner: e.target.checked })} />
                  Soir
                </label>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Bancaire */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={styles.card}>
        <div style={styles.sectionTitle}><Landmark size={18} color="#6366f1" /> Informations bancaires</div>
        <div style={styles.grid3}>
          <Field label="IBAN" value={form.iban} onChange={(v) => updateField('iban', v)} span={2} />
          <Field label="BIC" value={form.bic} onChange={(v) => updateField('bic', v)} />
          <Field label="Banque" value={form.banque} onChange={(v) => updateField('banque', v)} span={3} />
        </div>
      </motion.div>

      {/* Réseaux */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={styles.card}>
        <div style={styles.sectionTitle}><Share2 size={18} color="#ec4899" /> Réseaux sociaux</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: <Facebook size={16} color="#1877f2" />, label: 'Facebook', k: 'facebook' as const },
            { icon: <Instagram size={16} color="#e4405f" />, label: 'Instagram', k: 'instagram' as const },
            { icon: <Globe size={16} color="#4285f4" />, label: 'Google Business', k: 'google' as const },
          ].map(({ icon, label, k }) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>{label}</label>
                <input
                  style={styles.input} value={form[k]}
                  onChange={(e) => updateField(k, e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div style={styles.saveBar}>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave} style={styles.button}
        >
          <Save size={16} /> Enregistrer les modifications
        </motion.button>
      </div>
    </motion.div>
  )
}
