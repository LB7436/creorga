import { useMemo, useState } from 'react'
import { usePOS } from '../store/posStore'
import { api, sessionCompany } from '../lib/server'

/** Commandes publiques réelles : aucun encaissement ni compte employé dans le kiosque. */
export default function KioskPage({ onExit }: { onExit: () => void }) {
  const menu = usePOS(s => s.menu)
  const tables = usePOS(s => s.tables)
  const name = usePOS(s => s.settings.restaurantName)
  const categories = [...new Set(menu.filter(m => m.active).map(m => m.category))]
  const [category, setCategory] = useState(categories[0] || '')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [tableId, setTableId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [large, setLarge] = useState(false)
  const [contrast, setContrast] = useState(false)
  const items = useMemo(() => Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => ({ product: menu.find(p => p.id === id)!, qty })).filter(i => i.product), [cart, menu])
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0)
  const button = { border: '1px solid #a78bfa', borderRadius: 12, padding: '12px 18px', color: 'white', background: '#5423a2', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
  const input = { width: '100%', boxSizing: 'border-box' as const, background: contrast ? '#000' : '#181827', color: 'white', border: '1px solid #b1b7c9', borderRadius: 12, padding: 14, font: 'inherit' }
  function add(id: string, delta = 1) { setCart(c => ({ ...c, [id]: Math.max(0, Math.min(50, (c[id] || 0) + delta)) })) }
  async function send() {
    if (busy || !items.length || !tableId) return
    setBusy(true); setError('')
    const companyId = sessionCompany()
    const key = `creorga-kiosk-request:${companyId}:${tableId}:${JSON.stringify(cart)}`
    try {
      const requestId = sessionStorage.getItem(key) || crypto.randomUUID()
      sessionStorage.setItem(key, requestId)
      const result = await api('/guest/orders', { method: 'POST', body: JSON.stringify({ companyId, tableId, requestId, items: items.map(i => ({ productId: i.product.id, qty: i.qty })) }) })
      setOrder(result); setCart({}); sessionStorage.removeItem(key)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  return <main style={{ position: 'fixed', inset: 0, overflow: 'auto', background: contrast ? '#000' : '#090915', color: '#f8fafc', padding: 20, fontFamily: 'system-ui', fontSize: large ? 21 : 16 }}>
    <header style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}><div style={{ flex: 1 }}><h1 style={{ marginBottom: 6 }}>{name}</h1><p>Bienvenue. Choisissez vos produits et envoyez votre commande à l’équipe.</p></div>
      <button style={button} onClick={() => setLarge(v => !v)} aria-pressed={large}>Texte agrandi</button><button style={button} onClick={() => setContrast(v => !v)} aria-pressed={contrast}>Contraste élevé</button><button style={button} onClick={onExit}>Espace équipe</button>
    </header>
    {order ? <section style={{ maxWidth: 650, margin: '60px auto', textAlign: 'center' }}><h2>Commande enregistrée ✓</h2><p>Référence : {order.id}</p><p>{order.total.toFixed(2)} € TTC · À régler avec l’équipe</p><p>Votre commande est transmise. Aucun paiement bancaire n’a été effectué sur cet écran.</p><button style={button} onClick={() => { setOrder(null); setTableId('') }}>Nouvelle commande</button></section> : <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>{categories.map(c => <button key={c} style={{ ...button, background: c === category ? '#6d28d9' : '#222235' }} onClick={() => setCategory(c)} aria-pressed={c === category}>{c}</button>)}</div>
      <label>Rechercher un produit<input style={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom du produit" /></label>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16, margin: '24px 0' }}>
        {menu.filter(p => p.active && (search ? p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) : p.category === category)).map(p => <article key={p.id} style={{ background: contrast ? '#000' : '#1c1c30', border: '1px solid #625a80', borderRadius: 18, padding: 20 }}><div aria-hidden style={{ fontSize: 36 }}>{p.emoji}</div><h2>{p.name}</h2><p>{p.price.toFixed(2)} € TTC</p><button style={button} onClick={() => add(p.id)} disabled={cart[p.id] >= 50}>Ajouter {p.name}</button>{cart[p.id] > 0 && <p>Dans le panier : {cart[p.id]}</p>}</article>)}
      </section>
      {!menu.length && <p>La carte n’est pas encore publiée. Adressez-vous à l’équipe.</p>}
      <section style={{ maxWidth: 800, margin: '20px auto', background: contrast ? '#000' : '#1b1b2d', border: '1px solid #8e83ac', borderRadius: 20, padding: 24 }}><h2>Votre commande</h2>
        {items.map(i => <div key={i.product.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 }}><strong style={{ flex: 1 }}>{i.product.name}</strong><button style={button} aria-label={`Retirer un ${i.product.name}`} onClick={() => add(i.product.id, -1)}>−</button><span>{i.qty}</span><button style={button} aria-label={`Ajouter un ${i.product.name}`} onClick={() => add(i.product.id)}>+</button><span>{(i.product.price * i.qty).toFixed(2)} €</span></div>)}
        {!items.length && <p>Votre panier est vide.</p>}
        <p>Pour les allergènes ou une demande particulière, adressez-vous à l’équipe avant de commander.</p>
        <label>Table ou point de retrait<select style={input} value={tableId} onChange={e => setTableId(e.target.value)}><option value="">Choisissez votre table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name} · {t.section}</option>)}</select></label>
        <h2>Total TTC : {total.toFixed(2)} €</h2><p>Le serveur vérifie les prix et la disponibilité avant de confirmer.</p>
        {error && <p role="alert" style={{ color: '#fecdd3' }}>{error}</p>}
        <button style={button} disabled={busy || !items.length || !tableId} onClick={send}>{busy ? 'Enregistrement…' : 'Envoyer ma commande'}</button>
      </section>
    </>}
  </main>
}
