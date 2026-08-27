import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import { Building2, Image as ImageIcon, Mail, MapPin, Phone, Save, Upload } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'

type CompanyForm = {
  name: string
  legalName: string
  vatNumber: string
  address: string
  phone: string
  email: string
  logo: string | null
}

const EMPTY: CompanyForm = {
  name: '', legalName: '', vatNumber: '', address: '', phone: '', email: '', logo: null,
}

export default function AdminCompany() {
  const company = useAuthStore((state) => state.company)
  const updateActiveCompany = useAuthStore((state) => state.updateActiveCompany)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CompanyForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!company) return
    setForm({
      name: company.name ?? '',
      legalName: company.legalName ?? '',
      vatNumber: company.vatNumber ?? '',
      address: company.address ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      logo: company.logo ?? null,
    })
    setDirty(false)
  }, [company])

  const update = (key: keyof CompanyForm, value: string | null) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toastError('Format accepté : PNG, JPG, WebP ou SVG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError('Le logo ne peut pas dépasser 2 Mo')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update('logo', String(reader.result))
    reader.onerror = () => toastError('Impossible de lire cette image')
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (!company || !form.name.trim()) {
      toastError("Le nom de l'établissement est obligatoire")
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put(`/companies/${company.id}`, {
        ...form,
        name: form.name.trim(),
      })
      updateActiveCompany(data)
      setDirty(false)
      toastSuccess('Informations enregistrées sur le serveur')
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Impossible d'enregistrer l'établissement")
    } finally {
      setSaving(false)
    }
  }

  if (!company) return <div style={{ ...cardStyle, color: '#64748b' }}>Aucun établissement actif.</div>

  return (
    <div style={{ color: '#172033', maxWidth: 1040, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: '-0.03em' }}>Mon établissement</h1>
        <p style={{ color: '#64748b', margin: '7px 0 0' }}>
          Ces informations sont partagées entre vos factures, votre portail client et votre administration.
        </p>
      </header>

      <section style={cardStyle}>
        <div style={sectionTitle}><ImageIcon size={19} /> Identité visuelle</div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Choisir un logo" style={logoButton}>
            {form.logo
              ? <img src={form.logo} alt="Logo actuel" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <><Upload size={28} /><span>Ajouter un logo</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={handleLogo} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <strong>Logo officiel</strong>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.55, margin: '5px 0 10px' }}>
              PNG, JPG, WebP ou SVG, maximum 2 Mo. Le fichier est sauvegardé seulement après avoir cliqué sur Enregistrer.
            </p>
            {form.logo && <button type="button" onClick={() => update('logo', null)} style={secondaryButton}>Retirer le logo</button>}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionTitle}><Building2 size={19} /> Informations légales</div>
        <div style={gridStyle}>
          <Field label="Nom affiché *" value={form.name} onChange={(value) => update('name', value)} />
          <Field label="Raison sociale" value={form.legalName} onChange={(value) => update('legalName', value)} />
          <Field label="Numéro de TVA" value={form.vatNumber} onChange={(value) => update('vatNumber', value)} />
          <Field label="Adresse complète" value={form.address} onChange={(value) => update('address', value)} icon={<MapPin size={16} />} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionTitle}><Phone size={19} /> Contact</div>
        <div style={gridStyle}>
          <Field label="Téléphone" value={form.phone} onChange={(value) => update('phone', value)} icon={<Phone size={16} />} type="tel" />
          <Field label="Email public" value={form.email} onChange={(value) => update('email', value)} icon={<Mail size={16} />} type="email" placeholder="contact@n8nautomatisations.org" />
        </div>
      </section>

      <div style={{ ...saveBar, borderColor: dirty ? '#bfdbfe' : '#e2e8f0' }}>
        <span style={{ color: dirty ? '#1d4ed8' : '#64748b', fontSize: 13 }}>
          {dirty ? 'Modifications non enregistrées' : 'Toutes les modifications sont enregistrées'}
        </span>
        <button type="button" onClick={save} disabled={!dirty || saving} style={{ ...primaryButton, opacity: !dirty || saving ? 0.55 : 1, cursor: !dirty || saving ? 'default' : 'pointer' }}>
          <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, icon, type = 'text', placeholder }: {
  label: string; value: string; onChange: (value: string) => void; icon?: ReactNode; type?: string; placeholder?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#475569' }}>
      {label}
      <span style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>{icon}</span>}
        <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)}
          style={{ ...inputStyle, paddingLeft: icon ? 38 : 12 }} />
      </span>
    </label>
  )
}

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const sectionTitle: CSSProperties = { display: 'flex', gap: 9, alignItems: 'center', fontSize: 16, fontWeight: 800, marginBottom: 18 }
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }
const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10, font: 'inherit', color: '#172033', outlineColor: '#2563eb', background: '#fff' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '11px 17px', color: '#fff', background: '#1d4ed8', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: 8 }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '8px 12px', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 650 }
const logoButton: CSSProperties = { width: 132, height: 132, flex: '0 0 auto', border: '1px dashed #94a3b8', borderRadius: 18, background: '#f8fafc', color: '#64748b', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, cursor: 'pointer', overflow: 'hidden', padding: 14 }
const saveBar: CSSProperties = { position: 'sticky', bottom: 16, zIndex: 5, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)', border: '1px solid', borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, boxShadow: '0 12px 35px rgba(15,23,42,.12)' }
