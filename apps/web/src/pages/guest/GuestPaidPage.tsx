import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * v5.0 — Page de retour Stripe Checkout après paiement à table.
 * Confirme au backend (notif staff) puis affiche un message de remerciement.
 */
export default function GuestPaidPage() {
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('table')
  // Stripe ajoute `session_id` à l'URL de retour : c'est la seule preuve.
  const sessionId = searchParams.get('session_id')
  const [etat, setEtat] = useState<'verification' | 'confirme' | 'refuse'>('verification')
  const [motif, setMotif] = useState('')

  useEffect(() => {
    if (!tableId) { setEtat('refuse'); setMotif('Table inconnue.'); return }
    if (!sessionId) {
      // Ouvrir /c/paid?table=5 à la main ne prouve rien. La page ne doit pas
      // annoncer « Paiement reçu » dans ce cas — c'est ce qu'elle faisait, et
      // le serveur notifiait le personnel dans la foulée.
      setEtat('refuse')
      setMotif("Aucune preuve de paiement dans le lien. Si vous venez de payer, revenez par le lien affiché à la fin du paiement.")
      return
    }
    fetch(`${BACKEND}/api/guest/paid-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, sessionId }),
    })
      .then(async (r) => {
        if (r.ok) { setEtat('confirme'); return }
        const data = await r.json().catch(() => ({}))
        setEtat('refuse')
        setMotif(data?.error || 'Paiement non confirmé.')
      })
      .catch(() => {
        setEtat('refuse')
        setMotif('Serveur injoignable — impossible de confirmer le paiement.')
      })
  }, [tableId, sessionId])

  if (etat !== 'confirme') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#05050f', color: '#f8fafc', padding: 24, textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: etat === 'verification' ? 'rgba(148,163,184,0.15)' : 'rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
        }}>
          {etat === 'verification' ? '⏳' : '⚠️'}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
          {etat === 'verification' ? 'Vérification du paiement…' : 'Paiement non confirmé'}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 340, lineHeight: 1.6 }}>
          {etat === 'verification' ? 'Un instant, nous vérifions auprès de votre banque.' : motif}
        </p>
        {etat === 'refuse' && (
          <p style={{ color: '#64748b', fontSize: 13, maxWidth: 340 }}>
            Adressez-vous au personnel pour régler votre addition.
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#05050f', color: '#f8fafc', padding: 24, textAlign: 'center',
    }}>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Check size={40} strokeWidth={3} color="#fff" />
      </motion.div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Paiement reçu, merci !</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 320 }}>
        Votre addition a été réglée{tableId ? ` pour la table ${tableId}` : ''}. Passez une excellente fin de journée.
      </p>
    </div>
  )
}
