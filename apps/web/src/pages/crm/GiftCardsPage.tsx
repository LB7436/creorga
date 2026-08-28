import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Copy, Gift, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

type GiftCard = { id: string; code: string; initialValue: number; currentBalance: number; expiresAt: string | null; isActive: boolean; createdAt: string }

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ initialValue: '50', expiresAt: '' })
  const load = useCallback(async () => { setLoading(true); try { setCards((await api.get<GiftCard[]>('/crm/gift-cards')).data) } catch (error: any) { toastError(error?.response?.data?.message || 'Chargement impossible') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  async function create(event: React.FormEvent) { event.preventDefault(); try { await api.post('/crm/gift-cards', { initialValue: Number(form.initialValue), expiresAt: form.expiresAt || null }); await load(); toastSuccess('Carte cadeau créée') } catch (error: any) { toastError(error?.response?.data?.message || 'Création impossible') } }
  async function copy(code: string) { await navigator.clipboard.writeText(code); toastSuccess('Code copié') }
  return <main style={page}><header style={header}><div><p style={eyebrow}>Fichier clients</p><h1 style={title}>Cartes cadeaux</h1><p style={subtitle}>Codes et soldes réellement enregistrés.</p></div><button onClick={() => void load()} style={secondary}><RefreshCw size={16} /> Actualiser</button></header><form onSubmit={create} style={card}><h2 style={h2}><Gift size={19} /> Créer une carte</h2><div style={grid}><label style={label}>Montant initial (€)<input required type="number" min="1" step="0.01" value={form.initialValue} onChange={(e) => setForm({ ...form, initialValue: e.target.value })} style={input} /></label><label style={label}>Expiration (facultative)<input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} style={input} /></label></div><button style={primary}>Créer et générer le code</button></form><section style={card}>{loading ? <Empty text="Chargement…" /> : cards.length === 0 ? <Empty text="Aucune carte cadeau." /> : cards.map((item) => <article key={item.id} style={row}><div><strong style={{ fontFamily: 'monospace', fontSize: 17 }}>{item.code}</strong><div style={small}>Solde {item.currentBalance.toFixed(2)} € / {item.initialValue.toFixed(2)} €{item.expiresAt ? ` · expire le ${new Date(item.expiresAt).toLocaleDateString('fr-LU')}` : ''}</div></div><button onClick={() => void copy(item.code)} style={secondary}><Copy size={15} /> Copier</button></article>)}</section></main>
}
function Empty({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12 }}>{text}</div> }
const page: CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '26px 20px 50px', color: '#0f172a' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }
const eyebrow: CSSProperties = { margin: 0, color: '#be185d', fontSize: 12, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.1em' }
const title: CSSProperties = { margin: '4px 0 0', fontSize: 32, letterSpacing: '-.03em' }
const subtitle: CSSProperties = { color: '#64748b', margin: '7px 0 0' }
const card: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)', marginBottom: 16 }
const h2: CSSProperties = { margin: '0 0 14px', fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 11, marginBottom: 13 }
const label: CSSProperties = { display: 'grid', gap: 5, color: '#475569', fontSize: 12, fontWeight: 700 }
const input: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 10px', color: '#0f172a', background: '#fff', font: 'inherit' }
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: '9px 13px', background: '#be185d', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const secondary: CSSProperties = { ...primary, background: '#fff', color: '#334155', border: '1px solid #cbd5e1' }
const row: CSSProperties = { padding: 13, border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }
const small: CSSProperties = { color: '#64748b', fontSize: 12 }
