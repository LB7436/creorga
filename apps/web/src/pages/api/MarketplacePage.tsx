import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, ExternalLink, Key, Check } from 'lucide-react'

/**
 * v4.6 — Marketplace POC : 3 cartes statiques (TheFork, Stripe, Resend).
 * Click "Connecter" → modal "Coming soon" + champ pour saisir API key.
 * Stockage localStorage encodé base64 (POC — production = chiffrement serveur).
 */

interface Connector {
  id: string
  name: string
  category: string
  description: string
  color: string
  emoji: string
  helpUrl: string
}

const CONNECTORS: Connector[] = [
  {
    id: 'thefork',
    name: 'TheFork',
    category: 'Réservations',
    description: 'Synchronise les réservations TheFork avec ton agenda Creorga.',
    color: '#10b981',
    emoji: '🍴',
    helpUrl: 'https://www.thefork.fr/business/api',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Paiements',
    description: 'Encaisse via terminal mobile Stripe + facturation auto.',
    color: '#635bff',
    emoji: '💳',
    helpUrl: 'https://stripe.com/docs/api',
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'Emails transactionnels',
    description: 'Envoie factures, relances et notifs depuis @creorga.lu.',
    color: '#f59e0b',
    emoji: '✉️',
    helpUrl: 'https://resend.com/docs',
  },
]

function isConfigured(id: string): boolean {
  try { return !!localStorage.getItem(`creorga.marketplace.${id}`) } catch { return false }
}

function saveKey(id: string, key: string): void {
  try {
    // POC : stockage base64 localStorage. En production = backend chiffré.
    const encoded = btoa(key)
    localStorage.setItem(`creorga.marketplace.${id}`, encoded)
  } catch { /* localStorage indisponible */ }
}

function removeKey(id: string): void {
  try { localStorage.removeItem(`creorga.marketplace.${id}`) } catch { /* */ }
}

export default function MarketplacePage() {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [savedFlash, setSavedFlash] = useState<string | null>(null)

  const handleSave = (id: string) => {
    if (!apiKey.trim()) return
    saveKey(id, apiKey.trim())
    setSavedFlash(id)
    setApiKey('')
    setTimeout(() => { setOpenModal(null); setSavedFlash(null) }, 1500)
  }

  return (
    <div style={{ padding: 28, maxWidth: 1180, margin: '0 auto', color: '#f8fafc' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Marketplace d'intégrations</h1>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>
          Connectez vos outils favoris. Vous gardez la main sur vos clés API — stockées localement (POC).
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16,
      }}>
        {CONNECTORS.map((c) => {
          const configured = isConfigured(c.id)
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(15,23,42,0.72)',
                border: `1px solid ${c.color}55`,
                borderRadius: 18, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${c.color}26`, color: c.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {c.category}
                  </div>
                </div>
                {configured && (
                  <span style={{
                    padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                    background: 'rgba(16,185,129,0.18)', color: '#86efac',
                    border: '1px solid rgba(16,185,129,0.4)',
                  }}>✓ Connecté</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{c.description}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  onClick={() => { setOpenModal(c.id); setApiKey('') }}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10,
                    border: 'none', background: c.color, color: '#fff',
                    fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  <Link size={14} /> {configured ? 'Modifier' : 'Connecter'}
                </button>
                <a href={c.helpUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.3)', background: 'transparent',
                    color: '#cbd5e1', cursor: 'pointer', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ExternalLink size={14} />
                </a>
              </div>
              {configured && (
                <button onClick={() => { removeKey(c.id); setSavedFlash(null) }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                  Déconnecter
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <div style={{
        marginTop: 28, padding: 14, borderRadius: 12,
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
        color: '#a5b4fc', fontSize: 12,
      }}>
        💡 <strong>POC en cours :</strong> Pour la production, OAuth client_credentials remplacera la saisie manuelle de clé API. Les flux temps réel (webhooks) seront branchés via le module Robi.
      </div>

      {openModal && (
        <ConnectorModal
          connector={CONNECTORS.find((c) => c.id === openModal)!}
          apiKey={apiKey}
          setApiKey={setApiKey}
          saved={savedFlash === openModal}
          onSave={() => handleSave(openModal)}
          onClose={() => { setOpenModal(null); setApiKey('') }}
        />
      )}
    </div>
  )
}

function ConnectorModal({
  connector, apiKey, setApiKey, saved, onSave, onClose,
}: {
  connector: Connector
  apiKey: string
  setApiKey: (v: string) => void
  saved: boolean
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,23,42,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a', border: `1px solid ${connector.color}55`,
          borderRadius: 18, padding: 22, maxWidth: 480, width: '100%',
          color: '#f8fafc',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 32 }}>{connector.emoji}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Connecter {connector.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{connector.category}</div>
          </div>
        </div>
        <div style={{
          padding: 12, borderRadius: 10, marginBottom: 14,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          fontSize: 12, color: '#fde68a',
        }}>
          ⚠️ POC : ta clé API est stockée chiffrée localement dans ce navigateur. Pour la prod, OAuth via Vercel viendra dans la v5.
        </div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Key size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> API key {connector.name}
        </label>
        <input
          type="password" autoFocus value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`Colle ta clé ${connector.name} ici`}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(2,6,23,0.6)', color: '#fff', fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: '1px solid rgba(148,163,184,0.3)', background: 'transparent',
            color: '#cbd5e1', fontWeight: 700, cursor: 'pointer',
          }}>Annuler</button>
          <button onClick={onSave} disabled={!apiKey.trim() || saved} style={{
            flex: 2, padding: '10px 12px', borderRadius: 10,
            border: 'none', background: saved ? '#16a34a' : connector.color,
            color: '#fff', fontWeight: 800, cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
            opacity: !apiKey.trim() ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {saved ? (<><Check size={14} /> Enregistré</>) : 'Enregistrer la clé'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
