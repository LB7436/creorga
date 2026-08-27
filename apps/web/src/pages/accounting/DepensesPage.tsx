import { useMemo, useState, type CSSProperties } from 'react'
import { Download, ExternalLink, Plus, Receipt, Search, Trash2, X } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { toastError } from '@/lib/toast'
import { useCreateExpense, useDeleteExpense, useExpenses } from '@/hooks/api/useAccounting'

const CATEGORIES = [
  ['FOOD_COST', 'Achats alimentaires'],
  ['STAFF', 'Personnel'],
  ['UTILITIES', 'Énergie et charges'],
  ['SUPPLIES', 'Fournitures'],
  ['OTHER', 'Autre'],
] as const
const categoryName = (value: string) => CATEGORIES.find(([key]) => key === value)?.[1] ?? value
const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const today = () => new Date().toISOString().slice(0, 10)

export default function DepensesPage() {
  const expenses = useExpenses()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'FOOD_COST', amount: '', taxRate: '17', description: '', date: today(), receiptUrl: '' })

  const filtered = useMemo(() => (expenses.data ?? []).filter((expense) => {
    if (category && expense.category !== category) return false
    return `${expense.description} ${categoryName(expense.category)}`.toLowerCase().includes(search.trim().toLowerCase())
  }), [expenses.data, search, category])
  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0)
  const deductible = filtered.reduce((sum, expense) => sum + expense.amount * expense.taxRate / (100 + expense.taxRate), 0)

  const save = async () => {
    const amount = Number(form.amount)
    const taxRate = Number(form.taxRate)
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      toastError('Renseignez une description, un montant positif et un taux de TVA valide')
      return
    }
    try {
      await createExpense.mutateAsync({ category: form.category, amount, taxRate, description: form.description.trim(), date: new Date(`${form.date}T12:00:00`).toISOString(), receiptUrl: form.receiptUrl.trim() || null })
      setForm({ category: 'FOOD_COST', amount: '', taxRate: '17', description: '', date: today(), receiptUrl: '' })
      setShowForm(false)
    } catch {
      // Le hook affiche le message serveur.
    }
  }

  const exportCsv = () => downloadCsv(
    `depenses-${today()}.csv`,
    ['Date', 'Catégorie', 'Description', 'Montant TTC', 'TVA %', 'TVA déductible', 'Justificatif'],
    filtered.map((expense) => [new Date(expense.date).toLocaleDateString('fr-FR'), categoryName(expense.category), expense.description, expense.amount, expense.taxRate, expense.amount * expense.taxRate / (100 + expense.taxRate), expense.receiptUrl || '']),
  )

  return (
    <div style={{ padding: 28, color: '#172033', maxWidth: 1120, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <div><h1 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.03em' }}>Dépenses</h1><p style={{ color: '#64748b', margin: '6px 0 0' }}>Écritures réellement enregistrées pour l'établissement.</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} style={secondaryButton}><Download size={16} /> Export CSV</button>
          <button type="button" onClick={() => setShowForm(true)} style={primaryButton}><Plus size={16} /> Ajouter</button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 17 }}>
        <Metric label="Dépenses affichées" value={euro(total)} />
        <Metric label="TVA déductible estimée" value={euro(deductible)} color="#047857" />
        <Metric label="Écritures" value={String(filtered.length)} color="#1d4ed8" />
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ position: 'relative', flex: '1 1 270px' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} /><input aria-label="Rechercher une dépense" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans les descriptions" style={{ ...inputStyle, paddingLeft: 38 }} /></label>
          <select aria-label="Filtrer par catégorie" value={category} onChange={(event) => setCategory(event.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 190 }}><option value="">Toutes les catégories</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>

        {expenses.isLoading ? <Empty text="Chargement des dépenses…" /> : expenses.isError ? <div role="alert" style={errorStyle}>Impossible de charger les dépenses.</div> : filtered.length === 0 ? <Empty text="Aucune dépense ne correspond à ce filtre." /> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map((expense) => (
              <article key={expense.id} style={rowStyle}>
                <span style={receiptIcon}><Receipt size={18} /></span>
                <div style={{ minWidth: 0 }}><strong style={{ display: 'block' }}>{expense.description}</strong><span style={{ color: '#64748b', fontSize: 12 }}>{categoryName(expense.category)} · {new Date(expense.date).toLocaleDateString('fr-FR')}</span></div>
                <span style={{ color: '#64748b', fontSize: 12 }}>TVA {expense.taxRate}%</span>
                <strong style={{ whiteSpace: 'nowrap' }}>{euro(expense.amount)}</strong>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  {expense.receiptUrl && <a href={expense.receiptUrl} target="_blank" rel="noreferrer" aria-label="Ouvrir le justificatif" title="Ouvrir le justificatif" style={iconButton}><ExternalLink size={15} /></a>}
                  <button type="button" aria-label={`Supprimer ${expense.description}`} title="Supprimer" onClick={() => { if (window.confirm(`Supprimer la dépense « ${expense.description} » ?`)) void deleteExpense.mutateAsync(expense.id) }} style={{ ...iconButton, color: '#dc2626', borderColor: '#fecaca' }}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div role="dialog" aria-modal="true" aria-labelledby="expense-title" style={backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <section style={dialog}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }}><h2 id="expense-title" style={{ margin: 0 }}>Nouvelle dépense</h2><button type="button" aria-label="Fermer" onClick={() => setShowForm(false)} style={iconButton}><X size={17} /></button></header>
            <div style={{ display: 'grid', gap: 13 }}>
              <Field label="Description *"><input autoFocus value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11 }}>
                <Field label="Catégorie"><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Date"><input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} style={inputStyle} /></Field>
                <Field label="Montant TTC (€) *"><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} style={inputStyle} /></Field>
                <Field label="TVA %"><input type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))} style={inputStyle} /></Field>
              </div>
              <Field label="Lien du justificatif (facultatif)"><input type="url" value={form.receiptUrl} onChange={(event) => setForm((current) => ({ ...current, receiptUrl: event.target.value }))} placeholder="https://…" style={inputStyle} /></Field>
              <button type="button" onClick={() => void save()} disabled={createExpense.isPending} style={{ ...primaryButton, justifyContent: 'center' }}>{createExpense.isPending ? 'Enregistrement…' : 'Enregistrer sur le serveur'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color = '#172033' }: { label: string; value: string; color?: string }) { return <div style={{ ...cardStyle, marginBottom: 0 }}><span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{label}</span><strong style={{ display: 'block', fontSize: 22, color, marginTop: 4 }}>{value}</strong></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 750 }}>{label}{children}</label> }
function Empty({ text }: { text: string }) { return <div style={{ padding: 32, borderRadius: 12, background: '#f8fafc', textAlign: 'center', color: '#64748b' }}>{text}</div> }

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 17, padding: 19, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '10px 15px', background: '#1d4ed8', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 13px', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const inputStyle: CSSProperties = { width: '100%', minWidth: 0, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px', color: '#172033', background: '#fff', font: 'inherit', outlineColor: '#2563eb' }
const rowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '42px minmax(180px,1fr) 90px 100px 78px', gap: 11, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: 11 }
const receiptIcon: CSSProperties = { width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#1d4ed8' }
const iconButton: CSSProperties = { width: 34, height: 34, boxSizing: 'border-box', display: 'grid', placeItems: 'center', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#475569', cursor: 'pointer', textDecoration: 'none' }
const errorStyle: CSSProperties = { padding: 13, borderRadius: 10, border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2' }
const backdrop: CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center', padding: 18, backdropFilter: 'blur(4px)' }
const dialog: CSSProperties = { background: '#fff', borderRadius: 18, padding: 23, width: 'min(580px,100%)', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', boxShadow: '0 25px 80px rgba(15,23,42,.3)' }
