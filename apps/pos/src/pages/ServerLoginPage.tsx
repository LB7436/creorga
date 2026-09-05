import { useState } from 'react'
import { api, setSession } from '../lib/server'
import { startFloorBridge } from '../lib/floorBridge'

export default function ServerLoginPage({ onReady }: { onReady: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState<any>(null)
  async function choose(data: any, companyId: string) {
    setSession(data.accessToken, companyId)
    await startFloorBridge()
    onReady()
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return
    setBusy(true); setError('')
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setPassword('')
      if (!data.companies?.length) throw new Error('Aucun établissement actif pour ce compte.')
      if (data.companies.length === 1) await choose(data, data.companies[0].companyId || data.companies[0].company.id)
      else setLogin(data)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  const field = { width: '100%', boxSizing: 'border-box' as const, padding: 14, borderRadius: 10, border: '1px solid #475569', background: '#0f172a', color: 'white', margin: '8px 0 20px' }
  return <main style={{ minHeight: '100vh', background: '#07070d', color: '#f8fafc', display: 'grid', placeItems: 'center', fontFamily: 'system-ui', padding: 20, boxSizing: 'border-box' }}>
    <form onSubmit={submit} style={{ width: '100%', maxWidth: 430, background: '#161626', padding: 28, borderRadius: 24, boxSizing: 'border-box' }}>
      <p style={{ color: '#c4b5fd' }}>CREORGA · CAISSE</p><h1>Votre espace équipe</h1>
      <p>Connectez-vous avec le même compte que dans la gestion de votre établissement.</p>
      {login ? <><h2>Choisir l’établissement</h2>{login.companies.map((m: any) => <button type="button" disabled={busy} key={m.company.id} style={field} onClick={async () => { setBusy(true); try { await choose(login, m.company.id) } catch (e: any) { setError(e.message) } finally { setBusy(false) } }}>{m.company.name}</button>)}</> : <>
        <label htmlFor="pos-email">Adresse email</label><input id="pos-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={field} />
        <label htmlFor="pos-password">Mot de passe</label><input id="pos-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={field} />
        <button disabled={busy} style={{ ...field, background: '#6d28d9', border: 'none', fontWeight: 700 }}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </>}
      {error && <p role="alert" style={{ color: '#fda4af' }}>{error}</p>}
      <p style={{ fontSize: 13, color: '#cbd5e1' }}>Les comptes salariés se créent depuis Administration → Utilisateurs. Aucun code PIN de démonstration ne donne accès à vos données.</p>
    </form>
  </main>
}
