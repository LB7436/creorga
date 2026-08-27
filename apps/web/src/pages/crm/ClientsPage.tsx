import { useMemo, useState } from 'react'
import {
  Download, Mail, MessageSquare, Pencil, Phone, Plus, RefreshCw,
  Search, Trash2, UserRound, Users, Wallet, X,
} from 'lucide-react'
import {
  type Customer,
  useAddLoyaltyPoints,
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useRechargeWallet,
  useUpdateCustomer,
} from '@/hooks/api/useCustomers'
import { downloadCsv } from '@/lib/csv'
import { toastError, toastSuccess } from '@/lib/toast'

type CustomerForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

const emptyForm: CustomerForm = { firstName: '', lastName: '', email: '', phone: '', notes: '' }
const money = new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' })

export default function ClientsPage() {
  const { data: customers = [], isLoading, isError, refetch, isFetching } = useCustomers()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const loyalty = useAddLoyaltyPoints()
  const wallet = useRechargeWallet()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [walletAmount, setWalletAmount] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    if (!query) return customers
    return customers.filter((customer) =>
      [customer.firstName, customer.lastName, customer.email, customer.phone]
        .some((value) => String(value || '').toLocaleLowerCase('fr').includes(query)),
    )
  }, [customers, search])

  const selected = customers.find((customer) => customer.id === selectedId) ?? null
  const totalPoints = customers.reduce((sum, customer) => sum + (customer.points ?? 0), 0)
  const totalWallet = customers.reduce((sum, customer) => sum + (customer.walletBalance ?? 0), 0)
  const busy = createCustomer.isPending || updateCustomer.isPending

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setEditorOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id)
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    })
    setEditorOpen(true)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const clean = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }
    if (!clean.firstName || !clean.lastName) {
      toastError('Le prénom et le nom sont obligatoires.')
      return
    }
    try {
      if (editingId) await updateCustomer.mutateAsync({ id: editingId, data: clean })
      else await createCustomer.mutateAsync(clean)
      setEditorOpen(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch {
      // Le hook affiche déjà le message d'erreur du serveur.
    }
  }

  async function remove(customer: Customer) {
    const customerLabel = `${customer.firstName} ${customer.lastName}`.trim()
    if (!window.confirm(`Supprimer définitivement la fiche de ${customerLabel} ?`)) return
    try {
      await deleteCustomer.mutateAsync(customer.id)
      if (selectedId === customer.id) setSelectedId(null)
    } catch {
      // Le hook affiche déjà le message d'erreur du serveur.
    }
  }

  async function changePoints(customer: Customer, type: 'EARN' | 'SPEND') {
    try {
      await loyalty.mutateAsync({ id: customer.id, points: 10, type })
    } catch {
      // Le hook affiche déjà le message d'erreur du serveur.
    }
  }

  async function changeWallet(customer: Customer, direction: 1 | -1) {
    const amount = Number(walletAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      toastError('Saisissez un montant positif.')
      return
    }
    try {
      await wallet.mutateAsync({ id: customer.id, amount: Math.round(amount * 100) / 100 * direction })
      setWalletAmount('')
    } catch {
      // Le hook affiche déjà le message d'erreur du serveur.
    }
  }

  function exportCustomers() {
    downloadCsv(
      `clients-creorga-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Prénom', 'Nom', 'Email', 'Téléphone', 'Points', 'Portefeuille', 'Notes'],
      filtered.map((customer) => [
        customer.firstName,
        customer.lastName,
        customer.email || '',
        customer.phone || '',
        customer.points ?? 0,
        customer.walletBalance ?? 0,
        customer.notes || '',
      ]),
    )
    toastSuccess('Le fichier CSV a été téléchargé.')
  }

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 22px 48px', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <p style={eyebrow}>Fichier clients</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', letterSpacing: '-.03em' }}>Vos clients, sans données fictives</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Chaque modification affichée ici est enregistrée sur le serveur.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={exportCustomers} style={secondaryButton} disabled={customers.length === 0}>
            <Download size={17} /> Exporter
          </button>
          <button type="button" onClick={openCreate} style={primaryButton}>
            <Plus size={18} /> Nouveau client
          </button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 26 }} className="crm-stats-grid">
        <Stat icon={<Users size={19} />} label="Clients enregistrés" value={String(customers.length)} />
        <Stat icon={<UserRound size={19} />} label="Points attribués" value={String(totalPoints)} />
        <Stat icon={<Wallet size={19} />} label="Portefeuilles" value={money.format(totalWallet)} />
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 12px 35px rgba(15,23,42,.05)' }}>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
          <Search size={18} color="#64748b" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Rechercher un client"
            placeholder="Rechercher par nom, email ou téléphone"
            style={{ flex: 1, border: 0, outline: 0, minWidth: 0, fontSize: 14, color: '#0f172a', background: 'transparent' }}
          />
          <button type="button" onClick={() => refetch()} aria-label="Actualiser les clients" style={iconButton} disabled={isFetching}>
            <RefreshCw size={17} className={isFetching ? 'crm-spin' : undefined} />
          </button>
        </div>

        {isLoading ? (
          <Empty title="Chargement des clients…" />
        ) : isError ? (
          <Empty title="Impossible de charger les clients" detail="Vérifiez la connexion au serveur puis réessayez." action={<button type="button" onClick={() => refetch()} style={primaryButton}>Réessayer</button>} />
        ) : filtered.length === 0 ? (
          <Empty
            title={search ? 'Aucun résultat' : 'Aucun client enregistré'}
            detail={search ? 'Essayez un autre terme de recherche.' : 'Créez la première fiche pour valider le parcours d’un nouveau client.'}
            action={!search ? <button type="button" onClick={openCreate} style={primaryButton}><Plus size={17} /> Créer un client</button> : undefined}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr>{['Client', 'Coordonnées', 'Points', 'Portefeuille', 'Actions'].map((heading) => <th key={heading} style={tableHead}>{heading}</th>)}</tr></thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tableCell}>
                      <button type="button" onClick={() => setSelectedId(customer.id)} style={customerButton}>
                        <span style={avatar}>{initials(customer)}</span>
                        <span><strong>{customer.firstName} {customer.lastName}</strong><small style={{ display: 'block', marginTop: 3, color: '#94a3b8' }}>{customer.notes || 'Aucune note'}</small></span>
                      </button>
                    </td>
                    <td style={tableCell}><div>{customer.email || '—'}</div><small style={{ color: '#64748b' }}>{customer.phone || '—'}</small></td>
                    <td style={tableCell}><strong>{customer.points ?? 0}</strong></td>
                    <td style={tableCell}><strong>{money.format(customer.walletBalance ?? 0)}</strong></td>
                    <td style={tableCell}>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button type="button" onClick={() => setSelectedId(customer.id)} aria-label={`Ouvrir ${customer.firstName}`} style={iconButton}><UserRound size={16} /></button>
                        <button type="button" onClick={() => openEdit(customer)} aria-label={`Modifier ${customer.firstName}`} style={iconButton}><Pencil size={16} /></button>
                        <button type="button" onClick={() => remove(customer)} aria-label={`Supprimer ${customer.firstName}`} style={{ ...iconButton, color: '#dc2626' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div role="dialog" aria-modal="true" aria-label={`Fiche de ${selected.firstName}`} style={overlay} onMouseDown={() => setSelectedId(null)}>
          <section style={drawer} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...avatar, width: 48, height: 48, fontSize: 16 }}>{initials(selected)}</span>
                <div><p style={eyebrow}>Fiche enregistrée</p><h2 style={{ margin: 0 }}>{selected.firstName} {selected.lastName}</h2></div>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
              {selected.email && <a href={`mailto:${selected.email}`} style={contactLink}><Mail size={18} /> Écrire à {selected.email}</a>}
              {selected.phone && <a href={`tel:${selected.phone}`} style={contactLink}><Phone size={18} /> Appeler {selected.phone}</a>}
              {selected.phone && <a href={`sms:${selected.phone}`} style={contactLink}><MessageSquare size={18} /> Ouvrir un SMS</a>}
              {!selected.email && !selected.phone && <p style={{ color: '#64748b' }}>Aucune coordonnée disponible.</p>}
            </div>

            <div style={actionCard}>
              <div><strong>Fidélité</strong><p style={helperText}>{selected.points ?? 0} point(s) actuellement</p></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => changePoints(selected, 'SPEND')} style={secondaryButton} disabled={(selected.points ?? 0) < 10 || loyalty.isPending}>− 10</button>
                <button type="button" onClick={() => changePoints(selected, 'EARN')} style={primaryButton} disabled={loyalty.isPending}>+ 10</button>
              </div>
            </div>

            <div style={{ ...actionCard, alignItems: 'stretch', flexDirection: 'column' }}>
              <div><strong>Portefeuille prépayé</strong><p style={helperText}>{money.format(selected.walletBalance ?? 0)} disponible</p></div>
              <input value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} inputMode="decimal" placeholder="Montant en euros" style={field} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => changeWallet(selected, -1)} style={{ ...secondaryButton, flex: 1 }} disabled={wallet.isPending}>Débiter</button>
                <button type="button" onClick={() => changeWallet(selected, 1)} style={{ ...primaryButton, flex: 1 }} disabled={wallet.isPending}>Créditer</button>
              </div>
            </div>

            {selected.notes && <div style={{ ...actionCard, display: 'block' }}><strong>Notes</strong><p style={{ ...helperText, whiteSpace: 'pre-wrap' }}>{selected.notes}</p></div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={() => openEdit(selected)} style={{ ...primaryButton, flex: 1 }}><Pencil size={17} /> Modifier</button>
              <button type="button" onClick={() => remove(selected)} style={{ ...secondaryButton, color: '#dc2626' }}><Trash2 size={17} /> Supprimer</button>
            </div>
          </section>
        </div>
      )}

      {editorOpen && (
        <div role="dialog" aria-modal="true" aria-label={editingId ? 'Modifier le client' : 'Nouveau client'} style={overlay} onMouseDown={() => setEditorOpen(false)}>
          <form onSubmit={submit} style={modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><p style={eyebrow}>{editingId ? 'Mise à jour serveur' : 'Nouvelle fiche'}</p><h2 style={{ margin: 0 }}>{editingId ? 'Modifier le client' : 'Créer un client'}</h2></div>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
              <Field label="Prénom *" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} />
              <Field label="Nom *" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} />
            </div>
            <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Field label="Téléphone" type="tel" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
            <label style={label}>Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} style={{ ...field, resize: 'vertical' }} /></label>
            <button type="submit" style={{ ...primaryButton, width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={busy}>
              {busy ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer le client'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes crm-spin { to { transform: rotate(360deg) } }
        .crm-spin { animation: crm-spin .8s linear infinite; }
        @media (max-width: 700px) { .crm-stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  )
}

function initials(customer: Customer) {
  return `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toLocaleUpperCase('fr') || 'CL'
}

function Stat({ icon, label: text, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div style={statCard}><span style={{ color: '#4f46e5' }}>{icon}</span><div><small style={{ color: '#64748b' }}>{text}</small><strong style={{ display: 'block', marginTop: 3, fontSize: 22 }}>{value}</strong></div></div>
}

function Empty({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div style={{ padding: '70px 20px', textAlign: 'center' }}><UserRound size={36} color="#cbd5e1" /><h3 style={{ margin: '14px 0 4px' }}>{title}</h3>{detail && <p style={{ color: '#64748b', margin: '0 auto 18px', maxWidth: 460 }}>{detail}</p>}{action}</div>
}

function Field({ label: text, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label style={label}>{text}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={field} /></label>
}

const eyebrow: React.CSSProperties = { margin: '0 0 6px', color: '#4f46e5', fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }
const primaryButton: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: 0, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', background: '#4f46e5', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#334155', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const iconButton: React.CSSProperties = { width: 38, height: 38, border: '1px solid #e2e8f0', borderRadius: 10, display: 'inline-grid', placeItems: 'center', color: '#475569', background: '#fff', cursor: 'pointer' }
const statCard: React.CSSProperties = { minHeight: 86, padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 13, background: '#fff' }
const tableHead: React.CSSProperties = { padding: '12px 16px', color: '#64748b', background: '#f8fafc', textAlign: 'left', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }
const tableCell: React.CSSProperties = { padding: '14px 16px', color: '#334155', fontSize: 13, verticalAlign: 'middle' }
const customerButton: React.CSSProperties = { padding: 0, border: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a', background: 'transparent', textAlign: 'left', cursor: 'pointer' }
const avatar: React.CSSProperties = { width: 38, height: 38, flex: '0 0 auto', borderRadius: 12, display: 'inline-grid', placeItems: 'center', color: '#4338ca', background: '#eef2ff', fontSize: 12, fontWeight: 850 }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,.42)', backdropFilter: 'blur(3px)' }
const drawer: React.CSSProperties = { width: 'min(100%, 480px)', height: '100%', padding: 24, overflowY: 'auto', background: '#fff', boxShadow: '-24px 0 70px rgba(15,23,42,.18)', boxSizing: 'border-box' }
const modal: React.CSSProperties = { width: 'min(calc(100% - 32px), 540px)', margin: 'auto', padding: 24, borderRadius: 22, background: '#fff', boxShadow: '0 25px 80px rgba(15,23,42,.25)', boxSizing: 'border-box' }
const contactLink: React.CSSProperties = { minHeight: 46, padding: '0 14px', border: '1px solid #dbeafe', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 9, color: '#1d4ed8', background: '#eff6ff', textDecoration: 'none', fontSize: 13, fontWeight: 650 }
const actionCard: React.CSSProperties = { marginTop: 16, padding: 16, border: '1px solid #e2e8f0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#f8fafc' }
const helperText: React.CSSProperties = { margin: '4px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }
const label: React.CSSProperties = { marginTop: 13, display: 'grid', gap: 6, color: '#334155', fontSize: 12, fontWeight: 700 }
const field: React.CSSProperties = { width: '100%', minHeight: 43, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, color: '#0f172a', background: '#fff', font: 'inherit', boxSizing: 'border-box', outlineColor: '#6366f1' }
