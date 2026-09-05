import { useEffect, useState } from 'react'
import { api, sessionCompany } from '../lib/server'
import { flushFloor, loadServerState } from '../lib/floorBridge'
import { usePOS } from '../store/posStore'

const tabs = ['Carte', 'Salles', 'Équipe', 'Paramètres', 'TVA', 'Imprimante'] as const
const button = { padding: '10px 16px', borderRadius: 10, border: '1px solid #615783', background: '#312747', color: '#f8fafc', cursor: 'pointer', fontWeight: 650 }
const field = { display: 'block', width: '100%', boxSizing: 'border-box' as const, margin: '6px 0 16px', padding: 12, background: '#131321', border: '1px solid #64748b', borderRadius: 9, color: '#f8fafc' }
const panel = { background: '#181827', border: '1px solid #3c3750', padding: 22, borderRadius: 16, marginBottom: 18 }

export default function ConfigPage({ onBack, onOpenEditor }: { onBack: () => void; onOpenEditor?: () => void }) {
  const [tab, setTab] = useState<typeof tabs[number]>('Carte')
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [edit, setEdit] = useState<any>(null)
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' })
  const companyName = usePOS(s => s.settings.restaurantName)
  const [name, setName] = useState(companyName)
  const tables = usePOS(s => s.tables)
  async function reload() {
    const [p, c, m, s] = await Promise.all([api('/pos/catalog'), api('/categories'), api('/companies/members'), api('/pos/settings')])
    setProducts(p); setCategories(c); setMembers(m); setSettings(s)
  }
  useEffect(() => { void reload().catch(e => setError(e.message)) }, [])
  async function run(task: () => Promise<unknown>, success = 'Enregistrement confirmé par le serveur.') {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await task(); await reload(); await loadServerState(); setMessage(success) }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  function exportData() {
    const data = { version: 1, companyName, exportedAt: new Date().toISOString(), products: products.map(p => ({ id: p.id, name: p.name, category: p.category.name, price: p.price, taxRate: p.taxRate, stock: p.stock, isActive: p.isActive })), settings }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'configuration-caisse.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importFile(file?: File) {
    if (!file) return
    if (file.size > 2_000_000) { setError('Fichier trop volumineux (2 Mo maximum).'); return }
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.products) || !data.products.length) throw new Error('Le fichier ne contient pas de catalogue.')
      if (!window.confirm(`Importer ${data.products.length} produits ? Les produits déjà identifiés seront mis à jour ; aucun produit ne sera supprimé. L’équipe et les réglages ne sont pas importés.`)) return
      await run(() => api('/pos/catalog-import', { method: 'POST', body: JSON.stringify({ products: data.products }) }), 'Catalogue importé en base.')
    } catch (e: any) { setError(e.message) }
  }
  const saveSettings = () => run(() => api('/pos/settings', { method: 'PUT', body: JSON.stringify(settings) }))
  return <main style={{ height: '100%', overflow: 'auto', padding: 20, color: '#f1f5f9', boxSizing: 'border-box', fontFamily: 'system-ui' }}>
    <header style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
      <button style={button} onClick={onBack}>← Retour</button><div style={{ flex: 1 }}><h1 style={{ margin: 0, fontSize: 24 }}>Configuration de la caisse</h1><p style={{ color: '#cbd5e1' }}>{companyName} · Données de votre établissement</p></div>
      <button style={button} onClick={exportData}>Exporter la configuration</button>
      <label style={button}>Importer le catalogue<input type="file" accept=".json,application/json" disabled={busy} style={{ display: 'none' }} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = '' }} /></label>
      <button style={button} disabled={busy} onClick={() => void run(async () => { await flushFloor() }, 'Données rechargées depuis le serveur.')}>Recharger</button>
    </header>
    <nav aria-label="Configuration" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>{tabs.map(t => <button key={t} style={{ ...button, background: t === tab ? '#6d28d9' : '#222235' }} onClick={() => { setTab(t); setMessage('') }} aria-pressed={t === tab}>{t}</button>)}</nav>
    {error && <p role="alert" style={{ ...panel, color: '#fecdd3', borderColor: '#be4568' }}>{error}</p>}
    {message && <p role="status" style={{ ...panel, color: '#a7f3d0', borderColor: '#287661' }}>{message}</p>}
    {tab === 'Carte' && <>
      <div style={panel}><h2>Produits et prix TTC</h2><p>Le catalogue est commun à la caisse et au portail client.</p>
        <button style={button} onClick={() => setEdit({ name: '', price: 0, taxRate: settings?.defaultTaxRate ?? 17, stock: null, categoryId: categories[0]?.id || '' })}>Ajouter un produit</button>{' '}
        <button style={button} onClick={() => { const name = window.prompt('Nom de la nouvelle catégorie'); if (name?.trim()) void run(() => api('/categories', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })) }}>Créer une catégorie</button>
      </div>
      {edit && <form style={panel} onSubmit={e => { e.preventDefault(); void run(async () => { const { id, ...body } = edit; await api(`/products${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }); setEdit(null) }) }}>
        <h2>{edit.id ? 'Modifier le produit' : 'Nouveau produit'}</h2>
        <label>Nom<input required maxLength={160} style={field} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
        <label>Catégorie<select required style={field} value={edit.categoryId} onChange={e => setEdit({ ...edit, categoryId: e.target.value })}><option value="">Choisir une catégorie</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {(['price', 'taxRate', 'stock'] as const).map((key, i) => <label key={key}>{['Prix TTC (€)', 'TVA (%)', 'Stock (vide = non suivi)'][i]}<input style={field} type="number" min={key === 'price' ? 0.01 : 0} max={key === 'taxRate' ? 100 : 1e6} step={key === 'stock' ? 1 : 0.01} required={key !== 'stock'} value={edit[key] ?? ''} onChange={e => setEdit({ ...edit, [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>)}
        <button disabled={busy} style={button}>Enregistrer le produit</button>{' '}<button type="button" style={button} onClick={() => setEdit(null)}>Annuler</button>
      </form>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 14 }}>{products.map(p => <article key={p.id} style={panel}><h3>{p.name}</h3><p>{p.category.name} · {p.price.toFixed(2)} € TTC · TVA {p.taxRate} %</p><p>{p.isActive ? 'Disponible' : 'Désactivé'} · Stock : {p.stock ?? 'non suivi'}</p><button style={button} onClick={() => setEdit({ id: p.id, name: p.name, categoryId: p.categoryId, price: p.price, taxRate: p.taxRate, stock: p.stock })}>Modifier</button>{' '}<button style={button} disabled={busy} onClick={() => void run(() => api('/products/' + p.id, { method: 'PUT', body: JSON.stringify({ isActive: !p.isActive }) }))}>{p.isActive ? 'Désactiver' : 'Réactiver'}</button></article>)}</div>
      {!products.length && <p>Aucun produit : créez votre première catégorie et votre premier produit.</p>}
    </>}
    {tab === 'Salles' && <section style={panel}><h2>Vos salles et tables</h2><p>{tables.length} tables enregistrées. La même configuration est utilisée dans la gestion et la caisse.</p><button style={button} onClick={onOpenEditor}>Ouvrir l’éditeur de salle</button><ul>{tables.map(t => <li key={t.id}>{t.name} · {t.section} · {t.seats} places</li>)}</ul></section>}
    {tab === 'Équipe' && <>
      <section style={panel}><h2>Comptes réels de l’équipe</h2><p>Connexion par email. Les droits sont contrôlés sur le serveur ; aucun PIN de démonstration n’est utilisé.</p>{members.map(m => <div key={m.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '12px 0' }}><span style={{ flex: 1 }}>{m.user.firstName} {m.user.lastName} · {m.user.email}</span><span>{m.role} · {m.isActive ? 'Actif' : 'Désactivé'}</span>{m.role !== 'OWNER' && <><select style={{ ...field, width: 'auto', margin: 0 }} value={m.role} disabled={busy} onChange={e => void run(() => api('/companies/members/' + m.userId, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }))}><option value="EMPLOYEE">Salarié</option><option value="MANAGER">Responsable</option></select><button style={button} disabled={busy} onClick={() => void run(() => api('/companies/members/' + m.userId, { method: 'PATCH', body: JSON.stringify({ isActive: !m.isActive }) }))}>{m.isActive ? 'Désactiver' : 'Réactiver'}</button></>}</div>)}</section>
      <form style={panel} onSubmit={e => { e.preventDefault(); void run(async () => { await api('/companies/members', { method: 'POST', body: JSON.stringify(newMember) }); setNewMember({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' }) }, 'Compte salarié créé. Il peut se connecter avec son email.') }}><h2>Créer un compte salarié</h2>
        {(['firstName', 'lastName', 'email', 'password'] as const).map((key, i) => <label key={key}>{['Prénom', 'Nom', 'Email', 'Mot de passe initial (8 caractères minimum)'][i]}<input required style={field} type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} autoComplete={key === 'password' ? 'new-password' : 'off'} minLength={key === 'password' ? 8 : 1} value={newMember[key]} onChange={e => setNewMember({ ...newMember, [key]: e.target.value })} /></label>)}
        <label>Rôle<select style={field} value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}><option value="EMPLOYEE">Salarié</option><option value="MANAGER">Responsable</option></select></label><button disabled={busy} style={button}>Créer le compte</button>
      </form>
    </>}
    {tab === 'Paramètres' && <section style={panel}><h2>Identité et ticket</h2><label>Nom de l’établissement<input style={field} value={name} onChange={e => setName(e.target.value)} /></label><button style={button} disabled={busy} onClick={() => void run(() => api('/companies/' + sessionCompany(), { method: 'PUT', body: JSON.stringify({ name }) }))}>Enregistrer le nom</button>{settings && <><label>Message en bas du ticket<textarea style={field} value={settings.receiptFooter || ''} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} /></label><button style={button} disabled={busy} onClick={saveSettings}>Enregistrer le message</button></>}</section>}
    {tab === 'TVA' && settings && <section style={panel}><h2>Taux de TVA</h2><p>Les taux de chaque produit déterminent les taxes des ventes. Changer ces réglages ne modifie pas rétroactivement les tickets.</p>{['defaultTaxRate', 'taxRate1', 'taxRate2', 'taxRate3', 'taxRate4'].map((key, i) => <label key={key}>{i === 0 ? 'Taux par défaut (%)' : `Taux ${i} (%)`}<input style={field} type="number" min={0} max={100} step={0.01} value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} /></label>)}<button style={button} disabled={busy} onClick={saveSettings}>Enregistrer les taux</button></section>}
    {tab === 'Imprimante' && settings && <section style={panel}><h2>Impression des tickets</h2><p>L’impression utilise le dialogue du navigateur et l’imprimante installée sur ce poste. Le serveur ne prétend pas avoir imprimé un ticket sans retour matériel.</p><label>Adresse de l’imprimante (configuration conservée)<input style={field} value={settings.printerIp || ''} onChange={e => setSettings({ ...settings, printerIp: e.target.value || null })} /></label><button style={button} disabled={busy} onClick={saveSettings}>Enregistrer l’adresse</button>{' '}<button style={button} onClick={() => window.print()}>Ouvrir le dialogue d’impression</button><p>La validation physique demande une imprimante connectée ; une adresse enregistrée seule ne prouve pas une connexion.</p></section>}
  </main>
}
